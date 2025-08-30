/**
 * Dependency Injection Container
 * Manages service registration and resolution
 */
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
export declare class Container implements IServiceProvider {
    private services;
    private resolving;
    /**
     * Register a service
     */
    register<T>(token: InjectionToken<T>, factory: () => T, options?: {
        singleton?: boolean;
        dependencies?: Array<InjectionToken>;
    }): void;
    /**
     * Register a singleton value
     */
    registerValue<T>(token: InjectionToken<T>, value: T): void;
    /**
     * Register a class
     */
    registerClass<T>(token: InjectionToken<T>, constructor: new (...args: any[]) => T, options?: {
        singleton?: boolean;
        dependencies?: Array<InjectionToken>;
    }): void;
    /**
     * Register a factory function
     */
    registerFactory<T>(token: InjectionToken<T>, factory: (provider: IServiceProvider) => T, options?: {
        singleton?: boolean;
    }): void;
    /**
     * Get a service
     */
    get<T>(token: InjectionToken<T>): T;
    /**
     * Check if a service is registered
     */
    has(token: InjectionToken): boolean;
    /**
     * Try to get a service
     */
    tryGet<T>(token: InjectionToken<T>): T | undefined;
    /**
     * Get all services of a type
     */
    getAll<T>(tokens: Array<InjectionToken<T>>): T[];
    /**
     * Clear all registrations
     */
    clear(): void;
    /**
     * Remove a service
     */
    unregister(token: InjectionToken): boolean;
    /**
     * Create a child container
     */
    createScope(): Container;
    /**
     * Get service metadata
     */
    getMetadata(token: InjectionToken): ServiceDescriptor | undefined;
    /**
     * List all registered tokens
     */
    listTokens(): InjectionToken[];
}
/**
 * Default container instance
 */
export declare const defaultContainer: Container;
/**
 * Service decorator
 */
export declare function Service(token?: InjectionToken): (target: any) => any;
/**
 * Injectable decorator
 */
export declare function Injectable(options?: {
    singleton?: boolean;
    token?: InjectionToken;
}): (target: any) => any;
/**
 * Inject decorator (property injection only)
 * Note: Constructor parameter injection requires reflect-metadata polyfill
 */
export declare function Inject(token: InjectionToken): (target: any, propertyKey: string | symbol) => void;
/**
 * Service locator pattern helper
 */
export declare class ServiceLocator {
    private container;
    constructor(container?: Container);
    get<T>(token: InjectionToken<T>): T;
    has(token: InjectionToken): boolean;
    tryGet<T>(token: InjectionToken<T>): T | undefined;
}
/**
 * Injection tokens for common services
 */
export declare const InjectionTokens: {
    readonly LOGGER: symbol;
    readonly CACHE: symbol;
    readonly STORAGE: symbol;
    readonly HTTP_CLIENT: symbol;
    readonly EVENT_BUS: symbol;
    readonly CONFIG: symbol;
    readonly CRYPTO: symbol;
    readonly PROVIDER: symbol;
    readonly WALLET: symbol;
    readonly TRANSACTION_MANAGER: symbol;
};
//# sourceMappingURL=Container.d.ts.map