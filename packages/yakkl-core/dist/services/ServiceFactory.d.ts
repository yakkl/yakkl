/**
 * Service Factory
 * Creates and manages service instances with dependency injection
 */
import { Container } from '../di/Container';
import type { IService, IServiceRegistry, ServiceHealth } from '../interfaces/service.interface';
/**
 * Service factory configuration
 */
export interface ServiceFactoryConfig {
    container?: Container;
    autoStart?: boolean;
    healthCheckInterval?: number;
}
/**
 * Service factory
 */
export declare class ServiceFactory implements IServiceRegistry {
    private container;
    private services;
    private healthCheckTimer?;
    private eventEmitter;
    private config;
    constructor(config?: ServiceFactoryConfig);
    /**
     * Register a service
     */
    register(service: IService): void;
    /**
     * Register a service class
     */
    registerClass<T extends IService>(ServiceClass: new (...args: any[]) => T, dependencies?: any[]): void;
    /**
     * Register a service factory
     */
    registerFactory<T extends IService>(name: string, factory: () => T): void;
    /**
     * Unregister a service
     */
    unregister(serviceName: string): void;
    /**
     * Get a service
     */
    get(serviceName: string): IService | undefined;
    /**
     * Get a service (type-safe)
     */
    getService<T extends IService>(serviceName: string): T | undefined;
    /**
     * Get all services
     */
    getAll(): IService[];
    /**
     * Start a service
     */
    private startService;
    /**
     * Stop a service
     */
    private stopService;
    /**
     * Start all services
     */
    startAll(): Promise<void>;
    /**
     * Stop all services
     */
    stopAll(): Promise<void>;
    /**
     * Get health status of all services
     */
    getHealth(): ServiceHealth[];
    /**
     * Get service status
     */
    private getServiceStatus;
    /**
     * Get service uptime
     */
    private getServiceUptime;
    /**
     * Check if service is lifecycle service
     */
    private isLifecycleService;
    /**
     * Start health check timer
     */
    private startHealthCheck;
    /**
     * Stop health check timer
     */
    private stopHealthCheck;
    /**
     * Destroy the factory
     */
    destroy(): Promise<void>;
    /**
     * Subscribe to events
     */
    on(event: string, handler: (...args: any[]) => void): void;
    /**
     * Unsubscribe from events
     */
    off(event: string, handler: (...args: any[]) => void): void;
    /**
     * Get the DI container
     */
    getContainer(): Container;
}
/**
 * Create a pre-configured service factory
 */
export declare function createServiceFactory(config?: ServiceFactoryConfig): ServiceFactory;
/**
 * Global service factory instance
 */
export declare const globalServiceFactory: ServiceFactory;
//# sourceMappingURL=ServiceFactory.d.ts.map