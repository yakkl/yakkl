'use strict';
(self['webpackChunkwallet'] = self['webpackChunkwallet'] || []).push([
	[161],
	{
		2126: (t, e, n) => {
			n.d(e, { n: () => debug_log });
			function debug_log(t, ...e) {
				const n = new Error().stack;
				if (n) {
					const r = n.split('\n')[2].trim();
					console.log(`[Debug] ${r} - ${t}`, ...e);
				} else {
					console.log(t, ...e);
				}
			}
			function error_log(t, ...e) {
				const n = new Error().stack;
				if (n) {
					const r = n.split('\n')[2].trim();
					console.log(`[Error] ${r} - ${t}`, ...e);
				} else {
					console.log(t, ...e);
				}
			}
		},
		9336: (t, e, n) => {
			var r = n(5056);
			var o = n(6522);
			var i = n(1757);
			async function getPrimaryAccountByAddress(t) {
				if (!t) return null;
				const e = [];
				if (!e) return null;
				const n = e.find((e) => e.address === t);
				return n || null;
			}
			function encodeJSON(t) {
				const e = JSON.stringify(t, (t, e) => {
					if (typeof e === 'bigint') {
						return e.toString() + 'n';
					}
					if (typeof e === 'object' && e !== null && Object.keys(e).length === 0) {
						return '{}';
					}
					return e;
				});
				return e;
			}
			function decodeJSON(t) {
				return JSON.parse(t, (t, e) => {
					if (typeof e === 'string' && /^\d+n$/.test(e)) {
						return BigInt(e.slice(0, -1));
					}
					return e;
				});
			}
			function parseWithBigInt(t) {
				return JSON.parse(t, (t, e) =>
					typeof e === 'string' && /^\d+n$/.test(e) ? BigInt(e.slice(0, -1)) : e
				);
			}
			function isJSONSerializable(t) {
				return (
					t === null ||
					typeof t === 'boolean' ||
					typeof t === 'number' ||
					typeof t === 'string' ||
					Array.isArray(t) ||
					(typeof t === 'object' &&
						Object.prototype.toString.call(t) === '[object Object]' &&
						(Object.getPrototypeOf(t) === null || Object.getPrototypeOf(t) === Object.prototype))
				);
			}
			function isNull(t) {
				return t === null;
			}
			function isUndefined(t) {
				return t === undefined;
			}
			function isEmptyObject(t) {
				return (
					t && typeof t === 'object' && Object.keys(t).length === 0 && t.constructor === Object
				);
			}
			function isEmptyNullOrUndefined(t) {
				return (
					t === null ||
					t === undefined ||
					(typeof t === 'object' && Object.keys(t).length === 0 && t.constructor === Object)
				);
			}
			function isValidJSON(t) {
				try {
					JSON.parse(t);
					return true;
				} catch {
					return false;
				}
			}
			function isEncryptedData(t) {
				return (
					!isEmptyNullOrUndefined(t) &&
					typeof t.iv === 'string' &&
					typeof t.data === 'string' &&
					typeof t.salt === 'string'
				);
			}
			function isProfileData(t) {
				return t.pincode !== undefined;
			}
			function isMetaData(t) {
				return t !== null && typeof t === 'object';
			}
			function isString(t) {
				return typeof t === 'string';
			}
			function isCurrentlySelectedData(t) {
				return t.profile !== undefined;
			}
			function isPrimaryAccountData(t) {
				return t.privateKey !== undefined;
			}
			function isYakklPrimaryAccount(t) {
				return t && t.subAccounts !== undefined;
			}
			function isYakklAccount(t) {
				return t && t.accountType !== undefined;
			}
			function isJsonObject(t) {
				return t !== null && typeof t === 'object' && !Array.isArray(t);
			}
			async function isPromiseJson(t) {
				try {
					const e = await t;
					return isJsonObject(e);
				} catch {
					return false;
				}
			}
			function isBigNumber(t) {
				return t instanceof BigNumber;
			}
			function isBigNumberish(t) {
				return (
					typeof t === 'number' ||
					(typeof t === 'string' && /^-?\d+$/.test(t)) ||
					typeof t === 'bigint' ||
					isBigNumber(t)
				);
			}
			function toHex(t) {
				if (isBigNumber(t)) {
					return t.toHex();
				}
				const e = BigNumber.from(t).toHex();
				return e.length % 2 === 0 ? e : '0x0' + e.slice(2);
			}
			function convertToHexStrings(t, e = []) {
				const n = new Set(e);
				function shouldSkip(t) {
					const e = t.join('.');
					return Array.from(n).some((t) => e.startsWith(t));
				}
				function convert(t, e = []) {
					if (shouldSkip(e)) {
						return t;
					}
					if (Array.isArray(t)) {
						return t.map((t, n) => convert(t, [...e, n.toString()]));
					} else if (t && typeof t === 'object' && !isBigNumber(t)) {
						const n = {};
						for (const r in t) {
							if (Object.prototype.hasOwnProperty.call(t, r)) {
								n[r] = convert(t[r], [...e, r]);
							}
						}
						return n;
					} else if (isBigNumberish(t)) {
						return toHex(t);
					}
					return t;
				}
				return convert(t);
			}
			function parseJsonOrObject(t) {
				if (t === null || t === undefined) {
					return null;
				}
				if (typeof t === 'object') {
					return t;
				}
				if (typeof t === 'string') {
					try {
						const e = JSON.parse(t);
						if (typeof e === 'object' && e !== null) {
							return e;
						}
					} catch (t) {
						console.log('Error parsing JSON string:', t);
						return null;
					}
				}
				return null;
			}
			async function resolveProperties(t) {
				const e = Object.keys(t).map(async (e) => {
					const n = t[e];
					const r = await Promise.resolve(n);
					return { key: e, value: r };
				});
				const n = await Promise.all(e);
				console.log('resolveProperties results', n);
				return n.reduce((t, e) => {
					t[e.key] = e.value;
					return t;
				}, {});
			}
			function checkProperties(t, e) {
				if (!t || typeof t !== 'object') {
					throw new Error('invalid object', t);
				}
				Object.keys(t).forEach((n) => {
					if (!e[n]) {
						throw new Error('invalid object key - ' + n, t);
					}
				});
			}
			function getOrDefault(t, e) {
				return t === undefined ? e : t;
			}
			const addHexPrefix = (t) => {
				if (typeof t !== 'string' || t.match(/^-?0x/u)) {
					return t;
				}
				if (t.match(/^-?0X/u)) {
					return t.replace('0X', '0x');
				}
				if (t.startsWith('-')) {
					return t.replace('-', '-0x');
				}
				return `0x${t}`;
			};
			const stripHexPrefix = (t) => {
				if (typeof t !== 'string')
					throw new Error(`[stripHexPrefix] input must be type 'string', received ${typeof t}`);
				return isHexPrefixed(t) ? t.slice(2) : t;
			};
			function isHexPrefixed(t) {
				if (typeof t !== 'string') {
					throw new Error(`[isHexPrefixed] input must be type 'string', received type ${typeof t}`);
				}
				return t[0] === '0' && t[1] === 'x';
			}
			function isHexString(t, e) {
				if (typeof t !== 'string' || !t.match(/^0x[0-9A-Fa-f]*$/)) {
					return false;
				}
				if (typeof e === 'number' && t.length !== 2 + 2 * e) {
					return false;
				}
				if (e === true && t.length % 2 !== 0) {
					return false;
				}
				return true;
			}
			function _getBytes(t, e, n) {
				try {
					if (t instanceof Uint8Array) {
						if (n) {
							return new Uint8Array(t);
						}
						return t;
					}
					if (typeof t === 'string' && t.match(/^0x([0-9a-f][0-9a-f])*$/i)) {
						const e = new Uint8Array((t.length - 2) / 2);
						let n = 2;
						for (let r = 0; r < e.length; r++) {
							e[r] = parseInt(t.substring(n, n + 2), 16);
							n += 2;
						}
						return e;
					}
					throw new Error('invalid BytesLike value');
				} catch (n) {
					if (n instanceof Error) {
						throw makeError(n.message, 'INVALID_ARGUMENT', { argument: e || 'value', value: t });
					} else {
						throw n;
					}
				}
			}
			function getBytes(t, e) {
				return _getBytes(t, e, false);
			}
			function getBytesCopy(t, e) {
				return _getBytes(t, e, true);
			}
			function isBytesLike(t) {
				return isHexString(t, true) || t instanceof Uint8Array;
			}
			const s = '0123456789abcdef';
			function hexlify(t) {
				const e = getBytes(t);
				let n = '0x';
				for (let t = 0; t < e.length; t++) {
					const r = e[t];
					n += s[(r & 240) >> 4] + s[r & 15];
				}
				return n;
			}
			function concat(t) {
				return '0x' + t.map((t) => hexlify(t).substring(2)).join('');
			}
			function dataLength(t) {
				if (isHexString(t, true)) {
					return (t.length - 2) / 2;
				}
				return getBytes(t).length;
			}
			function dataSlice(t, e, n) {
				const r = getBytes(t);
				if (n != null && n > r.length) {
				}
				return hexlify(r.slice(e == null ? 0 : e, n == null ? r.length : n));
			}
			const u = (0, r.A)((t) => {
				const e = new URL(t);
				if (e.pathname === '/popup.html') {
					return o.khR.POPUP;
				} else if (['/index.html'].includes(e.pathname)) {
					return o.khR.BROWSER;
				} else if (e.pathname === '/notification.html') {
					return o.khR.NOTIFICATION;
				}
				return o.khR.BACKGROUND;
			});
			const getEnvironmentType = (t = window.location.href) => u(t);
			const getPlatform = () => {
				const { navigator: t } = window;
				const { userAgent: e } = t;
				if (e.includes('Firefox')) {
					return PLATFORM_TYPES.FIREFOX;
				} else if ('brave' in t) {
					return PLATFORM_TYPES.BRAVE;
				} else if (e.includes('Edg/')) {
					return PLATFORM_TYPES.EDGE;
				} else if (e.includes('OPR')) {
					return PLATFORM_TYPES.OPERA;
				}
				return PLATFORM_TYPES.CHROME;
			};
			function extractFQDN(t) {
				try {
					if (!t) return '';
					const e = new URL(t);
					return e.hostname;
				} catch (t) {
					console.log(t);
					return '';
				}
			}
		},
		9055: (t, e, n) => {
			n.d(e, { vO: () => supportedChainId });
			var r = n(6522);
			var o = n(2443);
			var i = n(6934);
			function getUserId() {
				let t = localStorage.getItem('anonymous_user_id');
				if (!t) {
					t = crypto.randomUUID();
					localStorage.setItem('anonymous_user_id', t);
				}
				return t;
			}
			async function checkAccountRegistration() {
				try {
					const t = await getYakklAccounts();
					if (!t || t.length === 0) {
						return false;
					}
					const e = t.some(
						(t) =>
							t.accountType === AccountTypeCategory.PRIMARY ||
							t.accountType === AccountTypeCategory.IMPORTED
					);
					return e;
				} catch (t) {
					console.log('Error checking registration:', t);
					return false;
				}
			}
			function parseAmount(t, e) {
				const n = t.startsWith('.') ? `0${t}` : t;
				try {
					const [t, r = ''] = n.split('.');
					const o = r.slice(0, e).padEnd(e, '0');
					const i = `${t}${o}`;
					return BigInt(i);
				} catch (t) {
					console.log('Failed to parse amount:', t);
					return 0n;
				}
			}
			function parseAmountAlternative(t, e) {
				if (!t || t === '.' || t.trim() === '') {
					return 0n;
				}
				try {
					const n = Number(t);
					return BigInt(Math.round(n * 10 ** e));
				} catch (t) {
					console.log('Error parsing amount:', t);
					return 0n;
				}
			}
			function formatUsd(t) {
				return t.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
			}
			function formatAmount(t, e) {
				if (t === 0n) return '0';
				const n = Number(t) / Math.pow(10, e);
				return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: e });
			}
			function convertUsdToTokenAmount(t, e, n) {
				if (e <= 0) return '0';
				const r = t / e;
				return ethersv6.formatUnits(ethersv6.parseUnits(r.toFixed(n), n), n);
			}
			function convertTokenToUsd(t, e) {
				if (e <= 0) return 0;
				return t * e;
			}
			function typewriter(t, { speed: e = 1 }) {
				if (t.childNodes.length !== 1 || t.childNodes[0].nodeType !== Node.TEXT_NODE) {
					throw new Error(`This transition only works on elements with a single text node child`);
				}
				const n = t.textContent ?? '';
				const r = n.length / (e * 0.01);
				return {
					duration: r,
					tick: (e) => {
						const r = Math.trunc(n.length * e);
						t.textContent = n.slice(0, r);
					}
				};
			}
			function supportedChainId(t) {
				switch (t) {
					case 1:
					case 5:
					case 11155111:
						return true;
					default:
						break;
				}
				return false;
			}
			function toHexChainId(t) {
				return `0x${t.toString(16)}`;
			}
			const gweiToWeiHex = (t) => `0x${(t * 1e9).toString(16)}`;
			const wait = (t) => new Promise((e) => setTimeout(e, t));
			function parseErrorMessageFromJSON(t) {
				try {
					const e = JSON.parse(t);
					if (e.body) {
						const t = JSON.parse(e.body);
						return t.error ?? null;
					}
					if (e.reason) {
						return e.reason;
					}
					return e;
				} catch (t) {
					console.log('Failed to parse errorMessage, body or error:', t);
				}
				return null;
			}
			function getLengthInBytes(t) {
				if (typeof t === 'string' && t !== '0x') {
					if (t.startsWith('0x')) return Math.round(t.length / 2);
					return t.length;
				}
				return 0;
			}
		}
	}
]);
