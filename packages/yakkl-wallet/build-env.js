// build-env.js (ESM-safe)

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load package.json manually
const pkgRaw = readFileSync(join(__dirname, 'package.json'), 'utf8');
const pkg = JSON.parse(pkgRaw);
const config = pkg.config || {};

// Load mustache with dynamic import
const { default: Mustache } = await import('mustache');

// Grab env name from CLI or default to prod
const envName = process.argv[2] || 'prod';
const envConfig = config.environments?.[envName] ?? {};

// Extract key vars
const yakklType = envConfig.YAKKL_TYPE || config.YAKKL_TYPE || 'popup';
const devMode = envConfig.DEV_MODE ?? 'false';
const version = pkg.version ?? '0.0.0';

// NOTE: Sidepanel is the default. Popup is supported for legacy reasons. The popup button allows for popup from sidepanel.

// Shared context for mustache
const context = {
	version,
	YAKKL_TYPE: yakklType,
	DEV_MODE: devMode,
	isSidepanel: true, //yakklType === 'sidepanel',
	isPopup: false, //yakklType === 'popup',
	...envConfig // override fallback with env-specific settings
};

// === Render .env ===
const envTemplate = readFileSync(join(__dirname, '.env.mustache'), 'utf8');
const envOutput = Mustache.render(envTemplate, context);
writeFileSync(join(__dirname, '.env'), envOutput);
console.log(`[build-env] Wrote .env for "${envName}" environment.`);

// === Render manifest.json ===
const manifestTemplatePath = join(__dirname, 'src/lib/extensions/chrome/manifest.json.mustache');
const manifestOutPath = join(__dirname, 'static/manifest.json');

try {
	const manifestTemplate = readFileSync(manifestTemplatePath, 'utf8');
	const manifestOutput = Mustache.render(manifestTemplate, context);
	writeFileSync(manifestOutPath, manifestOutput);
	console.log(`[build-env] Wrote manifest.json for "${envName}" environment.`);
} catch (err) {
	console.error('[build-env] Failed to render manifest.json:', err.message);
}
