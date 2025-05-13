// background.ts - Complete implementation with unified port handling
import { ensureProcessPolyfill } from '$lib/common/process';
ensureProcessPolyfill();

import { initializeEIP6963, getCurrentlySelectedData } from './eip-6963';
import { addBackgroundListeners } from '$lib/common/listeners/background/backgroundListeners';
import { log } from '$lib/plugins/Logger';
import browser from 'webextension-polyfill';
import { onAlarmListener } from '$lib/common/listeners/background/alarmListeners';
import type { Runtime } from 'webextension-polyfill';
import { type ActiveTab } from '$lib/common';
import { initializePermissions } from '$lib/permissions';
import { initializeStorageDefaults, watchLockedState } from '$lib/common/backgroundUtils';
import { KeyManager } from '$lib/plugins/KeyManager';
import { getObjectFromLocalStorage } from '$lib/common/backgroundSecuredStorage';
import { SecurityLevel } from '$lib/permissions/types';
import { getAlchemyProvider } from '$lib/plugins/providers/network/ethereum_provider/alchemy';
import type { PendingRequestData, YakklRequest, YakklResponse } from '$lib/common/interfaces';
import { showPopup } from './ui';
import { extractSecureDomain } from '$lib/common/security';
import { getAddressesForDomain, verifyDomainConnected } from '$lib/extensions/chrome/verifyDomainConnectedBackground';

// Type definitions for our unified architecture
export type RuntimePort = Runtime.Port;

export interface PortInfo {
    port: RuntimePort;
    type: 'unified' | 'legacy';
    lastActivity: number;
    metadata: {
      tabId?: number;
      url?: string;
      isContentScript: boolean;
    };
  }

// Connection manager class to handle all port connections
class ConnectionManager {
  private ports: Map<string, PortInfo> = new Map();
  private portIdCounter = 0;

  // Register a new port connection
  public registerPort(port: RuntimePort, sender?: Runtime.MessageSender): string {
    const portId = `port-${this.portIdCounter++}`;

    const portInfo: PortInfo = {
      port,
      type: this.detectPortType(port.name),
      lastActivity: Date.now(),
      metadata: {
        tabId: sender?.tab?.id,
        url: sender?.url || sender?.tab?.url,
        isContentScript: sender?.url?.startsWith('chrome-extension://') === false
      }
    };

    this.ports.set(portId, portInfo);

    log.debug('Port registered:', false, {
      portId,
      type: portInfo.type,
      metadata: portInfo.metadata
    });

    return portId;
  }

  // Detect the type of port based on its name
  private detectPortType(portName: string): 'unified' | 'legacy' {
    if (portName === 'yakkl-unified') {
      return 'unified';
    }
    return 'legacy';
  }

  // Get port info by ID
  public getPort(portId: string): PortInfo | undefined {
    return this.ports.get(portId);
  }

  // Remove a port
  public removePort(portId: string): void {
    this.ports.delete(portId);
    log.debug('Port removed:', false, { portId });
  }

  // Update port activity
  public updateActivity(portId: string): void {
    const portInfo = this.ports.get(portId);
    if (portInfo) {
      portInfo.lastActivity = Date.now();
    }
  }

  // Clean up inactive ports
  public cleanupInactivePorts(maxInactiveTime: number = 300000): void { // 5 minutes
    const now = Date.now();
    for (const [portId, portInfo] of this.ports.entries()) {
      if (now - portInfo.lastActivity > maxInactiveTime) {
        this.removePort(portId);
      }
    }
  }
}

// Create our connection manager instance
const connectionManager = new ConnectionManager();

// Pending requests tracking
export type BackgroundPendingRequest = {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  port: RuntimePort;
  data: PendingRequestData;
  error?: {
    code: number;
    message: string;
  };
  result?: any;
};

export const pendingRequests = new Map<string, BackgroundPendingRequest>();

// Track processed requests to prevent duplicates
const processedBackgroundRequests = new Set<string>();

