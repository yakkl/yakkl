import type { TokenData } from './interfaces';
import { BigNumber } from './bignumber';
import type { BigNumberish } from './bignumber';

/**
 * Computes the balance and value of a token using BigNumber precision.
 * @param token The token data object
 * @returns { balance: BigNumberish, value: BigNumberish }
 */
export function computeTokenValue(token: TokenData): { balance: BigNumberish; value: BigNumberish } {
	// Use BigNumber for precise calculations
	const balance = token?.balance ? BigNumber.from(token.balance) : BigNumber.from(0);

	const price = token?.price?.price ? BigNumber.from(token.price.price) : BigNumber.from(0);
	const value = balance.mul(price);

	return {
		balance: balance.toBigInt(),
		value: value.toBigInt()
	};
}
