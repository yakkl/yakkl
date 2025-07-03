import { openWindows, updateScreenPreferences } from '$contexts/background/extensions/chrome/ui';
import { setIconLock } from '$lib/utilities/utilities';
import type { Runtime } from 'webextension-polyfill';

export async function onPortInternalListener(event: any, port?: Runtime.Port): Promise<void> {
	if (event && event.method) {
		switch (event.method) {
			case 'int_screen':
				updateScreenPreferences(event);
				break;
			case 'close':
				await setIconLock();
				// openPopups.clear();
				openWindows.clear();
				break;
			default:
				break;
		}
	}
}
