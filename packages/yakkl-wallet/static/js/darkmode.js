/* eslint-disable no-empty */

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

function updateMode(mediaQuery) {
	try {
		// Default to lightMode
		if (
			mediaQuery.matches ||
			!('theme' in localStorage) ||
			(!('theme' in localStorage) && mediaQuery.matches)
		) {
			setDark();
		} else {
			setLight();
		}
	} catch (_) {}
}

function setDark() {
	document.documentElement.classList.add('dark');
	localStorage.theme = 'dark';
}

function setLight() {
	document.documentElement.classList.remove('dark');
	localStorage.theme = 'light';
}

updateMode(mediaQuery);

mediaQuery.addEventListener('change', updateMode);
