// Add this function to check if the current tab is a Yakkl page
export function isYakklPage(): boolean {
	const currentUrl = window.location.href;
	return currentUrl.includes('https://yakkl.com');
}
