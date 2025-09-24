import { log } from '$lib/common/logger-wrapper';

/**
 * Safely checks whether the current context is inside an iframe.
 * Includes cross-origin protection.
 */
export function isInIframeSafe(): boolean {
	if (typeof window === 'undefined') return false; // not in browser context
	try {
		return window.self !== window.top;
	} catch {
		return true; // probably cross-origin iframe
	}
}

/**
 * Checks whether an iframe element is same-origin and still connected.
 */
export function isIframeAccessible(iframe: HTMLIFrameElement): boolean {
	if (typeof window === 'undefined' || !iframe) return false;
	try {
		return (
			iframe?.isConnected &&
			iframe?.contentWindow !== null &&
			iframe?.contentDocument !== null &&
			iframe.contentWindow?.location?.origin === window.location.origin
		);
	} catch {
		return false;
	}
}

/**
 * Returns a list of accessible, same-origin iframes in the current window context.
 */
export function getAccessibleIframes(): HTMLIFrameElement[] {
	if (typeof window === 'undefined' || !document) return [];
	const allIframes = Array.from(document.getElementsByTagName('iframe')) as HTMLIFrameElement[];
	return allIframes.filter(isIframeAccessible);
}

/**
 * Recursively crawls all accessible, same-origin iframes and executes a callback.
 */
export function crawlIframesRecursive(callback: (win: Window) => void, win: Window = window): void {
	if (typeof window === 'undefined' || !win?.document) return;

	try {
		callback(win);

		const iframes = win.document.getElementsByTagName('iframe');
		for (const iframe of iframes) {
			if (isIframeAccessible(iframe)) {
				crawlIframesRecursive(callback, iframe.contentWindow!);
			}
		}
	} catch (err) {
		console.warn('Error crawling iframes:', err);
	}
}
