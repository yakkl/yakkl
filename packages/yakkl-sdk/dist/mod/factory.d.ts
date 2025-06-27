/**
 * Factory functions for mod development
 */
import { ModBuilder } from './ModBuilder';
import { type TemplateType, type TemplateConfig } from './ModTemplate';
import type { ModBuilderConfig } from './ModBuilder';
/**
 * Create a new mod from scratch
 */
export declare function createMod(config: ModBuilderConfig): ModBuilder;
/**
 * Create a mod from a template
 */
export declare function createModFromTemplate(type: TemplateType, config: TemplateConfig): ModBuilder;
/**
 * Quick create functions for common mod types
 */
export declare const modTemplates: {
    portfolioTracker: (config: TemplateConfig) => ModBuilder;
    tradingBot: (config: TemplateConfig) => ModBuilder;
    defiDashboard: (config: TemplateConfig) => ModBuilder;
    nftGallery: (config: TemplateConfig) => ModBuilder;
    priceAlerts: (config: TemplateConfig) => ModBuilder;
    transactionAnalyzer: (config: TemplateConfig) => ModBuilder;
    securityScanner: (config: TemplateConfig) => ModBuilder;
    backupManager: (config: TemplateConfig) => ModBuilder;
};
/**
 * Generate a complete mod package with files
 */
export declare function generateModPackage(builder: ModBuilder): {
    manifest: string;
    index: string;
    packageJson: string;
    readme: string;
};
