// The browser-polyfill is already bundled in background.js by webpack
// Use dynamic import since this is an ES module (type: "module" in manifest)
(async () => {
  try {
    await import('/ext/background.js');
  } catch (error) {
    console.error('[Background Wrapper] Failed to load background script:', error);
  }
})();
