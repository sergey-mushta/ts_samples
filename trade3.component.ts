import { Component, OnInit, OnDestroy } from '@angular/core';

import {
	trigger,
	state,
	style,
	animate,
	transition,
} from '@angular/animations';

import {
	Observable,
	Subject,
	forkJoin,
	zip,
	timer,
	pipe,
	of,
} from 'rxjs';
import {
	map,
	share,
	switchMap,
	debounceTime,
} from 'rxjs/operators';

import { TranslateService } from '@ngx-translate/core';

import { LoggerService       } from '../../service/logger.service';
import { GlobalsService      } from '../../service/globals.service'
import { ThemeService        } from '../../service/theme.service'
import { UserService, IUser  } from '../../service/user.service';
import { NotificationService } from '../../service/notification.service'
import { ApiWsService        } from '../../service/api.ws.service'

import { BrokerService } from '../broker.service'

import { INotification } from '../../service/notification.service'
import {
	IDirectionsBySymbol,
	IDirectionBySymbol,
	IDirection,
	IDom,
	IAccount,
	IAccountByCurrency,
	IOrder,
	IOrderById,
	IOrderFilter,
	IAction,
	IOrderPlace,
} from '../trade3'

import { BigNumber } from 'bignumber.js';

declare var DataFeed;

@Component({
	selector    : 'app-trade3',
	templateUrl : './trade3.component.html',
	styleUrls   : ['./trade3.component.scss'],
	animations  : [
		trigger( 'toggleX', [
			transition( ':enter', [
				style({transform: 'translateX(100%)', opacity: 0}),
				animate('100ms ease-in', style({transform: 'translateX(0)', opacity: 1}))
			]),
			transition( ':leave', [
				style({transform: 'translateX(0)', opacity: 1}),
				animate('100ms ease-out', style({transform: 'translateX(100%)', opacity: 0})),
			])
		]),
		trigger( 'toggleY', [
			transition( ':enter', [
				style({transform: 'translateY(100%)', opacity: 0}),
				animate('100ms ease-in', style({transform: 'translateY(0)', opacity: 1}))
			]),
			transition( ':leave', [
				style({transform: 'translateY(0)', opacity: 1}),
				animate('100ms ease-out', style({transform: 'translateY(100%)', opacity: 0})),
			])
		]),
	]
})
export class Trade3Component implements OnInit, OnDestroy {

	tv;
	config;

	locale     : string;
	theme      : string;
	theme_tv   : string;
	theme_link;

	widget;

	symbolInfo;
	symbol    : string;
	domStep   : string;
	dom       : IDom;
	history   : IOrder[];
	accounts          : IAccount[];
	accountByCurrency : IAccountByCurrency;
	orders       : IOrder[];
	orderById    : IOrderById;
	ordersFilter : IOrderFilter = {
		status: 'OPEN',
	}
	actionDefault : IAction;
	action        : IAction;
	direction            : IDirection;
	directionBySymbol    : IDirectionBySymbol;

	tabsLeft: any[] = [
		{ id: 'DOM',     active: true  },
		{ id: 'HISTORY', active: false },
	];
	tabsLeftActive: string = 'DOM';

	tabsBottom: any[] = [
		{ id: 'Open',    section: 'MY-ORDERS',   status: 'OPEN', active: true  },
		{ id: 'History', section: 'MY-ORDERS',   status: null,   active: false },
		{ id: 'Account', section: 'MY-ACCOUNTS', status: null,   active: false },
	];
	tabsBottomActiveTab     : string = 'Open';
	tabsBottomActiveSection : string = 'MY-ORDERS';

	toggleState = {
		direction : true,
		dom       : true,
		bottom    : true,
		action    : true,
	};

