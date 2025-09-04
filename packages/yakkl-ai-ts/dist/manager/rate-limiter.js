"use strict";
/**
 * Rate limiter for AI provider requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
class RateLimiter {
    requests = new Map();
    tokens = new Map();
    lastRequest = new Map();
    config;
    constructor(config) {
        this.config = config;
    }
    async checkLimit(userId, tokenCount) {
        const now = Date.now();
        // Check debounce
        if (this.config.debounceMs) {
            const last = this.lastRequest.get(userId) || 0;
            if (now - last < this.config.debounceMs) {
                throw new Error(`Please wait ${this.config.debounceMs - (now - last)}ms before next request`);
            }
        }
        // Clean old entries
        this.cleanOldEntries(userId, now);
        // Check request limits
        const userRequests = this.requests.get(userId) || [];
        if (this.config.maxRequestsPerMinute) {
            const recentMinute = userRequests.filter((t) => now - t < 60000);
            if (recentMinute.length >= this.config.maxRequestsPerMinute) {
                throw new Error("Rate limit exceeded: too many requests per minute");
            }
        }
        if (this.config.maxRequestsPerHour) {
            const recentHour = userRequests.filter((t) => now - t < 3600000);
            if (recentHour.length >= this.config.maxRequestsPerHour) {
                throw new Error("Rate limit exceeded: too many requests per hour");
            }
        }
        if (this.config.maxRequestsPerDay) {
            const recentDay = userRequests.filter((t) => now - t < 86400000);
            if (recentDay.length >= this.config.maxRequestsPerDay) {
                throw new Error("Rate limit exceeded: too many requests per day");
            }
        }
        // Check token limits
        if (tokenCount &&
            (this.config.maxTokensPerMinute ||
                this.config.maxTokensPerHour ||
                this.config.maxTokensPerDay)) {
            const userTokens = this.tokens.get(userId) || [];
            if (this.config.maxTokensPerMinute) {
                const recentMinuteTokens = userTokens
                    .filter((t) => now - t < 60000)
                    .reduce((sum, t) => sum + t, 0);
                if (recentMinuteTokens + tokenCount > this.config.maxTokensPerMinute) {
                    throw new Error("Rate limit exceeded: too many tokens per minute");
                }
            }
            if (this.config.maxTokensPerHour) {
                const recentHourTokens = userTokens
                    .filter((t) => now - t < 3600000)
                    .reduce((sum, t) => sum + t, 0);
                if (recentHourTokens + tokenCount > this.config.maxTokensPerHour) {
                    throw new Error("Rate limit exceeded: too many tokens per hour");
                }
            }
            if (this.config.maxTokensPerDay) {
                const recentDayTokens = userTokens
                    .filter((t) => now - t < 86400000)
                    .reduce((sum, t) => sum + t, 0);
                if (recentDayTokens + tokenCount > this.config.maxTokensPerDay) {
                    throw new Error("Rate limit exceeded: too many tokens per day");
                }
            }
        }
        return true;
    }
    recordRequest(userId, tokenCount) {
        const now = Date.now();
        // Record request
        const userRequests = this.requests.get(userId) || [];
        userRequests.push(now);
        this.requests.set(userId, userRequests);
        // Record tokens
        if (tokenCount) {
            const userTokens = this.tokens.get(userId) || [];
            userTokens.push(tokenCount);
            this.tokens.set(userId, userTokens);
        }
        // Update last request time
        this.lastRequest.set(userId, now);
    }
    cleanOldEntries(userId, now) {
        // Clean requests older than 24 hours
        const userRequests = this.requests.get(userId) || [];
        this.requests.set(userId, userRequests.filter((t) => now - t < 86400000));
        // Clean tokens older than 24 hours
        const userTokens = this.tokens.get(userId) || [];
        this.tokens.set(userId, userTokens.filter((t) => now - t < 86400000));
    }
    reset(userId) {
        if (userId) {
            this.requests.delete(userId);
            this.tokens.delete(userId);
            this.lastRequest.delete(userId);
        }
        else {
            this.requests.clear();
            this.tokens.clear();
            this.lastRequest.clear();
        }
    }
}
exports.RateLimiter = RateLimiter;
//# sourceMappingURL=rate-limiter.js.map