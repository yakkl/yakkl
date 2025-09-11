import { detectBrowserContext } from './browserContext';
import { browser_ext } from './environment';
import { log } from '$lib/common/logger-wrapper';

/**
 * Context-aware wrapper for icon timer functions
 * In background context: Direct function calls
 * In client context: Message passing to background
 */

export async function startLockIconTimer(): Promise<void> {
  const context = detectBrowserContext();
  
  if (context === 'background') {
    // Direct import only in background context
    const { startLockIconTimer: bgStartTimer } = await import('$contexts/background/extensions/chrome/iconTimer');
    bgStartTimer();
  } else if (browser_ext) {
    // Client context - send message to background
    try {
      await browser_ext.runtime.sendMessage({
        type: 'startLockIconTimer'
      });
    } catch (error) {
      log.error('Failed to send start timer message to background:', false, error);
    }
  }
}

export async function stopLockIconTimer(): Promise<void> {
  const context = detectBrowserContext();
  
  if (context === 'background') {
    // Direct import only in background context
    const { stopLockIconTimer: bgStopTimer } = await import('$contexts/background/extensions/chrome/iconTimer');
    await bgStopTimer();
  } else if (browser_ext) {
    // Client context - send message to background
    try {
      await browser_ext.runtime.sendMessage({
        type: 'stopLockIconTimer'
      });
    } catch (error) {
      log.error('Failed to send stop timer message to background:', false, error);
    }
  }
}