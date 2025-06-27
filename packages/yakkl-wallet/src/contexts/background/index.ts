import { handleMessage, handlePortConnection } from './handlers/MessageHandler';

// Initialize background context
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'yakkl-client') {
    handlePortConnection(port);
  }
});

// Handle one-off messages (fallback for when port is not connected)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender).then(sendResponse);
  return true; // Will respond asynchronously
});

// Export for use in background script
export { handleMessage, handlePortConnection };