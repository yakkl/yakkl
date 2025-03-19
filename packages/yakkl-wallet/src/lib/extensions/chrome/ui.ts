import { STORAGE_YAKKL_PREFERENCES } from '$lib/common/constants';
import type { Preferences } from '$lib/common/interfaces';
import type { Windows } from 'webextension-polyfill';
// import { browser_ext } from '$lib/common/environment';
// import { browserSvelte } from '$lib/common/environment';
import browser from 'webextension-polyfill';
import { getObjectFromLocalStorage, setObjectInLocalStorage } from '$lib/common/storage';
import { openPopups, openWindows } from '$lib/common/reload';
import { log } from '$lib/plugins/Logger';
import type { ExtendedBrowser } from '$lib/common/types/browser-extensions';

// NOTE: For background usage
type WindowsWindow = Windows.Window;

const browser_ext = browser as ExtendedBrowser;

export async function showExtensionPopup(
  popupWidth = 428,
  popupHeight = 926,
  url: string  // This should be undefined, null or ''
): Promise<WindowsWindow> {
  try {
      // Uses the default 'get' here
      const pref = await browser_ext.storage.local.get( STORAGE_YAKKL_PREFERENCES ) as { yakklPreferences: Preferences; };
      const yakkl = pref['yakklPreferences'] as Preferences;
      // eslint-disable-next-line prefer-const, @typescript-eslint/no-unused-vars
      let { left, top } = await browser_ext.windows.getCurrent(); //w - 1920

      // Pull from settings and get pin information...
      if ( yakkl && yakkl.wallet ) {
        popupWidth = yakkl.wallet.popupWidth;
        popupHeight = yakkl.wallet.popupHeight;

        const screenWidth = yakkl.screenWidth;
        const screenHeight = yakkl.screenHeight;

        try {
          // eslint-disable-next-line no-constant-condition
          if (yakkl.wallet.pinned) {
            switch (yakkl.wallet.pinnedLocation) {
              case 'TL':
                top = 0;
                left = 0;
                break;
              case 'TR':
                top = 0;
                left = screenWidth <= popupWidth ? 0 : screenWidth - popupWidth;
                break;
              case 'BL':
                top = screenHeight <= popupWidth ? 0 : screenHeight - popupHeight;
                left = 0;
                break;
              case 'BR':
                top = screenHeight <= popupWidth ? 0 : screenHeight - popupHeight;
                left = yakkl.screenWidth - popupWidth;
                break;
              case 'M':
                top = screenHeight <= popupHeight ? 0 : screenHeight/2 - popupHeight/2;
                left = screenWidth <= popupWidth ? 0 : screenWidth/2 - popupWidth/2;
                break;
              default:
                // x,y specific location
                // eslint-disable-next-line no-case-declarations
                const coord = yakkl.wallet.pinnedLocation.split(',');
                if (coord) {
                  left = parseInt(coord[0]) <= 0 ? 0 : parseInt(coord[0]);
                  top = parseInt(coord[1]) <= 0 ? 0 : parseInt(coord[1]);
                } else {
                  left = 0;
                  top = 0;
                }
              break;
            }
          }
        } catch (error) {
          log.error(error);
          left = 0;
          top = 0;
        }
      } else {
        top = 0;
        left = 0;
      }

      return browser_ext.windows.create({
        url: `${browser_ext.runtime.getURL((url ? url : "index.html"))}`,
        type: "panel",
        left: left,
        top: top,
        width: popupWidth,
        height: popupHeight,
        focused: true,
      });
  } catch (error) {
    log.error(error);
    return Promise.reject(); // May want to do something else here.
  }
}

// TBD! - May need to set up a connection between UI and here
// Check the lastlogin date - todays date = days hash it using dj2 then use as salt to encrypt and send to here and send back on request where it is reversed or else login again
export async function showPopup(url: string = ''): Promise<void> {
  try {
      showExtensionPopup(428, 926, url).then(async (result) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        browser_ext.windows.update(result.id, {drawAttention: true});
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await browser_ext.storage.session.set({windowId: result.id});

        openWindows.set(result.id, result);
      }).catch((error) => {
        log.error('Background - YAKKL: ' + false, error);  // need to send these area back to content.ts to inpage.ts to dapp so they can respond properly
      });
  } catch (error) {
    log.error('Background - showPopup',false, error); // need to send these area back to content.ts to inpage.ts to dapp so they can respond properly
  }
}

export async function showPopupDapp(url: string): Promise<void> {
  try {
    // Use more appropriate dimensions for dapp popups
    // Width: 360px is standard for most wallet popups
    // Height: Varies by type:
    // - Approval: 500px
    // - Transaction signing: 600px
    // - Account selection: 550px
    const height = url.includes('approve.html') ? 500 :
                  url.includes('transactions.html') ? 600 :
                  url.includes('accounts.html') ? 550 : 500;

    showExtensionPopup(360, height, url).then(async (result) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      browser_ext.windows.update(result.id, {drawAttention: true});
      openPopups.set('popupId', result.id);
    }).catch((error) => {
      log.error('Background - YAKKL: ' + false, error);
    });
  } catch (error) {
    log.error('Background - showPopupDapp', false, error);
  }
}

export async function showDappSidePanel(request: string) {
  try {
    // Check if the side panel is already open
    const views = await browser_ext.extension.getViews({ type: 'tab' });
    if (views.length > 0) {
      // Side panel is already open, send message to update content
      views[0].postMessage({
        type: 'UPDATE_CONTENT',
        url: request
      }, '*');
      return;
    }

    // Try to use side panel if available
    if (browser_ext.sidePanel) {
      await browser_ext.sidePanel.open({
        url: request,
        width: 360 // Standard width for wallet interfaces
      });
    } else {
      // Fallback to popup if side panel is not available
      await showDappPopup(request);
    }

  } catch (error) {
    log.error('Background - showDappSidePanel error:', false, error);
    // Fallback to popup if side panel fails
    await showDappPopup(request);
  }
}

export async function showDappPopup(request: string) {
  try {
    const height = request.includes('approve.html') ? 500 :
                   request.includes('transactions.html') ? 600 :
                   request.includes('accounts.html') ? 550 : 500;

    showExtensionPopup(360, height, request).then(async (result) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      browser_ext.windows.update(result.id, {drawAttention: true});
      openPopups.set('popupId', result.id);
    }).catch((error) => {
      log.error('Background - YAKKL: ' + false, error);
    });
  } catch (error) {
    log.error('Background - showDappPopup:', false, error);
  }
}

export async function updateScreenPreferences(event: any): Promise<void> {
  if (typeof browser_ext === 'undefined') {
    log.error('Browser extension API is not available.');
    return;
  }

  try {
    const yakklPreferences = await getObjectFromLocalStorage<any>('yakklPreferences');

    if (yakklPreferences) {
      yakklPreferences.preferences.screenWidth = event.data.availWidth;
      yakklPreferences.preferences.screenHeight = event.data.availHeight;

      await setObjectInLocalStorage('preferences', yakklPreferences);
    } else {
      log.error('yakklPreferences not found.');
    }
  } catch (error) {
    log.error('Error updating yakklPreferences:', false, error);
  }
}

