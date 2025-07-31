import type { TokenData } from './interfaces';
import { EthereumBigNumber } from './bignumber-ethereum';
import type { BigNumberish } from './bignumber';

/**
 * Computes the balance and value of a token using BigNumber precision.
 * @param token The token data object
 * @returns { balance: BigNumberish, value: BigNumberish }
 */
export function computeTokenValue(token: TokenData): { balance: BigNumberish; value: BigNumberish } {
	// Use EthereumBigNumber for precise calculations
	const balance = token?.balance ? EthereumBigNumber.from(token.balance) : EthereumBigNumber.from(0);

	const price = token?.price?.price ? EthereumBigNumber.from(token.price.price) : EthereumBigNumber.from(0);
	const value = balance.mul(price);

	return {
		balance: balance.toBigInt(),
		value: value.toBigInt()
	};
}
