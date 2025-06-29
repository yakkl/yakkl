import { TimerManager } from '$lib/managers/TimerManager';
import { log } from '$lib/managers/Logger';

export async function stopTimers() {
	try {
		const timerManager = TimerManager.getInstance();
		if (timerManager) {
			timerManager.stopAll();
		}
	} catch (error) {
		log.error('Error stopping timers:', false, error);
	}
}

export function removeTimers() {
	try {
		const timerManager = TimerManager.getInstance();
		if (timerManager) {
			timerManager.removeAll(); // Stops and then clears all timers
		}
	} catch (error) {
		log.error('Error removing timers:', false, error);
	}
}
