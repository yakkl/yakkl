import type { PendingRequestData } from '$lib/common/interfaces';
import { log } from '$lib/plugins/Logger';
import type { BackgroundPendingRequest } from './background';


export class RequestManager {
  private static instance: RequestManager | null = null;
  private pendingRequests: Map<string, BackgroundPendingRequest>;

  private constructor() {
    this.pendingRequests = new Map();
  }

  public static getInstance(): RequestManager {
    if (!RequestManager.instance) {
      RequestManager.instance = new RequestManager();
    }
    return RequestManager.instance;
  }

  public addRequest(requestId: string, request: BackgroundPendingRequest): void {
    log.info('addRequest', false, {requestId, request});
    this.pendingRequests.set(requestId, request);
  }

  public getRequest(requestId: string): BackgroundPendingRequest | undefined {
    return this.pendingRequests.get(requestId);
  }

  public removeRequest(requestId: string): void {
    this.pendingRequests.delete(requestId);
  }

  public hasRequest(requestId: string): boolean {
    return this.pendingRequests.has(requestId);
  }

  public clearRequests(): void {
    this.pendingRequests.clear();
  }
}

export const requestManager = RequestManager.getInstance();
