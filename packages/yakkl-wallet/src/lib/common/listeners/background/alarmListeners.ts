import browser from 'webextension-polyfill';
import { log } from '$lib/managers/Logger';
import { IdleManager } from '$lib/managers/IdleManager';

export async function onAlarmListener(alarm: any) {
	try {
		if (!browser) return;

		log.info('Background - onAlarmListener:', false, alarm);

		if (alarm.name === 'yakkl-lock-alarm') {
			// Original immediate lock alarm
			await browser.runtime.sendMessage({ type: 'lockdown' });
		} else if (alarm.name === 'yakkl-lock-notification') {
			await browser.runtime.sendMessage({ type: 'lockdownImminent' });
		} else if (alarm.name === 'yakkl-countdown-start') {
			// Grace period expired, start countdown
			log.info('Grace period expired, starting countdown');
			const idleManager = IdleManager.getInstance();
			if (idleManager && typeof (idleManager as any).startCountdown === 'function') {
				await (idleManager as any).startCountdown();
			}
		}
	} catch (error) {
		log.error('Background - onAlarmListener:', false, error);
	}
}
