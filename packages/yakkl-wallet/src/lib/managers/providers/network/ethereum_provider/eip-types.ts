// EIP Types
import type { EventEmitter } from 'events';
import type { RequestArguments } from '$lib/common';

// EIP-1193 Types
export interface EIP1193Provider extends EventEmitter {
  request(args: RequestArguments): Promise<unknown>;
  isConnected(): boolean;
}

export const EIP1193_ERRORS = {
  USER_REJECTED: {
    code: 4001,
    message: 'The user rejected the request.'
  },
  UNAUTHORIZED: {
    code: 4100,
    message: 'The requested method and/or account has not been authorized by the user.'
  },
  UNSUPPORTED_METHOD: {
    code: 4200,
    message: 'The Provider does not support the requested method.'
  },
  DISCONNECTED: {
    code: 4900,
    message: 'The Provider is disconnected from all chains.'
  },
  CHAIN_DISCONNECTED: {
    code: 4901,
    message: 'The Provider is not connected to the requested chain.'
  },
  TIMEOUT: {
    code: 4902,
    message: 'The request timed out.'
  },
    INTERNAL_ERROR: {
    code: -32603,
    message: 'Internal error'
  }
} as const;

// EIP-6963 Types
export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
  walletId: string;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EIP6963Provider;
}

export interface EIP6963Provider extends EIP1193Provider {
  announce(): void;
}

export interface EIP6963AnnounceProviderEvent extends CustomEvent {
  type: 'eip6963:announceProvider';
  detail: EIP6963ProviderDetail;
}

export interface EIP6963RequestProviderEvent extends CustomEvent {
  type: 'eip6963:requestProvider';
}

export interface EIP6963YakklEvent {
  type: 'YAKKL_EVENT:EIP6963' | 'YAKKL_EVENT:EIP1193';
  event: string;
  data: unknown;
}

export type EIP6963Event = EIP6963AnnounceProviderEvent | EIP6963RequestProviderEvent | EIP6963YakklEvent;

export interface EIP6963Request {
  type: 'YAKKL_REQUEST:EIP6963' | 'YAKKL_REQUEST:EIP1193';
  id: string;
  method: string;
  params?: unknown[];
}

export interface EIP6963Response {
  type: string;
  id: string;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
  jsonrpc: string;
}
