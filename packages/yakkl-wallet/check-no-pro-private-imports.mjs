// scripts/check-no-pro-private-imports.mjs
import { readdirSync, statSync, readFileSync } from 'fs';
import path from 'path';

const scanPath = './src';
const illegal = process.env.YAKKL_PRIVATE !== 'true' ? ['$private/'] : [];
if (process.env.YAKKL_PRO !== 'true') illegal.push('$pro/');
if (process.env.YAKKL_PRO_PLUS !== 'true') illegal.push('$pro_plus/');

let error = false;
function scan(dir) {
	for (const entry of readdirSync(dir)) {
		const full = path.join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) scan(full);
		else if (entry.endsWith('.ts') || entry.endsWith('.svelte')) {
			const content = readFileSync(full, 'utf-8');
			illegal.forEach((tag) => {
				if (content.includes(tag)) {
					console.error(`🚫 ${tag} used in ${full}`);
					error = true;
				}
			});
		}
	}
}
scan(scanPath);
if (error) process.exit(1);
