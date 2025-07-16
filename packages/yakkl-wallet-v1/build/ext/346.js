(self['webpackChunkwallet'] = self['webpackChunkwallet'] || []).push([
	[346],
	{
		3346: function (e, r) {
			var s, g, a;
			(function (n, t) {
				if (true) {
					!((g = [e]),
					(s = t),
					(a = typeof s === 'function' ? s.apply(r, g) : s),
					a !== undefined && (e.exports = a));
				} else {
					var m;
				}
			})(
				typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this,
				function (e) {
					'use strict';
					if (!(globalThis.chrome && globalThis.chrome.runtime && globalThis.chrome.runtime.id)) {
						throw new Error('This script should only be loaded in a browser extension.');
					}
					if (
						!(globalThis.browser && globalThis.browser.runtime && globalThis.browser.runtime.id)
					) {
						const r = 'The message port closed before a response was received.';
						const wrapAPIs = (e) => {
							const s = {
								alarms: {
									clear: { minArgs: 0, maxArgs: 1 },
									clearAll: { minArgs: 0, maxArgs: 0 },
									get: { minArgs: 0, maxArgs: 1 },
									getAll: { minArgs: 0, maxArgs: 0 }
								},
								bookmarks: {
									create: { minArgs: 1, maxArgs: 1 },
									get: { minArgs: 1, maxArgs: 1 },
									getChildren: { minArgs: 1, maxArgs: 1 },
									getRecent: { minArgs: 1, maxArgs: 1 },
									getSubTree: { minArgs: 1, maxArgs: 1 },
									getTree: { minArgs: 0, maxArgs: 0 },
									move: { minArgs: 2, maxArgs: 2 },
									remove: { minArgs: 1, maxArgs: 1 },
									removeTree: { minArgs: 1, maxArgs: 1 },
									search: { minArgs: 1, maxArgs: 1 },
									update: { minArgs: 2, maxArgs: 2 }
								},
								browserAction: {
									disable: { minArgs: 0, maxArgs: 1, fallbackToNoCallback: true },
									enable: { minArgs: 0, maxArgs: 1, fallbackToNoCallback: true },
									getBadgeBackgroundColor: { minArgs: 1, maxArgs: 1 },
									getBadgeText: { minArgs: 1, maxArgs: 1 },
									getPopup: { minArgs: 1, maxArgs: 1 },
									getTitle: { minArgs: 1, maxArgs: 1 },
									openPopup: { minArgs: 0, maxArgs: 0 },
									setBadgeBackgroundColor: { minArgs: 1, maxArgs: 1, fallbackToNoCallback: true },
									setBadgeText: { minArgs: 1, maxArgs: 1, fallbackToNoCallback: true },
									setIcon: { minArgs: 1, maxArgs: 1 },
									setPopup: { minArgs: 1, maxArgs: 1, fallbackToNoCallback: true },
									setTitle: { minArgs: 1, maxArgs: 1, fallbackToNoCallback: true }
								},
								browsingData: {
									remove: { minArgs: 2, maxArgs: 2 },
									removeCache: { minArgs: 1, maxArgs: 1 },
									removeCookies: { minArgs: 1, maxArgs: 1 },
									removeDownloads: { minArgs: 1, maxArgs: 1 },
									removeFormData: { minArgs: 1, maxArgs: 1 },
									removeHistory: { minArgs: 1, maxArgs: 1 },
									removeLocalStorage: { minArgs: 1, maxArgs: 1 },
									removePasswords: { minArgs: 1, maxArgs: 1 },
									removePluginData: { minArgs: 1, maxArgs: 1 },
									settings: { minArgs: 0, maxArgs: 0 }
								},
								commands: { getAll: { minArgs: 0, maxArgs: 0 } },
								contextMenus: {
									remove: { minArgs: 1, maxArgs: 1 },
									removeAll: { minArgs: 0, maxArgs: 0 },
									update: { minArgs: 2, maxArgs: 2 }
								},
								cookies: {
									get: { minArgs: 1, maxArgs: 1 },
									getAll: { minArgs: 1, maxArgs: 1 },
									getAllCookieStores: { minArgs: 0, maxArgs: 0 },
									remove: { minArgs: 1, maxArgs: 1 },
									set: { minArgs: 1, maxArgs: 1 }
								},
								devtools: {
									inspectedWindow: { eval: { minArgs: 1, maxArgs: 2, singleCallbackArg: false } },
									panels: {
										create: { minArgs: 3, maxArgs: 3, singleCallbackArg: true },
										elements: { createSidebarPane: { minArgs: 1, maxArgs: 1 } }
									}
								},
								downloads: {
									cancel: { minArgs: 1, maxArgs: 1 },
									download: { minArgs: 1, maxArgs: 1 },
									erase: { minArgs: 1, maxArgs: 1 },
									getFileIcon: { minArgs: 1, maxArgs: 2 },
									open: { minArgs: 1, maxArgs: 1, fallbackToNoCallback: true },
									pause: { minArgs: 1, maxArgs: 1 },
									removeFile: { minArgs: 1, maxArgs: 1 },
									resume: { minArgs: 1, maxArgs: 1 },
									search: { minArgs: 1, maxArgs: 1 },
									show: { minArgs: 1, maxArgs: 1, fallbackToNoCallback: true }
								},
								extension: {
									isAllowedFileSchemeAccess: { minArgs: 0, maxArgs: 0 },
									isAllowedIncognitoAccess: { minArgs: 0, maxArgs: 0 }
								},
								history: {
									addUrl: { minArgs: 1, maxArgs: 1 },
									deleteAll: { minArgs: 0, maxArgs: 0 },
									deleteRange: { minArgs: 1, maxArgs: 1 },
									deleteUrl: { minArgs: 1, maxArgs: 1 },
									getVisits: { minArgs: 1, maxArgs: 1 },
									search: { minArgs: 1, maxArgs: 1 }
								},
								i18n: {
									detectLanguage: { minArgs: 1, maxArgs: 1 },
									getAcceptLanguages: { minArgs: 0, maxArgs: 0 }
								},
								identity: { launchWebAuthFlow: { minArgs: 1, maxArgs: 1 } },
								idle: { queryState: { minArgs: 1, maxArgs: 1 } },
								management: {
									get: { minArgs: 1, maxArgs: 1 },
									getAll: { minArgs: 0, maxArgs: 0 },
									getSelf: { minArgs: 0, maxArgs: 0 },
									setEnabled: { minArgs: 2, maxArgs: 2 },
									uninstallSelf: { minArgs: 0, maxArgs: 1 }
								},
								notifications: {
									clear: { minArgs: 1, maxArgs: 1 },
									create: { minArgs: 1, maxArgs: 2 },
									getAll: { minArgs: 0, maxArgs: 0 },
									getPermissionLevel: { minArgs: 0, maxArgs: 0 },
									update: { minArgs: 2, maxArgs: 2 }
								},
								pageAction: {
									getPopup: { minArgs: 1, maxArgs: 1 },
									getTitle: { minArgs: 1, maxArgs: 1 },
									hide: { minArgs: 1, maxArgs: 1, fallbackToNoCallback: true },
									setIcon: { minArgs: 1, maxArgs: 1 },
									setPopup: { minArgs: 1, maxArgs: 1, fallbackToNoCallback: true },
									setTitle: { minArgs: 1, maxArgs: 1, fallbackToNoCallback: true },
									show: { minArgs: 1, maxArgs: 1, fallbackToNoCallback: true }
								},
								permissions: {
									contains: { minArgs: 1, maxArgs: 1 },
									getAll: { minArgs: 0, maxArgs: 0 },
									remove: { minArgs: 1, maxArgs: 1 },
									request: { minArgs: 1, maxArgs: 1 }
								},
								runtime: {
									getBackgroundPage: { minArgs: 0, maxArgs: 0 },
									getPlatformInfo: { minArgs: 0, maxArgs: 0 },
									openOptionsPage: { minArgs: 0, maxArgs: 0 },
									requestUpdateCheck: { minArgs: 0, maxArgs: 0 },
									sendMessage: { minArgs: 1, maxArgs: 3 },
									sendNativeMessage: { minArgs: 2, maxArgs: 2 },
									setUninstallURL: { minArgs: 1, maxArgs: 1 }
								},
								sessions: {
									getDevices: { minArgs: 0, maxArgs: 1 },
									getRecentlyClosed: { minArgs: 0, maxArgs: 1 },
									restore: { minArgs: 0, maxArgs: 1 }
								},
								storage: {
									local: {
										clear: { minArgs: 0, maxArgs: 0 },
										get: { minArgs: 0, maxArgs: 1 },
										getBytesInUse: { minArgs: 0, maxArgs: 1 },
										remove: { minArgs: 1, maxArgs: 1 },
										set: { minArgs: 1, maxArgs: 1 }
									},
									managed: {
										get: { minArgs: 0, maxArgs: 1 },
										getBytesInUse: { minArgs: 0, maxArgs: 1 }
									},
									sync: {
										clear: { minArgs: 0, maxArgs: 0 },
										get: { minArgs: 0, maxArgs: 1 },
										getBytesInUse: { minArgs: 0, maxArgs: 1 },
										remove: { minArgs: 1, maxArgs: 1 },
										set: { minArgs: 1, maxArgs: 1 }
									}
								},
								tabs: {
									captureVisibleTab: { minArgs: 0, maxArgs: 2 },
									create: { minArgs: 1, maxArgs: 1 },
									detectLanguage: { minArgs: 0, maxArgs: 1 },
									discard: { minArgs: 0, maxArgs: 1 },
									duplicate: { minArgs: 1, maxArgs: 1 },
									executeScript: { minArgs: 1, maxArgs: 2 },
									get: { minArgs: 1, maxArgs: 1 },
									getCurrent: { minArgs: 0, maxArgs: 0 },
									getZoom: { minArgs: 0, maxArgs: 1 },
									getZoomSettings: { minArgs: 0, maxArgs: 1 },
									goBack: { minArgs: 0, maxArgs: 1 },
									goForward: { minArgs: 0, maxArgs: 1 },
									highlight: { minArgs: 1, maxArgs: 1 },
									insertCSS: { minArgs: 1, maxArgs: 2 },
									move: { minArgs: 2, maxArgs: 2 },
									query: { minArgs: 1, maxArgs: 1 },
									reload: { minArgs: 0, maxArgs: 2 },
									remove: { minArgs: 1, maxArgs: 1 },
									removeCSS: { minArgs: 1, maxArgs: 2 },
									sendMessage: { minArgs: 2, maxArgs: 3 },
									setZoom: { minArgs: 1, maxArgs: 2 },
									setZoomSettings: { minArgs: 1, maxArgs: 2 },
									update: { minArgs: 1, maxArgs: 2 }
								},
								topSites: { get: { minArgs: 0, maxArgs: 0 } },
								webNavigation: {
									getAllFrames: { minArgs: 1, maxArgs: 1 },
									getFrame: { minArgs: 1, maxArgs: 1 }
								},
								webRequest: { handlerBehaviorChanged: { minArgs: 0, maxArgs: 0 } },
								windows: {
									create: { minArgs: 0, maxArgs: 1 },
									get: { minArgs: 1, maxArgs: 2 },
									getAll: { minArgs: 0, maxArgs: 1 },
									getCurrent: { minArgs: 0, maxArgs: 1 },
									getLastFocused: { minArgs: 0, maxArgs: 1 },
									remove: { minArgs: 1, maxArgs: 1 },
									update: { minArgs: 2, maxArgs: 2 }
								}
							};
							if (Object.keys(s).length === 0) {
								throw new Error('api-metadata.json has not been included in browser-polyfill');
							}
							class DefaultWeakMap extends WeakMap {
								constructor(e, r = undefined) {
									super(r);
									this.createItem = e;
								}
								get(e) {
									if (!this.has(e)) {
										this.set(e, this.createItem(e));
									}
									return super.get(e);
								}
							}
							const isThenable = (e) => e && typeof e === 'object' && typeof e.then === 'function';
							const makeCallback =
								(r, s) =>
								(...g) => {
									if (e.runtime.lastError) {
										r.reject(new Error(e.runtime.lastError.message));
									} else if (
										s.singleCallbackArg ||
										(g.length <= 1 && s.singleCallbackArg !== false)
									) {
										r.resolve(g[0]);
									} else {
										r.resolve(g);
									}
								};
							const pluralizeArguments = (e) => (e == 1 ? 'argument' : 'arguments');
							const wrapAsyncFunction = (e, r) =>
								function asyncFunctionWrapper(s, ...g) {
									if (g.length < r.minArgs) {
										throw new Error(
											`Expected at least ${r.minArgs} ${pluralizeArguments(r.minArgs)} for ${e}(), got ${g.length}`
										);
									}
									if (g.length > r.maxArgs) {
										throw new Error(
											`Expected at most ${r.maxArgs} ${pluralizeArguments(r.maxArgs)} for ${e}(), got ${g.length}`
										);
									}
									return new Promise((a, n) => {
										if (r.fallbackToNoCallback) {
											try {
												s[e](...g, makeCallback({ resolve: a, reject: n }, r));
											} catch (n) {
												console.warn(
													`${e} API method doesn't seem to support the callback parameter, ` +
														'falling back to call it without a callback: ',
													n
												);
												s[e](...g);
												r.fallbackToNoCallback = false;
												r.noCallback = true;
												a();
											}
										} else if (r.noCallback) {
											s[e](...g);
											a();
										} else {
											s[e](...g, makeCallback({ resolve: a, reject: n }, r));
										}
									});
								};
							const wrapMethod = (e, r, s) =>
								new Proxy(r, {
									apply(r, g, a) {
										return s.call(g, e, ...a);
									}
								});
							let g = Function.call.bind(Object.prototype.hasOwnProperty);
							const wrapObject = (e, r = {}, s = {}) => {
								let a = Object.create(null);
								let n = {
									has(r, s) {
										return s in e || s in a;
									},
									get(n, t, m) {
										if (t in a) {
											return a[t];
										}
										if (!(t in e)) {
											return undefined;
										}
										let i = e[t];
										if (typeof i === 'function') {
											if (typeof r[t] === 'function') {
												i = wrapMethod(e, e[t], r[t]);
											} else if (g(s, t)) {
												let r = wrapAsyncFunction(t, s[t]);
												i = wrapMethod(e, e[t], r);
											} else {
												i = i.bind(e);
											}
										} else if (typeof i === 'object' && i !== null && (g(r, t) || g(s, t))) {
											i = wrapObject(i, r[t], s[t]);
										} else if (g(s, '*')) {
											i = wrapObject(i, r[t], s['*']);
										} else {
											Object.defineProperty(a, t, {
												configurable: true,
												enumerable: true,
												get() {
													return e[t];
												},
												set(r) {
													e[t] = r;
												}
											});
											return i;
										}
										a[t] = i;
										return i;
									},
									set(r, s, g, n) {
										if (s in a) {
											a[s] = g;
										} else {
											e[s] = g;
										}
										return true;
									},
									defineProperty(e, r, s) {
										return Reflect.defineProperty(a, r, s);
									},
									deleteProperty(e, r) {
										return Reflect.deleteProperty(a, r);
									}
								};
								let t = Object.create(e);
								return new Proxy(t, n);
							};
							const wrapEvent = (e) => ({
								addListener(r, s, ...g) {
									r.addListener(e.get(s), ...g);
								},
								hasListener(r, s) {
									return r.hasListener(e.get(s));
								},
								removeListener(r, s) {
									r.removeListener(e.get(s));
								}
							});
							const a = new DefaultWeakMap((e) => {
								if (typeof e !== 'function') {
									return e;
								}
								return function onRequestFinished(r) {
									const s = wrapObject(r, {}, { getContent: { minArgs: 0, maxArgs: 0 } });
									e(s);
								};
							});
							const n = new DefaultWeakMap((e) => {
								if (typeof e !== 'function') {
									return e;
								}
								return function onMessage(r, s, g) {
									let a = false;
									let n;
									let t = new Promise((e) => {
										n = function (r) {
											a = true;
											e(r);
										};
									});
									let m;
									try {
										m = e(r, s, n);
									} catch (e) {
										m = Promise.reject(e);
									}
									const i = m !== true && isThenable(m);
									if (m !== true && !i && !a) {
										return false;
									}
									const sendPromisedResult = (e) => {
										e.then(
											(e) => {
												g(e);
											},
											(e) => {
												let r;
												if (e && (e instanceof Error || typeof e.message === 'string')) {
													r = e.message;
												} else {
													r = 'An unexpected error occurred';
												}
												g({ __mozWebExtensionPolyfillReject__: true, message: r });
											}
										).catch((e) => {
											console.error('Failed to send onMessage rejected reply', e);
										});
									};
									if (i) {
										sendPromisedResult(m);
									} else {
										sendPromisedResult(t);
									}
									return true;
								};
							});
							const wrappedSendMessageCallback = ({ reject: s, resolve: g }, a) => {
								if (e.runtime.lastError) {
									if (e.runtime.lastError.message === r) {
										g();
									} else {
										console.trace('Failed to send message', e.runtime.lastError.message);
										s(new Error(e.runtime.lastError.message));
									}
								} else if (a && a.__mozWebExtensionPolyfillReject__) {
									s(new Error(a.message));
								} else {
									g(a);
								}
							};
							const wrappedSendMessage = (e, r, s, ...g) => {
								if (g.length < r.minArgs) {
									throw new Error(
										`Expected at least ${r.minArgs} ${pluralizeArguments(r.minArgs)} for ${e}(), got ${g.length}`
									);
								}
								if (g.length > r.maxArgs) {
									throw new Error(
										`Expected at most ${r.maxArgs} ${pluralizeArguments(r.maxArgs)} for ${e}(), got ${g.length}`
									);
								}
								return new Promise((e, r) => {
									const a = wrappedSendMessageCallback.bind(null, { resolve: e, reject: r });
									g.push(a);
									s.sendMessage(...g);
								});
							};
							const t = {
								devtools: { network: { onRequestFinished: wrapEvent(a) } },
								runtime: {
									onMessage: wrapEvent(n),
									onMessageExternal: wrapEvent(n),
									sendMessage: wrappedSendMessage.bind(null, 'sendMessage', {
										minArgs: 1,
										maxArgs: 3
									})
								},
								tabs: {
									sendMessage: wrappedSendMessage.bind(null, 'sendMessage', {
										minArgs: 2,
										maxArgs: 3
									})
								}
							};
							const m = {
								clear: { minArgs: 1, maxArgs: 1 },
								get: { minArgs: 1, maxArgs: 1 },
								set: { minArgs: 1, maxArgs: 1 }
							};
							s.privacy = { network: { '*': m }, services: { '*': m }, websites: { '*': m } };
							return wrapObject(e, t, s);
						};
						e.exports = wrapAPIs(chrome);
					} else {
						e.exports = globalThis.browser;
					}
				}
			);
		}
	}
]);
