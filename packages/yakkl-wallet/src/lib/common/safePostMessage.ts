import type { Runtime } from "webextension-polyfill";

// NOTE: This is used in the background script to content script or other background scripts only.
export function safePostMessage<T = any>(port: Runtime.Port, message: any, timeoutMs = 3000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let isSettled = false;

    const timeout = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        reject(new Error(`safePostMessage timed out after ${timeoutMs} ms`));
      }
    }, timeoutMs);

    const handleResponse = (response: any) => {
      if (!isSettled) {
        clearTimeout(timeout);
        isSettled = true;
        resolve(response as T);
      }
      port.onMessage.removeListener(handleResponse);
    };

    port.onMessage.addListener(handleResponse);

    try {
      port.postMessage(message);
    } catch (err) {
      if (!isSettled) {
        clearTimeout(timeout);
        reject(err);
      }
    }
  });
}

// Example:
// const res = await safePostMessage<StoreHashResponse>(port, {
//   type: 'STORE_SESSION_HASH',
//   payload: encryptedHash
// });
