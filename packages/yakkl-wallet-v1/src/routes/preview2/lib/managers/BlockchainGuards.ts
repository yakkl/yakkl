// utils.ts
import type { Blockchain } from './Blockchain';
import { Ethereum } from './blockchains/evm/ethereum/Ethereum';

export function isEthereum(blockchain: Blockchain): blockchain is Ethereum {
	return blockchain instanceof Ethereum;
}
