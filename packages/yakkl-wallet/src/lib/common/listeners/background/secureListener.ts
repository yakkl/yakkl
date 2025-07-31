// // File: src/background/secureListener.ts
// import { log } from '$lib/common/logger-wrapper';
// import browser, { type Runtime } from '$lib/types/browser-types';
// import type { SessionToken } from '$lib/common/interfaces';
// import { decryptData } from '$lib/common/encryption';
// import { isEncryptedData } from '$lib/common/misc';
// import { getSafeUUID } from '$lib/common/uuid';
// // import type { BackgroundPendingRequest } from '$contexts/background/extensions/chrome/background';
// import { requestManager } from '$contexts/background/extensions/chrome/requestManager';
// import { signingManager } from '$contexts/background/extensions/chrome/signingManager';
// // import { initializeStorageDefaults } from '$lib/common/backgroundUtils';

// let sessionToken: SessionToken | null = null;
// let memoryHash: string | null = null;
// const secret = Symbol("hash-access"); // This can become more dynamic similar to an OAuth token
// // Session port store by requestId
// const sessionPorts = new Map<string, browser.Runtime.Port>();

// const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

// export function setMemoryHash(hash: string) {
//   memoryHash = hash;
// }

// // Add more around this such as token access
// export function getMemoryHash(token: symbol): string | null {
//   if (token !== secret) throw new Error("Unauthorized memory access");
//   return memoryHash;
// }

// // Export token only from the background
// export const memoryAccessToken = secret;

// function generateSessionToken(): SessionToken {
//   const token = getSafeUUID();
//   const expiresAt = Date.now() + SESSION_TIMEOUT_MS;
//   return { token, expiresAt };
// }

// function clearSession(reason: string) {
//   sessionToken = null;
//   memoryHash = null;
// }

// function validateSession(token: string, scope: string): void {
//   if (!sessionToken || Date.now() > sessionToken.expiresAt) {
//     clearSession('Token expired or missing');
//     throw new Error('Session expired');
//   }
//   if (sessionToken.token !== token) {
//     log.warn(`Unauthorized access to ${scope}`);
//     throw new Error('Unauthorized');
//   }
//   if (!memoryHash) {
//     throw new Error('Memory hash missing');
//   }
// }

// export async function decryptDataBackground(payload: any, token: string): Promise<any> {
//   validateSession(token, 'decryption');
//   if (!isEncryptedData(payload)) {
//     log.warn('Invalid encrypted data structure');
//     throw new Error('Decryption failed');
//   }
//   return await decryptData(payload, memoryHash!);
// }

// // export const secureHandlers: Record<
// //   string,
// //   (payload: any, token: string) => Promise<any>
// // > = {
// //   'DECRYPT_DATA': async (payload, token) => {
// //     // This allows us to decrypt data from the background message listener
// //     validateSession(token, 'decryption');
// //     if (!isEncryptedData(payload)) {
// //       log.warn('Invalid encrypted data structure');
// //       throw new Error('Decryption failed');
// //     }
// //     return await decryptData(payload, memoryHash!);
// //   },

// //   'ENCRYPT_DATA': async (payload, token) => {
// //     validateSession(token, 'encryption');
// //     const stringifiedPayload = JSON.stringify(payload);
// //     return await encryptData(stringifiedPayload, memoryHash!);
// //   },

// //   'SIMULATE_TX': async (payload, token) => {
// //     validateSession(token, 'simulation');
// //     if (!isEncryptedData(payload)) {
// //       log.warn('Invalid payload for simulation');
// //       throw new Error('Simulation failed');
// //     }
// //     const decrypted = await decryptData(payload, memoryHash!) as string;
// //     const tx = JSON.parse(decrypted);
// //     return {
// //       estimatedGas: 21000,
// //       calls: [`transfer(${tx.token}, ${tx.amount})`],
// //       risk: 'low',
// //       approvalRequired: tx.requiresApproval ?? false
// //     };
// //   }
// // };

// // // Handles messages for decryption, encryption, simulation, etc.
// // export async function onSecureListener(
// //   message: any,
// //   sender: Runtime.MessageSender
// // ): Promise<any> {
// //   const { type, payload, token } = message;
// //   const handler = secureHandlers[type];

