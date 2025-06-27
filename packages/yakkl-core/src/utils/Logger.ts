/**
 * Logger utility for YAKKL Core
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private context: string;
  private level: LogLevel;

  constructor(context: string, level: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.level = level;
  }

  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`[${this.context}] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(`[${this.context}] ${message}`, ...args);
    }
  }

  warn(message: string, error?: Error | any): void {
    if (this.level <= LogLevel.WARN) {
      if (error) {
        console.warn(`[${this.context}] ${message}`, error);
      } else {
        console.warn(`[${this.context}] ${message}`);
      }
    }
  }

  error(message: string, error?: Error | any): void {
    if (this.level <= LogLevel.ERROR) {
      if (error) {
        console.error(`[${this.context}] ${message}`, error);
      } else {
        console.error(`[${this.context}] ${message}`);
      }
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}