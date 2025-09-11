import { StoreAdapter, ChangeMetadata, Unsubscriber } from '../types';
//@ts-ignore
import type {
  ChromeStorageArea,
  ChromeStorageChange,
} from '../types/chrome';

// Type guard to check if chrome storage is available
function isChromeStorageAvailable(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    chrome?.storage !== undefined &&
    chrome?.storage?.local !== undefined
  );
}

export class ChromeStorageAdapter<T> implements StoreAdapter<T> {
  private storage: ChromeStorageArea | null = null;

  constructor(
    storageType: 'local' | 'sync' | 'session',
    private key: string
  ) {
    if (isChromeStorageAvailable() && chrome?.storage) {
      if (storageType === 'local') {
        this.storage = chrome.storage.local;
      } else if (storageType === 'sync') {
        this.storage = chrome.storage.sync;
      } else if (storageType === 'session' && chrome.storage.session) {
        this.storage = chrome.storage.session;
      }
    }
  }

  async read(): Promise<T | null> {
    if (!this.storage) {
      console.warn('Chrome storage not available');
      return null;
    }

    const result = await this.storage.get(this.key);
    return result[this.key] || null;
  }

  async write(value: T): Promise<void> {
    if (!this.storage) {
      console.warn('Chrome storage not available');
      return;
    }

    await this.storage.set({ [this.key]: value });
  }

  async delete(): Promise<void> {
    if (!this.storage) {
      console.warn('Chrome storage not available');
      return;
    }

    await this.storage.remove(this.key);
  }

  watch(callback: (value: T, metadata?: ChangeMetadata) => void): Unsubscriber {
    if (!isChromeStorageAvailable() || !chrome?.storage?.onChanged) {
      console.warn('Chrome storage change events not available');
      return () => {};
    }

    const listener = (changes: { [key: string]: ChromeStorageChange }) => {
      if (changes[this.key]) {
        callback(changes[this.key].newValue, {
          timestamp: Date.now(),
          source: 'chrome-storage',
          operation: 'sync',
        });
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => {
      if (chrome?.storage?.onChanged) {
        chrome.storage.onChanged.removeListener(listener);
      }
    };
  }
}

export class LocalStorageAdapter<T> implements StoreAdapter<T> {
  constructor(private key: string) {}

  async read(): Promise<T | null> {
    if (typeof localStorage === 'undefined') {
      console.warn('localStorage not available');
      return null;
    }

    const item = localStorage.getItem(this.key);
    return item ? JSON.parse(item) : null;
  }

  async write(value: T): Promise<void> {
    if (typeof localStorage === 'undefined') {
      console.warn('localStorage not available');
      return;
    }

    localStorage.setItem(this.key, JSON.stringify(value));
  }

  async delete(): Promise<void> {
    if (typeof localStorage === 'undefined') {
      console.warn('localStorage not available');
      return;
    }

    localStorage.removeItem(this.key);
  }

  watch(callback: (value: T, metadata?: ChangeMetadata) => void): Unsubscriber {
    if (typeof window === 'undefined') {
      console.warn('window not available for storage events');
      return () => {};
    }

    const listener = (event: StorageEvent) => {
      if (event.key === this.key && event.newValue) {
        callback(JSON.parse(event.newValue), {
          timestamp: Date.now(),
          source: 'local-storage',
          operation: 'sync',
        });
      }
    };

    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }
}

export class SessionStorageAdapter<T> implements StoreAdapter<T> {
  constructor(private key: string) {}

  async read(): Promise<T | null> {
    if (typeof sessionStorage === 'undefined') {
      console.warn('sessionStorage not available');
      return null;
    }

    const item = sessionStorage.getItem(this.key);
    return item ? JSON.parse(item) : null;
  }

  async write(value: T): Promise<void> {
    if (typeof sessionStorage === 'undefined') {
      console.warn('sessionStorage not available');
      return;
    }

    sessionStorage.setItem(this.key, JSON.stringify(value));
  }

  async delete(): Promise<void> {
    if (typeof sessionStorage === 'undefined') {
      console.warn('sessionStorage not available');
      return;
    }

    sessionStorage.removeItem(this.key);
  }
}