// //   if (handler) {
// //     try {
// //       const result = await handler(payload, token);
// //       return { success: true, result };
// //     } catch (error: any) {
// //       return { success: false, error: error?.message };
// //     }
// //   }

// //   // No handler found - return undefined to let the message pass through
// //   return undefined;
// // }

// // This allows us to decrypt data from the background port connection. Also, below is similar code for the onConnect event.
// // browser.runtime.onConnect.addListener((port) => {
// //   if (port.name !== 'yakkl-secure-port') return;
// //   port.onMessage.addListener(async (message: any) => {
// //     // Could put the secure handlers here if needed
// //     if (message.type === 'DECRYPT_DATA') {
// //       try {
// //         const { payload, token } = message;
// //         const result = await decryptData(payload, memoryHash); // or memoryHash
// //         port.postMessage({ success: true, result });
// //       } catch (err: any) {
// //         port.postMessage({ success: false, error: err.message });
// //       }
// //     } else {
// //       log.info('[Background] Unknown port message type:', message.type);
// //     }
// //   });

// //   port.onDisconnect.addListener(() => {
// //     log.info('[Background] Port disconnected');
// //   });
// // });

// function registerPort(port: browser.Runtime.Port, requestId: string) {
//   log.info('SecureMessageListener - onMessage - REGISTER_SESSION_PORT - requestId:', false, requestId);
//   sessionPorts.set(requestId, port);
//   log.info('SecureMessageListener - onMessage - REGISTER_SESSION_PORT - sessionPorts - requestId:', false, sessionPorts, requestId);
// }

// function unregisterPort(requestId: string) {
//   sessionPorts.delete(requestId);
//   log.info('SecureMessageListener - onMessage - UNREGISTER_SESSION_PORT - sessionPorts - requestId:', false, sessionPorts, requestId);
// }

// function isSessionPortActive(requestId: string): boolean {
//   return sessionPorts.has(requestId);
// }

// // Secure message listener for the secure token
// export async function onSecureMessageListener(
//   message: any,
//   sender: Runtime.MessageSender
// ): Promise<any> {
//   try {
//     log.info('SecureMessageListener - onMessage:', false, { message, sender });

//     // Handle REQUEST_SESSION_PORT
//     if (message?.type === 'REQUEST_SESSION_PORT') {
//       const port = sessionPorts.get(message.requestId);
//       log.info('Sending SESSION_PORT response:', false, port ? true : false);
//       return { success: !!port, portName: port ? port.name : ''};
//     }

//     // Handle REGISTER_SESSION_PORT
//     if (message?.type === 'REGISTER_SESSION_PORT') {
//       if (!message.requestId) {
//         return { error: 'Missing requestId' };
//       }
//       registerPort(message.port, message.requestId);
//       return { success: true };
//     }

//     // Handle UNREGISTER_SESSION_PORT
//     if (message?.type === 'UNREGISTER_SESSION_PORT') {
//       unregisterPort(message.requestId);
//       return { success: true };
//     }

//     // Handle STORE_SESSION_HASH
//     if (message?.type === 'STORE_SESSION_HASH') {
//       if (!message.payload || typeof message.payload !== 'string') {
//         return { success: false, error: 'Invalid payload' };
//       }

//       memoryHash = message.payload;
//       sessionToken = generateSessionToken();

//       // Send broadcast after returning response
//       setTimeout(async () => {
//         await browser.runtime.sendMessage({
//           type: 'SESSION_TOKEN_BROADCAST',
//           token: sessionToken.token,
//           expiresAt: sessionToken.expiresAt
//         });
//       }, 0);

//       return {
//         success: true,
//         token: sessionToken.token,
//         expiresAt: sessionToken.expiresAt
//       };
//     }

//     // Handle REFRESH_SESSION
//     if (message?.type === 'REFRESH_SESSION') {
//       if (sessionToken && message.token === sessionToken.token) {
//         sessionToken.expiresAt = Date.now() + SESSION_TIMEOUT_MS;
//         return {
//           success: true,
//           token: sessionToken.token,
//           expiresAt: sessionToken.expiresAt
//         };
//       } else {
//         clearSession('Invalid or expired refresh request');
//         return { success: false, error: 'Unauthorized' };
//       }
//     }

