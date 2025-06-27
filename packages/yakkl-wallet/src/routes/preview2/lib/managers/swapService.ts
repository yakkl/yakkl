// swapService.ts

import WalletManager from './WalletManager';
import { UniswapSwapManager } from './UniswapSwapManager';
import { SushiSwapManager } from './SushiswapSwapManager';
import { SwapAggregator } from './SwapAggregator';
import type { Ethereum } from './blockchains/evm/ethereum/Ethereum';

async function initializeServices() {
	const wallet = WalletManager.getInstance(['Alchemy'], ['Ethereum'], 1);
	const blockchain = wallet.getBlockchain();
	
	// Type guard to ensure we have Ethereum blockchain
	if (!('getGasPrice' in blockchain)) {
		throw new Error('Expected Ethereum blockchain');
	}
	
	const ethereumBlockchain = blockchain as Ethereum;
	const provider = wallet.getProvider();

	if (!provider) {
		throw new Error('Provider not initialized');
	}

	const uniswapManager = new UniswapSwapManager(ethereumBlockchain, provider);
	const sushiSwapManager = new SushiSwapManager(ethereumBlockchain, provider, 'SUSHISWAP_ROUTER_ADDRESS');

	const swapAggregator = new SwapAggregator([uniswapManager /* sushiSwapManager */]);

	return { swapAggregator, uniswapManager, sushiSwapManager };
}

export const swapServices = initializeServices();
