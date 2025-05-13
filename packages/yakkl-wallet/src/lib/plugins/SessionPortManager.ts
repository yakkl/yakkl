// SessionPortManager.ts
import type { Runtime } from "webextension-polyfill";
import { log } from "$lib/plugins/Logger";
import type { SessionInfo } from "$lib/common/interfaces";
import { getWindowOrigin } from "$lib/common/origin";

export interface SessionPortData {
  port: Runtime.Port;
  connectionId: string;
  requestIds: Set<string>;
  portName: string;
  createdAt: number;
  metadata?: {
    tabId?: number;
    url?: string;
    origin?: string;
  };
}

export class SessionPortManager {
  private sessionPorts = new Map<string, SessionPortData>();
  private requestToConnectionMap = new Map<string, string>();

  /**
   * Register a new session port with proper connection tracking
   * This separates the request ID from the connection ID properly
   */
  registerSessionPort(
    message: any,
    port: Runtime.Port,
    existingConnectionId?: string
  ): string {
    // Use existing connection ID if provided, otherwise generate new one
    const connectionId = existingConnectionId ||
      `connection-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Check if this connection already exists
    const existingSession = this.sessionPorts.get(connectionId);

    if (existingSession) {
      // Add the new request to the existing session
      existingSession.requestIds.add(message.requestId);
      this.requestToConnectionMap.set(message.requestId, connectionId);

      log.info('Added request to existing session', false, {
        connectionId: connectionId,
        requestId: message.requestId,
        totalRequests: existingSession.requestIds.size
      });
    } else {
      // Create new session
      const sessionData: SessionPortData = {
        port: port,
        connectionId: connectionId,
        requestIds: new Set([message.requestId]),
        portName: port.name,
        createdAt: Date.now(),
        metadata: {
          tabId: port.sender?.tab?.id,
          url: port.sender?.url,
          origin: getWindowOrigin()
        }
      };

      this.sessionPorts.set(connectionId, sessionData);
      this.requestToConnectionMap.set(message.requestId, connectionId);

      log.info('New session port registered', false, {
        connectionId: connectionId,
        requestId: message.requestId,
        portName: port.name
      });
    }

    return connectionId;
  }

  /**
   * Get a port by its request ID
   * This maintains the proper separation between request IDs and connection IDs
   */
  getPortByRequestId(requestId: string): Runtime.Port | null {
    const connectionId = this.requestToConnectionMap.get(requestId);
    if (!connectionId) {
      log.debug('No connection found for request ID', false, { requestId });
      return null;
    }

    const sessionData = this.sessionPorts.get(connectionId);
    return sessionData?.port || null;
  }

  /**
   * Get session info for a request ID
   * Used when popups request session information
   */
  getSessionInfo(requestId: string): SessionInfo | null {
    const connectionId = this.requestToConnectionMap.get(requestId);
    if (!connectionId) return null;

    const sessionData = this.sessionPorts.get(connectionId);
    if (!sessionData) return null;

    return {
      connectionId: connectionId,
      portName: sessionData.portName,
      requestId: requestId
    };
  }

  /**
   * Remove a session by connection ID
   * Cleans up all associated request mappings
   */
  removeSession(connectionId: string): void {
    const sessionData = this.sessionPorts.get(connectionId);
    if (!sessionData) return;

    // Clean up all request mappings
    sessionData.requestIds.forEach(requestId => {
      this.requestToConnectionMap.delete(requestId);
    });

    this.sessionPorts.delete(connectionId);

    log.info('Session removed', false, {
      connectionId: connectionId,
      requestCount: sessionData.requestIds.size
    });
  }

  /**
   * Remove a specific request from a session
   */
  removeRequest(requestId: string): void {
    const connectionId = this.requestToConnectionMap.get(requestId);
    if (!connectionId) return;

    const sessionData = this.sessionPorts.get(connectionId);
    if (sessionData) {
      sessionData.requestIds.delete(requestId);

      // If no more requests, consider removing the session
      if (sessionData.requestIds.size === 0) {
        this.removeSession(connectionId);
      }
    }

    this.requestToConnectionMap.delete(requestId);
  }
}

// Export a singleton instance
export const sessionPortManager = new SessionPortManager();
