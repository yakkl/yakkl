import { handleMessage, handlePortConnection } from './handlers/MessageHandler';
import { TransactionMonitorService } from '$lib/services/transactionMonitor.service';
import { handleBrowserAPIPortConnection } from './handlers/browser-api-port.handler';

// Initialize background context
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'YAKKL_BROWSER_API') {
    // Handle browser API port connections with encryption support
    handleBrowserAPIPortConnection(port);
  } else if (port.name === 'yakkl-client') {
    handlePortConnection(port);
  }
});

// Handle one-off messages (fallback for when port is not connected)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle special cases first
  if (request.type === 'accountChanged' || request.type === 'chainChanged') {
    console.log('Background: Account or chain changed, restarting monitoring...');
    
    // Wrap in a timeout to ensure response is sent before channel closes
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Operation timeout')), 25000)
    );
    
    const restartPromise = (async () => {
      try {
        const txMonitor = TransactionMonitorService.getInstance();
        // stop() is synchronous, no await needed
        txMonitor.stop();
        await txMonitor.start();
        return { success: true };
      } catch (error) {
        console.error('Background: Failed to restart monitoring:', error);
        return { success: false, error: error.message };
      }
    })();
    
    // Race between the operation and timeout
    Promise.race([restartPromise, timeoutPromise])
      .then(response => {
        sendResponse(response);
      })
      .catch(error => {
        console.error('Background: Operation failed or timed out:', error);
        sendResponse({ success: false, error: error.message });
      });
      
    return true; // Will respond asynchronously
  }
  
  // Handle all other messages through the standard handler
  console.log('Background: Received message:', { 
    type: request.type, 
    hasPayload: !!request.payload,
    fullRequest: request 
  });
  
  // Ensure response is always sent, even if handler throws
  const sendSafeResponse = (response: any) => {
    try {
      sendResponse(response);
    } catch (e) {
      console.error('Background: Failed to send response:', e);
    }
  };
  
  // Add timeout protection
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Handler timeout')), 25000)
  );
  
  // Handle the message with timeout protection
  Promise.race([
    handleMessage(request, sender),
    timeoutPromise
  ]).then(response => {
    console.log('Background: Sending response:', response);
    sendSafeResponse(response);
  }).catch(error => {
    console.error('Background: Error handling message:', error);
    sendSafeResponse({ success: false, error: error.message || 'Unknown error' });
  });
  
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
    
  } catch (error) {
    console.error('Background: Failed to initialize transaction monitoring:', error);
  }
}

// Initialize background services when extension starts
initializeBackgroundServices();

// Export for use in background script
export { handleMessage, handlePortConnection };