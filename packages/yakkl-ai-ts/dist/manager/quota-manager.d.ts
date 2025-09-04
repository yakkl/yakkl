/**
 * Quota manager for tracking and limiting AI usage
 */
import { QuotaConfig } from '../types/providers';
export declare class QuotaManager {
    private usage;
    private config;
    private callbacks;
    constructor(config: QuotaConfig);
    checkQuota(userId: string, tokens: number, cost: number): Promise<boolean>;
    recordUsage(userId: string, tokens: number, cost: number): void;
    getUsage(userId: string): {
        tokens: number;
        cost: number;
        date: string;
        warned75?: boolean;
        warned90?: boolean;
    };
    private getMonthlyUsage;
    onQuotaWarning(userId: string, callback: (usage: any) => void): void;
    onUsageUpdate(userId: string, callback: (usage: any) => void): void;
    private triggerCallback;
    reset(userId?: string): void;
}
//# sourceMappingURL=quota-manager.d.ts.map