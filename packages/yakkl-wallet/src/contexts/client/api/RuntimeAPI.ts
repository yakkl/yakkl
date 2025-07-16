import { backgroundAPI } from './BackgroundAPI';
import type { Manifest, Runtime } from 'webextension-polyfill';

export interface ExtensionInfo {
  id: string;
  version: string;
  name: string;
  shortName?: string;
}

export class RuntimeAPI {
  async getManifest(): Promise<Manifest.WebExtensionManifest> {
    const response = await backgroundAPI.sendMessage<Manifest.WebExtensionManifest>('runtime.getManifest');
    if (!response.success) {
      throw new Error(response.error || 'Failed to get manifest');
    }
    return response.data!;
  }

  async getURL(path: string): Promise<string> {
    const response = await backgroundAPI.sendMessage<string>('runtime.getURL', { path });
    if (!response.success) {
      throw new Error(response.error || 'Failed to get URL');
    }
    return response.data!;
  }

  async getPlatformInfo(): Promise<Runtime.PlatformInfo> {
    const response = await backgroundAPI.sendMessage<Runtime.PlatformInfo>('runtime.getPlatformInfo');
    if (!response.success) {
      throw new Error(response.error || 'Failed to get platform info');
    }
    return response.data!;
  }

  async openOptionsPage(): Promise<void> {
    const response = await backgroundAPI.sendMessage('runtime.openOptionsPage');
    if (!response.success) {
      throw new Error(response.error || 'Failed to open options page');
    }
  }

  async reload(): Promise<void> {
    const response = await backgroundAPI.sendMessage('runtime.reload');
    if (!response.success) {
      throw new Error(response.error || 'Failed to reload extension');
    }
  }

  async getExtensionInfo(): Promise<ExtensionInfo> {
    const manifest = await this.getManifest();
    return {
      id: chrome.runtime.id,
      version: manifest.version,
      name: manifest.name,
      shortName: manifest.short_name
    };
  }

  onInstalled(callback: (details: Runtime.OnInstalledDetailsType) => void): () => void {
    return backgroundAPI.onMessage('runtime.installed', (response) => {
      if (response.success && response.data) {
        callback(response.data);
      }
    });
  }

  onUpdateAvailable(callback: (details: Runtime.OnUpdateAvailableDetailsType) => void): () => void {
    return backgroundAPI.onMessage('runtime.updateAvailable', (response) => {
      if (response.success && response.data) {
        callback(response.data);
      }
    });
  }
}

export const runtimeAPI = new RuntimeAPI();