import { handleMessage, handlePortConnection } from './handlers/MessageHandler';
import { TransactionMonitorService } from '$lib/services/transactionMonitor.service';
import { handleBrowserAPIPortConnection } from './handlers/browser-api-port.handler';
import { createSafeMessageHandler } from '$lib/common/messageChannelValidator';

// Initialize background context
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'YAKKL_BROWSER_API') {
    // Handle browser API port connections with encryption support
    handleBrowserAPIPortConnection(port);
  } else if (port.name === 'yakkl-client') {
    handlePortConnection(port);
  }
});

// Handle one-off messages with safe channel validation
const safeMessageHandler = createSafeMessageHandler(
  async (request, sender) => {
    // Handle special cases first
    if (request.type === 'accountChanged' || request.type === 'chainChanged') {
      console.log('Background: Account or chain changed, restarting monitoring...');
      
      try {
        const txMonitor = TransactionMonitorService.getInstance();
        // stop() is synchronous, no await needed
        txMonitor.stop();
        await txMonitor.start();
        return { success: true };
      } catch (error: any) {
        console.error('Background: Failed to restart monitoring:', error);
        return { success: false, error: error.message };
      }
    }
    
    // Handle all other messages through the standard handler
    console.log('Background: Received message:', { 
      type: request.type, 
      hasPayload: !!request.payload,
      fullRequest: request 
    });
    
    return handleMessage(request, sender);
  },
  {
    timeout: 25000,
    logPrefix: 'Background'
  }
);

chrome.runtime.onMessage.addListener(safeMessageHandler as any);

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