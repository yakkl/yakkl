import browser from 'webextension-polyfill';

export async function safeBackgroundSendMessage<T = any>(
	message: any,
	timeoutMs = 3000
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		let isSettled = false;

		const timeout = setTimeout(() => {
			if (!isSettled) {
				isSettled = true;
				reject(new Error(`safeBackgroundSendMessage timed out after ${timeoutMs} ms`));
			}
		}, timeoutMs);

		try {
			browser.runtime
				.sendMessage(message)
				.then((response) => {
					if (!isSettled) {
						clearTimeout(timeout);
						isSettled = true;
						resolve(response as T);
					}
				})
				.catch((err) => {
					if (!isSettled) {
						clearTimeout(timeout);
						isSettled = true;
						reject(err);
					}
				});
		} catch (err) {
			if (!isSettled) {
				clearTimeout(timeout);
				reject(err);
			}
		}
	});
}
