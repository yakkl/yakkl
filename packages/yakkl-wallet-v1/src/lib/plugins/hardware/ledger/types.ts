// Ledger-specific types

export interface LedgerDevice {
	transport: any; // Will be typed as Transport from @ledgerhq/hw-transport
	id: string;
	model: string;
	appVersion?: string;
}

export interface LedgerDerivationPath {
	purpose: number; // 44' for BIP44
	coinType: number; // 60' for Ethereum
	account: number;
	change: number; // 0 for external chain
	index: number;
}

export function parseDerivationPath(path: string): LedgerDerivationPath {
	const parts = path.split('/').filter((p) => p !== 'm');
	if (parts.length !== 5) {
		throw new Error('Invalid derivation path format');
	}

	return {
		purpose: parseInt(parts[0].replace("'", '')),
		coinType: parseInt(parts[1].replace("'", '')),
		account: parseInt(parts[2].replace("'", '')),
		change: parseInt(parts[3]),
		index: parseInt(parts[4])
	};
}

export function formatDerivationPath(path: LedgerDerivationPath): string {
	return `m/${path.purpose}'/${path.coinType}'/${path.account}'/${path.change}/${path.index}`;
}

export const DEFAULT_ETHEREUM_PATH = "m/44'/60'/0'/0/0";
export const LEDGER_LIVE_PATH = "m/44'/60'/0'/0/0"; // Ledger Live default
export const MEW_PATH = "m/44'/60'/0'"; // MyEtherWallet default

export interface LedgerAppConfig {
	name: string;
	version: string;
	flags: {
		isArbitraryDataEnabled: boolean;
	};
}
