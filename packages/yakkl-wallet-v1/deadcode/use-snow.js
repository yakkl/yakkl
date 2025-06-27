(function () {
	try {
		// eslint-disable-next-line no-debugger
		debugger;
		const log = console.log.bind(console);
		const msg = 'Welcome to YAKKL: ';
		if (window) {
			window.top.SNOW((win) => {
				log(msg, win, win?.frameElement);
			});
		}
	} catch (e) {
		console.log(e);
	}
})();