// Main port connection handler
browser.runtime.onConnect.addListener((port: RuntimePort) => {
  const sender = port.sender;
  const portId = connectionManager.registerPort(port, sender);

  log.debug('Background: Port connected:', false, {
    portId,
    portName: port.name,
    sender: sender,
    timestamp: new Date().toISOString()
  });

  // Set up message listener for this port
  port.onMessage.addListener(async (message: any) => {
    try {
      connectionManager.updateActivity(portId);

      log.debug('Background: Message received on port:', false, {
        portId,
        message,
        timestamp: new Date().toISOString()
      });

      // Handle different message sources
      if (message.source === 'content' || message.source === 'provider') {
        log.debug('Background: Handling provider message:', false, {
          portId,
          message,
          timestamp: new Date().toISOString()
        });
        await handleProviderMessage(message, port, portId);
      } else {
        // Handle other message types based on the message itself
        log.debug('Background: Handling general message:', false, {
          portId,
          message,
          timestamp: new Date().toISOString()
        });
        await handleGeneralMessage(message, port, portId);
      }
    } catch (error) {
      log.error('Error handling port message:', false, error);
      sendErrorResponse(port, message.id, error);
    }
  });

  // Handle port disconnection
  port.onDisconnect.addListener(() => {
    log.debug('Background: Port disconnected:', false, {
      portId,
      timestamp: new Date().toISOString()
    });

    connectionManager.removePort(portId);

    // Clean up any pending requests for this port
    cleanupPendingRequestsForPort(port);
  });
});

// Handle provider-specific messages
async function handleProviderMessage(message: any, port: RuntimePort, portId: string) {
  // Skip duplicate requests
  if (message.id && processedBackgroundRequests.has(message.id)) {
    log.debug('Background: Skipping duplicate request:', false, {
      requestId: message.id,
      method: message.method
    });
    return;
  }

  if (message.id) {
    processedBackgroundRequests.add(message.id);

    // Clean up old processed requests
    if (processedBackgroundRequests.size > 1000) {
      const oldestRequests = Array.from(processedBackgroundRequests).slice(0, 100);
      oldestRequests.forEach(id => processedBackgroundRequests.delete(id));
    }
  }

  // Handle different message types
  switch (message.type) {
    case 'YAKKL_REQUEST:EIP6963':
    case 'YAKKL_REQUEST:EIP1193':
      await handleProviderRequest(message as YakklRequest, port);
      break;

    case 'CONNECTION_TEST':
      // Respond to connection test
      port.postMessage({
        type: 'CONNECTION_TEST_RESPONSE',
        id: message.id
      });
      break;

    default:
      log.debug('Unknown provider message type:', false, message.type);
  }
}

// Handle provider requests
async function handleProviderRequest(request: YakklRequest, port: RuntimePort) {
  const { id, method, params, requiresApproval } = request;

  try {
    log.debug('Processing provider request:', false, {
      id,
      method,
      requiresApproval,
      timestamp: new Date().toISOString()
    });

    // Handle approval-required methods
    if (requiresApproval) {
      await handleApprovalRequest(request, port);
      return;
    }

    // Handle direct methods - pass the entire request object
    const result = await handleDirectMethod(method, params || [], request);

    // Send response
    const response: YakklResponse = {
      type: 'YAKKL_RESPONSE:EIP6963',
      id,
      result,
      jsonrpc: '2.0',
      method
    };

    log.debug('Sending provider response:', false, {
      id: response.id,
      method: response.method,
      type: response.type,
      hasResult: result !== undefined,
      timestamp: new Date().toISOString()
    });

    port.postMessage(response);

    log.debug('Provider response sent successfully', false, { id: response.id });
  } catch (error) {
    log.error('Error in handleProviderRequest:', false, { id, method, error });
    sendErrorResponse(port, id, error);
  }
}

