import { log } from './logger-wrapper';
import browser from 'webextension-polyfill';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: Error) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 100,
  maxDelay: 5000,
  backoffMultiplier: 2,
  shouldRetry: (error: Error) => {
    const message = error.message.toLowerCase();
    return (
      message.includes('cannot read properties of undefined') ||
      message.includes('extension context invalidated') ||
      message.includes('receiving end does not exist') ||
      message.includes('message port closed') ||
      message.includes('could not establish connection')
    );
  }
};

export async function retryBrowserAPI<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === opts.maxRetries || !opts.shouldRetry(lastError)) {
        throw lastError;
      }
      
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelay
      );
      
      log.debug(`Browser API operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${opts.maxRetries})`, false, lastError);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Retry failed');
}

export async function sendMessageWithRetry(
  message: any,
  options: RetryOptions = {}
): Promise<any> {
  return retryBrowserAPI(async () => {
    if (typeof browser === 'undefined' || !browser?.runtime?.sendMessage) {
      throw new Error('Browser runtime API not available');
    }
    return browser.runtime.sendMessage(message);
  }, options);
}

export async function queryTabsWithRetry(
  queryInfo: browser.Tabs.QueryQueryInfoType,
  options: RetryOptions = {}
): Promise<browser.Tabs.Tab[]> {
  return retryBrowserAPI(async () => {
    if (typeof browser === 'undefined' || !browser?.tabs?.query) {
      throw new Error('Browser tabs API not available');
    }
    return browser.tabs.query(queryInfo);
  }, options);
}

export async function getWindowWithRetry(
  windowId: number,
  getInfo?: browser.Windows.GetInfo,
  options: RetryOptions = {}
): Promise<browser.Windows.Window> {
  return retryBrowserAPI(async () => {
    // Try webextension-polyfill first
    if (browser?.windows?.get) {
      return browser.windows.get(windowId, getInfo);
    }
    
    // Fallback to chrome API if polyfill not available
    if (typeof chrome !== 'undefined' && (chrome as any)?.windows?.get) {
      log.debug('Using chrome.windows.get API as fallback', false);
      return new Promise((resolve, reject) => {
        (chrome as any).windows.get(windowId, getInfo as any, (window: any) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(window as browser.Windows.Window);
          }
        });
      });
    }
    
    throw new Error('Browser windows API not available (neither browser nor chrome)');
  }, options);
}

export async function createWindowWithRetry(
  createData: browser.Windows.CreateCreateDataType,
  options: RetryOptions = {}
): Promise<browser.Windows.Window> {
  return retryBrowserAPI(async () => {
    // Try webextension-polyfill first
    if (browser?.windows?.create) {
      return browser.windows.create(createData);
    }
    
    // Fallback to chrome API if polyfill not available
    if (typeof chrome !== 'undefined' && (chrome as any)?.windows?.create) {
      log.debug('Using chrome.windows API as fallback', false);
      return new Promise((resolve, reject) => {
        (chrome as any).windows.create(createData as any, (window: any) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(window as browser.Windows.Window);
          }
        });
      });
    }
    
    throw new Error('Browser windows API not available (neither browser nor chrome)');
  }, options);
}

export async function updateWindowWithRetry(
  windowId: number,
  updateInfo: browser.Windows.UpdateUpdateInfoType,
  options: RetryOptions = {}
): Promise<browser.Windows.Window> {
  return retryBrowserAPI(async () => {
    // Try webextension-polyfill first
    if (browser?.windows?.update) {
      return browser.windows.update(windowId, updateInfo);
    }
    
    // Fallback to chrome API if polyfill not available
    if (typeof chrome !== 'undefined' && (chrome as any)?.windows?.update) {
      log.debug('Using chrome.windows.update API as fallback', false);
      return new Promise((resolve, reject) => {
        (chrome as any).windows.update(windowId, updateInfo as any, (window: any) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(window as browser.Windows.Window);
          }
        });
      });
    }
    
    throw new Error('Browser windows API not available (neither browser nor chrome)');
  }, options);
}

export async function removeWindowWithRetry(
  windowId: number,
  options: RetryOptions = {}
): Promise<void> {
  return retryBrowserAPI(async () => {
    // Try webextension-polyfill first
    if (browser?.windows?.remove) {
      return browser.windows.remove(windowId);
    }
    
    // Fallback to chrome API if polyfill not available
    if (typeof chrome !== 'undefined' && (chrome as any)?.windows?.remove) {
      log.debug('Using chrome.windows.remove API as fallback', false);
      return new Promise<void>((resolve, reject) => {
        (chrome as any).windows.remove(windowId, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    }
    
    throw new Error('Browser windows API not available (neither browser nor chrome)');
  }, options);
}

export async function getStorageWithRetry(
  keys: string | string[] | null,
  options: RetryOptions = {}
): Promise<any> {
  return retryBrowserAPI(async () => {
    if (typeof browser === 'undefined' || !browser?.storage?.local?.get) {
      throw new Error('Browser storage API not available');
    }
    return browser.storage.local.get(keys);
  }, options);
}

export async function setStorageWithRetry(
  items: Record<string, any>,
  options: RetryOptions = {}
): Promise<void> {
  return retryBrowserAPI(async () => {
    if (typeof browser === 'undefined' || !browser?.storage?.local?.set) {
      throw new Error('Browser storage API not available');
    }
    return browser.storage.local.set(items);
  }, options);
}