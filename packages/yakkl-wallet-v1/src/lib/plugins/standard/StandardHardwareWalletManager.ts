// Standard hardware wallet manager implementation

import type { IHardwareWalletManager } from '../interfaces/IHardwareWalletManager';
import type {
	HardwareDevice,
	HardwareAccount,
	DiscoveryOptions,
	TransactionData,
	SignedTransaction,
	TypedData,
	TransactionBatch
} from '../hardware/common/HardwareWalletTypes';
import { UpgradeRequiredError } from '../errors/UpgradeRequiredError';
import { LedgerTransport } from '../hardware/ledger/LedgerTransport';
import { LedgerEthereumApp } from '../hardware/ledger/LedgerEthereumApp';
import { LedgerAccountDiscovery } from '../hardware/ledger/LedgerAccountDiscovery';
import { LedgerSigner } from '../hardware/ledger/LedgerSigner';

export class StandardHardwareWalletManager implements IHardwareWalletManager {
	private ledgerTransport: LedgerTransport;
	private ledgerEthApp: LedgerEthereumApp;
	private ledgerDiscovery: LedgerAccountDiscovery;
	private ledgerSigner: LedgerSigner;
	private initialized = false;

	constructor() {
		this.ledgerTransport = LedgerTransport.getInstance();
		this.ledgerEthApp = new LedgerEthereumApp();
		this.ledgerDiscovery = new LedgerAccountDiscovery(this.ledgerEthApp);
		this.ledgerSigner = new LedgerSigner(this.ledgerEthApp);
	}

	async initialize(): Promise<void> {
		if (this.initialized) return;

		await this.ledgerEthApp.initialize();
		this.initialized = true;
	}

	async isSupported(): Promise<boolean> {
		return await this.ledgerTransport.isSupported();
	}

	async connect(): Promise<HardwareDevice> {
		this.ensureInitialized();

		// Check if user already has a connected device (standard users limited to 1)
		const devices = await this.getConnectedDevices();
		if (devices.length > 0) {
			throw new UpgradeRequiredError(
				'Standard users can only connect one hardware wallet at a time. Upgrade to Pro to connect multiple devices.',
				'connectMultipleHardwareWallets',
				'YAKKL_PRO'
			);
		}

		return await this.ledgerTransport.connect();
	}

	async disconnect(deviceId: string): Promise<void> {
		this.ensureInitialized();
		await this.ledgerTransport.disconnect(deviceId);
	}

	async getConnectedDevices(): Promise<HardwareDevice[]> {
		this.ensureInitialized();
		return await this.ledgerTransport.getConnectedDevices();
	}

	async discoverAccounts(deviceId: string, options?: DiscoveryOptions): Promise<HardwareAccount[]> {
		this.ensureInitialized();

		// Standard users limited to 3 accounts
		const maxAccounts = 3;
		const requestedCount = options?.count || 5;

		if (requestedCount > maxAccounts) {
			throw new UpgradeRequiredError(
				`Standard users can discover up to ${maxAccounts} hardware wallet accounts. Upgrade to Pro to discover more.`,
				'discoverMoreHardwareAccounts',
				'YAKKL_PRO'
			);
		}

		return await this.ledgerDiscovery.discoverAccounts(deviceId, {
			...options,
			count: Math.min(requestedCount, maxAccounts)
		});
	}

	async getAccount(deviceId: string, derivationPath: string): Promise<HardwareAccount> {
		this.ensureInitialized();
		return await this.ledgerEthApp.getAddress(deviceId, derivationPath, false);
	}

	async signTransaction(
		deviceId: string,
		derivationPath: string,
		transaction: TransactionData
	): Promise<SignedTransaction> {
		this.ensureInitialized();
		return await this.ledgerSigner.signTransaction(deviceId, derivationPath, transaction);
	}

	async signMessage(deviceId: string, derivationPath: string, message: string): Promise<string> {
		this.ensureInitialized();
		return await this.ledgerSigner.signMessage(deviceId, derivationPath, message);
	}

	async signTypedData(
		deviceId: string,
		derivationPath: string,
		typedData: TypedData
	): Promise<string> {
		this.ensureInitialized();
		return await this.ledgerSigner.signTypedData(deviceId, derivationPath, typedData);
	}

	async verifyAddress(deviceId: string, derivationPath: string): Promise<boolean> {
		this.ensureInitialized();
		return await this.ledgerSigner.verifyAddress(deviceId, derivationPath);
	}

	// Pro features - throw upgrade required error

	async bulkSignTransactions(
		deviceId: string,
		transactions: TransactionBatch[]
	): Promise<SignedTransaction[]> {
		throw new UpgradeRequiredError(
			'Bulk transaction signing is a Pro feature. Upgrade to sign multiple transactions efficiently.',
			'bulkSignTransactions',
			'YAKKL_PRO'
		);
	}

	async exportExtendedPublicKey(deviceId: string, derivationPath: string): Promise<string> {
		throw new UpgradeRequiredError(
			'Extended public key export is a Pro feature. Upgrade to access advanced key management.',
			'exportExtendedPublicKey',
			'YAKKL_PRO'
		);
	}

	async customDerivationPath(deviceId: string, path: string): Promise<HardwareAccount> {
		throw new UpgradeRequiredError(
			'Custom derivation paths are a Pro feature. Upgrade to use advanced account discovery.',
			'customDerivationPath',
			'YAKKL_PRO'
		);
	}

	async dispose(): Promise<void> {
		await this.ledgerTransport.dispose();
		this.initialized = false;
	}

	private ensureInitialized(): void {
		if (!this.initialized) {
			throw new Error('Hardware wallet manager not initialized. Call initialize() first.');
		}
	}
}
