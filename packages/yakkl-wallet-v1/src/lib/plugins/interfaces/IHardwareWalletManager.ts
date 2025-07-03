// Interface for hardware wallet management plugins

import type {
	HardwareDevice,
	HardwareAccount,
	DiscoveryOptions,
	TransactionData,
	SignedTransaction,
	TypedData,
	TransactionBatch
} from '../hardware/common/HardwareWalletTypes';

export interface IHardwareWalletManager {
	// Connection Management
	isSupported(): Promise<boolean>;
	connect(): Promise<HardwareDevice>;
	disconnect(deviceId: string): Promise<void>;
	getConnectedDevices(): Promise<HardwareDevice[]>;

	// Account Management
	discoverAccounts(deviceId: string, options?: DiscoveryOptions): Promise<HardwareAccount[]>;
	getAccount(deviceId: string, derivationPath: string): Promise<HardwareAccount>;

	// Signing Operations
	signTransaction(
		deviceId: string,
		derivationPath: string,
		transaction: TransactionData
	): Promise<SignedTransaction>;
	signMessage(deviceId: string, derivationPath: string, message: string): Promise<string>;
	signTypedData(deviceId: string, derivationPath: string, typedData: TypedData): Promise<string>;

	// Address Verification
	verifyAddress(deviceId: string, derivationPath: string): Promise<boolean>;

	// Pro Features
	bulkSignTransactions(
		deviceId: string,
		transactions: TransactionBatch[]
	): Promise<SignedTransaction[]>;
	exportExtendedPublicKey(deviceId: string, derivationPath: string): Promise<string>;
	customDerivationPath(deviceId: string, path: string): Promise<HardwareAccount>;

	// Lifecycle
	initialize(): Promise<void>;
	dispose(): Promise<void>;
}
