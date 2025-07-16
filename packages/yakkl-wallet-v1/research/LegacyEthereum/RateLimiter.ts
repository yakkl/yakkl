// src/providers/RateLimiter.ts
export class RateLimiter {
	private maxTokens: number;
	private fillRate: number;
	private tokens: number;
	private lastTimestamp: number;

	constructor(maxTokens: number = 100, fillRate: number = 0.01) {
		this.maxTokens = maxTokens;
		this.fillRate = fillRate;
		this.tokens = maxTokens;
		this.lastTimestamp = Date.now();
	}

	public consume(): boolean {
		const now = Date.now();
		const deltaTime = now - this.lastTimestamp;
		this.lastTimestamp = now;

		const refillTokens = deltaTime * this.fillRate;
		this.tokens = Math.min(this.maxTokens, this.tokens + refillTokens);

		if (this.tokens < 1) {
			return false;
		}

		this.tokens -= 1;
		return true;
	}
}
