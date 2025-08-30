export type Numeric = number | bigint;
export type BigNumberish = string | Numeric | BigNumber | {
    _hex: string;
    _isBigNumber: boolean;
} | null;
export declare enum CurrencyCode {
    USD = "USD",
    EUR = "EUR",
    GBP = "GBP"
}
export interface FiatFormatOptions {
    locale?: string;
    decimalPlaces?: number;
    currencyStyle?: 'symbol' | 'code' | 'name';
    smallThreshold?: number;
}
export interface IBigNumber {
    value: BigNumberish;
    toNumber(): number | null;
    toBigInt(decimals?: number): bigint | null;
    fromValue(value: BigNumberish): void;
    max(other: BigNumberish): BigNumber;
    min(other: BigNumberish): BigNumber;
    add(other: BigNumberish): BigNumber;
    subtract(other: BigNumberish): BigNumber;
    sub(other: BigNumberish): BigNumber;
    div(other: BigNumberish): BigNumber;
    mul(other: BigNumberish): BigNumber;
    mod(other: BigNumberish): BigNumber;
    toString(): string;
    toHex(isEthereum?: boolean): string;
}
export declare class BigNumber implements IBigNumber {
    protected _value: BigNumberish;
    constructor(value?: BigNumberish);
    get value(): BigNumberish;
    set value(newValue: BigNumberish);
    compare(other: BigNumberish, decimals?: number): number;
    static isBigNumber(value: any): value is BigNumber;
    static isHexObject(value: any): value is {
        hex: string;
        type: string;
    };
    toNumber(): number | null;
    toBigInt(decimals?: number): bigint | null;
    fromValue(value: BigNumberish): void;
    max(other: BigNumberish): BigNumber;
    min(other: BigNumberish): BigNumber;
    add(other: BigNumberish): BigNumber;
    subtract(other: BigNumberish): BigNumber;
    sub(other: BigNumberish): BigNumber;
    div(other: BigNumberish): BigNumber;
    mul(other: BigNumberish): BigNumber;
    mod(other: BigNumberish): BigNumber;
    toString(): string;
    toHex(isEthereum?: boolean): string;
    static from(value: BigNumberish): BigNumber;
    static toNumber(value: BigNumberish): number | null;
    static toBigInt(value: BigNumberish, decimals?: number): bigint | null;
    static max(a: BigNumberish, b: BigNumberish): BigNumber;
    static min(a: BigNumberish, b: BigNumberish): BigNumber;
    static add(a: BigNumberish, b: BigNumberish): BigNumber;
    static subtract(a: BigNumberish, b: BigNumberish): BigNumber;
    static sub(a: BigNumberish, b: BigNumberish): BigNumber;
    static div(a: BigNumberish, b: BigNumberish): BigNumber;
    static mul(a: BigNumberish, b: BigNumberish): BigNumber;
    static mod(a: BigNumberish, b: BigNumberish): BigNumber;
    static isZero(value: BigNumberish): boolean;
    static isNegative(value: BigNumberish): boolean;
    static abs(value: BigNumberish): BigNumber;
    static negate(value: BigNumberish): BigNumber;
    static pow(base: BigNumberish, exponent: number): BigNumber;
    toWei(): BigNumber;
    toGwei(): BigNumber;
    toEther(): BigNumber;
    toEtherString(): string;
    static fromEther(value: BigNumberish): BigNumber;
    static toWei(value: BigNumberish): BigNumber;
    static toGwei(value: BigNumberish): BigNumber;
    static toEther(value: BigNumberish): BigNumber;
    static fromGwei(value: number | string): BigNumber;
    static toEtherString(value: BigNumberish): string;
    static fromHex(hex: string): BigNumber;
    toFiat(price: number): number;
    static toFiat(value: BigNumberish, price: number | string | BigNumberish): number;
    static toFormattedFiat(value: BigNumberish, price: BigNumberish, currencyCode: CurrencyCode, locale?: string, decimalPlaces?: number): string;
    toFormattedFiat(price: number, currencyCode: CurrencyCode, locale?: string): string;
    mulByPrice(price: number | string, decimals?: number): BigNumber;
    static fromWei(weiValue: BigNumberish, decimals?: number): string;
    toDecimalString(decimals?: number): string;
}
//# sourceMappingURL=BigNumber.d.ts.map