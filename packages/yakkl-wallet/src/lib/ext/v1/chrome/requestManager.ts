import type { PendingRequestData } from '$lib/common/interfaces';
import { log } from '$lib/managers/Logger';
import type { BackgroundPendingRequest } from './background';

export class RequestManager {
	private static instance: RequestManager | null = null;
	private requests: Map<string, BackgroundPendingRequest> = new Map();

	private constructor() {
		// Constructor is now empty as the requests map is initialized in the class
	}

	public static getInstance(): RequestManager {
		if (!RequestManager.instance) {
			RequestManager.instance = new RequestManager();
		}
		return RequestManager.instance;
	}

	public addRequest(id: string, request: BackgroundPendingRequest): void {
		this.requests.set(id, request);
	}

	public getRequest(id: string): BackgroundPendingRequest | undefined {
		return this.requests.get(id);
	}

	public updateRequest(id: string, updates: Partial<BackgroundPendingRequest>): void {
		const request = this.requests.get(id);
		if (request) {
			this.requests.set(id, { ...request, ...updates });
		}
	}

	public removeRequest(id: string): void {
		this.requests.delete(id);
	}

	public hasRequest(requestId: string): boolean {
		return this.requests.has(requestId);
	}

	public clearRequests(): void {
		this.requests.clear();
	}

	public getActiveRequests(): BackgroundPendingRequest[] {
		return Array.from(this.requests.values());
	}
}

export const requestManager = RequestManager.getInstance();