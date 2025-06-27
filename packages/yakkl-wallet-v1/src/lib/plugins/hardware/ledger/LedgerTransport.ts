// Ledger transport abstraction layer

import type { HardwareDevice } from '../common/HardwareWalletTypes';
import { DeviceNotConnectedError, HardwareWalletError } from '../common/HardwareWalletTypes';
import type { LedgerDevice } from './types';

export class LedgerTransport {
	private static instance: LedgerTransport;
	private devices: Map<string, LedgerDevice> = new Map();
	private transportWebHID: any;
	private transportWebUSB: any;

	private constructor() {}

	static getInstance(): LedgerTransport {
		if (!LedgerTransport.instance) {
			LedgerTransport.instance = new LedgerTransport();
		}
		return LedgerTransport.instance;
	}

	async initialize(): Promise<void> {
		// Lazy load the transport libraries
		try {
			const { default: TransportWebHID } = await import('@ledgerhq/hw-transport-webhid');
			this.transportWebHID = TransportWebHID;
		} catch (error) {
			console.warn('WebHID transport not available:', error);
		}

		try {
			const { default: TransportWebUSB } = await import('@ledgerhq/hw-transport-webusb');
			this.transportWebUSB = TransportWebUSB;
		} catch (error) {
			console.warn('WebUSB transport not available:', error);
		}
	}

	async isSupported(): Promise<boolean> {
		// Check if WebHID is available (preferred)
		if ('hid' in navigator) {
			return true;
		}

		// Check if WebUSB is available (fallback)
		if ('usb' in navigator) {
			return true;
		}

		return false;
	}

	async connect(): Promise<HardwareDevice> {
		if (!(await this.isSupported())) {
			throw new HardwareWalletError(
				'Your browser does not support hardware wallet connections. Please use Chrome, Edge, or another Chromium-based browser.',
				'BROWSER_NOT_SUPPORTED',
				'ledger'
			);
		}

		let transport;
		let transportType: 'webhid' | 'webusb' = 'webhid';

		try {
			// Try WebHID first (preferred)
			if (this.transportWebHID && 'hid' in navigator) {
				transport = await this.transportWebHID.create();
				transportType = 'webhid';
			} else if (this.transportWebUSB && 'usb' in navigator) {
				// Fall back to WebUSB
				transport = await this.transportWebUSB.create();
				transportType = 'webusb';
			} else {
				throw new HardwareWalletError(
					'No compatible transport available',
					'NO_TRANSPORT',
					'ledger'
				);
			}
		} catch (error: any) {
			if (
				error.name === 'TransportOpenUserCancelled' ||
				error.message?.includes('No device selected')
			) {
				throw new HardwareWalletError('Connection cancelled by user', 'USER_CANCELLED', 'ledger');
			}

			if (error.message?.includes('Access denied')) {
				throw new HardwareWalletError(
					'Access denied to device. Please try again.',
					'ACCESS_DENIED',
					'ledger'
				);
			}

			throw new HardwareWalletError(
				`Failed to connect to Ledger: ${error.message}`,
				'CONNECTION_FAILED',
				'ledger'
			);
		}

		// Generate a unique ID for this device
		const deviceId = `ledger-${transportType}-${Date.now()}`;

		// Get device model
		let model = 'Ledger Device';
		try {
			const deviceInfo = await transport.device?.getDeviceInfo?.();
			if (deviceInfo?.modelId) {
				model = this.getModelName(deviceInfo.modelId);
			}
		} catch (error) {
			// Device info not available, use default
		}

		const device: LedgerDevice = {
			transport,
			id: deviceId,
			model
		};

		this.devices.set(deviceId, device);

		// Set up disconnect listener
		transport.on('disconnect', () => {
			this.devices.delete(deviceId);
		});

		return {
			id: deviceId,
			type: 'ledger',
			model,
			isConnected: true,
			lastConnected: new Date()
		};
	}

	async disconnect(deviceId: string): Promise<void> {
		const device = this.devices.get(deviceId);
		if (!device) {
			return; // Already disconnected
		}

		try {
			await device.transport.close();
		} catch (error) {
			// Ignore errors during disconnect
		} finally {
			this.devices.delete(deviceId);
		}
	}

	async getConnectedDevices(): Promise<HardwareDevice[]> {
		const devices: HardwareDevice[] = [];

		for (const [deviceId, device] of this.devices.entries()) {
			devices.push({
				id: deviceId,
				type: 'ledger',
				model: device.model,
				isConnected: true
			});
		}

		return devices;
	}

	getTransport(deviceId: string): any {
		const device = this.devices.get(deviceId);
		if (!device) {
			throw new DeviceNotConnectedError('ledger');
		}
		return device.transport;
	}

	private getModelName(modelId: string): string {
		const models: Record<string, string> = {
			'0x10': 'Ledger Nano S',
			'0x20': 'Ledger Nano X',
			'0x40': 'Ledger Nano S Plus',
			'0x50': 'Ledger Stax'
		};

		return models[modelId] || 'Ledger Device';
	}

	async dispose(): Promise<void> {
		// Disconnect all devices
		const deviceIds = Array.from(this.devices.keys());
		await Promise.all(deviceIds.map((id) => this.disconnect(id)));

		this.devices.clear();
	}
}
