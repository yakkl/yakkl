import { browserSvelte, browser_ext } from './environment';
import { log } from '$lib/managers/Logger';
import { openWindows } from '$lib/extensions/chrome/ui';

export function getPopupDimensions() {
	return {
		top: window.screenY, // Top position
		left: window.screenX, // Left position
		width: window.innerWidth, // Popup width
		height: window.innerHeight // Popup height
	};
}

export async function loadExtensionPopup(
	top = 0,
	left = 0,
	popupWidth = 428,
	popupHeight = 926,
	url: string = '' // This should be undefined, null or ''
): Promise<any> {
	try {
		if (browserSvelte) {
			return browser_ext.windows.create({
				url: `${browser_ext.runtime.getURL(url ? url : 'index.html')}`,
				type: 'panel',
				left: left,
				top: top,
				width: popupWidth,
				height: popupHeight,
				focused: true
			});
		} else {
			return Promise.reject();
		}
	} catch (error) {
		log.error(error);
		return Promise.reject(); // May want to do something else here.
	}
}

export async function loadPopup(
	top: number = 0,
	left: number = 0,
	popupWidth: number = 428,
	popupHeight: number = 926,
	url: string = ''
): Promise<void> {
	try {
		if (browserSvelte) {
			loadExtensionPopup(top, left, popupWidth, popupHeight, url)
				.then(async (result) => {
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					browser_ext.windows.update(result.id, { drawAttention: true });
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					await browser_ext.storage.session.set({ windowId: result.id });

					openWindows.set(result.id, result);

					// log.debug('yakkl - background - showPopup (windows):', result);
				})
				.catch((error) => {
					log.error('Background - YAKKL: ', false, error); // need to send these area back to content.ts to inpage.ts to dapp so they can respond properly
				});
		}
	} catch (error) {
		log.error('Background - showPopup', false, error); // need to send these area back to content.ts to inpage.ts to dapp so they can respond properly
	}
}
