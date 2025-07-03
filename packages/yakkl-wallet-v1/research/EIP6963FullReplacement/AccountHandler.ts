// src/background/handlers/AccountHandler.ts
import type { ProviderMessage } from '../../types/messages';

export class AccountHandler {
	private currentAccounts: string[];
	private currentChainId: number;

	constructor() {
		this.currentAccounts = [];
		this.currentChainId = 1; // Default to mainnet
	}

	public async handleRequest(message: ProviderMessage): Promise<string[]> {
		// Implement account request logic
		// This should handle wallet unlock, account selection, etc.
		return this.currentAccounts;
	}

	public async getChainId(): Promise<string> {
		return `0x${this.currentChainId.toString(16)}`;
	}

	public async switchChain(chainId: number): Promise<void> {
		// Implement chain switching logic
		this.currentChainId = chainId;
	}

	public async updateAccounts(accounts: string[]): Promise<void> {
		this.currentAccounts = accounts;
	}
}
