// EthereumProviderTypes.d.ts

import type { EventEmitter } from "stream";

// Interface for provider information following EIP-6963.
export interface EIP6963ProviderInfo {
  walletId: string; // Unique identifier for the wallet
  uuid: string; // Globally unique ID to differentiate between provider sessions for the lifetime of the page
  name: string; // Human-readable name of the wallet
  icon: string; // URL to the wallet's icon
  rdns: string; // Reverse domain name system (DNS) for the wallet
}

// Interface for Ethereum providers based on the EIP-1193 standard.
export interface EIP1193Provider extends EventEmitter{
  isStatus?: boolean; // Optional: Indicates the status of the provider
  host?: string; // Optional: Host URL of the Ethereum node
  path?: string; // Optional: Path to a specific endpoint or service on the host
  sendAsync?: (request: { method: string, params?: Array<unknown> }, callback: (error: Error | null, response: unknown) => void) => void; // For sending asynchronous requests
  send?: (request: { method: string, params?: Array<unknown> }, callback: (error: Error | null, response: unknown) => void) => void; // For sending synchronous requests
  announce: () => void; // Required due possible undefined if declared optional: Method for announcing the provider - can be used another way if desired
  request: (request: { method: string, params?: Array<unknown> }) => Promise<unknown>; // Standard method for sending requests per EIP-1193
}

// Interface detailing the structure of provider information and its Ethereum provider.
export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo; // The provider's info
  provider: EIP1193Provider; // The EIP-1193 compatible provider
}

// Type representing the event structure for announcing a provider based on EIP-6963.
// export type EIP6963AnnounceProviderEvent = {
//   detail: {
//     info: EIP6963ProviderInfo; // The provider's info
//     provider: EIP1193Provider; // The EIP-1193 compatible provider
//   }
// }

// Announce Event dispatched by a Wallet
export interface EIP6963AnnounceProviderEvent extends CustomEvent {
  type: "eip6963:announceProvider";
  detail: EIP6963ProviderDetail;
}

// Request Event dispatched by a DApp
export interface EIP6963RequestProviderEvent extends Event {
  type: "eip6963:requestProvider";
}


export type BaseProviderState = {
  accounts: null | string[];
  isConnected: boolean;
  isUnlocked: boolean;
  initialized: boolean;
  isPermanentlyDisconnected: boolean;
};

export interface PortMessage {
  type: string;
  [key: string]: any;
}

export interface EIP6963Request extends PortMessage {
  type: 'YAKKL_REQUEST:EIP6963';
  id: string;
  method: string;
  params: any[];
}

export interface EIP6963Response extends PortMessage {
  type: 'YAKKL_RESPONSE:EIP6963';
  id: string;
  method: string;
  result?: any;
  error?: string;
}

export interface EIP6963Event extends PortMessage {
  type: 'YAKKL_EVENT:EIP6963';
  event: string;
  data: any;
}

export const EIP1193_ERRORS = {
  USER_REJECTED: { code: 4001, message: 'User rejected the request.' },
  UNAUTHORIZED: { code: 4100, message: 'The requested method and/or account has not been authorized by the user.' },
  UNSUPPORTED_METHOD: { code: 4200, message: 'The Provider does not support the requested method.' },
  DISCONNECTED: { code: 4900, message: 'The Provider is disconnected from all chains.' },
  CHAIN_DISCONNECTED: { code: 4901, message: 'The Provider is not connected to the requested chain.' },
  TIMEOUT: { code: 4999, message: 'Request timed out.' },
  INTERNAL: { code: -32603, message: 'Internal error' }
};

