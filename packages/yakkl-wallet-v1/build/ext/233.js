(self['webpackChunkwallet'] = self['webpackChunkwallet'] || []).push([
	[233],
	{
		5818: (e, t, r) => {
			'use strict';
			r.d(t, { G: () => getBrowserExt });
			let n;
			function isBrowserExtensionEnvironment() {
				return (
					typeof globalThis !== 'undefined' &&
					(('browser' in globalThis && 'runtime' in globalThis.browser) ||
						('chrome' in globalThis && 'runtime' in globalThis.chrome))
				);
			}
			function getBrowserExt() {
				if (!n) {
					if (isBrowserExtensionEnvironment()) {
						if (typeof globalThis.browser !== 'undefined') {
							n = globalThis.browser;
						} else if (typeof globalThis.chrome !== 'undefined') {
							n = globalThis.chrome;
						} else {
							throw new Error('Unable to find browser extension API');
						}
					} else {
						console.log('Not in a browser extension environment');
					}
				}
				return n;
			}
		},
		1757: (e, t, r) => {
			'use strict';
			r.d(t, { g: () => BigNumber });
			var n;
			(function (e) {
				e['USD'] = 'USD';
				e['EUR'] = 'EUR';
				e['GBP'] = 'GBP';
			})(n || (n = {}));
			class BigNumber {
				_value;
				constructor(e = null) {
					this._value = e;
				}
				get value() {
					return this._value;
				}
				set value(e) {
					this._value = e;
				}
				compare(e) {
					const t = this.toBigInt();
					const r = BigNumber.from(e).toBigInt();
					if (t === null || r === null) {
						throw new Error('Cannot compare null values');
					}
					if (t < r) return -1;
					if (t > r) return 1;
					return 0;
				}
				static isBigNumber(e) {
					return e instanceof BigNumber;
				}
				static isHexObject(e) {
					return typeof e === 'object' && e !== null && 'hex' in e && 'type' in e;
				}
				toNumber() {
					if (this._value === null) {
						return null;
					}
					if (typeof this._value === 'string' || typeof this._value === 'number') {
						return Number(this._value);
					}
					if (typeof this._value === 'bigint') {
						return Number(this._value);
					}
					if (BigNumber.isBigNumber(this._value)) {
						return this._value.toNumber();
					}
					if (BigNumber.isHexObject(this._value)) {
						return Number(BigInt(this._value.hex));
					}
					return null;
				}
				toBigInt() {
					if (this._value === null) {
						return null;
					}
					if (typeof this._value === 'string') {
						return BigInt(this._value);
					}
					if (typeof this._value === 'number') {
						return BigInt(this._value);
					}
					if (typeof this._value === 'bigint') {
						return this._value;
					}
					if (BigNumber.isBigNumber(this._value)) {
						return this._value.toBigInt();
					}
					if (BigNumber.isHexObject(this._value)) {
						return BigInt(this._value.hex);
					}
					return null;
				}
				fromValue(e) {
					this._value = e;
				}
				max(e) {
					return BigNumber.max(this._value, e);
				}
				min(e) {
					return BigNumber.min(this._value, e);
				}
				add(e) {
					return BigNumber.add(this._value, e);
				}
				subtract(e) {
					return BigNumber.subtract(this._value, e);
				}
				sub(e) {
					return this.subtract(e);
				}
				div(e) {
					return BigNumber.div(this._value, e);
				}
				mul(e) {
					return BigNumber.mul(this._value, e);
				}
				mod(e) {
					return BigNumber.mod(this._value, e);
				}
				toString() {
					const e = this.toBigInt();
					if (e === null) {
						return '';
					}
					return e.toString();
				}
				toHex(e = true) {
					if (this._value === null) {
						return '';
					}
					if (typeof this._value === 'string') {
						return this._value;
					}
					const t = this.toBigInt();
					if (t === null) {
						return '';
					}
					let r = t.toString(16);
					if (e && r.length % 2 !== 0) {
						r = '0' + r;
					}
					return '0x' + r;
				}
				static from(e) {
					if (BigNumber.isHexObject(e)) {
						return new BigNumber(BigInt(e.hex));
					}
					return new BigNumber(e);
				}
				static toNumber(e) {
					if (e === null) {
						return null;
					}
					if (typeof e === 'string' || typeof e === 'number') {
						return Number(e);
					}
					if (typeof e === 'bigint') {
						return Number(e);
					}
					if (BigNumber.isBigNumber(e)) {
						return e.toNumber();
					}
					if (BigNumber.isHexObject(e)) {
						return Number(BigInt(e.hex));
					}
					return null;
				}
				static toBigInt(e, t = 18) {
					if (e === null) {
						return null;
					}
					if (typeof e === 'number') {
						if (!Number.isInteger(e)) {
							const r = Math.pow(10, t);
							return BigInt(Math.round(e * r));
						} else {
							return BigInt(e);
						}
					}
					if (typeof e === 'string') {
						if (e.includes('.')) {
							const [r, n = ''] = e.split('.');
							const i = BigInt('1' + '0'.repeat(t));
							const a = BigInt(r) * i + BigInt((n + '0'.repeat(t)).slice(0, t));
							return a;
						} else {
							return BigInt(e);
						}
					}
					if (typeof e === 'bigint') {
						return e;
					}
					if (BigNumber.isBigNumber(e)) {
						return e.toBigInt();
					}
					if (BigNumber.isHexObject(e)) {
						return BigInt(e.hex);
					}
					return null;
				}
				static max(e, t) {
					const r = BigNumber.toBigInt(e);
					const n = BigNumber.toBigInt(t);
					if (r === null || n === null) {
						throw new Error('Invalid BigNumberish value');
					}
					return new BigNumber(r > n ? r : n);
				}
				static min(e, t) {
					const r = BigNumber.toBigInt(e);
					const n = BigNumber.toBigInt(t);
					if (r === null || n === null) {
						throw new Error('Invalid BigNumberish value');
					}
					return new BigNumber(r < n ? r : n);
				}
				static add(e, t) {
					const r = BigNumber.toBigInt(e);
					const n = BigNumber.toBigInt(t);
					if (r === null || n === null) {
						throw new Error('Invalid BigNumberish value');
					}
					return new BigNumber(r + n);
				}
				static subtract(e, t) {
					const r = BigNumber.toBigInt(e);
					const n = BigNumber.toBigInt(t);
					if (r === null || n === null) {
						throw new Error('Invalid BigNumberish value');
					}
					return new BigNumber(r - n);
				}
				static sub(e, t) {
					return BigNumber.subtract(e, t);
				}
				static div(e, t) {
					const r = BigNumber.toBigInt(e);
					const n = BigNumber.toBigInt(t);
					if (r === null || n === null || n === BigInt(0)) {
						throw new Error('Invalid BigNumberish value or division by zero');
					}
					return new BigNumber(r / n);
				}
				static mul(e, t) {
					const r = BigNumber.toBigInt(e);
					const n = BigNumber.toBigInt(t);
					if (r === null || n === null) {
						throw new Error('Invalid BigNumberish value');
					}
					return new BigNumber(r * n);
				}
				static mod(e, t) {
					const r = BigNumber.toBigInt(e);
					const n = BigNumber.toBigInt(t);
					if (r === null || n === null || n === BigInt(0)) {
						throw new Error('Invalid BigNumberish value or modulus by zero');
					}
					return new BigNumber(r % n);
				}
				static toHex(e) {
					const t = BigNumber.toBigInt(e);
					if (t === null) {
						throw new Error('Invalid BigNumberish value');
					}
					return '0x' + t.toString(16);
				}
				static fromHex(e) {
					if (typeof e !== 'string' || !/^0x[0-9a-fA-F]+$/.test(e)) {
						throw new Error('Invalid hex string');
					}
					return new BigNumber(BigInt(e));
				}
				toFiat(e) {
					const t = this.toNumber();
					if (t === null) {
						throw new Error('Invalid BigNumberish value');
					}
					return t * e;
				}
				toFormattedFiat(e, t, r = '') {
					const n = this.toFiat(e);
					const i = new Intl.NumberFormat(r || undefined, { style: 'currency', currency: t });
					return i.format(n);
				}
			}
		},
		5713: (e, t, r) => {
			'use strict';
			function colorLog(e, t) {
				let r = t || n.FgBlack;
				switch (t) {
					case 'success':
						r = n.FgGreen;
						break;
					case 'info':
						r = n.FgBlue;
						break;
					case 'error':
						r = n.FgRed;
						break;
					case 'warning':
						r = n.FgYellow;
						break;
				}
				console.log(r, e);
			}
			const n = {
				Reset: '[0m',
				Bright: '[1m',
				Dim: '[2m',
				Underscore: '[4m',
				Blink: '[5m',
				Reverse: '[7m',
				Hidden: '[8m',
				FgBlack: '[30m',
				FgRed: '[31m',
				FgGreen: '[32m',
				FgYellow: '[33m',
				FgBlue: '[34m',
				FgMagenta: '[35m',
				FgCyan: '[36m',
				FgWhite: '[37m',
				BgBlack: '[40m',
				BgRed: '[41m',
				BgGreen: '[42m',
				BgYellow: '[43m',
				BgBlue: '[44m',
				BgMagenta: '[45m',
				BgCyan: '[46m',
				BgWhite: '[47m'
			};
		},
		3689: (e, t, r) => {
			'use strict';
			r.d(t, { O2: () => dateString });
			function dateString() {
				return new Date().toISOString();
			}
			function getTime() {
				return new Date().getTime();
			}
			function formatDate(e) {
				return e.toLocaleString();
			}
			function formatTimestamp(
				e,
				{
					placeholder: t = '------',
					locale: r = 'en-US',
					options: n = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
				} = {}
			) {
				try {
					if (e === undefined || (typeof e === 'number' && Number.isNaN(e))) {
						return t;
					}
					let i;
					if (typeof e === 'string' || typeof e === 'number') {
						i = new Date(e);
						if (isNaN(i.getTime())) {
							return t;
						}
					} else if (e instanceof Date) {
						i = e;
					} else {
						return t;
					}
					return new Intl.DateTimeFormat(r, n).format(i);
				} catch (e) {
					console.log(e);
					return t;
				}
			}
		},
		469: (e, t, r) => {
			'use strict';
			var n = r(6522);
			var i = r(6533);
			const a = false;
			let s;
			if (typeof window !== 'undefined' && window.crypto) {
				s = window.crypto;
			} else if (typeof r.g !== 'undefined' && r.g?.crypto) {
				s = r.g.crypto;
			} else if (true) {
				s = r(4215).webcrypto;
			} else {
			}
			function bufferToBase64(e) {
				return Buffer.from(e).toString('base64');
			}
			function base64ToBuffer(e) {
				return Buffer.from(e, 'base64');
			}
			async function generateSalt() {
				const e = s.getRandomValues(new Uint8Array(64));
				return bufferToBase64(e);
			}
			async function digestMessage(e) {
				const t = new TextEncoder();
				const r = t.encode(e);
				const n = await s.subtle.digest('SHA-256', r);
				const i = Array.from(new Uint8Array(n));
				const a = i.map((e) => e.toString(16).padStart(2, '0')).join('');
				return a;
			}
			async function deriveKeyFromPassword(e, t) {
				const { crypto: r } = window;
				const n = t || (await generateSalt());
				const i = new TextEncoder();
				const a = await r.subtle.importKey('raw', i.encode(e), { name: 'PBKDF2' }, false, [
					'deriveKey'
				]);
				const s = await r.subtle.deriveKey(
					{ name: 'PBKDF2', salt: i.encode(n), iterations: 1e6, hash: 'SHA-256' },
					a,
					{ name: 'AES-GCM', length: 256 },
					false,
					['encrypt', 'decrypt']
				);
				return { key: s, salt: n };
			}
			function encodeJSON(e) {
				return JSON.stringify(e, (e, t) => {
					if (typeof t === 'bigint') {
						return t.toString();
					}
					return t;
				});
			}
			async function encryptData(e, t) {
				try {
					if (!e) {
						throw new Error('Missing data to encrypt');
					}
					if (!t) {
						throw new Error('Missing password or key to encrypt data');
					}
					const { key: r, salt: n } = typeof t === 'string' ? await deriveKeyFromPassword(t) : t;
					const i = new TextEncoder();
					const a = s.getRandomValues(new Uint8Array(16));
					const o = i.encode(encodeJSON(e));
					const c = await s.subtle.encrypt({ name: 'AES-GCM', iv: a }, r, o);
					return { data: bufferToBase64(new Uint8Array(c)), iv: bufferToBase64(a), salt: n };
				} catch (e) {
					console.log('Error encrypting data:', e);
					throw e;
				}
			}
			async function decryptData(e, t) {
				try {
					if (!t) {
						throw new Error('Missing password or key to decrypt data');
					}
					const { data: r, iv: n, salt: i } = e;
					const { key: a } = typeof t === 'string' ? await deriveKeyFromPassword(t, i) : t;
					const o = await s.subtle.decrypt(
						{ name: 'AES-GCM', iv: base64ToBuffer(n) },
						a,
						base64ToBuffer(r)
					);
					const c = new TextDecoder().decode(o);
					return JSON.parse(c);
				} catch (e) {
					console.log('Error decrypting data:', e);
					throw e;
				}
			}
		},
		142: (e, t, r) => {
			'use strict';
			var n = r(2935);
			var i = r(9336);
			var a = r(1757);
			var s = r(8121);
			const o = '0123456789abcdef';
			const c = BigInt(0);
			const l = BigInt(1);
			const h = BigInt(2) ** BigInt(256) - BigInt(1);
			function convertBasisPointsToDecimal(e) {
				try {
					if (e < 1) {
						return e;
					}
					return e / 1e4;
				} catch (e) {
					return 0;
				}
			}
			function hexToBigNumberish(e) {
				return BigInt(stripHexPrefix(e));
			}
			function bigNumberishMultiplyByFraction(e, t, r) {
				try {
					const n = getBigInt(e);
					const i = getBigInt(t);
					const a = getBigInt(r);
					return (n * i) / a;
				} catch (t) {
					if (t instanceof Error) {
						throw makeError(t.message, 'NUMERIC_FAULT', {
							fault: 'overflow',
							operation: 'bigNumberishMultiplyByFraction',
							value: e
						});
					} else {
						throw t;
					}
				}
			}
			function bigNumberishToHex(e) {
				if (e === null) {
					throw new Error('value cannot be null');
				}
				return addHexPrefix(e.toString(16));
			}
			function getBigInt(e, t) {
				try {
					if (e === null) {
						throw new Error('value cannot be null');
					}
					switch (typeof e) {
						case 'bigint':
							return e;
						case 'number':
							if (!Number.isInteger(e)) {
								throw new Error('underflow');
							}
							if (e < -h || e > h) {
								throw new Error('overflow');
							}
							return BigInt(e);
						case 'string':
							if (e === '') {
								throw new Error('empty string');
							}
							if (e[0] === '-' && e[1] !== '-') {
								return -BigInt(e.substring(1));
							}
							if (e === '0' || e === '0.0' || e === '0.00') {
								return 0n;
							}
							return BigInt(e);
						default:
							throw new Error('invalid BigNumberish value');
					}
				} catch (r) {
					if (r instanceof Error) {
						throw makeError(r.message, 'INVALID_ARGUMENT', { argument: t || 'value', value: e });
					} else {
						throw r;
					}
				}
			}
			function getUint(e, t) {
				try {
					const r = getBigInt(e, t);
					if (r < c) {
						throw new Error('unsigned value cannot be negative');
					}
					return r;
				} catch (t) {
					if (t instanceof Error) {
						throw makeError(t.message, 'NUMERIC_FAULT', {
							fault: 'overflow',
							operation: 'getUint',
							value: e
						});
					} else {
						throw t;
					}
				}
			}
			function toBigInt(e, t) {
				if (e instanceof Uint8Array) {
					let t = '0x0';
					for (const r of e) {
						t += o[r >> 4];
						t += o[r & 15];
					}
					return BigInt(t);
				}
				if (typeof e === 'number') {
					if (t !== undefined) return numberToBigInt(e, t);
				}
				if (typeof e === 'string') {
					if (t !== undefined) return stringToBigInt(e, t);
				}
				return getBigInt(e);
			}
			function stringToBigInt(e, t = 18) {
				if (!e || isNaN(Number(e))) {
					debug_log(`Invalid input: "${e}" is not a valid number string.`);
					return 0n;
				}
				const [r, n = ''] = e.split('.');
				const i = n.padEnd(t, '0').slice(0, t);
				const a = r + i;
				return BigInt(a);
			}
			function numberToBigInt(e, t = 18) {
				if (isNaN(e) || t < 0) {
					debug_log('Invalid input: amount must be a number, and decimals must be non-negative');
					return 0n;
				}
				const r = Math.pow(10, t);
				const n = Math.round(e * r);
				return BigInt(n);
			}
			function safeConvertToBigInt(e) {
				try {
					if (e === null || e === undefined) return undefined;
					if (typeof e === 'bigint') return e;
					if (e instanceof BigNumber) {
						return BigInt(e.toString());
					}
					if (typeof e === 'object' && e !== null && '_hex' in e) {
						return BigInt(e._hex);
					}
					return toBigInt(e);
				} catch {
					return 0n;
				}
			}
			function getNumber(e, t) {
				try {
					switch (typeof e) {
						case 'bigint':
							if (e < -h || e > h) {
								throw new Error('overflow');
							}
							return Number(e);
						case 'number':
							if (!Number.isInteger(e)) {
								throw new Error('underflow');
							}
							if (e < -h || e > h) {
								throw new Error('overflow');
							}
							return e;
						case 'string':
							if (e === '') {
								throw new Error('empty string');
							}
							return getNumber(BigInt(e), t);
						default:
							throw new Error('invalid numeric value');
					}
				} catch (r) {
					if (r instanceof Error) {
						throw makeError(r.message, 'INVALID_ARGUMENT', { argument: t || 'value', value: e });
					} else {
						throw r;
					}
				}
			}
			function toNumber(e) {
				return getNumber(toBigInt(e));
			}
			function toBeHex(e, t) {
				try {
					const r = getUint(e, 'value');
					let n = r.toString(16);
					if (t == null) {
						if (n.length % 2) {
							n = '0' + n;
						}
					} else {
						const e = getNumber(t, 'width');
						if (e * 2 < n.length) {
							throw new Error(`value exceeds width (${e} bytes)`);
						}
						while (n.length < e * 2) {
							n = '0' + n;
						}
					}
					return '0x' + n;
				} catch (t) {
					if (t instanceof Error) {
						throw makeError(t.message, 'NUMERIC_FAULT', {
							operation: 'toBeHex',
							fault: 'overflow',
							value: e
						});
					} else {
						throw t;
					}
				}
			}
			function toBeArray(e) {
				const t = getUint(e, 'value');
				if (t === c) {
					return new Uint8Array([]);
				}
				let r = t.toString(16);
				if (r.length % 2) {
					r = '0' + r;
				}
				const n = new Uint8Array(r.length / 2);
				for (let e = 0; e < n.length; e++) {
					const t = e * 2;
					n[e] = parseInt(r.substring(t, t + 2), 16);
				}
				return n;
			}
			function toQuantity(e) {
				let t = hexlify(isBytesLike(e) ? e : toBeArray(e)).substring(2);
				while (t.startsWith('0')) {
					t = t.substring(1);
				}
				if (t === '') {
					t = '0';
				}
				return '0x' + t;
			}
			function multiplyNumeric(e, t) {
				const r = typeof e === 'bigint' ? e : BigInt(e);
				const n = typeof t === 'bigint' ? t : BigInt(t);
				const i = r * n;
				return i;
			}
		},
		8532: (e, t, r) => {
			'use strict';
			var n = r(6522);
			async function postWithBackoff(e, t, r = 1, n = DEV_BASE_DELAY) {
				return new Promise((i, a) => {
					fetch(e, {
						method: 'POST',
						body: JSON.stringify(t),
						headers: { 'Content-Type': 'application/json' }
					})
						.then((s) => {
							if (s.ok) {
								i(s);
							} else {
								if (r < DEV_MAX_RETRIES) {
									const s = n * 2;
									setTimeout(() => {
										postWithBackoff(e, t, r + 1, s)
											.then(i)
											.catch(a);
									}, s);
								} else {
									a(new Error(`POST request failed after ${DEV_MAX_RETRIES} attempts.`));
								}
							}
						})
						.catch((s) => {
							if (r < DEV_MAX_RETRIES) {
								const s = n * 2;
								setTimeout(() => {
									postWithBackoff(e, t, r + 1, s)
										.then(i)
										.catch(a);
								}, s);
							} else {
								a(new Error(`POST request failed after ${DEV_MAX_RETRIES} attempts. ${s}`));
							}
						});
				});
			}
			async function requestWithBackoff(e, t, r = 1, n = DEV_BASE_DELAY) {
				return new Promise((i, a) => {
					fetch(e, t)
						.then((s) => {
							if (s.ok) {
								i(s);
							} else {
								if (r < DEV_MAX_RETRIES) {
									const s = n * 2;
									setTimeout(() => {
										requestWithBackoff(e, t, r + 1, s)
											.then(i)
											.catch(a);
									}, s);
								} else {
									a(new Error(`Request failed after ${DEV_MAX_RETRIES} attempts.`));
								}
							}
						})
						.catch((s) => {
							if (r < DEV_MAX_RETRIES) {
								const s = n * 2;
								setTimeout(() => {
									requestWithBackoff(e, t, r + 1, s)
										.then(i)
										.catch(a);
								}, s);
							} else {
								a(new Error(`Request failed after ${DEV_MAX_RETRIES} attempts.  ${s}`));
							}
						});
				});
			}
		},
		2443: (e, t, r) => {
			'use strict';
			r.d(t, { Fc: () => n, _Y: () => s, st: () => i, z1: () => o });
			var n;
			(function (e) {
				e['DARK'] = 'dark';
				e['LIGHT'] = 'light';
				e['SYSTEM'] = 'system';
			})(n || (n = {}));
			var i;
			(function (e) {
				e['PRIMARY'] = 'primary';
				e['SUB'] = 'sub';
				e['CONTRACT'] = 'contract';
				e['IMPORTED'] = 'imported';
			})(i || (i = {}));
			var a;
			(function (e) {
				e['ACTIVE'] = 'active';
				e['INACTIVE'] = 'inactive';
				e['DELETED'] = 'deleted';
			})(a || (a = {}));
			var s;
			(function (e) {
				e['STANDARD'] = 'standard';
				e['PRO'] = 'pro';
			})(s || (s = {}));
			var o;
			(function (e) {
				e['MAINNET'] = 'mainnet';
				e['TESTNET'] = 'testnet';
				e['PRIVATE'] = 'private';
				e['OTHER'] = 'other';
			})(o || (o = {}));
		},
		7168: (e, t, r) => {
			'use strict';
			var n = r(6522);
			var i = r(8646);
			var a = r(1757);
			class EthereumBigNumber extends a.g {
				toWei() {
					let e;
					if (
						typeof this._value === 'number' ||
						(typeof this._value === 'string' && this._value.includes('.'))
					) {
						const t = this._value.toString();
						const [r, n = ''] = t.split('.');
						const i = n.padEnd(18, '0').slice(0, 18);
						e = BigInt(r + i);
					} else {
						e = EthereumBigNumber.toBigInt(this._value) ?? BigInt(0);
					}
					return new EthereumBigNumber(e);
				}
				toGwei() {
					let e;
					if (
						typeof this._value === 'number' ||
						(typeof this._value === 'string' && this._value.includes('.'))
					) {
						const t = this._value.toString();
						const [r, n = ''] = t.split('.');
						const i = n.padEnd(9, '0').slice(0, 9);
						e = BigInt(r + i);
					} else {
						e = EthereumBigNumber.toBigInt(this._value) ?? BigInt(0);
					}
					return new EthereumBigNumber(e);
				}
				toEther() {
					const e = EthereumBigNumber.toBigInt(this._value) ?? BigInt(0);
					return new EthereumBigNumber(e / BigInt('1000000000000000000'));
				}
				toEtherString() {
					const e = EthereumBigNumber.toBigInt(this._value) ?? BigInt(0);
					const t = e / BigInt('1000000000000000000');
					const r = e % BigInt('1000000000000000000');
					const n = r.toString().padStart(18, '0').slice(0, 18);
					const i = `${t}.${n}`;
					return i;
				}
				static from(e) {
					if (typeof e === 'string' && /^0x[0-9a-fA-F]+$/.test(e)) {
						return new EthereumBigNumber(BigInt(e));
					}
					if (e && typeof e === 'object' && '_hex' in e && '_isBigNumber' in e) {
						return new EthereumBigNumber(BigInt(e._hex));
					}
					return new EthereumBigNumber(a.g.toBigInt(e));
				}
				static fromWei(e) {
					const t = EthereumBigNumber.from(e);
					const r = t.div(BigInt('1000000000000000000'));
					return new EthereumBigNumber(r.toString());
				}
				static fromGwei(e) {
					const t = EthereumBigNumber.from(e);
					const r = t.div(BigInt('1000000000'));
					return new EthereumBigNumber(r.toString());
				}
				static fromEther(e) {
					if (e === null || e === undefined) {
						throw new Error('Value cannot be null or undefined');
					}
					let t;
					if (typeof e === 'number' || typeof e === 'string') {
						t = e.toString();
					} else if (typeof e === 'bigint') {
						t = e.toString();
					} else if (e instanceof a.g) {
						t = e.toString();
					} else if (typeof e === 'object' && '_hex' in e && '_isBigNumber' in e) {
						t = BigInt(e._hex).toString();
					} else {
						throw new Error('Unsupported type for BigNumberish value');
					}
					if (!t.includes('.')) {
						t += '.0';
					}
					const [r, n] = t.split('.');
					const i = (n + '0'.repeat(18)).slice(0, 18);
					const s = BigInt(r + i);
					return new EthereumBigNumber(s);
				}
				static toWei(e) {
					let t;
					if (typeof e === 'number' || (typeof e === 'string' && e.includes('.'))) {
						const r = e.toString();
						const [n, i = ''] = r.split('.');
						const a = i.padEnd(18, '0').slice(0, 18);
						t = BigInt(n + a);
					} else {
						t = EthereumBigNumber.toBigInt(e) ?? BigInt(0);
					}
					return new EthereumBigNumber(t);
				}
				static toGwei(e) {
					let t;
					if (typeof e === 'number' || (typeof e === 'string' && e.includes('.'))) {
						const r = e.toString();
						const [n, i = ''] = r.split('.');
						const a = i.padEnd(9, '0').slice(0, 9);
						t = BigInt(n + a);
					} else {
						t = EthereumBigNumber.toBigInt(e) ?? BigInt(0);
					}
					return new EthereumBigNumber(t);
				}
				static toEther(e) {
					const t = EthereumBigNumber.from(e).toBigInt() ?? BigInt(0);
					return new EthereumBigNumber(t / BigInt('1000000000000000000'));
				}
				static toEtherString(e) {
					const t = EthereumBigNumber.from(e).toBigInt() ?? BigInt(0);
					const r = t / BigInt('1000000000000000000');
					const n = t % BigInt('1000000000000000000');
					const i = n.toString().padStart(18, '0').slice(0, 18);
					const a = `${r}.${i}`;
					return a;
				}
				static toFiat(e, t) {
					const r = parseFloat(EthereumBigNumber.toEtherString(e));
					if (isNaN(r)) {
						throw new Error('Invalid BigNumberish value');
					}
					return r * t;
				}
				static toFormattedFiat(e, t, r, n = '') {
					const i = EthereumBigNumber.toFiat(e, t);
					const a = new Intl.NumberFormat(n || undefined, { style: 'currency', currency: r });
					return a.format(i);
				}
				static toHex(e) {
					const t = a.g.toBigInt(e);
					if (t === null) {
						throw new Error('Invalid BigNumberish value');
					}
					let r = t.toString(16);
					if (r.length % 2 !== 0) {
						r = '0' + r;
					}
					return '0x' + r;
				}
			}
			function assertProvider(e) {
				if (e === null) {
					throw new Error('Provider is null');
				}
			}
			class AbstractProvider {
				blockchains = [];
				blockchain = 'Ethereum';
				chainIds = [1, 11155111];
				chainId = 1;
				name;
				signer = undefined;
				provider = null;
				constructor(e, t, r, n, i, a) {
					this.name = e;
					this.blockchains = t;
					this.chainIds = r;
					this.blockchain = n;
					this.chainId = i;
					this.provider = a;
				}
				getProvider() {
					if (!this.provider) {
						return null;
					}
					return this.provider;
				}
				getSigner() {
					if (!this.signer) {
						return null;
					}
					return this.signer;
				}
				getSignerNative() {
					if (!this.signer) {
						return null;
					}
					return this.signer.getSigner();
				}
				setProvider(e) {
					if (!e) throw new Error('Provider is not valid');
					this.provider = e;
				}
				setSigner(e) {
					if (!this.signer) throw new Error('Signer is not valid');
					this.signer = e;
				}
				async signTransaction(e) {
					if (!this.signer) {
						throw new Error('Signer not initialized');
					}
					return await this.signer.signTransaction(e);
				}
				async signTypedData(e, t, r) {
					if (!this.signer) {
						throw new Error('Signer not initialized');
					}
					return await this.signer.signTypedData(e, t, r);
				}
				async signMessage(e) {
					if (!this.signer) {
						throw new Error('Signer not initialized');
					}
					return await this.signer.signMessage(e);
				}
				on(e, t) {
					i.A.on(e, t);
					return this;
				}
				once(e, t) {
					i.A.once(e, t);
					return this;
				}
				emit(e, ...t) {
					return i.A.emit(e, ...t);
				}
				listenerCount(e) {
					return i.A.listenerCount(e);
				}
				listeners(e) {
					return i.A.listeners(e);
				}
				off(e, t) {
					i.A.off(e, t);
					return this;
				}
				removeAllListeners(e) {
					i.A.removeAllListeners(e);
					return this;
				}
				async getFeeData() {
					const [e, t] = await Promise.all([this.getBlock('latest'), this.getGasPrice()]);
					let r = new EthereumBigNumber(0);
					let n = new EthereumBigNumber(0);
					let i = new EthereumBigNumber(0);
					if (e && e.baseFeePerGas) {
						r = EthereumBigNumber.from(e.baseFeePerGas);
						i = EthereumBigNumber.fromGwei(1.5);
						n = EthereumBigNumber.from(r.mul(2).add(i));
					}
					const a = EthereumBigNumber.from(t).div(1e9);
					return {
						lastBaseFeePerGas: r.toBigInt() ?? BigInt(0),
						maxFeePerGas: n.toBigInt() ?? BigInt(0),
						maxPriorityFeePerGas: i.toBigInt() ?? BigInt(0),
						gasPrice: a
					};
				}
				addListener(e, t) {
					return this.on(e, t);
				}
				removeListener(e, t) {
					return this.off(e, t);
				}
				getBlockchains() {
					return this.blockchains;
				}
				setBlockchains(e) {
					this.blockchains = e;
				}
				getBlockchain() {
					return this.blockchain;
				}
				getChainIds() {
					return this.chainIds;
				}
				setChainIds(e) {
					this.chainIds = e;
				}
				async setChainId(e) {
					this.chainId = e;
				}
				getChainId() {
					return this.chainId;
				}
			}
			var s = r(8440);
			class EthersConverter {
				static toEthersHex(e) {
					if (e === null || e === undefined) return null;
					if (typeof e === 'string' && e.startsWith('0x')) return e;
					return '0x' + BigInt(e.toString()).toString(16);
				}
				static transactionToEthersTransaction(e) {
					return {
						to: e.to ?? undefined,
						from: e.from ?? undefined,
						nonce: e.nonce === -1 ? undefined : e.nonce,
						gasLimit: this.toEthersHex(e.gasLimit),
						gasPrice: this.toEthersHex(e.gasPrice),
						maxPriorityFeePerGas: this.toEthersHex(e.maxPriorityFeePerGas),
						maxFeePerGas: this.toEthersHex(e.maxFeePerGas),
						data: e.data?.toString() ?? undefined,
						value: this.toEthersHex(e.value),
						chainId: this.toEthersHex(e.chainId) ?? undefined,
						accessList: e.accessList ?? undefined,
						customData: e.customData,
						type: e.type
					};
				}
				static async ethersTransactionResponseToTransactionResponse(e) {
					return {
						hash: e.hash,
						to: e.to ?? '',
						from: e.from,
						nonce: e.nonce,
						gasLimit: e.gasLimit,
						gasPrice: e.gasPrice,
						data: e.data,
						value: e.value,
						chainId: e.chainId,
						blockNumber: e.blockNumber ?? undefined,
						blockHash: e.blockHash ?? undefined,
						timestamp: new Date().getTime(),
						confirmations: await e.confirmations(),
						type: e.type ?? undefined,
						accessList: e.accessList ?? undefined,
						maxPriorityFeePerGas: e.maxPriorityFeePerGas,
						maxFeePerGas: e.maxFeePerGas,
						wait: async (t) => {
							const r = await e.wait(t);
							if (!r) {
								throw new Error('Transaction receipt is null');
							}
							return this.ethersTransactionReceiptToTransactionReceipt(r);
						}
					};
				}
				static async ethersTransactionReceiptToTransactionReceipt(e) {
					return {
						to: e.to ?? '',
						from: e.from,
						contractAddress: e.contractAddress ?? undefined,
						transactionIndex: e.index,
						root: e.root ?? undefined,
						gasUsed: e.gasUsed,
						logsBloom: e.logsBloom,
						blockHash: e.blockHash,
						transactionHash: e.hash,
						logs: e.logs.map(this.ethersLogToLog),
						blockNumber: e.blockNumber,
						confirmations: await e.confirmations(),
						cumulativeGasUsed: e.cumulativeGasUsed,
						effectiveGasPrice: e.gasPrice ?? undefined,
						byzantium: true,
						type: e.type,
						status: e.status !== null ? e.status : undefined
					};
				}
				static ethersLogToLog(e) {
					return {
						blockNumber: e.blockNumber,
						blockHash: e.blockHash,
						transactionIndex: e.transactionIndex,
						removed: e.removed,
						address: e.address,
						data: e.data,
						topics: [...e.topics],
						transactionHash: e.transactionHash,
						logIndex: e.index
					};
				}
				static ethersTransactionRequestToTransactionRequest(e) {
					try {
						if (!e) return null;
						return {
							to: e.to,
							from: e.from,
							nonce: e.nonce,
							gasLimit: e.gasLimit ? BigInt(e.gasLimit.toString()) : undefined,
							gasPrice: e.gasPrice ? BigInt(e.gasPrice.toString()) : undefined,
							maxPriorityFeePerGas: e.maxPriorityFeePerGas
								? BigInt(e.maxPriorityFeePerGas.toString())
								: undefined,
							maxFeePerGas: e.maxFeePerGas ? BigInt(e.maxFeePerGas.toString()) : undefined,
							data: e.data,
							value: e.value ? BigInt(e.value.toString()) : null,
							chainId: e.chainId,
							accessList: this.convertAccessList(e.accessList),
							customData: e.customData,
							type: e.type
						};
					} catch (e) {
						console.log('Error converting ethers transaction request to transaction request:', e);
						return null;
					}
				}
				static convertAccessList(e) {
					if (!e) return undefined;
					if (Array.isArray(e)) {
						return e.map((e) => {
							if (Array.isArray(e)) {
								return { address: e[0], storageKeys: e[1] };
							} else {
								return { address: e.address, storageKeys: e.storageKeys };
							}
						});
					}
					return Object.entries(e).map(([e, t]) => ({ address: e, storageKeys: t }));
				}
			}
			var o = r(547);
			class Alchemy_Alchemy extends AbstractProvider {
				config;
				alchemy = null;
				constructor(e = {}) {
					super(
						'Alchemy',
						e.blockchains || [
							'Ethereum',
							'Solana',
							'Optimism',
							'Polygon',
							'Base',
							'Arbitrum',
							'Avalanche',
							'Celo'
						],
						e.chainIds || [1, 10, 69, 137, 80001, 42161, 421611, 11155111],
						e.blockchain || 'Ethereum',
						e.chainId || 1,
						null
					);
					this.chainId = e.chainId || 1;
					this.alchemy = null;
					this.setChainId(this.chainId);
				}
				async connect(e, t) {
					this.blockchain = e;
					this.chainId = t;
					await this.getAlchemy(t);
				}
				async getAlchemy(e = 1) {
					this.config = getConfig(e);
					if (!this.config) {
						throw new Error(`Invalid chain ID: ${e}`);
					}
					if (this.alchemy) {
						this.alchemy = null;
					}
					this.alchemy = new s.m(this.config);
					return this.alchemy;
				}
				async getProviderURL() {
					await this.getAlchemy(this.chainId);
					if (!this.alchemy) {
						throw new Error('No Alchemy set');
					}
					const e = await this.alchemy.config.getProvider();
					if (e) {
						return e.connection.url;
					} else {
						return '';
					}
				}
				async initializeProvider() {
					if (this.provider) {
						return this.provider;
					}
					const e = await this.getProviderURL();
					if (!e) {
						throw new Error('No URL set');
					}
					this.provider = new o.FR(e);
					return this.provider;
				}
				getProvider() {
					if (!this.provider) {
						return null;
					}
					return this.provider;
				}
				async call(e, t = 'latest') {
					try {
						await this.getAlchemy(this.chainId);
						if (!this.alchemy) {
							throw new Error('No Alchemy set');
						}
						const r = await this.resolveDeferredTransaction(e);
						const n = await t;
						const a = EthersConverter.transactionToEthersTransaction(r);
						const s = await this.alchemy.core.call(a, n);
						i.A.emit('call', { transaction: r, blockTag: n, result: s });
						return s;
					} catch (e) {
						i.A.emit('error', { provider: this.name, method: 'call', error: e });
						throw e;
					}
				}
				async estimateGas(e) {
					try {
						await this.getAlchemy(this.chainId);
						if (!this.alchemy) {
							throw new Error('No Alchemy set');
						}
						const t = await this.resolveDeferredTransaction(e);
						const r = EthersConverter.transactionToEthersTransaction(t);
						const n = await this.alchemy.core.estimateGas(r);
						i.A.emit('estimateGas', { transaction: t, gasEstimate: n });
						return BigInt(n.toString());
					} catch (e) {
						i.A.emit('error', { provider: this.name, method: 'estimateGas', error: e });
						throw e;
					}
				}
				async resolveDeferredTransaction(e) {
					const t = {};
					for (const [r, n] of Object.entries(e)) {
						if (n instanceof Promise) {
							t[r] = await n;
						} else {
							t[r] = n;
						}
					}
					return t;
				}
				async getBlockNumber() {
					try {
						await this.getAlchemy();
						if (!this.alchemy) {
							throw new Error('No Alchemy set');
						}
						const e = await this.alchemy.core.getBlockNumber();
						i.A.emit('blockNumber', { blockNumber: e });
						return e;
					} catch (e) {
						i.A.emit('error', { provider: this.name, method: 'getBlockNumber', error: e });
						throw e;
					}
				}
				async getGasPrice() {
					try {
						await this.getAlchemy();
						if (!this.alchemy) {
							throw new Error('No Alchemy set');
						}
						const e = await this.alchemy.core.getGasPrice();
						i.A.emit('gasPrice', { price: e.toBigInt() });
						return e.toBigInt();
					} catch (e) {
						i.A.emit('error', { provider: this.name, method: 'getGasPrice', error: e });
						throw e;
					}
				}
				async getFeeData() {
					try {
						await this.getAlchemy();
						if (!this.alchemy) {
							throw new Error('No Alchemy set');
						}
						const e = await this.alchemy.core.getFeeData();
						i.A.emit('feeData', { feeData: e });
						return e;
					} catch (e) {
						i.A.emit('error', { provider: this.name, method: 'getFeeData', error: e });
						throw e;
					}
				}
				async getBalance(e, t = 'latest') {
					try {
						await this.getAlchemy(this.chainId);
						if (!this.alchemy) {
							throw new Error('No Alchemy set');
						}
						const r = e;
						const a = n.gHh.from(await t).toHex();
						const s = await this.alchemy.core.getBalance(e, a);
						i.A.emit('balanceFetched', { address: r, balance: s });
						return s.toBigInt();
					} catch (e) {
						i.A.emit('error', { provider: this.name, method: 'getBalance', error: e });
						console.log('Alchemy: Error:', e);
						throw e;
					}
				}
				async getCode(e, t = 'latest') {
					try {
						await this.getAlchemy(this.chainId);
						if (!this.alchemy) {
							throw new Error('No Alchemy set');
						}
						const r = n.gHh.from(await t).toHex();
						const i = await this.alchemy.core.getCode(e, r);
						return i;
					} catch (e) {
						i.A.emit('error', { provider: this.name, method: 'getCode', error: e });
						throw e;
					}
				}
				async getStorageAt(e, t, r = 'latest') {
					try {
						await this.getAlchemy(this.chainId);
						if (!this.alchemy) {
							throw new Error('No Alchemy set');
						}
						const n = await r;
						const a = await this.alchemy.core.getStorageAt(
							e,
							EthersConverter.toEthersHex(t) || '0x0',
							n
						);
						i.A.emit('getStorageAt', { addressOrName: e, position: t, blockTag: n, storage: a });
						return a;
					} catch (e) {
						i.A.emit('error', { provider: this.name, method: 'getStorageAt', error: e });
						throw e;
					}
				}
				async sendRawTransaction(e) {
					try {
						await this.getAlchemy(this.chainId);
						if (!this.alchemy) {
							throw new Error('No Alchemy set');
						}
						const t = await this.alchemy.transact.sendTransaction(e);
						i.A.emit('sendRawTransaction', { signedTransaction: e, response: t });
						return t;
					} catch (e) {
						i.A.emit('error', { provider: this.name, method: 'sendRawTransaction', error: e });
						throw e;
					}
				}
				async sendTransaction(e) {
					try {
						await this.getAlchemy(this.chainId);
						if (!this.alchemy) {
							throw new Error('No Alchemy set');
						}
						if (e.nonce === undefined || e.nonce < 0) {
							e.nonce = await this.alchemy.core.getTransactionCount(e.from);
						}
						if (!this.signer) {
							const e = this.getSigner();
							if (e) {
								this.setSigner(e);
							} else {
								throw new Error('No signer set');
							}
						}
						if (!this.signer) {
							throw new Error('No signer set');
						}
						const t = await this.signer.signTransaction(e);
						const r = await this.alchemy.transact.sendTransaction(t);
						i.A.emit('sendTransaction', { signedTransaction: t, response: r });
						return r;
					} catch (e) {
						i.A.emit('error', { provider: this.name, method: 'sendTransaction', error: e });
						throw e;
					}
				}
				async getBlock(e = 'latest') {
					try {
						await this.getAlchemy(this.chainId);
						if (!this.alchemy) {
							throw new Error('No Alchemy set');
						}
						const t = n.gHh.from(await e).toHex();
						const r = await this.alchemy.core.getBlock(t);
						i.A.emit('block', { blockTagish: t, block: r });
						return r;
					} catch (e) {
						i.A.emit('error', { provider: this.name, method: 'getBlock', error: e });
						throw e;
					}
				}
				async getBlockWithTransactions(e = 'latest') {
					try {
						await this.getAlchemy(this.chainId);
						if (!this.alchemy) {
							throw new Error('No Alchemy set');
						}
						const t = n.gHh.from(await e).toHex();
						const r = await this.alchemy.core.getBlockWithTransactions(t);
						i.A.emit('blockWithTransactions', { blockTagish: t, block: r });
						return r;
					} catch (e) {
						i.A.emit('error', {
							provider: this.name,
							method: 'getBlockWithTransactions',
							error: e
						});
						throw e;
					}
				}
				async getTransaction(e) {
					try {
						await this.getAlchemy(this.chainId);
						if (!this.alchemy) {
							throw new Error('No Alchemy set');
						}
						const t = await this.alchemy.core.getTransaction(e);
						return t;
					} catch (e) {
						i.A.emit('error', { provider: this.name, method: 'getTransaction', error: e });
						throw e;
					}
				}
				async getTransactionCount(e, t = 'latest') {
					try {
						await this.getAlchemy(this.chainId);
						if (!this.alchemy) {
							throw new Error('No Alchemy set');
						}
						const r = n.gHh.from(await t).toHex();
						const i = await this.alchemy.core.getTransactionCount(e, r);
						return i;
					} catch (e) {
						i.A.emit('error', { provider: this.name, method: 'getTransactionCount', error: e });
						throw e;
					}
				}
				async getTransactionHistory(e) {
					try {
						await this.getAlchemy(this.chainId);
						if (!this.alchemy) {
							throw new Error('No Alchemy set');
						}
						const t = await this.alchemy.core.getTransaction(e);
						return t;
					} catch (e) {
						i.A.emit('error', { provider: this.name, method: 'getTransactionHistory', error: e });
						throw e;
					}
				}
				async getTransactionReceipt(e) {
					try {
						await this.getAlchemy(this.chainId);
						if (!this.alchemy) {
							throw new Error('No Alchemy set');
						}
						const t = await this.alchemy.core.getTransactionReceipt(e);
						return t;
					} catch (e) {
						i.A.emit('error', { provider: this.name, method: 'getTransactionReceipt', error: e });
						throw e;
					}
				}
				async getLogs(e) {
					try {
						await this.getAlchemy(this.chainId);
						if (!this.alchemy) {
							throw new Error('No Alchemy set');
						}
						const t = { address: e.address, topics: e.topics };
						if (e.fromBlock) {
							t.fromBlock = this.convertToAlchemyBlockTag(e.fromBlock);
						}
						if (e.toBlock) {
							t.toBlock = this.convertToAlchemyBlockTag(e.toBlock);
						}
						const r = await this.alchemy.core.getLogs(t);
						const n = r.map((e) => this.convertAlchemyLogToCustomLog(e));
						i.A.emit('getLogs', { filter: e, logs: n });
						return n;
					} catch (e) {
						i.A.emit('error', { provider: this.name, method: 'getLogs', error: e });
						throw e;
					}
				}
				convertToAlchemyBlockTag(e) {
					if (typeof e === 'string') {
						if (e === 'latest' || e === 'pending' || e === 'earliest') {
							return e;
						}
						return parseInt(e, 16);
					}
					if (typeof e === 'number' || typeof e === 'bigint') {
						return Number(e);
					}
					throw new Error(`Invalid block tag: ${e}`);
				}
				convertAlchemyLogToCustomLog(e) {
					return {
						blockNumber: e.blockNumber,
						blockHash: e.blockHash,
						transactionIndex: e.transactionIndex,
						removed: e.removed,
						address: e.address,
						data: e.data,
						topics: e.topics,
						transactionHash: e.transactionHash,
						logIndex: e.logIndex
					};
				}
				async resolveName(e) {
					try {
						await this.getAlchemy(this.chainId);
						if (!this.alchemy) {
							throw new Error('No Alchemy set');
						}
						const t = await this.alchemy.core.resolveName(e);
						i.A.emit('resolveName', { name: e, address: t });
						return t;
					} catch (e) {
						i.A.emit('error', { provider: this.name, method: 'resolveName', error: e });
						throw e;
					}
				}
				async lookupAddress(e) {
					try {
						await this.getAlchemy(this.chainId);
						if (!this.alchemy) {
							throw new Error('No Alchemy set');
						}
						const t = await this.alchemy.core.lookupAddress(e);
						i.A.emit('lookupAddress', { address: e, name: t });
						return t;
					} catch (e) {
						i.A.emit('error', { provider: this.name, method: 'lookupAddress', error: e });
						throw e;
					}
				}
				async request(e, t) {
					try {
						await this.getAlchemy(this.chainId);
						if (!this.alchemy) {
							throw new Error('No Alchemy set');
						}
						const r = await this.alchemy.core.send(e, t);
						i.A.emit('requestMade', { provider: this.name, method: e, params: t, result: r });
						return r;
					} catch (t) {
						i.A.emit('error', { provider: this.name, method: e, error: t });
						throw t;
					}
				}
				setSigner(e) {
					if (!e) {
						throw new Error('Invalid signer');
					}
					this.signer = e;
				}
				async setChainId(e) {
					if (this.chainId === e) {
						return;
					}
					this.chainId = e;
				}
			}
			function getConfig(e, t = undefined) {
				try {
					let r = t ?? undefined.VITE_ALCHEMY_API_KEY_PROD;
					let n = s.N.ETH_MAINNET;
					switch (e) {
						case 10:
							r = t ?? undefined.VITE_ALCHEMY_API_KEY_OPTIMISM_PROD;
							n = s.N.OPT_MAINNET;
							break;
						case 69:
							r = t ?? undefined.VITE_ALCHEMY_API_KEY_OPTIMISM;
							n = s.N.OPT_SEPOLIA;
							break;
						case 137:
							r = t ?? undefined.VITE_ALCHEMY_API_KEY_POLYGON_PROD;
							n = s.N.MATIC_MAINNET;
							break;
						case 80001:
							r = t ?? undefined.VITE_ALCHEMY_API_KEY_POLYGON;
							n = s.N.MATIC_MAINNET;
							break;
						case 42161:
							r = t ?? undefined.VITE_ALCHEMY_API_KEY_ARBITRUM_PROD;
							n = s.N.ARB_MAINNET;
							break;
						case 421611:
							r = t ?? undefined.VITE_ALCHEMY_API_KEY_ARBITRUM;
							n = s.N.ARB_SEPOLIA;
							break;
						case 11155111:
							r = t ?? undefined.VITE_ALCHEMY_API_KEY_ETHEREUM;
							n = s.N.ETH_SEPOLIA;
							break;
						case 1:
						default:
							r = t ?? undefined.VITE_ALCHEMY_API_KEY_PROD;
							n = s.N.ETH_MAINNET;
							break;
					}
					return { apiKey: r, network: n };
				} catch (e) {
					console.log(e);
					return undefined;
				}
			}
			class ProviderFactory_ProviderFactory {
				static createProvider(e) {
					const { name: t, apiKey: r, chainId: n } = e;
					let i;
					switch (t) {
						case 'Alchemy':
							i = new Alchemy({ apiKey: r, chainId: n });
							i.initializeProvider();
							return i;
						default:
							throw new Error(`Unsupported provider: ${t}`);
					}
				}
			}
			const c = null && ProviderFactory_ProviderFactory;
			var l = r(3689);
			class BaseFeeManager {
				providers;
				constructor(e = []) {
					this.providers = new Map();
					e.forEach((e) => this.addProvider(e));
				}
				addProvider(e) {
					this.providers.set(e.getName(), e);
				}
				removeProvider(e) {
					this.providers.delete(e);
				}
				getProviders() {
					return Array.from(this.providers.keys());
				}
				async getGasEstimate(e) {
					if (this.providers.size === 0) {
						throw new Error('No gas providers available');
					}
					const t = await Promise.all(
						Array.from(this.providers.values()).map(async (t) =>
							t.getGasEstimate(e).catch((e) => {
								console.log(`Failed to get gas estimate from ${t.getName()}:`, e);
								return null;
							})
						)
					).then((e) => e.filter((e) => e !== null));
					const r = t.map((e) => a.g.from(e.gasLimit)).sort((e, t) => e.compare(t));
					const n = t.map((e) => a.g.from(e.feeEstimate.baseFee)).sort((e, t) => e.compare(t));
					const i = t.map((e) => a.g.from(e.feeEstimate.priorityFee)).sort((e, t) => e.compare(t));
					const s = r[Math.floor(r.length / 2)];
					const o = n[Math.floor(n.length / 2)];
					const c = i[Math.floor(i.length / 2)];
					const l = {
						baseFee: o.toString(),
						priorityFee: c.toString(),
						totalFee: o.add(c).toString()
					};
					return { gasLimit: s.toString(), feeEstimate: l };
				}
				async getHistoricalGasData(e) {
					if (this.providers.size === 0) {
						throw new Error('No gas providers available');
					}
					const t = await Promise.all(
						Array.from(this.providers.values()).map((t) => t.getHistoricalGasData(e))
					);
					const r = new Map();
					t.flat().forEach((e) => {
						if (!r.has(e.timestamp)) {
							r.set(e.timestamp, { ...e, count: 1 });
						} else {
							const t = r.get(e.timestamp);
							t.baseFee = a.g.from(t.baseFee).add(a.g.from(e.baseFee)).toString();
							t.priorityFee = a.g.from(t.priorityFee).add(a.g.from(e.priorityFee)).toString();
							t.count++;
						}
					});
					return Array.from(r.values()).map((e) => ({
						timestamp: e.timestamp,
						baseFee: a.g.from(e.baseFee).div(a.g.from(e.count)).toString(),
						priorityFee: a.g.from(e.priorityFee).div(a.g.from(e.count)).toString()
					}));
				}
				async predictFutureFees(e) {
					if (this.providers.size === 0) {
						throw new Error('No gas providers available');
					}
					const t = await Promise.all(
						Array.from(this.providers.values()).map((t) => t.predictFutureFees(e))
					);
					const r = new Map();
					t.flat().forEach((e) => {
						if (!r.has(e.timestamp)) {
							r.set(e.timestamp, { ...e, count: 1 });
						} else {
							const t = r.get(e.timestamp);
							t.estimatedBaseFee = a.g
								.from(t.estimatedBaseFee)
								.add(a.g.from(e.estimatedBaseFee))
								.toString();
							t.estimatedPriorityFee = a.g
								.from(t.estimatedPriorityFee)
								.add(a.g.from(e.estimatedPriorityFee))
								.toString();
							t.count++;
						}
					});
					return Array.from(r.values()).map((e) => ({
						timestamp: e.timestamp,
						estimatedBaseFee: a.g.from(e.estimatedBaseFee).div(a.g.from(e.count)).toString(),
						estimatedPriorityFee: a.g.from(e.estimatedPriorityFee).div(a.g.from(e.count)).toString()
					}));
				}
				setPriorityOrder(e) {
					const t = new Map();
					e.forEach((e) => {
						if (this.providers.has(e)) {
							t.set(e, this.providers.get(e));
						}
					});
					this.providers = t;
				}
				setDefaultProvider(e) {
					if (this.providers.has(e)) {
						const t = this.providers.get(e);
						this.providers.delete(e);
						this.providers = new Map([[e, t], ...this.providers]);
					}
				}
			}
			var h = r(8069);
			const u = { ERC20_APPROVE: 46000n, SWAP_EXACT_IN: 180000n, SWAP_EXACT_OUT: 250000n };
			class EthereumGasProvider {
				provider;
				blockchain;
				priceProvider;
				constructor(e, t, r) {
					this.provider = e;
					this.blockchain = t;
					this.priceProvider = r;
				}
				getName() {
					return 'EthereumGasProvider';
				}
				async getGasEstimate(e) {
					let t = 0n;
					let r = null;
					let n;
					try {
						t = await this.provider.estimateGas(e);
						n = await this.provider.getFeeData();
						r = {
							baseFee: n.lastBaseFeePerGas.toString(),
							priorityFee: n.maxPriorityFeePerGas.toString(),
							totalFee: a.g.from(n.lastBaseFeePerGas).add(n.maxPriorityFeePerGas).toString()
						};
						return { gasLimit: t.toString(), feeEstimate: r };
					} catch (e) {
						console.log('Error estimating gas gasLimit, feeEstimate, feeData :==>>', {
							gasLimit: t,
							feeEstimate: r,
							feeData: n
						});
						console.log('Error estimating gas:', e);
						throw e;
					}
				}
				async getHistoricalGasData(e) {
					try {
						const e = await fetch('https://api.example.com/historical-gas-data');
						const t = await e.json();
						return t.map((e) => ({
							timestamp: e.timestamp,
							baseFee: e.baseFeePerGas,
							priorityFee: e.priorityFeePerGas
						}));
					} catch (e) {
						console.log('Error fetching historical gas data:', e);
						throw e;
					}
				}
				async predictFutureFees(e) {
					try {
						const t = await this.getHistoricalGasData(e);
						const r = t.map((t) => ({
							timestamp: t.timestamp + e,
							estimatedBaseFee: t.baseFee,
							estimatedPriorityFee: t.priorityFee
						}));
						return r;
					} catch (e) {
						console.log('Error predicting future gas fees:', e);
						throw e;
					}
				}
				async estimateSwapGasFee(e, t, r, n, i, a, s = 3e3) {
					try {
						const t = 150000n;
						const r = 46000n;
						let n = t;
						if (!e.isNative) {
							n += r;
						}
						const i = await this.provider.getFeeData();
						const a = i.maxFeePerGas || i.gasPrice;
						if (!a) throw new Error('Could not get gas price');
						const s = n * BigInt(a.toString());
						const o = EthereumBigNumber.fromWei(s.toString()).toEtherString();
						const c = await this.getEthPrice();
						const l = parseFloat(o) * c;
						return `$${l.toFixed(2)} (${o} ETH)`;
					} catch (e) {
						console.log('Gas estimation error:', e);
						return 'Unable to estimate gas';
					}
				}
				async getEthPrice() {
					try {
						const e = this.priceProvider.getMarketPrice('ETH-USD');
						return (await e).price;
					} catch (e) {
						console.log('Error fetching ETH price:', e);
						return 0;
					}
				}
				async getCurrentGasPriceInGwei(e = 1) {
					const t = await this.provider.getGasPrice();
					return Number(h.Js(t, 'gwei')) * e;
				}
				async getGasPriceFromEtherscan(e) {
					const t = await fetch(
						`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${e}`
					);
					const r = await t.json();
					return Number(r.result.ProposeGasPrice);
				}
				async getFormattedGasEstimates(e, t = 1.5, r = 0, n = 0) {
					if (!e) {
						throw new Error('Gas estimate must be provided');
					}
					const i = a.g.from(e).toBigInt();
					if (i <= 0n) {
						return 0;
					}
					if (t <= 0) {
						t = 1;
						console.log('Warning: Factor must be greater than 0 - set to 1');
					}
					if (r < 0) {
						r = 0;
						console.log('Warning: Gas price must be greater than or equal to 0 - set to 0');
					}
					if (n <= 0) {
						n = 0;
						console.log('Warning: ETH price must be greater than 0 - set to 0');
					}
					if (r === 0) {
						r = await this.getCurrentGasPriceInGwei(t);
					}
					if (n === 0) {
						n = await this.getEthPrice();
					}
					const s = r * 1e-9;
					const o = Number(e) * s;
					const c = o * n;
					return c;
				}
				setPriceProvider(e) {
					this.priceProvider = e;
				}
			}
			var d = r(8628);
			class CoinbasePriceProvider {
				getAPIKey() {
					return undefined.VITE_COINBASE_API_KEY;
				}
				getName() {
					return 'Coinbase';
				}
				async getMarketPrice(e) {
					try {
						if (!e) {
							return {
								provider: this.getName(),
								price: 0,
								lastUpdated: new Date(),
								status: 404,
								message: `Invalid pair - ${e}`
							};
						}
						e = await this.getProviderPairFormat(e);
						const [t, r] = e.split('-');
						if (!t || !r) {
							return {
								provider: this.getName(),
								price: 0,
								lastUpdated: new Date(),
								status: 404,
								message: `Invalid pair - ${e}`
							};
						}
						if (t === 'USDC') {
							return {
								provider: this.getName(),
								price: parseFloat('1.00'),
								lastUpdated: new Date(),
								currency: r,
								status: 0,
								message: ''
							};
						}
						if (t === 'WETH') {
							e = `ETH-${r}`;
						}
						if (t === 'WBTC') {
							e = `BTC-${r}`;
						}
						const n = await (0, d.x6)(
							`https://api.coinbase.com/api/v3/brokerage/market/products?limit=1&product_ids=${e}`
						);
						if (n.num_products <= 0) {
							return {
								provider: this.getName(),
								price: 0,
								lastUpdated: new Date(),
								status: 404,
								message: `No data found for - ${e}`
							};
						}
						return {
							provider: this.getName(),
							price: parseFloat(n.products[0].price),
							lastUpdated: new Date(),
							currency: r,
							status: 0,
							message: ''
						};
					} catch (e) {
						console.log('CoinbasePriceProvider - getPrice - error', e);
						let t = 404;
						let r = `Error - ${e}`;
						if (e.response && e.response.status === 429) {
							t = 429;
							r = 'Too Many Requests - Rate limit exceeded';
						}
						return {
							provider: this.getName(),
							price: 0,
							lastUpdated: new Date(),
							status: t,
							message: r
						};
					}
				}
				async getProviderPairFormat(e) {
					return e;
				}
			}
			class AbstractBlockchain {
				provider;
				providers = [];
				chainId;
				networks = [];
				network;
				symbol;
				icon;
				name;
				options;
				feeManager;
				constructor(e, t, r, n, i, a, s = {}) {
					this.name = e;
					this.providers = r;
					if (r.length === 0) throw new Error('Providers list cannot be empty');
					this.provider = r[0];
					this.chainId = t;
					this.networks = n;
					this.options = s;
					this.symbol = i;
					this.icon = a;
					this.network = this.getNetwork();
					if (!this.isNetworkAndChainIdValid(t))
						throw new Error(
							'Unsupported network and chain. Please check the chain ID and/or networks'
						);
					if (!this.providers || this.providers.length === 0)
						throw new Error('Providers list cannot be empty');
					this.provider = r[0];
					this.feeManager = new BaseFeeManager([
						new EthereumGasProvider(this.provider, this, new CoinbasePriceProvider())
					]);
					if (!this.feeManager) throw new Error('Fee manager not set');
				}
				async getGasEstimate(e) {
					if (!this.feeManager || !e) throw new Error('Fee manager or transaction not set');
					return await this.feeManager.getGasEstimate(e);
				}
				async getHistoricalGasData(e) {
					if (!this.feeManager || !e) throw new Error('Fee manager or duration not set');
					return await this.feeManager.getHistoricalGasData(e);
				}
				async predictFutureFees(e) {
					if (!this.feeManager || !e) throw new Error('Fee manager or duration not set');
					return await this.feeManager.predictFutureFees(e);
				}
				async call(e, t) {
					if (!e) throw new Error('Transaction not set');
					try {
						return await this.provider.call(e, t);
					} catch (e) {
						throw new Error(`Error calling - call: ${e}`);
					}
				}
				connect(e, t) {
					if (!this.providers || !this.providers.includes(e))
						throw new Error('Provider(s) not supported');
					if (!this.isNetworkAndChainIdValid(t)) throw new Error('Unsupported network and chain');
					this.provider = e;
					this.chainId = t;
				}
				getBlockchainName() {
					return this.name;
				}
				getChainId() {
					return this.chainId;
				}
				getNetwork() {
					this.network = this.networks.find((e) => e.chainId === this.chainId) || this.networks[0];
					return this.network;
				}
				getNetworkByChainId(e) {
					if (!e) throw new Error('Chain ID not set');
					if (!this.isNetworkAndChainIdValid(e)) throw new Error('Unsupported network and chain');
					return this.networks.find((t) => t.chainId === e) || this.networks[0];
				}
				getIcon() {
					return this.icon;
				}
				getNetworks() {
					console.log('Blockchain networks', this.networks);
					return this.networks;
				}
				getSymbol() {
					return this.symbol;
				}
				async setChainId(e) {
					if (!e) throw new Error('Chain ID not set');
					if (!this.isNetworkAndChainIdValid(e)) throw new Error('Unsupported network and chain');
					if (this.chainId === e) {
						return;
					}
					if (e <= 0) {
						throw new Error('Invalid chain ID');
					}
					if (this.provider.getChainIds() && !this.provider.getChainIds().includes(e)) {
						throw new Error('Provider does not support chain ID');
					}
					if (this.networks.find((t) => t.chainId === e) === undefined) {
						throw new Error('Blockchain does not support chain ID');
					}
					this.network = this.getNetworkByChainId(e);
					this.chainId = e;
				}
				setNetwork(e) {
					if (!e) throw new Error('Network not set');
					try {
						if (!this.networks.includes(e)) {
							return this.network;
						}
						const t = this.network;
						this.network = e;
						return t;
					} catch (e) {
						throw new Error(`Error calling - switchNetwork: ${e}`);
					}
				}
				setNetworkByChainId(e) {
					if (!e) throw new Error('Chain ID not set');
					try {
						const t = this.getNetworkByChainId(e);
						return this.setNetwork(t);
					} catch (e) {
						throw new Error(`Error calling - switchNetwork: ${e}`);
					}
				}
				async getBalance(e) {
					try {
						if (!e) return 0n;
						return await this.provider.getBalance(e);
					} catch (e) {
						throw new Error(`Error calling - getBalance: ${e}`);
					}
				}
				getOptions(e) {
					if (!e) throw new Error('Blockchain not set');
					return this.options[e];
				}
				getProvider() {
					return this.provider;
				}
				getSigner() {
					return this.provider.getSigner();
				}
				getSignerNative() {
					return this.provider.getSignerNative();
				}
				getProviders() {
					return this.providers;
				}
				getProviderList() {
					return this.providers.map((e) => e.name);
				}
				isNetworkAndChainIdValid(e) {
					if (!e) throw new Error('Chain ID not set');
					return this.networks.find((t) => t.chainId === e) !== undefined;
				}
				isSmartContractSupported() {
					return false;
				}
				async request(e, t) {
					try {
						return await this.provider.request(e, t);
					} catch (t) {
						throw new Error(`Error calling - request - ${e}: ${t}`);
					}
				}
				async sendRawTransaction(e) {
					try {
						return await this.provider.sendRawTransaction(e);
					} catch (e) {
						throw new Error(`Error calling - sendTransaction: ${e}`);
					}
				}
				setProvider(e, t) {
					if (!this.providers.includes(e)) {
						throw new Error('Provider not supported');
					}
					this.provider = e;
					this.chainId = t;
				}
				_updateOptions(e, t = false) {
					if (t) {
						this.options = e;
					} else {
						this.options = { ...this.options, ...e };
					}
				}
			}
			var g = r(2857);
			var m = r(1396);
			var f = r(1555);
			var w = r(7714);
			class AbstractContract {
				address;
				abi;
				provider;
				constructor(e, t, r) {
					if (!e || !t || !r) throw new Error('Invalid parameters');
					this.address = e;
					this.abi = t;
					this.provider = r;
				}
				isSigner(e) {
					if (!e) return false;
					return 'signMessage' in e && typeof e.signMessage === 'function';
				}
			}
			var p = r(9848);
			var y = r(9351);
			class EthereumContract extends AbstractContract {
				contract;
				interface;
				constructor(e, t, r) {
					super(e, t, r);
					this.contract = new p.NZ(e, t, r.getSignerNative());
					if (!this.contract) {
						throw new Error('Invalid contract');
					}
					this.interface = new y.KA(t);
					if (!this.interface) {
						throw new Error('Invalid interface');
					}
				}
				async call(e, ...t) {
					try {
						if (!e || !this.interface)
							throw new Error('Invalid function name or invalid interface');
						if (!this.interface.getFunction(e))
							throw new Error(`Function ${e} does not exist on contract`);
						return await this.contract[e](...t);
					} catch (t) {
						console.log(`Error calling ${e}:`, t);
						throw t;
					}
				}
				async estimateGas(e, ...t) {
					try {
						if (!e || !this.interface)
							throw new Error('Invalid function name or invalid interface');
						if (!this.interface.getFunction(e))
							throw new Error(`Function ${e} does not exist on contract`);
						const r = this.contract[e];
						if (typeof r !== 'function') {
							throw new Error(`${e} is not a function`);
						}
						const n = await r.estimateGas(...t);
						return BigInt(n.toString());
					} catch (t) {
						console.log(`Error estimating gas for ${e}:`, t);
						throw t;
					}
				}
				async populateTransaction(e, ...t) {
					try {
						if (!e || !this.interface)
							throw new Error('Invalid function name or invalid interface');
						if (!this.interface.getFunction(e))
							throw new Error(`Function ${e} does not exist on contract`);
						const r = this.contract[e];
						if (typeof r !== 'function') {
							throw new Error(`${e} is not a function`);
						}
						const n = await r.populateTransaction(...t);
						if (!n) throw new Error('Invalid transaction from populate transaction');
						return EthersConverter.ethersTransactionRequestToTransactionRequest(n);
					} catch (t) {
						console.log(`Error populating transaction for ${e}:`, t);
						throw t;
					}
				}
				async sendTransaction(e, ...t) {
					try {
						if (!this.interface.getFunction(e)) {
							throw new Error(`Function ${e} does not exist on contract`);
						}
						const r = await this.contract[e](...t);
						if (!r) throw new Error('Invalid transaction from send transaction');
						return EthersConverter.ethersTransactionResponseToTransactionResponse(r);
					} catch (t) {
						console.log(`Error sending transaction for ${e}:`, t);
						throw t;
					}
				}
				encodeFunctionData(e, t = []) {
					if (!this.interface.getFunction(e)) {
						throw new Error(`Function ${e} does not exist on contract`);
					}
					return this.interface.encodeFunctionData(e, t);
				}
				on(e, t) {
					this.contract.on(e, t);
				}
				off(e, t) {
					this.contract.off(e, t);
				}
				once(e, t) {
					this.contract.once(e, t);
				}
				getFunctions() {
					const e = {};
					const t = Object.values(
						Object.fromEntries(
							Object.entries(this.interface.fragments).filter(([e, t]) => t.type === 'function')
						)
					);
					t.forEach((t) => {
						e[t.name] = (...e) => this.call(t.name, ...e);
					});
					return e;
				}
				getEvents() {
					const e = Object.values(
						Object.fromEntries(
							Object.entries(this.interface.fragments).filter(([e, t]) => t.type === 'event')
						)
					);
					return e.map((e) => e.name);
				}
			}
			const b = [
				{
					blockchain: 'Ethereum',
					name: 'Mainnet',
					chainId: 1,
					symbol: 'ETH',
					type: n.z1I.MAINNET,
					explorer: 'https://etherscan.io',
					decimals: 18
				},
				{
					blockchain: 'Ethereum',
					name: 'Sepolia',
					chainId: 11155111,
					symbol: 'ETH',
					type: n.z1I.TESTNET,
					explorer: 'https://sepolia.etherscan.io',
					decimals: 18
				},
				{
					blockchain: 'Unichain',
					name: 'Sepolia',
					chainId: 1301,
					symbol: 'ETH',
					type: n.z1I.TESTNET,
					explorer: 'https://sepolia.uniscan.xyz/',
					decimals: 18
				}
			];
			class Ethereum_Ethereum extends AbstractBlockchain {
				_options;
				constructor(e, t = 1, r = {}, n = false) {
					super('Ethereum', t, e, b, 'ETH', '/images/ethereum_icon_purple.svg');
					this.chainId = t;
					this.options = r;
					this._updateOptions(r, n);
					this._options = this.getOptions('ethereum');
				}
				async createAccount(e = null, t) {
					if (!t) throw new Error('Account info is missing');
					if (e === null) {
						return this.createPrimaryAccount(t);
					} else {
						if (!t.path) throw new Error('Derive Path is missing from the account info');
						return this.createSubAccount(e, t.path);
					}
				}
				async estimateGas(e) {
					if (!e) throw new Error('Transaction is missing');
					return await this.provider.estimateGas(e);
				}
				async getBalance(e, t) {
					if (!e) throw new Error('Address is missing');
					return await this.provider.getBalance(e, t !== undefined ? t : 'latest');
				}
				async getBlock(e) {
					if (!e) throw new Error('Block hash or tag is missing');
					throw new Error('Method not implemented.');
				}
				async getBlockNumber() {
					throw new Error('Method not implemented.');
				}
				async getBlockWithTransactions(e) {
					if (!e) throw new Error('Block hash or tag is missing');
					throw new Error('Method not implemented.');
				}
				async getCode(e, t) {
					if (!e) throw new Error('Address is missing');
					throw new Error('Method not implemented.');
				}
				async getFeeData() {
					return await this.provider.getFeeData();
				}
				async getGasPrice() {
					throw new Error('Method not implemented.');
				}
				async getLogs(e) {
					if (!e) throw new Error('Filter is missing');
					throw new Error('Method not implemented.');
				}
				async getStorageAt(e, t, r) {
					if (!e) throw new Error('Address is missing');
					throw new Error('Method not implemented.');
				}
				async signTypedData(e) {
					if (!e) throw new Error('Transaction is missing');
					throw new Error('Method not implemented.');
				}
				async getTransaction(e) {
					if (!e) throw new Error('Transaction hash is missing');
					return await this.provider.getTransaction(e);
				}
				async getTransactionCount(e, t) {
					if (!e) throw new Error('Address is missing');
					return await this.provider.getTransactionCount(e, t);
				}
				async getTransactionHistory(e) {
					if (!e) throw new Error('Address is missing');
					return await this.provider.getTransactionHistory(e);
				}
				async getTransactionReceipt(e) {
					if (!e) throw new Error('Transaction hash is missing');
					return await this.provider.getTransactionReceipt(e);
				}
				isAddress(e) {
					const t = g.PW(e);
					return t;
				}
				async isSmartContract(e) {
					if (!this.isAddress(e)) return false;
					let t;
					try {
						t = await this.provider.getCode(e);
					} catch (e) {
						t = null;
					}
					return t && t !== '0x' && t !== '0x0';
				}
				isSmartContractSupported() {
					return true;
				}
				async request(e, t) {
					return await this.provider.request(e, t);
				}
				async sendTransaction(e) {
					return await this.provider.sendTransaction(e);
				}
				async sendRawTransaction(e) {
					return await this.provider.sendRawTransaction(e);
				}
				async signTransaction(e) {
					return await this.provider.signTransaction(e);
				}
				async signMessage(e) {
					return await this.provider.signMessage(e);
				}
				async createPrimaryAccount(e) {
					const t = m.p(32);
					if (!t) throw new Error('Error generating entropy for the mnemonic');
					const r = f.v.fromEntropy(t);
					if (!r) throw new Error('Error generating mnemonic from entropy');
					const i = w.QX.fromMnemonic(r, e.path);
					if (!i) throw new Error('Error creating wallet from mnemonic');
					const a = {
						extendedKey: i.extendedKey,
						privateKey: i.privateKey,
						publicKey: i.publicKey,
						publicKeyUncompressed: i.publicKey,
						path: i.path ? i.path : e.path,
						pathIndex: e.index,
						fingerPrint: i.fingerprint,
						parentFingerPrint: i.parentFingerprint,
						chainCode: i.chainCode,
						assignedTo: []
					};
					const s = {
						id: e.id,
						index: e.index,
						blockchain: 'Ethereum',
						smartContract: false,
						address: i.address,
						alias: '',
						accountType: n.std.PRIMARY,
						name: !e.accountName ? `Portfolio Level Account ${e.index + 1}` : e.accountName,
						description: '',
						primaryAccount: null,
						data: a,
						value: 0n,
						class: 'Default',
						level: 'L1',
						isSigner: true,
						avatar: '',
						tags: ['Ethereum', 'primary'],
						includeInPortfolio: true,
						connectedDomains: [],
						version: n.xvI,
						createDate: (0, l.O2)(),
						updateDate: (0, l.O2)()
					};
					const o = {
						extendedKey: i.extendedKey,
						privateKey: i.privateKey,
						publicKey: i.publicKey,
						publicKeyUncompressed: i.publicKey,
						path: i.path ? i.path : e.path,
						pathIndex: e.index,
						fingerPrint: i.fingerprint,
						parentFingerPrint: i.parentFingerprint,
						chainCode: i.chainCode,
						mnemonic: r.phrase,
						entropy: t,
						password: i.mnemonic?.password,
						wordCount: i.mnemonic?.phrase.split(' ').length || 24,
						wordListLocale: i.mnemonic?.wordlist.locale || 'en'
					};
					const c = {
						id: e.id,
						name: 'Primary Account',
						address: i.address,
						value: 0n,
						index: 0,
						data: o,
						account: {},
						subIndex: 0,
						subAccounts: [],
						version: n.xvI,
						createDate: (0, l.O2)(),
						updateDate: (0, l.O2)()
					};
					return c;
				}
				async createSubAccount(e, t) {
					const r = e.data.mnemonic;
					if (!r) throw new Error('Mnemonic is missing from the primary account data');
					const i = w.QX.fromPhrase(r, undefined, t);
					if (!i) throw new Error('Error deriving sub account from primary account');
					const a = {
						extendedKey: i.extendedKey,
						privateKey: i.privateKey,
						publicKey: i.publicKey,
						publicKeyUncompressed: i.publicKey,
						path: i.path,
						pathIndex: e.subIndex + 1,
						fingerPrint: i.fingerprint,
						parentFingerPrint: e.data.fingerPrint,
						chainCode: '',
						assignedTo: []
					};
					const s = {
						id: '1',
						index: e.subIndex + 1,
						blockchain: 'Ethereum',
						smartContract: false,
						address: i.address,
						alias: 'New Sub Account',
						accountType: n.std.SUB,
						name: 'Sub Account Name',
						description: 'Description of the sub account',
						primaryAccount: e,
						data: a,
						value: 0n,
						class: 'standard',
						level: 'L1',
						isSigner: true,
						avatar: 'default-avatar.png',
						tags: [],
						includeInPortfolio: true,
						connectedDomains: [],
						version: '1.0',
						createDate: new Date().toISOString(),
						updateDate: new Date().toISOString()
					};
					return s;
				}
				async resolveName(e) {
					if (!e) return null;
					return await this.provider.resolveName(e);
				}
				async lookupAddress(e) {
					if (!e) return null;
					return await this.provider.lookupAddress(e);
				}
				createContract(e, t) {
					if (!e || !t) return null;
					return new EthereumContract(e, t, this.provider);
				}
			}
			class BlockchainFactory_BlockchainFactory {
				static createBlockchain(e, t) {
					switch (e) {
						case 'Ethereum':
							return new Ethereum(t);
						default:
							throw new Error(`Unsupported blockchain: ${e}`);
					}
				}
			}
			const v = null && BlockchainFactory_BlockchainFactory;
			var E = r(6543);
			var I = r(5738);
			var B = r(3944);
			class Signer {}
			class EthereumSigner_EthereumSigner extends Signer {
				wallet;
				provider = null;
				constructor(e, t) {
					super();
					if (!e) {
						throw new Error('Private key not provided to signer');
					}
					if (!e.startsWith('0x')) {
						e = '0x' + e;
					}
					if (e.length !== 66) {
						throw new Error(`Invalid private key length. Instead it is ${e.length}`);
					}
					this.provider = t;
					const r = t ? t.getProvider() : null;
					this.wallet = new E.u(e, r ? r : t);
				}
				toEthersHex(e) {
					if (e instanceof EthereumBigNumber) {
						return e.toHex();
					}
					if (typeof e === 'bigint') {
						return '0x' + e.toString(16);
					}
					if (typeof e === 'number') {
						return '0x' + BigInt(e).toString(16);
					}
					if (typeof e === 'string') {
						return e;
					}
					if (e && typeof e === 'object' && '_hex' in e) {
						return e._hex;
					}
					return null;
				}
				async signTransaction(e) {
					const t = this.transactionToEthersTransaction(e);
					return await this.wallet.signTransaction(t);
				}
				async signMessage(e) {
					return await this.wallet.signMessage(e);
				}
				async signTypedData(e, t, r) {
					return await this.wallet.signTypedData(e, t, r);
				}
				async verifySigner(e, t, r) {
					try {
						const n = I.x(B.A(t), r) === e;
						return n;
					} catch (e) {
						console.log(e);
						return false;
					}
				}
				async getAddress() {
					return this.wallet.address;
				}
				getSigner() {
					if (!this.wallet) return null;
					return this.wallet;
				}
				setSigner(e) {
					if (!e) throw new Error('Provider is not provided');
					this.wallet = new E.u(this.wallet.privateKey, e.getProvider());
				}
				async sendTransaction(e) {
					const t = await this.wallet.sendTransaction(this.transactionToEthersTransaction(e));
					return this.ethersTransactionResponseToTransactionResponse(t);
				}
				transactionToEthersTransaction(e) {
					return {
						to: e.to ?? undefined,
						from: e.from ?? undefined,
						nonce: e.nonce === -1 ? undefined : e.nonce,
						gasLimit: this.toEthersHex(e.gasLimit),
						gasPrice: this.toEthersHex(e.gasPrice),
						maxPriorityFeePerGas: this.toEthersHex(e.maxPriorityFeePerGas),
						maxFeePerGas: this.toEthersHex(e.maxFeePerGas),
						data: e.data?.toString() ?? undefined,
						value: this.toEthersHex(e.value),
						chainId: this.toEthersHex(e.chainId) ?? undefined,
						accessList: e.accessList ?? undefined,
						customData: e.customData,
						enableCcipRead: e.ccipReadEnabled,
						blobVersionedHashes: e.blobVersionedHashes ?? undefined,
						maxFeePerBlobGas: this.toEthersHex(e.maxFeePerBlobGas),
						blobs: e.blobs ?? undefined,
						kzg: e.kzg ?? undefined
					};
				}
				async ethersTransactionResponseToTransactionResponse(e) {
					return {
						hash: e.hash,
						to: e.to ?? '',
						from: e.from,
						nonce: e.nonce,
						gasLimit: e.gasLimit,
						gasPrice: e.gasPrice,
						data: e.data,
						value: e.value,
						chainId: e.chainId,
						blockNumber: e.blockNumber ?? undefined,
						blockHash: e.blockHash ?? undefined,
						timestamp: new Date().getTime(),
						confirmations: await e.confirmations(),
						raw: undefined,
						type: e.type ?? undefined,
						accessList: e.accessList ?? undefined,
						maxPriorityFeePerGas: e.maxPriorityFeePerGas,
						maxFeePerGas: e.maxFeePerGas,
						wait: async (t) => {
							const r = await e.wait(t);
							if (!r) {
								throw new Error('Transaction receipt is null');
							}
							return this.ethersTransactionReceiptToTransactionReceipt(r);
						}
					};
				}
				async ethersTransactionReceiptToTransactionReceipt(e) {
					return {
						to: e.to ?? '',
						from: e.from,
						contractAddress: e.contractAddress ?? undefined,
						transactionIndex: e.index,
						root: e.root ?? undefined,
						gasUsed: e.gasUsed,
						logsBloom: e.logsBloom,
						blockHash: e.blockHash,
						transactionHash: e.hash,
						logs: e.logs.map((e) => ({
							blockNumber: e.blockNumber,
							blockHash: e.blockHash,
							transactionIndex: e.transactionIndex,
							removed: e.removed,
							address: e.address,
							data: e.data,
							topics: [...e.topics],
							transactionHash: e.transactionHash,
							logIndex: e.index
						})),
						blockNumber: e.blockNumber,
						confirmations: await e.confirmations(),
						cumulativeGasUsed: e.cumulativeGasUsed,
						effectiveGasPrice: e.gasPrice ?? undefined,
						byzantium: true,
						type: e.type,
						status: e.status ? e.status : undefined
					};
				}
			}
			var k = r(4155);
			const A = JSON.parse(
				'[{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"remaining","type":"uint256"}],"type":"function"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_from","type":"address"},{"indexed":true,"name":"_to","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_owner","type":"address"},{"indexed":true,"name":"_spender","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"Approval","type":"event"}]'
			);
			const T = { ERC20: A };
			const N = {
				YAKKL: '0x2B64822cf4bbDd77d386F51AA2B40c5cdbeb80b5',
				UNISWAP_FACTORY: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
				UNISWAP_FACTORY_SEPOLIA: '0x0227628f3F023bb0B980b67D528571c95c6DaC1c',
				UNISWAP_V3_ROUTER: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
				UNISWAP_V3_ROUTER_SEPOLIA: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
				UNISWAP_V3_QUOTER: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
				UNISWAP_V3_QUOTER_SEPOLIA: '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3',
				UNISWAP_UNIVERSAL_ROUTER: '0xEf1c6E67703c7BD7107eed8303Fbe6EC2554BF6B',
				UNISWAP_UNIVERSAL_ROUTER_SEPOLIA: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
				SUSHISWAP_FACTORY: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
				SUSHISWAP_FACTORY_SEPOLIA: '0x...',
				WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
				WETH_SEPOLIA: '0xfFf9976782d46cc05630D1f6EbAB18B2324d6B14',
				WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
				USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
				USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
				DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
			};
			const P = null && [
				'0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
				'0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
				'0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
				'0x90f79bf6eb2c4f870365e785982e1f101e93b906',
				'0x15d34aaf54267db7d7c367839aaf71a00a2c6a65',
				'0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc',
				'0x976ea74026e726554db657fa54763abd0c3a0aa9',
				'0x14dc79964da2c08b23698b3d3cc7ca32193d9955',
				'0x23618e81e3f5cdf7f54c3d65f7fbc0abf5b21e8f',
				'0xa0ee7a142d267c1f36714e4a8f75612f20a79720'
			];
			const S = null && [
				'0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
				'0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
				'0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
				'0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
				'0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
				'0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',
				'0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e',
				'0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356',
				'0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97',
				'0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6'
			];
			var _ = r(6934);
			async function getTokenBalance(e, t, r) {
				try {
					if (!ethers.isAddress(e.address)) {
						return undefined;
					}
					if (e.isNative) {
						const e = await r.getBalance(t);
						return ethers.formatUnits(e, 18);
					}
					const n = new ethers.Contract(
						e.address,
						[
							'function balanceOf(address owner) view returns (uint256)',
							'function decimals() view returns (uint8)'
						],
						r
					);
					try {
						const e = await n.balanceOf(t);
						const r = await n.decimals();
						return ethers.formatUnits(e, r);
					} catch {
						console.log('The contract does not implement balanceOf or it reverted.');
						return undefined;
					}
				} catch (t) {
					console.log(`Failed to get balance for token: ${e.name}`, t);
					return undefined;
				}
			}
			async function tokens_updateTokenBalances(e, t) {
				try {
					const [r, n] = await Promise.all([
						updateTokenDataBalances(e, t),
						updateTokenDataCustomBalances(e, t)
					]);
					updateCombinedTokenStore();
				} catch (e) {
					console.log('Error updating token balances:', e);
				}
			}
			async function updateTokenDataBalances(e, t) {
				try {
					const r = get(yakklTokenDataStore);
					if (!r || r.length === 0) {
						console.log('No tokens available to update balances');
						return [];
					}
					const n = await Promise.all(
						r.map(async (r) => {
							try {
								const n = await getTokenBalance(r, e, t);
								return { ...r, balance: n !== undefined ? n : r.balance };
							} catch (e) {
								console.log(`Error fetching balance for token ${r.symbol}:`, e);
								return r;
							}
						})
					);
					const i = get(yakklTokenDataStore);
					if (!isEqual(i, n)) {
						await setYakklTokenDataStorage(n);
					}
					return n;
				} catch (e) {
					console.log('Error updating token balances:', e);
					return [];
				}
			}
			async function updateTokenDataCustomBalances(e, t) {
				try {
					const r = get(yakklTokenDataCustomStore);
					if (!r || r.length === 0) {
						console.log('No custom tokens available to update balances');
						return [];
					}
					const n = await Promise.all(
						r.map(async (r) => {
							try {
								const n = await getTokenBalance(r, e, t);
								return { ...r, balance: n !== undefined ? n : r.balance };
							} catch (e) {
								console.log(`Error fetching balance for custom token ${r.symbol}:`, e);
								return r;
							}
						})
					);
					const i = get(yakklTokenDataCustomStore);
					if (!isEqual(i, n)) {
						await setYakklTokenDataCustomStorage(n);
					}
					return n;
				} catch (e) {
					console.log('Error updating custom token balances:', e);
					return [];
				}
			}
			function updateTokenValues() {
				yakklCombinedTokenStore.update((e) =>
					e.map((e) => ({ ...e, value: (Number(e.balance) ?? 0) * (e.price?.price ?? 0) }))
				);
			}
			class TokenService_TokenService {
				blockchain = null;
				constructor(e = null) {
					this.blockchain = e;
				}
				getTokenContract(e) {
					if (!e) return null;
					return this.blockchain ? this.blockchain.createContract(e, ABIs.ERC20) : null;
				}
				async getTokenInfo(e) {
					if (!e) return { name: '', symbol: '', decimals: 0, totalSupply: 0n };
					try {
						const t = this.getTokenContract(e);
						if (!t) return { name: '', symbol: '', decimals: 0, totalSupply: 0n };
						const [r, n, i, a] = await Promise.all([
							t.call('name'),
							t.call('symbol'),
							t.call('decimals'),
							t.call('totalSupply')
						]);
						return { name: r, symbol: n, decimals: i, totalSupply: a };
					} catch (e) {
						console.log('Contract - getTokenInfo - error', e);
						return { name: '', symbol: '', decimals: 0, totalSupply: 0n };
					}
				}
				async getBalance(e, t) {
					try {
						if (!e || !t) return 0n;
						const r = this.getTokenContract(e);
						if (!r) return 0n;
						return await r.call('balanceOf', t);
					} catch (e) {
						console.log('Contract - getBalance - error', e);
						return 0n;
					}
				}
				async updateTokenBalances(e) {
					try {
						if (!e) throw new Error('Invalid parameters');
						updateTokenBalances(e, this.blockchain?.getProvider()?.getProvider() ?? undefined);
					} catch (e) {
						console.log('Error updating token balances:', e);
					}
				}
				async transfer(e, t, r) {
					try {
						if (!e || !t || !r) throw new Error('Invalid parameters');
						const n = this.getTokenContract(e);
						if (!n) throw new Error('Invalid contract');
						const i = await n.estimateGas('transfer', t, r);
						const a = await n.populateTransaction('transfer', t, r);
						if (!a) throw new Error('Invalid transaction');
						a.gasLimit = i;
						return await this.blockchain.sendTransaction(a);
					} catch (e) {
						console.log('Contract - transfer - error', e);
						throw new Error(`Error transferring tokens: ${e}`);
					}
				}
			}
			const x = (0, k.T5)(null);
			class Wallet_Wallet {
				providerNames;
				blockchainNames;
				provider = null;
				blockchain = null;
				signer = null;
				portfolio = [];
				currentToken = null;
				accounts = [];
				apiKey = null;
				chainId;
				privateKey = null;
				tokenService = null;
				constructor(e = ['Alchemy'], t = ['Ethereum'], r = 1, n = null, i = null) {
					this.providerNames = e;
					this.blockchainNames = t;
					this.apiKey = n;
					this.chainId = r;
					this.setChainId(r);
					this.privateKey = i;
					this.initialize();
					Wallet_Wallet.setInstance(this);
				}
				initialize() {
					if (this.providerNames.length > 0) {
						const e = this.providerNames.map((e) =>
							ProviderFactory.createProvider({
								name: e,
								apiKey: this.apiKey,
								chainId: this.chainId
							})
						);
						this.provider = e[0];
						const t = this.getBlockchainFromChainId(this.chainId);
						this.blockchain = BlockchainFactory.createBlockchain(t, e);
						this.tokenService = new TokenService(this.blockchain);
					}
					this.setupEventListeners();
					if (this.privateKey) {
						this.setSigner(this.privateKey);
					}
					Wallet_Wallet.setInstance(this);
				}
				static setInstance(e) {
					x.set(e);
				}
				addTokenToPortfolio(e) {
					this.portfolio.push(e);
					Wallet_Wallet.setInstance(this);
				}
				async createAccount(e = null, t) {
					if (!this.blockchain) {
						throw new Error('Blockchain not initialized');
					}
					const r = await this.blockchain.createAccount(e, t);
					if (isYakklPrimaryAccount(r)) {
						this.addAccount(r);
					} else {
						this.addAccount(r);
					}
					Wallet_Wallet.setInstance(this);
					return r;
				}
				async estimateGas(e) {
					if (!this.blockchain) {
						throw new Error('Blockchain not initialized');
					}
					return await this.blockchain.estimateGas(e);
				}
				async getBalance(e) {
					if (!this.blockchain) {
						throw new Error('Blockchain not initialized');
					}
					return await this.blockchain.getBalance(e);
				}
				getBlockchain() {
					switch (this.chainId) {
						case 1:
						case 11155111:
						default:
							return this.blockchain;
					}
				}
				getBlockchainFromChainId(e) {
					switch (e) {
						case 137:
							return 'Polygon';
						case 43114:
							return 'Avalanche';
						case 42161:
							return 'Arbitrum';
						case 250:
							return 'Optimism';
						case 1:
						case 11155111:
						default:
							return 'Ethereum';
					}
				}
				getTokenService() {
					return this.tokenService;
				}
				getChainId() {
					return this.chainId;
				}
				getCurrentToken() {
					return this.currentToken;
				}
				getPortfolio() {
					return this.portfolio;
				}
				getProvider() {
					return this.provider;
				}
				async getTransactionHistory(e) {
					if (!this.blockchain) {
						throw new Error('Blockchain not initialized');
					}
					return await this.blockchain.getTransactionHistory(e);
				}
				onProviderConnected(e) {
					Wallet_Wallet.setInstance(this);
				}
				onBalanceFetched(e) {
					Wallet_Wallet.setInstance(this);
				}
				onProviderSwitched(e) {
					Wallet_Wallet.setInstance(this);
				}
				onError(e) {
					Wallet_Wallet.setInstance(this);
				}
				onRequestMade(e) {
					Wallet_Wallet.setInstance(this);
				}
				async setChainId(e) {
					this.chainId = e;
					this.blockchain?.setChainId(e);
					this.provider?.setChainId(e);
					Wallet_Wallet.setInstance(this);
				}
				setAPIKey(e) {
					this.apiKey = e;
					Wallet_Wallet.setInstance(this);
				}
				setCurrentToken(e) {
					const t = this.portfolio.find((t) => t.address === e);
					if (!t) {
						throw new Error(`Token with address ${e} not found in portfolio`);
					}
					this.currentToken = t;
					this.provider = t.provider;
					this.blockchain = t.blockchain;
					Wallet_Wallet.setInstance(this);
				}
				setupEventListeners() {
					eventManager.on('balanceFetched', this.onBalanceFetched.bind(this));
					eventManager.on('error', this.onError.bind(this));
					eventManager.on('providerConnected', this.onProviderConnected.bind(this));
					eventManager.on('providerSwitched', this.onProviderSwitched.bind(this));
					eventManager.on('requestMade', this.onRequestMade.bind(this));
					Wallet_Wallet.setInstance(this);
				}
				setSigner(e) {
					try {
						if (!this.blockchain) {
							console.log('Blockchain is not initialized yet');
							return null;
						}
						if (!this.provider) {
							console.log('Provider is not initialized yet');
							return null;
						}
						if (!e && !this.privateKey) {
							console.log('No private key provided yet');
							return null;
						}
						switch (this.blockchain.name) {
							case 'Ethereum':
								this.signer = new EthereumSigner(e, this.provider);
								break;
							default:
								throw new Error(`Unsupported blockchain: ${this.blockchain.name}`);
						}
						if (this.signer) {
							this.privateKey = e;
							Wallet_Wallet.setInstance(this);
							this.provider.setSigner(this.signer);
							return Promise.resolve(this.signer);
						} else {
							throw new Error('Signer could not be created');
						}
					} catch (e) {
						return Promise.reject(e);
					}
				}
				getSigner() {
					return this.signer;
				}
				switchProvider() {
					if (!this.blockchain || !this.provider) {
						throw new Error('Blockchain or Provider not initialized');
					}
					const e = this.providerNames
						.map((e) =>
							ProviderFactory.createProvider({
								name: e,
								apiKey: this.privateKey,
								chainId: this.chainId
							})
						)
						.filter((e) => e.blockchains.includes(this.blockchain.name));
					const t = e.find((e) => e !== this.provider);
					if (t) {
						const e = this.provider.chainId;
						const r = this.provider.name;
						this.provider = t;
						this.blockchain.connect(t, e);
						eventManager.emit('providerSwitched', { oldProvider: r, newProvider: t.name });
						Wallet_Wallet.setInstance(this);
					}
				}
				switchToProvider(e) {
					if (!this.blockchain) {
						throw new Error('Blockchain not initialized');
					}
					let t = null;
					if (typeof e === 'string') {
						const r = this.providerNames
							.map((e) =>
								ProviderFactory.createProvider({
									name: e,
									apiKey: this.privateKey,
									chainId: this.chainId
								})
							)
							.filter((e) => e.blockchains.includes(this.blockchain.name));
						if (!r.length) {
							throw new Error('No available providers for this blockchain');
						}
						t = r.find((e) => e !== this.provider);
						if (!t) {
							t = ProviderFactory.createProvider({ name: e });
						}
					} else {
						t = e;
					}
					if (!t) {
						throw new Error(
							`Provider ${typeof e === 'string' ? e : 'unknown'} could not be created or is invalid.`
						);
					}
					if (!t.blockchains.includes(this.blockchain.name)) {
						throw new Error(
							`Provider ${t.name} does not support blockchain ${this.blockchain.name}`
						);
					}
					if (t !== this.provider) {
						const e = this.provider?.chainId || this.blockchain.chainId;
						const r = this.provider;
						this.provider = t;
						this.blockchain.connect(t, e);
						eventManager.emit('providerSwitched', { oldProvider: r?.name, newProvider: t.name });
						Wallet_Wallet.setInstance(this);
					}
				}
				async sendTransaction(e) {
					if (!this.signer) {
						if (!this.privateKey) {
							throw new Error('Private key not set');
						} else {
							await this.setSigner(this.privateKey);
						}
					}
					if (!this.blockchain || !this.provider || !this.signer) {
						console.log(
							'Blockchain, Provider, Signer:',
							this.blockchain,
							this.provider,
							this.signer
						);
						throw new Error('Blockchain or Provider or Signer not initialized');
					}
					return await this.blockchain.sendTransaction(e);
				}
				async signTypedData(e, t, r) {
					if (!this.signer) {
						throw new Error('Signer not initialized');
					}
					if (typeof this.signer.signTypedData === 'function') {
						return await this.signer.signTypedData(e, t, r);
					} else {
						throw new Error('signTypedData is not supported for the current blockchain signer');
					}
				}
				addAccount(e) {
					if (isYakklPrimaryAccount(e)) {
						this.accounts.push(e.account);
					} else {
						this.accounts.push(e);
					}
					Wallet_Wallet.setInstance(this);
				}
				getAccount(e) {
					return this.accounts.find((t) => t.address === e);
				}
				removeAccount(e) {
					this.accounts = this.accounts.filter((t) => t.address !== e);
					Wallet_Wallet.setInstance(this);
				}
				async getGasEstimate(e) {
					if (!this.blockchain) {
						throw new Error('Blockchain not initialized');
					}
					return await this.blockchain.getGasEstimate(e);
				}
				async getHistoricalGasData(e) {
					if (!this.blockchain) {
						throw new Error('Blockchain not initialized');
					}
					return await this.blockchain.getHistoricalGasData(e);
				}
				async predictFutureFees(e) {
					if (!this.blockchain) {
						throw new Error('Blockchain not initialized');
					}
					return await this.blockchain.predictFutureFees(e);
				}
			}
			class WalletManager_WalletManager {
				static instance = null && null;
				static getInstance(e, t = ['Ethereum'], r = 1, n = null, i = null) {
					if (!WalletManager_WalletManager.instance) {
						WalletManager_WalletManager.instance = new Wallet(e, t, r, n, i);
						walletStore.set(WalletManager_WalletManager.instance);
					} else {
						if (WalletManager_WalletManager.instance.getSigner() === null && i) {
							WalletManager_WalletManager.instance.setSigner(i);
							walletStore.set(WalletManager_WalletManager.instance);
						}
					}
					return WalletManager_WalletManager.instance;
				}
				static clearInstance() {
					WalletManager_WalletManager.instance = null;
					walletStore.set(null);
				}
				static setInstance(e) {
					WalletManager_WalletManager.instance = e;
					walletStore.set(e);
				}
				static get wallet() {
					return get(walletStore);
				}
			}
			const F = null && WalletManager_WalletManager;
			var C = r(469);
			var D = r(9336);
			async function verify(e) {
				try {
					if (!e) {
						return undefined;
					}
					const t = await getProfile();
					const r = await digestMessage(e);
					if (!t || !r) {
						return undefined;
					} else {
						if (isEncryptedData(t.data)) {
							await decryptData(t.data, r).then(
								(e) => {
									t.data = e;
									setMiscStore(r);
								},
								(e) => {
									throw 'Verification failed!';
								}
							);
						}
						return t;
					}
				} catch (e) {
					console.log(e);
					throw `Verification failed! - ${e}`;
				}
			}
			async function security_getYakklCurrentlySelectedAccountKey() {
				try {
					const e = await getYakklCurrentlySelected();
					const t = getMiscStore();
					let r = null;
					let n = null;
					let i = null;
					if (isEncryptedData(e.data)) {
						const r = await decryptData(e.data, t);
						const a = r;
						n = a?.account?.address || null;
						if (isEncryptedData(a?.account?.data)) {
							const e = await decryptData(a.account.data, t);
							const r = e;
							i = r.privateKey;
						} else {
							i = a ? a.account?.data.privateKey : null;
						}
					} else {
						i = e.data ? (e.data.account?.data).privateKey : null;
					}
					if (i && n) {
						r = { address: n, privateKey: i };
					}
					return r;
				} catch (e) {
					error_log(e);
					throw `Error getting account key - ${e}`;
				}
			}
			async function getInstances() {
				try {
					const e = await getYakklCurrentlySelected();
					const t = e.shortcuts?.chainId ?? 1;
					let r = null;
					r = WalletManager.getInstance(
						['Alchemy'],
						['Ethereum'],
						t,
						undefined.VITE_ALCHEMY_API_KEY_PROD
					);
					if (r) {
						if (!r.getSigner()) {
							const e = await getYakklCurrentlySelectedAccountKey();
							if (e?.privateKey) {
								await r.setSigner(e.privateKey);
							}
						}
						const e = r.getProvider();
						if (e) {
							const t = r.getSigner();
							if (t) {
								e.setSigner(t);
							}
							const n = r.getBlockchain();
							const i = new TokenService(n);
							return [r, e, n, i];
						}
						return [r, null, null, null];
					}
					return [null, null, null, null];
				} catch (e) {
					console.log('Error getting instances:', e);
					return [null, null, null, null];
				}
			}
		},
		8646: (e, t, r) => {
			'use strict';
			r.d(t, { A: () => i });
			class EventManager {
				eventListeners = new Map();
				on(e, t) {
					if (!this.eventListeners.has(e)) {
						this.eventListeners.set(e, new Set());
					}
					this.eventListeners.get(e).add(t);
					return this;
				}
				once(e, t) {
					const onceWrapper = (...r) => {
						this.off(e, onceWrapper);
						t(...r);
					};
					return this.on(e, onceWrapper);
				}
				emit(e, ...t) {
					if (!this.eventListeners.has(e)) return false;
					this.eventListeners.get(e).forEach((e) => e(...t));
					return true;
				}
				listenerCount(e) {
					if (e === undefined) {
						return Array.from(this.eventListeners.values()).reduce((e, t) => e + t.size, 0);
					}
					return this.eventListeners.get(e)?.size || 0;
				}
				listeners(e) {
					if (e === undefined) {
						return Array.from(this.eventListeners.values()).flatMap((e) => Array.from(e));
					}
					return Array.from(this.eventListeners.get(e) || []);
				}
				off(e, t) {
					if (!this.eventListeners.has(e)) return this;
					if (t) {
						this.eventListeners.get(e).delete(t);
					} else {
						this.eventListeners.delete(e);
					}
					return this;
				}
				removeAllListeners(e) {
					if (e === undefined) {
						this.eventListeners.clear();
					} else {
						this.eventListeners.delete(e);
					}
					return this;
				}
			}
			const n = new EventManager();
			const i = n;
		},
		1798: () => {},
		9322: () => {},
		4507: () => {},
		9603: () => {},
		7679: () => {}
	}
]);
