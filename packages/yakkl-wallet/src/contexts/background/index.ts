import { handleMessage, handlePortConnection } from './handlers/MessageHandler';
import { TransactionMonitorService } from '$lib/services/transactionMonitor.service';

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

// Initialize transaction monitoring in background context
// This runs independently of UI and persists across sessions
async function initializeBackgroundServices() {
  try {
    console.log('Background: Initializing transaction monitoring service...');
    
    // Get transaction monitor instance
    const txMonitor = TransactionMonitorService.getInstance();
    
    // Configure background monitoring settings
    txMonitor.configure({
      pollingInterval: 30000, // 30 seconds
      notificationEnabled: true // Enable notifications
    });
    
    // Start monitoring - this will run continuously in background
    await txMonitor.start();
    
    console.log('Background: Transaction monitoring started successfully');
    
    // Listen for account/chain changes to update monitoring
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'accountChanged' || request.type === 'chainChanged') {
        console.log('Background: Account or chain changed, restarting monitoring...');
        (async () => {
          await txMonitor.stop();
          await txMonitor.start();
        })();
      }
      return false; // Synchronous response
    });
    
  } catch (error) {
    console.error('Background: Failed to initialize transaction monitoring:', error);
  }
}

// Initialize background services when extension starts
initializeBackgroundServices();

// Export for use in background script
export { handleMessage, handlePortConnection };