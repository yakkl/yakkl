// $lib/shared/BrowserAccessor.ts
import type { Runtime, Tabs, Alarms } from 'webextension-polyfill';
import { log } from "$plugins/Logger";
import type { ExtendedBrowser } from '../types/browser-extensions';
import { browser_ext } from '../environment';


// Interfaces for local use (to avoid namespace issues)
interface ChromeRuntimeConnectInfo {
  name?: string;
}
// Chrome types are now imported automatically from the .d.ts file

/**
 * Describes the execution context of the extension
 */
export enum ExtensionContext {
  UNKNOWN = 'unknown',
  BACKGROUND = 'background',
  POPUP = 'popup',
  CONTENT_SCRIPT = 'content_script',
  OPTIONS = 'options',
  DEVTOOLS = 'devtools',
  SIDEPANEL = 'sidepanel'
}

/**
 * A robust utility class for accessing browser extension APIs
 * across different contexts (background, popup, etc.)
 */
export class BrowserAccessor {
  private static instance: BrowserAccessor;
  private browserApi: ExtendedBrowser | null = null;
  private currentContext: ExtensionContext = ExtensionContext.UNKNOWN;
  private initialized = false;
  private initPromise: Promise<ExtendedBrowser | null> | null = null;
  /**
   * Private constructor - use getInstance()
   */
  private constructor() {
    // Intentionally empty - initialization happens on demand
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): BrowserAccessor {
    if (!BrowserAccessor.instance) {
      BrowserAccessor.instance = new BrowserAccessor();
    }
    return BrowserAccessor.instance;
  }

