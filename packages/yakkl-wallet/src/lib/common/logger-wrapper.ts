// $lib/common/logger-wrapper.ts
import { log as LoggerInstance } from '$managers/Logger';

// Production-safe logger that tree-shakes debug and info calls
export const log = {
	// These will be completely removed in production builds
	debug: __DEV__ ? LoggerInstance.debug.bind(LoggerInstance) : () => {},
	debugStack: __DEV__ ? LoggerInstance.debugStack.bind(LoggerInstance) : () => {},
	warn: __DEV__ ? LoggerInstance.warn.bind(LoggerInstance) : () => {},
	errorStack: __DEV__ ? LoggerInstance.errorStack.bind(LoggerInstance) : () => {},
	info: __DEV__ ? LoggerInstance.info.bind(LoggerInstance) : () => {},
	infoStack: __DEV__ ? LoggerInstance.infoStack.bind(LoggerInstance) : () => {},
	trace: __DEV__ ? LoggerInstance.trace.bind(LoggerInstance) : () => {},

	// NOTE: For shaking out unused code, we can add to the top the LoggerInstance.debug.bind(LoggerInstance)
	// and then remove it from the bottom. Debug is used for illustration only in LoggerInstance.

	// These remain in production
	// warn: LoggerInstance.warn.bind(LoggerInstance),
	error: (message: string, persist?: boolean, ...args: any[]) => {
		// Suppress specific connection errors
		const errorString = [message, ...args.map(arg => String(arg))].join(' ');
		if (errorString.includes('Could not establish connection') ||
		    errorString.includes('Receiving end does not exist')) {
			// Convert to debug log instead
			if (__DEV__) {
				LoggerInstance.debug(`[Suppressed Error] ${message}`, persist, ...args);
			}
			return;
		}
		// Log other errors normally
		LoggerInstance.error(message, persist, ...args);
	},
	// errorStack: LoggerInstance.errorStack.bind(LoggerInstance),
	// trace: LoggerInstance.trace.bind(LoggerInstance),

	// Utility methods should remain available
	setLevel: LoggerInstance.setLevel.bind(LoggerInstance),
	setLogFilterEnabled: LoggerInstance.setLogFilterEnabled.bind(LoggerInstance),
	setLogFilterRegex: LoggerInstance.setLogFilterRegex.bind(LoggerInstance),
	setStackIndex: LoggerInstance.setStackIndex.bind(LoggerInstance),
	setBackend: LoggerInstance.setBackend.bind(LoggerInstance),
	clearPersistedLogs: LoggerInstance.clearPersistedLogs.bind(LoggerInstance),
	getPersistedLogs: LoggerInstance.getPersistedLogs.bind(LoggerInstance)
};

// Re-export types
export { LogLevel, LogLevelDirection } from '$managers/Logger';
export type { LogEntry } from '$managers/Logger';
