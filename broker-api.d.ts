/// <reference types="jquery" />

export interface ISubscription<TFunc extends Function> {
	subscribe(obj: object | null, member: TFunc, singleshot?: boolean): void;
	unsubscribe(obj: object | null, member: TFunc): void;
	unsubscribeAll(obj: object | null): void;
}
export interface IDelegate<TFunc extends Function> extends ISubscription<TFunc> {
	fire: TFunc;
}
export interface IDestroyable {
	destroy(): void;
}
export interface WatchedValueSubscribeOptions {
	once?: boolean;
	callWithLast?: boolean;
}
export interface IWatchedValueReadonly<T> {
	value(): T;
	subscribe(callback: (value: T) => void, options?: WatchedValueSubscribeOptions): void;
	unsubscribe(callback?: ((value: T) => void) | null): void;
	spawn(): IWatchedValueReadonlySpawn<T>;
}
export interface IWatchedValueReadonlySpawn<T> extends IWatchedValueReadonly<T>, IDestroyable {
}
export declare type WatchedValueCallback<T> = (value: T) => void;
export interface IWatchedValue<T> extends IWatchedValueReadonly<T> {
	value(): T;
	setValue(value: T, forceUpdate?: boolean): void;
	subscribe(callback: WatchedValueCallback<T>, options?: WatchedValueSubscribeOptions): void;
	unsubscribe(callback?: WatchedValueCallback<T> | null): void;
	readonly(): IWatchedValueReadonly<T>;
	spawn(): IWatchedValueSpawn<T>;
}
export interface IWatchedValueSpawn<T> extends IWatchedValueReadonlySpawn<T>, IWatchedValue<T> {
	spawn(): IWatchedValueSpawn<T>;
}
export declare const enum ConnectionStatus {
	Connected = 1,
	Connecting = 2,
	Disconnected = 3,
	Error = 4,
}
export declare const enum OrderType {
	Limit = 1,
	Market = 2,
	Stop = 3,
	StopLimit = 4,
}
export declare const enum Side {
	Buy = 1,
	Sell = -1,
}
export declare const enum OrderStatus {
	Canceled = 1,
	Filled = 2,
	Inactive = 3,
	Placing = 4,
	Rejected = 5,
	Working = 6,
}
export declare const enum ParentType {
	Order = 1,
	Position = 2,
	Trade = 3,
}
export declare const enum OrderTicketFocusControl {
	StopLoss = 1,
	StopPrice = 2,
	TakeProfit = 3,
}
export declare const enum NotificationType {
	Error = 0,
	Success = 1,
}
export declare const enum ConnectionType {
	Demo = 1,
	Real = 0,
}
export interface FormatterParseResult {
	res: boolean;
}
export interface ErrorFormatterParseResult extends FormatterParseResult {
	error?: string;
	res: false;
}
export interface SuccessFormatterParseResult extends FormatterParseResult {
	res: true;
	suggest?: string;
}
export interface IFormatter {
	format(value: any): string;
	parse?(value: string): ErrorFormatterParseResult | SuccessFormatterParseResult;
}
export declare type LanguageCode = 'ar' | 'zh' | 'cs' | 'da_DK' | 'nl_NL' | 'en' | 'et_EE' | 'fr' | 'de' | 'el' | 'he_IL' | 'hu_HU' | 'id_ID' | 'it' | 'ja' | 'ko' | 'fa' | 'pl' | 'pt' | 'ro' | 'ru' | 'sk_SK' | 'es' | 'sv' | 'th' | 'tr' | 'vi';
export interface TableRow {
	priceFormatter?: IFormatter;
	[name: string]: any;
}
export interface TableFormatterInputs {
	value: number | string | Side | OrderType | OrderStatus;
	prevValue?: number | undefined;
	row: TableRow;
	$container: JQuery;
	priceFormatter?: IFormatter;
}
export declare type TableElementFormatFunction = (inputs: TableFormatterInputs) => string | JQuery;
export interface TableElementFormatter {
	name: string;
	format: TableElementFormatFunction;
}
export declare type StandardFormatterName = 'date' | 'default' | 'fixed' | 'formatPrice' | 'formatPriceForexSup' | 'integerSeparated' | 'localDate' | 'percentage' | 'pips' | 'profit' | 'side' | 'status' | 'symbol' | 'type';
export interface DOMLevel {
	price: number;
	volume: number;
}
export interface DOMData {
	snapshot: boolean;
	asks: DOMLevel[];
	bids: DOMLevel[];
}
export interface QuantityMetainfo {
	min: number;
	max: number;
	step: number;
	default?: number;
}
export interface InstrumentInfo {
	qty: QuantityMetainfo;
	pipValue: number;
	pipSize: number;
	minTick: number;
	description: string;
	domVolumePrecision?: number;
}
export interface CustomFields {
	[key: string]: any;
}
export interface PreOrder {
	symbol: string;
	brokerSymbol?: string;
	type?: OrderType;
	side?: Side;
	qty: number;
	status?: OrderStatus;
	stopPrice?: number;
	limitPrice?: number;
	stopLoss?: number;
	takeProfit?: number;
	duration?: OrderDuration;
}
export interface PlacedOrder extends PreOrder, CustomFields {
	id: string;
	filledQty?: number;
	avgPrice?: number;
	updateTime?: number;
	takeProfit?: number;
	stopLoss?: number;
	type: OrderType;
	side: Side;
	status: OrderStatus;
}
export interface OrderWithParent extends PlacedOrder {
	parentId: string;
	parentType: ParentType;
}
export declare type Order = OrderWithParent | PlacedOrder;
export interface Position {
	id: string;
	symbol: string;
	brokerSymbol?: string;
	qty: number;
	side: Side;
	avgPrice: number;
	[key: string]: any;
}
export interface Trade extends CustomFields {
	id: string;
	date: number;
	symbol: string;
	brokerSymbol?: string;
	qty: number;
	side: Side;
	price: number;
}
export interface Execution extends CustomFields {
	symbol: string;
	brokerSymbol?: string;
	price: number;
	qty: number;
	side: Side;
	time: number;
}
export interface AccountInfo {
	id: string;
	name: string;
	currency?: string;
	currencySign?: string;
}
export interface AccountManagerColumn {
	id?: string;
	label: string;
	className?: string;
	formatter?: StandardFormatterName | 'orderSettings' | 'posSettings' | string;
	property?: string;
	sortProp?: string;
	modificationProperty?: string;
	notSortable?: boolean;
	help?: string;
	highlightDiff?: boolean;
	fixedWidth?: boolean;
	notHideable?: boolean;
	hideByDefault?: boolean;
}
export interface SortingParameters {
	columnId: string;
	asc?: boolean;
}
export interface AccountManagerTable {
	id: string;
	title?: string;
	columns: AccountManagerColumn[];
	initialSorting?: SortingParameters;
	changeDelegate: ISubscription<(data: {}) => void>;
	getData(): Promise<{}[]>;
}
export interface AccountManagerPage {
	id: string;
	title: string;
	tables: AccountManagerTable[];
}
export interface AccountManagerInfo {
	accountTitle: string;
	accountsList?: AccountInfo[];
	account?: IWatchedValue<AccountInfo>;
	summary: AccountManagerSummaryField[];
	customFormatters?: TableElementFormatter[];
	orderColumns: AccountManagerColumn[];
	historyColumns?: AccountManagerColumn[];
	positionColumns: AccountManagerColumn[];
	tradeColumns?: AccountManagerColumn[];
	pages: AccountManagerPage[];
	possibleOrderStatuses?: OrderStatus[];
	contextMenuActions?(contextMenuEvent: JQueryEventObject, activePageActions: ActionMetaInfo[]): Promise<ActionMetaInfo[]>;
}
export interface TradingQuotes {
	trade?: number;
	size?: number;
	bid?: number;
	bid_size?: number;
	ask?: number;
	ask_size?: number;
	spread?: number;
}
export interface ActionDescription {
	text?: '-' | string;
	separator?: boolean;
	shortcut?: string;
	tooltip?: string;
	checked?: boolean;
	checkable?: boolean;
	enabled?: boolean;
	externalLink?: boolean;
}
export interface MenuSeparator extends ActionDescription {
	separator: boolean;
}
export interface ActionDescriptionWithCallback extends ActionDescription {
	action: (a: ActionDescription) => void;
}
export declare type ActionMetaInfo = ActionDescriptionWithCallback | MenuSeparator;
export interface AccountManagerSummaryField {
	text: string;
	wValue: IWatchedValueReadonly<number>;
	formatter?: string;
}
export interface OrderDurationMetaInfo {
	hasDatePicker?: boolean;
	hasTimePicker?: boolean;
	name: string;
	value: string;
}
export interface OrderDuration {
	/**
	 * type is OrderDurationMetaInfo.value
	 */
	type: string;
	datetime?: number;
}
export interface BrokerConfigFlags {
	showQuantityInsteadOfAmount?: boolean;
	supportOrderBrackets?: boolean;
	supportPositionBrackets?: boolean;
	supportTradeBrackets?: boolean;
	supportTrades?: boolean;
	supportClosePosition?: boolean;
	supportCloseTrade?: boolean;
	supportEditAmount?: boolean;
	supportLevel2Data?: boolean;
	supportMultiposition?: boolean;
	supportPLUpdate?: boolean;
	supportReducePosition?: boolean;
	supportReversePosition?: boolean;
	supportStopLimitOrders?: boolean;
	supportDemoLiveSwitcher?: boolean;
	supportCustomPlaceOrderTradableCheck?: boolean;
	supportMarketBrackets?: boolean;
	supportSymbolSearch?: boolean;
	supportModifyDuration?: boolean;
	supportModifyOrder?: boolean;
	calculatePLUsingLast?: boolean;
	requiresFIFOCloseTrades?: boolean;
	supportBottomWidget?: boolean;
	/**
	 * @deprecated
	 */
	supportBrackets?: boolean;
}
export interface SingleBrokerMetaInfo {
	configFlags: BrokerConfigFlags;
	customNotificationFields?: string[];
	durations?: OrderDurationMetaInfo[];
}
export interface Brackets {
	stopLoss?: number;
	takeProfit?: number;
}
export interface DefaultContextMenuActionsParams {
}
export interface DefaultDropdownActionsParams {
	showFloatingToolbar?: boolean;
	showDOM?: boolean;
	tradingProperties?: boolean;
	selectAnotherBroker?: boolean;
	disconnect?: boolean;
	showHowToUse?: boolean;
}
export interface ITradeContext {
	symbol: string;
	displaySymbol: string;
	value: number | null;
	formattedValue: string;
	last: number;
}
export interface QuotesBase {
	change: number;
	change_percent: number;
	last_price: number;
	fractional: number;
	minmov: number;
	minmove2: number;
	pricescale: number;
	description: string;
}
export interface OrderDialogOptions {
	customFields?: (TextWithCheckboxFieldMetaInfo | CustomInputFieldMetaInfo)[];
}
export interface BaseInputFieldValidatorResult {
	valid: boolean;
}
export interface PositiveBaseInputFieldValidatorResult extends BaseInputFieldValidatorResult {
	valid: true;
}
export interface NegativeBaseInputFieldValidatorResult extends BaseInputFieldValidatorResult {
	valid: false;
	errorMessage: string;
}
export declare type InputFieldValidatorResult = PositiveBaseInputFieldValidatorResult | NegativeBaseInputFieldValidatorResult;
export declare type InputFieldValidator = (value: any) => InputFieldValidatorResult;
export interface CustomInputFieldMetaInfo {
	id: string;
	title: string;
	placeHolder: string;
	value: any;
	validator?: InputFieldValidator;
	customInfo?: any;
}
export interface TextWithCheckboxValue {
	text: string;
	checked: boolean;
}
export interface TextWithCheckboxFieldCustomInfo {
	checkboxTitle: string;
	asterix?: boolean;
}
export declare type TextInputFieldValidator = (value: string) => InputFieldValidatorResult;
export interface TextWithCheckboxFieldMetaInfo extends CustomInputFieldMetaInfo {
	value: TextWithCheckboxValue;
	customInfo: TextWithCheckboxFieldCustomInfo;
	validator?: TextInputFieldValidator;
}
export interface CustomInputFieldsValues {
	[fieldId: string]: TextWithCheckboxValue | any;
}
export interface IBrokerCommon {
	chartContextMenuActions(context: ITradeContext, options?: DefaultContextMenuActionsParams): Promise<ActionMetaInfo[]>;
	isTradable(symbol: string): Promise<boolean>;
	connectionStatus(): ConnectionStatus;
	placeOrder(order: PreOrder, silently?: boolean): Promise<void>;
	modifyOrder(order: Order, silently?: boolean, focus?: OrderTicketFocusControl): Promise<void>;
	orders(): Promise<Order[]>;
	positions(): Promise<Position[]>;
	trades?(): Promise<Trade[]>;
	executions(symbol: string): Promise<Execution[]>;
	symbolInfo(symbol: string): Promise<InstrumentInfo>;
	accountInfo(): Promise<AccountInfo>;
	editPositionBrackets?(positionId: string, focus?: OrderTicketFocusControl, brackets?: Brackets, silently?: boolean): Promise<void>;
	editTradeBrackets?(tradeId: string, focus?: OrderTicketFocusControl, brackets?: Brackets, silently?: boolean): Promise<void>;
	accountManagerInfo(): AccountManagerInfo | any;
	formatter?(symbol: string): Promise<IFormatter>;
	spreadFormatter?(symbol: string): Promise<IFormatter>;
}
export interface SuggestedQuantity {
	changed: IDelegate<(symbol: string) => void>;
	value(symbol: string): Promise<number>;
	setValue(symbol: string, value: number): void;
}
export interface IBrokerConnectionAdapterFactory {
	createDelegate<T extends Function>(): IDelegate<T>;
	createWatchedValue<T>(value?: T): IWatchedValue<T>;
}
export interface IBrokerConnectionAdapterHost {
	factory: IBrokerConnectionAdapterFactory;
	connectionStatusUpdate(status: ConnectionStatus, message?: string): void;
	defaultFormatter(symbol: string): Promise<IFormatter>;
	numericFormatter(decimalPlaces: number): Promise<IFormatter>;
	defaultContextMenuActions(context: ITradeContext, params?: DefaultContextMenuActionsParams): Promise<ActionMetaInfo[]>;
	defaultDropdownMenuActions(options?: Partial<DefaultDropdownActionsParams>): ActionMetaInfo[];
	floatingTradingPanelVisibility(): IWatchedValue<boolean>;
	domVisibility(): IWatchedValue<boolean>;
	silentOrdersPlacement(): IWatchedValue<boolean>;
	patchConfig(config: Partial<BrokerConfigFlags>): void;
	setDurations(durations: OrderDurationMetaInfo[]): void;
	orderUpdate(order: Order, isHistoryUpdate?: boolean): void;
	orderPartialUpdate(id: string, orderChanges: Partial<Order>): void;
	positionUpdate(position: Position, isHistoryUpdate?: boolean): void;
	positionPartialUpdate(id: string, positionChanges: Partial<Position>): void;
	tradeUpdate(trade: Trade, isHistoryUpdate?: boolean): void;
	tradePartialUpdate(id: string, tradeChanges: Partial<Trade>): void;
	executionUpdate(execution: Execution, isHistoryUpdate?: boolean): void;
	fullUpdate(): void;
	realtimeUpdate(symbol: string, data: TradingQuotes): void;
	plUpdate(positionId: string, pl: number): void;
	tradePLUpdate(tradeId: string, pl: number): void;
	equityUpdate(equity: number): void;
	domeUpdate(symbol: string, equity: DOMData): void;
	showOrderDialog<T extends PreOrder>(order: T, handler: (order: T, customFieldsResult?: CustomInputFieldsValues) => Promise<void>, focus?: OrderTicketFocusControl, options?: OrderDialogOptions): Promise<void>;
	showCancelOrderDialog(orderId: string, handler: () => void): Promise<void>;
	showCancelMultipleOrdersDialog(symbol: string, side: Side | undefined, qty: number, handler: () => void): Promise<void>;
	showCancelBracketsDialog(orderId: string, handler: () => void): Promise<void>;
	showCancelMultipleBracketsDialog(orderId: string, handler: () => void): Promise<void>;
	showClosePositionDialog(positionId: string, handler: () => void): Promise<void>;
	showReversePositionDialog(position: Position, handler: () => void): Promise<void>;
	showPositionBracketsDialog(position: Position | Trade, brackets: Brackets, focus: OrderTicketFocusControl | null, handler: (brackets: Brackets) => void): Promise<void>;
	showNotification(title: string, text: string, notificationType?: NotificationType): void;
	setButtonDropdownActions(descriptions: ActionMetaInfo[]): void;
	activateBottomWidget(): Promise<void>;
	showTradingProperties(): void;
	suggestedQty(): SuggestedQuantity;
	symbolSnapshot(symbol: string): Promise<QuotesBase>;
}
export interface IBrokerWithoutRealtime extends IBrokerCommon {
	subscribeDOME?(symbol: string): void;
	unsubscribeDOME?(symbol: string): void;
	cancelOrder(orderId: string, silently: boolean): Promise<void>;
	cancelOrders(symbol: string, side: Side | undefined, ordersIds: string[], silently: boolean): Promise<void>;
	reversePosition?(positionId: string, silently?: boolean): Promise<void>;
	closePosition(positionId: string, silently: boolean): Promise<void>;
	closeTrade?(tradeId: string, silently: boolean): Promise<void>;
	/**
	 * @deprecated Brokers should always send PL and equity updates
	 */
	subscribePL?(positionId: string): void;
	subscribeEquity?(): void;
	/**
	 * @deprecated
	 */
	unsubscribePL?(positionId: string): void;
	unsubscribeEquity?(): void;
}
export interface IBrokerTerminal extends IBrokerWithoutRealtime {
	subscribeRealtime(symbol: string): void;
	unsubscribeRealtime(symbol: string): void;
}

export as namespace TradingView;
