import browser from 'webextension-polyfill';
import { log } from '$lib/managers/Logger';

export async function onAlarmListener(alarm: any) {
	try {
		if (!browser) return;

		log.info('Background - onAlarmListener:', false, alarm);

		if (alarm.name === 'yakkl-lock-alarm') {
			// NOTE: If this sendMessage is not working then move 'await NotificationService.sendSecurityAlert' here to make sure context is correct.
			await browser.runtime.sendMessage({ type: 'lockdown' });
		} else if (alarm.name === 'yakkl-lock-notification') {
			await browser.runtime.sendMessage({ type: 'lockdownImminent' });
		}
	} catch (error) {
		log.error('Background - onAlarmListener:', false, error);
	}
}
