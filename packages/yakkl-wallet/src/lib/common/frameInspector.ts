// FrameInspector.ts

import { log } from '$lib/managers/Logger';

export type FrameAccessibility =
  | 'accessible'
  | 'null-origin'
  | 'cross-origin'
  | 'sandboxed'
  | 'disconnected'
  | 'unknown-error';

/**
 * Returns the accessibility status of a given Window reference.
 */
export function getFrameAccessibility(
  win: Window | null,
  verbose: boolean = false
): FrameAccessibility {
  try {
    if (!win) {
      if (verbose) log.debug('[FrameInspector] Window is null');
      return 'disconnected';
    }

    if (typeof win.postMessage !== 'function') {
      if (verbose) log.debug('[FrameInspector] postMessage not a function');
      return 'disconnected';
    }

    const origin = win.location?.origin;
    if (origin === 'null') {
      if (verbose) log.debug('[FrameInspector] Window has null origin');
      return 'null-origin';
    }

    try {
      void win.location.href;
    } catch {
      if (verbose) log.debug('[FrameInspector] Cross-origin window');
      return 'cross-origin';
    }

    return 'accessible';
  } catch (err) {
    if (verbose) log.debug('[FrameInspector] Unknown error', false, err);
    return 'unknown-error';
  }
}

/**
 * Boolean helper to quickly check if frame is safe to postMessage to.
 */
export function isFrameAccessible(win: Window | null): boolean {
  return getFrameAccessibility(win) === 'accessible';
}

/**
 * Checks if a frame is sandboxed.
 * This usually means:
 * - Its origin is 'null'
 * - It cannot access localStorage, cookies, or extension APIs
 * - It was loaded via <iframe sandbox> without allow-same-origin
 */
export function isSandboxedFrame(win: Window | null): boolean {
  try {
    if (!win) return false;

    const origin = win.location?.origin;

    // Null origin usually means sandboxed iframe
    return origin === 'null';
  } catch {
    // Cross-origin frames will also throw here, but we assume they're not "sandboxed"
    return false;
  }
}

/**
 * Returns a high-level classification of the frame:
 * - 'sandboxed'
 * - 'cross-origin'
 * - 'accessible'
 * - 'disconnected'
 */
export function getFrameType(win: Window | null): FrameAccessibility {
  try {
    if (!win) return 'disconnected';
    if (typeof win.postMessage !== 'function') return 'disconnected';

    const origin = win.location?.origin;

    if (origin === 'null') return 'sandboxed';

    try {
      void win.location.href;
    } catch {
      return 'cross-origin';
    }

    return 'accessible';
  } catch {
    return 'unknown-error';
  }
}
