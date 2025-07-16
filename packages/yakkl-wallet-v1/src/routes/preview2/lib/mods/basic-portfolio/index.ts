/**
 * Basic Portfolio Mod
 * 
 * This is an example system mod that provides core portfolio functionality
 */

// Temporary types until @yakkl/core is built
type Mod = any;
type ModManifest = any;
type ModContext = {
  engine: WalletEngine;
  mod: Mod;
  permissions: string[];
  storage: {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
  };
  logger: {
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, error?: Error): void;
  };
};
type WalletEngine = any;
import manifest from './manifest.json';

export class BasicPortfolioMod implements Mod {
  manifest: any;
  private context: ModContext | null = null;
  private loaded = false;
  private active = false;

  constructor() {
    this.manifest = manifest;
  }

  async initialize(engine: WalletEngine): Promise<void> {
    const manifestId = this.manifest.id;
    
    this.context = {
      engine,
      mod: this,
      permissions: this.manifest.permissions,
      storage: {
        async get(key: string): Promise<any> {
          // Simple storage implementation
          return localStorage.getItem(`mod:${manifestId}:${key}`);
        },
        async set(key: string, value: any): Promise<void> {
          localStorage.setItem(`mod:${manifestId}:${key}`, JSON.stringify(value));
        },
        async delete(key: string): Promise<void> {
          localStorage.removeItem(`mod:${manifestId}:${key}`);
        },
        async clear(): Promise<void> {
          const prefix = `mod:${manifestId}:`;
          const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
          keys.forEach(k => localStorage.removeItem(k));
        }
      },
      logger: {
        debug: (message: string, data?: any) => console.debug(`[${manifestId}]`, message, data),
        info: (message: string, data?: any) => console.info(`[${manifestId}]`, message, data),
        warn: (message: string, data?: any) => console.warn(`[${manifestId}]`, message, data),
        error: (message: string, error?: Error) => console.error(`[${manifestId}]`, message, error)
      }
    };

    this.loaded = true;
    this.active = true;
    
    this.context.logger.info('Basic Portfolio mod initialized');
  }

  async destroy(): Promise<void> {
    this.active = false;
    this.loaded = false;
    this.context = null;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  isActive(): boolean {
    return this.active;
  }

  getComponent(id: string): any {
    // This mod provides a dashboard widget component
    if (id === 'dashboard-widget') {
      return {
        type: 'widget',
        id: 'portfolio-overview',
        name: 'Portfolio Overview',
        size: 'large',
        position: 'top'
      };
    }
    return null;
  }

  getWidget(id: string): any {
    return this.getComponent(id);
  }

  getBackgroundScript(id: string): any {
    // This mod doesn't have background scripts
    return null;
  }

  async handleAPICall(endpoint: string, data: any): Promise<any> {
    // Basic portfolio API endpoints
    switch (endpoint) {
      case 'get-balance':
        return { balance: '0', currency: 'USD' };
      case 'get-tokens':
        return { tokens: [] };
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
  }

  emit(event: string, data: any): void {
    // Emit events through the wallet engine
    if (this.context?.engine) {
      (this.context.engine as any).emit(`mod:${this.manifest.id}:${event}`, data);
    }
  }

  on(event: string, handler: (data: any) => void): void {
    // Listen to events through the wallet engine
    if (this.context?.engine) {
      (this.context.engine as any).on(`mod:${this.manifest.id}:${event}`, handler);
    }
  }

  off(event: string, handler: (data: any) => void): void {
    // Remove event listeners
    if (this.context?.engine) {
      (this.context.engine as any).off(`mod:${this.manifest.id}:${event}`, handler);
    }
  }

  async enhance(otherMod: Mod): Promise<boolean> {
    // This basic mod doesn't enhance others
    return false;
  }

  getEnhancements(): any[] {
    return [];
  }
}

// Export the mod for loading
export default BasicPortfolioMod;