	private _brokerStream : Subject<any>;
	private brokerStream  : Observable<any>;
	private brokerStream$;
	private Directions$;
	private History$;
	private Orders$;
	private OrderPlace$;
	private OrderModify$;
	private OrderCancel$;
	private DirectionsFavSave$;
	private UpdateTimer$;
	// event
	private DOMEvent$;
	// values
	private DOMStepStream         : Subject<any>;
	private DirectionSymbolStream : Subject<any>;
	private DOMStep$;
	private DirectionSymbol$;
	// widget
	private widgetTickStream      : Subject<any>;
	private widgetTick$;
	// window
	private windowResizeStream    : Subject<any>;
	private WindowResize$;
	public  WindowResizeEvent;

	private updateInterval : number;

	isAuth : boolean = false;
	user   : IUser;

	constructor(
		private logger       : LoggerService,
		private globals      : GlobalsService,
		private Theme        : ThemeService,
		private User         : UserService,
		private translate    : TranslateService,
		private Notification : NotificationService,
		private ApiWs        : ApiWsService,
		private Broker       : BrokerService,
	) {
		this.Theme.Add( 'theme' );
		this.initConfig();
		this._brokerStream         = this.Broker.GetDataStream();
		this.brokerStream          = this._brokerStream.pipe( share() );
		this.DOMStepStream         = new Subject();
		this.DirectionSymbolStream = new Subject();
		this.widgetTickStream      = new Subject();
		this.windowResizeStream    = new Subject();
	}

