/**
 * Dependency Injection Container
 * Manages service registration and resolution
 */

import type { IService } from '../interfaces/service.interface';

/**
 * Service descriptor
 */
export interface ServiceDescriptor<T = any> {
  token: string | symbol;
  factory: () => T;
  singleton?: boolean;
  dependencies?: Array<string | symbol>;
  instance?: T;
}

/**
 * Injection token type
 */
export type InjectionToken<T = any> = string | symbol;

/**
 * Service provider interface
 */
export interface IServiceProvider {
  get<T>(token: InjectionToken<T>): T;
  has(token: InjectionToken): boolean;
}

/**
 * Dependency injection container
 */
export class Container implements IServiceProvider {
  private services: Map<InjectionToken, ServiceDescriptor> = new Map();
  private resolving: Set<InjectionToken> = new Set();

  /**
   * Register a service
   */
  register<T>(
    token: InjectionToken<T>,
    factory: () => T,
    options?: {
      singleton?: boolean;
      dependencies?: Array<InjectionToken>;
    }
  ): void {
    this.services.set(token, {
      token,
      factory,
      singleton: options?.singleton ?? true,
      dependencies: options?.dependencies
    });
  }

  /**
   * Register a singleton value
   */
  registerValue<T>(token: InjectionToken<T>, value: T): void {
    this.services.set(token, {
      token,
      factory: () => value,
      singleton: true,
      instance: value
    });
  }

  /**
   * Register a class
   */
  registerClass<T>(
    token: InjectionToken<T>,
    constructor: new (...args: any[]) => T,
    options?: {
      singleton?: boolean;
      dependencies?: Array<InjectionToken>;
    }
  ): void {
    this.register(
      token,
      () => {
        const deps = options?.dependencies || [];
        const args = deps.map(dep => this.get(dep));
        return new constructor(...args);
      },
      options
    );
  }

  /**
   * Register a factory function
   */
  registerFactory<T>(
    token: InjectionToken<T>,
    factory: (provider: IServiceProvider) => T,
    options?: {
      singleton?: boolean;
    }
  ): void {
    this.register(
      token,
      () => factory(this),
      options
    );
  }

  /**
   * Get a service
   */
  get<T>(token: InjectionToken<T>): T {
    const descriptor = this.services.get(token);
    
    if (!descriptor) {
      throw new Error(`Service not registered: ${String(token)}`);
    }

    // Check for circular dependencies
    if (this.resolving.has(token)) {
      throw new Error(`Circular dependency detected: ${String(token)}`);
    }

    // Return existing singleton instance
    if (descriptor.singleton && descriptor.instance) {
      return descriptor.instance as T;
    }

    try {
      this.resolving.add(token);

      // Resolve dependencies
      if (descriptor.dependencies) {
        for (const dep of descriptor.dependencies) {
          if (!this.has(dep)) {
            throw new Error(`Missing dependency: ${String(dep)} for ${String(token)}`);
          }
        }
      }

      // Create instance
      const instance = descriptor.factory();

      // Store singleton instance
      if (descriptor.singleton) {
        descriptor.instance = instance;
      }

      return instance as T;
    } finally {
      this.resolving.delete(token);
    }
  }

  /**
   * Check if a service is registered
   */
  has(token: InjectionToken): boolean {
    return this.services.has(token);
  }

  /**
   * Try to get a service
   */
  tryGet<T>(token: InjectionToken<T>): T | undefined {
    try {
      return this.get(token);
    } catch {
      return undefined;
    }
  }

  /**
   * Get all services of a type
   */
  getAll<T>(tokens: Array<InjectionToken<T>>): T[] {
    return tokens
      .filter(token => this.has(token))
      .map(token => this.get(token));
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.services.clear();
    this.resolving.clear();
  }

  /**
   * Remove a service
   */
  unregister(token: InjectionToken): boolean {
    return this.services.delete(token);
  }

  /**
   * Create a child container
   */
  createScope(): Container {
    const child = new Container();
    
    // Copy service descriptors (not instances)
    for (const [token, descriptor] of this.services) {
      child.services.set(token, {
        ...descriptor,
        instance: undefined // Don't copy singleton instances
      });
    }
    
    return child;
  }

  /**
   * Get service metadata
   */
  getMetadata(token: InjectionToken): ServiceDescriptor | undefined {
    return this.services.get(token);
  }

  /**
   * List all registered tokens
   */
  listTokens(): InjectionToken[] {
    return Array.from(this.services.keys());
  }
}

/**
 * Default container instance
 */
export const defaultContainer = new Container();

/**
 * Service decorator
 */
export function Service(token?: InjectionToken) {
  return function (target: any) {
    const actualToken = token || target.name;
    defaultContainer.registerClass(actualToken, target);
    return target;
  };
}

/**
 * Injectable decorator
 */
export function Injectable(options?: {
  singleton?: boolean;
  token?: InjectionToken;
}) {
  return function (target: any) {
    const token = options?.token || target.name;
    defaultContainer.registerClass(token, target, {
      singleton: options?.singleton ?? true
    });
    return target;
  };
}

/**
 * Inject decorator (property injection only)
 * Note: Constructor parameter injection requires reflect-metadata polyfill
 */
export function Inject(token: InjectionToken) {
  return function (target: any, propertyKey: string | symbol) {
    // Property injection
    Object.defineProperty(target, propertyKey, {
      get: () => defaultContainer.get(token),
      enumerable: true,
      configurable: true
    });
  };
}

/**
 * Service locator pattern helper
 */
export class ServiceLocator {
  constructor(private container: Container = defaultContainer) {}

  get<T>(token: InjectionToken<T>): T {
    return this.container.get(token);
  }

  has(token: InjectionToken): boolean {
    return this.container.has(token);
  }

  tryGet<T>(token: InjectionToken<T>): T | undefined {
    return this.container.tryGet(token);
  }
}

/**
 * Injection tokens for common services
 */
export const InjectionTokens = {
  LOGGER: Symbol('Logger'),
  CACHE: Symbol('Cache'),
  STORAGE: Symbol('Storage'),
  HTTP_CLIENT: Symbol('HttpClient'),
  EVENT_BUS: Symbol('EventBus'),
  CONFIG: Symbol('Config'),
  CRYPTO: Symbol('Crypto'),
  PROVIDER: Symbol('Provider'),
  WALLET: Symbol('Wallet'),
  TRANSACTION_MANAGER: Symbol('TransactionManager')
} as const;