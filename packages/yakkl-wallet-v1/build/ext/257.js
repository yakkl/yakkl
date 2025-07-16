(self['webpackChunkyakkl_wallet'] = self['webpackChunkyakkl_wallet'] || []).push([
	[257, 399],
	{
		9187: (e, t, r) => {
			'use strict';
			r.d(t, { N: () => getNetwork });
			var n = r(5982);
			const s = 'networks/5.7.1';
			const o = new n.Vy(s);
			function isRenetworkable(e) {
				return e && typeof e.renetwork === 'function';
			}
			function ethDefaultProvider(e) {
				const func = function (t, r) {
					if (r == null) {
						r = {};
					}
					const n = [];
					if (t.InfuraProvider && r.infura !== '-') {
						try {
							n.push(new t.InfuraProvider(e, r.infura));
						} catch (e) {}
					}
					if (t.EtherscanProvider && r.etherscan !== '-') {
						try {
							n.push(new t.EtherscanProvider(e, r.etherscan));
						} catch (e) {}
					}
					if (t.AlchemyProvider && r.alchemy !== '-') {
						try {
							n.push(new t.AlchemyProvider(e, r.alchemy));
						} catch (e) {}
					}
					if (t.PocketProvider && r.pocket !== '-') {
						const s = ['goerli', 'ropsten', 'rinkeby', 'sepolia'];
						try {
							const o = new t.PocketProvider(e, r.pocket);
							if (o.network && s.indexOf(o.network.name) === -1) {
								n.push(o);
							}
						} catch (e) {}
					}
					if (t.CloudflareProvider && r.cloudflare !== '-') {
						try {
							n.push(new t.CloudflareProvider(e));
						} catch (e) {}
					}
					if (t.AnkrProvider && r.ankr !== '-') {
						try {
							const s = ['ropsten'];
							const o = new t.AnkrProvider(e, r.ankr);
							if (o.network && s.indexOf(o.network.name) === -1) {
								n.push(o);
							}
						} catch (e) {}
					}
					if (n.length === 0) {
						return null;
					}
					if (t.FallbackProvider) {
						let s = 1;
						if (r.quorum != null) {
							s = r.quorum;
						} else if (e === 'homestead') {
							s = 2;
						}
						return new t.FallbackProvider(n, s);
					}
					return n[0];
				};
				func.renetwork = function (e) {
					return ethDefaultProvider(e);
				};
				return func;
			}
			function etcDefaultProvider(e, t) {
				const func = function (r, n) {
					if (r.JsonRpcProvider) {
						return new r.JsonRpcProvider(e, t);
					}
					return null;
				};
				func.renetwork = function (t) {
					return etcDefaultProvider(e, t);
				};
				return func;
			}
			const i = {
				chainId: 1,
				ensAddress: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
				name: 'homestead',
				_defaultProvider: ethDefaultProvider('homestead')
			};
			const a = {
				chainId: 3,
				ensAddress: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
				name: 'ropsten',
				_defaultProvider: ethDefaultProvider('ropsten')
			};
			const l = {
				chainId: 63,
				name: 'classicMordor',
				_defaultProvider: etcDefaultProvider('https://www.ethercluster.com/mordor', 'classicMordor')
			};
			const c = {
				unspecified: { chainId: 0, name: 'unspecified' },
				homestead: i,
				mainnet: i,
				morden: { chainId: 2, name: 'morden' },
				ropsten: a,
				testnet: a,
				rinkeby: {
					chainId: 4,
					ensAddress: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
					name: 'rinkeby',
					_defaultProvider: ethDefaultProvider('rinkeby')
				},
				kovan: { chainId: 42, name: 'kovan', _defaultProvider: ethDefaultProvider('kovan') },
				goerli: {
					chainId: 5,
					ensAddress: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
					name: 'goerli',
					_defaultProvider: ethDefaultProvider('goerli')
				},
				kintsugi: { chainId: 1337702, name: 'kintsugi' },
				sepolia: {
					chainId: 11155111,
					name: 'sepolia',
					_defaultProvider: ethDefaultProvider('sepolia')
				},
				classic: {
					chainId: 61,
					name: 'classic',
					_defaultProvider: etcDefaultProvider('https://www.ethercluster.com/etc', 'classic')
				},
				classicMorden: { chainId: 62, name: 'classicMorden' },
				classicMordor: l,
				classicTestnet: l,
				classicKotti: {
					chainId: 6,
					name: 'classicKotti',
					_defaultProvider: etcDefaultProvider('https://www.ethercluster.com/kotti', 'classicKotti')
				},
				xdai: { chainId: 100, name: 'xdai' },
				matic: { chainId: 137, name: 'matic', _defaultProvider: ethDefaultProvider('matic') },
				maticmum: { chainId: 80001, name: 'maticmum' },
				optimism: {
					chainId: 10,
					name: 'optimism',
					_defaultProvider: ethDefaultProvider('optimism')
				},
				'optimism-kovan': { chainId: 69, name: 'optimism-kovan' },
				'optimism-goerli': { chainId: 420, name: 'optimism-goerli' },
				arbitrum: { chainId: 42161, name: 'arbitrum' },
				'arbitrum-rinkeby': { chainId: 421611, name: 'arbitrum-rinkeby' },
				'arbitrum-goerli': { chainId: 421613, name: 'arbitrum-goerli' },
				bnb: { chainId: 56, name: 'bnb' },
				bnbt: { chainId: 97, name: 'bnbt' }
			};
			function getNetwork(e) {
				if (e == null) {
					return null;
				}
				if (typeof e === 'number') {
					for (const t in c) {
						const r = c[t];
						if (r.chainId === e) {
							return {
								name: r.name,
								chainId: r.chainId,
								ensAddress: r.ensAddress || null,
								_defaultProvider: r._defaultProvider || null
							};
						}
					}
					return { chainId: e, name: 'unknown' };
				}
				if (typeof e === 'string') {
					const t = c[e];
					if (t == null) {
						return null;
					}
					return {
						name: t.name,
						chainId: t.chainId,
						ensAddress: t.ensAddress,
						_defaultProvider: t._defaultProvider || null
					};
				}
				const t = c[e.name];
				if (!t) {
					if (typeof e.chainId !== 'number') {
						o.throwArgumentError('invalid network chainId', 'network', e);
					}
					return e;
				}
				if (e.chainId !== 0 && e.chainId !== t.chainId) {
					o.throwArgumentError('network chainId mismatch', 'network', e);
				}
				let r = e._defaultProvider || null;
				if (r == null && t._defaultProvider) {
					if (isRenetworkable(t._defaultProvider)) {
						r = t._defaultProvider.renetwork(e);
					} else {
						r = t._defaultProvider;
					}
				}
				return {
					name: e.name,
					chainId: t.chainId,
					ensAddress: e.ensAddress || t.ensAddress || null,
					_defaultProvider: r
				};
			}
		},
		2406: (e, t, r) => {
			'use strict';
			r.d(t, { r: () => n });
			const n = 'providers/5.7.2';
		},
		1015: (e, t, r) => {
			'use strict';
			r.d(t, { F: () => JsonRpcProvider });
			var n = r(5068);
			var s = r(2834);
			var o = r(1519);
			var i = r(1424);
			var a = r(3116);
			var l = r(5250);
			var c = r(3231);
			var u = r(8628);
			var h = r(5982);
			var d = r(2406);
			var f = r(4952);
			var m = r(3162);
			var g = r(797);
			const p = '0x0000000000000000000000000000000000000000000000000000000000000000';
			var A = r(4781);
			var y = r(3404);
			function flat(e, t) {
				if (t == null) {
					t = 1;
				}
				const r = [];
				const n = r.forEach;
				const flatDeep = function (e, t) {
					n.call(e, function (e) {
						if (t > 0 && Array.isArray(e)) {
							flatDeep(e, t - 1);
						} else {
							r.push(e);
						}
					});
				};
				flatDeep(e, t);
				return r;
			}
			function fromEntries(e) {
				const t = {};
				for (let r = 0; r < e.length; r++) {
					const n = e[r];
					t[n[0]] = n[1];
				}
				return t;
			}
			function decode_arithmetic(e) {
				let t = 0;
				function u16() {
					return (e[t++] << 8) | e[t++];
				}
				let r = u16();
				let n = 1;
				let s = [0, 1];
				for (let e = 1; e < r; e++) {
					s.push((n += u16()));
				}
				let o = u16();
				let i = t;
				t += o;
				let a = 0;
				let l = 0;
				function read_bit() {
					if (a == 0) {
						l = (l << 8) | e[t++];
						a = 8;
					}
					return (l >> --a) & 1;
				}
				const c = 31;
				const u = Math.pow(2, c);
				const h = u >>> 1;
				const d = h >> 1;
				const f = u - 1;
				let m = 0;
				for (let e = 0; e < c; e++) m = (m << 1) | read_bit();
				let g = [];
				let p = 0;
				let A = u;
				while (true) {
					let e = Math.floor(((m - p + 1) * n - 1) / A);
					let t = 0;
					let o = r;
					while (o - t > 1) {
						let r = (t + o) >>> 1;
						if (e < s[r]) {
							o = r;
						} else {
							t = r;
						}
					}
					if (t == 0) break;
					g.push(t);
					let i = p + Math.floor((A * s[t]) / n);
					let a = p + Math.floor((A * s[t + 1]) / n) - 1;
					while (((i ^ a) & h) == 0) {
						m = ((m << 1) & f) | read_bit();
						i = (i << 1) & f;
						a = ((a << 1) & f) | 1;
					}
					while (i & ~a & d) {
						m = (m & h) | ((m << 1) & (f >>> 1)) | read_bit();
						i = (i << 1) ^ h;
						a = ((a ^ h) << 1) | h | 1;
					}
					p = i;
					A = 1 + a - i;
				}
				let y = r - 4;
				return g.map((t) => {
					switch (t - y) {
						case 3:
							return y + 65792 + ((e[i++] << 16) | (e[i++] << 8) | e[i++]);
						case 2:
							return y + 256 + ((e[i++] << 8) | e[i++]);
						case 1:
							return y + e[i++];
						default:
							return t - 1;
					}
				});
			}
			function read_payload(e) {
				let t = 0;
				return () => e[t++];
			}
			function read_compressed_payload(e) {
				return read_payload(decode_arithmetic(e));
			}
			function signed(e) {
				return e & 1 ? ~e >> 1 : e >> 1;
			}
			function read_counts(e, t) {
				let r = Array(e);
				for (let n = 0; n < e; n++) r[n] = 1 + t();
				return r;
			}
			function read_ascending(e, t) {
				let r = Array(e);
				for (let n = 0, s = -1; n < e; n++) r[n] = s += 1 + t();
				return r;
			}
			function read_deltas(e, t) {
				let r = Array(e);
				for (let n = 0, s = 0; n < e; n++) r[n] = s += signed(t());
				return r;
			}
			function read_member_array(e, t) {
				let r = read_ascending(e(), e);
				let n = e();
				let s = read_ascending(n, e);
				let o = read_counts(n, e);
				for (let e = 0; e < n; e++) {
					for (let t = 0; t < o[e]; t++) {
						r.push(s[e] + t);
					}
				}
				return t ? r.map((e) => t[e]) : r;
			}
			function read_mapped_map(e) {
				let t = [];
				while (true) {
					let r = e();
					if (r == 0) break;
					t.push(read_linear_table(r, e));
				}
				while (true) {
					let r = e() - 1;
					if (r < 0) break;
					t.push(read_replacement_table(r, e));
				}
				return fromEntries(flat(t));
			}
			function read_zero_terminated_array(e) {
				let t = [];
				while (true) {
					let r = e();
					if (r == 0) break;
					t.push(r);
				}
				return t;
			}
			function read_transposed(e, t, r) {
				let n = Array(e)
					.fill(undefined)
					.map(() => []);
				for (let s = 0; s < t; s++) {
					read_deltas(e, r).forEach((e, t) => n[t].push(e));
				}
				return n;
			}
			function read_linear_table(e, t) {
				let r = 1 + t();
				let n = t();
				let s = read_zero_terminated_array(t);
				let o = read_transposed(s.length, 1 + e, t);
				return flat(
					o.map((e, t) => {
						const o = e[0],
							i = e.slice(1);
						return Array(s[t])
							.fill(undefined)
							.map((e, t) => {
								let s = t * n;
								return [o + t * r, i.map((e) => e + s)];
							});
					})
				);
			}
			function read_replacement_table(e, t) {
				let r = 1 + t();
				let n = read_transposed(r, 1 + e, t);
				return n.map((e) => [e[0], e.slice(1)]);
			}
			function read_emoji_trie(e) {
				let t = read_member_array(e).sort((e, t) => e - t);
				return read();
				function read() {
					let r = [];
					while (true) {
						let n = read_member_array(e, t);
						if (n.length == 0) break;
						r.push({ set: new Set(n), node: read() });
					}
					r.sort((e, t) => t.set.size - e.set.size);
					let n = e();
					let s = n % 3;
					n = (n / 3) | 0;
					let o = !!(n & 1);
					n >>= 1;
					let i = n == 1;
					let a = n == 2;
					return { branches: r, valid: s, fe0f: o, save: i, check: a };
				}
			}
			function getData() {
				return read_compressed_payload(
					(0, m.D)(
						'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'
					)
				);
			}
			const b = getData();
			const v = new Set(read_member_array(b));
			const w = new Set(read_member_array(b));
			const k = read_mapped_map(b);
			const E = read_emoji_trie(b);
			const N = 45;
			const _ = 95;
			function explode_cp(e) {
				return (0, l.dg)(e);
			}
			function filter_fe0f(e) {
				return e.filter((e) => e != 65039);
			}
			function ens_normalize_post_check(e) {
				for (let t of e.split('.')) {
					let e = explode_cp(t);
					try {
						for (let t = e.lastIndexOf(_) - 1; t >= 0; t--) {
							if (e[t] !== _) {
								throw new Error(`underscore only allowed at start`);
							}
						}
						if (e.length >= 4 && e.every((e) => e < 128) && e[2] === N && e[3] === N) {
							throw new Error(`invalid label extension`);
						}
					} catch (e) {
						throw new Error(`Invalid label "${t}": ${e.message}`);
					}
				}
				return e;
			}
			function ens_normalize(e) {
				return ens_normalize_post_check(normalize(e, filter_fe0f));
			}
			function normalize(e, t) {
				let r = explode_cp(e).reverse();
				let n = [];
				while (r.length) {
					let e = consume_emoji_reversed(r);
					if (e) {
						n.push(...t(e));
						continue;
					}
					let s = r.pop();
					if (v.has(s)) {
						n.push(s);
						continue;
					}
					if (w.has(s)) {
						continue;
					}
					let o = k[s];
					if (o) {
						n.push(...o);
						continue;
					}
					throw new Error(`Disallowed codepoint: 0x${s.toString(16).toUpperCase()}`);
				}
				return ens_normalize_post_check(nfc(String.fromCodePoint(...n)));
			}
			function nfc(e) {
				return e.normalize('NFC');
			}
			function consume_emoji_reversed(e, t) {
				var r;
				let n = E;
				let s;
				let o;
				let i = [];
				let a = e.length;
				if (t) t.length = 0;
				while (a) {
					let l = e[--a];
					n = (r = n.branches.find((e) => e.set.has(l))) === null || r === void 0 ? void 0 : r.node;
					if (!n) break;
					if (n.save) {
						o = l;
					} else if (n.check) {
						if (l === o) break;
					}
					i.push(l);
					if (n.fe0f) {
						i.push(65039);
						if (a > 0 && e[a - 1] == 65039) a--;
					}
					if (n.valid) {
						s = i.slice();
						if (n.valid == 2) s.splice(1, 1);
						if (t) t.push(...e.slice(a).reverse());
						e.length = a;
					}
				}
				return s;
			}
			const B = new h.Vy(y.r);
			const C = new Uint8Array(32);
			C.fill(0);
			function checkComponent(e) {
				if (e.length === 0) {
					throw new Error('invalid ENS name; empty component');
				}
				return e;
			}
			function ensNameSplit(e) {
				const t = (0, l.YW)(ens_normalize(e));
				const r = [];
				if (e.length === 0) {
					return r;
				}
				let n = 0;
				for (let e = 0; e < t.length; e++) {
					const s = t[e];
					if (s === 46) {
						r.push(checkComponent(t.slice(n, e)));
						n = e + 1;
					}
				}
				if (n >= t.length) {
					throw new Error('invalid ENS name; empty component');
				}
				r.push(checkComponent(t.slice(n)));
				return r;
			}
			function ensNormalize(e) {
				return ensNameSplit(e)
					.map((e) => toUtf8String(e))
					.join('.');
			}
			function isValidName(e) {
				try {
					return ensNameSplit(e).length !== 0;
				} catch (e) {}
				return false;
			}
			function namehash(e) {
				if (typeof e !== 'string') {
					B.throwArgumentError('invalid ENS name; not a string', 'name', e);
				}
				let t = C;
				const r = ensNameSplit(e);
				while (r.length) {
					t = (0, A.S)((0, o.xW)([t, (0, A.S)(r.pop())]));
				}
				return (0, o.c$)(t);
			}
			function dnsEncode(e) {
				return (
					(0, o.c$)(
						(0, o.xW)(
							ensNameSplit(e).map((e) => {
								if (e.length > 63) {
									throw new Error('invalid DNS encoded entry; length exceeds 63 bytes');
								}
								const t = new Uint8Array(e.length + 1);
								t.set(e, 1);
								t[0] = t.length - 1;
								return t;
							})
						)
					) + '00'
				);
			}
			var I = r(9187);
			var T = r(985);
			var R = r(5994);
			var P = r.n(R);
			var S = r(716);
			const O = '0x0000000000000000000000000000000000000000';
			const x = new h.Vy(d.r);
			class Formatter {
				constructor() {
					this.formats = this.getDefaultFormats();
				}
				getDefaultFormats() {
					const e = {};
					const t = this.address.bind(this);
					const r = this.bigNumber.bind(this);
					const n = this.blockTag.bind(this);
					const s = this.data.bind(this);
					const o = this.hash.bind(this);
					const i = this.hex.bind(this);
					const l = this.number.bind(this);
					const c = this.type.bind(this);
					const strictData = (e) => this.data(e, true);
					e.transaction = {
						hash: o,
						type: c,
						accessList: Formatter.allowNull(this.accessList.bind(this), null),
						blockHash: Formatter.allowNull(o, null),
						blockNumber: Formatter.allowNull(l, null),
						transactionIndex: Formatter.allowNull(l, null),
						confirmations: Formatter.allowNull(l, null),
						from: t,
						gasPrice: Formatter.allowNull(r),
						maxPriorityFeePerGas: Formatter.allowNull(r),
						maxFeePerGas: Formatter.allowNull(r),
						gasLimit: r,
						to: Formatter.allowNull(t, null),
						value: r,
						nonce: l,
						data: s,
						r: Formatter.allowNull(this.uint256),
						s: Formatter.allowNull(this.uint256),
						v: Formatter.allowNull(l),
						creates: Formatter.allowNull(t, null),
						raw: Formatter.allowNull(s)
					};
					e.transactionRequest = {
						from: Formatter.allowNull(t),
						nonce: Formatter.allowNull(l),
						gasLimit: Formatter.allowNull(r),
						gasPrice: Formatter.allowNull(r),
						maxPriorityFeePerGas: Formatter.allowNull(r),
						maxFeePerGas: Formatter.allowNull(r),
						to: Formatter.allowNull(t),
						value: Formatter.allowNull(r),
						data: Formatter.allowNull(strictData),
						type: Formatter.allowNull(l),
						accessList: Formatter.allowNull(this.accessList.bind(this), null)
					};
					e.receiptLog = {
						transactionIndex: l,
						blockNumber: l,
						transactionHash: o,
						address: t,
						topics: Formatter.arrayOf(o),
						data: s,
						logIndex: l,
						blockHash: o
					};
					e.receipt = {
						to: Formatter.allowNull(this.address, null),
						from: Formatter.allowNull(this.address, null),
						contractAddress: Formatter.allowNull(t, null),
						transactionIndex: l,
						root: Formatter.allowNull(i),
						gasUsed: r,
						logsBloom: Formatter.allowNull(s),
						blockHash: o,
						transactionHash: o,
						logs: Formatter.arrayOf(this.receiptLog.bind(this)),
						blockNumber: l,
						confirmations: Formatter.allowNull(l, null),
						cumulativeGasUsed: r,
						effectiveGasPrice: Formatter.allowNull(r),
						status: Formatter.allowNull(l),
						type: c
					};
					e.block = {
						hash: Formatter.allowNull(o),
						parentHash: o,
						number: l,
						timestamp: l,
						nonce: Formatter.allowNull(i),
						difficulty: this.difficulty.bind(this),
						gasLimit: r,
						gasUsed: r,
						miner: Formatter.allowNull(t),
						extraData: s,
						transactions: Formatter.allowNull(Formatter.arrayOf(o)),
						baseFeePerGas: Formatter.allowNull(r)
					};
					e.blockWithTransactions = (0, a.Ic)(e.block);
					e.blockWithTransactions.transactions = Formatter.allowNull(
						Formatter.arrayOf(this.transactionResponse.bind(this))
					);
					e.filter = {
						fromBlock: Formatter.allowNull(n, undefined),
						toBlock: Formatter.allowNull(n, undefined),
						blockHash: Formatter.allowNull(o, undefined),
						address: Formatter.allowNull(t, undefined),
						topics: Formatter.allowNull(this.topics.bind(this), undefined)
					};
					e.filterLog = {
						blockNumber: Formatter.allowNull(l),
						blockHash: Formatter.allowNull(o),
						transactionIndex: l,
						removed: Formatter.allowNull(this.boolean.bind(this)),
						address: t,
						data: Formatter.allowFalsish(s, '0x'),
						topics: Formatter.arrayOf(o),
						transactionHash: o,
						logIndex: l
					};
					return e;
				}
				accessList(e) {
					return (0, c.$2)(e || []);
				}
				number(e) {
					if (e === '0x') {
						return 0;
					}
					return s.gH.from(e).toNumber();
				}
				type(e) {
					if (e === '0x' || e == null) {
						return 0;
					}
					return s.gH.from(e).toNumber();
				}
				bigNumber(e) {
					return s.gH.from(e);
				}
				boolean(e) {
					if (typeof e === 'boolean') {
						return e;
					}
					if (typeof e === 'string') {
						e = e.toLowerCase();
						if (e === 'true') {
							return true;
						}
						if (e === 'false') {
							return false;
						}
					}
					throw new Error('invalid boolean - ' + e);
				}
				hex(e, t) {
					if (typeof e === 'string') {
						if (!t && e.substring(0, 2) !== '0x') {
							e = '0x' + e;
						}
						if ((0, o.Lo)(e)) {
							return e.toLowerCase();
						}
					}
					return x.throwArgumentError('invalid hash', 'value', e);
				}
				data(e, t) {
					const r = this.hex(e, t);
					if (r.length % 2 !== 0) {
						throw new Error('invalid data; odd-length - ' + e);
					}
					return r;
				}
				address(e) {
					return (0, S.bv)(e);
				}
				callAddress(e) {
					if (!(0, o.Lo)(e, 32)) {
						return null;
					}
					const t = (0, S.bv)((0, o.Ab)(e, 12));
					return t === O ? null : t;
				}
				contractAddress(e) {
					return (0, S.RZ)(e);
				}
				blockTag(e) {
					if (e == null) {
						return 'latest';
					}
					if (e === 'earliest') {
						return '0x0';
					}
					switch (e) {
						case 'earliest':
							return '0x0';
						case 'latest':
						case 'pending':
						case 'safe':
						case 'finalized':
							return e;
					}
					if (typeof e === 'number' || (0, o.Lo)(e)) {
						return (0, o.Fh)(e);
					}
					throw new Error('invalid blockTag');
				}
				hash(e, t) {
					const r = this.hex(e, t);
					if ((0, o.cm)(r) !== 32) {
						return x.throwArgumentError('invalid hash', 'value', e);
					}
					return r;
				}
				difficulty(e) {
					if (e == null) {
						return null;
					}
					const t = s.gH.from(e);
					try {
						return t.toNumber();
					} catch (e) {}
					return null;
				}
				uint256(e) {
					if (!(0, o.Lo)(e)) {
						throw new Error('invalid uint256');
					}
					return (0, o.bj)(e, 32);
				}
				_block(e, t) {
					if (e.author != null && e.miner == null) {
						e.miner = e.author;
					}
					const r = e._difficulty != null ? e._difficulty : e.difficulty;
					const n = Formatter.check(t, e);
					n._difficulty = r == null ? null : s.gH.from(r);
					return n;
				}
				block(e) {
					return this._block(e, this.formats.block);
				}
				blockWithTransactions(e) {
					return this._block(e, this.formats.blockWithTransactions);
				}
				transactionRequest(e) {
					return Formatter.check(this.formats.transactionRequest, e);
				}
				transactionResponse(e) {
					if (e.gas != null && e.gasLimit == null) {
						e.gasLimit = e.gas;
					}
					if (e.to && s.gH.from(e.to).isZero()) {
						e.to = '0x0000000000000000000000000000000000000000';
					}
					if (e.input != null && e.data == null) {
						e.data = e.input;
					}
					if (e.to == null && e.creates == null) {
						e.creates = this.contractAddress(e);
					}
					if ((e.type === 1 || e.type === 2) && e.accessList == null) {
						e.accessList = [];
					}
					const t = Formatter.check(this.formats.transaction, e);
					if (e.chainId != null) {
						let r = e.chainId;
						if ((0, o.Lo)(r)) {
							r = s.gH.from(r).toNumber();
						}
						t.chainId = r;
					} else {
						let r = e.networkId;
						if (r == null && t.v == null) {
							r = e.chainId;
						}
						if ((0, o.Lo)(r)) {
							r = s.gH.from(r).toNumber();
						}
						if (typeof r !== 'number' && t.v != null) {
							r = (t.v - 35) / 2;
							if (r < 0) {
								r = 0;
							}
							r = parseInt(r);
						}
						if (typeof r !== 'number') {
							r = 0;
						}
						t.chainId = r;
					}
					if (t.blockHash && t.blockHash.replace(/0/g, '') === 'x') {
						t.blockHash = null;
					}
					return t;
				}
				transaction(e) {
					return (0, c.qg)(e);
				}
				receiptLog(e) {
					return Formatter.check(this.formats.receiptLog, e);
				}
				receipt(e) {
					const t = Formatter.check(this.formats.receipt, e);
					if (t.root != null) {
						if (t.root.length <= 4) {
							const e = s.gH.from(t.root).toNumber();
							if (e === 0 || e === 1) {
								if (t.status != null && t.status !== e) {
									x.throwArgumentError('alt-root-status/status mismatch', 'value', {
										root: t.root,
										status: t.status
									});
								}
								t.status = e;
								delete t.root;
							} else {
								x.throwArgumentError('invalid alt-root-status', 'value.root', t.root);
							}
						} else if (t.root.length !== 66) {
							x.throwArgumentError('invalid root hash', 'value.root', t.root);
						}
					}
					if (t.status != null) {
						t.byzantium = true;
					}
					return t;
				}
				topics(e) {
					if (Array.isArray(e)) {
						return e.map((e) => this.topics(e));
					} else if (e != null) {
						return this.hash(e, true);
					}
					return null;
				}
				filter(e) {
					return Formatter.check(this.formats.filter, e);
				}
				filterLog(e) {
					return Formatter.check(this.formats.filterLog, e);
				}
				static check(e, t) {
					const r = {};
					for (const n in e) {
						try {
							const s = e[n](t[n]);
							if (s !== undefined) {
								r[n] = s;
							}
						} catch (e) {
							e.checkKey = n;
							e.checkValue = t[n];
							throw e;
						}
					}
					return r;
				}
				static allowNull(e, t) {
					return function (r) {
						if (r == null) {
							return t;
						}
						return e(r);
					};
				}
				static allowFalsish(e, t) {
					return function (r) {
						if (!r) {
							return t;
						}
						return e(r);
					};
				}
				static arrayOf(e) {
					return function (t) {
						if (!Array.isArray(t)) {
							throw new Error('not an array');
						}
						const r = [];
						t.forEach(function (t) {
							r.push(e(t));
						});
						return r;
					};
				}
			}
			function isCommunityResourcable(e) {
				return e && typeof e.isCommunityResource === 'function';
			}
			function isCommunityResource(e) {
				return isCommunityResourcable(e) && e.isCommunityResource();
			}
			let L = false;
			function showThrottleMessage() {
				if (L) {
					return;
				}
				L = true;
				console.log('========= NOTICE =========');
				console.log('Request-Rate Exceeded  (this message will not be repeated)');
				console.log('');
				console.log('The default API keys for each service are provided as a highly-throttled,');
				console.log('community resource for low-traffic projects and early prototyping.');
				console.log('');
				console.log('While your application will continue to function, we highly recommended');
				console.log('signing up for your own API keys to improve performance, increase your');
				console.log(
					'request rate/limit and enable other perks, such as metrics and advanced APIs.'
				);
				console.log('');
				console.log('For more details: https://docs.ethers.io/api-keys/');
				console.log('==========================');
			}
			var F =
				(undefined && undefined.__awaiter) ||
				function (e, t, r, n) {
					function adopt(e) {
						return e instanceof r
							? e
							: new r(function (t) {
									t(e);
								});
					}
					return new (r || (r = Promise))(function (r, s) {
						function fulfilled(e) {
							try {
								step(n.next(e));
							} catch (e) {
								s(e);
							}
						}
						function rejected(e) {
							try {
								step(n['throw'](e));
							} catch (e) {
								s(e);
							}
						}
						function step(e) {
							e.done ? r(e.value) : adopt(e.value).then(fulfilled, rejected);
						}
						step((n = n.apply(e, t || [])).next());
					});
				};
			const D = new h.Vy(d.r);
			const H = 10;
			function checkTopic(e) {
				if (e == null) {
					return 'null';
				}
				if ((0, o.cm)(e) !== 32) {
					D.throwArgumentError('invalid topic', 'topic', e);
				}
				return e.toLowerCase();
			}
			function serializeTopics(e) {
				e = e.slice();
				while (e.length > 0 && e[e.length - 1] == null) {
					e.pop();
				}
				return e
					.map((e) => {
						if (Array.isArray(e)) {
							const t = {};
							e.forEach((e) => {
								t[checkTopic(e)] = true;
							});
							const r = Object.keys(t);
							r.sort();
							return r.join('|');
						} else {
							return checkTopic(e);
						}
					})
					.join('&');
			}
			function deserializeTopics(e) {
				if (e === '') {
					return [];
				}
				return e.split(/&/g).map((e) => {
					if (e === '') {
						return [];
					}
					const t = e.split('|').map((e) => (e === 'null' ? null : e));
					return t.length === 1 ? t[0] : t;
				});
			}
			function getEventTag(e) {
				if (typeof e === 'string') {
					e = e.toLowerCase();
					if ((0, o.cm)(e) === 32) {
						return 'tx:' + e;
					}
					if (e.indexOf(':') === -1) {
						return e;
					}
				} else if (Array.isArray(e)) {
					return 'filter:*:' + serializeTopics(e);
				} else if (f.Rj.isForkEvent(e)) {
					D.warn('not implemented');
					throw new Error('not implemented');
				} else if (e && typeof e === 'object') {
					return 'filter:' + (e.address || '*') + ':' + serializeTopics(e.topics || []);
				}
				throw new Error('invalid event - ' + e);
			}
			function getTime() {
				return new Date().getTime();
			}
			function stall(e) {
				return new Promise((t) => {
					setTimeout(t, e);
				});
			}
			const U = ['block', 'network', 'pending', 'poll'];
			class Event {
				constructor(e, t, r) {
					(0, a.yY)(this, 'tag', e);
					(0, a.yY)(this, 'listener', t);
					(0, a.yY)(this, 'once', r);
					this._lastBlockNumber = -2;
					this._inflight = false;
				}
				get event() {
					switch (this.type) {
						case 'tx':
							return this.hash;
						case 'filter':
							return this.filter;
					}
					return this.tag;
				}
				get type() {
					return this.tag.split(':')[0];
				}
				get hash() {
					const e = this.tag.split(':');
					if (e[0] !== 'tx') {
						return null;
					}
					return e[1];
				}
				get filter() {
					const e = this.tag.split(':');
					if (e[0] !== 'filter') {
						return null;
					}
					const t = e[1];
					const r = deserializeTopics(e[2]);
					const n = {};
					if (r.length > 0) {
						n.topics = r;
					}
					if (t && t !== '*') {
						n.address = t;
					}
					return n;
				}
				pollable() {
					return this.tag.indexOf(':') >= 0 || U.indexOf(this.tag) >= 0;
				}
			}
			const W = {
				0: { symbol: 'btc', p2pkh: 0, p2sh: 5, prefix: 'bc' },
				2: { symbol: 'ltc', p2pkh: 48, p2sh: 50, prefix: 'ltc' },
				3: { symbol: 'doge', p2pkh: 30, p2sh: 22 },
				60: { symbol: 'eth', ilk: 'eth' },
				61: { symbol: 'etc', ilk: 'eth' },
				700: { symbol: 'xdai', ilk: 'eth' }
			};
			function bytes32ify(e) {
				return (0, o.bj)(s.gH.from(e).toHexString(), 32);
			}
			function base58Encode(e) {
				return g.zn.encode((0, o.xW)([e, (0, o.Ab)((0, T.sc)((0, T.sc)(e)), 0, 4)]));
			}
			const Q = new RegExp('^(ipfs)://(.*)$', 'i');
			const M = [
				new RegExp('^(https)://(.*)$', 'i'),
				new RegExp('^(data):(.*)$', 'i'),
				Q,
				new RegExp('^eip155:[0-9]+/(erc[0-9]+):(.*)$', 'i')
			];
			function _parseString(e, t) {
				try {
					return (0, l._v)(_parseBytes(e, t));
				} catch (e) {}
				return null;
			}
			function _parseBytes(e, t) {
				if (e === '0x') {
					return null;
				}
				const r = s.gH.from((0, o.Ab)(e, t, t + 32)).toNumber();
				const n = s.gH.from((0, o.Ab)(e, r, r + 32)).toNumber();
				return (0, o.Ab)(e, r + 32, r + 32 + n);
			}
			function getIpfsLink(e) {
				if (e.match(/^ipfs:\/\/ipfs\//i)) {
					e = e.substring(12);
				} else if (e.match(/^ipfs:\/\//i)) {
					e = e.substring(7);
				} else {
					D.throwArgumentError('unsupported IPFS format', 'link', e);
				}
				return `https://gateway.ipfs.io/ipfs/${e}`;
			}
			function numPad(e) {
				const t = (0, o.k9)(e);
				if (t.length > 32) {
					throw new Error('internal; should not happen');
				}
				const r = new Uint8Array(32);
				r.set(t, 32 - t.length);
				return r;
			}
			function bytesPad(e) {
				if (e.length % 32 === 0) {
					return e;
				}
				const t = new Uint8Array(Math.ceil(e.length / 32) * 32);
				t.set(e);
				return t;
			}
			function encodeBytes(e) {
				const t = [];
				let r = 0;
				for (let n = 0; n < e.length; n++) {
					t.push(null);
					r += 32;
				}
				for (let n = 0; n < e.length; n++) {
					const s = (0, o.k9)(e[n]);
					t[n] = numPad(r);
					t.push(numPad(s.length));
					t.push(bytesPad(s));
					r += 32 + Math.ceil(s.length / 32) * 32;
				}
				return (0, o.qn)(t);
			}
			class Resolver {
				constructor(e, t, r, n) {
					(0, a.yY)(this, 'provider', e);
					(0, a.yY)(this, 'name', r);
					(0, a.yY)(this, 'address', e.formatter.address(t));
					(0, a.yY)(this, '_resolvedAddress', n);
				}
				supportsWildcard() {
					if (!this._supportsEip2544) {
						this._supportsEip2544 = this.provider
							.call({
								to: this.address,
								data: '0x01ffc9a79061b92300000000000000000000000000000000000000000000000000000000'
							})
							.then((e) => s.gH.from(e).eq(1))
							.catch((e) => {
								if (e.code === h.Vy.errors.CALL_EXCEPTION) {
									return false;
								}
								this._supportsEip2544 = null;
								throw e;
							});
					}
					return this._supportsEip2544;
				}
				_fetch(e, t) {
					return F(this, void 0, void 0, function* () {
						const r = {
							to: this.address,
							ccipReadEnabled: true,
							data: (0, o.qn)([e, namehash(this.name), t || '0x'])
						};
						let n = false;
						if (yield this.supportsWildcard()) {
							n = true;
							r.data = (0, o.qn)(['0x9061b923', encodeBytes([dnsEncode(this.name), r.data])]);
						}
						try {
							let e = yield this.provider.call(r);
							if ((0, o.k9)(e).length % 32 === 4) {
								D.throwError('resolver threw error', h.Vy.errors.CALL_EXCEPTION, {
									transaction: r,
									data: e
								});
							}
							if (n) {
								e = _parseBytes(e, 0);
							}
							return e;
						} catch (e) {
							if (e.code === h.Vy.errors.CALL_EXCEPTION) {
								return null;
							}
							throw e;
						}
					});
				}
				_fetchBytes(e, t) {
					return F(this, void 0, void 0, function* () {
						const r = yield this._fetch(e, t);
						if (r != null) {
							return _parseBytes(r, 0);
						}
						return null;
					});
				}
				_getAddress(e, t) {
					const r = W[String(e)];
					if (r == null) {
						D.throwError(`unsupported coin type: ${e}`, h.Vy.errors.UNSUPPORTED_OPERATION, {
							operation: `getAddress(${e})`
						});
					}
					if (r.ilk === 'eth') {
						return this.provider.formatter.address(t);
					}
					const n = (0, o.k9)(t);
					if (r.p2pkh != null) {
						const e = t.match(/^0x76a9([0-9a-f][0-9a-f])([0-9a-f]*)88ac$/);
						if (e) {
							const t = parseInt(e[1], 16);
							if (e[2].length === t * 2 && t >= 1 && t <= 75) {
								return base58Encode((0, o.xW)([[r.p2pkh], '0x' + e[2]]));
							}
						}
					}
					if (r.p2sh != null) {
						const e = t.match(/^0xa9([0-9a-f][0-9a-f])([0-9a-f]*)87$/);
						if (e) {
							const t = parseInt(e[1], 16);
							if (e[2].length === t * 2 && t >= 1 && t <= 75) {
								return base58Encode((0, o.xW)([[r.p2sh], '0x' + e[2]]));
							}
						}
					}
					if (r.prefix != null) {
						const e = n[1];
						let t = n[0];
						if (t === 0) {
							if (e !== 20 && e !== 32) {
								t = -1;
							}
						} else {
							t = -1;
						}
						if (t >= 0 && n.length === 2 + e && e >= 1 && e <= 75) {
							const e = P().toWords(n.slice(2));
							e.unshift(t);
							return P().encode(r.prefix, e);
						}
					}
					return null;
				}
				getAddress(e) {
					return F(this, void 0, void 0, function* () {
						if (e == null) {
							e = 60;
						}
						if (e === 60) {
							try {
								const e = yield this._fetch('0x3b3b57de');
								if (e === '0x' || e === p) {
									return null;
								}
								return this.provider.formatter.callAddress(e);
							} catch (e) {
								if (e.code === h.Vy.errors.CALL_EXCEPTION) {
									return null;
								}
								throw e;
							}
						}
						const t = yield this._fetchBytes('0xf1cb7e06', bytes32ify(e));
						if (t == null || t === '0x') {
							return null;
						}
						const r = this._getAddress(e, t);
						if (r == null) {
							D.throwError(`invalid or unsupported coin data`, h.Vy.errors.UNSUPPORTED_OPERATION, {
								operation: `getAddress(${e})`,
								coinType: e,
								data: t
							});
						}
						return r;
					});
				}
				getAvatar() {
					return F(this, void 0, void 0, function* () {
						const e = [{ type: 'name', content: this.name }];
						try {
							const t = yield this.getText('avatar');
							if (t == null) {
								return null;
							}
							for (let r = 0; r < M.length; r++) {
								const n = t.match(M[r]);
								if (n == null) {
									continue;
								}
								const i = n[1].toLowerCase();
								switch (i) {
									case 'https':
										e.push({ type: 'url', content: t });
										return { linkage: e, url: t };
									case 'data':
										e.push({ type: 'data', content: t });
										return { linkage: e, url: t };
									case 'ipfs':
										e.push({ type: 'ipfs', content: t });
										return { linkage: e, url: getIpfsLink(t) };
									case 'erc721':
									case 'erc1155': {
										const r = i === 'erc721' ? '0xc87b56dd' : '0x0e89341c';
										e.push({ type: i, content: t });
										const a = this._resolvedAddress || (yield this.getAddress());
										const l = (n[2] || '').split('/');
										if (l.length !== 2) {
											return null;
										}
										const c = yield this.provider.formatter.address(l[0]);
										const h = (0, o.bj)(s.gH.from(l[1]).toHexString(), 32);
										if (i === 'erc721') {
											const t = this.provider.formatter.callAddress(
												yield this.provider.call({ to: c, data: (0, o.qn)(['0x6352211e', h]) })
											);
											if (a !== t) {
												return null;
											}
											e.push({ type: 'owner', content: t });
										} else if (i === 'erc1155') {
											const t = s.gH.from(
												yield this.provider.call({
													to: c,
													data: (0, o.qn)(['0x00fdd58e', (0, o.bj)(a, 32), h])
												})
											);
											if (t.isZero()) {
												return null;
											}
											e.push({ type: 'balance', content: t.toString() });
										}
										const d = {
											to: this.provider.formatter.address(l[0]),
											data: (0, o.qn)([r, h])
										};
										let f = _parseString(yield this.provider.call(d), 0);
										if (f == null) {
											return null;
										}
										e.push({ type: 'metadata-url-base', content: f });
										if (i === 'erc1155') {
											f = f.replace('{id}', h.substring(2));
											e.push({ type: 'metadata-url-expanded', content: f });
										}
										if (f.match(/^ipfs:/i)) {
											f = getIpfsLink(f);
										}
										e.push({ type: 'metadata-url', content: f });
										const m = yield (0, u.x6)(f);
										if (!m) {
											return null;
										}
										e.push({ type: 'metadata', content: JSON.stringify(m) });
										let g = m.image;
										if (typeof g !== 'string') {
											return null;
										}
										if (g.match(/^(https:\/\/|data:)/i)) {
										} else {
											const t = g.match(Q);
											if (t == null) {
												return null;
											}
											e.push({ type: 'url-ipfs', content: g });
											g = getIpfsLink(g);
										}
										e.push({ type: 'url', content: g });
										return { linkage: e, url: g };
									}
								}
							}
						} catch (e) {}
						return null;
					});
				}
				getContentHash() {
					return F(this, void 0, void 0, function* () {
						const e = yield this._fetchBytes('0xbc1c58d1');
						if (e == null || e === '0x') {
							return null;
						}
						const t = e.match(/^0xe3010170(([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f]*))$/);
						if (t) {
							const e = parseInt(t[3], 16);
							if (t[4].length === e * 2) {
								return 'ipfs://' + g.zn.encode('0x' + t[1]);
							}
						}
						const r = e.match(/^0xe5010172(([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f]*))$/);
						if (r) {
							const e = parseInt(r[3], 16);
							if (r[4].length === e * 2) {
								return 'ipns://' + g.zn.encode('0x' + r[1]);
							}
						}
						const n = e.match(/^0xe40101fa011b20([0-9a-f]*)$/);
						if (n) {
							if (n[1].length === 32 * 2) {
								return 'bzz://' + n[1];
							}
						}
						const s = e.match(/^0x90b2c605([0-9a-f]*)$/);
						if (s) {
							if (s[1].length === 34 * 2) {
								const e = { '=': '', '+': '-', '/': '_' };
								const t = (0, m.l)('0x' + s[1]).replace(/[=+\/]/g, (t) => e[t]);
								return 'sia://' + t;
							}
						}
						return D.throwError(
							`invalid or unsupported content hash data`,
							h.Vy.errors.UNSUPPORTED_OPERATION,
							{ operation: 'getContentHash()', data: e }
						);
					});
				}
				getText(e) {
					return F(this, void 0, void 0, function* () {
						let t = (0, l.YW)(e);
						t = (0, o.xW)([bytes32ify(64), bytes32ify(t.length), t]);
						if (t.length % 32 !== 0) {
							t = (0, o.xW)([t, (0, o.bj)('0x', 32 - (e.length % 32))]);
						}
						const r = yield this._fetchBytes('0x59d1d43c', (0, o.c$)(t));
						if (r == null || r === '0x') {
							return null;
						}
						return (0, l._v)(r);
					});
				}
			}
			let Y = null;
			let q = 1;
			class BaseProvider extends f.Kq {
				constructor(e) {
					super();
					this._events = [];
					this._emitted = { block: -2 };
					this.disableCcipRead = false;
					this.formatter = new.target.getFormatter();
					(0, a.yY)(this, 'anyNetwork', e === 'any');
					if (this.anyNetwork) {
						e = this.detectNetwork();
					}
					if (e instanceof Promise) {
						this._networkPromise = e;
						e.catch((e) => {});
						this._ready().catch((e) => {});
					} else {
						const t = (0, a.$J)(new.target, 'getNetwork')(e);
						if (t) {
							(0, a.yY)(this, '_network', t);
							this.emit('network', t, null);
						} else {
							D.throwArgumentError('invalid network', 'network', e);
						}
					}
					this._maxInternalBlockNumber = -1024;
					this._lastBlockNumber = -2;
					this._maxFilterBlockRange = 10;
					this._pollingInterval = 4e3;
					this._fastQueryDate = 0;
				}
				_ready() {
					return F(this, void 0, void 0, function* () {
						if (this._network == null) {
							let e = null;
							if (this._networkPromise) {
								try {
									e = yield this._networkPromise;
								} catch (e) {}
							}
							if (e == null) {
								e = yield this.detectNetwork();
							}
							if (!e) {
								D.throwError('no network detected', h.Vy.errors.UNKNOWN_ERROR, {});
							}
							if (this._network == null) {
								if (this.anyNetwork) {
									this._network = e;
								} else {
									(0, a.yY)(this, '_network', e);
								}
								this.emit('network', e, null);
							}
						}
						return this._network;
					});
				}
				get ready() {
					return (0, u.wt)(() =>
						this._ready().then(
							(e) => e,
							(e) => {
								if (e.code === h.Vy.errors.NETWORK_ERROR && e.event === 'noNetwork') {
									return undefined;
								}
								throw e;
							}
						)
					);
				}
				static getFormatter() {
					if (Y == null) {
						Y = new Formatter();
					}
					return Y;
				}
				static getNetwork(e) {
					return (0, I.N)(e == null ? 'homestead' : e);
				}
				ccipReadFetch(e, t, r) {
					return F(this, void 0, void 0, function* () {
						if (this.disableCcipRead || r.length === 0) {
							return null;
						}
						const n = e.to.toLowerCase();
						const s = t.toLowerCase();
						const o = [];
						for (let e = 0; e < r.length; e++) {
							const t = r[e];
							const i = t.replace('{sender}', n).replace('{data}', s);
							const a = t.indexOf('{data}') >= 0 ? null : JSON.stringify({ data: s, sender: n });
							const l = yield (0, u.x6)({ url: i, errorPassThrough: true }, a, (e, t) => {
								e.status = t.statusCode;
								return e;
							});
							if (l.data) {
								return l.data;
							}
							const c = l.message || 'unknown error';
							if (l.status >= 400 && l.status < 500) {
								return D.throwError(
									`response not found during CCIP fetch: ${c}`,
									h.Vy.errors.SERVER_ERROR,
									{ url: t, errorMessage: c }
								);
							}
							o.push(c);
						}
						return D.throwError(
							`error encountered during CCIP fetch: ${o.map((e) => JSON.stringify(e)).join(', ')}`,
							h.Vy.errors.SERVER_ERROR,
							{ urls: r, errorMessages: o }
						);
					});
				}
				_getInternalBlockNumber(e) {
					return F(this, void 0, void 0, function* () {
						yield this._ready();
						if (e > 0) {
							while (this._internalBlockNumber) {
								const t = this._internalBlockNumber;
								try {
									const r = yield t;
									if (getTime() - r.respTime <= e) {
										return r.blockNumber;
									}
									break;
								} catch (e) {
									if (this._internalBlockNumber === t) {
										break;
									}
								}
							}
						}
						const t = getTime();
						const r = (0, a.k_)({
							blockNumber: this.perform('getBlockNumber', {}),
							networkError: this.getNetwork().then(
								(e) => null,
								(e) => e
							)
						}).then(({ blockNumber: e, networkError: n }) => {
							if (n) {
								if (this._internalBlockNumber === r) {
									this._internalBlockNumber = null;
								}
								throw n;
							}
							const o = getTime();
							e = s.gH.from(e).toNumber();
							if (e < this._maxInternalBlockNumber) {
								e = this._maxInternalBlockNumber;
							}
							this._maxInternalBlockNumber = e;
							this._setFastBlockNumber(e);
							return { blockNumber: e, reqTime: t, respTime: o };
						});
						this._internalBlockNumber = r;
						r.catch((e) => {
							if (this._internalBlockNumber === r) {
								this._internalBlockNumber = null;
							}
						});
						return (yield r).blockNumber;
					});
				}
				poll() {
					return F(this, void 0, void 0, function* () {
						const e = q++;
						const t = [];
						let r = null;
						try {
							r = yield this._getInternalBlockNumber(100 + this.pollingInterval / 2);
						} catch (e) {
							this.emit('error', e);
							return;
						}
						this._setFastBlockNumber(r);
						this.emit('poll', e, r);
						if (r === this._lastBlockNumber) {
							this.emit('didPoll', e);
							return;
						}
						if (this._emitted.block === -2) {
							this._emitted.block = r - 1;
						}
						if (Math.abs(this._emitted.block - r) > 1e3) {
							D.warn(
								`network block skew detected; skipping block events (emitted=${this._emitted.block} blockNumber${r})`
							);
							this.emit(
								'error',
								D.makeError('network block skew detected', h.Vy.errors.NETWORK_ERROR, {
									blockNumber: r,
									event: 'blockSkew',
									previousBlockNumber: this._emitted.block
								})
							);
							this.emit('block', r);
						} else {
							for (let e = this._emitted.block + 1; e <= r; e++) {
								this.emit('block', e);
							}
						}
						if (this._emitted.block !== r) {
							this._emitted.block = r;
							Object.keys(this._emitted).forEach((e) => {
								if (e === 'block') {
									return;
								}
								const t = this._emitted[e];
								if (t === 'pending') {
									return;
								}
								if (r - t > 12) {
									delete this._emitted[e];
								}
							});
						}
						if (this._lastBlockNumber === -2) {
							this._lastBlockNumber = r - 1;
						}
						this._events.forEach((e) => {
							switch (e.type) {
								case 'tx': {
									const r = e.hash;
									let n = this.getTransactionReceipt(r)
										.then((e) => {
											if (!e || e.blockNumber == null) {
												return null;
											}
											this._emitted['t:' + r] = e.blockNumber;
											this.emit(r, e);
											return null;
										})
										.catch((e) => {
											this.emit('error', e);
										});
									t.push(n);
									break;
								}
								case 'filter': {
									if (!e._inflight) {
										e._inflight = true;
										if (e._lastBlockNumber === -2) {
											e._lastBlockNumber = r - 1;
										}
										const n = e.filter;
										n.fromBlock = e._lastBlockNumber + 1;
										n.toBlock = r;
										const s = n.toBlock - this._maxFilterBlockRange;
										if (s > n.fromBlock) {
											n.fromBlock = s;
										}
										if (n.fromBlock < 0) {
											n.fromBlock = 0;
										}
										const o = this.getLogs(n)
											.then((t) => {
												e._inflight = false;
												if (t.length === 0) {
													return;
												}
												t.forEach((t) => {
													if (t.blockNumber > e._lastBlockNumber) {
														e._lastBlockNumber = t.blockNumber;
													}
													this._emitted['b:' + t.blockHash] = t.blockNumber;
													this._emitted['t:' + t.transactionHash] = t.blockNumber;
													this.emit(n, t);
												});
											})
											.catch((t) => {
												this.emit('error', t);
												e._inflight = false;
											});
										t.push(o);
									}
									break;
								}
							}
						});
						this._lastBlockNumber = r;
						Promise.all(t)
							.then(() => {
								this.emit('didPoll', e);
							})
							.catch((e) => {
								this.emit('error', e);
							});
						return;
					});
				}
				resetEventsBlock(e) {
					this._lastBlockNumber = e - 1;
					if (this.polling) {
						this.poll();
					}
				}
				get network() {
					return this._network;
				}
				detectNetwork() {
					return F(this, void 0, void 0, function* () {
						return D.throwError(
							'provider does not support network detection',
							h.Vy.errors.UNSUPPORTED_OPERATION,
							{ operation: 'provider.detectNetwork' }
						);
					});
				}
				getNetwork() {
					return F(this, void 0, void 0, function* () {
						const e = yield this._ready();
						const t = yield this.detectNetwork();
						if (e.chainId !== t.chainId) {
							if (this.anyNetwork) {
								this._network = t;
								this._lastBlockNumber = -2;
								this._fastBlockNumber = null;
								this._fastBlockNumberPromise = null;
								this._fastQueryDate = 0;
								this._emitted.block = -2;
								this._maxInternalBlockNumber = -1024;
								this._internalBlockNumber = null;
								this.emit('network', t, e);
								yield stall(0);
								return this._network;
							}
							const r = D.makeError('underlying network changed', h.Vy.errors.NETWORK_ERROR, {
								event: 'changed',
								network: e,
								detectedNetwork: t
							});
							this.emit('error', r);
							throw r;
						}
						return e;
					});
				}
				get blockNumber() {
					this._getInternalBlockNumber(100 + this.pollingInterval / 2).then(
						(e) => {
							this._setFastBlockNumber(e);
						},
						(e) => {}
					);
					return this._fastBlockNumber != null ? this._fastBlockNumber : -1;
				}
				get polling() {
					return this._poller != null;
				}
				set polling(e) {
					if (e && !this._poller) {
						this._poller = setInterval(() => {
							this.poll();
						}, this.pollingInterval);
						if (!this._bootstrapPoll) {
							this._bootstrapPoll = setTimeout(() => {
								this.poll();
								this._bootstrapPoll = setTimeout(() => {
									if (!this._poller) {
										this.poll();
									}
									this._bootstrapPoll = null;
								}, this.pollingInterval);
							}, 0);
						}
					} else if (!e && this._poller) {
						clearInterval(this._poller);
						this._poller = null;
					}
				}
				get pollingInterval() {
					return this._pollingInterval;
				}
				set pollingInterval(e) {
					if (typeof e !== 'number' || e <= 0 || parseInt(String(e)) != e) {
						throw new Error('invalid polling interval');
					}
					this._pollingInterval = e;
					if (this._poller) {
						clearInterval(this._poller);
						this._poller = setInterval(() => {
							this.poll();
						}, this._pollingInterval);
					}
				}
				_getFastBlockNumber() {
					const e = getTime();
					if (e - this._fastQueryDate > 2 * this._pollingInterval) {
						this._fastQueryDate = e;
						this._fastBlockNumberPromise = this.getBlockNumber().then((e) => {
							if (this._fastBlockNumber == null || e > this._fastBlockNumber) {
								this._fastBlockNumber = e;
							}
							return this._fastBlockNumber;
						});
					}
					return this._fastBlockNumberPromise;
				}
				_setFastBlockNumber(e) {
					if (this._fastBlockNumber != null && e < this._fastBlockNumber) {
						return;
					}
					this._fastQueryDate = getTime();
					if (this._fastBlockNumber == null || e > this._fastBlockNumber) {
						this._fastBlockNumber = e;
						this._fastBlockNumberPromise = Promise.resolve(e);
					}
				}
				waitForTransaction(e, t, r) {
					return F(this, void 0, void 0, function* () {
						return this._waitForTransaction(e, t == null ? 1 : t, r || 0, null);
					});
				}
				_waitForTransaction(e, t, r, n) {
					return F(this, void 0, void 0, function* () {
						const s = yield this.getTransactionReceipt(e);
						if ((s ? s.confirmations : 0) >= t) {
							return s;
						}
						return new Promise((s, o) => {
							const i = [];
							let a = false;
							const alreadyDone = function () {
								if (a) {
									return true;
								}
								a = true;
								i.forEach((e) => {
									e();
								});
								return false;
							};
							const minedHandler = (e) => {
								if (e.confirmations < t) {
									return;
								}
								if (alreadyDone()) {
									return;
								}
								s(e);
							};
							this.on(e, minedHandler);
							i.push(() => {
								this.removeListener(e, minedHandler);
							});
							if (n) {
								let r = n.startBlock;
								let s = null;
								const replaceHandler = (i) =>
									F(this, void 0, void 0, function* () {
										if (a) {
											return;
										}
										yield stall(1e3);
										this.getTransactionCount(n.from).then(
											(l) =>
												F(this, void 0, void 0, function* () {
													if (a) {
														return;
													}
													if (l <= n.nonce) {
														r = i;
													} else {
														{
															const t = yield this.getTransaction(e);
															if (t && t.blockNumber != null) {
																return;
															}
														}
														if (s == null) {
															s = r - 3;
															if (s < n.startBlock) {
																s = n.startBlock;
															}
														}
														while (s <= i) {
															if (a) {
																return;
															}
															const r = yield this.getBlockWithTransactions(s);
															for (let s = 0; s < r.transactions.length; s++) {
																const i = r.transactions[s];
																if (i.hash === e) {
																	return;
																}
																if (i.from === n.from && i.nonce === n.nonce) {
																	if (a) {
																		return;
																	}
																	const r = yield this.waitForTransaction(i.hash, t);
																	if (alreadyDone()) {
																		return;
																	}
																	let s = 'replaced';
																	if (i.data === n.data && i.to === n.to && i.value.eq(n.value)) {
																		s = 'repriced';
																	} else if (
																		i.data === '0x' &&
																		i.from === i.to &&
																		i.value.isZero()
																	) {
																		s = 'cancelled';
																	}
																	o(
																		D.makeError(
																			'transaction was replaced',
																			h.Vy.errors.TRANSACTION_REPLACED,
																			{
																				cancelled: s === 'replaced' || s === 'cancelled',
																				reason: s,
																				replacement: this._wrapTransaction(i),
																				hash: e,
																				receipt: r
																			}
																		)
																	);
																	return;
																}
															}
															s++;
														}
													}
													if (a) {
														return;
													}
													this.once('block', replaceHandler);
												}),
											(e) => {
												if (a) {
													return;
												}
												this.once('block', replaceHandler);
											}
										);
									});
								if (a) {
									return;
								}
								this.once('block', replaceHandler);
								i.push(() => {
									this.removeListener('block', replaceHandler);
								});
							}
							if (typeof r === 'number' && r > 0) {
								const e = setTimeout(() => {
									if (alreadyDone()) {
										return;
									}
									o(D.makeError('timeout exceeded', h.Vy.errors.TIMEOUT, { timeout: r }));
								}, r);
								if (e.unref) {
									e.unref();
								}
								i.push(() => {
									clearTimeout(e);
								});
							}
						});
					});
				}
				getBlockNumber() {
					return F(this, void 0, void 0, function* () {
						return this._getInternalBlockNumber(0);
					});
				}
				getGasPrice() {
					return F(this, void 0, void 0, function* () {
						yield this.getNetwork();
						const e = yield this.perform('getGasPrice', {});
						try {
							return s.gH.from(e);
						} catch (t) {
							return D.throwError('bad result from backend', h.Vy.errors.SERVER_ERROR, {
								method: 'getGasPrice',
								result: e,
								error: t
							});
						}
					});
				}
				getBalance(e, t) {
					return F(this, void 0, void 0, function* () {
						yield this.getNetwork();
						const r = yield (0, a.k_)({
							address: this._getAddress(e),
							blockTag: this._getBlockTag(t)
						});
						const n = yield this.perform('getBalance', r);
						try {
							return s.gH.from(n);
						} catch (e) {
							return D.throwError('bad result from backend', h.Vy.errors.SERVER_ERROR, {
								method: 'getBalance',
								params: r,
								result: n,
								error: e
							});
						}
					});
				}
				getTransactionCount(e, t) {
					return F(this, void 0, void 0, function* () {
						yield this.getNetwork();
						const r = yield (0, a.k_)({
							address: this._getAddress(e),
							blockTag: this._getBlockTag(t)
						});
						const n = yield this.perform('getTransactionCount', r);
						try {
							return s.gH.from(n).toNumber();
						} catch (e) {
							return D.throwError('bad result from backend', h.Vy.errors.SERVER_ERROR, {
								method: 'getTransactionCount',
								params: r,
								result: n,
								error: e
							});
						}
					});
				}
				getCode(e, t) {
					return F(this, void 0, void 0, function* () {
						yield this.getNetwork();
						const r = yield (0, a.k_)({
							address: this._getAddress(e),
							blockTag: this._getBlockTag(t)
						});
						const n = yield this.perform('getCode', r);
						try {
							return (0, o.c$)(n);
						} catch (e) {
							return D.throwError('bad result from backend', h.Vy.errors.SERVER_ERROR, {
								method: 'getCode',
								params: r,
								result: n,
								error: e
							});
						}
					});
				}
				getStorageAt(e, t, r) {
					return F(this, void 0, void 0, function* () {
						yield this.getNetwork();
						const n = yield (0, a.k_)({
							address: this._getAddress(e),
							blockTag: this._getBlockTag(r),
							position: Promise.resolve(t).then((e) => (0, o.Fh)(e))
						});
						const s = yield this.perform('getStorageAt', n);
						try {
							return (0, o.c$)(s);
						} catch (e) {
							return D.throwError('bad result from backend', h.Vy.errors.SERVER_ERROR, {
								method: 'getStorageAt',
								params: n,
								result: s,
								error: e
							});
						}
					});
				}
				_wrapTransaction(e, t, r) {
					if (t != null && (0, o.cm)(t) !== 32) {
						throw new Error('invalid response - sendTransaction');
					}
					const n = e;
					if (t != null && e.hash !== t) {
						D.throwError(
							'Transaction hash mismatch from Provider.sendTransaction.',
							h.Vy.errors.UNKNOWN_ERROR,
							{ expectedHash: e.hash, returnedHash: t }
						);
					}
					n.wait = (t, n) =>
						F(this, void 0, void 0, function* () {
							if (t == null) {
								t = 1;
							}
							if (n == null) {
								n = 0;
							}
							let s = undefined;
							if (t !== 0 && r != null) {
								s = {
									data: e.data,
									from: e.from,
									nonce: e.nonce,
									to: e.to,
									value: e.value,
									startBlock: r
								};
							}
							const o = yield this._waitForTransaction(e.hash, t, n, s);
							if (o == null && t === 0) {
								return null;
							}
							this._emitted['t:' + e.hash] = o.blockNumber;
							if (o.status === 0) {
								D.throwError('transaction failed', h.Vy.errors.CALL_EXCEPTION, {
									transactionHash: e.hash,
									transaction: e,
									receipt: o
								});
							}
							return o;
						});
					return n;
				}
				sendTransaction(e) {
					return F(this, void 0, void 0, function* () {
						yield this.getNetwork();
						const t = yield Promise.resolve(e).then((e) => (0, o.c$)(e));
						const r = this.formatter.transaction(e);
						if (r.confirmations == null) {
							r.confirmations = 0;
						}
						const n = yield this._getInternalBlockNumber(100 + 2 * this.pollingInterval);
						try {
							const e = yield this.perform('sendTransaction', { signedTransaction: t });
							return this._wrapTransaction(r, e, n);
						} catch (e) {
							e.transaction = r;
							e.transactionHash = r.hash;
							throw e;
						}
					});
				}
				_getTransactionRequest(e) {
					return F(this, void 0, void 0, function* () {
						const t = yield e;
						const r = {};
						['from', 'to'].forEach((e) => {
							if (t[e] == null) {
								return;
							}
							r[e] = Promise.resolve(t[e]).then((e) => (e ? this._getAddress(e) : null));
						});
						['gasLimit', 'gasPrice', 'maxFeePerGas', 'maxPriorityFeePerGas', 'value'].forEach(
							(e) => {
								if (t[e] == null) {
									return;
								}
								r[e] = Promise.resolve(t[e]).then((e) => (e ? s.gH.from(e) : null));
							}
						);
						['type'].forEach((e) => {
							if (t[e] == null) {
								return;
							}
							r[e] = Promise.resolve(t[e]).then((e) => (e != null ? e : null));
						});
						if (t.accessList) {
							r.accessList = this.formatter.accessList(t.accessList);
						}
						['data'].forEach((e) => {
							if (t[e] == null) {
								return;
							}
							r[e] = Promise.resolve(t[e]).then((e) => (e ? (0, o.c$)(e) : null));
						});
						return this.formatter.transactionRequest(yield (0, a.k_)(r));
					});
				}
				_getFilter(e) {
					return F(this, void 0, void 0, function* () {
						e = yield e;
						const t = {};
						if (e.address != null) {
							t.address = this._getAddress(e.address);
						}
						['blockHash', 'topics'].forEach((r) => {
							if (e[r] == null) {
								return;
							}
							t[r] = e[r];
						});
						['fromBlock', 'toBlock'].forEach((r) => {
							if (e[r] == null) {
								return;
							}
							t[r] = this._getBlockTag(e[r]);
						});
						return this.formatter.filter(yield (0, a.k_)(t));
					});
				}
				_call(e, t, r) {
					return F(this, void 0, void 0, function* () {
						if (r >= H) {
							D.throwError('CCIP read exceeded maximum redirections', h.Vy.errors.SERVER_ERROR, {
								redirects: r,
								transaction: e
							});
						}
						const n = e.to;
						const i = yield this.perform('call', { transaction: e, blockTag: t });
						if (
							r >= 0 &&
							t === 'latest' &&
							n != null &&
							i.substring(0, 10) === '0x556f1830' &&
							(0, o.cm)(i) % 32 === 4
						) {
							try {
								const a = (0, o.Ab)(i, 4);
								const l = (0, o.Ab)(a, 0, 32);
								if (!s.gH.from(l).eq(n)) {
									D.throwError('CCIP Read sender did not match', h.Vy.errors.CALL_EXCEPTION, {
										name: 'OffchainLookup',
										signature: 'OffchainLookup(address,string[],bytes,bytes4,bytes)',
										transaction: e,
										data: i
									});
								}
								const c = [];
								const u = s.gH.from((0, o.Ab)(a, 32, 64)).toNumber();
								const d = s.gH.from((0, o.Ab)(a, u, u + 32)).toNumber();
								const f = (0, o.Ab)(a, u + 32);
								for (let t = 0; t < d; t++) {
									const r = _parseString(f, t * 32);
									if (r == null) {
										D.throwError(
											'CCIP Read contained corrupt URL string',
											h.Vy.errors.CALL_EXCEPTION,
											{
												name: 'OffchainLookup',
												signature: 'OffchainLookup(address,string[],bytes,bytes4,bytes)',
												transaction: e,
												data: i
											}
										);
									}
									c.push(r);
								}
								const m = _parseBytes(a, 64);
								if (!s.gH.from((0, o.Ab)(a, 100, 128)).isZero()) {
									D.throwError(
										'CCIP Read callback selector included junk',
										h.Vy.errors.CALL_EXCEPTION,
										{
											name: 'OffchainLookup',
											signature: 'OffchainLookup(address,string[],bytes,bytes4,bytes)',
											transaction: e,
											data: i
										}
									);
								}
								const g = (0, o.Ab)(a, 96, 100);
								const p = _parseBytes(a, 128);
								const A = yield this.ccipReadFetch(e, m, c);
								if (A == null) {
									D.throwError(
										'CCIP Read disabled or provided no URLs',
										h.Vy.errors.CALL_EXCEPTION,
										{
											name: 'OffchainLookup',
											signature: 'OffchainLookup(address,string[],bytes,bytes4,bytes)',
											transaction: e,
											data: i
										}
									);
								}
								const y = { to: n, data: (0, o.qn)([g, encodeBytes([A, p])]) };
								return this._call(y, t, r + 1);
							} catch (e) {
								if (e.code === h.Vy.errors.SERVER_ERROR) {
									throw e;
								}
							}
						}
						try {
							return (0, o.c$)(i);
						} catch (r) {
							return D.throwError('bad result from backend', h.Vy.errors.SERVER_ERROR, {
								method: 'call',
								params: { transaction: e, blockTag: t },
								result: i,
								error: r
							});
						}
					});
				}
				call(e, t) {
					return F(this, void 0, void 0, function* () {
						yield this.getNetwork();
						const r = yield (0, a.k_)({
							transaction: this._getTransactionRequest(e),
							blockTag: this._getBlockTag(t),
							ccipReadEnabled: Promise.resolve(e.ccipReadEnabled)
						});
						return this._call(r.transaction, r.blockTag, r.ccipReadEnabled ? 0 : -1);
					});
				}
				estimateGas(e) {
					return F(this, void 0, void 0, function* () {
						yield this.getNetwork();
						const t = yield (0, a.k_)({ transaction: this._getTransactionRequest(e) });
						const r = yield this.perform('estimateGas', t);
						try {
							return s.gH.from(r);
						} catch (e) {
							return D.throwError('bad result from backend', h.Vy.errors.SERVER_ERROR, {
								method: 'estimateGas',
								params: t,
								result: r,
								error: e
							});
						}
					});
				}
				_getAddress(e) {
					return F(this, void 0, void 0, function* () {
						e = yield e;
						if (typeof e !== 'string') {
							D.throwArgumentError('invalid address or ENS name', 'name', e);
						}
						const t = yield this.resolveName(e);
						if (t == null) {
							D.throwError('ENS name not configured', h.Vy.errors.UNSUPPORTED_OPERATION, {
								operation: `resolveName(${JSON.stringify(e)})`
							});
						}
						return t;
					});
				}
				_getBlock(e, t) {
					return F(this, void 0, void 0, function* () {
						yield this.getNetwork();
						e = yield e;
						let r = -128;
						const n = { includeTransactions: !!t };
						if ((0, o.Lo)(e, 32)) {
							n.blockHash = e;
						} else {
							try {
								n.blockTag = yield this._getBlockTag(e);
								if ((0, o.Lo)(n.blockTag)) {
									r = parseInt(n.blockTag.substring(2), 16);
								}
							} catch (t) {
								D.throwArgumentError('invalid block hash or block tag', 'blockHashOrBlockTag', e);
							}
						}
						return (0, u.wt)(
							() =>
								F(this, void 0, void 0, function* () {
									const e = yield this.perform('getBlock', n);
									if (e == null) {
										if (n.blockHash != null) {
											if (this._emitted['b:' + n.blockHash] == null) {
												return null;
											}
										}
										if (n.blockTag != null) {
											if (r > this._emitted.block) {
												return null;
											}
										}
										return undefined;
									}
									if (t) {
										let t = null;
										for (let r = 0; r < e.transactions.length; r++) {
											const n = e.transactions[r];
											if (n.blockNumber == null) {
												n.confirmations = 0;
											} else if (n.confirmations == null) {
												if (t == null) {
													t = yield this._getInternalBlockNumber(100 + 2 * this.pollingInterval);
												}
												let e = t - n.blockNumber + 1;
												if (e <= 0) {
													e = 1;
												}
												n.confirmations = e;
											}
										}
										const r = this.formatter.blockWithTransactions(e);
										r.transactions = r.transactions.map((e) => this._wrapTransaction(e));
										return r;
									}
									return this.formatter.block(e);
								}),
							{ oncePoll: this }
						);
					});
				}
				getBlock(e) {
					return this._getBlock(e, false);
				}
				getBlockWithTransactions(e) {
					return this._getBlock(e, true);
				}
				getTransaction(e) {
					return F(this, void 0, void 0, function* () {
						yield this.getNetwork();
						e = yield e;
						const t = { transactionHash: this.formatter.hash(e, true) };
						return (0, u.wt)(
							() =>
								F(this, void 0, void 0, function* () {
									const r = yield this.perform('getTransaction', t);
									if (r == null) {
										if (this._emitted['t:' + e] == null) {
											return null;
										}
										return undefined;
									}
									const n = this.formatter.transactionResponse(r);
									if (n.blockNumber == null) {
										n.confirmations = 0;
									} else if (n.confirmations == null) {
										const e = yield this._getInternalBlockNumber(100 + 2 * this.pollingInterval);
										let t = e - n.blockNumber + 1;
										if (t <= 0) {
											t = 1;
										}
										n.confirmations = t;
									}
									return this._wrapTransaction(n);
								}),
							{ oncePoll: this }
						);
					});
				}
				getTransactionReceipt(e) {
					return F(this, void 0, void 0, function* () {
						yield this.getNetwork();
						e = yield e;
						const t = { transactionHash: this.formatter.hash(e, true) };
						return (0, u.wt)(
							() =>
								F(this, void 0, void 0, function* () {
									const r = yield this.perform('getTransactionReceipt', t);
									if (r == null) {
										if (this._emitted['t:' + e] == null) {
											return null;
										}
										return undefined;
									}
									if (r.blockHash == null) {
										return undefined;
									}
									const n = this.formatter.receipt(r);
									if (n.blockNumber == null) {
										n.confirmations = 0;
									} else if (n.confirmations == null) {
										const e = yield this._getInternalBlockNumber(100 + 2 * this.pollingInterval);
										let t = e - n.blockNumber + 1;
										if (t <= 0) {
											t = 1;
										}
										n.confirmations = t;
									}
									return n;
								}),
							{ oncePoll: this }
						);
					});
				}
				getLogs(e) {
					return F(this, void 0, void 0, function* () {
						yield this.getNetwork();
						const t = yield (0, a.k_)({ filter: this._getFilter(e) });
						const r = yield this.perform('getLogs', t);
						r.forEach((e) => {
							if (e.removed == null) {
								e.removed = false;
							}
						});
						return Formatter.arrayOf(this.formatter.filterLog.bind(this.formatter))(r);
					});
				}
				getEtherPrice() {
					return F(this, void 0, void 0, function* () {
						yield this.getNetwork();
						return this.perform('getEtherPrice', {});
					});
				}
				_getBlockTag(e) {
					return F(this, void 0, void 0, function* () {
						e = yield e;
						if (typeof e === 'number' && e < 0) {
							if (e % 1) {
								D.throwArgumentError('invalid BlockTag', 'blockTag', e);
							}
							let t = yield this._getInternalBlockNumber(100 + 2 * this.pollingInterval);
							t += e;
							if (t < 0) {
								t = 0;
							}
							return this.formatter.blockTag(t);
						}
						return this.formatter.blockTag(e);
					});
				}
				getResolver(e) {
					return F(this, void 0, void 0, function* () {
						let t = e;
						while (true) {
							if (t === '' || t === '.') {
								return null;
							}
							if (e !== 'eth' && t === 'eth') {
								return null;
							}
							const r = yield this._getResolver(t, 'getResolver');
							if (r != null) {
								const n = new Resolver(this, r, e);
								if (t !== e && !(yield n.supportsWildcard())) {
									return null;
								}
								return n;
							}
							t = t.split('.').slice(1).join('.');
						}
					});
				}
				_getResolver(e, t) {
					return F(this, void 0, void 0, function* () {
						if (t == null) {
							t = 'ENS';
						}
						const r = yield this.getNetwork();
						if (!r.ensAddress) {
							D.throwError('network does not support ENS', h.Vy.errors.UNSUPPORTED_OPERATION, {
								operation: t,
								network: r.name
							});
						}
						try {
							const t = yield this.call({
								to: r.ensAddress,
								data: '0x0178b8bf' + namehash(e).substring(2)
							});
							return this.formatter.callAddress(t);
						} catch (e) {}
						return null;
					});
				}
				resolveName(e) {
					return F(this, void 0, void 0, function* () {
						e = yield e;
						try {
							return Promise.resolve(this.formatter.address(e));
						} catch (t) {
							if ((0, o.Lo)(e)) {
								throw t;
							}
						}
						if (typeof e !== 'string') {
							D.throwArgumentError('invalid ENS name', 'name', e);
						}
						const t = yield this.getResolver(e);
						if (!t) {
							return null;
						}
						return yield t.getAddress();
					});
				}
				lookupAddress(e) {
					return F(this, void 0, void 0, function* () {
						e = yield e;
						e = this.formatter.address(e);
						const t = e.substring(2).toLowerCase() + '.addr.reverse';
						const r = yield this._getResolver(t, 'lookupAddress');
						if (r == null) {
							return null;
						}
						const n = _parseString(
							yield this.call({ to: r, data: '0x691f3431' + namehash(t).substring(2) }),
							0
						);
						const s = yield this.resolveName(n);
						if (s != e) {
							return null;
						}
						return n;
					});
				}
				getAvatar(e) {
					return F(this, void 0, void 0, function* () {
						let t = null;
						if ((0, o.Lo)(e)) {
							const r = this.formatter.address(e);
							const n = r.substring(2).toLowerCase() + '.addr.reverse';
							const s = yield this._getResolver(n, 'getAvatar');
							if (!s) {
								return null;
							}
							t = new Resolver(this, s, n);
							try {
								const e = yield t.getAvatar();
								if (e) {
									return e.url;
								}
							} catch (e) {
								if (e.code !== h.Vy.errors.CALL_EXCEPTION) {
									throw e;
								}
							}
							try {
								const e = _parseString(
									yield this.call({ to: s, data: '0x691f3431' + namehash(n).substring(2) }),
									0
								);
								t = yield this.getResolver(e);
							} catch (e) {
								if (e.code !== h.Vy.errors.CALL_EXCEPTION) {
									throw e;
								}
								return null;
							}
						} else {
							t = yield this.getResolver(e);
							if (!t) {
								return null;
							}
						}
						const r = yield t.getAvatar();
						if (r == null) {
							return null;
						}
						return r.url;
					});
				}
				perform(e, t) {
					return D.throwError(e + ' not implemented', h.Vy.errors.NOT_IMPLEMENTED, {
						operation: e
					});
				}
				_startEvent(e) {
					this.polling = this._events.filter((e) => e.pollable()).length > 0;
				}
				_stopEvent(e) {
					this.polling = this._events.filter((e) => e.pollable()).length > 0;
				}
				_addEventListener(e, t, r) {
					const n = new Event(getEventTag(e), t, r);
					this._events.push(n);
					this._startEvent(n);
					return this;
				}
				on(e, t) {
					return this._addEventListener(e, t, false);
				}
				once(e, t) {
					return this._addEventListener(e, t, true);
				}
				emit(e, ...t) {
					let r = false;
					let n = [];
					let s = getEventTag(e);
					this._events = this._events.filter((e) => {
						if (e.tag !== s) {
							return true;
						}
						setTimeout(() => {
							e.listener.apply(this, t);
						}, 0);
						r = true;
						if (e.once) {
							n.push(e);
							return false;
						}
						return true;
					});
					n.forEach((e) => {
						this._stopEvent(e);
					});
					return r;
				}
				listenerCount(e) {
					if (!e) {
						return this._events.length;
					}
					let t = getEventTag(e);
					return this._events.filter((e) => e.tag === t).length;
				}
				listeners(e) {
					if (e == null) {
						return this._events.map((e) => e.listener);
					}
					let t = getEventTag(e);
					return this._events.filter((e) => e.tag === t).map((e) => e.listener);
				}
				off(e, t) {
					if (t == null) {
						return this.removeAllListeners(e);
					}
					const r = [];
					let n = false;
					let s = getEventTag(e);
					this._events = this._events.filter((e) => {
						if (e.tag !== s || e.listener != t) {
							return true;
						}
						if (n) {
							return true;
						}
						n = true;
						r.push(e);
						return false;
					});
					r.forEach((e) => {
						this._stopEvent(e);
					});
					return this;
				}
				removeAllListeners(e) {
					let t = [];
					if (e == null) {
						t = this._events;
						this._events = [];
					} else {
						const r = getEventTag(e);
						this._events = this._events.filter((e) => {
							if (e.tag !== r) {
								return true;
							}
							t.push(e);
							return false;
						});
					}
					t.forEach((e) => {
						this._stopEvent(e);
					});
					return this;
				}
			}
			var G =
				(undefined && undefined.__awaiter) ||
				function (e, t, r, n) {
					function adopt(e) {
						return e instanceof r
							? e
							: new r(function (t) {
									t(e);
								});
					}
					return new (r || (r = Promise))(function (r, s) {
						function fulfilled(e) {
							try {
								step(n.next(e));
							} catch (e) {
								s(e);
							}
						}
						function rejected(e) {
							try {
								step(n['throw'](e));
							} catch (e) {
								s(e);
							}
						}
						function step(e) {
							e.done ? r(e.value) : adopt(e.value).then(fulfilled, rejected);
						}
						step((n = n.apply(e, t || [])).next());
					});
				};
			const J = new h.Vy(d.r);
			const V = ['call', 'estimateGas'];
			function spelunk(e, t) {
				if (e == null) {
					return null;
				}
				if (typeof e.message === 'string' && e.message.match('reverted')) {
					const r = (0, o.Lo)(e.data) ? e.data : null;
					if (!t || r) {
						return { message: e.message, data: r };
					}
				}
				if (typeof e === 'object') {
					for (const r in e) {
						const n = spelunk(e[r], t);
						if (n) {
							return n;
						}
					}
					return null;
				}
				if (typeof e === 'string') {
					try {
						return spelunk(JSON.parse(e), t);
					} catch (e) {}
				}
				return null;
			}
			function checkError(e, t, r) {
				const n = r.transaction || r.signedTransaction;
				if (e === 'call') {
					const e = spelunk(t, true);
					if (e) {
						return e.data;
					}
					J.throwError(
						'missing revert data in call exception; Transaction reverted without a reason string',
						h.Vy.errors.CALL_EXCEPTION,
						{ data: '0x', transaction: n, error: t }
					);
				}
				if (e === 'estimateGas') {
					let r = spelunk(t.body, false);
					if (r == null) {
						r = spelunk(t, false);
					}
					if (r) {
						J.throwError(
							'cannot estimate gas; transaction may fail or may require manual gas limit',
							h.Vy.errors.UNPREDICTABLE_GAS_LIMIT,
							{ reason: r.message, method: e, transaction: n, error: t }
						);
					}
				}
				let s = t.message;
				if (t.code === h.Vy.errors.SERVER_ERROR && t.error && typeof t.error.message === 'string') {
					s = t.error.message;
				} else if (typeof t.body === 'string') {
					s = t.body;
				} else if (typeof t.responseText === 'string') {
					s = t.responseText;
				}
				s = (s || '').toLowerCase();
				if (s.match(/insufficient funds|base fee exceeds gas limit|InsufficientFunds/i)) {
					J.throwError(
						'insufficient funds for intrinsic transaction cost',
						h.Vy.errors.INSUFFICIENT_FUNDS,
						{ error: t, method: e, transaction: n }
					);
				}
				if (s.match(/nonce (is )?too low/i)) {
					J.throwError('nonce has already been used', h.Vy.errors.NONCE_EXPIRED, {
						error: t,
						method: e,
						transaction: n
					});
				}
				if (s.match(/replacement transaction underpriced|transaction gas price.*too low/i)) {
					J.throwError('replacement fee too low', h.Vy.errors.REPLACEMENT_UNDERPRICED, {
						error: t,
						method: e,
						transaction: n
					});
				}
				if (s.match(/only replay-protected/i)) {
					J.throwError(
						'legacy pre-eip-155 transactions not supported',
						h.Vy.errors.UNSUPPORTED_OPERATION,
						{ error: t, method: e, transaction: n }
					);
				}
				if (
					V.indexOf(e) >= 0 &&
					s.match(
						/gas required exceeds allowance|always failing transaction|execution reverted|revert/
					)
				) {
					J.throwError(
						'cannot estimate gas; transaction may fail or may require manual gas limit',
						h.Vy.errors.UNPREDICTABLE_GAS_LIMIT,
						{ error: t, method: e, transaction: n }
					);
				}
				throw t;
			}
			function timer(e) {
				return new Promise(function (t) {
					setTimeout(t, e);
				});
			}
			function getResult(e) {
				if (e.error) {
					const t = new Error(e.error.message);
					t.code = e.error.code;
					t.data = e.error.data;
					throw t;
				}
				return e.result;
			}
			function getLowerCase(e) {
				if (e) {
					return e.toLowerCase();
				}
				return e;
			}
			const K = {};
			class JsonRpcSigner extends n.l {
				constructor(e, t, r) {
					super();
					if (e !== K) {
						throw new Error(
							'do not call the JsonRpcSigner constructor directly; use provider.getSigner'
						);
					}
					(0, a.yY)(this, 'provider', t);
					if (r == null) {
						r = 0;
					}
					if (typeof r === 'string') {
						(0, a.yY)(this, '_address', this.provider.formatter.address(r));
						(0, a.yY)(this, '_index', null);
					} else if (typeof r === 'number') {
						(0, a.yY)(this, '_index', r);
						(0, a.yY)(this, '_address', null);
					} else {
						J.throwArgumentError('invalid address or index', 'addressOrIndex', r);
					}
				}
				connect(e) {
					return J.throwError(
						'cannot alter JSON-RPC Signer connection',
						h.Vy.errors.UNSUPPORTED_OPERATION,
						{ operation: 'connect' }
					);
				}
				connectUnchecked() {
					return new UncheckedJsonRpcSigner(K, this.provider, this._address || this._index);
				}
				getAddress() {
					if (this._address) {
						return Promise.resolve(this._address);
					}
					return this.provider.send('eth_accounts', []).then((e) => {
						if (e.length <= this._index) {
							J.throwError('unknown account #' + this._index, h.Vy.errors.UNSUPPORTED_OPERATION, {
								operation: 'getAddress'
							});
						}
						return this.provider.formatter.address(e[this._index]);
					});
				}
				sendUncheckedTransaction(e) {
					e = (0, a.Ic)(e);
					const t = this.getAddress().then((e) => {
						if (e) {
							e = e.toLowerCase();
						}
						return e;
					});
					if (e.gasLimit == null) {
						const r = (0, a.Ic)(e);
						r.from = t;
						e.gasLimit = this.provider.estimateGas(r);
					}
					if (e.to != null) {
						e.to = Promise.resolve(e.to).then((e) =>
							G(this, void 0, void 0, function* () {
								if (e == null) {
									return null;
								}
								const t = yield this.provider.resolveName(e);
								if (t == null) {
									J.throwArgumentError('provided ENS name resolves to null', 'tx.to', e);
								}
								return t;
							})
						);
					}
					return (0, a.k_)({ tx: (0, a.k_)(e), sender: t }).then(({ tx: t, sender: r }) => {
						if (t.from != null) {
							if (t.from.toLowerCase() !== r) {
								J.throwArgumentError('from address mismatch', 'transaction', e);
							}
						} else {
							t.from = r;
						}
						const n = this.provider.constructor.hexlifyTransaction(t, { from: true });
						return this.provider.send('eth_sendTransaction', [n]).then(
							(e) => e,
							(e) => {
								if (typeof e.message === 'string' && e.message.match(/user denied/i)) {
									J.throwError('user rejected transaction', h.Vy.errors.ACTION_REJECTED, {
										action: 'sendTransaction',
										transaction: t
									});
								}
								return checkError('sendTransaction', e, n);
							}
						);
					});
				}
				signTransaction(e) {
					return J.throwError(
						'signing transactions is unsupported',
						h.Vy.errors.UNSUPPORTED_OPERATION,
						{ operation: 'signTransaction' }
					);
				}
				sendTransaction(e) {
					return G(this, void 0, void 0, function* () {
						const t = yield this.provider._getInternalBlockNumber(
							100 + 2 * this.provider.pollingInterval
						);
						const r = yield this.sendUncheckedTransaction(e);
						try {
							return yield (0, u.wt)(
								() =>
									G(this, void 0, void 0, function* () {
										const e = yield this.provider.getTransaction(r);
										if (e === null) {
											return undefined;
										}
										return this.provider._wrapTransaction(e, r, t);
									}),
								{ oncePoll: this.provider }
							);
						} catch (e) {
							e.transactionHash = r;
							throw e;
						}
					});
				}
				signMessage(e) {
					return G(this, void 0, void 0, function* () {
						const t = typeof e === 'string' ? (0, l.YW)(e) : e;
						const r = yield this.getAddress();
						try {
							return yield this.provider.send('personal_sign', [(0, o.c$)(t), r.toLowerCase()]);
						} catch (t) {
							if (typeof t.message === 'string' && t.message.match(/user denied/i)) {
								J.throwError('user rejected signing', h.Vy.errors.ACTION_REJECTED, {
									action: 'signMessage',
									from: r,
									messageData: e
								});
							}
							throw t;
						}
					});
				}
				_legacySignMessage(e) {
					return G(this, void 0, void 0, function* () {
						const t = typeof e === 'string' ? (0, l.YW)(e) : e;
						const r = yield this.getAddress();
						try {
							return yield this.provider.send('eth_sign', [r.toLowerCase(), (0, o.c$)(t)]);
						} catch (t) {
							if (typeof t.message === 'string' && t.message.match(/user denied/i)) {
								J.throwError('user rejected signing', h.Vy.errors.ACTION_REJECTED, {
									action: '_legacySignMessage',
									from: r,
									messageData: e
								});
							}
							throw t;
						}
					});
				}
				_signTypedData(e, t, r) {
					return G(this, void 0, void 0, function* () {
						const n = yield i.z.resolveNames(e, t, r, (e) => this.provider.resolveName(e));
						const s = yield this.getAddress();
						try {
							return yield this.provider.send('eth_signTypedData_v4', [
								s.toLowerCase(),
								JSON.stringify(i.z.getPayload(n.domain, t, n.value))
							]);
						} catch (e) {
							if (typeof e.message === 'string' && e.message.match(/user denied/i)) {
								J.throwError('user rejected signing', h.Vy.errors.ACTION_REJECTED, {
									action: '_signTypedData',
									from: s,
									messageData: { domain: n.domain, types: t, value: n.value }
								});
							}
							throw e;
						}
					});
				}
				unlock(e) {
					return G(this, void 0, void 0, function* () {
						const t = this.provider;
						const r = yield this.getAddress();
						return t.send('personal_unlockAccount', [r.toLowerCase(), e, null]);
					});
				}
			}
			class UncheckedJsonRpcSigner extends JsonRpcSigner {
				sendTransaction(e) {
					return this.sendUncheckedTransaction(e).then((e) => ({
						hash: e,
						nonce: null,
						gasLimit: null,
						gasPrice: null,
						data: null,
						value: null,
						chainId: null,
						confirmations: 0,
						from: null,
						wait: (t) => this.provider.waitForTransaction(e, t)
					}));
				}
			}
			const z = {
				chainId: true,
				data: true,
				gasLimit: true,
				gasPrice: true,
				nonce: true,
				to: true,
				value: true,
				type: true,
				accessList: true,
				maxFeePerGas: true,
				maxPriorityFeePerGas: true
			};
			class JsonRpcProvider extends BaseProvider {
				constructor(e, t) {
					let r = t;
					if (r == null) {
						r = new Promise((e, t) => {
							setTimeout(() => {
								this.detectNetwork().then(
									(t) => {
										e(t);
									},
									(e) => {
										t(e);
									}
								);
							}, 0);
						});
					}
					super(r);
					if (!e) {
						e = (0, a.$J)(this.constructor, 'defaultUrl')();
					}
					if (typeof e === 'string') {
						(0, a.yY)(this, 'connection', Object.freeze({ url: e }));
					} else {
						(0, a.yY)(this, 'connection', Object.freeze((0, a.Ic)(e)));
					}
					this._nextId = 42;
				}
				get _cache() {
					if (this._eventLoopCache == null) {
						this._eventLoopCache = {};
					}
					return this._eventLoopCache;
				}
				static defaultUrl() {
					return 'http://localhost:8545';
				}
				detectNetwork() {
					if (!this._cache['detectNetwork']) {
						this._cache['detectNetwork'] = this._uncachedDetectNetwork();
						setTimeout(() => {
							this._cache['detectNetwork'] = null;
						}, 0);
					}
					return this._cache['detectNetwork'];
				}
				_uncachedDetectNetwork() {
					return G(this, void 0, void 0, function* () {
						yield timer(0);
						let e = null;
						try {
							e = yield this.send('eth_chainId', []);
						} catch (t) {
							try {
								e = yield this.send('net_version', []);
							} catch (e) {}
						}
						if (e != null) {
							const t = (0, a.$J)(this.constructor, 'getNetwork');
							try {
								return t(s.gH.from(e).toNumber());
							} catch (t) {
								return J.throwError('could not detect network', h.Vy.errors.NETWORK_ERROR, {
									chainId: e,
									event: 'invalidNetwork',
									serverError: t
								});
							}
						}
						return J.throwError('could not detect network', h.Vy.errors.NETWORK_ERROR, {
							event: 'noNetwork'
						});
					});
				}
				getSigner(e) {
					return new JsonRpcSigner(K, this, e);
				}
				getUncheckedSigner(e) {
					return this.getSigner(e).connectUnchecked();
				}
				listAccounts() {
					return this.send('eth_accounts', []).then((e) => e.map((e) => this.formatter.address(e)));
				}
				send(e, t) {
					const r = { method: e, params: t, id: this._nextId++, jsonrpc: '2.0' };
					this.emit('debug', { action: 'request', request: (0, a.A4)(r), provider: this });
					const n = ['eth_chainId', 'eth_blockNumber'].indexOf(e) >= 0;
					if (n && this._cache[e]) {
						return this._cache[e];
					}
					const s = (0, u.x6)(this.connection, JSON.stringify(r), getResult).then(
						(e) => {
							this.emit('debug', { action: 'response', request: r, response: e, provider: this });
							return e;
						},
						(e) => {
							this.emit('debug', { action: 'response', error: e, request: r, provider: this });
							throw e;
						}
					);
					if (n) {
						this._cache[e] = s;
						setTimeout(() => {
							this._cache[e] = null;
						}, 0);
					}
					return s;
				}
				prepareRequest(e, t) {
					switch (e) {
						case 'getBlockNumber':
							return ['eth_blockNumber', []];
						case 'getGasPrice':
							return ['eth_gasPrice', []];
						case 'getBalance':
							return ['eth_getBalance', [getLowerCase(t.address), t.blockTag]];
						case 'getTransactionCount':
							return ['eth_getTransactionCount', [getLowerCase(t.address), t.blockTag]];
						case 'getCode':
							return ['eth_getCode', [getLowerCase(t.address), t.blockTag]];
						case 'getStorageAt':
							return [
								'eth_getStorageAt',
								[getLowerCase(t.address), (0, o.bj)(t.position, 32), t.blockTag]
							];
						case 'sendTransaction':
							return ['eth_sendRawTransaction', [t.signedTransaction]];
						case 'getBlock':
							if (t.blockTag) {
								return ['eth_getBlockByNumber', [t.blockTag, !!t.includeTransactions]];
							} else if (t.blockHash) {
								return ['eth_getBlockByHash', [t.blockHash, !!t.includeTransactions]];
							}
							return null;
						case 'getTransaction':
							return ['eth_getTransactionByHash', [t.transactionHash]];
						case 'getTransactionReceipt':
							return ['eth_getTransactionReceipt', [t.transactionHash]];
						case 'call': {
							const e = (0, a.$J)(this.constructor, 'hexlifyTransaction');
							return ['eth_call', [e(t.transaction, { from: true }), t.blockTag]];
						}
						case 'estimateGas': {
							const e = (0, a.$J)(this.constructor, 'hexlifyTransaction');
							return ['eth_estimateGas', [e(t.transaction, { from: true })]];
						}
						case 'getLogs':
							if (t.filter && t.filter.address != null) {
								t.filter.address = getLowerCase(t.filter.address);
							}
							return ['eth_getLogs', [t.filter]];
						default:
							break;
					}
					return null;
				}
				perform(e, t) {
					return G(this, void 0, void 0, function* () {
						if (e === 'call' || e === 'estimateGas') {
							const e = t.transaction;
							if (e && e.type != null && s.gH.from(e.type).isZero()) {
								if (e.maxFeePerGas == null && e.maxPriorityFeePerGas == null) {
									const r = yield this.getFeeData();
									if (r.maxFeePerGas == null && r.maxPriorityFeePerGas == null) {
										t = (0, a.Ic)(t);
										t.transaction = (0, a.Ic)(e);
										delete t.transaction.type;
									}
								}
							}
						}
						const r = this.prepareRequest(e, t);
						if (r == null) {
							J.throwError(e + ' not implemented', h.Vy.errors.NOT_IMPLEMENTED, { operation: e });
						}
						try {
							return yield this.send(r[0], r[1]);
						} catch (r) {
							return checkError(e, r, t);
						}
					});
				}
				_startEvent(e) {
					if (e.tag === 'pending') {
						this._startPending();
					}
					super._startEvent(e);
				}
				_startPending() {
					if (this._pendingFilter != null) {
						return;
					}
					const e = this;
					const t = this.send('eth_newPendingTransactionFilter', []);
					this._pendingFilter = t;
					t.then(function (r) {
						function poll() {
							e.send('eth_getFilterChanges', [r])
								.then(function (r) {
									if (e._pendingFilter != t) {
										return null;
									}
									let n = Promise.resolve();
									r.forEach(function (t) {
										e._emitted['t:' + t.toLowerCase()] = 'pending';
										n = n.then(function () {
											return e.getTransaction(t).then(function (t) {
												e.emit('pending', t);
												return null;
											});
										});
									});
									return n.then(function () {
										return timer(1e3);
									});
								})
								.then(function () {
									if (e._pendingFilter != t) {
										e.send('eth_uninstallFilter', [r]);
										return;
									}
									setTimeout(function () {
										poll();
									}, 0);
									return null;
								})
								.catch((e) => {});
						}
						poll();
						return r;
					}).catch((e) => {});
				}
				_stopEvent(e) {
					if (e.tag === 'pending' && this.listenerCount('pending') === 0) {
						this._pendingFilter = null;
					}
					super._stopEvent(e);
				}
				static hexlifyTransaction(e, t) {
					const r = (0, a.Ic)(z);
					if (t) {
						for (const e in t) {
							if (t[e]) {
								r[e] = true;
							}
						}
					}
					(0, a.qN)(e, r);
					const n = {};
					[
						'chainId',
						'gasLimit',
						'gasPrice',
						'type',
						'maxFeePerGas',
						'maxPriorityFeePerGas',
						'nonce',
						'value'
					].forEach(function (t) {
						if (e[t] == null) {
							return;
						}
						const r = (0, o.Fh)(s.gH.from(e[t]));
						if (t === 'gasLimit') {
							t = 'gas';
						}
						n[t] = r;
					});
					['from', 'to', 'data'].forEach(function (t) {
						if (e[t] == null) {
							return;
						}
						n[t] = (0, o.c$)(e[t]);
					});
					if (e.accessList) {
						n['accessList'] = (0, c.$2)(e.accessList);
					}
					return n;
				}
			}
		},
		399: (e, t, r) => {
			'use strict';
			r.r(t);
			r.d(t, { AlchemyProvider: () => AlchemyProvider });
			var n = r(8440);
			var s = r(9187);
			var o = r(1015);
			var i = r(8628);
			const a = 100;
			const l = 10;
			class RequestBatcher {
				constructor(e, t = a) {
					this.sendBatchFn = e;
					this.maxBatchSize = t;
					this.pendingBatch = [];
				}
				enqueueRequest(e) {
					return (0, n._)(this, void 0, void 0, function* () {
						const t = { request: e, resolve: undefined, reject: undefined };
						const r = new Promise((e, r) => {
							t.resolve = e;
							t.reject = r;
						});
						this.pendingBatch.push(t);
						if (this.pendingBatch.length === this.maxBatchSize) {
							void this.sendBatchRequest();
						} else if (!this.pendingBatchTimer) {
							this.pendingBatchTimer = setTimeout(() => this.sendBatchRequest(), l);
						}
						return r;
					});
				}
				sendBatchRequest() {
					return (0, n._)(this, void 0, void 0, function* () {
						const e = this.pendingBatch;
						this.pendingBatch = [];
						if (this.pendingBatchTimer) {
							clearTimeout(this.pendingBatchTimer);
							this.pendingBatchTimer = undefined;
						}
						const t = e.map((e) => e.request);
						return this.sendBatchFn(t).then(
							(t) => {
								e.forEach((e, r) => {
									const n = t[r];
									if (n.error) {
										const t = new Error(n.error.message);
										t.code = n.error.code;
										t.data = n.error.data;
										e.reject(t);
									} else {
										e.resolve(n.result);
									}
								});
							},
							(t) => {
								e.forEach((e) => {
									e.reject(t);
								});
							}
						);
					});
				}
			}
			class AlchemyProvider extends o.F {
				constructor(e) {
					const t = AlchemyProvider.getApiKey(e.apiKey);
					const r = AlchemyProvider.getAlchemyNetwork(e.network);
					let s = AlchemyProvider.getAlchemyConnectionInfo(r, t, 'http');
					if (e.url !== undefined) {
						s.url = e.url;
					}
					s.throttleLimit = e.maxRetries;
					if (e.connectionInfoOverrides) {
						s = Object.assign(Object.assign({}, s), e.connectionInfoOverrides);
					}
					const o = n.E[r];
					super(s, o);
					this.apiKey = e.apiKey;
					this.maxRetries = e.maxRetries;
					this.batchRequests = e.batchRequests;
					const a = Object.assign(Object.assign({}, this.connection), {
						headers: Object.assign(Object.assign({}, this.connection.headers), {
							'Alchemy-Ethers-Sdk-Method': 'batchSend'
						})
					});
					const sendBatchFn = (e) => (0, i.x6)(a, JSON.stringify(e));
					this.batcher = new RequestBatcher(sendBatchFn);
					this.modifyFormatter();
				}
				static getApiKey(e) {
					if (e == null) {
						return n.D;
					}
					if (e && typeof e !== 'string') {
						throw new Error(`Invalid apiKey '${e}' provided. apiKey must be a string.`);
					}
					return e;
				}
				static getNetwork(e) {
					if (typeof e === 'string' && e in n.C) {
						return n.C[e];
					}
					return (0, s.N)(e);
				}
				static getAlchemyNetwork(e) {
					if (e === undefined) {
						return n.a;
					}
					if (typeof e === 'number') {
						throw new Error(`Invalid network '${e}' provided. Network must be a string.`);
					}
					const t = Object.values(n.N).includes(e);
					if (!t) {
						throw new Error(
							`Invalid network '${e}' provided. Network must be one of: ` +
								`${Object.values(n.N).join(', ')}.`
						);
					}
					return e;
				}
				static getAlchemyConnectionInfo(e, t, r) {
					const s = r === 'http' ? (0, n.g)(e, t) : (0, n.b)(e, t);
					return {
						headers: n.I
							? { 'Alchemy-Ethers-Sdk-Version': n.V }
							: { 'Alchemy-Ethers-Sdk-Version': n.V, 'Accept-Encoding': 'gzip' },
						allowGzip: true,
						url: s
					};
				}
				detectNetwork() {
					const e = Object.create(null, { detectNetwork: { get: () => super.detectNetwork } });
					return (0, n._)(this, void 0, void 0, function* () {
						let t = this.network;
						if (t == null) {
							t = yield e.detectNetwork.call(this);
							if (!t) {
								throw new Error('No network detected');
							}
						}
						return t;
					});
				}
				_startPending() {
					(0, n.l)('WARNING: Alchemy Provider does not support pending filters');
				}
				isCommunityResource() {
					return this.apiKey === n.D;
				}
				send(e, t) {
					return this._send(e, t, 'send');
				}
				_send(e, t, r, s = false) {
					const o = { method: e, params: t, id: this._nextId++, jsonrpc: '2.0' };
					const a = Object.assign({}, this.connection);
					a.headers['Alchemy-Ethers-Sdk-Method'] = r;
					if (this.batchRequests || s) {
						return this.batcher.enqueueRequest(o);
					}
					this.emit('debug', { action: 'request', request: (0, n.d)(o), provider: this });
					const l = ['eth_chainId', 'eth_blockNumber'].indexOf(e) >= 0;
					if (l && this._cache[e]) {
						return this._cache[e];
					}
					const c = (0, i.x6)(this.connection, JSON.stringify(o), getResult).then(
						(e) => {
							this.emit('debug', { action: 'response', request: o, response: e, provider: this });
							return e;
						},
						(e) => {
							this.emit('debug', { action: 'response', error: e, request: o, provider: this });
							throw e;
						}
					);
					if (l) {
						this._cache[e] = c;
						setTimeout(() => {
							this._cache[e] = null;
						}, 0);
					}
					return c;
				}
				modifyFormatter() {
					this.formatter.formats['receiptLog']['removed'] = (e) => {
						if (typeof e === 'boolean') {
							return e;
						}
						return undefined;
					};
				}
			}
			function getResult(e) {
				if (e.error) {
					const t = new Error(e.error.message);
					t.code = e.error.code;
					t.data = e.error.data;
					throw t;
				}
				return e.result;
			}
		},
		3257: (e, t, r) => {
			'use strict';
			r.r(t);
			r.d(t, { AlchemyWebSocketProvider: () => AlchemyWebSocketProvider });
			var n = r(8440);
			var s = r(7120);
			var o = r(2834);
			var i = r(9187);
			var a = r(3116);
			var l = r(1015);
			var c = r(5982);
			var u = r(2406);
			let h = null;
			try {
				h = WebSocket;
				if (h == null) {
					throw new Error('inject please');
				}
			} catch (e) {
				const t = new c.Vy(u.r);
				h = function () {
					t.throwError(
						'WebSockets not supported in this environment',
						c.Vy.errors.UNSUPPORTED_OPERATION,
						{ operation: 'new WebSocket()' }
					);
				};
			}
			var d =
				(undefined && undefined.__awaiter) ||
				function (e, t, r, n) {
					function adopt(e) {
						return e instanceof r
							? e
							: new r(function (t) {
									t(e);
								});
					}
					return new (r || (r = Promise))(function (r, s) {
						function fulfilled(e) {
							try {
								step(n.next(e));
							} catch (e) {
								s(e);
							}
						}
						function rejected(e) {
							try {
								step(n['throw'](e));
							} catch (e) {
								s(e);
							}
						}
						function step(e) {
							e.done ? r(e.value) : adopt(e.value).then(fulfilled, rejected);
						}
						step((n = n.apply(e, t || [])).next());
					});
				};
			const f = new c.Vy(u.r);
			let m = 1;
			class WebSocketProvider extends l.F {
				constructor(e, t) {
					if (t === 'any') {
						f.throwError(
							"WebSocketProvider does not support 'any' network yet",
							c.Vy.errors.UNSUPPORTED_OPERATION,
							{ operation: 'network:any' }
						);
					}
					if (typeof e === 'string') {
						super(e, t);
					} else {
						super('_websocket', t);
					}
					this._pollingInterval = -1;
					this._wsReady = false;
					if (typeof e === 'string') {
						(0, a.yY)(this, '_websocket', new h(this.connection.url));
					} else {
						(0, a.yY)(this, '_websocket', e);
					}
					(0, a.yY)(this, '_requests', {});
					(0, a.yY)(this, '_subs', {});
					(0, a.yY)(this, '_subIds', {});
					(0, a.yY)(this, '_detectNetwork', super.detectNetwork());
					this.websocket.onopen = () => {
						this._wsReady = true;
						Object.keys(this._requests).forEach((e) => {
							this.websocket.send(this._requests[e].payload);
						});
					};
					this.websocket.onmessage = (e) => {
						const t = e.data;
						const r = JSON.parse(t);
						if (r.id != null) {
							const e = String(r.id);
							const n = this._requests[e];
							delete this._requests[e];
							if (r.result !== undefined) {
								n.callback(null, r.result);
								this.emit('debug', {
									action: 'response',
									request: JSON.parse(n.payload),
									response: r.result,
									provider: this
								});
							} else {
								let e = null;
								if (r.error) {
									e = new Error(r.error.message || 'unknown error');
									(0, a.yY)(e, 'code', r.error.code || null);
									(0, a.yY)(e, 'response', t);
								} else {
									e = new Error('unknown error');
								}
								n.callback(e, undefined);
								this.emit('debug', {
									action: 'response',
									error: e,
									request: JSON.parse(n.payload),
									provider: this
								});
							}
						} else if (r.method === 'eth_subscription') {
							const e = this._subs[r.params.subscription];
							if (e) {
								e.processFunc(r.params.result);
							}
						} else {
							console.warn('this should not happen');
						}
					};
					const r = setInterval(() => {
						this.emit('poll');
					}, 1e3);
					if (r.unref) {
						r.unref();
					}
				}
				get websocket() {
					return this._websocket;
				}
				detectNetwork() {
					return this._detectNetwork;
				}
				get pollingInterval() {
					return 0;
				}
				resetEventsBlock(e) {
					f.throwError(
						'cannot reset events block on WebSocketProvider',
						c.Vy.errors.UNSUPPORTED_OPERATION,
						{ operation: 'resetEventBlock' }
					);
				}
				set pollingInterval(e) {
					f.throwError(
						'cannot set polling interval on WebSocketProvider',
						c.Vy.errors.UNSUPPORTED_OPERATION,
						{ operation: 'setPollingInterval' }
					);
				}
				poll() {
					return d(this, void 0, void 0, function* () {
						return null;
					});
				}
				set polling(e) {
					if (!e) {
						return;
					}
					f.throwError(
						'cannot set polling on WebSocketProvider',
						c.Vy.errors.UNSUPPORTED_OPERATION,
						{ operation: 'setPolling' }
					);
				}
				send(e, t) {
					const r = m++;
					return new Promise((n, s) => {
						function callback(e, t) {
							if (e) {
								return s(e);
							}
							return n(t);
						}
						const o = JSON.stringify({ method: e, params: t, id: r, jsonrpc: '2.0' });
						this.emit('debug', { action: 'request', request: JSON.parse(o), provider: this });
						this._requests[String(r)] = { callback, payload: o };
						if (this._wsReady) {
							this.websocket.send(o);
						}
					});
				}
				static defaultUrl() {
					return 'ws://localhost:8546';
				}
				_subscribe(e, t, r) {
					return d(this, void 0, void 0, function* () {
						let n = this._subIds[e];
						if (n == null) {
							n = Promise.all(t).then((e) => this.send('eth_subscribe', e));
							this._subIds[e] = n;
						}
						const s = yield n;
						this._subs[s] = { tag: e, processFunc: r };
					});
				}
				_startEvent(e) {
					switch (e.type) {
						case 'block':
							this._subscribe('block', ['newHeads'], (e) => {
								const t = o.gH.from(e.number).toNumber();
								this._emitted.block = t;
								this.emit('block', t);
							});
							break;
						case 'pending':
							this._subscribe('pending', ['newPendingTransactions'], (e) => {
								this.emit('pending', e);
							});
							break;
						case 'filter':
							this._subscribe(e.tag, ['logs', this._getFilter(e.filter)], (t) => {
								if (t.removed == null) {
									t.removed = false;
								}
								this.emit(e.filter, this.formatter.filterLog(t));
							});
							break;
						case 'tx': {
							const emitReceipt = (e) => {
								const t = e.hash;
								this.getTransactionReceipt(t).then((e) => {
									if (!e) {
										return;
									}
									this.emit(t, e);
								});
							};
							emitReceipt(e);
							this._subscribe('tx', ['newHeads'], (e) => {
								this._events.filter((e) => e.type === 'tx').forEach(emitReceipt);
							});
							break;
						}
						case 'debug':
						case 'poll':
						case 'willPoll':
						case 'didPoll':
						case 'error':
							break;
						default:
							console.log('unhandled:', e);
							break;
					}
				}
				_stopEvent(e) {
					let t = e.tag;
					if (e.type === 'tx') {
						if (this._events.filter((e) => e.type === 'tx').length) {
							return;
						}
						t = 'tx';
					} else if (this.listenerCount(e.event)) {
						return;
					}
					const r = this._subIds[t];
					if (!r) {
						return;
					}
					delete this._subIds[t];
					r.then((e) => {
						if (!this._subs[e]) {
							return;
						}
						delete this._subs[e];
						this.send('eth_unsubscribe', [e]);
					});
				}
				destroy() {
					return d(this, void 0, void 0, function* () {
						if (this.websocket.readyState === h.CONNECTING) {
							yield new Promise((e) => {
								this.websocket.onopen = function () {
									e(true);
								};
								this.websocket.onerror = function () {
									e(false);
								};
							});
						}
						this.websocket.close(1e3);
					});
				}
			}
			var g = r(399);
			var p = r(5409);
			const A = 120;
			class WebsocketBackfiller {
				constructor(e) {
					this.provider = e;
					this.maxBackfillBlocks = A;
				}
				getNewHeadsBackfill(e, t, r) {
					return (0, n._)(this, void 0, void 0, function* () {
						throwIfCancelled(e);
						const s = yield this.getBlockNumber();
						throwIfCancelled(e);
						if (t.length === 0) {
							return this.getHeadEventsInRange(Math.max(r, s - this.maxBackfillBlocks) + 1, s + 1);
						}
						const o = (0, n.f)(t[t.length - 1].number);
						const i = s - this.maxBackfillBlocks + 1;
						if (o <= i) {
							return this.getHeadEventsInRange(i, s + 1);
						}
						const a = yield this.getReorgHeads(e, t);
						throwIfCancelled(e);
						const l = yield this.getHeadEventsInRange(o + 1, s + 1);
						throwIfCancelled(e);
						return [...a, ...l];
					});
				}
				getLogsBackfill(e, t, r, s) {
					return (0, n._)(this, void 0, void 0, function* () {
						throwIfCancelled(e);
						const o = yield this.getBlockNumber();
						throwIfCancelled(e);
						if (r.length === 0) {
							return this.getLogsInRange(t, Math.max(s, o - this.maxBackfillBlocks) + 1, o + 1);
						}
						const i = (0, n.f)(r[r.length - 1].blockNumber);
						const a = o - this.maxBackfillBlocks + 1;
						if (i < a) {
							return this.getLogsInRange(t, a, o + 1);
						}
						const l = yield this.getCommonAncestor(e, r);
						throwIfCancelled(e);
						const c = r
							.filter((e) => (0, n.f)(e.blockNumber) > l.blockNumber)
							.map((e) => Object.assign(Object.assign({}, e), { removed: true }));
						const u =
							l.blockNumber === Number.NEGATIVE_INFINITY
								? (0, n.f)(r[0].blockNumber)
								: l.blockNumber;
						let h = yield this.getLogsInRange(t, u, o + 1);
						h = h.filter(
							(e) =>
								e && ((0, n.f)(e.blockNumber) > l.blockNumber || (0, n.f)(e.logIndex) > l.logIndex)
						);
						throwIfCancelled(e);
						return [...c, ...h];
					});
				}
				setMaxBackfillBlock(e) {
					this.maxBackfillBlocks = e;
				}
				getBlockNumber() {
					return (0, n._)(this, void 0, void 0, function* () {
						const e = yield this.provider.send('eth_blockNumber');
						return (0, n.f)(e);
					});
				}
				getHeadEventsInRange(e, t) {
					return (0, n._)(this, void 0, void 0, function* () {
						if (e >= t) {
							return [];
						}
						const r = [];
						for (let s = e; s < t; s++) {
							r.push({ method: 'eth_getBlockByNumber', params: [(0, n.t)(s), false] });
						}
						const s = yield this.provider.sendBatch(r);
						return s.map(toNewHeadsEvent);
					});
				}
				getReorgHeads(e, t) {
					return (0, n._)(this, void 0, void 0, function* () {
						const r = [];
						for (let s = t.length - 1; s >= 0; s--) {
							const o = t[s];
							const i = yield this.getBlockByNumber((0, n.f)(o.number));
							throwIfCancelled(e);
							if (o.hash === i.hash) {
								break;
							}
							r.push(toNewHeadsEvent(i));
						}
						return r.reverse();
					});
				}
				getBlockByNumber(e) {
					return (0, n._)(this, void 0, void 0, function* () {
						return this.provider.send('eth_getBlockByNumber', [(0, n.t)(e), false]);
					});
				}
				getCommonAncestor(e, t) {
					return (0, n._)(this, void 0, void 0, function* () {
						let r = yield this.getBlockByNumber((0, n.f)(t[t.length - 1].blockNumber));
						throwIfCancelled(e);
						for (let e = t.length - 1; e >= 0; e--) {
							const s = t[e];
							if (s.blockNumber !== r.number) {
								r = yield this.getBlockByNumber((0, n.f)(s.blockNumber));
							}
							if (s.blockHash === r.hash) {
								return { blockNumber: (0, n.f)(s.blockNumber), logIndex: (0, n.f)(s.logIndex) };
							}
						}
						return { blockNumber: Number.NEGATIVE_INFINITY, logIndex: Number.NEGATIVE_INFINITY };
					});
				}
				getLogsInRange(e, t, r) {
					return (0, n._)(this, void 0, void 0, function* () {
						if (t >= r) {
							return [];
						}
						const s = Object.assign(Object.assign({}, e), {
							fromBlock: (0, n.t)(t),
							toBlock: (0, n.t)(r - 1)
						});
						return this.provider.send('eth_getLogs', [s]);
					});
				}
			}
			function toNewHeadsEvent(e) {
				const t = Object.assign({}, e);
				delete t.totalDifficulty;
				delete t.transactions;
				delete t.uncles;
				return t;
			}
			function dedupeNewHeads(e) {
				return dedupe(e, (e) => e.hash);
			}
			function dedupeLogs(e) {
				return dedupe(e, (e) => `${e.blockHash}/${e.logIndex}`);
			}
			function dedupe(e, t) {
				const r = new Set();
				const n = [];
				e.forEach((e) => {
					const s = t(e);
					if (!r.has(s)) {
						r.add(s);
						n.push(e);
					}
				});
				return n;
			}
			const y = new Error('Cancelled');
			function throwIfCancelled(e) {
				if (e()) {
					throw y;
				}
			}
			const b = 3e4;
			const v = 1e4;
			const w = 6e4;
			const k = 5;
			const E = 10;
			class AlchemyWebSocketProvider extends WebSocketProvider {
				constructor(e, t) {
					var r;
					const o = g.AlchemyProvider.getApiKey(e.apiKey);
					const i = g.AlchemyProvider.getAlchemyNetwork(e.network);
					const a = g.AlchemyProvider.getAlchemyConnectionInfo(i, o, 'wss');
					const l = `alchemy-sdk-${n.V}`;
					const c = new s.A((r = e.url) !== null && r !== void 0 ? r : a.url, l, {
						wsConstructor: t !== null && t !== void 0 ? t : getWebsocketConstructor()
					});
					const u = n.E[i];
					super(c, u);
					this._events = [];
					this.virtualSubscriptionsById = new Map();
					this.virtualIdsByPhysicalId = new Map();
					this.handleMessage = (e) => {
						const t = JSON.parse(e.data);
						if (!isSubscriptionEvent(t)) {
							return;
						}
						const r = t.params.subscription;
						const n = this.virtualIdsByPhysicalId.get(r);
						if (!n) {
							return;
						}
						const s = this.virtualSubscriptionsById.get(n);
						if (s.method !== 'eth_subscribe') {
							return;
						}
						switch (s.params[0]) {
							case 'newHeads': {
								const e = s;
								const o = t;
								const { isBackfilling: i, backfillBuffer: a } = e;
								const { result: l } = o.params;
								if (i) {
									addToNewHeadsEventsBuffer(a, l);
								} else if (r !== n) {
									this.emitAndRememberEvent(n, l, getNewHeadsBlockNumber);
								} else {
									this.rememberEvent(n, l, getNewHeadsBlockNumber);
								}
								break;
							}
							case 'logs': {
								const e = s;
								const o = t;
								const { isBackfilling: i, backfillBuffer: a } = e;
								const { result: l } = o.params;
								if (i) {
									addToLogsEventsBuffer(a, l);
								} else if (n !== r) {
									this.emitAndRememberEvent(n, l, getLogsBlockNumber);
								} else {
									this.rememberEvent(n, l, getLogsBlockNumber);
								}
								break;
							}
							default:
								if (r !== n) {
									const { result: e } = t.params;
									this.emitEvent(n, e);
								}
						}
					};
					this.handleReopen = () => {
						this.virtualIdsByPhysicalId.clear();
						const { cancel: e, isCancelled: t } = makeCancelToken();
						this.cancelBackfill = e;
						for (const e of this.virtualSubscriptionsById.values()) {
							void (() =>
								(0, n._)(this, void 0, void 0, function* () {
									try {
										yield this.resubscribeAndBackfill(t, e);
									} catch (r) {
										if (!t()) {
											console.error(
												`Error while backfilling "${e.params[0]}" subscription. Some events may be missing.`,
												r
											);
										}
									}
								}))();
						}
						this.startHeartbeat();
					};
					this.stopHeartbeatAndBackfill = () => {
						if (this.heartbeatIntervalId != null) {
							clearInterval(this.heartbeatIntervalId);
							this.heartbeatIntervalId = undefined;
						}
						this.cancelBackfill();
					};
					this.apiKey = o;
					this.backfiller = new WebsocketBackfiller(this);
					this.addSocketListeners();
					this.startHeartbeat();
					this.cancelBackfill = n.n;
				}
				static getNetwork(e) {
					if (typeof e === 'string' && e in n.C) {
						return n.C[e];
					}
					return (0, i.N)(e);
				}
				on(e, t) {
					return this._addEventListener(e, t, false);
				}
				once(e, t) {
					return this._addEventListener(e, t, true);
				}
				off(e, t) {
					if ((0, n.i)(e)) {
						return this._off(e, t);
					} else {
						return super.off(e, t);
					}
				}
				removeAllListeners(e) {
					if (e !== undefined && (0, n.i)(e)) {
						return this._removeAllListeners(e);
					} else {
						return super.removeAllListeners(e);
					}
				}
				listenerCount(e) {
					if (e !== undefined && (0, n.i)(e)) {
						return this._listenerCount(e);
					} else {
						return super.listenerCount(e);
					}
				}
				listeners(e) {
					if (e !== undefined && (0, n.i)(e)) {
						return this._listeners(e);
					} else {
						return super.listeners(e);
					}
				}
				_addEventListener(e, t, r) {
					if ((0, n.i)(e)) {
						(0, n.v)(e);
						const s = new n.c((0, n.e)(e), t, r);
						this._events.push(s);
						this._startEvent(s);
						return this;
					} else {
						return super._addEventListener(e, t, r);
					}
				}
				_startEvent(e) {
					const t = [...n.A, 'block', 'filter'];
					if (t.includes(e.type)) {
						this.customStartEvent(e);
					} else {
						super._startEvent(e);
					}
				}
				_subscribe(e, t, r, s) {
					return (0, n._)(this, void 0, void 0, function* () {
						let n = this._subIds[e];
						const o = yield this.getBlockNumber();
						if (n == null) {
							n = Promise.all(t).then((e) => this.send('eth_subscribe', e));
							this._subIds[e] = n;
						}
						const i = yield n;
						const a = yield Promise.all(t);
						this.virtualSubscriptionsById.set(i, {
							event: s,
							method: 'eth_subscribe',
							params: a,
							startingBlockNumber: o,
							virtualId: i,
							physicalId: i,
							sentEvents: [],
							isBackfilling: false,
							backfillBuffer: []
						});
						this.virtualIdsByPhysicalId.set(i, i);
						this._subs[i] = { tag: e, processFunc: r };
					});
				}
				emit(e, ...t) {
					if ((0, n.i)(e)) {
						let r = false;
						const s = [];
						const o = (0, n.e)(e);
						this._events = this._events.filter((e) => {
							if (e.tag !== o) {
								return true;
							}
							setTimeout(() => {
								e.listener.apply(this, t);
							}, 0);
							r = true;
							if (e.once) {
								s.push(e);
								return false;
							}
							return true;
						});
						s.forEach((e) => {
							this._stopEvent(e);
						});
						return r;
					} else {
						return super.emit(e, ...t);
					}
				}
				sendBatch(e) {
					return (0, n._)(this, void 0, void 0, function* () {
						let t = 0;
						const r = e.map(({ method: e, params: r }) => ({
							method: e,
							params: r,
							jsonrpc: '2.0',
							id: `alchemy-sdk:${t++}`
						}));
						return this.sendBatchConcurrently(r);
					});
				}
				destroy() {
					this.removeSocketListeners();
					this.stopHeartbeatAndBackfill();
					return super.destroy();
				}
				isCommunityResource() {
					return this.apiKey === n.D;
				}
				_stopEvent(e) {
					let t = e.tag;
					if (n.A.includes(e.type)) {
						if (this._events.filter((e) => n.A.includes(e.type)).length) {
							return;
						}
					} else if (e.type === 'tx') {
						if (this._events.filter((e) => e.type === 'tx').length) {
							return;
						}
						t = 'tx';
					} else if (this.listenerCount(e.event)) {
						return;
					}
					const r = this._subIds[t];
					if (!r) {
						return;
					}
					delete this._subIds[t];
					void r.then((e) => {
						if (!this._subs[e]) {
							return;
						}
						delete this._subs[e];
						void this.send('eth_unsubscribe', [e]);
					});
				}
				addSocketListeners() {
					this._websocket.addEventListener('message', this.handleMessage);
					this._websocket.addEventListener('reopen', this.handleReopen);
					this._websocket.addEventListener('down', this.stopHeartbeatAndBackfill);
				}
				removeSocketListeners() {
					this._websocket.removeEventListener('message', this.handleMessage);
					this._websocket.removeEventListener('reopen', this.handleReopen);
					this._websocket.removeEventListener('down', this.stopHeartbeatAndBackfill);
				}
				resubscribeAndBackfill(e, t) {
					return (0, n._)(this, void 0, void 0, function* () {
						const {
							virtualId: r,
							method: n,
							params: s,
							sentEvents: o,
							backfillBuffer: i,
							startingBlockNumber: a
						} = t;
						t.isBackfilling = true;
						i.length = 0;
						try {
							const l = yield this.send(n, s);
							throwIfCancelled(e);
							t.physicalId = l;
							this.virtualIdsByPhysicalId.set(l, r);
							switch (s[0]) {
								case 'newHeads': {
									const t = yield withBackoffRetries(
										() => withTimeout(this.backfiller.getNewHeadsBackfill(e, o, a), w),
										k,
										() => !e()
									);
									throwIfCancelled(e);
									const n = dedupeNewHeads([...t, ...i]);
									n.forEach((e) => this.emitNewHeadsEvent(r, e));
									break;
								}
								case 'logs': {
									const t = s[1] || {};
									const n = yield withBackoffRetries(
										() => withTimeout(this.backfiller.getLogsBackfill(e, t, o, a), w),
										k,
										() => !e()
									);
									throwIfCancelled(e);
									const l = dedupeLogs([...n, ...i]);
									l.forEach((e) => this.emitLogsEvent(r, e));
									break;
								}
								default:
									break;
							}
						} finally {
							t.isBackfilling = false;
							i.length = 0;
						}
					});
				}
				emitNewHeadsEvent(e, t) {
					this.emitAndRememberEvent(e, t, getNewHeadsBlockNumber);
				}
				emitLogsEvent(e, t) {
					this.emitAndRememberEvent(e, t, getLogsBlockNumber);
				}
				emitAndRememberEvent(e, t, r) {
					this.rememberEvent(e, t, r);
					this.emitEvent(e, t);
				}
				emitEvent(e, t) {
					const r = this.virtualSubscriptionsById.get(e);
					if (!r) {
						return;
					}
					this.emitGenericEvent(r, t);
				}
				rememberEvent(e, t, r) {
					const n = this.virtualSubscriptionsById.get(e);
					if (!n) {
						return;
					}
					addToPastEventsBuffer(n.sentEvents, Object.assign({}, t), r);
				}
				emitGenericEvent(e, t) {
					const r = this.emitProcessFn(e.event);
					r(t);
				}
				startHeartbeat() {
					if (this.heartbeatIntervalId != null) {
						return;
					}
					this.heartbeatIntervalId = setInterval(
						() =>
							(0, n._)(this, void 0, void 0, function* () {
								try {
									yield withTimeout(this.send('net_version'), v);
								} catch (e) {
									this._websocket.reconnect();
								}
							}),
						b
					);
				}
				sendBatchConcurrently(e) {
					return (0, n._)(this, void 0, void 0, function* () {
						return Promise.all(e.map((e) => this.send(e.method, e.params)));
					});
				}
				customStartEvent(e) {
					if (e.type === n.h) {
						const { fromAddress: t, toAddress: r, hashesOnly: s } = e;
						void this._subscribe(
							e.tag,
							[n.j.PENDING_TRANSACTIONS, { fromAddress: t, toAddress: r, hashesOnly: s }],
							this.emitProcessFn(e),
							e
						);
					} else if (e.type === n.k) {
						const { addresses: t, includeRemoved: r, hashesOnly: s } = e;
						void this._subscribe(
							e.tag,
							[n.j.MINED_TRANSACTIONS, { addresses: t, includeRemoved: r, hashesOnly: s }],
							this.emitProcessFn(e),
							e
						);
					} else if (e.type === 'block') {
						void this._subscribe('block', ['newHeads'], this.emitProcessFn(e), e);
					} else if (e.type === 'filter') {
						void this._subscribe(
							e.tag,
							['logs', this._getFilter(e.filter)],
							this.emitProcessFn(e),
							e
						);
					}
				}
				emitProcessFn(e) {
					switch (e.type) {
						case n.h:
							return (t) =>
								this.emit(
									{
										method: n.j.PENDING_TRANSACTIONS,
										fromAddress: e.fromAddress,
										toAddress: e.toAddress,
										hashesOnly: e.hashesOnly
									},
									t
								);
						case n.k:
							return (t) =>
								this.emit(
									{
										method: n.j.MINED_TRANSACTIONS,
										addresses: e.addresses,
										includeRemoved: e.includeRemoved,
										hashesOnly: e.hashesOnly
									},
									t
								);
						case 'block':
							return (e) => {
								const t = o.gH.from(e.number).toNumber();
								this._emitted.block = t;
								this.emit('block', t);
							};
						case 'filter':
							return (t) => {
								if (t.removed == null) {
									t.removed = false;
								}
								this.emit(e.filter, this.formatter.filterLog(t));
							};
						default:
							throw new Error('Invalid event type to `emitProcessFn()`');
					}
				}
				_off(e, t) {
					if (t == null) {
						return this.removeAllListeners(e);
					}
					const r = [];
					let s = false;
					const o = (0, n.e)(e);
					this._events = this._events.filter((e) => {
						if (e.tag !== o || e.listener != t) {
							return true;
						}
						if (s) {
							return true;
						}
						s = true;
						r.push(e);
						return false;
					});
					r.forEach((e) => {
						this._stopEvent(e);
					});
					return this;
				}
				_removeAllListeners(e) {
					let t = [];
					if (e == null) {
						t = this._events;
						this._events = [];
					} else {
						const r = (0, n.e)(e);
						this._events = this._events.filter((e) => {
							if (e.tag !== r) {
								return true;
							}
							t.push(e);
							return false;
						});
					}
					t.forEach((e) => {
						this._stopEvent(e);
					});
					return this;
				}
				_listenerCount(e) {
					if (!e) {
						return this._events.length;
					}
					const t = (0, n.e)(e);
					return this._events.filter((e) => e.tag === t).length;
				}
				_listeners(e) {
					if (e == null) {
						return this._events.map((e) => e.listener);
					}
					const t = (0, n.e)(e);
					return this._events.filter((e) => e.tag === t).map((e) => e.listener);
				}
			}
			function getWebsocketConstructor() {
				return isNodeEnvironment() ? r(4385).w3cwebsocket : WebSocket;
			}
			function isNodeEnvironment() {
				return (
					typeof p !== 'undefined' && p != null && p.versions != null && p.versions.node != null
				);
			}
			function makeCancelToken() {
				let e = false;
				return { cancel: () => (e = true), isCancelled: () => e };
			}
			const N = 1e3;
			const _ = 2;
			const B = 3e4;
			function withBackoffRetries(e, t, r = () => true) {
				return (0, n._)(this, void 0, void 0, function* () {
					let n = 0;
					let s = 0;
					while (true) {
						try {
							return yield e();
						} catch (e) {
							s++;
							if (s >= t || !r(e)) {
								throw e;
							}
							yield delay(n);
							if (!r(e)) {
								throw e;
							}
							n = n === 0 ? N : Math.min(B, _ * n);
						}
					}
				});
			}
			function delay(e) {
				return new Promise((t) => setTimeout(t, e));
			}
			function withTimeout(e, t) {
				return Promise.race([
					e,
					new Promise((e, r) => setTimeout(() => r(new Error('Timeout')), t))
				]);
			}
			function getNewHeadsBlockNumber(e) {
				return (0, n.f)(e.number);
			}
			function getLogsBlockNumber(e) {
				return (0, n.f)(e.blockNumber);
			}
			function isResponse(e) {
				return Array.isArray(e) || (e.jsonrpc === '2.0' && e.id !== undefined);
			}
			function isSubscriptionEvent(e) {
				return !isResponse(e);
			}
			function addToNewHeadsEventsBuffer(e, t) {
				addToPastEventsBuffer(e, t, getNewHeadsBlockNumber);
			}
			function addToLogsEventsBuffer(e, t) {
				addToPastEventsBuffer(e, t, getLogsBlockNumber);
			}
			function addToPastEventsBuffer(e, t, r) {
				const n = r(t);
				const s = e.findIndex((e) => r(e) > n - E);
				if (s === -1) {
					e.length = 0;
				} else {
					e.splice(0, s);
				}
				e.push(t);
			}
		},
		5994: (e) => {
			'use strict';
			var t = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
			var r = {};
			for (var n = 0; n < t.length; n++) {
				var s = t.charAt(n);
				if (r[s] !== undefined) throw new TypeError(s + ' is ambiguous');
				r[s] = n;
			}
			function polymodStep(e) {
				var t = e >> 25;
				return (
					((e & 33554431) << 5) ^
					(-((t >> 0) & 1) & 996825010) ^
					(-((t >> 1) & 1) & 642813549) ^
					(-((t >> 2) & 1) & 513874426) ^
					(-((t >> 3) & 1) & 1027748829) ^
					(-((t >> 4) & 1) & 705979059)
				);
			}
			function prefixChk(e) {
				var t = 1;
				for (var r = 0; r < e.length; ++r) {
					var n = e.charCodeAt(r);
					if (n < 33 || n > 126) return 'Invalid prefix (' + e + ')';
					t = polymodStep(t) ^ (n >> 5);
				}
				t = polymodStep(t);
				for (r = 0; r < e.length; ++r) {
					var s = e.charCodeAt(r);
					t = polymodStep(t) ^ (s & 31);
				}
				return t;
			}
			function encode(e, r, n) {
				n = n || 90;
				if (e.length + 7 + r.length > n) throw new TypeError('Exceeds length limit');
				e = e.toLowerCase();
				var s = prefixChk(e);
				if (typeof s === 'string') throw new Error(s);
				var o = e + '1';
				for (var i = 0; i < r.length; ++i) {
					var a = r[i];
					if (a >> 5 !== 0) throw new Error('Non 5-bit word');
					s = polymodStep(s) ^ a;
					o += t.charAt(a);
				}
				for (i = 0; i < 6; ++i) {
					s = polymodStep(s);
				}
				s ^= 1;
				for (i = 0; i < 6; ++i) {
					var l = (s >> ((5 - i) * 5)) & 31;
					o += t.charAt(l);
				}
				return o;
			}
			function __decode(e, t) {
				t = t || 90;
				if (e.length < 8) return e + ' too short';
				if (e.length > t) return 'Exceeds length limit';
				var n = e.toLowerCase();
				var s = e.toUpperCase();
				if (e !== n && e !== s) return 'Mixed-case string ' + e;
				e = n;
				var o = e.lastIndexOf('1');
				if (o === -1) return 'No separator character for ' + e;
				if (o === 0) return 'Missing prefix for ' + e;
				var i = e.slice(0, o);
				var a = e.slice(o + 1);
				if (a.length < 6) return 'Data too short';
				var l = prefixChk(i);
				if (typeof l === 'string') return l;
				var c = [];
				for (var u = 0; u < a.length; ++u) {
					var h = a.charAt(u);
					var d = r[h];
					if (d === undefined) return 'Unknown character ' + h;
					l = polymodStep(l) ^ d;
					if (u + 6 >= a.length) continue;
					c.push(d);
				}
				if (l !== 1) return 'Invalid checksum for ' + e;
				return { prefix: i, words: c };
			}
			function decodeUnsafe() {
				var e = __decode.apply(null, arguments);
				if (typeof e === 'object') return e;
			}
			function decode(e) {
				var t = __decode.apply(null, arguments);
				if (typeof t === 'object') return t;
				throw new Error(t);
			}
			function convert(e, t, r, n) {
				var s = 0;
				var o = 0;
				var i = (1 << r) - 1;
				var a = [];
				for (var l = 0; l < e.length; ++l) {
					s = (s << t) | e[l];
					o += t;
					while (o >= r) {
						o -= r;
						a.push((s >> o) & i);
					}
				}
				if (n) {
					if (o > 0) {
						a.push((s << (r - o)) & i);
					}
				} else {
					if (o >= t) return 'Excess padding';
					if ((s << (r - o)) & i) return 'Non-zero padding';
				}
				return a;
			}
			function toWordsUnsafe(e) {
				var t = convert(e, 8, 5, true);
				if (Array.isArray(t)) return t;
			}
			function toWords(e) {
				var t = convert(e, 8, 5, true);
				if (Array.isArray(t)) return t;
				throw new Error(t);
			}
			function fromWordsUnsafe(e) {
				var t = convert(e, 5, 8, false);
				if (Array.isArray(t)) return t;
			}
			function fromWords(e) {
				var t = convert(e, 5, 8, false);
				if (Array.isArray(t)) return t;
				throw new Error(t);
			}
			e.exports = {
				decodeUnsafe,
				decode,
				encode,
				toWordsUnsafe,
				toWords,
				fromWordsUnsafe,
				fromWords
			};
		},
		5888: (e) => {
			var naiveFallback = function () {
				if (typeof self === 'object' && self) return self;
				if (typeof window === 'object' && window) return window;
				throw new Error('Unable to resolve global `this`');
			};
			e.exports = (function () {
				if (this) return this;
				if (typeof globalThis === 'object' && globalThis) return globalThis;
				try {
					Object.defineProperty(Object.prototype, '__global__', {
						get: function () {
							return this;
						},
						configurable: true
					});
				} catch (e) {
					return naiveFallback();
				}
				try {
					if (!__global__) return naiveFallback();
					return __global__;
				} finally {
					delete Object.prototype.__global__;
				}
			})();
		},
		7120: (e, t) => {
			'use strict';
			var r;
			r = { value: true };
			var n = 'Provided shouldReconnect() returned false. Closing permanently.';
			var s = 'Provided shouldReconnect() resolved to false. Closing permanently.';
			var o = (function () {
				function SturdyWebSocket(e, t, r) {
					if (r === void 0) {
						r = {};
					}
					this.url = e;
					this.onclose = null;
					this.onerror = null;
					this.onmessage = null;
					this.onopen = null;
					this.ondown = null;
					this.onreopen = null;
					this.CONNECTING = SturdyWebSocket.CONNECTING;
					this.OPEN = SturdyWebSocket.OPEN;
					this.CLOSING = SturdyWebSocket.CLOSING;
					this.CLOSED = SturdyWebSocket.CLOSED;
					this.hasBeenOpened = false;
					this.isClosed = false;
					this.messageBuffer = [];
					this.nextRetryTime = 0;
					this.reconnectCount = 0;
					this.lastKnownExtensions = '';
					this.lastKnownProtocol = '';
					this.listeners = {};
					if (t == null || typeof t === 'string' || Array.isArray(t)) {
						this.protocols = t;
					} else {
						r = t;
					}
					this.options = applyDefaultOptions(r);
					if (!this.options.wsConstructor) {
						if (typeof WebSocket !== 'undefined') {
							this.options.wsConstructor = WebSocket;
						} else {
							throw new Error(
								'WebSocket not present in global scope and no ' +
									'wsConstructor option was provided.'
							);
						}
					}
					this.openNewWebSocket();
				}
				Object.defineProperty(SturdyWebSocket.prototype, 'binaryType', {
					get: function () {
						return this.binaryTypeInternal || 'blob';
					},
					set: function (e) {
						this.binaryTypeInternal = e;
						if (this.ws) {
							this.ws.binaryType = e;
						}
					},
					enumerable: true,
					configurable: true
				});
				Object.defineProperty(SturdyWebSocket.prototype, 'bufferedAmount', {
					get: function () {
						var e = this.ws ? this.ws.bufferedAmount : 0;
						var t = false;
						this.messageBuffer.forEach(function (r) {
							var n = getDataByteLength(r);
							if (n != null) {
								e += n;
							} else {
								t = true;
							}
						});
						if (t) {
							this.debugLog(
								'Some buffered data had unknown length. bufferedAmount()' +
									' return value may be below the correct amount.'
							);
						}
						return e;
					},
					enumerable: true,
					configurable: true
				});
				Object.defineProperty(SturdyWebSocket.prototype, 'extensions', {
					get: function () {
						return this.ws ? this.ws.extensions : this.lastKnownExtensions;
					},
					enumerable: true,
					configurable: true
				});
				Object.defineProperty(SturdyWebSocket.prototype, 'protocol', {
					get: function () {
						return this.ws ? this.ws.protocol : this.lastKnownProtocol;
					},
					enumerable: true,
					configurable: true
				});
				Object.defineProperty(SturdyWebSocket.prototype, 'readyState', {
					get: function () {
						return this.isClosed ? SturdyWebSocket.CLOSED : SturdyWebSocket.OPEN;
					},
					enumerable: true,
					configurable: true
				});
				SturdyWebSocket.prototype.close = function (e, t) {
					this.disposeSocket(e, t);
					this.shutdown();
					this.debugLog('WebSocket permanently closed by client.');
				};
				SturdyWebSocket.prototype.send = function (e) {
					if (this.isClosed) {
						throw new Error('WebSocket is already in CLOSING or CLOSED state.');
					} else if (this.ws && this.ws.readyState === this.OPEN) {
						this.ws.send(e);
					} else {
						this.messageBuffer.push(e);
					}
				};
				SturdyWebSocket.prototype.reconnect = function () {
					if (this.isClosed) {
						throw new Error('Cannot call reconnect() on socket which is permanently closed.');
					}
					this.disposeSocket(1e3, 'Client requested reconnect.');
					this.handleClose(undefined);
				};
				SturdyWebSocket.prototype.addEventListener = function (e, t) {
					if (!this.listeners[e]) {
						this.listeners[e] = [];
					}
					this.listeners[e].push(t);
				};
				SturdyWebSocket.prototype.dispatchEvent = function (e) {
					return this.dispatchEventOfType(e.type, e);
				};
				SturdyWebSocket.prototype.removeEventListener = function (e, t) {
					if (this.listeners[e]) {
						this.listeners[e] = this.listeners[e].filter(function (e) {
							return e !== t;
						});
					}
				};
				SturdyWebSocket.prototype.openNewWebSocket = function () {
					var e = this;
					if (this.isClosed) {
						return;
					}
					var t = this.options,
						r = t.connectTimeout,
						n = t.wsConstructor;
					this.debugLog('Opening new WebSocket to ' + this.url + '.');
					var s = new n(this.url, this.protocols);
					s.onclose = function (t) {
						return e.handleClose(t);
					};
					s.onerror = function (t) {
						return e.handleError(t);
					};
					s.onmessage = function (t) {
						return e.handleMessage(t);
					};
					s.onopen = function (t) {
						return e.handleOpen(t);
					};
					this.connectTimeoutId = setTimeout(function () {
						e.clearConnectTimeout();
						e.disposeSocket();
						e.handleClose(undefined);
					}, r);
					this.ws = s;
				};
				SturdyWebSocket.prototype.handleOpen = function (e) {
					var t = this;
					if (!this.ws || this.isClosed) {
						return;
					}
					var r = this.options.allClearResetTime;
					this.debugLog('WebSocket opened.');
					if (this.binaryTypeInternal != null) {
						this.ws.binaryType = this.binaryTypeInternal;
					} else {
						this.binaryTypeInternal = this.ws.binaryType;
					}
					this.clearConnectTimeout();
					if (this.hasBeenOpened) {
						this.dispatchEventOfType('reopen', e);
					} else {
						this.dispatchEventOfType('open', e);
						this.hasBeenOpened = true;
					}
					this.messageBuffer.forEach(function (e) {
						return t.send(e);
					});
					this.messageBuffer = [];
					this.allClearTimeoutId = setTimeout(function () {
						t.clearAllClearTimeout();
						t.nextRetryTime = 0;
						t.reconnectCount = 0;
						var e = (r / 1e3) | 0;
						t.debugLog(
							'WebSocket remained open for ' + e + ' seconds. Resetting' + ' retry time and count.'
						);
					}, r);
				};
				SturdyWebSocket.prototype.handleMessage = function (e) {
					if (this.isClosed) {
						return;
					}
					this.dispatchEventOfType('message', e);
				};
				SturdyWebSocket.prototype.handleClose = function (e) {
					var t = this;
					if (this.isClosed) {
						return;
					}
					var r = this.options,
						o = r.maxReconnectAttempts,
						i = r.shouldReconnect;
					this.clearConnectTimeout();
					this.clearAllClearTimeout();
					if (this.ws) {
						this.lastKnownExtensions = this.ws.extensions;
						this.lastKnownProtocol = this.ws.protocol;
						this.disposeSocket();
					}
					this.dispatchEventOfType('down', e);
					if (this.reconnectCount >= o) {
						this.stopReconnecting(e, this.getTooManyFailedReconnectsMessage());
						return;
					}
					var a = !e || i(e);
					if (typeof a === 'boolean') {
						this.handleWillReconnect(a, e, n);
					} else {
						a.then(function (r) {
							if (t.isClosed) {
								return;
							}
							t.handleWillReconnect(r, e, s);
						});
					}
				};
				SturdyWebSocket.prototype.handleError = function (e) {
					this.dispatchEventOfType('error', e);
					this.debugLog('WebSocket encountered an error.');
				};
				SturdyWebSocket.prototype.handleWillReconnect = function (e, t, r) {
					if (e) {
						this.reestablishConnection();
					} else {
						this.stopReconnecting(t, r);
					}
				};
				SturdyWebSocket.prototype.reestablishConnection = function () {
					var e = this;
					var t = this.options,
						r = t.minReconnectDelay,
						n = t.maxReconnectDelay,
						s = t.reconnectBackoffFactor;
					this.reconnectCount++;
					var o = this.nextRetryTime;
					this.nextRetryTime = Math.max(r, Math.min(this.nextRetryTime * s, n));
					setTimeout(function () {
						return e.openNewWebSocket();
					}, o);
					var i = (o / 1e3) | 0;
					this.debugLog('WebSocket was closed. Re-opening in ' + i + ' seconds.');
				};
				SturdyWebSocket.prototype.stopReconnecting = function (e, t) {
					this.debugLog(t);
					this.shutdown();
					if (e) {
						this.dispatchEventOfType('close', e);
					}
				};
				SturdyWebSocket.prototype.shutdown = function () {
					this.isClosed = true;
					this.clearAllTimeouts();
					this.messageBuffer = [];
					this.disposeSocket();
				};
				SturdyWebSocket.prototype.disposeSocket = function (e, t) {
					if (!this.ws) {
						return;
					}
					this.ws.onerror = noop;
					this.ws.onclose = noop;
					this.ws.onmessage = noop;
					this.ws.onopen = noop;
					this.ws.close(e, t);
					this.ws = undefined;
				};
				SturdyWebSocket.prototype.clearAllTimeouts = function () {
					this.clearConnectTimeout();
					this.clearAllClearTimeout();
				};
				SturdyWebSocket.prototype.clearConnectTimeout = function () {
					if (this.connectTimeoutId != null) {
						clearTimeout(this.connectTimeoutId);
						this.connectTimeoutId = undefined;
					}
				};
				SturdyWebSocket.prototype.clearAllClearTimeout = function () {
					if (this.allClearTimeoutId != null) {
						clearTimeout(this.allClearTimeoutId);
						this.allClearTimeoutId = undefined;
					}
				};
				SturdyWebSocket.prototype.dispatchEventOfType = function (e, t) {
					var r = this;
					switch (e) {
						case 'close':
							if (this.onclose) {
								this.onclose(t);
							}
							break;
						case 'error':
							if (this.onerror) {
								this.onerror(t);
							}
							break;
						case 'message':
							if (this.onmessage) {
								this.onmessage(t);
							}
							break;
						case 'open':
							if (this.onopen) {
								this.onopen(t);
							}
							break;
						case 'down':
							if (this.ondown) {
								this.ondown(t);
							}
							break;
						case 'reopen':
							if (this.onreopen) {
								this.onreopen(t);
							}
							break;
					}
					if (e in this.listeners) {
						this.listeners[e].slice().forEach(function (e) {
							return r.callListener(e, t);
						});
					}
					return !t || !t.defaultPrevented;
				};
				SturdyWebSocket.prototype.callListener = function (e, t) {
					if (typeof e === 'function') {
						e.call(this, t);
					} else {
						e.handleEvent.call(this, t);
					}
				};
				SturdyWebSocket.prototype.debugLog = function (e) {
					if (this.options.debug) {
						console.log(e);
					}
				};
				SturdyWebSocket.prototype.getTooManyFailedReconnectsMessage = function () {
					var e = this.options.maxReconnectAttempts;
					return (
						'Failed to reconnect after ' +
						e +
						' ' +
						pluralize('attempt', e) +
						'. Closing permanently.'
					);
				};
				SturdyWebSocket.DEFAULT_OPTIONS = {
					allClearResetTime: 5e3,
					connectTimeout: 5e3,
					debug: false,
					minReconnectDelay: 1e3,
					maxReconnectDelay: 3e4,
					maxReconnectAttempts: Number.POSITIVE_INFINITY,
					reconnectBackoffFactor: 1.5,
					shouldReconnect: function () {
						return true;
					},
					wsConstructor: undefined
				};
				SturdyWebSocket.CONNECTING = 0;
				SturdyWebSocket.OPEN = 1;
				SturdyWebSocket.CLOSING = 2;
				SturdyWebSocket.CLOSED = 3;
				return SturdyWebSocket;
			})();
			t.A = o;
			function applyDefaultOptions(e) {
				var t = {};
				Object.keys(o.DEFAULT_OPTIONS).forEach(function (r) {
					var n = e[r];
					t[r] = n === undefined ? o.DEFAULT_OPTIONS[r] : n;
				});
				return t;
			}
			function getDataByteLength(e) {
				if (typeof e === 'string') {
					return 2 * e.length;
				} else if (e instanceof ArrayBuffer) {
					return e.byteLength;
				} else if (e instanceof Blob) {
					return e.size;
				} else {
					return undefined;
				}
			}
			function pluralize(e, t) {
				return t === 1 ? e : e + 's';
			}
			function noop() {}
		},
		4385: (e, t, r) => {
			var n;
			if (typeof globalThis === 'object') {
				n = globalThis;
			} else {
				try {
					n = r(5888);
				} catch (e) {
				} finally {
					if (!n && typeof window !== 'undefined') {
						n = window;
					}
					if (!n) {
						throw new Error('Could not determine global this');
					}
				}
			}
			var s = n.WebSocket || n.MozWebSocket;
			var o = r(9793);
			function W3CWebSocket(e, t) {
				var r;
				if (t) {
					r = new s(e, t);
				} else {
					r = new s(e);
				}
				return r;
			}
			if (s) {
				['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(function (e) {
					Object.defineProperty(W3CWebSocket, e, {
						get: function () {
							return s[e];
						}
					});
				});
			}
			e.exports = { w3cwebsocket: s ? W3CWebSocket : null, version: o };
		},
		9793: (e, t, r) => {
			e.exports = r(2214).version;
		},
		2214: (e) => {
			'use strict';
			e.exports = { version: '1.0.35' };
		}
	}
]);