	ngOnInit() {
		this.resetData();
		this.brokerStream$ = this.brokerStream.subscribe( ( event ) => {
			switch( event[ 'name' ] ) {
				case 'symbol':
					this.onBrokerSymbol( event.request );
					break;
				case 'symbolInfo':
					this.onBrokerSymbolInfo( event.request );
					break;
				default:
					this.logger.debug( 'brokerStream', event );
					break;
			}
		});
		const UserStream      = this.User.GetUserStream();
		const DirectionStream = this.ApiWs.response( 'trade3.directions' );
		const DOMStream       = this.ApiWs.response( 'trade3.dom'        );
		const AccountStream   = this.ApiWs.response( 'trade3.account'    );
		this.Directions$ = zip( UserStream, DirectionStream, DOMStream, AccountStream ).subscribe( ( r ) => {
			// this.logger.debug( 'Directions$', r );
			if( !r || !r[ 0 ] || !r[ 1 ] || !r[ 2 ] || !r[ 3 ] ) {
				this.logger.debug( 'Directions$ is fail response' );
				return;
			}
			this.user = r[ 0 ];
			if( this.user ) {
				this.isAuth = this.user.isAuth;
				// this.logger.debug( 'isAuth:', this.isAuth );
			} else {
				this.isAuth = false;
				// this.logger.debug( 'isAuth is fail response' );
			}
			if( r[ 1 ][ 'code' ] !== 200 ) {
				this.logger.debug( 'DirectionStream is fail response' );
				return;
			}
			if( r[ 2 ][ 'code' ] !== 200 ) {
				this.logger.debug( 'DOMStream is fail response' );
				return;
			}
			if( r[ 3 ][ 'code' ] !== 200 ) {
				this.logger.debug( 'AccountStream is fail response' );
			}
			// update
			const direction = r[ 1 ];
			const dom       = r[ 2 ];
			const account   = r[ 3 ];
			this.directionBySymbol = direction[ 'data' ] as IDirectionBySymbol;
			this.direction         = this.directionBySymbol[ this.symbol ];
			this.dom               = dom[ 'data' ] as IDom;
			this.accounts          = account[ 'data' ] as IAccount[];
			// prepare related data
			this.ActionInit();
			this.prepareAccounts();
		});
		this.DOMStep$ = this.DOMStepStream.pipe(
			debounceTime( 1000 )
		).subscribe( ( value ) => {
			this.logger.debug( 'DOMStep$', value );
			this.domStep = value;
			this.updateDirections();
		});
		this.DirectionSymbol$ = this.DirectionSymbolStream.pipe(
			debounceTime( 1000 )
		).subscribe( ( value ) => {
			this.logger.debug( 'DirectionSymbol$', value );
			this.resetData();
			this.widget.setSymbol( value, '1' );
		});
		this.History$ = this.ApiWs.response( 'trade3.history' ).subscribe( ( r ) => {
			if( r[ 'code' ] !== 200 ) { return; }
			this.history = r[ 'data' ] as IOrder[];
			// this.logger.debug( 'History$', this.history );
		});
		this.Orders$ = this.ApiWs.response( 'trade3.orders' ).subscribe( ( r ) => {
			if( r[ 'code' ] === 403 ) { return; }
			if( r[ 'code' ] !== 200 ) { return; }
			const orders = r[ 'data' ] as IOrder[];
			this.updateOrders( orders );
			// this.logger.debug( 'Orders$', this.orders );
		});
		// order: actions
		this.OrderPlace$ = this.ApiWs.response( 'trade3.orderPlace' ).subscribe( ( r ) => {
			this.logger.debug( 'OrderPlace$', r );
			if( r[ 'code' ] === 403 ) { return; }
			let err  = r[ 'err' ];
			if( err ) {
				const order = r[ 'data' ] || {} as IOrderPlace;
				this.notificationOrderPlace( order, err );
			}
			this.brokerUpdate();
		});
		this.OrderModify$ = this.ApiWs.response( 'trade3.orderModify' ).subscribe( ( r ) => {
			this.logger.debug( 'OrderModify$', r );
			if( r[ 'code' ] === 403 ) { return; }
			if( r[ 'code' ] === 200 ) { this.ActionRemove(); }
			const err = r[ 'err' ];
			const order = r[ 'data' ] || {} as IOrderPlace;
			this.notificationOrderModify( order, err );
			this.brokerUpdate();
		});
		this.OrderCancel$ = this.ApiWs.response( 'trade3.orderCancel' ).subscribe( ( r ) => {
			this.logger.debug( 'OrderCancel$', r );
			if( r[ 'code' ] === 403 ) { return; }
			if( r[ 'code' ] === 200 ) { this.ActionRemove(); }
			const err = r[ 'err' ];
			if( err ) {
				const order = r[ 'data' ] || {} as IOrderPlace;
				this.notificationOrderCancel( order, r[ 'err' ] );
			}
			this.brokerUpdate();
		});
		// direction fav
		this.DirectionsFavSave$ = this.ApiWs.response( 'Trade3.DirectionsFavSave' ).subscribe( ( r ) => {
			if( r[ 'code' ] === 403 ) { return; }
			const title = 'TRADE3.DIRECTION.FAV.SAVE.TITLE';
			let message = 'TRADE3.DIRECTION.FAV.SAVE.MESSAGE';
			let level = 'info';
			if( r[ 'code' ] !== 200 ) {
				level   = 'error';
				message = 'TRADE3.DIRECTION.FAV.SAVE.MESSAGE.ERROR';
			}
			this.Notification.add({ title, message, translate : true });
		});
		// widget
		this.widgetTick$ = this.widgetTickStream.pipe(
			debounceTime( 1000 )
		).subscribe( ( event ) => {
			// this.logger.debug( 'widgetTick$', event );
		});
		// window
		this.WindowResize$ = this.windowResizeStream.pipe(
			debounceTime( 500 )
		).subscribe( ( event ) => {
			// this.logger.debug( 'WindowResize$', event );
			this.WindowResizeEvent = event;
		});
	}

	// window event
	onResize( event ) {
		this.windowResizeStream.next( event );
	}

	// event subscribe

	eventSub( symbol : string ) {
		if( !symbol ) { return; }
		this.DOMEvent$ = this.ApiWs.Sub({ 'channel': 'trade3.dom.'+ symbol }).pipe(
			debounceTime( 1000 )
		).subscribe( ( r ) => {
			this.logger.debug( 'DomEvent$', r );
			if( r[ 'code' ] === 200 ) {
				this.brokerUpdate();
			}
		});
	}

