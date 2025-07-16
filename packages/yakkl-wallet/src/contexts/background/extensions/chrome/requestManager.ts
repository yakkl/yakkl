// Request manager stub for circular dependency resolution
export class RequestManager {
  private static instance: RequestManager;
  
  static getInstance(): RequestManager {
    if (!RequestManager.instance) {
      RequestManager.instance = new RequestManager();
    }
    return RequestManager.instance;
  }
  
  async hasPendingRequest(domain: string, address: string): Promise<boolean> {
    // TODO: Implement actual request tracking
    return false;
  }
  
  async removePendingRequest(domain: string, address: string): Promise<void> {
    // TODO: Implement actual request removal
  }
  
  async addRequest(requestId: string, request: any): Promise<void> {
    // TODO: Implement actual request addition
  }
  
  async getRequest(id: string): Promise<any> {
    // TODO: Implement actual request retrieval
    return { data: null };
  }
  
  async updateRequest(id: string, updates: any): Promise<void> {
    // TODO: Implement actual request update
  }
  
  async removeRequest(id: string): Promise<void> {
    // TODO: Implement actual request removal
  }
  
  getActiveRequests(): any[] {
    // TODO: Implement actual active requests retrieval
    return [];
  }
}

// Export singleton instance
export const requestManager = RequestManager.getInstance();