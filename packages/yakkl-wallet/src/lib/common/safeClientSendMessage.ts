import { browser_ext } from '$lib/common/environment';
import { log } from '$lib/common/logger-wrapper';
import { checkExtensionConnection, ConnectionState } from '$lib/common/extensionConnection';
import { getDynamicTimeout } from '$lib/common/networkSpeed';

// Example:
// const res = await safeClientSendMessage<StoreHashResponse>({
//   type: 'STORE_SESSION_HASH',
//   payload: encryptedHash
// });

export async function safeClientSendMessage<T = any>(
	message: any,
	timeoutMs?: number,
	retries = 3,
	retryDelay = 100
): Promise<T> {
	let lastError: any;

	// Get dynamic timeout if not explicitly provided
	const actualTimeout = timeoutMs || await getDynamicTimeout(message?.type);

	// Check connection state before attempting to send
	const connectionState = await checkExtensionConnection();

	if (connectionState === ConnectionState.INVALID_CONTEXT) {
		log.debug('Extension context is invalid, skipping message send', false, { message });
		return null as any;
	}

	if (connectionState === ConnectionState.DISCONNECTED) {
		log.debug('Extension is disconnected, will attempt with retries', false, { message });
	}

	for (let attempt = 0; attempt < retries; attempt++) {
		try {
			return await new Promise<T>((resolve, reject) => {
				let isSettled = false;

				if (attempt === 0) {
					log.info('safeClientSendMessage', false, { message, timeout: actualTimeout });
				} else {
					log.info(`safeClientSendMessage retry ${attempt + 1}/${retries}`, false, { message, timeout: actualTimeout });
				}

				const timeout = setTimeout(() => {
					if (!isSettled) {
						isSettled = true;
						reject(new Error(`safeClientSendMessage timed out after ${actualTimeout} ms`));
					}
				}, actualTimeout);

				try {
          if (!browser_ext) return null;

					browser_ext.runtime
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
		} catch (err: any) {
			lastError = err;

			// Check if it's a connection error
			if (err?.message?.includes('Could not establish connection') ||
				err?.message?.includes('Receiving end does not exist') ||
				err?.message?.includes('Extension context invalidated')) {
				// Log as debug instead of error for expected connection issues
				log.debug('Connection error encountered', false, { error: err?.message, attempt: attempt + 1 });

				// If this isn't the last attempt, wait before retrying
				if (attempt < retries - 1) {
					await new Promise(resolve =>
						setTimeout(resolve, retryDelay * Math.pow(2, attempt)) // Exponential backoff
					);
					continue;
				}
			}

			// For other errors, don't retry
			throw err;
		}
	}

	// If we've exhausted all retries, log and return null for connection errors
	if (lastError?.message?.includes('Could not establish connection') ||
		lastError?.message?.includes('Receiving end does not exist')) {
		log.debug('Message send failed after all retries due to connection error', false, { message, error: lastError?.message });
		return null as any;
	}

	// For other errors, throw the last error
	throw lastError;
}
