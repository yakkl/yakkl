// Gets the icon from the dApp's favicon
export const getIcon = () => {
	// Check if we're in a browser environment
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		return undefined;
	}
	
	const faviconElements: NodeListOf<HTMLLinkElement> =
		window.document.querySelectorAll("link[rel*='icon']");
	const largestFavicon = [...faviconElements].sort((el) =>
		parseInt(el.sizes.toString().split('x')[0], 10)
	)[0];
	return largestFavicon?.href;
};
