const originalError = console.error.bind(console);
const originalWarn = console.warn.bind(console);

// Patterns to filter out
const filterPatterns = [
	'node_invalid_placement_ssr',
	'hydration_mismatch',
	'cannot be a child of',
	'Refused to execute inline script',
	'Content Security Policy',
	'bits-ui',
	'floating-layer-anchor',
	'Extension context invalidated',
	'Unchecked runtime.lastError'
];

// Helper to check if message should be filtered
function shouldFilter(args) {
	const message = args.map(arg => String(arg)).join(' ');
	return filterPatterns.some(pattern => message.includes(pattern));
}

console.error = (...args) => {
	// Check if this error should be filtered
	if (shouldFilter(args)) {
		// Silently ignore these errors
		return;
	}
	
	// Keep logging but trap it for future sending to monitoring
	// TBD - Maybe override all console: .log, .warning, .error, .info and push to capture in local storage and then clear the console
	error(...args);
};

console.warn = (...args) => {
	// Check if this warning should be filtered
	if (shouldFilter(args)) {
		// Silently ignore these warnings
		return;
	}
	
	// Pass through to original warn
	originalWarn(...args);
};

function error(message, ...args) {
	// Capture the current stack trace
	const stack = new Error().stack;

	if (stack) {
		// Find the caller line in the stack trace
		const callerInfo = stack.split('\n')[3].trim();
		console.trace(
			`%c[ERROR-3RDPARTY] %c${callerInfo} - ${message}`,
			'color: orange; font-weight: bold;',
			'color: inherit;',
			...args
		);
	} else {
		console.log(message, ...args);
	}
}
