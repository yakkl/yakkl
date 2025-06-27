/**
 * Factory functions for mod development
 */

import { ModBuilder } from './ModBuilder';
import { ModTemplate, type TemplateType, type TemplateConfig } from './ModTemplate';
import type { ModBuilderConfig } from './ModBuilder';

/**
 * Create a new mod from scratch
 */
export function createMod(config: ModBuilderConfig): ModBuilder {
  return new ModBuilder(config);
}

/**
 * Create a mod from a template
 */
export function createModFromTemplate(type: TemplateType, config: TemplateConfig): ModBuilder {
  return ModTemplate.create(type, config);
}

/**
 * Quick create functions for common mod types
 */
export const modTemplates = {
  portfolioTracker: (config: TemplateConfig) => ModTemplate.portfolioTracker(config),
  tradingBot: (config: TemplateConfig) => ModTemplate.tradingBot(config),
  defiDashboard: (config: TemplateConfig) => ModTemplate.defiDashboard(config),
  nftGallery: (config: TemplateConfig) => ModTemplate.nftGallery(config),
  priceAlerts: (config: TemplateConfig) => ModTemplate.priceAlerts(config),
  transactionAnalyzer: (config: TemplateConfig) => ModTemplate.transactionAnalyzer(config),
  securityScanner: (config: TemplateConfig) => ModTemplate.securityScanner(config),
  backupManager: (config: TemplateConfig) => ModTemplate.backupManager(config),
};

/**
 * Generate a complete mod package with files
 */
export function generateModPackage(builder: ModBuilder): {
  manifest: string;
  index: string;
  packageJson: string;
  readme: string;
} {
  const manifest = builder.buildManifest();
  const modClass = builder.generateTemplate();

  const packageJson = JSON.stringify({
    name: `@yakkl/mod-${manifest.id}`,
    version: manifest.version,
    description: manifest.description,
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    files: ['dist', 'README.md'],
    scripts: {
      build: 'tsc',
      dev: 'tsc --watch',
      prepublishOnly: 'npm run build'
    },
    dependencies: {
      '@yakkl/core': 'workspace:*'
    },
    devDependencies: {
      'typescript': '^5.0.0'
    },
    keywords: ['yakkl', 'wallet', 'mod', 'plugin', ...manifest.tags],
    author: manifest.author,
    license: manifest.license,
    repository: manifest.repository,
    homepage: manifest.website
  }, null, 2);

  const readme = `# ${manifest.name}

${manifest.description}

## Installation

\`\`\`bash
npm install @yakkl/mod-${manifest.id}
\`\`\`

## Usage

This mod is automatically loaded by YAKKL Wallet when installed.

## Features

${manifest.tags.map(tag => `- ${tag.charAt(0).toUpperCase() + tag.slice(1)}`).join('\n')}

## Permissions

${manifest.permissions?.map(permission => `- ${permission}`).join('\n') || 'None'}

## Author

${manifest.author}

## License

${manifest.license}
`;

  return {
    manifest: JSON.stringify(manifest, null, 2),
    index: modClass,
    packageJson,
    readme
  };
}