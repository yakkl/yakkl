// File: vite.alias.config.ts
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load .env file or fall back to .env.standard
const envPath = fs.existsSync('.env') ? '.env' : '.env.standard';
dotenv.config({ path: envPath });

const isPro = process.env.YAKKL_PRO === 'true';
const isPrivate = process.env.YAKKL_PRIVATE === 'true';

// Fallback shim path if overlay is missing
const fallbackShim = path.resolve('./src/shims');

export function getYakklAliases() {
	const aliases: Record<string, string> = {
		$lib: path.resolve('./src/lib'),
		$routes: path.resolve('./src/routes')
	};

	try {
		if (isPro && fs.existsSync('./pro/overlay')) {
			aliases['$pro'] = path.resolve('./pro/overlay');
		} else if (isPro) {
			console.warn('⚠️  Pro overlay not found, falling back to shim.');
			aliases['$pro'] = fallbackShim;
		}
	} catch (err) {
		console.error('Error checking Pro overlay:', err);
	}

	try {
		if (isPrivate && fs.existsSync('./private/overlay')) {
			aliases['$private'] = path.resolve('./private/overlay');
		} else if (isPrivate) {
			console.warn('⚠️  Private overlay not found, falling back to shim.');
			aliases['$private'] = fallbackShim;
		}
	} catch (err) {
		console.error('Error checking Private overlay:', err);
	}

	return aliases;
}
