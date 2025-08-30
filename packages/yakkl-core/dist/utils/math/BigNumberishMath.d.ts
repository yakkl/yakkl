import Decimal from 'decimal.js';
import { type BigNumberish } from '../BigNumber';
/**
 * BigNumberishMath - Mathematical operations for BigNumberish types
 * Provides fluent API for arithmetic operations on large numbers
 */
export declare class BigNumberishMath {
    private value;
    private constructor();
    static of(value: BigNumberish): BigNumberishMath;
    add(other: BigNumberish): BigNumberishMath;
    sub(other: BigNumberish): BigNumberishMath;
    mul(other: BigNumberish): BigNumberishMath;
    div(other: BigNumberish): BigNumberishMath;
    mod(other: BigNumberish): BigNumberishMath;
    compare(other: BigNumberish): number;
    gt(other: BigNumberish): boolean;
    gte(other: BigNumberish): boolean;
    lt(other: BigNumberish): boolean;
    lte(other: BigNumberish): boolean;
    eq(other: BigNumberish): boolean;
    toBigInt(): bigint;
    toNumber(): number;
    toDecimal(decimals?: number): Decimal;
    toString(): string;
}
//# sourceMappingURL=BigNumberishMath.d.ts.map