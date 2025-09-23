import { log } from './Logger';
import { dateString } from '$lib/common/datetime';
import { setProfileStorage, getYakklSettings, setYakklSettingsStorage } from '$lib/common/stores';
import { getProfile } from '$lib/common/profile';
// MIGRATION: Move to @yakkl/security
// import { encryptData, decryptData } from '@yakkl/security/wallet/encryption-utils';
import { encryptData, decryptData } from '@yakkl/sdk';
import { AccessSourceType, PlanType, PromoClassificationType } from '$lib/common/types';
import { isEncryptedData } from '$lib/common/misc';
import type { ProfileData } from '$lib/common/interfaces';

export interface UpgradeRequest {
	username: string;
	email: string;
	analytics: {
		utm_source: string;
		utm_campaign: string;
		user_location: string;
		upgrade_date: string;
		current_version: string;
		platform: string;
		user_agent: string;
	};
	profileId: string;
	encryptionKey: string;
}

export interface UpgradeResponse {
	success: boolean;
	error?: string;
	customerId?: string;
	upgradeDate?: string;
}

export type UpgradeMessage =
	| {
			type: 'START_UPGRADE';
			data: UpgradeRequest;
	  }
	| {
			type: 'CANCEL_UPGRADE';
	  }
	| {
			type: 'CHECK_STATUS';
	  };

export type UpgradeResponseMessage =
	| {
			type: 'UPGRADE_STARTED';
	  }
	| {
			type: 'UPGRADE_COMPLETED';
			data: UpgradeResponse;
	  }
	| {
			type: 'UPGRADE_ERROR';
			error: string;
	  }
	| {
			type: 'UPGRADE_PROGRESS';
			progress: number;
			status: string;
	  }
	| {
			type: 'CANCEL_UPGRADE';
	  };

export class UpgradeManager {
	private static instance: UpgradeManager;
	private messagePort: MessagePort | null = null;
	private upgradeTimeout: number = 30000; // 30 seconds
	private maxRetries: number = 3;
	private currentUpgradeId: string | null = null;
	private messageHandlers: Map<string, (message: UpgradeResponseMessage) => void> = new Map();

	private constructor() {
		this.initializeMessagePort();
	}

	static getInstance(): UpgradeManager {
		if (!UpgradeManager.instance) {
			UpgradeManager.instance = new UpgradeManager();
		}
		return UpgradeManager.instance;
	}

	private initializeMessagePort() {
		// In a real implementation, this would set up the message port
		// For now, we'll simulate the background process
	}

	async processUpgrade(request: UpgradeRequest): Promise<void> {
		try {
			this.currentUpgradeId = `upgrade-${Date.now()}`;
			this.sendMessage({ type: 'UPGRADE_STARTED' });

			// Get current profile and settings
			const profile = await getProfile();
			const settings = await getYakklSettings();

			if (!profile || !settings) {
				throw new Error('Profile or settings not found');
			}

			// Update progress
			this.sendMessage({
				type: 'UPGRADE_PROGRESS',
				progress: 25,
				status: 'Preparing upgrade data...'
			});

			// Make API call
			const response = await this.makeApiCall(request);

			if (!response.success) {
				throw new Error(response.error || 'Upgrade failed');
			}

			// Update progress
			this.sendMessage({
				type: 'UPGRADE_PROGRESS',
				progress: 75,
				status: 'Updating local data...'
			});

			// TODO: Update to Pro Plus if needed

			// Update local data
			if (isEncryptedData(profile.data)) {
				const decryptedData = (await decryptData(
					profile.data,
					request.encryptionKey
				)) as ProfileData;
				decryptedData.registered = {
					...decryptedData.registered,
					plan: {
						type: PlanType.YAKKL_PRO,
						source: AccessSourceType.SUBSCRIBED,
						promo: PromoClassificationType.NONE, // These values need to be updated to the correct values - TODO: Add the correct values
						trialEndDate: '',
						upgradeDate: ''
					},
					key: response.customerId || `PRO-${dateString()}`,
					updateDate: dateString()
				};
				profile.data = await encryptData(decryptedData, request.encryptionKey);
			}

			// Update settings
			settings.plan = {
				type: PlanType.YAKKL_PRO,
				source: AccessSourceType.SUBSCRIBED,
				promo: PromoClassificationType.NONE, // These values need to be updated to the correct values - TODO: Add the correct values
				trialEndDate: '',
				upgradeDate: ''
			};
			settings.upgradeDate = dateString();
			settings.updateDate = dateString();

			// Save changes
			await setProfileStorage(profile);
			await setYakklSettingsStorage(settings);

			// Send completion message
			this.sendMessage({
				type: 'UPGRADE_COMPLETED',
				data: {
					success: true,
					customerId: response.customerId,
					upgradeDate: dateString()
				}
			});
		} catch (error) {
			log.error('Error in upgrade process:', false, error);
			this.sendMessage({
				type: 'UPGRADE_ERROR',
				error: error instanceof Error ? error.message : 'An error occurred during upgrade'
			});
		}
	}

	private async makeApiCall(request: UpgradeRequest): Promise<UpgradeResponse> {
		let retries = 0;

		while (retries < this.maxRetries) {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), this.upgradeTimeout);

				const response = await fetch('https://api.yakkl.com/wallet/upgrade', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(request),
					signal: controller.signal
				});

				clearTimeout(timeoutId);

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const data = await response.json();
				return {
					success: true,
					customerId: data.customerId,
					upgradeDate: data.upgradeDate
				};
			} catch (error) {
				retries++;
				if (retries === this.maxRetries) {
					throw error;
				}
				// Wait before retrying (exponential backoff)
				await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 1000));
			}
		}

		throw new Error('Max retries exceeded');
	}

	private sendMessage(message: UpgradeResponseMessage) {
		// In a real implementation, this would send the message through the message port
		// For now, we'll notify any registered handlers
		this.messageHandlers.forEach((handler) => handler(message));
	}

	registerMessageHandler(handler: (message: UpgradeResponseMessage) => void): () => void {
		const id = Math.random().toString(36).substr(2, 9);
		this.messageHandlers.set(id, handler);
		return () => this.messageHandlers.delete(id);
	}

	cancelUpgrade() {
		if (this.currentUpgradeId) {
			this.sendMessage({ type: 'CANCEL_UPGRADE' });
			this.currentUpgradeId = null;
		}
	}
}