	eventUnSub() {
		if( this.DOMEvent$ ) {
			if( this.symbol ) {
				const symbol = this.symbol;
				this.ApiWs.UnSub({ 'channel': 'trade3.dom.'+ symbol });
			}
			this.DOMEvent$.unsubscribe();
		}
	}

	// ********** reset

	resetData() {
		this.logger.debug( 'resetData' );
		// dom
		this.dom     = undefined;
		this.domStep = undefined;
		// history
		this.history = undefined;
		// account
		this.accounts          = undefined;
		this.accountByCurrency = undefined;
		// order
		this.orders    = undefined;
		this.orderById = undefined;
		// action
		this.action        = undefined;
		this.actionDefault = undefined;
	}

	// ********** Orders

	updateOrders( orders: IOrder[] ) {
		// this.logger.debug( 'updateOrders', orders );
		this.updateOrdersStatus( orders );
		this.setOrders( orders );
	}

	resetOrders() {
		this.orders    = <IOrder[]>[];
		this.orderById = {};
	}

	setOrders( orders: IOrder[] ) {
		this.resetOrders();
		this.orders = orders;
		if( !orders || orders.length < 1 ) { return; }
		for( const i in orders ) {
			const o = orders[ i ];
			const id = o[ 'id' ];
			this.orderById[ id ] = o;
		}
	}

	isOrderById( id ) {
		const result = id in this.orderById;
		return( result );
	}

	getOrderById( id ) : IOrder {
		let result : IOrder = null;
		const is_exist = this.isOrderById( id );
		if( is_exist ) { result = this.orderById[ id ]; }
		return( result );
	}

	updateOrdersStatus( orders: IOrder[] ) {
		if( !orders || orders.length < 1 ) { return; }
		const is_init  = typeof this.orderById === 'undefined';
		if( is_init ) { return; }
		let o, id, status, old : IOrder;
		for( const i in orders ) {
			o  = orders[ i ];
			id = o[ 'id' ];
			old = this.getOrderById( id );
			if( old ) {
				old = this.orderById[ id ];
				status = old.status;
			} else {
				status = null;
			}
			if( old && o.status === status ) { continue; }
			// order update by status
			this.logger.debug( 'updateOrdersStatus status:', o.status, status, old, o );
			switch( o.status ) {
				case 'CANCEL':
					this.notificationOrderCancel( o );
					break;
				case 'CLOSE':
					this.notificationOrderClose( o );
					break;
				default:
					this.notificationOrderPlace( o );
					break;
			}
		}
	}

	// ********** Account

	prepareAccounts() {
		const accounts  = this.accounts;
		const direction = this.direction;
		const id1 = this.direction.currency1.id;
		const id2 = this.direction.currency2.id;
		let count = 0;
		this.accountByCurrency = <IAccountByCurrency>{};
		for( const i in accounts ) {
			if( count === 2 ) {
				// this.logger.debug( 'prepareAccounts:', this.accountByCurrency );
				break;
			}
			const account = accounts[ i ];
			if( account.currencyId === id1 ) {
				this.accountByCurrency.currency1 = account;
				++count;
				// this.logger.debug( 'prepareAccounts, currency1:', account );
				continue;
			}
			if( account.currencyId === id2 ) {
				this.accountByCurrency.currency2 = account;
				++count;
				// this.logger.debug( 'prepareAccounts, currency2:', account );
				continue;
			}
		}
	}

	// ********** Action

	onActionReset( r ) {
		if( r[ 'code' ] === 200 ) {
			this.ActionReset();
		}
	}

	ActionDefault() {
		const dom = this.dom;
		const direction = this.direction;
		if( !dom || !dom.market || !direction || !direction.settings ) {
			this.logger.warn( 'ActionDefault empty', dom, direction );
			return;
		}
		// this.logger.debug( 'ActionDefault', dom, direction );
		const market = dom.market;
		const side   = +market.priceDiff > 0 ? 'ask' : 'bid';
		const name   = side;
		const price  = market.price;
		// qty
		const qtyMin  = direction.settings.qtyMin ? direction.settings.qtyMin : '0';
		const _qtyMin = new BigNumber( qtyMin )
		const fractionPoints = direction.currency1.fractionPoints;
		const qty = _qtyMin.toFixed( fractionPoints ).replace( /[^0\.\,]/, '0' );
		this.actionDefault  = { name, side, qty, price };
	}

