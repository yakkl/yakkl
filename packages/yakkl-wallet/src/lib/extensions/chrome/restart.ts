// import { browser_ext } from '$lib/common/environment';
import browser from 'webextension-polyfill';
import { log } from '$lib/managers/Logger';

// WIP - do not use
export async function restartExtension() {
  try {
    if (!browser) return;

    log.info('Restarting extension...');

    // Open the extension popup after a slight delay
    setTimeout(() => {
      browser.windows.create({
        url: browser.runtime.getURL('/popup/popup.html'),
        type: 'popup',
        width: 400,
        height: 600,
      });
    }, 2000); // Adjust delay as needed to allow the extension to reload

    // Reopen the extension popup after reload
    browser.runtime.reload();
  } catch (error) {
    log.error('Failed to restart extension:', false, error);
  }
}
