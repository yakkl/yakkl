// Initialization script to ensure browser polyfill is available
// This runs before the SvelteKit app starts

(function() {
  'use strict';
  
  // Check if we're in an extension context
  const isExtension = window.location.protocol === 'chrome-extension:' || 
                      window.location.protocol === 'moz-extension:';
  
  if (!isExtension) {
    console.log('[init-polyfill] Not in extension context, skipping polyfill check');
    // Set a resolved promise for non-extension contexts
    window.__browserPolyfillReady = Promise.resolve();
    return;
  }
  
  // Suppress specific extension errors during initialization
  const originalConsoleError = console.error;
  const suppressedErrors = [
    'Could not establish connection',
    'Receiving end does not exist',
    'Extension context invalidated',
    'Cannot access a chrome://',
    'webextension-polyfill'
  ];
  
  console.error = function(...args) {
    const errorString = args.map(arg => String(arg)).join(' ');
    if (suppressedErrors.some(err => errorString.includes(err))) {
      // Silently ignore these errors during initialization
      return;
    }
    originalConsoleError.apply(console, args);
  };
  
  // Wait for the browser API to be available
  function waitForBrowserAPI() {
    return new Promise((resolve) => {
      // Check if already available
      if (window.browser || (window.chrome && window.chrome.runtime)) {
        console.log('[init-polyfill] Browser API already available');
        // Restore console.error after a delay
        setTimeout(() => { console.error = originalConsoleError; }, 1000);
        resolve();
        return;
      }
      
      // Wait for it to become available
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max
      
      const checkInterval = setInterval(() => {
        attempts++;
        
        if (window.browser || (window.chrome && window.chrome.runtime)) {
          console.log('[init-polyfill] Browser API became available after', attempts, 'attempts');
          clearInterval(checkInterval);
          // Restore console.error after a delay
          setTimeout(() => { console.error = originalConsoleError; }, 1000);
          resolve();
        } else if (attempts >= maxAttempts) {
          console.warn('[init-polyfill] Browser API not available after', maxAttempts, 'attempts');
          clearInterval(checkInterval);
          // Restore console.error
          console.error = originalConsoleError;
          resolve(); // Continue anyway, the app will use mocks
        }
      }, 100);
    });
  }
  
  // Store the promise globally so SvelteKit can wait for it
  window.__browserPolyfillReady = waitForBrowserAPI();
})();