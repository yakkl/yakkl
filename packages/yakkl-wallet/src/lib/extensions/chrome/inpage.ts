// inpage.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-debugger */
// Inject this into any given webpage or iFrame so that it may communicate with the extension.
// You can not use browser extention only classes and methods here. You must pass events
//   back and forth to the background.js service.

import { log } from "$lib/plugins/Logger";
import { type EIP6963ProviderDetail, type EIP6963Provider, type EIP6963ProviderInfo, EIP1193_ERRORS } from '$lib/plugins/providers/network/ethereum_provider/eip-types';
import type { RequestArguments } from '$lib/common';
import { EventEmitter } from 'events';
import { getWindowOrigin, isValidOrigin, getTargetOrigin, safePostMessage } from '$lib/common/origin';
import { generateEipId, ensureEipId } from '$lib/common/id-generator';

class ProviderRpcError extends Error {
  code: number;
  data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.code = code;
    this.data = data;
    this.name = 'ProviderRpcError';
  }
}

// Base64 encoded icon
const YAKKL_ICON = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIGlkPSJhIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgNzU4LjczIDczOC45MiI+PGRlZnM+PHJhZGlhbEdyYWRpZW50IGlkPSJiIiBjeD0iMzk5LjMiIGN5PSIzNTkuNDIiIGZ4PSIzOTkuMyIgZnk9IjM1OS40MiIgcj0iMzUxLjY2IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHN0b3Agb2Zmc2V0PSIuMDMiIHN0b3AtY29sb3I9IiNhZTVlYTQiLz48c3RvcCBvZmZzZXQ9Ii4zNCIgc3RvcC1jb2xvcj0iIzhmNGI5YiIvPjxzdG9wIG9mZnNldD0iLjg5IiBzdG9wLWNvbG9yPSIjNWMyZDhjIi8+PHN0b3Agb2Zmc2V0PSIuOTUiIHN0b3AtY29sb3I9IiM1YTJjOGEiLz48c3RvcCBvZmZzZXQ9Ii45OCIgc3RvcC1jb2xvcj0iIzU1MmI4MyIvPjxzdG9wIG9mZnNldD0iLjk5IiBzdG9wLWNvbG9yPSIjNGQyODc3Ii8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjNDgyNzcwIi8+PC9yYWRpYWxHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImMiIHgxPSIyMTkuNjMiIHkxPSI0OC4yMSIgeDI9IjU3OC45OCIgeTI9IjY3MC42MyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2RlOWQyNiIvPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4YzkyNyIvPjxzdG9wIG9mZnNldD0iLjMyIiBzdG9wLWNvbG9yPSIjZTJhZTI0Ii8+PHN0b3Agb2Zmc2V0PSIuNjgiIHN0b3AtY29sb3I9IiNmY2YyOTAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNmZmQ0M2YiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iZCIgeDE9IjI3MS40MSIgeTE9IjQxMy40OSIgeDI9IjM0MC45MyIgeTI9IjQxMy40OSIgeGxpbms6aHJlZj0iI2MiLz48bGluZWFyR3JhZGllbnQgaWQ9ImUiIHgxPSI0NTcuNjciIHkxPSI0MTMuNDkiIHgyPSI1MjcuMiIgeTI9IjQxMy40OSIgeGxpbms6aHJlZj0iI2MiLz48bGluZWFyR3JhZGllbnQgaWQ9ImYiIHgxPSIxMjAuNjIiIHkxPSI0MTkuMjgiIHgyPSI2NzcuOTkiIHkyPSI0MTkuMjgiIHhsaW5rOmhyZWY9IiNjIi8+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMzU4LjU5IiB5MT0iMjkzLjk3IiB4Mj0iNDQwLjAyIiB5Mj0iMjkzLjk3IiB4bGluazpocmVmPSIjYyIvPjwvZGVmcz48Y2lyY2xlIGN4PSIzOTkuMyIgY3k9IjM1OS40MiIgcj0iMzUxLjY2IiBzdHlsZT0iZmlsbDp1cmwoI2IpOyBzdHJva2Utd2lkdGg6MHB4OyIvPjxwYXRoIGQ9Im0zOTkuMyw3MTguODRjLTE5OC4xOSwwLTM1OS40Mi0xNjEuMjQtMzU5LjQyLTM1OS40MlMyMDEuMTIsMCwzOTkuMywwczM1OS40MiwxNjEuMjQsMzU5LjQyLDM1OS40Mi0xNjEuMjQsMzU5LjQyLTM1OS40MiwzNTkuNDJabTAtNzAzLjMzQzIwOS42NywxNS41Miw1NS40LDE2OS43OSw1NS40LDM1OS40MnMxNTQuMjcsMzQzLjksMzQzLjksMzQzLjksMzQzLjktMTU0LjI3LDM0My45LTM0My45UzU4OC45MywxNS41MiwzOTkuMywxNS41MloiIHN0eWxlPSJmaWxsOnVybCgjYyk7IHN0cm9rZS13aWR0aDowcHg7Ii8+PHBhdGggZD0ibTMwNS4xNywzNjkuODhzLTE5LjM0LTE4LjI5LTMzLjc2LTIxLjF2NTQuODZsNjcuNTMsNzQuNTZzNi4zMy0yMy4yMS0zLjUyLTUzLjQ2YzAsMC0zNC4xMS0xNC40Mi0zMC4yNS01NC44NloiIHN0eWxlPSJmaWxsOnVybCgjZCk7IHN0cm9rZS13aWR0aDowcHg7Ii8+PHBhdGggZD0ibTQ2My4xOSw0MjQuNzRjLTkuODUsMzAuMjUtMy41Miw1My40Ni0zLjUyLDUzLjQ2bDY3LjUzLTc0LjU2di01NC44NmMtMTQuNDIsMi44MS0zMy43NiwyMS4xLTMzLjc2LDIxLjEsMy44Nyw0MC40NC0zMC4yNSw1NC44Ni0zMC4yNSw1NC44NloiIHN0eWxlPSJmaWxsOnVybCgjZSk7IHN0cm9rZS13aWR0aDowcHg7Ii8+PHBhdGggZD0ibTQ2MC40LDI2Mi45M2wtNDkuMzYsODUuNDljLTUuMDgsOC43OS0xOC40MSw4Ljc5LTIzLjQ4LDBsLTQ5LjM2LTg1LjQ5Yy04NS4wOCw0Ny4yNS0yMTcuNTgtMzUuOTgtMjE3LjU4LTM1Ljk4LDM3LjI2LDQ4LjUxLDc5LjcxLDY5LjczLDExNS4zLDc4LjM3LDU2LjczLDEzLjc3LDEwNS43LDQ3LjYxLDEzNS4xNiw5NS41M2wuNjYsMS4wN2MtMS45OCw3Ljk3LTIuOTgsMTYuMTMtMi45OCwyNC4zMnYxMDguODVjMCwyLjQzLS4yNiw0LjgzLS42OSw3LjItMTEuMDQsNy4xNy0xOC4wOSwxOC4wNS0xOC4wOSwzMC4yMywwLDIxLjU4LDIyLjA5LDM5LjA4LDQ5LjMzLDM5LjA4czQ5LjMzLTE3LjUsNDkuMzMtMzkuMDhjMC0xMi4xOS03LjA1LTIzLjA3LTE4LjA5LTMwLjIzLS40My0yLjM3LS42OS00Ljc3LS42OS03LjJ2LTEwOC44NWMwLTguMTktMS0xNi4zNS0yLjk4LTI0LjMybC42Ni0xLjA3YzI5LjQ2LTQ3LjkyLDc4LjQzLTgxLjc3LDEzNS4xNi05NS41MywzNS41OS04LjY0LDc4LjA0LTI5Ljg2LDExNS4zLTc4LjM3LDAsMC0xNjEuMDgsODUuOTYtMjE3LjU4LDM1Ljk4Wm0tNjEuMSwzNDIuNDljLTIyLjksMC00MS41Mi0xNC43Ni00MS41Mi0zMi45LDAtMi41Ni40MS01LjAzLDEuMTEtNy40Mmg4MC44NGMuNywyLjM5LDEuMTEsNC44NywxLjExLDcuNDIsMCwxOC4xNC0xOC42MywzMi45LTQxLjUyLDMyLjlaIiBzdHlsZT0iZmlsbDp1cmwoI2YpOyBzdHJva2Utd2lkdGg6MHB4OyIvPjxwYXRoIGQ9Im00MDcuMTMsMzIxLjA3bDMyLjg5LTYwLjE3cy00Mi41MywxNi45Mi04MS40MywwbDMyLjg5LDYwLjE3czguMzEsMTMuNDMsMTUuNjUsMFoiIHN0eWxlPSJmaWxsOnVybCgjZyk7IHN0cm9rZS13aWR0aDowcHg7Ii8+PHRleHQvPjwvc3ZnPg=="

