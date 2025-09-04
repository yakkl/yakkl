/**
 * Rate limiter for AI provider requests
 */
import { RateLimitConfig } from '../types/providers';
export declare class RateLimiter {
    private requests;
    private tokens;
    private lastRequest;
    private config;
    constructor(config: RateLimitConfig);
    checkLimit(userId: string, tokenCount?: number): Promise<boolean>;
    recordRequest(userId: string, tokenCount?: number): void;
    private cleanOldEntries;
    reset(userId?: string): void;
}
//# sourceMappingURL=rate-limiter.d.ts.map