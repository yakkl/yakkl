import browser from 'webextension-polyfill';

// NOTE: If the compiler generates an error, it's most likely because of trying to use 'browser' in the client context.
export function isBackgroundContext(): boolean {
  // Check if this is a browser extension context
  const isExtensionContext = typeof browser !== 'undefined' &&
                            typeof browser.runtime !== 'undefined';

  // Check if we're in a service worker environment
  // @ts-ignore - We need to check if 'self' is a ServiceWorkerGlobalScope
  const isServiceWorker = typeof self !== 'undefined' && self.constructor.name === 'ServiceWorkerGlobalScope';

  // Check for service worker-specific APIs
  const hasServiceWorkerAPIs = typeof self !== 'undefined' &&
                               'clients' in self &&
                               'registration' in self;

  return isExtensionContext && isServiceWorker && hasServiceWorkerAPIs;
}
