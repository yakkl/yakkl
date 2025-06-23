// utils.ts
import type { Blockchain } from '$lib/managers/Blockchain';
import { Ethereum } from '$managers/blockchains/evm/ethereum/Ethereum';

export function isEthereum(blockchain: Blockchain): blockchain is Ethereum {
	return blockchain instanceof Ethereum;
}
