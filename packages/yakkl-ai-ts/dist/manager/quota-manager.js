"use strict";
/**
 * Quota manager for tracking and limiting AI usage
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuotaManager = void 0;
class QuotaManager {
    usage = new Map();
    config;
    callbacks = new Map();
    constructor(config) {
        this.config = config;
    }
    async checkQuota(userId, tokens, cost) {
        const today = new Date().toISOString().split("T")[0];
        const userUsage = this.usage.get(userId) || {
            tokens: 0,
            cost: 0,
            date: today,
        };
        // Reset if new day
        if (userUsage.date !== today) {
            userUsage.tokens = 0;
            userUsage.cost = 0;
            userUsage.date = today;
        }
        // Check total tokens
        if (this.config.maxTotalTokens &&
            userUsage.tokens + tokens > this.config.maxTotalTokens) {
            throw new Error("Quota exceeded: maximum tokens reached");
        }
        // Check daily cost
        if (this.config.maxCostPerDay &&
            userUsage.cost + cost > this.config.maxCostPerDay) {
            throw new Error("Quota exceeded: daily cost limit reached");
        }
        // Check monthly cost
        if (this.config.maxCostPerMonth) {
            const monthUsage = this.getMonthlyUsage(userId);
            if (monthUsage.cost + cost > this.config.maxCostPerMonth) {
                throw new Error("Quota exceeded: monthly cost limit reached");
            }
        }
        // Check warning thresholds
        const percentage = ((userUsage.cost + cost) / this.config.maxCostPerDay) * 100;
        if (percentage >= 90 && !userUsage.warned90) {
            this.triggerCallback(userId, "warning", {
                level: 90,
                usage: userUsage.cost + cost,
                limit: this.config.maxCostPerDay,
            });
            userUsage.warned90 = true;
        }
        else if (percentage >= 75 && !userUsage.warned75) {
            this.triggerCallback(userId, "warning", {
                level: 75,
                usage: userUsage.cost + cost,
                limit: this.config.maxCostPerDay,
            });
            userUsage.warned75 = true;
        }
        return true;
    }
    recordUsage(userId, tokens, cost) {
        const today = new Date().toISOString().split("T")[0];
        const userUsage = this.usage.get(userId) || {
            tokens: 0,
            cost: 0,
            date: today,
        };
        // Reset if new day
        if (userUsage.date !== today) {
            userUsage.tokens = 0;
            userUsage.cost = 0;
            userUsage.date = today;
            delete userUsage.warned75;
            delete userUsage.warned90;
        }
        userUsage.tokens += tokens;
        userUsage.cost += cost;
        this.usage.set(userId, userUsage);
        // Trigger usage callback
        this.triggerCallback(userId, "usage", {
            tokens: userUsage.tokens,
            cost: userUsage.cost,
            date: userUsage.date,
        });
    }
    getUsage(userId) {
        const today = new Date().toISOString().split("T")[0];
        const userUsage = this.usage.get(userId) || {
            tokens: 0,
            cost: 0,
            date: today,
        };
        // Reset if new day
        if (userUsage.date !== today) {
            return { tokens: 0, cost: 0, date: today };
        }
        return { ...userUsage };
    }
    getMonthlyUsage(userId) {
        // In a real implementation, this would query a database
        // For now, return a simplified version
        const usage = this.getUsage(userId);
        return {
            tokens: usage.tokens * 30, // Rough estimate
            cost: usage.cost * 30, // Rough estimate
        };
    }
    onQuotaWarning(userId, callback) {
        this.callbacks.set(`${userId}_warning`, callback);
    }
    onUsageUpdate(userId, callback) {
        this.callbacks.set(`${userId}_usage`, callback);
    }
    triggerCallback(userId, type, data) {
        const callback = this.callbacks.get(`${userId}_${type}`);
        if (callback) {
            callback(data);
        }
    }
    reset(userId) {
        if (userId) {
            this.usage.delete(userId);
            this.callbacks.delete(`${userId}_warning`);
            this.callbacks.delete(`${userId}_usage`);
        }
        else {
            this.usage.clear();
            this.callbacks.clear();
        }
    }
}
exports.QuotaManager = QuotaManager;
//# sourceMappingURL=quota-manager.js.map