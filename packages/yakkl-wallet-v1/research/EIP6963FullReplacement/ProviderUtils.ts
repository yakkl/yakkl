// src/providers/base/ProviderUtils.ts
export class RateLimiter {
	private maxTokens: number;
	private fillRate: number;
	private tokens: number;
	private lastTimestamp: number;

	constructor(maxTokens = 100, fillRate = 0.1) {
		this.maxTokens = maxTokens;
		this.fillRate = fillRate;
		this.tokens = maxTokens;
		this.lastTimestamp = Date.now();
	}

	public consume(): boolean {
		const now = Date.now();
		const deltaTime = (now - this.lastTimestamp) / 1000;
		this.lastTimestamp = now;

		this.tokens = Math.min(this.maxTokens, this.tokens + deltaTime * this.fillRate);

		if (this.tokens < 1) {
			return false;
		}

		this.tokens -= 1;
		return true;
	}
}

export class MessageValidator {
	public static validateRequest(request: unknown): void {
		if (!request || typeof request !== 'object') {
			throw new Error('Invalid request format');
		}

		const { method, params } = request as any;
		if (typeof method !== 'string') {
			throw new Error('Invalid method format');
		}

		if (params !== undefined && !Array.isArray(params) && typeof params !== 'object') {
			throw new Error('Invalid params format');
		}
	}
}
