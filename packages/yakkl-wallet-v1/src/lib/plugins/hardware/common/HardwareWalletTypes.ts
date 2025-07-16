// Hardware wallet common types and interfaces

export interface HardwareDevice {
	id: string;
	type: 'ledger' | 'trezor' | 'keystone'; // Extensible for future hardware wallets
	model: string;
	firmwareVersion?: string;
	isConnected: boolean;
	lastConnected?: Date;
}

export interface HardwareAccount {
	address: string;
	derivationPath: string;
	publicKey: string;
	deviceId: string;
	deviceType: HardwareDevice['type'];
	chainCode?: string;
	parentFingerprint?: string;
	index: number;
}

export interface DiscoveryOptions {
	startIndex?: number;
	count?: number;
	chainId?: number;
	showOnDevice?: boolean;
}

export interface TransactionData {
	to: string;
	value: string;
	data?: string;
	nonce?: string;
	gasPrice?: string;
	gasLimit?: string;
	maxFeePerGas?: string;
	maxPriorityFeePerGas?: string;
	chainId: number;
	type?: number;
}

export interface SignedTransaction {
	v: string;
	r: string;
	s: string;
	serialized?: string;
}

export interface TypedData {
	domain: {
		name?: string;
		version?: string;
		chainId?: number;
		verifyingContract?: string;
		salt?: string;
	};
	message: Record<string, any>;
	primaryType: string;
	types: Record<string, Array<{ name: string; type: string }>>;
}

export interface TransactionBatch {
	derivationPath: string;
	transaction: TransactionData;
}

export class HardwareWalletError extends Error {
	constructor(
		message: string,
		public code: string,
		public deviceType?: string
	) {
		super(message);
		this.name = 'HardwareWalletError';
	}
}

export class DeviceNotConnectedError extends HardwareWalletError {
	constructor(deviceType?: string) {
		super('Hardware device not connected', 'DEVICE_NOT_CONNECTED', deviceType);
	}
}

export class UserRejectedError extends HardwareWalletError {
	constructor(deviceType?: string) {
		super('User rejected the operation on device', 'USER_REJECTED', deviceType);
	}
}

export class WrongAppError extends HardwareWalletError {
	constructor(expectedApp: string, deviceType?: string) {
		super(`Please open the ${expectedApp} app on your device`, 'WRONG_APP', deviceType);
	}
}

export class UnsupportedOperationError extends HardwareWalletError {
	constructor(operation: string, deviceType?: string) {
		super(`Operation "${operation}" is not supported`, 'UNSUPPORTED_OPERATION', deviceType);
	}
}
