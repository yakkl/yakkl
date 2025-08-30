/**
 * Service Factory
 * Creates and manages service instances with dependency injection
 */

import { Container, InjectionTokens } from '../di/Container';
import type { 
  IService, 
  ILifecycleService,
  IServiceRegistry,
  ServiceHealth
} from '../interfaces/service.interface';
import type { ICache, ICacheConfig } from '../interfaces/cache.interface';
import { EventEmitter } from 'eventemitter3';

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
export class ServiceFactory implements IServiceRegistry {
  private container: Container;
  private services: Map<string, IService> = new Map();
  private healthCheckTimer?: NodeJS.Timeout;
  private eventEmitter = new EventEmitter();
  private config: ServiceFactoryConfig;

  constructor(config?: ServiceFactoryConfig) {
    this.config = config || {};
    this.container = config?.container || new Container();
    
    if (config?.healthCheckInterval) {
      this.startHealthCheck(config.healthCheckInterval);
    }
  }

  /**
   * Register a service
   */
  register(service: IService): void {
    if (this.services.has(service.name)) {
      throw new Error(`Service already registered: ${service.name}`);
    }

    this.services.set(service.name, service);
    this.container.registerValue(service.name, service);
    
    this.eventEmitter.emit('service:registered', service);

    if (this.config.autoStart) {
      this.startService(service);
    }
  }

  /**
   * Register a service class
   */
  registerClass<T extends IService>(
    ServiceClass: new (...args: any[]) => T,
    dependencies?: any[]
  ): void {
    const service = new ServiceClass(...(dependencies || []));
    this.register(service);
  }

  /**
   * Register a service factory
   */
  registerFactory<T extends IService>(
    name: string,
    factory: () => T
  ): void {
    this.container.registerFactory(name, () => {
      const service = factory();
      this.services.set(service.name, service);
      return service;
    });
  }

  /**
   * Unregister a service
   */
  unregister(serviceName: string): void {
    const service = this.services.get(serviceName);
    if (service) {
      if (service.isRunning()) {
        service.stop();
      }
      this.services.delete(serviceName);
      this.container.unregister(serviceName);
      this.eventEmitter.emit('service:unregistered', serviceName);
    }
  }

  /**
   * Get a service
   */
  get(serviceName: string): IService | undefined {
    return this.services.get(serviceName);
  }

  /**
   * Get a service (type-safe)
   */
  getService<T extends IService>(serviceName: string): T | undefined {
    return this.services.get(serviceName) as T | undefined;
  }

  /**
   * Get all services
   */
  getAll(): IService[] {
    return Array.from(this.services.values());
  }

  /**
   * Start a service
   */
  private async startService(service: IService): Promise<void> {
    try {
      // Initialize if needed
      if (!service.isRunning()) {
        await service.initialize();
      }

      // Handle lifecycle hooks
      if (this.isLifecycleService(service)) {
        await service.beforeStart?.();
      }

      await service.start();

      if (this.isLifecycleService(service)) {
        await service.afterStart?.();
      }

      this.eventEmitter.emit('service:started', service.name);
    } catch (error) {
      this.eventEmitter.emit('service:error', { service: service.name, error });
      
      if (this.isLifecycleService(service)) {
        service.onError?.(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Stop a service
   */
  private async stopService(service: IService): Promise<void> {
    try {
      if (this.isLifecycleService(service)) {
        await service.beforeStop?.();
      }

      await service.stop();

      if (this.isLifecycleService(service)) {
        await service.afterStop?.();
      }

      this.eventEmitter.emit('service:stopped', service.name);
    } catch (error) {
      this.eventEmitter.emit('service:error', { service: service.name, error });
      
      if (this.isLifecycleService(service)) {
        service.onError?.(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Start all services
   */
  async startAll(): Promise<void> {
    const startPromises = Array.from(this.services.values())
      .filter(service => !service.isRunning())
      .map(service => this.startService(service));
    
    await Promise.all(startPromises);
  }

  /**
   * Stop all services
   */
  async stopAll(): Promise<void> {
    const stopPromises = Array.from(this.services.values())
      .filter(service => service.isRunning())
      .map(service => this.stopService(service));
    
    await Promise.all(stopPromises);
  }

  /**
   * Get health status of all services
   */
  getHealth(): ServiceHealth[] {
    return Array.from(this.services.values()).map(service => ({
      service: service.name,
      status: this.getServiceStatus(service),
      lastCheck: Date.now(),
      uptime: service.isRunning() ? this.getServiceUptime(service) : undefined,
      errors: 0 // Would need to track this
    }));
  }

  /**
   * Get service status
   */
  private getServiceStatus(service: IService): 'healthy' | 'degraded' | 'unhealthy' {
    if (!service.isRunning()) {
      return 'unhealthy';
    }
    // Could add more sophisticated health checks here
    return 'healthy';
  }

  /**
   * Get service uptime
   */
  private getServiceUptime(service: IService): number {
    // Would need to track start time
    return Date.now();
  }

  /**
   * Check if service is lifecycle service
   */
  private isLifecycleService(service: IService): service is ILifecycleService {
    return 'beforeStart' in service || 'afterStart' in service;
  }

  /**
   * Start health check timer
   */
  private startHealthCheck(interval: number): void {
    this.healthCheckTimer = setInterval(() => {
      const health = this.getHealth();
      this.eventEmitter.emit('health:check', health);
      
      // Check for unhealthy services
      const unhealthy = health.filter(h => h.status === 'unhealthy');
      if (unhealthy.length > 0) {
        this.eventEmitter.emit('health:unhealthy', unhealthy);
      }
    }, interval);
  }

  /**
   * Stop health check timer
   */
  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * Destroy the factory
   */
  async destroy(): Promise<void> {
    this.stopHealthCheck();
    await this.stopAll();
    this.services.clear();
    this.container.clear();
    this.eventEmitter.removeAllListeners();
  }

  /**
   * Subscribe to events
   */
  on(event: string, handler: (...args: any[]) => void): void {
    this.eventEmitter.on(event, handler);
  }

  /**
   * Unsubscribe from events
   */
  off(event: string, handler: (...args: any[]) => void): void {
    this.eventEmitter.off(event, handler);
  }

  /**
   * Get the DI container
   */
  getContainer(): Container {
    return this.container;
  }
}

/**
 * Create a pre-configured service factory
 */
export function createServiceFactory(config?: ServiceFactoryConfig): ServiceFactory {
  const factory = new ServiceFactory(config);
  
  // Register common service factories
  const container = factory.getContainer();
  
  // Example: Register cache factory
  container.registerFactory(InjectionTokens.CACHE, (provider) => {
    // Would create actual cache implementation
    return {} as ICache;
  });
  
  return factory;
}

/**
 * Global service factory instance
 */
export const globalServiceFactory = createServiceFactory({
  autoStart: false,
  healthCheckInterval: 60000 // 1 minute
});