// Chrome types
declare namespace chrome {
  export namespace runtime {
    interface Port {
      name: string;
      onMessage: {
        addListener: (callback: (message: any) => void) => void;
      };
      onDisconnect: {
        addListener: (callback: () => void) => void;
      };
      postMessage: (message: any) => void;
    }
    function connect(connectInfo?: { name: string }): Port;
  }
}

// Declare window interface
declare global {
  var yakkl: EIP6963ProviderDetail;
  interface Window {
    ethereum: EIP6963Provider;
  }
}

// log.debug('Initializing inpage script', true);

// Initialize provider state
// const windowOrigin = getWindowOrigin();
// log.debug('Window origin:', true, windowOrigin);

// Initialize provider info
const providerInfo: EIP6963ProviderInfo = {
  uuid: crypto.randomUUID(),
  name: 'YAKKL',
  icon: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIGlkPSJhIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgNzU4LjczIDczOC45MiI+PGRlZnM+PHJhZGlhbEdyYWRpZW50IGlkPSJiIiBjeD0iMzk5LjMiIGN5PSIzNTkuNDIiIGZ4PSIzOTkuMyIgZnk9IjM1OS40MiIgcj0iMzUxLjY2IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHN0b3Agb2Zmc2V0PSIuMDMiIHN0b3AtY29sb3I9IiNhZTVlYTQiLz48c3RvcCBvZmZzZXQ9Ii4zNCIgc3RvcC1jb2xvcj0iIzhmNGI5YiIvPjxzdG9wIG9mZnNldD0iLjg5IiBzdG9wLWNvbG9yPSIjNWMyZDhjIi8+PHN0b3Agb2Zmc2V0PSIuOTUiIHN0b3AtY29sb3I9IiM1YTJjOGEiLz48c3RvcCBvZmZzZXQ9Ii45OCIgc3RvcC1jb2xvcj0iIzU1MmI4MyIvPjxzdG9wIG9mZnNldD0iLjk5IiBzdG9wLWNvbG9yPSIjNGQyODc3Ii8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjNDgyNzcwIi8+PC9yYWRpYWxHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImMiIHgxPSIyMTkuNjMiIHkxPSI0OC4yMSIgeDI9IjU3OC45OCIgeTI9IjY3MC42MyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2RlOWQyNiIvPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4YzkyNyIvPjxzdG9wIG9mZnNldD0iLjMyIiBzdG9wLWNvbG9yPSIjZTJhZTI0Ii8+PHN0b3Agb2Zmc2V0PSIuNjgiIHN0b3AtY29sb3I9IiNmY2YyOTAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNmZmQ0M2YiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iZCIgeDE9IjI3MS40MSIgeTE9IjQxMy40OSIgeDI9IjM0MC45MyIgeTI9IjQxMy40OSIgeGxpbms6aHJlZj0iI2MiLz48bGluZWFyR3JhZGllbnQgaWQ9ImUiIHgxPSI0NTcuNjciIHkxPSI0MTMuNDkiIHgyPSI1MjcuMiIgeTI9IjQxMy40OSIgeGxpbms6aHJlZj0iI2MiLz48bGluZWFyR3JhZGllbnQgaWQ9ImYiIHgxPSIxMjAuNjIiIHkxPSI0MTkuMjgiIHgyPSI2NzcuOTkiIHkyPSI0MTkuMjgiIHhsaW5rOmhyZWY9IiNjIi8+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMzU4LjU5IiB5MT0iMjkzLjk3IiB4Mj0iNDQwLjAyIiB5Mj0iMjkzLjk3IiB4bGluazpocmVmPSIjYyIvPjwvZGVmcz48Y2lyY2xlIGN4PSIzOTkuMyIgY3k9IjM1OS40MiIgcj0iMzUxLjY2IiBzdHlsZT0iZmlsbDp1cmwoI2IpOyBzdHJva2Utd2lkdGg6MHB4OyIvPjxwYXRoIGQ9Im0zOTkuMyw3MTguODRjLTE5OC4xOSwwLTM1OS40Mi0xNjEuMjQtMzU5LjQyLTM1OS40MlMyMDEuMTIsMCwzOTkuMywwczM1OS40MiwxNjEuMjQsMzU5LjQyLDM1OS40Mi0xNjEuMjQsMzU5LjQyLTM1OS40MiwzNTkuNDJabTAtNzAzLjMzQzIwOS42NywxNS41Miw1NS40LDE2OS43OSw1NS40LDM1OS40MnMxNTQuMjcsMzQzLjksMzQzLjksMzQzLjksMzQzLjktMTU0LjI3LDM0My45LTM0My45UzU4OC45MywxNS41MiwzOTkuMywxNS41MloiIHN0eWxlPSJmaWxsOnVybCgjYyk7IHN0cm9rZS13aWR0aDowcHg7Ii8+PHBhdGggZD0ibTMwNS4xNywzNjkuODhzLTE5LjM0LTE4LjI5LTMzLjc2LTIxLjF2NTQuODZsNjcuNTMsNzQuNTZzNi4zMy0yMy4yMS0zLjUyLTUzLjQ2YzAsMC0zNC4xMS0xNC40Mi0zMC4yNS01NC44NloiIHN0eWxlPSJmaWxsOnVybCgjZCk7IHN0cm9rZS13aWR0aDowcHg7Ii8+PHBhdGggZD0ibTQ2My4xOSw0MjQuNzRjLTkuODUsMzAuMjUtMy41Miw1My40Ni0zLjUyLDUzLjQ2bDY3LjUzLTc0LjU2di01NC44NmMtMTQuNDIsMi44MS0zMy43NiwyMS4xLTMzLjc2LDIxLjEsMy44Nyw0MC40NC0zMC4yNSw1NC44Ni0zMC4yNSw1NC44NloiIHN0eWxlPSJmaWxsOnVybCgjZSk7IHN0cm9rZS13aWR0aDowcHg7Ii8+PHBhdGggZD0ibTQ2MC40LDI2Mi45M2wtNDkuMzYsODUuNDljLTUuMDgsOC43OS0xOC40MSw4Ljc5LTIzLjQ4LDBsLTQ5LjM2LTg1LjQ5Yy04NS4wOCw0Ny4yNS0yMTcuNTgtMzUuOTgtMjE3LjU4LTM1Ljk4LDM3LjI2LDQ4LjUxLDc5LjcxLDY5LjczLDExNS4zLDc4LjM3LDU2LjczLDEzLjc3LDEwNS43LDQ3LjYxLDEzNS4xNiw5NS41M2wuNjYsMS4wN2MtMS45OCw3Ljk3LTIuOTgsMTYuMTMtMi45OCwyNC4zMnYxMDguODVjMCwyLjQzLS4yNiw0LjgzLS42OSw3LjItMTEuMDQsNy4xNy0xOC4wOSwxOC4wNS0xOC4wOSwzMC4yMywwLDIxLjU4LDIyLjA5LDM5LjA4LDQ5LjMzLDM5LjA4czQ5LjMzLTE3LjUsNDkuMzMtMzkuMDhjMC0xMi4xOS03LjA1LTIzLjA3LTE4LjA5LTMwLjIzLS40My0yLjM3LS42OS00Ljc3LS42OS03LjJ2LTEwOC44NWMwLTguMTktMS0xNi4zNS0yLjk4LTI0LjMybC42Ni0xLjA3YzI5LjQ2LTQ3LjkyLDc4LjQzLTgxLjc3LDEzNS4xNi05NS41MywzNS41OS04LjY0LDc4LjA0LTI5Ljg2LDExNS4zLTc4LjM3LDAsMC0xNjEuMDgsODUuOTYtMjE3LjU4LDM1Ljk4Wm0tNjEuMSwzNDIuNDljLTIyLjksMC00MS41Mi0xNC43Ni00MS41Mi0zMi45LDAtMi41Ni40MS01LjAzLDEuMTEtNy40Mmg4MC44NGMuNywyLjM5LDEuMTEsNC44NywxLjExLDcuNDIsMCwxOC4xNC0xOC42MywzMi45LTQxLjUyLDMyLjlaIiBzdHlsZT0iZmlsbDp1cmwoI2YpOyBzdHJva2Utd2lkdGg6MHB4OyIvPjxwYXRoIGQ9Im00MDcuMTMsMzIxLjA3bDMyLjg5LTYwLjE3cy00Mi41MywxNi45Mi04MS40MywwbDMyLjg5LDYwLjE3czguMzEsMTMuNDMsMTUuNjUsMFoiIHN0eWxlPSJmaWxsOnVybCgjZyk7IHN0cm9rZS13aWR0aDowcHg7Ii8+PHRleHQvPjwvc3ZnPg==",
  rdns: 'com.yakkl',
  walletId: 'yakkl'
};

