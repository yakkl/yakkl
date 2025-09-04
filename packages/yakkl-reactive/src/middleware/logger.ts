import { Middleware } from '../types';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

export class LoggerMiddleware<T> implements Middleware<T> {
  name = 'LoggerMiddleware';

  constructor(
    private logger: Logger = console,
    private options: {
      level?: LogLevel;
      logReads?: boolean;
      logWrites?: boolean;
      logSubscriptions?: boolean;
      logValues?: boolean;
    } = {}
  ) {
    this.options = {
      level: 'info',
      logReads: false,
      logWrites: true,
      logSubscriptions: false,
      logValues: false,
      ...options,
    };
  }

  async beforeRead(key: string): Promise<void> {
    if (this.options.logReads) {
      this.logger.debug(`[${key}] Reading value...`);
    }
  }

  async afterRead(value: T | null, key: string): Promise<T | null> {
    if (this.options.logReads) {
      if (this.options.logValues) {
        this.logger.debug(`[${key}] Read value:`, value);
      } else {
        this.logger.debug(`[${key}] Read complete`);
      }
    }
    return value;
  }

  async beforeWrite(value: T, prev: T | null, key: string): Promise<T> {
    if (this.options.logWrites) {
      if (this.options.logValues) {
        this.logger.info(`[${key}] Writing value:`, value, 'Previous:', prev);
      } else {
        this.logger.info(`[${key}] Writing value...`);
      }
    }
    return value;
  }

  //@ts-ignore
  async afterWrite(value: T, key: string): Promise<void> {
    if (this.options.logWrites) {
      this.logger.info(`[${key}] Write complete`);
    }
  }

  async onError(error: Error, operation: string): Promise<void> {
    this.logger.error(`Store operation ${operation} failed:`, error);
  }

  onSubscribe(): void {
    if (this.options.logSubscriptions) {
      this.logger.debug('New subscription added');
    }
  }

  onUnsubscribe(): void {
    if (this.options.logSubscriptions) {
      this.logger.debug('Subscription removed');
    }
  }
}