// Handle methods that require user approval
async function handleApprovalRequest(request: YakklRequest, port: RuntimePort) {
  const { id, method, params } = request;

  try {
    // Get current tab information
    const portInfo = Array.from(connectionManager['ports'].values())
      .find(info => info.port === port);

    const tabInfo = await getTabInfoForPort(portInfo);

    // Store pending request
    const pendingRequest: BackgroundPendingRequest = {
      resolve: (result: any) => {
        port.postMessage({
          type: 'YAKKL_RESPONSE:EIP6963',
          id,
          result,
          method,
          jsonrpc: '2.0'
        });
      },
      reject: (error: any) => {
        sendErrorResponse(port, id, error);
      },
      port,
      data: {
        id,
        method,
        params: params || [],
        requiresApproval: true,
        timestamp: Date.now(),
        metaData: {
          method,
          params: params || [],
          metaData: {
            domain: tabInfo.domain,
            isConnected: await verifyDomainConnected(tabInfo.domain),
            icon: tabInfo.icon,
            title: tabInfo.title,
            origin: tabInfo.url,
            message: getApprovalMessage(method, params)
          }
        }
      }
    };

    pendingRequests.set(id, pendingRequest);

    // Show approval popup
    const { showEIP6963Popup } = await import('./eip-6963');
    await showEIP6963Popup(method, params || [], port, id);
  } catch (error) {
    log.error('Error handling approval request:', false, error);
    sendErrorResponse(port, id, error);
  }
}

// Handle direct methods (no approval needed)
async function handleDirectMethod(method: string, params: any[], request?: any): Promise<any> {
  const yakklCurrentlySelectedData = await getCurrentlySelectedData();

  switch (method) {
    case 'eth_chainId':
      return yakklCurrentlySelectedData?.chainId || '0x1';

    case 'eth_accounts':
      // Try to get origin from multiple possible locations
      let origin = '';

      // First, check if the origin is in the request object
      if (request?.origin) {
        origin = request.origin;
      }
      // Then check if it's in the params
      else if (params && params.length > 0) {
        const lastParam = params[params.length - 1];
        if (typeof lastParam === 'object' && lastParam.origin) {
          origin = lastParam.origin;
        }
      }

      // If we still don't have an origin, we can't proceed safely
      if (!origin) {
        log.warn('No origin provided for eth_accounts request', false);
        return [];
      }

      try {
        const domain = extractSecureDomain(origin);
        const isConnected = await verifyDomainConnected(domain);

        if (!isConnected) {
          return [];
        }

        return await getAddressesForDomain(domain);
      } catch (error) {
        log.error('Error extracting domain or checking connection:', false, error);
        return [];
      }

    case 'net_version':
      const chainId = yakklCurrentlySelectedData?.chainId;
      if (!chainId) return '1';

      const chainIdStr = typeof chainId === 'string' ? chainId : `0x${chainId.toString(16)}`;
      return parseInt(chainIdStr.replace('0x', ''), 16).toString();

    default:
      // For other methods, delegate to the network provider
      const provider = getAlchemyProvider();
      return provider.request({ method, params });
  }
}

// Handle general messages (not provider-specific)
// In handleGeneralMessage function, add a case for responses
async function handleGeneralMessage(message: any, port: RuntimePort, portId: string) {
  // Route messages based on type
  switch (message.type) {
    case 'SECURITY_CONFIG_REQUEST':
      // Handle security configuration requests
      const securityLevel = await getSecurityLevel();
      port.postMessage({
        type: 'SECURITY_CONFIG_RESPONSE',
        securityLevel,
        injectIframes: shouldInjectIframes(securityLevel)
      });
      break;

    // Add this new case to handle responses
    case 'YAKKL_RESPONSE:EIP6963':
    case 'YAKKL_RESPONSE:EIP1193':
      await handleProviderResponse(message, port, portId);
      break;

    default:
      // Try legacy handlers if needed
      await handleLegacyMessage(message, port);
  }
}

// Add this new function to handle provider responses
async function handleProviderResponse(response: any, port: RuntimePort, portId: string) {
  const { id, result, error } = response;

  log.debug('Handling provider response:', false, {
    id,
    hasResult: result !== undefined,
    hasError: error !== undefined,
    portId,
    timestamp: new Date().toISOString()
  });

  // Find the pending request
  const pendingRequest = pendingRequests.get(id);
  if (!pendingRequest) {
    log.warn('No pending request found for response:', false, { id });
    return;
  }

  // Forward the response back through the original port that made the request
  const originalPort = pendingRequest.port;

  try {
    log.debug('Forwarding response to original port:', false, {
      id,
      originalPortName: originalPort.name,
      currentPortName: port.name,
      timestamp: new Date().toISOString()
    });

    originalPort.postMessage(response);

    // Clean up the pending request
    pendingRequests.delete(id);

    log.debug('Response forwarded successfully', false, { id });
  } catch (error) {
    log.error('Failed to forward response:', false, {
      id,
      error,
      originalPortDisconnected: !originalPort.name
    });

    // If the original port is disconnected, clean up
    pendingRequests.delete(id);
  }
}

