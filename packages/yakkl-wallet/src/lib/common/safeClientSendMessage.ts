import { browser_ext } from '$lib/common/environment';
import { log } from '$lib/managers/Logger';

// Example:
// const res = await safeClientSendMessage<StoreHashResponse>({
//   type: 'STORE_SESSION_HASH',
//   payload: encryptedHash
// });

export async function safeClientSendMessage<T = any>(message: any, timeoutMs = 3000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let isSettled = false;

    log.info('safeClientSendMessage', false, { message });
    
    const timeout = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        reject(new Error(`safeClientSendMessage timed out after ${timeoutMs} ms`));
      }
    }, timeoutMs);

    try {
      browser_ext.runtime.sendMessage(message)
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
    } catch (err) {
      if (!isSettled) {
        clearTimeout(timeout);
        reject(err);
      }
    }
  });
}