	ActionRemove() {
		// this.logger.debug( 'ActionRemove' );
		this.action        = null;
		this.actionDefault = null;
	}

	ActionReset() {
		// this.logger.debug( 'ActionReset' );
		if( this.actionDefault ) {
			// this.logger.debug( 'ActionReset default' );
			this.action = { ...this.actionDefault };
		}
	}

	ActionInit() {
		// this.logger.debug( 'ActionInit' );
		this.ActionDefault();
		if( !this.action ) {
			// this.logger.debug( 'ActionInit to ActionReset' );
			this.ActionReset();
		}
	}

	// restriction

	IsAuth() {
		if( !this.isAuth ) {
			const result = this.User.IsAuth().pipe(
				map( ( r ) => {
					this.logger.debug( 'IsAuth, auth update', r );
					const result = r.isAuth;
					this.isAuth = result;
					if( !result ) {
						this.notificationSignIn();
					}
					return( result );
				}),
			);
			return( result );
		}
		return( of( this.isAuth ) );
	}

	// notifications

	notificationSignIn() {
		const title   = 'Restriction';
		const message = 'TRADE3.SIGNIN.MESSAGE';
		const level   = 'warning';
		this.Notification.add({ title, message, level, translate: true });
	}

	notificationOrder( order: IOrder, err: string = null, s ) {
		let level, type, errs;
		const t = [];
		t.push( this.translate.get( order.side === 'ask' ? s[ 'ask' ] : s[ 'bid' ] ) );
		order[ 'currency1' ] = this.direction.currency1.name;
		order[ 'currency2' ] = this.direction.currency2.name;
		if( err ) {
			level = 'error';
			type  = s[ level ];
			let e = order[ 'err' ];
			if( e ) {
				if( typeof e !== 'string' && e[ 0 ] ) {
					errs = 'ORDER.ERROR.'+ e[ 0 ];
				} else {
					errs = order[ 'err' ];
				}
			}
		} else {
			level = 'success';
			type  = s[ level ];
		}
		forkJoin([ ...t ], ( t1 ) => {
			order.side = t1 || order.side;
			return( order );
		}).subscribe( ( order ) => {
			const title   = s[ 'title' ];
			const message = [ type, order ];
			if( !errs ) {
				this.Notification.add({ title, message, level });
				return;
			}
			this.translate.get( errs, order ).subscribe( ( t ) => {
				order[ 'err' ] = t;
				const message = [ type, order ];
				this.Notification.add({ title, message, level });
			});
		});
	}

	notificationOrderPlace( order: IOrder, err: string = null ) {
		const
			title   = 'ORDER.PLACE.TITLE',
			success = 'ORDER.PLACE.MESSAGE.SUCCESS',
			error   = 'ORDER.PLACE.MESSAGE.ERROR',
			ask     = 'ORDER.ASK',
			bid     = 'ORDER.BID'
		;
		this.notificationOrder( order, err, { title, success, error, ask, bid } );
	}

	notificationOrderClose( order: IOrder, err: string = null ) {
		const
			title   = 'ORDER.CLOSE.TITLE',
			success = 'ORDER.CLOSE.MESSAGE.SUCCESS',
			error   = 'ORDER.CLOSE.MESSAGE.ERROR',
			ask     = 'ORDER.CLOSE.ASK',
			bid     = 'ORDER.CLOSE.BID'
		;
		this.notificationOrder( order, err, { title, success, error, ask, bid } );
	}