// Helper function to get tab information for a port
async function getTabInfoForPort(portInfo: any): Promise<{
  domain: string;
  url: string;
  title: string;
  icon: string;
}> {
  try {
    if (portInfo?.metadata?.tabId) {
      const tab = await browser.tabs.get(portInfo.metadata.tabId);
      return {
        domain: extractSecureDomain(tab.url || ''),
        url: tab.url || '',
        title: tab.title || 'Unknown',
        icon: tab.favIconUrl || '/images/failIcon48x48.png'
      };
    }
  } catch (error) {
    log.error('Error getting tab info:', false, error);
  }

  // Return defaults if we can't get tab info
  return {
    domain: 'Unknown',
    url: '',
    title: 'Unknown',
    icon: '/images/failIcon48x48.png'
  };
}

// Helper function to get approval message for different methods
function getApprovalMessage(method: string, params?: any[]): string {
  switch (method) {
    case 'personal_sign':
      return params?.[0] ? String(params[0]) : 'Sign Message';
    case 'eth_signTypedData_v4':
      return 'Sign Typed Data';
    case 'eth_sendTransaction':
      return 'Send Transaction';
    default:
      return 'Approve Request';
  }
}

// Send error response to port
function sendErrorResponse(port: RuntimePort, id: string, error: any) {
  const errorResponse: YakklResponse = {
    type: 'YAKKL_RESPONSE:EIP6963',
    id,
    error: {
      code: error.code || -32603,
      message: error.message || 'Internal error'
    },
    jsonrpc: '2.0'
  };

  try {
    port.postMessage(errorResponse);
  } catch (e) {
    log.error('Failed to send error response:', false, e);
  }
}

// Clean up pending requests for a disconnected port
function cleanupPendingRequestsForPort(port: RuntimePort) {
  for (const [id, request] of pendingRequests.entries()) {
    if (request.port === port) {
      pendingRequests.delete(id);
      log.debug('Cleaned up pending request:', false, { id });
    }
  }
}

interface SecuritySettings {
  level: SecurityLevel;
  lastUpdated?: number;
  // Add any other security settings properties here
}

// Create a dedicated function for getting security settings
async function getSecuritySettings(): Promise<SecuritySettings | null> {
  try {
    const data = await getObjectFromLocalStorage('securitySettings');

    // Validate the structure
    if (!data || typeof data !== 'object') {
      return null;
    }

    // Check if 'level' exists and is a valid SecurityLevel
    if ('level' in data && Object.values(SecurityLevel).includes((data as any).level)) {
      return data as SecuritySettings;
    }

    return null;
  } catch (error) {
    console.error('Error retrieving security settings:', error);
    return null;
  }
}

// Your main function becomes simpler and more type-safe
async function getSecurityLevel(): Promise<SecurityLevel> {
  const settings = await getSecuritySettings();
  return settings?.level || SecurityLevel.MEDIUM;
}

// Determine if iframes should be injected based on security level
function shouldInjectIframes(securityLevel: SecurityLevel): boolean {
  switch (securityLevel) {
    case SecurityLevel.HIGH:
      return false;
    case SecurityLevel.MEDIUM:
    case SecurityLevel.STANDARD:
      return true;
    default:
      return true;
  }
}

// Handle legacy messages for backward compatibility
async function handleLegacyMessage(message: any, port: RuntimePort) {
  // Add any legacy message handling here if needed
  log.debug('Unhandled message type:', false, { type: message.type });
}

