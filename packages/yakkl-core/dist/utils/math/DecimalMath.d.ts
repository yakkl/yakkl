import Decimal from 'decimal.js';
/**
 * DecimalMath - Fluent API for decimal arithmetic operations
 * Provides precise decimal calculations without floating point errors
 */
export declare class DecimalMath {
    private value;
    private constructor();
    static of(val: Decimal | number | string): DecimalMath;
    add(val: Decimal | number | string): DecimalMath;
    sub(val: Decimal | number | string): DecimalMath;
    mul(val: Decimal | number | string): DecimalMath;
    div(val: Decimal | number | string): DecimalMath;
    pct(percent: number): DecimalMath;
    round(decimals?: number): DecimalMath;
    gt(val: Decimal | number | string): boolean;
    lt(val: Decimal | number | string): boolean;
    toDecimal(): Decimal;
    toFixed(decimals?: number): string;
    toNumber(): number;
    toString(): string;
}
//# sourceMappingURL=DecimalMath.d.ts.map