	notificationOrderModify( order: IOrder, err: string = null ) {
		const
			title   = 'ORDER.MODIFY.TITLE',
			success = 'ORDER.MODIFY.MESSAGE.SUCCESS',
			error   = 'ORDER.MODIFY.MESSAGE.ERROR',
			ask     = 'ORDER.ASK',
			bid     = 'ORDER.BID'
		;
		this.notificationOrder( order, err, { title, success, error, ask, bid } );
	}

	notificationOrderCancel( order: IOrder, err: string = null ) {
		const
			title   = 'ORDER.CANCEL.TITLE',
			success = 'ORDER.CANCEL.MESSAGE.SUCCESS',
			error   = 'ORDER.CANCEL.MESSAGE.ERROR',
			ask     = 'ORDER.ASK',
			bid     = 'ORDER.BID'
		;
		if( err ) {
			const o = this.getOrderById( order.id );
			if( o ) {
				order = { ...order, ...o };
				let e = null;
				switch( o.status ) {
					case 'CLOSE':
						e = 'CANCEL.CLOSED';
						break;
					case 'CANCEL':
						e = 'CANCEL.CANCELED';
						break;
				}
				if( e ) { order[ 'err' ] = [ e ]; }
			}
		}
		this.notificationOrder( order, err, { title, success, error, ask, bid } );
	}

	ngOnDestroy() {
		this.brokerStream$.unsubscribe();
		// update
		this.Directions$.unsubscribe();
		this.DOMStep$.unsubscribe();
		this.DirectionSymbol$.unsubscribe();
		this.History$.unsubscribe();
		this.Orders$.unsubscribe();
		// order action
		this.OrderPlace$.unsubscribe();
		this.OrderModify$.unsubscribe();
		this.OrderCancel$.unsubscribe();
		this.DirectionsFavSave$.unsubscribe();
		// event
		this.eventUnSub();
		// widget
		this.widgetTick$.unsubscribe();
		// window
		this.WindowResize$.unsubscribe();
	}

	onTabLeftSelect( item: any ) {
		item.active = true
		this.tabsLeftActive = item.id;
	}

	onTabBottomSelect( item: any ) {
		item.active = true
		this.tabsBottomActiveTab     = item.id;
		this.tabsBottomActiveSection = item.section;
		this.ordersFilter = {
			status: item.status,
		};
	}

	// ********** event: Broker

	onBrokerSymbol( event ) {
		this.logger.debug( 'onBrokerSymbol', event );
		this.eventUnSub();
		const symbol = event[ 'symbol' ];
		this.symbol = symbol;
		this.ActionRemove();
		this.brokerUpdate();
		this.eventSub( symbol );
	}

	onBrokerSymbolInfo( event ) {
		this.logger.debug( 'onBrokerSymbolInfo', event );
	}

	brokerUpdate() {
		this.update();
		this.updateTimerRestart();
	}

	updateDirections() {
		const symbol = this.symbol;
		const step   = this.domStep;
		this.User.update();
		this.ApiWs.request({ name: 'trade3.directions' });
		this.ApiWs.request({ name: 'trade3.account'    });
		this.ApiWs.request({ name: 'trade3.dom', request: { symbol, step } });
	}

	update() {
		const symbol = this.symbol;
		this.updateDirections();
		this.ApiWs.request({ name: 'trade3.history', request: { symbol } });
		this.ApiWs.request({ name: 'trade3.orders',  request: { symbol } });
	}

	updateTimerStop() {
		if( this.UpdateTimer$ ) {
			// this.logger.debug( 'updateTimerStop' );
			this.UpdateTimer$.unsubscribe();
		}
	}

	updateTimerStart() {
		const interval = this.updateInterval;
		this.logger.debug( 'updateTimerStart', interval );
		this.UpdateTimer$ = timer( interval, interval ).subscribe( ( i ) => {
			// this.logger.debug( 'UpdateTimer$', i );
			this.update();
		});
	}

	updateTimerRestart() {
		this.updateTimerStop();
		this.updateTimerStart();
	}

	// ********** event: DOM

