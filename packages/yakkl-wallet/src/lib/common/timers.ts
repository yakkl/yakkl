import { TimerManager } from '$lib/managers/TimerManager';
import { log } from '$lib/common/logger-wrapper';

export async function stopTimers() {
	console.log('[stopTimers] Starting timer stop process...');
	try {
		const timerManager = TimerManager.getInstance();
		if (timerManager) {
			console.log('[stopTimers] TimerManager found, stopping all timers...');
			timerManager.stopAll();
			console.log('[stopTimers] ✓ All timers stopped');
		} else {
			console.warn('[stopTimers] ⚠ TimerManager not found');
		}
	} catch (error) {
		console.error('[stopTimers] ✗ Error stopping timers:', error);
		log.warn('Error stopping timers:', false, error);
	}
}

export function removeTimers() {
	console.log('[removeTimers] Starting timer removal process...');
	try {
		const timerManager = TimerManager.getInstance();
		if (timerManager) {
			console.log('[removeTimers] TimerManager found, removing all timers...');
			timerManager.removeAll(); // Stops and then clears all timers
			console.log('[removeTimers] ✓ All timers removed');
		} else {
			console.warn('[removeTimers] ⚠ TimerManager not found');
		}
	} catch (error) {
		console.error('[removeTimers] ✗ Error removing timers:', error);
		log.warn('Error removing timers:', false, error);
	}
}
