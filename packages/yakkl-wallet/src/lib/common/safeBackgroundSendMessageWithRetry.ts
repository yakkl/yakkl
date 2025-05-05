import browser from 'webextension-polyfill';

export async function safeBackgroundSendMessageWithRetry<T = any>(
  message: any,
  {
    timeoutMs = 3000,
    retries = 2,
    retryDelayMs = 500
  } = {}
): Promise<T> {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await new Promise<T>((resolve, reject) => {
        let isSettled = false;

        const timeout = setTimeout(() => {
          if (!isSettled) {
            isSettled = true;
            reject(new Error(`safeBackgroundSendMessageWithRetry timed out after ${timeoutMs} ms (attempt ${attempt + 1})`));
          }
        }, timeoutMs);

        browser.runtime.sendMessage(message)
          .then(response => {
            if (!isSettled) {
              clearTimeout(timeout);
              isSettled = true;
              resolve(response as T);
            }
          })
          .catch(err => {
            if (!isSettled) {
              clearTimeout(timeout);
              isSettled = true;
              reject(err);
            }
          });
      });
    } catch (error) {
      console.warn(`[safeBackgroundSendMessageWithRetry] attempt ${attempt + 1} failed:`, error);
      if (attempt === retries) {
        throw new Error(`safeBackgroundSendMessageWithRetry failed after ${retries + 1} attempts: ${error}`);
      }
      attempt++;
      await delay(retryDelayMs); // Wait before retrying
    }
  }

  throw new Error('Unexpected failure in safeSendBackgroundMessageWithRetry');
}

// Helper delay function
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Example:
// const sessionInfo = await safeBackgroundSendMessageWithRetry<StoreHashResponse>({
//   type: 'STORE_SESSION_HASH',
//   payload: encryptedHash
// }, {
//   timeoutMs: 3000,  // optional
//   retries: 2,       // optional
//   retryDelayMs: 500 // optional
// });