	onDirectionSelect( symbol: string ) {
		this.logger.debug( 'onDirectionSelect', symbol );
		this.DirectionSymbolStream.next( symbol );
	}

	onDirectionFav( fav ) {
		this.logger.debug( 'onDirectionFav', fav );
		this.IsAuth().subscribe( ( value ) => {
			if( value ) {
				this.ApiWs.request({ name: 'Trade3.DirectionsFavSave', request: { fav } });
			}
		});
	}

	onDomSelect( event ) {
		this.logger.debug( 'onDomSelect', event );
		const t = event[ 'type' ];
		const i = event[ 'item' ];
		if( !t || !i ) {
			this.logger.error( 'onDomSelect', t, i );
		}
		let name;
		let side  = t;
		let price = i[ 'price' ];
		let qty   = i[ 'qty'   ];
		switch( t ) {
			case 'market':
				qty = i[ 'askQty' ] || i[ 'bidQty' ];
				side = 'ask';
				name = side;
				break;
			default:
				qty = i[ 'qty' ];
				// invert
				side = side === 'ask' ? 'bid' : 'ask';
				name = side;
				break;
		}
		// price min
		const _qty    = new BigNumber( qty );
		const qtyMin  = this.direction.settings.qtyMin;
		const _qtyMin = new BigNumber( qtyMin )
		if( _qty.isLessThan( _qtyMin ) ) {
			const fractionPoints = this.direction.currency1.fractionPoints;
			qty = _qtyMin.toFixed( fractionPoints );
		}
		this.action  = { name, side, qty, price };
		// show panels
		this.toggleState.bottom = true;
		this.toggleState.action = true;
	}

	onDomStep( event ) {
		this.logger.debug( 'onDomStep', event );
		this.DOMStepStream.next( event );
	}

	// ********** event: Order

	toggleStateActionChange( event,  ) {
		this.logger.debug( 'toggleStateActionChange', event, this.toggleState );
	}

	OrderSelect( event ) {
		const action = event[ 'action' ];
		const i      = event[ 'item' ];
		if( !action || !i ) {
			this.logger.error( 'onOrderSelect', event );
			return;
		}
		if( i.status !== 'OPEN' ) { return; }
		if( action === 'cancel' ) {
			return( this.onActionOrderCancel( i ) );
		}
		const name = 'modify';
		const { id, side, price, qty } = i;
		this.action  = { name, id, side, qty, price };
		// show panels
		this.toggleState.action = true;
	}

	onOrderSelect( event ) {
		this.logger.debug( 'onOrderSelect', event );
		this.IsAuth().subscribe( ( value ) => {
			if( value ) {
				this.OrderSelect( event );
			}
		});
	}

	// ********** event: Action

	Action( event: IAction ) {
		this.ActionReset();
		switch( event.name ) {
			case 'modify':
				this.onActionOrderModify( event );
				break;
			case 'cancel':
				this.onActionOrderCancel( event );
				break;
			default:
				this.onActionOrderPlace( event );
				break;
		}
	}

	onAction( event: IAction ) {
		this.logger.debug( 'onAction', event );
		this.IsAuth().subscribe( ( value ) => {
			if( value ) {
				this.Action( event );
			}
		});
	}

	onActionOrderPlace( event ) {
		this.logger.debug( 'onActionOrderPlace', event );
		const symbol = this.symbol;
		const { side, qty, price } = event;
		this.ApiWs.request({ name: 'trade3.orderPlace', request: { symbol, side, qty, price } });
	}

	onActionOrderModify( event ) {
		this.logger.debug( 'onActionOrderModify', event );
		const symbol = this.symbol;
		const { id, side, qty, price } = event;
		this.ApiWs.request({ name: 'trade3.orderModify', request: { id, symbol, side, qty, price } });
	}

	onActionOrderCancel( event ) {
		this.logger.debug( 'onActionOrderCancel', event );
		const { id } = event;
		this.ApiWs.request({ name: 'trade3.orderCancel', request: { id } });
	}