  /**
   * Check if we're in a service worker context
   */
  private isInServiceWorker(): boolean {
    try {
      // Check if the ServiceWorkerGlobalScope exists
      return typeof self !== 'undefined' &&
             typeof (self as any).ServiceWorkerGlobalScope !== 'undefined' &&
             self instanceof (self as any).ServiceWorkerGlobalScope;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if Chrome APIs are available
   */
  private hasChromeApis(): boolean {
    return typeof chrome !== 'undefined' && !!chrome && !!chrome.runtime;
  }

  /**
   * Detect which extension context we're running in
   */
  private async detectContext(): Promise<ExtensionContext> {
    // Skip if not in a browser
    if (typeof window === 'undefined' && typeof self === 'undefined') {
      return ExtensionContext.UNKNOWN;
    }

    try {
      // Check for background context - service worker
      const isServiceWorker = this.isInServiceWorker();

      // Check for extension APIs
      const hasExtensionApi = this.hasChromeApis();

      // For UI contexts we need to check window
      const isWindow = typeof window !== 'undefined';

      // Check specific UI contexts if window exists
      const isPopup = isWindow && (
        window.location.pathname.includes('popup.html') ||
        (document.body?.dataset.context === 'popup')
      );

      const isOptions = isWindow && (
        window.location.pathname.includes('options.html') ||
        (document.body?.dataset.context === 'options')
      );

      const hasDevtools = typeof chrome !== 'undefined' &&
                        typeof (chrome as any).devtools !== 'undefined';

      // Content scripts run in web pages
      const isContentScript = isWindow &&
                             hasExtensionApi &&
                             window.location.protocol.startsWith('http');

      if (await this.resolveExecutionContext() === 'sidepanel') {
        return ExtensionContext.SIDEPANEL;
      }

      if (isServiceWorker && hasExtensionApi) {
        return ExtensionContext.BACKGROUND;
      } else if (isPopup) {
        return ExtensionContext.POPUP;
      } else if (isOptions) {
        return ExtensionContext.OPTIONS;
      } else if (hasDevtools) {
        return ExtensionContext.DEVTOOLS;
      } else if (isContentScript) {
        return ExtensionContext.CONTENT_SCRIPT;
      } else if (hasExtensionApi) {
        // If we can't specifically identify, but have extension APIs
        return ExtensionContext.POPUP; // Default to popup for UI contexts
      }

    } catch (error) {
      log.error("Error detecting context:", false, error);
    }

    return ExtensionContext.UNKNOWN;
  }

  async resolveExecutionContext(): Promise<'popup' | 'sidepanel'> {
    try {
      const win = await browser_ext.windows.getCurrent();
      if (!win || !win.type) {
        return import.meta.env.VITE_YAKKL_TYPE;
      }

      if (win.type === 'popup') return 'popup';
      if (win.type === 'normal') return 'sidepanel';

      return import.meta.env.VITE_YAKKL_TYPE;
    } catch (err) {
      console.warn('Error resolving execution context:', err);
      return import.meta.env.VITE_YAKKL_TYPE;
    }
  }

  /**
   * Initialize the browser API - respects the context it's running in
   * Returns a promise that resolves to the browser API or null
   */
  public async initialize(): Promise<ExtendedBrowser | null> {
    // Return existing result if already initialized
    if (this.initialized) {
      return this.browserApi;
    }

    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // Skip if not in a browser
    if (typeof window === 'undefined' && typeof self === 'undefined') {
      this.initialized = true;
      return null;
    }

    // Create a single initialization promise
    this.initPromise = (async () => {
      try {
        // Detect which context we're in
        this.currentContext = await this.detectContext();
        log.info(`Initializing browser API in ${this.currentContext} context`);

        // Try to get browser API based on context
        if (this.currentContext !== ExtensionContext.UNKNOWN) {
          // First try global browser (from script tag)
          if (typeof window !== 'undefined' && (window as any).browser) {
            this.browserApi = (window as any).browser as ExtendedBrowser;
            log.info("Using global browser API from window.browser");
          }
          // Then try chrome namespace with polyfill
          else if (this.hasChromeApis()) {
            // In background context, we need to be careful with the polyfill
            if (this.currentContext === ExtensionContext.BACKGROUND) {
              // In background context, we can directly import
              try {
                log.info("Loaded browser API via dynamic import in background");
                const polyfill = await import('webextension-polyfill');
                this.browserApi = polyfill.default as ExtendedBrowser;
              } catch (e) {
                log.error("Failed to import polyfill in background:", false, e);
                // Fallback to chrome APIs if needed
                this.browserApi = this.createChromeShim();
              }
            } else {
              // For UI contexts, use the global or chrome
              this.browserApi = (window as any).browser || this.createChromeShim();
              log.info("Using global browser API or chrome shim");
            }
          }
        }

        if (!this.browserApi) {
          log.warn(`No browser API available in ${this.currentContext} context`);
        }
      } catch (error) {
        log.error("Failed to initialize browser API:", false, error);
        this.browserApi = null;
      } finally {
        this.initialized = true;
        this.initPromise = null;
      }

      return this.browserApi;
    })();

    return this.initPromise;
  }

  /**
   * Get the browser API instance with lazy initialization
   */
  public async getBrowser(): Promise<ExtendedBrowser | null> {
    if (!this.initialized && !this.initPromise) {
      await this.initialize();
    }
    return this.browserApi;
  }

  /**
   * Get the browser API synchronously - may return null if not initialized
   * Consider using getBrowser() for more reliable access
   */
  public getBrowserSync(): ExtendedBrowser | null {
    if (!this.initialized && !this.initPromise) {
      // Start initialization but don't wait for it
      this.initialize().catch(e => {
        log.error("Async initialization failed:", false, e);
      });
    }
    return this.browserApi;
  }

  /**
   * Get the current extension context
   */
  public async getContext(): Promise<ExtensionContext> {
    if (this.currentContext === ExtensionContext.UNKNOWN) {
      this.currentContext = await this.detectContext();
    }
    return this.currentContext;
  }

  /**
   * Set the browser API explicitly (useful for testing or special contexts)
   */
  public setBrowser(browser: ExtendedBrowser): void {
    this.browserApi = browser;
    this.initialized = true;
  }

  /**
   * Check if a specific Chrome API is available
   */
  public hasChromeApi(apiName: string): boolean {
    if (!this.hasChromeApis()) return false;

    switch (apiName) {
      case 'sidePanel':
        return typeof (chrome as any).sidePanel !== 'undefined';
      case 'tabs':
        return typeof (chrome as any).tabs !== 'undefined';
      case 'alarms':
        return typeof (chrome as any).alarms !== 'undefined';
      case 'idle':
        return typeof (chrome as any).idle !== 'undefined';
      case 'notifications':
        return typeof (chrome as any).notifications !== 'undefined';
      default:
        return false;
    }
  }

  /**
   * Perform a browser API operation safely with proper typing
   */
  public async performOperation<T>(
    operation: (browser: ExtendedBrowser) => Promise<T> | T,
    fallback: T
  ): Promise<T> {
    const browser = await this.getBrowser();

    if (!browser) {
      return fallback;
    }

    try {
      return await operation(browser);
    } catch (error) {
      log.error("Browser operation failed:", false, error);
      return fallback;
    }
  }

  /**
   * Create a chrome API shim that mimics the browser API
   * This is a fallback when the polyfill isn't available
   */
  private createChromeShim(): ExtendedBrowser {
    if (!this.hasChromeApis()) {
      log.warn("Chrome APIs not available for creating shim");
      return {} as ExtendedBrowser;
    }

    // Create an empty object to serve as our browser implementation
    const browser = {} as any;

    // Add runtime API if available
    if (chrome?.runtime) {
      browser.runtime = {
        sendMessage: (message: any): Promise<any> => {
          return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, (response: any) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(response);
              }
            });
          });
        },
        connect: (connectInfo?: any): Runtime.Port => {
          const port = chrome.runtime.connect(connectInfo as any);
          return port as unknown as Runtime.Port;
        },
        // Add other runtime methods as needed
      };

      // Add event listeners
      // if (chrome.runtime.onMessage) {
      //   browser.runtime.onMessage = {
      //     addListener: chrome.runtime.onMessage.addListener.bind(chrome.runtime.onMessage),
      //     removeListener: chrome.runtime.onMessage.removeListener.bind(chrome.runtime.onMessage),
      //     hasListener: chrome.runtime.onMessage.hasListener.bind(chrome.runtime.onMessage)
      //   };
      // }
    }

    // Add storage API if available
    if (chrome?.storage) {
      browser.storage = {
        local: {
          get: (keys: string | string[] | Record<string, any> | null): Promise<Record<string, any>> => {
            return new Promise((resolve, reject) => {
              chrome.storage.local.get(keys as any, (result: {[key: string]: any}) => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve(result);
                }
              });
            });
          },
          set: (items: Record<string, any>): Promise<void> => {
            return new Promise<void>((resolve, reject) => {
              chrome.storage.local.set(items, () => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve();
                }
              });
            });
          },
          remove: (keys: string | string[]): Promise<void> => {
            return new Promise<void>((resolve, reject) => {
              chrome.storage.local.remove(keys, () => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve();
                }
              });
            });
          },
          clear: (): Promise<void> => {
            return new Promise<void>((resolve, reject) => {
              chrome.storage.local.clear(() => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve();
                }
              });
            });
          }
        }
      };
    }

    // Add sidePanel API if available
    if (chrome?.sidePanel) {
      browser.sidePanel = {
        setPanelBehavior: (options: { openPanelOnActionClick: boolean }): Promise<void> => {
          return new Promise<void>((resolve, reject) => {
            try {
              chrome.sidePanel.setPanelBehavior(options);
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        },
        open: (options: { tabId: number }): Promise<void> => {
          return new Promise<void>((resolve, reject) => {
            try {
              chrome.sidePanel.open(options);
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        }
      };
    }

    // Add tabs API if available
    if (chrome?.tabs) {
      // Create a minimal tabs implementation with the methods you actually use
      const tabsImpl: Partial<Tabs.Static> = {
        query: (queryInfo: any): Promise<Tabs.Tab[]> => {
          return new Promise((resolve, reject) => {
            chrome.tabs.query(queryInfo, (tabs) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(tabs as unknown as Tabs.Tab[]);
              }
            });
          });
        },
        get: (tabId: number): Promise<Tabs.Tab> => {
          return new Promise((resolve, reject) => {
            chrome.tabs.get(tabId, (tab) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(tab as unknown as Tabs.Tab);
              }
            });
          });
        },
        getCurrent: (): Promise<Tabs.Tab | undefined> => {
          return new Promise((resolve, reject) => {
            chrome.tabs.getCurrent((tab) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(tab as unknown as Tabs.Tab);
              }
            });
          });
        }
        // Add only the methods you actually use
      };

      // Add the implementation to the browser object
      browser.tabs = tabsImpl;
    }

    // Add alarms API if available
    if (chrome?.alarms) {
      // Create a minimal alarms implementation with the methods you actually use
      const alarmsImpl: Partial<Alarms.Static> = {
        // Fix the create method to match both overloads
        create: function(nameOrInfo: string | Alarms.CreateAlarmInfoType, maybeInfo?: Alarms.CreateAlarmInfoType): void {
      try {
        if (typeof nameOrInfo === 'string') {
          // First overload: create(name, alarmInfo)
          if (maybeInfo) {
            chrome.alarms.create(nameOrInfo, maybeInfo as any);
          } else {
            // Chrome requires alarmInfo, even if empty
            chrome.alarms.create(nameOrInfo, {});
          }
        } else {
          // Second overload: create(alarmInfo)
          // Chrome requires name parameter, use empty string as default
          chrome.alarms.create("", nameOrInfo as any);
        }
      } catch (error) {
        log.error("Error creating alarm:", false, error);
      }
    },

        clear: (name?: string): Promise<boolean> => {
          return new Promise((resolve, reject) => {
            chrome.alarms.clear(name, (wasCleared) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(wasCleared);
              }
            });
          });
        },

        clearAll: (): Promise<boolean> => {
          return new Promise((resolve, reject) => {
            chrome.alarms.clearAll((wasCleared) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(wasCleared);
              }
            });
          });
        }
        // Add only the methods you actually use
      };

      // Get alarm by name
      get: (name?: string): Promise<Alarms.Alarm | undefined> => {
        return new Promise((resolve, reject) => {
          if (!chrome?.alarms) {
            reject(new Error("Chrome alarms API not available"));
            return;
          }

          chrome.alarms.get(name, (alarm) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(alarm as unknown as Alarms.Alarm);
            }
          });
        });
      };

      // Get all alarms
      getAll: (): Promise<Alarms.Alarm[]> => {
        return new Promise((resolve, reject) => {
          if (!chrome?.alarms) {
            reject(new Error("Chrome alarms API not available"));
            return;
          }

          chrome.alarms.getAll((alarms) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(alarms as unknown as Alarms.Alarm[]);
            }
          });
        });
      };

      // Create a stub for onAlarm if needed
      if (chrome.alarms.onAlarm) {
        alarmsImpl.onAlarm = {
          addListener: (listener: (alarm: Alarms.Alarm) => void) => {
            chrome.alarms.onAlarm.addListener(listener as any);
          },
          removeListener: (listener: (alarm: Alarms.Alarm) => void) => {
            chrome.alarms.onAlarm.removeListener(listener as any);
          },
          hasListener: (listener: (alarm: Alarms.Alarm) => void) => {
            return chrome.alarms.onAlarm.hasListener(listener as any);
          }
        };
      };


      // Add the implementation to the browser object
      browser.alarms = alarmsImpl as Alarms.Static;
    }

    // Add other APIs as needed using the same pattern

    const browser_ext = browser as ExtendedBrowser;

    return browser_ext;
  }
}