// Setup provider event broadcasting
function setupProviderEvents() {
  const provider = getAlchemyProvider();

  // Listen for provider events and broadcast them
  provider.on('accountsChanged', (accounts: string[]) => {
    broadcastEvent('accountsChanged', accounts);
  });

  provider.on('chainChanged', (chainId: string) => {
    broadcastEvent('chainChanged', chainId);
  });

  provider.on('connect', (connectInfo: { chainId: string }) => {
    broadcastEvent('connect', connectInfo);
  });

  provider.on('disconnect', (error: { code: number; message: string }) => {
    broadcastEvent('disconnect', error);
  });
}

// Broadcast events to all connected ports
function broadcastEvent(eventName: string, data: any) {
  const event = {
    type: 'YAKKL_EVENT:EIP6963',
    event: eventName,
    data
  };

  // Send to all connected ports
  connectionManager['ports'].forEach((portInfo) => {
    try {
      portInfo.port.postMessage(event);
    } catch (error) {
      log.debug('Failed to send event to port:', false, error);
    }
  });
}

// Initialize background script
async function initializeBackground() {
  try {
    log.debug('Initializing background script...', false);

    // Initialize core components
    await initializeStorageDefaults();
    await initializePermissions();
    initializeEIP6963();

    // Add listeners
    addBackgroundListeners();
    browser.alarms.onAlarm.addListener(onAlarmListener);

    // Setup provider events
    setupProviderEvents();

    // Start periodic cleanup
    setInterval(() => {
      connectionManager.cleanupInactivePorts();
      cleanupOldProcessedRequests();
    }, 60000); // Every minute

    // Watch locked state
    await watchLockedState(2 * 60 * 1000);

    log.debug('Background script initialized successfully', false);
  } catch (error) {
    log.error('Failed to initialize background script:', false, error);
  }
}

// Clean up old processed requests
function cleanupOldProcessedRequests() {
  const now = Date.now();

  // Clean up pending requests older than 5 minutes
  for (const [id, request] of pendingRequests.entries()) {
    if (now - request.data.timestamp > 300000) {
      pendingRequests.delete(id);
      log.debug('Cleaned up stale pending request:', false, { id });
    }
  }

  // Keep processed requests set reasonable size
  if (processedBackgroundRequests.size > 5000) {
    const toRemove = processedBackgroundRequests.size - 4000;
    const iterator = processedBackgroundRequests.values();
    for (let i = 0; i < toRemove; i++) {
      processedBackgroundRequests.delete(iterator.next().value);
    }
  }
}

// Initialize keymanager and storage (if needed)
async function initializeKeyManager(): Promise<void> {
  try {
    const keyManager = await KeyManager.getInstance();
    log.debug('KeyManager initialized', false);
  } catch (error) {
    log.error('Failed to initialize KeyManager', false, error);
  }
}

// Handle runtime messages (for non-port communication)
export async function onRuntimeMessageBackgroundListener(
  message: any,
  sender: Runtime.MessageSender
): Promise<any> {
  try {
    switch (message.type) {
      case 'getActiveTab':
        const activeTab = await getActiveTab();
        return { success: true, activeTab };

      case 'popout':
        showPopup('');
        return { success: true };

      default:
        return undefined;
    }
  } catch (error: any) {
    log.error('Error handling runtime message:', false, error);
    return {
      success: false,
      error: error?.message || 'Unknown error occurred.'
    };
  }
}

// Get active tab information
async function getActiveTab(): Promise<ActiveTab | null> {
  try {
    const tabs = await browser.tabs.query({ active: true });

    if (tabs.length > 0) {
      const realTab = tabs.find(t => !t.url?.startsWith('chrome-extension://'));
      if (realTab) {
        const win = await browser.windows.get(realTab.windowId);
        return {
          tabId: realTab.id,
          windowId: realTab.windowId,
          windowType: win.type,
          url: realTab.url,
          title: realTab.title,
          favIconUrl: realTab.favIconUrl,
          dateTime: new Date().toISOString()
        };
      }
    }

    return null;
  } catch (error) {
    log.error('Error getting active tab:', false, error);
    return null;
  }
}

// Export the connection manager for testing and debugging
(globalThis as any).connectionManager = connectionManager;

// Initialize immediately on load
initializeBackground();