class EIP1193Provider extends EventEmitter implements EIP6963Provider {
  private _isConnected: boolean = false;
  private pendingRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    method: string;
    timestamp: number;
  }> = new Map();
  private connectionAttempts: number = 0;
  private readonly MAX_CONNECTION_ATTEMPTS: number = 3;
  private isConnecting: boolean = false;
  private chainId: string | null = '0x1'; // Default to mainnet
  private networkVersion: string | null = '1'; // Default to mainnet
  private cachedAccounts: string[] | null = null;
  public initializationPromise: Promise<void>;

  constructor() {
    super();
    // Set up message listener first
    this.setupMessageListener();
    // Then initialize
    this.initializationPromise = this.initialize();
  }

  private setupMessageListener() {
    // Receives messages from content
    window.addEventListener('message', (event) => {
      // Only accept messages from valid origins
      if (!isValidOrigin(event.origin)) {
        log.debug('Message from invalid origin:', true, {
          origin: event.origin,
          expectedOrigin: getWindowOrigin(),
          timestamp: new Date().toISOString()
        });
        return;
      }

      const message = event.data;
      if (!message || typeof message !== 'object') {
        log.debug('Invalid message format:', true, {
          message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      log.debug('Received message in inpage:====================================[][][]', true, {
        message,
        origin: event.origin,
        timestamp: new Date().toISOString(),
        pendingRequests: Array.from(this.pendingRequests.keys())
      });

      // Handle responses from content script
      if (message.type === 'YAKKL_RESPONSE:EIP6963') {
        log.info('handleResponse: INPAGE -------------------- YAKKL_RESPONSE:EIP6963', false, {
          message: message,
          pendingRequests: Array.from(this.pendingRequests.keys())
        });

        this.handleResponse(message);
      }

      // Handle events from content script
      if (message.type === 'YAKKL_EVENT:EIP6963') {
        log.info('handleEvent: INPAGE -------------------- YAKKL_EVENT:EIP6963', false, {
          message: message,
        });

        this.handleEvent(message);
      }
    });
  }

  private async initialize() {
    try {
      // Initialize connection first
      await this.connect();

      // Set default values without making any requests
      this.chainId = '0x1';
      this.networkVersion = '1';
      this.cachedAccounts = [];

      log.debug('Inpage: Setting default values:', false, {
        chainId: this.chainId,
        networkVersion: this.networkVersion,
        accounts: this.cachedAccounts,
        timestamp: new Date().toISOString()
      });

      // Then announce provider
      announceProvider();
    } catch (error) {
      log.error('Failed to initialize provider:', false, error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this._isConnected;
  }

  private async connect(): Promise<void> {
    if (this._isConnected) {
      return;
    }

    if (this.isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (this._isConnected) return;
    }

    try {
      this.isConnecting = true;
      log.debug('Connecting to EIP-6963...', false);

      if (this.connectionAttempts >= this.MAX_CONNECTION_ATTEMPTS) {
        log.error('Max connection attempts reached', false);
        throw new ProviderRpcError(4100, 'Failed to connect after maximum attempts');
      }

      this.connectionAttempts++;

      // Initialize basic state
      this._isConnected = true;
      this.connectionAttempts = 0;

      // Emit connect event with chainId
      this.emit('connect', { chainId: this.chainId || '0x1' });

      log.debug('Successfully connected to EIP-6963', false);
    } catch (error) {
      this.isConnecting = false;
      this._isConnected = false;
      log.error('Failed to connect to EIP-6963', false, error);
      throw error;
    }
  }

  private handleResponse(response: any) {
    try {
      log.debug('Inpage: Handling response:', false, {
        response,
        pendingRequests: Array.from(this.pendingRequests.keys()),
        timestamp: new Date().toISOString(),
        providerState: {
          isConnected: this._isConnected,
          chainId: this.chainId,
          networkVersion: this.networkVersion,
          cachedAccounts: this.cachedAccounts
        }
      });

      const { id, method, result, error } = response;

      // Find the pending request
      const pendingRequest = this.pendingRequests.get(id);
      if (!pendingRequest) {
        log.warn('Inpage: No pending request found for response:', false, {
          id,
          method,
          response,
          timestamp: new Date().toISOString(),
          pendingRequests: Array.from(this.pendingRequests.entries()).map(([id, req]) => ({
            id,
            method: req.method,
            timestamp: req.timestamp
          }))
        });
        return;
      }

      // Remove the request from pending
      this.pendingRequests.delete(id);

      // Handle the response
      if (error) {
        log.error('Inpage: Response error:', false, {
          error,
          method,
          id,
          timestamp: new Date().toISOString()
        });
        pendingRequest.reject(new ProviderRpcError(error.code, error.message, error.data));
      } else {
        // Update provider state if needed
        const requestMethod = pendingRequest.method;

        // Cache the results for cacheable methods
        if (this.isMethodCached(requestMethod)) {
          if (requestMethod === 'eth_chainId' && result) {
            this.chainId = result;
            this.emit('chainChanged', result);
            log.debug('Inpage: Cached chainId:', false, {
              chainId: result,
              timestamp: new Date().toISOString()
            });
          } else if ((requestMethod === 'eth_accounts' || requestMethod === 'eth_requestAccounts') && Array.isArray(result)) {
            // Only update accounts if we got a valid array and it's different from current
            log.info('eth_requestAccounts - 261 (inpage):', false, result);

            const validAccounts = result.filter(addr => addr && addr !== '0x0000000000000000000000000000000000000000');
            if (!this.cachedAccounts || JSON.stringify(validAccounts) !== JSON.stringify(this.cachedAccounts)) {
              this.cachedAccounts = validAccounts;
              this.emit('accountsChanged', validAccounts);
              log.debug('Inpage: Cached accounts:', false, {
                accounts: validAccounts,
                timestamp: new Date().toISOString()
              });
            }
            this._isConnected = validAccounts.length > 0;
          } else if (requestMethod === 'net_version' && result) {
            this.networkVersion = result;
            log.debug('Inpage: Cached networkVersion:', false, {
              networkVersion: result,
              timestamp: new Date().toISOString()
            });
          }
        } else if (requestMethod === 'wallet_switchEthereumChain') {
          // After switching chains, update chainId
          this.request({ method: 'eth_chainId', params: [] })
            .then((chainId) => {
              if (typeof chainId === 'string' && chainId !== this.chainId) {
                this.chainId = chainId;
                this.emit('chainChanged', chainId);
              }
            })
            .catch(err => log.error('Error updating chainId after switch:', false, err));
        }

        // Resolve with the result
        pendingRequest.resolve(result);
        log.debug('Inpage: Request resolved:', false, {
          method: requestMethod,
          id,
          result,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      log.error('Error handling response:', false, {
        error,
        response,
        timestamp: new Date().toISOString()
      });
    }
  }

  private handleEvent(event: any) {
    const { event: eventName, data } = event;
    log.debug('Inpage: Handling event:', false, { eventName, data });

    // Update state based on event
    switch (eventName) {
      case 'accountsChanged':
        // Clear cached accounts when they change
        this.cachedAccounts = null;
        this.emit('accountsChanged', data);
        break;
      case 'chainChanged':
        // Clear cached chainId when it changes
        this.chainId = null;
        this.emit('chainChanged', data);
        // Also emit networkChanged for backwards compatibility
        if (data) {
          const networkVersion = parseInt(data, 16).toString();
          this.networkVersion = networkVersion;
          this.emit('networkChanged', networkVersion);
        }
        break;
      case 'connect':
        // Clear all caches on connect
        this.chainId = null;
        this.networkVersion = null;
        this.cachedAccounts = null;
        this._isConnected = true;
        this.emit('connect', { chainId: this.chainId || '0x1' });
        break;
      case 'disconnect':
        // Clear all caches on disconnect
        this.chainId = null;
        this.networkVersion = null;
        this.cachedAccounts = null;
        this._isConnected = false;
        this.emit('disconnect', { code: 1000, reason: 'Disconnected' });
        break;
      case 'message':
        this.emit('message', data);
        break;
    }
  }

  async request(args: RequestArguments): Promise<unknown> {
    // Ensure provider is initialized
    if (!this._isConnected) {
      await this.initializationPromise;
    }

    const { method, params = [] } = args;
    const id = generateEipId();

    log.debug('EIP1193: Sending request:', false, {
      method,
      params,
      id,
      cachedValue: this.getCachedResult(method)
    });

    // Handle special methods with cached values only if they are valid
    if (method === 'eth_chainId' && this.chainId && this.chainId !== '0x1') {
      log.debug('EIP1193: Using cached chainId:', false, {
        chainId: this.chainId
      });
      return this.chainId;
    }

    if (method === 'net_version' && this.networkVersion && this.networkVersion !== '1') {
      log.debug('EIP1193: Using cached networkVersion:', false, {
        networkVersion: this.networkVersion
      });
      return this.networkVersion;
    }

    if (method === 'eth_accounts' && this.cachedAccounts && this.cachedAccounts.length > 0) {
      log.debug('EIP1193: Using cached accounts:', false, {
        accounts: this.cachedAccounts
      });
      return this.cachedAccounts;
    }

    return new Promise((resolve, reject) => {
      // Store the request with its resolve/reject callbacks
      this.pendingRequests.set(id, {
        resolve,
        reject,
        method,
        timestamp: Date.now()
      });

      log.debug('Inpage: Request stored in pending:', false, {
        method,
        id,
        timestamp: new Date().toISOString(),
        pendingRequests: Array.from(this.pendingRequests.entries()).map(([id, req]) => ({
          id,
          method: req.method,
          timestamp: req.timestamp
        }))
      });

      // Send the request
      const requestMessage = {
        type: 'YAKKL_REQUEST:EIP6963',
        id,
        method,
        params,
        requiresApproval: this.requiresApproval(method)
      };

      log.debug('Inpage: Sending request message:', false, {
        message: requestMessage,
        targetOrigin: getTargetOrigin(),
        timestamp: new Date().toISOString()
      });

      log.info('eth_requestAccounts - 262 (inpage)?????????????:', false, requestMessage);

      safePostMessage(requestMessage, getTargetOrigin(), {
        context: 'inpage',
        allowRetries: true,
        retryKey: `${method}-${id}`
      });

      // Set a timeout for the request
      setTimeout(() => {
        const request = this.pendingRequests.get(id);
        if (request) {
          log.warn('Inpage: Request timed out:', false, {
            method,
            id,
            timestamp: new Date().toISOString()
          });
          request.reject(new ProviderRpcError(
            EIP1193_ERRORS.TIMEOUT.code,
            EIP1193_ERRORS.TIMEOUT.message
          ));
          this.pendingRequests.delete(id);
        }
      }, 90000); // 90 second timeout
    });
  }

  private requiresApproval(method: string): boolean {
    const approvalMethods = [
      'eth_requestAccounts',
      'eth_sendTransaction',
      'eth_signTransaction',
      'eth_sign',
      'personal_sign',
      'eth_signTypedData',
      'eth_signTypedData_v1',
      'eth_signTypedData_v3',
      'eth_signTypedData_v4',
      'wallet_addEthereumChain',
      'wallet_switchEthereumChain',
      'wallet_watchAsset'
    ];
    return approvalMethods.includes(method);
  }

  private isMethodCached(method: string): boolean {
    const cachedMethods = ['eth_chainId', 'eth_accounts', 'net_version'];
    return cachedMethods.includes(method);
  }

  private getCachedResult(method: string): any {
    switch (method) {
      case 'eth_chainId':
        return this.chainId;
      case 'eth_accounts':
        return this.cachedAccounts;
      case 'net_version':
        return this.networkVersion;
      default:
        return undefined;
    }
  }

  announce(): void {
    announceProvider();
  }
}

// Initialize provider state
const provider = new EIP1193Provider();

// Create the provider detail object
const providerDetail: EIP6963ProviderDetail = {
  provider,
  info: providerInfo
};

// Expose the provider
window.ethereum = provider;
window.yakkl = providerDetail;

let hasAnnounced = false;

// Function to announce provider
function announceProvider() {
  if (hasAnnounced) {
    // log.debug('Provider already announced, skipping', false);
    return;
  }

  try {
    // log.debug('Announcing EIP-6963 provider', false);

    // Dispatch the announcement event
    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', {
        detail: providerDetail
      })
    );

    // Also listen for request events
    window.addEventListener('eip6963:requestProvider', () => {
      // log.debug('Received EIP-6963 provider request', false);
      window.dispatchEvent(
        new CustomEvent('eip6963:announceProvider', {
          detail: providerDetail
        })
      );
    });

    hasAnnounced = true;
    // log.debug('Provider announced with details:', false, providerInfo);
  } catch (e) {
    // log.error('Error announcing EIP-6963 provider', false, e);
    hasAnnounced = false;
  }
}

// Wait for provider initialization before announcing
provider.initializationPromise.then(() => {
  // Announce provider if document is already loaded
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    announceProvider();
  } else {
    // Otherwise wait for the document to load
    document.addEventListener('DOMContentLoaded', () => {
      announceProvider();
    });
  }
}).catch(error => {
  log.error('Inpage: Failed to initialize provider:', false, error);
});

// Also announce when specifically requested
window.addEventListener('eip6963:requestProvider', () => {
  announceProvider();
});

// Re-export for use in other modules
export { provider };

// Debug log for window.yakkl assignment
// log.debug('window.yakkl assigned', false, {
//   provider: providerInfo,
//   readyState: document.readyState
// });

// function post(message: any, targetOrigin: string | null) {
//   safePostMessage(message, targetOrigin, { context: 'inpage' });
// }

