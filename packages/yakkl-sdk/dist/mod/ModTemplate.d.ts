/**
 * ModTemplate - Pre-built mod templates for common use cases
 */
import { ModBuilder } from './ModBuilder';
export type TemplateType = 'portfolio-tracker' | 'trading-bot' | 'defi-dashboard' | 'nft-gallery' | 'price-alerts' | 'transaction-analyzer' | 'security-scanner' | 'backup-manager';
export interface TemplateConfig {
    id: string;
    name: string;
    author: string;
    description?: string;
}
export declare class ModTemplate {
    static portfolioTracker(config: TemplateConfig): ModBuilder;
    static tradingBot(config: TemplateConfig): ModBuilder;
    static defiDashboard(config: TemplateConfig): ModBuilder;
    static nftGallery(config: TemplateConfig): ModBuilder;
    static priceAlerts(config: TemplateConfig): ModBuilder;
    static transactionAnalyzer(config: TemplateConfig): ModBuilder;
    static securityScanner(config: TemplateConfig): ModBuilder;
    static backupManager(config: TemplateConfig): ModBuilder;
    /**
     * Create a mod from a template
     */
    static create(type: TemplateType, config: TemplateConfig): ModBuilder;
    /**
     * Get available template types
     */
    static getAvailableTemplates(): TemplateType[];
    /**
     * Get template description
     */
    static getTemplateDescription(type: TemplateType): string;
}