	// ********** init

	initConfig() {
		const tv     = this.globals.data( 'tv' );
		const locale = tv[ 'locale' ];
		const theme  = tv[ 'theme' ];
		this.tv             = tv;
		this.locale         = locale;
		this.theme          = theme;
		this.theme_tv       = tv[ 'theme_tv' ];
		this.theme_link     = tv[ 'theme_link' ];
		this.Theme.Set( this.theme_tv );
		this.symbol         = this.tv.symbol;
		this.updateInterval = this.tv.updateInterval;
		const datafeed = new DataFeed.UdfDataFeed( tv[ 'datafeed_url' ] );
		const overrides = {
			light: {
			},
			dark: {
				'paneProperties.background'               : '#0a0f13',
				'paneProperties.vertGridProperties.color' : '#444',
				'paneProperties.horzGridProperties.color' : '#444',
			},
		};
		this.config = {
			autosize : true,
			interval : '1',
			datafeed : datafeed,
			disabled_features: [
				'use_localstorage_for_settings',
				'go_to_date',
				'property_pages',
				'compare_symbol',
				// 'header_fullscreen_button',
				'header_screenshot',
				'header_compare',
				'header_widget_dom_node',
				'chart_property_page_trading',
				'symbol_info',
				// trade
				'support_multicharts',
				'chart_crosshair_menu',
				'header_layouttoggle',
				'add_to_watchlist',
				'footer_screenshot',
				'open_account_manager',
				'multiple_watchlists',
				'trading_notifications',
				'show_trading_notifications_history',
			],
			enabled_features: [
				'move_logo_to_main_pane',
				// 'dome_widget',
				'same_data_requery',
				// 'hide_left_toolbar_by_default',
			],
			overrides : overrides[ theme ],
			brokerFactory: ( host ) => {
				this.Broker.SetHost( host );
				return this.Broker;
			},
			brokerConfig: {
				configFlags: {
					supportBottomWidget         : false,
					supportDemoLiveSwitcher     : false,
					// order
					supportTrades               : false,
					supportTradeBrackets        : false,
					supportOrderBrackets        : false,
					supportMarketBrackets       : false,
					supportStopLimitOrders      : false,
					supportModifyDuration       : false,
					showQuantityInsteadOfAmount : false,
					// dom
					supportLevel2Data           : false,
					// position
					supportMultiposition        : false,
					supportPositionBrackets     : false,
					supportReversePosition      : false,
					supportReducePosition       : false,
					supportClosePosition        : false,
					supportPLUpdate             : false,
				},
			},
			...tv
		}
	}

	onReady( $event ) {
		this.widget = $event;
		this.initBroker( this.widget );
		this.initWidgetButtons( this.widget );
	}

	initBroker( widget ) {
		// widget: on esc
		// not used
		// const { logger, i18n, api } = this.broker;
		// this.brokers = new Brokers.TV({ logger, i18n, api, widget });
/*
		// LibrarySymbolInfo
		widget.chart().onSymbolChanged().subscribe( null, ( librarySymbolInfo ) => {
			this.logger.debug( 'onSymbolChanged', librarySymbolInfo );
		});
 */
		// onTick
		widget.subscribe( 'onTick', ( event ) => {
			// this.logger.debug( 'widget, onTick', event );
			this.widgetTickStream.next( event );
		});
	}

	initWidgetButtons( widget ) {
		// switch light/dark
		let link: any;
		switch( this.theme ) {
			case 'dark':
				link  = this.theme_link[ 'light' ];
				break;
			default:
				link  = this.theme_link[ 'dark' ];
				break;
		}
		const _goTheme = () => {
			window.location.assign( link[ 'url' ] );
		};
		let bOptions = { align: 'right' };
		widget.createButton( bOptions )
			.attr( 'title', link[ 'title' ] )
			.on( 'click', () => { _goTheme(); })
			.append( '<span>'+ link[ 'title' ] +'</span>' )
		;
	}

}

