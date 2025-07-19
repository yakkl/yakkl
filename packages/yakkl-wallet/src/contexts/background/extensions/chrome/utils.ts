export function extractDomain(url: string | URL): string {
	const domain = new URL(url).hostname;
	return domain.startsWith('www.') ? domain.slice(4) : domain;
}