//     // Handle SIGNING_REQUEST
//     // if (message?.messageType === 'SIGNING_REQUEST' || (message?.type?.includes('personal_sign'))) {
//     //   const requestId = message.requestId || message.id;

//     //   // Create a Promise to handle the signing request
//     //   return new Promise(async (resolve) => {
//     //     const request: BackgroundPendingRequest = {
//     //       resolve: resolve,
//     //       reject: (error) => resolve({ error }),
//     //       port: sender as Runtime.Port,
//     //       data: message.data
//     //     };

//     //     requestManager.addRequest(requestId, request);
//     //     await handleSigningRequest(requestId, message.type, message.params, message.token);
//     //     // Note: The request manager will call resolve when complete
//     //   });
//     // }

//     // Not handled by this listener
//     return undefined;

//   } catch (error) {
//     log.error('SecureMessageListener - onMessage - error:', false, { error });
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : 'Unknown error'
//     };
//   }
// }

// export async function handleSigningRequest(
//   requestId: string,
//   method: string,
//   params: any[],
//   token: string
// ): Promise<void> {
//   const request = requestManager.getRequest(requestId);
//   if (!request) {
//     return; // Nothing to do if request isn't registered
//   }

//   try {
//     const result = await signingManager.handleSigningRequest(requestId, method, params, token);
//     request.resolve(result);
//   } catch (error) {
//     request.reject(error);
//   } finally {
//     requestManager.removeRequest(requestId);
//   }
// }

// // Port listener for the secure token connection
// browser.runtime.onConnect.addListener((port) => {
//   port.onMessage.addListener(async (message: any) => {
//     if (!message || typeof message !== 'object' || !message.type) return;
//     // This section is the same as the onMessage section above - but for the onConnect event if needed
//     if (message.type === 'STORE_SESSION_HASH') {
//       if (!message.payload || typeof message.payload !== 'string') {
//         port.postMessage({ error: 'Invalid payload' });
//         return;
//       }
//       memoryHash = message.payload;
//       sessionToken = generateSessionToken();
//       port.postMessage({
//         success: true,
//         token: sessionToken.token,
//         expiresAt: sessionToken.expiresAt
//       });
//       return;
//     }

//     if (message.type === 'REFRESH_SESSION_TOKEN') {
//       if (sessionToken && message.token === sessionToken.token) {
//         sessionToken.expiresAt = Date.now() + SESSION_TIMEOUT_MS;
//         port.postMessage({
//           token: sessionToken.token,
//           expiresAt: sessionToken.expiresAt
//         });
//       } else {
//         clearSession('Invalid or expired refresh request');
//         port.postMessage({ error: 'Unauthorized' });
//       }
//       return;
//     }
//     // End of the same as the onMessage section above - but for the onConnect event if needed

//     // Other handlers
//     if (message.type === 'REGISTER_SESSION_PORT') {
//       log.info('SecureMessageListener - onMessage - REGISTER_SESSION_PORT - requestId:', false, message.requestId);
//       if (!message.requestId) {
//         port.postMessage({ error: 'Missing requestId' });
//         return;
//       }
//       log.info('SecureMessageListener - onMessage - REGISTER_SESSION_PORT - requestId:', false, message.requestId);
//       registerPort(port, message.requestId);
//       port.postMessage({ success: true });
//       return;
//     }

//     // This section could all be moved to the earlier connection handler above. The decrypt portion is handled in both places.
//     // const handler = secureHandlers[message.type];
//     // if (!handler) {
//     //   log.debug(`Handler of request type ${message.type} not found. Passing through.`);
//     //   port.postMessage({ error: `Handler of request type ${message.type} not found. Passing through.` });
//     //   return;
//     // }

//     // try {
//     //   const result = await handler(message.payload, message.token);
//     //   port.postMessage({ data: result });
//     // } catch (err) {
//     //   log.warn(`Handler for ${message.type} failed`, false, { error: err });
//     //   port.postMessage({ error: err instanceof Error ? err.message : 'Handler error' });
//     // }
//   });
// });
