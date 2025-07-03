'use strict';
(self['webpackChunkwallet'] = self['webpackChunkwallet'] || []).push([
	[949],
	{
		/***/ 9187: /***/ (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
			// EXPORTS
			__webpack_require__.d(__webpack_exports__, {
				N: () => /* binding */ getNetwork
			});

			// EXTERNAL MODULE: ../../node_modules/.pnpm/@ethersproject+logger@5.7.0/node_modules/@ethersproject/logger/lib.esm/index.js + 1 modules
			var lib_esm = __webpack_require__(5982); // ../../node_modules/.pnpm/@ethersproject+networks@5.7.1/node_modules/@ethersproject/networks/lib.esm/_version.js
			const version = 'networks/5.7.1'; // ../../node_modules/.pnpm/@ethersproject+networks@5.7.1/node_modules/@ethersproject/networks/lib.esm/index.js
			//# sourceMappingURL=_version.js.map
			const logger = new lib_esm /* Logger */.Vy(version);
			function isRenetworkable(value) {
				return value && typeof value.renetwork === 'function';
			}
			function ethDefaultProvider(network) {
				const func = function (providers, options) {
					if (options == null) {
						options = {};
					}
					const providerList = [];
					if (providers.InfuraProvider && options.infura !== '-') {
						try {
							providerList.push(new providers.InfuraProvider(network, options.infura));
						} catch (error) {}
					}
					if (providers.EtherscanProvider && options.etherscan !== '-') {
						try {
							providerList.push(new providers.EtherscanProvider(network, options.etherscan));
						} catch (error) {}
					}
					if (providers.AlchemyProvider && options.alchemy !== '-') {
						try {
							providerList.push(new providers.AlchemyProvider(network, options.alchemy));
						} catch (error) {}
					}
					if (providers.PocketProvider && options.pocket !== '-') {
						// These networks are currently faulty on Pocket as their
						// network does not handle the Berlin hardfork, which is
						// live on these ones.
						// @TODO: This goes away once Pocket has upgraded their nodes
						const skip = ['goerli', 'ropsten', 'rinkeby', 'sepolia'];
						try {
							const provider = new providers.PocketProvider(network, options.pocket);
							if (provider.network && skip.indexOf(provider.network.name) === -1) {
								providerList.push(provider);
							}
						} catch (error) {}
					}
					if (providers.CloudflareProvider && options.cloudflare !== '-') {
						try {
							providerList.push(new providers.CloudflareProvider(network));
						} catch (error) {}
					}
					if (providers.AnkrProvider && options.ankr !== '-') {
						try {
							const skip = ['ropsten'];
							const provider = new providers.AnkrProvider(network, options.ankr);
							if (provider.network && skip.indexOf(provider.network.name) === -1) {
								providerList.push(provider);
							}
						} catch (error) {}
					}
					if (providerList.length === 0) {
						return null;
					}
					if (providers.FallbackProvider) {
						let quorum = 1;
						if (options.quorum != null) {
							quorum = options.quorum;
						} else if (network === 'homestead') {
							quorum = 2;
						}
						return new providers.FallbackProvider(providerList, quorum);
					}
					return providerList[0];
				};
				func.renetwork = function (network) {
					return ethDefaultProvider(network);
				};
				return func;
			}
			function etcDefaultProvider(url, network) {
				const func = function (providers, options) {
					if (providers.JsonRpcProvider) {
						return new providers.JsonRpcProvider(url, network);
					}
					return null;
				};
				func.renetwork = function (network) {
					return etcDefaultProvider(url, network);
				};
				return func;
			}
			const homestead = {
				chainId: 1,
				ensAddress: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
				name: 'homestead',
				_defaultProvider: ethDefaultProvider('homestead')
			};
			const ropsten = {
				chainId: 3,
				ensAddress: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
				name: 'ropsten',
				_defaultProvider: ethDefaultProvider('ropsten')
			};
			const classicMordor = {
				chainId: 63,
				name: 'classicMordor',
				_defaultProvider: etcDefaultProvider('https://www.ethercluster.com/mordor', 'classicMordor')
			};
			// See: https://chainlist.org
			const networks = {
				unspecified: { chainId: 0, name: 'unspecified' },
				homestead: homestead,
				mainnet: homestead,
				morden: { chainId: 2, name: 'morden' },
				ropsten: ropsten,
				testnet: ropsten,
				rinkeby: {
					chainId: 4,
					ensAddress: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
					name: 'rinkeby',
					_defaultProvider: ethDefaultProvider('rinkeby')
				},
				kovan: {
					chainId: 42,
					name: 'kovan',
					_defaultProvider: ethDefaultProvider('kovan')
				},
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
				// ETC (See: #351)
				classic: {
					chainId: 61,
					name: 'classic',
					_defaultProvider: etcDefaultProvider('https:/\/www.ethercluster.com/etc', 'classic')
				},
				classicMorden: { chainId: 62, name: 'classicMorden' },
				classicMordor: classicMordor,
				classicTestnet: classicMordor,
				classicKotti: {
					chainId: 6,
					name: 'classicKotti',
					_defaultProvider: etcDefaultProvider(
						'https:/\/www.ethercluster.com/kotti',
						'classicKotti'
					)
				},
				xdai: { chainId: 100, name: 'xdai' },
				matic: {
					chainId: 137,
					name: 'matic',
					_defaultProvider: ethDefaultProvider('matic')
				},
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
			/**
			 *  getNetwork
			 *
			 *  Converts a named common networks or chain ID (network ID) to a Network
			 *  and verifies a network is a valid Network..
			 */
			function getNetwork(network) {
				// No network (null)
				if (network == null) {
					return null;
				}
				if (typeof network === 'number') {
					for (const name in networks) {
						const standard = networks[name];
						if (standard.chainId === network) {
							return {
								name: standard.name,
								chainId: standard.chainId,
								ensAddress: standard.ensAddress || null,
								_defaultProvider: standard._defaultProvider || null
							};
						}
					}
					return {
						chainId: network,
						name: 'unknown'
					};
				}
				if (typeof network === 'string') {
					const standard = networks[network];
					if (standard == null) {
						return null;
					}
					return {
						name: standard.name,
						chainId: standard.chainId,
						ensAddress: standard.ensAddress,
						_defaultProvider: standard._defaultProvider || null
					};
				}
				const standard = networks[network.name];
				// Not a standard network; check that it is a valid network in general
				if (!standard) {
					if (typeof network.chainId !== 'number') {
						logger.throwArgumentError('invalid network chainId', 'network', network);
					}
					return network;
				}
				// Make sure the chainId matches the expected network chainId (or is 0; disable EIP-155)
				if (network.chainId !== 0 && network.chainId !== standard.chainId) {
					logger.throwArgumentError('network chainId mismatch', 'network', network);
				}
				// @TODO: In the next major version add an attach function to a defaultProvider
				// class and move the _defaultProvider internal to this file (extend Network)
				let defaultProvider = network._defaultProvider || null;
				if (defaultProvider == null && standard._defaultProvider) {
					if (isRenetworkable(standard._defaultProvider)) {
						defaultProvider = standard._defaultProvider.renetwork(network);
					} else {
						defaultProvider = standard._defaultProvider;
					}
				}
				// Standard Network (allow overriding the ENS address)
				return {
					name: network.name,
					chainId: standard.chainId,
					ensAddress: network.ensAddress || standard.ensAddress || null,
					_defaultProvider: defaultProvider
				};
			}
			//# sourceMappingURL=index.js.map

			/***/
		},

		/***/ 6555: /***/ (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
			/* harmony export */ __webpack_require__.d(__webpack_exports__, {
				/* harmony export */ r: () => /* binding */ version
				/* harmony export */
			});
			const version = 'providers/5.7.2';
			//# sourceMappingURL=_version.js.map

			/***/
		},

		/***/ 9414: /***/ (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
			// EXPORTS
			__webpack_require__.d(__webpack_exports__, {
				F: () => /* binding */ JsonRpcProvider
			});

			// UNUSED EXPORTS: JsonRpcSigner

			// EXTERNAL MODULE: ../../node_modules/.pnpm/@ethersproject+abstract-signer@5.7.0/node_modules/@ethersproject/abstract-signer/lib.esm/index.js + 1 modules
			var lib_esm = __webpack_require__(5068);
			// EXTERNAL MODULE: ../../node_modules/.pnpm/@ethersproject+bignumber@5.7.0/node_modules/@ethersproject/bignumber/lib.esm/bignumber.js
			var bignumber = __webpack_require__(2834);
			// EXTERNAL MODULE: ../../node_modules/.pnpm/@ethersproject+bytes@5.7.0/node_modules/@ethersproject/bytes/lib.esm/index.js + 1 modules
			var bytes_lib_esm = __webpack_require__(1519);
			// EXTERNAL MODULE: ../../node_modules/.pnpm/@ethersproject+hash@5.7.0/node_modules/@ethersproject/hash/lib.esm/typed-data.js
			var typed_data = __webpack_require__(1424);
			// EXTERNAL MODULE: ../../node_modules/.pnpm/@ethersproject+properties@5.7.0/node_modules/@ethersproject/properties/lib.esm/index.js + 1 modules
			var properties_lib_esm = __webpack_require__(3116);
			// EXTERNAL MODULE: ../../node_modules/.pnpm/@ethersproject+strings@5.7.0/node_modules/@ethersproject/strings/lib.esm/utf8.js + 1 modules
			var utf8 = __webpack_require__(5250);
			// EXTERNAL MODULE: ../../node_modules/.pnpm/@ethersproject+transactions@5.7.0/node_modules/@ethersproject/transactions/lib.esm/index.js + 2 modules
			var transactions_lib_esm = __webpack_require__(3231);
			// EXTERNAL MODULE: ../../node_modules/.pnpm/@ethersproject+web@5.7.1/node_modules/@ethersproject/web/lib.esm/index.js + 2 modules
			var web_lib_esm = __webpack_require__(8628);
			// EXTERNAL MODULE: ../../node_modules/.pnpm/@ethersproject+logger@5.7.0/node_modules/@ethersproject/logger/lib.esm/index.js + 1 modules
			var logger_lib_esm = __webpack_require__(5982);
			// EXTERNAL MODULE: ../../node_modules/.pnpm/@ethersproject+providers@5.7.2_bufferutil@4.0.8_utf-8-validate@5.0.10/node_modules/@ethersproject/providers/lib.esm/_version.js
			var _version = __webpack_require__(6555);
			// EXTERNAL MODULE: ../../node_modules/.pnpm/@ethersproject+abstract-provider@5.7.0/node_modules/@ethersproject/abstract-provider/lib.esm/index.js + 1 modules
			var abstract_provider_lib_esm = __webpack_require__(4952);
			// EXTERNAL MODULE: ../../node_modules/.pnpm/@ethersproject+base64@5.7.0/node_modules/@ethersproject/base64/lib.esm/base64.js
			var base64 = __webpack_require__(3162);
			// EXTERNAL MODULE: ../../node_modules/.pnpm/@ethersproject+basex@5.7.0/node_modules/@ethersproject/basex/lib.esm/index.js
			var basex_lib_esm = __webpack_require__(797); // ../../node_modules/.pnpm/@ethersproject+constants@5.7.0/node_modules/@ethersproject/constants/lib.esm/hashes.js
			const HashZero = '0x0000000000000000000000000000000000000000000000000000000000000000';
			//# sourceMappingURL=hashes.js.map
			// EXTERNAL MODULE: ../../node_modules/.pnpm/@ethersproject+keccak256@5.7.0/node_modules/@ethersproject/keccak256/lib.esm/index.js
			var keccak256_lib_esm = __webpack_require__(4781);
			// EXTERNAL MODULE: ../../node_modules/.pnpm/@ethersproject+hash@5.7.0/node_modules/@ethersproject/hash/lib.esm/_version.js
			var lib_esm_version = __webpack_require__(3404); // ../../node_modules/.pnpm/@ethersproject+hash@5.7.0/node_modules/@ethersproject/hash/lib.esm/ens-normalize/decoder.js
			/**
			 * MIT License
			 *
			 * Copyright (c) 2021 Andrew Raffensperger
			 *
			 * Permission is hereby granted, free of charge, to any person obtaining a copy
			 * of this software and associated documentation files (the "Software"), to deal
			 * in the Software without restriction, including without limitation the rights
			 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
			 * copies of the Software, and to permit persons to whom the Software is
			 * furnished to do so, subject to the following conditions:
			 *
			 * The above copyright notice and this permission notice shall be included in all
			 * copies or substantial portions of the Software.
			 *
			 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
			 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
			 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
			 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
			 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
			 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
			 * SOFTWARE.
			 *
			 * This is a near carbon-copy of the original source (link below) with the
			 * TypeScript typings added and a few tweaks to make it ES3-compatible.
			 *
			 * See: https://github.com/adraffy/ens-normalize.js
			 */
			// https://github.com/behnammodi/polyfill/blob/master/array.polyfill.js
			function flat(array, depth) {
				if (depth == null) {
					depth = 1;
				}
				const result = [];
				const forEach = result.forEach;
				const flatDeep = function (arr, depth) {
					forEach.call(arr, function (val) {
						if (depth > 0 && Array.isArray(val)) {
							flatDeep(val, depth - 1);
						} else {
							result.push(val);
						}
					});
				};
				flatDeep(array, depth);
				return result;
			}
			function fromEntries(array) {
				const result = {};
				for (let i = 0; i < array.length; i++) {
					const value = array[i];
					result[value[0]] = value[1];
				}
				return result;
			}
			function decode_arithmetic(bytes) {
				let pos = 0;
				function u16() {
					return (bytes[pos++] << 8) | bytes[pos++];
				}
				// decode the frequency table
				let symbol_count = u16();
				let total = 1;
				let acc = [0, 1]; // first symbol has frequency 1
				for (let i = 1; i < symbol_count; i++) {
					acc.push((total += u16()));
				}
				// skip the sized-payload that the last 3 symbols index into
				let skip = u16();
				let pos_payload = pos;
				pos += skip;
				let read_width = 0;
				let read_buffer = 0;
				function read_bit() {
					if (read_width == 0) {
						// this will read beyond end of buffer
						// but (undefined|0) => zero pad
						read_buffer = (read_buffer << 8) | bytes[pos++];
						read_width = 8;
					}
					return (read_buffer >> --read_width) & 1;
				}
				const N = 31;
				const FULL = Math.pow(2, N);
				const HALF = FULL >>> 1;
				const QRTR = HALF >> 1;
				const MASK = FULL - 1;
				// fill register
				let register = 0;
				for (let i = 0; i < N; i++) register = (register << 1) | read_bit();
				let symbols = [];
				let low = 0;
				let range = FULL; // treat like a float
				while (true) {
					let value = Math.floor(((register - low + 1) * total - 1) / range);
					let start = 0;
					let end = symbol_count;
					while (end - start > 1) {
						// binary search
						let mid = (start + end) >>> 1;
						if (value < acc[mid]) {
							end = mid;
						} else {
							start = mid;
						}
					}
					if (start == 0) break; // first symbol is end mark
					symbols.push(start);
					let a = low + Math.floor((range * acc[start]) / total);
					let b = low + Math.floor((range * acc[start + 1]) / total) - 1;
					while (((a ^ b) & HALF) == 0) {
						register = ((register << 1) & MASK) | read_bit();
						a = (a << 1) & MASK;
						b = ((b << 1) & MASK) | 1;
					}
					while (a & ~b & QRTR) {
						register = (register & HALF) | ((register << 1) & (MASK >>> 1)) | read_bit();
						a = (a << 1) ^ HALF;
						b = ((b ^ HALF) << 1) | HALF | 1;
					}
					low = a;
					range = 1 + b - a;
				}
				let offset = symbol_count - 4;
				return symbols.map((x) => {
					switch (x - offset) {
						case 3:
							return (
								offset +
								0x10100 +
								((bytes[pos_payload++] << 16) | (bytes[pos_payload++] << 8) | bytes[pos_payload++])
							);
						case 2:
							return offset + 0x100 + ((bytes[pos_payload++] << 8) | bytes[pos_payload++]);
						case 1:
							return offset + bytes[pos_payload++];
						default:
							return x - 1;
					}
				});
			}
			// returns an iterator which returns the next symbol
			function read_payload(v) {
				let pos = 0;
				return () => v[pos++];
			}
			function read_compressed_payload(bytes) {
				return read_payload(decode_arithmetic(bytes));
			}
			// eg. [0,1,2,3...] => [0,-1,1,-2,...]
			function signed(i) {
				return i & 1 ? ~i >> 1 : i >> 1;
			}
			function read_counts(n, next) {
				let v = Array(n);
				for (let i = 0; i < n; i++) v[i] = 1 + next();
				return v;
			}
			function read_ascending(n, next) {
				let v = Array(n);
				for (let i = 0, x = -1; i < n; i++) v[i] = x += 1 + next();
				return v;
			}
			function read_deltas(n, next) {
				let v = Array(n);
				for (let i = 0, x = 0; i < n; i++) v[i] = x += signed(next());
				return v;
			}
			function read_member_array(next, lookup) {
				let v = read_ascending(next(), next);
				let n = next();
				let vX = read_ascending(n, next);
				let vN = read_counts(n, next);
				for (let i = 0; i < n; i++) {
					for (let j = 0; j < vN[i]; j++) {
						v.push(vX[i] + j);
					}
				}
				return lookup ? v.map((x) => lookup[x]) : v;
			}
			// returns array of
			// [x, ys] => single replacement rule
			// [x, ys, n, dx, dx] => linear map
			function read_mapped_map(next) {
				let ret = [];
				while (true) {
					let w = next();
					if (w == 0) break;
					ret.push(read_linear_table(w, next));
				}
				while (true) {
					let w = next() - 1;
					if (w < 0) break;
					ret.push(read_replacement_table(w, next));
				}
				return fromEntries(flat(ret));
			}
			function read_zero_terminated_array(next) {
				let v = [];
				while (true) {
					let i = next();
					if (i == 0) break;
					v.push(i);
				}
				return v;
			}
			function read_transposed(n, w, next) {
				let m = Array(n)
					.fill(undefined)
					.map(() => []);
				for (let i = 0; i < w; i++) {
					read_deltas(n, next).forEach((x, j) => m[j].push(x));
				}
				return m;
			}
			function read_linear_table(w, next) {
				let dx = 1 + next();
				let dy = next();
				let vN = read_zero_terminated_array(next);
				let m = read_transposed(vN.length, 1 + w, next);
				return flat(
					m.map((v, i) => {
						const x = v[0],
							ys = v.slice(1);
						//let [x, ...ys] = v;
						//return Array(vN[i]).fill().map((_, j) => {
						return Array(vN[i])
							.fill(undefined)
							.map((_, j) => {
								let j_dy = j * dy;
								return [x + j * dx, ys.map((y) => y + j_dy)];
							});
					})
				);
			}
			function read_replacement_table(w, next) {
				let n = 1 + next();
				let m = read_transposed(n, 1 + w, next);
				return m.map((v) => [v[0], v.slice(1)]);
			}
			function read_emoji_trie(next) {
				let sorted = read_member_array(next).sort((a, b) => a - b);
				return read();
				function read() {
					let branches = [];
					while (true) {
						let keys = read_member_array(next, sorted);
						if (keys.length == 0) break;
						branches.push({ set: new Set(keys), node: read() });
					}
					branches.sort((a, b) => b.set.size - a.set.size); // sort by likelihood
					let temp = next();
					let valid = temp % 3;
					temp = (temp / 3) | 0;
					let fe0f = !!(temp & 1);
					temp >>= 1;
					let save = temp == 1;
					let check = temp == 2;
					return { branches, valid, fe0f, save, check };
				}
			} // ../../node_modules/.pnpm/@ethersproject+hash@5.7.0/node_modules/@ethersproject/hash/lib.esm/ens-normalize/include.js
			//# sourceMappingURL=decoder.js.map
			/**
			 * MIT License
			 *
			 * Copyright (c) 2021 Andrew Raffensperger
			 *
			 * Permission is hereby granted, free of charge, to any person obtaining a copy
			 * of this software and associated documentation files (the "Software"), to deal
			 * in the Software without restriction, including without limitation the rights
			 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
			 * copies of the Software, and to permit persons to whom the Software is
			 * furnished to do so, subject to the following conditions:
			 *
			 * The above copyright notice and this permission notice shall be included in all
			 * copies or substantial portions of the Software.
			 *
			 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
			 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
			 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
			 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
			 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
			 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
			 * SOFTWARE.
			 *
			 * This is a near carbon-copy of the original source (link below) with the
			 * TypeScript typings added and a few tweaks to make it ES3-compatible.
			 *
			 * See: https://github.com/adraffy/ens-normalize.js
			 */

			function getData() {
				return read_compressed_payload(
					(0, base64 /* decode */.D)(
						'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'
					)
				);
			} // ../../node_modules/.pnpm/@ethersproject+hash@5.7.0/node_modules/@ethersproject/hash/lib.esm/ens-normalize/lib.js
			//# sourceMappingURL=include.js.map
			/**
			 * MIT License
			 *
			 * Copyright (c) 2021 Andrew Raffensperger
			 *
			 * Permission is hereby granted, free of charge, to any person obtaining a copy
			 * of this software and associated documentation files (the "Software"), to deal
			 * in the Software without restriction, including without limitation the rights
			 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
			 * copies of the Software, and to permit persons to whom the Software is
			 * furnished to do so, subject to the following conditions:
			 *
			 * The above copyright notice and this permission notice shall be included in all
			 * copies or substantial portions of the Software.
			 *
			 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
			 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
			 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
			 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
			 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
			 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
			 * SOFTWARE.
			 *
			 * This is a near carbon-copy of the original source (link below) with the
			 * TypeScript typings added and a few tweaks to make it ES3-compatible.
			 *
			 * See: https://github.com/adraffy/ens-normalize.js
			 */

			const r = getData();

			// @TODO: This should be lazily loaded
			const VALID = new Set(read_member_array(r));
			const IGNORED = new Set(read_member_array(r));
			const MAPPED = read_mapped_map(r);
			const EMOJI_ROOT = read_emoji_trie(r);
			//const NFC_CHECK = new Set(read_member_array(r, Array.from(VALID.values()).sort((a, b) => a - b)));
			//const STOP = 0x2E;
			const HYPHEN = 0x2d;
			const UNDERSCORE = 0x5f;
			function explode_cp(name) {
				return (0, utf8 /* toUtf8CodePoints */.dg)(name);
			}
			function filter_fe0f(cps) {
				return cps.filter((cp) => cp != 0xfe0f);
			}
			function ens_normalize_post_check(name) {
				for (let label of name.split('.')) {
					let cps = explode_cp(label);
					try {
						for (let i = cps.lastIndexOf(UNDERSCORE) - 1; i >= 0; i--) {
							if (cps[i] !== UNDERSCORE) {
								throw new Error(`underscore only allowed at start`);
							}
						}
						if (
							cps.length >= 4 &&
							cps.every((cp) => cp < 0x80) &&
							cps[2] === HYPHEN &&
							cps[3] === HYPHEN
						) {
							throw new Error(`invalid label extension`);
						}
					} catch (err) {
						throw new Error(`Invalid label "${label}": ${err.message}`);
					}
				}
				return name;
			}
			function ens_normalize(name) {
				return ens_normalize_post_check(normalize(name, filter_fe0f));
			}
			function normalize(name, emoji_filter) {
				let input = explode_cp(name).reverse(); // flip for pop
				let output = [];
				while (input.length) {
					let emoji = consume_emoji_reversed(input);
					if (emoji) {
						output.push(...emoji_filter(emoji));
						continue;
					}
					let cp = input.pop();
					if (VALID.has(cp)) {
						output.push(cp);
						continue;
					}
					if (IGNORED.has(cp)) {
						continue;
					}
					let cps = MAPPED[cp];
					if (cps) {
						output.push(...cps);
						continue;
					}
					throw new Error(`Disallowed codepoint: 0x${cp.toString(16).toUpperCase()}`);
				}
				return ens_normalize_post_check(nfc(String.fromCodePoint(...output)));
			}
			function nfc(s) {
				return s.normalize('NFC');
			}
			function consume_emoji_reversed(cps, eaten) {
				var _a;
				let node = EMOJI_ROOT;
				let emoji;
				let saved;
				let stack = [];
				let pos = cps.length;
				if (eaten) eaten.length = 0; // clear input buffer (if needed)
				while (pos) {
					let cp = cps[--pos];
					node =
						(_a = node.branches.find((x) => x.set.has(cp))) === null || _a === void 0
							? void 0
							: _a.node;
					if (!node) break;
					if (node.save) {
						// remember
						saved = cp;
					} else if (node.check) {
						// check exclusion
						if (cp === saved) break;
					}
					stack.push(cp);
					if (node.fe0f) {
						stack.push(0xfe0f);
						if (pos > 0 && cps[pos - 1] == 0xfe0f) pos--; // consume optional FE0F
					}
					if (node.valid) {
						// this is a valid emoji (so far)
						emoji = stack.slice(); // copy stack
						if (node.valid == 2) emoji.splice(1, 1); // delete FE0F at position 1 (RGI ZWJ don't follow spec!)
						if (eaten) eaten.push(...cps.slice(pos).reverse()); // copy input (if needed)
						cps.length = pos; // truncate
					}
				}
				return emoji;
			} // ../../node_modules/.pnpm/@ethersproject+hash@5.7.0/node_modules/@ethersproject/hash/lib.esm/namehash.js
			//# sourceMappingURL=lib.js.map
			const logger = new logger_lib_esm /* Logger */.Vy(lib_esm_version /* version */.r);

			const Zeros = new Uint8Array(32);
			Zeros.fill(0);
			function checkComponent(comp) {
				if (comp.length === 0) {
					throw new Error('invalid ENS name; empty component');
				}
				return comp;
			}
			function ensNameSplit(name) {
				const bytes = (0, utf8 /* toUtf8Bytes */.YW)(ens_normalize(name));
				const comps = [];
				if (name.length === 0) {
					return comps;
				}
				let last = 0;
				for (let i = 0; i < bytes.length; i++) {
					const d = bytes[i];
					// A separator (i.e. "."); copy this component
					if (d === 0x2e) {
						comps.push(checkComponent(bytes.slice(last, i)));
						last = i + 1;
					}
				}
				// There was a stray separator at the end of the name
				if (last >= bytes.length) {
					throw new Error('invalid ENS name; empty component');
				}
				comps.push(checkComponent(bytes.slice(last)));
				return comps;
			}
			function ensNormalize(name) {
				return ensNameSplit(name)
					.map((comp) => toUtf8String(comp))
					.join('.');
			}
			function isValidName(name) {
				try {
					return ensNameSplit(name).length !== 0;
				} catch (error) {}
				return false;
			}
			function namehash(name) {
				/* istanbul ignore if */
				if (typeof name !== 'string') {
					logger.throwArgumentError('invalid ENS name; not a string', 'name', name);
				}
				let result = Zeros;
				const comps = ensNameSplit(name);
				while (comps.length) {
					result = (0, keccak256_lib_esm /* keccak256 */.S)(
						(0, bytes_lib_esm /* concat */.xW)([
							result,
							(0, keccak256_lib_esm /* keccak256 */.S)(comps.pop())
						])
					);
				}
				return (0, bytes_lib_esm /* hexlify */.c$)(result);
			}
			function dnsEncode(name) {
				return (
					(0, bytes_lib_esm /* hexlify */.c$)(
						(0, bytes_lib_esm /* concat */.xW)(
							ensNameSplit(name).map((comp) => {
								// DNS does not allow components over 63 bytes in length
								if (comp.length > 63) {
									throw new Error('invalid DNS encoded entry; length exceeds 63 bytes');
								}
								const bytes = new Uint8Array(comp.length + 1);
								bytes.set(comp, 1);
								bytes[0] = bytes.length - 1;
								return bytes;
							})
						)
					) + '00'
				);
			}
			//# sourceMappingURL=namehash.js.map
			// EXTERNAL MODULE: ../../node_modules/.pnpm/@ethersproject+networks@5.7.1/node_modules/@ethersproject/networks/lib.esm/index.js + 1 modules
			var networks_lib_esm = __webpack_require__(9187);
			// EXTERNAL MODULE: ../../node_modules/.pnpm/@ethersproject+sha2@5.7.0/node_modules/@ethersproject/sha2/lib.esm/sha2.js + 1 modules
			var sha2 = __webpack_require__(985);
			// EXTERNAL MODULE: ../../node_modules/.pnpm/bech32@1.1.4/node_modules/bech32/index.js
			var bech32 = __webpack_require__(5994);
			var bech32_default = /*#__PURE__*/ __webpack_require__.n(bech32);
			// EXTERNAL MODULE: ../../node_modules/.pnpm/@ethersproject+address@5.7.0/node_modules/@ethersproject/address/lib.esm/index.js + 1 modules
			var address_lib_esm = __webpack_require__(716); // ../../node_modules/.pnpm/@ethersproject+constants@5.7.0/node_modules/@ethersproject/constants/lib.esm/addresses.js
			const AddressZero = '0x0000000000000000000000000000000000000000'; // ../../node_modules/.pnpm/@ethersproject+providers@5.7.2_bufferutil@4.0.8_utf-8-validate@5.0.10/node_modules/@ethersproject/providers/lib.esm/formatter.js
			//# sourceMappingURL=addresses.js.map
			const formatter_logger = new logger_lib_esm /* Logger */.Vy(_version /* version */.r);
			class Formatter {
				constructor() {
					this.formats = this.getDefaultFormats();
				}
				getDefaultFormats() {
					const formats = {};
					const address = this.address.bind(this);
					const bigNumber = this.bigNumber.bind(this);
					const blockTag = this.blockTag.bind(this);
					const data = this.data.bind(this);
					const hash = this.hash.bind(this);
					const hex = this.hex.bind(this);
					const number = this.number.bind(this);
					const type = this.type.bind(this);
					const strictData = (v) => {
						return this.data(v, true);
					};
					formats.transaction = {
						hash: hash,
						type: type,
						accessList: Formatter.allowNull(this.accessList.bind(this), null),
						blockHash: Formatter.allowNull(hash, null),
						blockNumber: Formatter.allowNull(number, null),
						transactionIndex: Formatter.allowNull(number, null),
						confirmations: Formatter.allowNull(number, null),
						from: address,
						// either (gasPrice) or (maxPriorityFeePerGas + maxFeePerGas)
						// must be set
						gasPrice: Formatter.allowNull(bigNumber),
						maxPriorityFeePerGas: Formatter.allowNull(bigNumber),
						maxFeePerGas: Formatter.allowNull(bigNumber),
						gasLimit: bigNumber,
						to: Formatter.allowNull(address, null),
						value: bigNumber,
						nonce: number,
						data: data,
						r: Formatter.allowNull(this.uint256),
						s: Formatter.allowNull(this.uint256),
						v: Formatter.allowNull(number),
						creates: Formatter.allowNull(address, null),
						raw: Formatter.allowNull(data)
					};
					formats.transactionRequest = {
						from: Formatter.allowNull(address),
						nonce: Formatter.allowNull(number),
						gasLimit: Formatter.allowNull(bigNumber),
						gasPrice: Formatter.allowNull(bigNumber),
						maxPriorityFeePerGas: Formatter.allowNull(bigNumber),
						maxFeePerGas: Formatter.allowNull(bigNumber),
						to: Formatter.allowNull(address),
						value: Formatter.allowNull(bigNumber),
						data: Formatter.allowNull(strictData),
						type: Formatter.allowNull(number),
						accessList: Formatter.allowNull(this.accessList.bind(this), null)
					};
					formats.receiptLog = {
						transactionIndex: number,
						blockNumber: number,
						transactionHash: hash,
						address: address,
						topics: Formatter.arrayOf(hash),
						data: data,
						logIndex: number,
						blockHash: hash
					};
					formats.receipt = {
						to: Formatter.allowNull(this.address, null),
						from: Formatter.allowNull(this.address, null),
						contractAddress: Formatter.allowNull(address, null),
						transactionIndex: number,
						// should be allowNull(hash), but broken-EIP-658 support is handled in receipt
						root: Formatter.allowNull(hex),
						gasUsed: bigNumber,
						logsBloom: Formatter.allowNull(data),
						blockHash: hash,
						transactionHash: hash,
						logs: Formatter.arrayOf(this.receiptLog.bind(this)),
						blockNumber: number,
						confirmations: Formatter.allowNull(number, null),
						cumulativeGasUsed: bigNumber,
						effectiveGasPrice: Formatter.allowNull(bigNumber),
						status: Formatter.allowNull(number),
						type: type
					};
					formats.block = {
						hash: Formatter.allowNull(hash),
						parentHash: hash,
						number: number,
						timestamp: number,
						nonce: Formatter.allowNull(hex),
						difficulty: this.difficulty.bind(this),
						gasLimit: bigNumber,
						gasUsed: bigNumber,
						miner: Formatter.allowNull(address),
						extraData: data,
						transactions: Formatter.allowNull(Formatter.arrayOf(hash)),
						baseFeePerGas: Formatter.allowNull(bigNumber)
					};
					formats.blockWithTransactions = (0, properties_lib_esm /* shallowCopy */.Ic)(
						formats.block
					);
					formats.blockWithTransactions.transactions = Formatter.allowNull(
						Formatter.arrayOf(this.transactionResponse.bind(this))
					);
					formats.filter = {
						fromBlock: Formatter.allowNull(blockTag, undefined),
						toBlock: Formatter.allowNull(blockTag, undefined),
						blockHash: Formatter.allowNull(hash, undefined),
						address: Formatter.allowNull(address, undefined),
						topics: Formatter.allowNull(this.topics.bind(this), undefined)
					};
					formats.filterLog = {
						blockNumber: Formatter.allowNull(number),
						blockHash: Formatter.allowNull(hash),
						transactionIndex: number,
						removed: Formatter.allowNull(this.boolean.bind(this)),
						address: address,
						data: Formatter.allowFalsish(data, '0x'),
						topics: Formatter.arrayOf(hash),
						transactionHash: hash,
						logIndex: number
					};
					return formats;
				}
				accessList(accessList) {
					return (0, transactions_lib_esm /* accessListify */.$2)(accessList || []);
				}
				// Requires a BigNumberish that is within the IEEE754 safe integer range; returns a number
				// Strict! Used on input.
				number(number) {
					if (number === '0x') {
						return 0;
					}
					return bignumber /* BigNumber */.gH
						.from(number)
						.toNumber();
				}
				type(number) {
					if (number === '0x' || number == null) {
						return 0;
					}
					return bignumber /* BigNumber */.gH
						.from(number)
						.toNumber();
				}
				// Strict! Used on input.
				bigNumber(value) {
					return bignumber /* BigNumber */.gH
						.from(value);
				}
				// Requires a boolean, "true" or  "false"; returns a boolean
				boolean(value) {
					if (typeof value === 'boolean') {
						return value;
					}
					if (typeof value === 'string') {
						value = value.toLowerCase();
						if (value === 'true') {
							return true;
						}
						if (value === 'false') {
							return false;
						}
					}
					throw new Error('invalid boolean - ' + value);
				}
				hex(value, strict) {
					if (typeof value === 'string') {
						if (!strict && value.substring(0, 2) !== '0x') {
							value = '0x' + value;
						}
						if ((0, bytes_lib_esm /* isHexString */.Lo)(value)) {
							return value.toLowerCase();
						}
					}
					return formatter_logger.throwArgumentError('invalid hash', 'value', value);
				}
				data(value, strict) {
					const result = this.hex(value, strict);
					if (result.length % 2 !== 0) {
						throw new Error('invalid data; odd-length - ' + value);
					}
					return result;
				}
				// Requires an address
				// Strict! Used on input.
				address(value) {
					return (0, address_lib_esm /* getAddress */.bv)(value);
				}
				callAddress(value) {
					if (!(0, bytes_lib_esm /* isHexString */.Lo)(value, 32)) {
						return null;
					}
					const address = (0, address_lib_esm /* getAddress */.bv)(
						(0, bytes_lib_esm /* hexDataSlice */.Ab)(value, 12)
					);
					return address === AddressZero ? null : address;
				}
				contractAddress(value) {
					return (0, address_lib_esm /* getContractAddress */.RZ)(value);
				}
				// Strict! Used on input.
				blockTag(blockTag) {
					if (blockTag == null) {
						return 'latest';
					}
					if (blockTag === 'earliest') {
						return '0x0';
					}
					switch (blockTag) {
						case 'earliest':
							return '0x0';
						case 'latest':
						case 'pending':
						case 'safe':
						case 'finalized':
							return blockTag;
					}
					if (typeof blockTag === 'number' || (0, bytes_lib_esm /* isHexString */.Lo)(blockTag)) {
						return (0, bytes_lib_esm /* hexValue */.Fh)(blockTag);
					}
					throw new Error('invalid blockTag');
				}
				// Requires a hash, optionally requires 0x prefix; returns prefixed lowercase hash.
				hash(value, strict) {
					const result = this.hex(value, strict);
					if ((0, bytes_lib_esm /* hexDataLength */.cm)(result) !== 32) {
						return formatter_logger.throwArgumentError('invalid hash', 'value', value);
					}
					return result;
				}
				// Returns the difficulty as a number, or if too large (i.e. PoA network) null
				difficulty(value) {
					if (value == null) {
						return null;
					}
					const v = bignumber /* BigNumber */.gH
						.from(value);
					try {
						return v.toNumber();
					} catch (error) {}
					return null;
				}
				uint256(value) {
					if (!(0, bytes_lib_esm /* isHexString */.Lo)(value)) {
						throw new Error('invalid uint256');
					}
					return (0, bytes_lib_esm /* hexZeroPad */.bj)(value, 32);
				}
				_block(value, format) {
					if (value.author != null && value.miner == null) {
						value.miner = value.author;
					}
					// The difficulty may need to come from _difficulty in recursed blocks
					const difficulty = value._difficulty != null ? value._difficulty : value.difficulty;
					const result = Formatter.check(format, value);
					result._difficulty =
						difficulty == null
							? null
							: bignumber /* BigNumber */.gH
									.from(difficulty);
					return result;
				}
				block(value) {
					return this._block(value, this.formats.block);
				}
				blockWithTransactions(value) {
					return this._block(value, this.formats.blockWithTransactions);
				}
				// Strict! Used on input.
				transactionRequest(value) {
					return Formatter.check(this.formats.transactionRequest, value);
				}
				transactionResponse(transaction) {
					// Rename gas to gasLimit
					if (transaction.gas != null && transaction.gasLimit == null) {
						transaction.gasLimit = transaction.gas;
					}
					// Some clients (TestRPC) do strange things like return 0x0 for the
					// 0 address; correct this to be a real address
					if (
						transaction.to &&
						bignumber /* BigNumber */.gH
							.from(transaction.to)
							.isZero()
					) {
						transaction.to = '0x0000000000000000000000000000000000000000';
					}
					// Rename input to data
					if (transaction.input != null && transaction.data == null) {
						transaction.data = transaction.input;
					}
					// If to and creates are empty, populate the creates from the transaction
					if (transaction.to == null && transaction.creates == null) {
						transaction.creates = this.contractAddress(transaction);
					}
					if (
						(transaction.type === 1 || transaction.type === 2) &&
						transaction.accessList == null
					) {
						transaction.accessList = [];
					}
					const result = Formatter.check(this.formats.transaction, transaction);
					if (transaction.chainId != null) {
						let chainId = transaction.chainId;
						if ((0, bytes_lib_esm /* isHexString */.Lo)(chainId)) {
							chainId = bignumber /* BigNumber */.gH
								.from(chainId)
								.toNumber();
						}
						result.chainId = chainId;
					} else {
						let chainId = transaction.networkId;
						// geth-etc returns chainId
						if (chainId == null && result.v == null) {
							chainId = transaction.chainId;
						}
						if ((0, bytes_lib_esm /* isHexString */.Lo)(chainId)) {
							chainId = bignumber /* BigNumber */.gH
								.from(chainId)
								.toNumber();
						}
						if (typeof chainId !== 'number' && result.v != null) {
							chainId = (result.v - 35) / 2;
							if (chainId < 0) {
								chainId = 0;
							}
							chainId = parseInt(chainId);
						}
						if (typeof chainId !== 'number') {
							chainId = 0;
						}
						result.chainId = chainId;
					}
					// 0x0000... should actually be null
					if (result.blockHash && result.blockHash.replace(/0/g, '') === 'x') {
						result.blockHash = null;
					}
					return result;
				}
				transaction(value) {
					return (0, transactions_lib_esm /* parse */.qg)(value);
				}
				receiptLog(value) {
					return Formatter.check(this.formats.receiptLog, value);
				}
				receipt(value) {
					const result = Formatter.check(this.formats.receipt, value);
					// RSK incorrectly implemented EIP-658, so we munge things a bit here for it
					if (result.root != null) {
						if (result.root.length <= 4) {
							// Could be 0x00, 0x0, 0x01 or 0x1
							const value = bignumber /* BigNumber */.gH
								.from(result.root)
								.toNumber();
							if (value === 0 || value === 1) {
								// Make sure if both are specified, they match
								if (result.status != null && result.status !== value) {
									formatter_logger.throwArgumentError('alt-root-status/status mismatch', 'value', {
										root: result.root,
										status: result.status
									});
								}
								result.status = value;
								delete result.root;
							} else {
								formatter_logger.throwArgumentError(
									'invalid alt-root-status',
									'value.root',
									result.root
								);
							}
						} else if (result.root.length !== 66) {
							// Must be a valid bytes32
							formatter_logger.throwArgumentError('invalid root hash', 'value.root', result.root);
						}
					}
					if (result.status != null) {
						result.byzantium = true;
					}
					return result;
				}
				topics(value) {
					if (Array.isArray(value)) {
						return value.map((v) => this.topics(v));
					} else if (value != null) {
						return this.hash(value, true);
					}
					return null;
				}
				filter(value) {
					return Formatter.check(this.formats.filter, value);
				}
				filterLog(value) {
					return Formatter.check(this.formats.filterLog, value);
				}
				static check(format, object) {
					const result = {};
					for (const key in format) {
						try {
							const value = format[key](object[key]);
							if (value !== undefined) {
								result[key] = value;
							}
						} catch (error) {
							error.checkKey = key;
							error.checkValue = object[key];
							throw error;
						}
					}
					return result;
				}
				// if value is null-ish, nullValue is returned
				static allowNull(format, nullValue) {
					return function (value) {
						if (value == null) {
							return nullValue;
						}
						return format(value);
					};
				}
				// If value is false-ish, replaceValue is returned
				static allowFalsish(format, replaceValue) {
					return function (value) {
						if (!value) {
							return replaceValue;
						}
						return format(value);
					};
				}
				// Requires an Array satisfying check
				static arrayOf(format) {
					return function (array) {
						if (!Array.isArray(array)) {
							throw new Error('not an array');
						}
						const result = [];
						array.forEach(function (value) {
							result.push(format(value));
						});
						return result;
					};
				}
			}
			function isCommunityResourcable(value) {
				return value && typeof value.isCommunityResource === 'function';
			}
			function isCommunityResource(value) {
				return isCommunityResourcable(value) && value.isCommunityResource();
			}
			// Show the throttle message only once
			let throttleMessage = false;
			function showThrottleMessage() {
				if (throttleMessage) {
					return;
				}
				throttleMessage = true;
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
				console.log('For more details: https:/\/docs.ethers.io/api-keys/');
				console.log('==========================');
			} // ../../node_modules/.pnpm/@ethersproject+providers@5.7.2_bufferutil@4.0.8_utf-8-validate@5.0.10/node_modules/@ethersproject/providers/lib.esm/base-provider.js
			//# sourceMappingURL=formatter.js.map
			var __awaiter =
				(undefined && undefined.__awaiter) ||
				function (thisArg, _arguments, P, generator) {
					function adopt(value) {
						return value instanceof P
							? value
							: new P(function (resolve) {
									resolve(value);
								});
					}
					return new (P || (P = Promise))(function (resolve, reject) {
						function fulfilled(value) {
							try {
								step(generator.next(value));
							} catch (e) {
								reject(e);
							}
						}
						function rejected(value) {
							try {
								step(generator['throw'](value));
							} catch (e) {
								reject(e);
							}
						}
						function step(result) {
							result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
						}
						step((generator = generator.apply(thisArg, _arguments || [])).next());
					});
				};

			const base_provider_logger = new logger_lib_esm /* Logger */.Vy(_version /* version */.r);

			const MAX_CCIP_REDIRECTS = 10;
			//////////////////////////////
			// Event Serializeing
			function checkTopic(topic) {
				if (topic == null) {
					return 'null';
				}
				if ((0, bytes_lib_esm /* hexDataLength */.cm)(topic) !== 32) {
					base_provider_logger.throwArgumentError('invalid topic', 'topic', topic);
				}
				return topic.toLowerCase();
			}
			function serializeTopics(topics) {
				// Remove trailing null AND-topics; they are redundant
				topics = topics.slice();
				while (topics.length > 0 && topics[topics.length - 1] == null) {
					topics.pop();
				}
				return topics
					.map((topic) => {
						if (Array.isArray(topic)) {
							// Only track unique OR-topics
							const unique = {};
							topic.forEach((topic) => {
								unique[checkTopic(topic)] = true;
							});
							// The order of OR-topics does not matter
							const sorted = Object.keys(unique);
							sorted.sort();
							return sorted.join('|');
						} else {
							return checkTopic(topic);
						}
					})
					.join('&');
			}
			function deserializeTopics(data) {
				if (data === '') {
					return [];
				}
				return data.split(/&/g).map((topic) => {
					if (topic === '') {
						return [];
					}
					const comps = topic.split('|').map((topic) => {
						return topic === 'null' ? null : topic;
					});
					return comps.length === 1 ? comps[0] : comps;
				});
			}
			function getEventTag(eventName) {
				if (typeof eventName === 'string') {
					eventName = eventName.toLowerCase();
					if ((0, bytes_lib_esm /* hexDataLength */.cm)(eventName) === 32) {
						return 'tx:' + eventName;
					}
					if (eventName.indexOf(':') === -1) {
						return eventName;
					}
				} else if (Array.isArray(eventName)) {
					return 'filter:*:' + serializeTopics(eventName);
				} else if (abstract_provider_lib_esm /* ForkEvent */.Rj.isForkEvent(eventName)) {
					base_provider_logger.warn('not implemented');
					throw new Error('not implemented');
				} else if (eventName && typeof eventName === 'object') {
					return (
						'filter:' + (eventName.address || '*') + ':' + serializeTopics(eventName.topics || [])
					);
				}
				throw new Error('invalid event - ' + eventName);
			}
			//////////////////////////////
			// Helper Object
			function getTime() {
				return new Date().getTime();
			}
			function stall(duration) {
				return new Promise((resolve) => {
					setTimeout(resolve, duration);
				});
			}
			//////////////////////////////
			// Provider Object
			/**
			 *  EventType
			 *   - "block"
			 *   - "poll"
			 *   - "didPoll"
			 *   - "pending"
			 *   - "error"
			 *   - "network"
			 *   - filter
			 *   - topics array
			 *   - transaction hash
			 */
			const PollableEvents = ['block', 'network', 'pending', 'poll'];
			class Event {
				constructor(tag, listener, once) {
					(0, properties_lib_esm /* defineReadOnly */.yY)(this, 'tag', tag);
					(0, properties_lib_esm /* defineReadOnly */.yY)(this, 'listener', listener);
					(0, properties_lib_esm /* defineReadOnly */.yY)(this, 'once', once);
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
					const comps = this.tag.split(':');
					if (comps[0] !== 'tx') {
						return null;
					}
					return comps[1];
				}
				get filter() {
					const comps = this.tag.split(':');
					if (comps[0] !== 'filter') {
						return null;
					}
					const address = comps[1];
					const topics = deserializeTopics(comps[2]);
					const filter = {};
					if (topics.length > 0) {
						filter.topics = topics;
					}
					if (address && address !== '*') {
						filter.address = address;
					}
					return filter;
				}
				pollable() {
					return this.tag.indexOf(':') >= 0 || PollableEvents.indexOf(this.tag) >= 0;
				}
			}
			// https://github.com/satoshilabs/slips/blob/master/slip-0044.md
			const coinInfos = {
				0: { symbol: 'btc', p2pkh: 0x00, p2sh: 0x05, prefix: 'bc' },
				2: { symbol: 'ltc', p2pkh: 0x30, p2sh: 0x32, prefix: 'ltc' },
				3: { symbol: 'doge', p2pkh: 0x1e, p2sh: 0x16 },
				60: { symbol: 'eth', ilk: 'eth' },
				61: { symbol: 'etc', ilk: 'eth' },
				700: { symbol: 'xdai', ilk: 'eth' }
			};
			function bytes32ify(value) {
				return (0, bytes_lib_esm /* hexZeroPad */.bj)(
					bignumber /* BigNumber */.gH
						.from(value)
						.toHexString(),
					32
				);
			}
			// Compute the Base58Check encoded data (checksum is first 4 bytes of sha256d)
			function base58Encode(data) {
				return basex_lib_esm /* Base58 */.zn
					.encode(
						(0, bytes_lib_esm /* concat */.xW)([
							data,
							(0, bytes_lib_esm /* hexDataSlice */.Ab)(
								(0, sha2 /* sha256 */.sc)((0, sha2 /* sha256 */.sc)(data)),
								0,
								4
							)
						])
					);
			}
			const matcherIpfs = new RegExp('^(ipfs):/\/(.*)$', 'i');
			const matchers = [
				new RegExp('^(https):/\/(.*)$', 'i'),
				new RegExp('^(data):(.*)$', 'i'),
				matcherIpfs,
				new RegExp('^eip155:[0-9]+/(erc[0-9]+):(.*)$', 'i')
			];
			function _parseString(result, start) {
				try {
					return (0, utf8 /* toUtf8String */._v)(_parseBytes(result, start));
				} catch (error) {}
				return null;
			}
			function _parseBytes(result, start) {
				if (result === '0x') {
					return null;
				}
				const offset = bignumber /* BigNumber */.gH
					.from((0, bytes_lib_esm /* hexDataSlice */.Ab)(result, start, start + 32))
					.toNumber();
				const length = bignumber /* BigNumber */.gH
					.from((0, bytes_lib_esm /* hexDataSlice */.Ab)(result, offset, offset + 32))
					.toNumber();
				return (0, bytes_lib_esm /* hexDataSlice */.Ab)(result, offset + 32, offset + 32 + length);
			}
			// Trim off the ipfs:// prefix and return the default gateway URL
			function getIpfsLink(link) {
				if (link.match(/^ipfs:\/\/ipfs\//i)) {
					link = link.substring(12);
				} else if (link.match(/^ipfs:\/\//i)) {
					link = link.substring(7);
				} else {
					base_provider_logger.throwArgumentError('unsupported IPFS format', 'link', link);
				}
				return `https:/\/gateway.ipfs.io/ipfs/${link}`;
			}
			function numPad(value) {
				const result = (0, bytes_lib_esm /* arrayify */.k9)(value);
				if (result.length > 32) {
					throw new Error('internal; should not happen');
				}
				const padded = new Uint8Array(32);
				padded.set(result, 32 - result.length);
				return padded;
			}
			function bytesPad(value) {
				if (value.length % 32 === 0) {
					return value;
				}
				const result = new Uint8Array(Math.ceil(value.length / 32) * 32);
				result.set(value);
				return result;
			}
			// ABI Encodes a series of (bytes, bytes, ...)
			function encodeBytes(datas) {
				const result = [];
				let byteCount = 0;
				// Add place-holders for pointers as we add items
				for (let i = 0; i < datas.length; i++) {
					result.push(null);
					byteCount += 32;
				}
				for (let i = 0; i < datas.length; i++) {
					const data = (0, bytes_lib_esm /* arrayify */.k9)(datas[i]);
					// Update the bytes offset
					result[i] = numPad(byteCount);
					// The length and padded value of data
					result.push(numPad(data.length));
					result.push(bytesPad(data));
					byteCount += 32 + Math.ceil(data.length / 32) * 32;
				}
				return (0, bytes_lib_esm /* hexConcat */.qn)(result);
			}
			class Resolver {
				// The resolvedAddress is only for creating a ReverseLookup resolver
				constructor(provider, address, name, resolvedAddress) {
					(0, properties_lib_esm /* defineReadOnly */.yY)(this, 'provider', provider);
					(0, properties_lib_esm /* defineReadOnly */.yY)(this, 'name', name);
					(0, properties_lib_esm /* defineReadOnly */.yY)(
						this,
						'address',
						provider.formatter.address(address)
					);
					(0, properties_lib_esm /* defineReadOnly */.yY)(
						this,
						'_resolvedAddress',
						resolvedAddress
					);
				}
				supportsWildcard() {
					if (!this._supportsEip2544) {
						// supportsInterface(bytes4 = selector("resolve(bytes,bytes)"))
						this._supportsEip2544 = this.provider
							.call({
								to: this.address,
								data: '0x01ffc9a79061b92300000000000000000000000000000000000000000000000000000000'
							})
							.then((result) => {
								return bignumber /* BigNumber */.gH
									.from(result)
									.eq(1);
							})
							.catch((error) => {
								if (error.code === logger_lib_esm /* Logger */.Vy.errors.CALL_EXCEPTION) {
									return false;
								}
								// Rethrow the error: link is down, etc. Let future attempts retry.
								this._supportsEip2544 = null;
								throw error;
							});
					}
					return this._supportsEip2544;
				}
				_fetch(selector, parameters) {
					return __awaiter(this, void 0, void 0, function* () {
						// e.g. keccak256("addr(bytes32,uint256)")
						const tx = {
							to: this.address,
							ccipReadEnabled: true,
							data: (0, bytes_lib_esm /* hexConcat */.qn)([
								selector,
								namehash(this.name),
								parameters || '0x'
							])
						};
						// Wildcard support; use EIP-2544 to resolve the request
						let parseBytes = false;
						if (yield this.supportsWildcard()) {
							parseBytes = true;
							// selector("resolve(bytes,bytes)")
							tx.data = (0, bytes_lib_esm /* hexConcat */.qn)([
								'0x9061b923',
								encodeBytes([dnsEncode(this.name), tx.data])
							]);
						}
						try {
							let result = yield this.provider.call(tx);
							if ((0, bytes_lib_esm /* arrayify */.k9)(result).length % 32 === 4) {
								base_provider_logger.throwError(
									'resolver threw error',
									logger_lib_esm /* Logger */.Vy.errors.CALL_EXCEPTION,
									{
										transaction: tx,
										data: result
									}
								);
							}
							if (parseBytes) {
								result = _parseBytes(result, 0);
							}
							return result;
						} catch (error) {
							if (error.code === logger_lib_esm /* Logger */.Vy.errors.CALL_EXCEPTION) {
								return null;
							}
							throw error;
						}
					});
				}
				_fetchBytes(selector, parameters) {
					return __awaiter(this, void 0, void 0, function* () {
						const result = yield this._fetch(selector, parameters);
						if (result != null) {
							return _parseBytes(result, 0);
						}
						return null;
					});
				}
				_getAddress(coinType, hexBytes) {
					const coinInfo = coinInfos[String(coinType)];
					if (coinInfo == null) {
						base_provider_logger.throwError(
							`unsupported coin type: ${coinType}`,
							logger_lib_esm /* Logger */.Vy.errors.UNSUPPORTED_OPERATION,
							{
								operation: `getAddress(${coinType})`
							}
						);
					}
					if (coinInfo.ilk === 'eth') {
						return this.provider.formatter.address(hexBytes);
					}
					const bytes = (0, bytes_lib_esm /* arrayify */.k9)(hexBytes);
					// P2PKH: OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG
					if (coinInfo.p2pkh != null) {
						const p2pkh = hexBytes.match(/^0x76a9([0-9a-f][0-9a-f])([0-9a-f]*)88ac$/);
						if (p2pkh) {
							const length = parseInt(p2pkh[1], 16);
							if (p2pkh[2].length === length * 2 && length >= 1 && length <= 75) {
								return base58Encode(
									(0, bytes_lib_esm /* concat */.xW)([[coinInfo.p2pkh], '0x' + p2pkh[2]])
								);
							}
						}
					}
					// P2SH: OP_HASH160 <scriptHash> OP_EQUAL
					if (coinInfo.p2sh != null) {
						const p2sh = hexBytes.match(/^0xa9([0-9a-f][0-9a-f])([0-9a-f]*)87$/);
						if (p2sh) {
							const length = parseInt(p2sh[1], 16);
							if (p2sh[2].length === length * 2 && length >= 1 && length <= 75) {
								return base58Encode(
									(0, bytes_lib_esm /* concat */.xW)([[coinInfo.p2sh], '0x' + p2sh[2]])
								);
							}
						}
					}
					// Bech32
					if (coinInfo.prefix != null) {
						const length = bytes[1];
						// https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki#witness-program
						let version = bytes[0];
						if (version === 0x00) {
							if (length !== 20 && length !== 32) {
								version = -1;
							}
						} else {
							version = -1;
						}
						if (version >= 0 && bytes.length === 2 + length && length >= 1 && length <= 75) {
							const words = bech32_default().toWords(bytes.slice(2));
							words.unshift(version);
							return bech32_default().encode(coinInfo.prefix, words);
						}
					}
					return null;
				}
				getAddress(coinType) {
					return __awaiter(this, void 0, void 0, function* () {
						if (coinType == null) {
							coinType = 60;
						}
						// If Ethereum, use the standard `addr(bytes32)`
						if (coinType === 60) {
							try {
								// keccak256("addr(bytes32)")
								const result = yield this._fetch('0x3b3b57de');
								// No address
								if (result === '0x' || result === HashZero) {
									return null;
								}
								return this.provider.formatter.callAddress(result);
							} catch (error) {
								if (error.code === logger_lib_esm /* Logger */.Vy.errors.CALL_EXCEPTION) {
									return null;
								}
								throw error;
							}
						}
						// keccak256("addr(bytes32,uint256")
						const hexBytes = yield this._fetchBytes('0xf1cb7e06', bytes32ify(coinType));
						// No address
						if (hexBytes == null || hexBytes === '0x') {
							return null;
						}
						// Compute the address
						const address = this._getAddress(coinType, hexBytes);
						if (address == null) {
							base_provider_logger.throwError(
								`invalid or unsupported coin data`,
								logger_lib_esm /* Logger */.Vy.errors.UNSUPPORTED_OPERATION,
								{
									operation: `getAddress(${coinType})`,
									coinType: coinType,
									data: hexBytes
								}
							);
						}
						return address;
					});
				}
				getAvatar() {
					return __awaiter(this, void 0, void 0, function* () {
						const linkage = [{ type: 'name', content: this.name }];
						try {
							// test data for ricmoo.eth
							//const avatar = "eip155:1/erc721:0x265385c7f4132228A0d54EB1A9e7460b91c0cC68/29233";
							const avatar = yield this.getText('avatar');
							if (avatar == null) {
								return null;
							}
							for (let i = 0; i < matchers.length; i++) {
								const match = avatar.match(matchers[i]);
								if (match == null) {
									continue;
								}
								const scheme = match[1].toLowerCase();
								switch (scheme) {
									case 'https':
										linkage.push({ type: 'url', content: avatar });
										return { linkage, url: avatar };
									case 'data':
										linkage.push({ type: 'data', content: avatar });
										return { linkage, url: avatar };
									case 'ipfs':
										linkage.push({ type: 'ipfs', content: avatar });
										return { linkage, url: getIpfsLink(avatar) };
									case 'erc721':
									case 'erc1155': {
										// Depending on the ERC type, use tokenURI(uint256) or url(uint256)
										const selector = scheme === 'erc721' ? '0xc87b56dd' : '0x0e89341c';
										linkage.push({ type: scheme, content: avatar });
										// The owner of this name
										const owner = this._resolvedAddress || (yield this.getAddress());
										const comps = (match[2] || '').split('/');
										if (comps.length !== 2) {
											return null;
										}
										const addr = yield this.provider.formatter.address(comps[0]);
										const tokenId = (0, bytes_lib_esm /* hexZeroPad */.bj)(
											bignumber /* BigNumber */.gH
												.from(comps[1])
												.toHexString(),
											32
										);
										// Check that this account owns the token
										if (scheme === 'erc721') {
											// ownerOf(uint256 tokenId)
											const tokenOwner = this.provider.formatter.callAddress(
												yield this.provider.call({
													to: addr,
													data: (0, bytes_lib_esm /* hexConcat */.qn)(['0x6352211e', tokenId])
												})
											);
											if (owner !== tokenOwner) {
												return null;
											}
											linkage.push({ type: 'owner', content: tokenOwner });
										} else if (scheme === 'erc1155') {
											// balanceOf(address owner, uint256 tokenId)
											const balance = bignumber /* BigNumber */.gH
												.from(
													yield this.provider.call({
														to: addr,
														data: (0, bytes_lib_esm /* hexConcat */.qn)([
															'0x00fdd58e',
															(0, bytes_lib_esm /* hexZeroPad */.bj)(owner, 32),
															tokenId
														])
													})
												);
											if (balance.isZero()) {
												return null;
											}
											linkage.push({ type: 'balance', content: balance.toString() });
										}
										// Call the token contract for the metadata URL
										const tx = {
											to: this.provider.formatter.address(comps[0]),
											data: (0, bytes_lib_esm /* hexConcat */.qn)([selector, tokenId])
										};
										let metadataUrl = _parseString(yield this.provider.call(tx), 0);
										if (metadataUrl == null) {
											return null;
										}
										linkage.push({ type: 'metadata-url-base', content: metadataUrl });
										// ERC-1155 allows a generic {id} in the URL
										if (scheme === 'erc1155') {
											metadataUrl = metadataUrl.replace('{id}', tokenId.substring(2));
											linkage.push({ type: 'metadata-url-expanded', content: metadataUrl });
										}
										// Transform IPFS metadata links
										if (metadataUrl.match(/^ipfs:/i)) {
											metadataUrl = getIpfsLink(metadataUrl);
										}
										linkage.push({ type: 'metadata-url', content: metadataUrl });
										// Get the token metadata
										const metadata = yield (0, web_lib_esm /* fetchJson */.x6)(metadataUrl);
										if (!metadata) {
											return null;
										}
										linkage.push({ type: 'metadata', content: JSON.stringify(metadata) });
										// Pull the image URL out
										let imageUrl = metadata.image;
										if (typeof imageUrl !== 'string') {
											return null;
										}
										if (imageUrl.match(/^(https:\/\/|data:)/i)) {
											// Allow
										} else {
											// Transform IPFS link to gateway
											const ipfs = imageUrl.match(matcherIpfs);
											if (ipfs == null) {
												return null;
											}
											linkage.push({ type: 'url-ipfs', content: imageUrl });
											imageUrl = getIpfsLink(imageUrl);
										}
										linkage.push({ type: 'url', content: imageUrl });
										return { linkage, url: imageUrl };
									}
								}
							}
						} catch (error) {}
						return null;
					});
				}
				getContentHash() {
					return __awaiter(this, void 0, void 0, function* () {
						// keccak256("contenthash()")
						const hexBytes = yield this._fetchBytes('0xbc1c58d1');
						// No contenthash
						if (hexBytes == null || hexBytes === '0x') {
							return null;
						}
						// IPFS (CID: 1, Type: DAG-PB)
						const ipfs = hexBytes.match(
							/^0xe3010170(([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f]*))$/
						);
						if (ipfs) {
							const length = parseInt(ipfs[3], 16);
							if (ipfs[4].length === length * 2) {
								return (
									'ipfs:/\/' +
									basex_lib_esm /* Base58 */.zn
										.encode('0x' + ipfs[1])
								);
							}
						}
						// IPNS (CID: 1, Type: libp2p-key)
						const ipns = hexBytes.match(
							/^0xe5010172(([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f]*))$/
						);
						if (ipns) {
							const length = parseInt(ipns[3], 16);
							if (ipns[4].length === length * 2) {
								return (
									'ipns:/\/' +
									basex_lib_esm /* Base58 */.zn
										.encode('0x' + ipns[1])
								);
							}
						}
						// Swarm (CID: 1, Type: swarm-manifest; hash/length hard-coded to keccak256/32)
						const swarm = hexBytes.match(/^0xe40101fa011b20([0-9a-f]*)$/);
						if (swarm) {
							if (swarm[1].length === 32 * 2) {
								return 'bzz:/\/' + swarm[1];
							}
						}
						const skynet = hexBytes.match(/^0x90b2c605([0-9a-f]*)$/);
						if (skynet) {
							if (skynet[1].length === 34 * 2) {
								// URL Safe base64; https://datatracker.ietf.org/doc/html/rfc4648#section-5
								const urlSafe = { '=': '', '+': '-', '/': '_' };
								const hash = (0, base64 /* encode */.l)('0x' + skynet[1]).replace(
									/[=+\/]/g,
									(a) => urlSafe[a]
								);
								return 'sia:/\/' + hash;
							}
						}
						return base_provider_logger.throwError(
							`invalid or unsupported content hash data`,
							logger_lib_esm /* Logger */.Vy.errors.UNSUPPORTED_OPERATION,
							{
								operation: 'getContentHash()',
								data: hexBytes
							}
						);
					});
				}
				getText(key) {
					return __awaiter(this, void 0, void 0, function* () {
						// The key encoded as parameter to fetchBytes
						let keyBytes = (0, utf8 /* toUtf8Bytes */.YW)(key);
						// The nodehash consumes the first slot, so the string pointer targets
						// offset 64, with the length at offset 64 and data starting at offset 96
						keyBytes = (0, bytes_lib_esm /* concat */.xW)([
							bytes32ify(64),
							bytes32ify(keyBytes.length),
							keyBytes
						]);
						// Pad to word-size (32 bytes)
						if (keyBytes.length % 32 !== 0) {
							keyBytes = (0, bytes_lib_esm /* concat */.xW)([
								keyBytes,
								(0, bytes_lib_esm /* hexZeroPad */.bj)('0x', 32 - (key.length % 32))
							]);
						}
						const hexBytes = yield this._fetchBytes(
							'0x59d1d43c',
							(0, bytes_lib_esm /* hexlify */.c$)(keyBytes)
						);
						if (hexBytes == null || hexBytes === '0x') {
							return null;
						}
						return (0, utf8 /* toUtf8String */._v)(hexBytes);
					});
				}
			}
			let defaultFormatter = null;
			let nextPollId = 1;
			class BaseProvider extends abstract_provider_lib_esm /* Provider */.Kq {
				/**
				 *  ready
				 *
				 *  A Promise<Network> that resolves only once the provider is ready.
				 *
				 *  Sub-classes that call the super with a network without a chainId
				 *  MUST set this. Standard named networks have a known chainId.
				 *
				 */
				constructor(network) {
					super();
					// Events being listened to
					this._events = [];
					this._emitted = { block: -2 };
					this.disableCcipRead = false;
					this.formatter = new.target.getFormatter();
					// If network is any, this Provider allows the underlying
					// network to change dynamically, and we auto-detect the
					// current network
					(0, properties_lib_esm /* defineReadOnly */.yY)(this, 'anyNetwork', network === 'any');
					if (this.anyNetwork) {
						network = this.detectNetwork();
					}
					if (network instanceof Promise) {
						this._networkPromise = network;
						// Squash any "unhandled promise" errors; that do not need to be handled
						network.catch((error) => {});
						// Trigger initial network setting (async)
						this._ready().catch((error) => {});
					} else {
						const knownNetwork = (0, properties_lib_esm /* getStatic */.$J)(
							new.target,
							'getNetwork'
						)(network);
						if (knownNetwork) {
							(0, properties_lib_esm /* defineReadOnly */.yY)(this, '_network', knownNetwork);
							this.emit('network', knownNetwork, null);
						} else {
							base_provider_logger.throwArgumentError('invalid network', 'network', network);
						}
					}
					this._maxInternalBlockNumber = -1024;
					this._lastBlockNumber = -2;
					this._maxFilterBlockRange = 10;
					this._pollingInterval = 4000;
					this._fastQueryDate = 0;
				}
				_ready() {
					return __awaiter(this, void 0, void 0, function* () {
						if (this._network == null) {
							let network = null;
							if (this._networkPromise) {
								try {
									network = yield this._networkPromise;
								} catch (error) {}
							}
							// Try the Provider's network detection (this MUST throw if it cannot)
							if (network == null) {
								network = yield this.detectNetwork();
							}
							// This should never happen; every Provider sub-class should have
							// suggested a network by here (or have thrown).
							if (!network) {
								base_provider_logger.throwError(
									'no network detected',
									logger_lib_esm /* Logger */.Vy.errors.UNKNOWN_ERROR,
									{}
								);
							}
							// Possible this call stacked so do not call defineReadOnly again
							if (this._network == null) {
								if (this.anyNetwork) {
									this._network = network;
								} else {
									(0, properties_lib_esm /* defineReadOnly */.yY)(this, '_network', network);
								}
								this.emit('network', network, null);
							}
						}
						return this._network;
					});
				}
				// This will always return the most recently established network.
				// For "any", this can change (a "network" event is emitted before
				// any change is reflected); otherwise this cannot change
				get ready() {
					return (0, web_lib_esm /* poll */.wt)(() => {
						return this._ready().then(
							(network) => {
								return network;
							},
							(error) => {
								// If the network isn't running yet, we will wait
								if (
									error.code === logger_lib_esm /* Logger */.Vy.errors.NETWORK_ERROR &&
									error.event === 'noNetwork'
								) {
									return undefined;
								}
								throw error;
							}
						);
					});
				}
				// @TODO: Remove this and just create a singleton formatter
				static getFormatter() {
					if (defaultFormatter == null) {
						defaultFormatter = new Formatter();
					}
					return defaultFormatter;
				}
				// @TODO: Remove this and just use getNetwork
				static getNetwork(network) {
					return (0, networks_lib_esm /* getNetwork */.N)(network == null ? 'homestead' : network);
				}
				ccipReadFetch(tx, calldata, urls) {
					return __awaiter(this, void 0, void 0, function* () {
						if (this.disableCcipRead || urls.length === 0) {
							return null;
						}
						const sender = tx.to.toLowerCase();
						const data = calldata.toLowerCase();
						const errorMessages = [];
						for (let i = 0; i < urls.length; i++) {
							const url = urls[i];
							// URL expansion
							const href = url.replace('{sender}', sender).replace('{data}', data);
							// If no {data} is present, use POST; otherwise GET
							const json = url.indexOf('{data}') >= 0 ? null : JSON.stringify({ data, sender });
							const result = yield (0, web_lib_esm /* fetchJson */.x6)(
								{ url: href, errorPassThrough: true },
								json,
								(value, response) => {
									value.status = response.statusCode;
									return value;
								}
							);
							if (result.data) {
								return result.data;
							}
							const errorMessage = result.message || 'unknown error';
							// 4xx indicates the result is not present; stop
							if (result.status >= 400 && result.status < 500) {
								return base_provider_logger.throwError(
									`response not found during CCIP fetch: ${errorMessage}`,
									logger_lib_esm /* Logger */.Vy.errors.SERVER_ERROR,
									{ url, errorMessage }
								);
							}
							// 5xx indicates server issue; try the next url
							errorMessages.push(errorMessage);
						}
						return base_provider_logger.throwError(
							`error encountered during CCIP fetch: ${errorMessages.map((m) => JSON.stringify(m)).join(', ')}`,
							logger_lib_esm /* Logger */.Vy.errors.SERVER_ERROR,
							{
								urls,
								errorMessages
							}
						);
					});
				}
				// Fetches the blockNumber, but will reuse any result that is less
				// than maxAge old or has been requested since the last request
				_getInternalBlockNumber(maxAge) {
					return __awaiter(this, void 0, void 0, function* () {
						yield this._ready();
						// Allowing stale data up to maxAge old
						if (maxAge > 0) {
							// While there are pending internal block requests...
							while (this._internalBlockNumber) {
								// ..."remember" which fetch we started with
								const internalBlockNumber = this._internalBlockNumber;
								try {
									// Check the result is not too stale
									const result = yield internalBlockNumber;
									if (getTime() - result.respTime <= maxAge) {
										return result.blockNumber;
									}
									// Too old; fetch a new value
									break;
								} catch (error) {
									// The fetch rejected; if we are the first to get the
									// rejection, drop through so we replace it with a new
									// fetch; all others blocked will then get that fetch
									// which won't match the one they "remembered" and loop
									if (this._internalBlockNumber === internalBlockNumber) {
										break;
									}
								}
							}
						}
						const reqTime = getTime();
						const checkInternalBlockNumber = (0, properties_lib_esm /* resolveProperties */.k_)({
							blockNumber: this.perform('getBlockNumber', {}),
							networkError: this.getNetwork().then(
								(network) => null,
								(error) => error
							)
						}).then(({ blockNumber, networkError }) => {
							if (networkError) {
								// Unremember this bad internal block number
								if (this._internalBlockNumber === checkInternalBlockNumber) {
									this._internalBlockNumber = null;
								}
								throw networkError;
							}
							const respTime = getTime();
							blockNumber = bignumber /* BigNumber */.gH
								.from(blockNumber)
								.toNumber();
							if (blockNumber < this._maxInternalBlockNumber) {
								blockNumber = this._maxInternalBlockNumber;
							}
							this._maxInternalBlockNumber = blockNumber;
							this._setFastBlockNumber(blockNumber); // @TODO: Still need this?
							return { blockNumber, reqTime, respTime };
						});
						this._internalBlockNumber = checkInternalBlockNumber;
						// Swallow unhandled exceptions; if needed they are handled else where
						checkInternalBlockNumber.catch((error) => {
							// Don't null the dead (rejected) fetch, if it has already been updated
							if (this._internalBlockNumber === checkInternalBlockNumber) {
								this._internalBlockNumber = null;
							}
						});
						return (yield checkInternalBlockNumber).blockNumber;
					});
				}
				poll() {
					return __awaiter(this, void 0, void 0, function* () {
						const pollId = nextPollId++;
						// Track all running promises, so we can trigger a post-poll once they are complete
						const runners = [];
						let blockNumber = null;
						try {
							blockNumber = yield this._getInternalBlockNumber(100 + this.pollingInterval / 2);
						} catch (error) {
							this.emit('error', error);
							return;
						}
						this._setFastBlockNumber(blockNumber);
						// Emit a poll event after we have the latest (fast) block number
						this.emit('poll', pollId, blockNumber);
						// If the block has not changed, meh.
						if (blockNumber === this._lastBlockNumber) {
							this.emit('didPoll', pollId);
							return;
						}
						// First polling cycle, trigger a "block" events
						if (this._emitted.block === -2) {
							this._emitted.block = blockNumber - 1;
						}
						if (Math.abs(this._emitted.block - blockNumber) > 1000) {
							base_provider_logger.warn(
								`network block skew detected; skipping block events (emitted=${this._emitted.block} blockNumber${blockNumber})`
							);
							this.emit(
								'error',
								base_provider_logger.makeError(
									'network block skew detected',
									logger_lib_esm /* Logger */.Vy.errors.NETWORK_ERROR,
									{
										blockNumber: blockNumber,
										event: 'blockSkew',
										previousBlockNumber: this._emitted.block
									}
								)
							);
							this.emit('block', blockNumber);
						} else {
							// Notify all listener for each block that has passed
							for (let i = this._emitted.block + 1; i <= blockNumber; i++) {
								this.emit('block', i);
							}
						}
						// The emitted block was updated, check for obsolete events
						if (this._emitted.block !== blockNumber) {
							this._emitted.block = blockNumber;
							Object.keys(this._emitted).forEach((key) => {
								// The block event does not expire
								if (key === 'block') {
									return;
								}
								// The block we were at when we emitted this event
								const eventBlockNumber = this._emitted[key];
								// We cannot garbage collect pending transactions or blocks here
								// They should be garbage collected by the Provider when setting
								// "pending" events
								if (eventBlockNumber === 'pending') {
									return;
								}
								// Evict any transaction hashes or block hashes over 12 blocks
								// old, since they should not return null anyways
								if (blockNumber - eventBlockNumber > 12) {
									delete this._emitted[key];
								}
							});
						}
						// First polling cycle
						if (this._lastBlockNumber === -2) {
							this._lastBlockNumber = blockNumber - 1;
						}
						// Find all transaction hashes we are waiting on
						this._events.forEach((event) => {
							switch (event.type) {
								case 'tx': {
									const hash = event.hash;
									let runner = this.getTransactionReceipt(hash)
										.then((receipt) => {
											if (!receipt || receipt.blockNumber == null) {
												return null;
											}
											this._emitted['t:' + hash] = receipt.blockNumber;
											this.emit(hash, receipt);
											return null;
										})
										.catch((error) => {
											this.emit('error', error);
										});
									runners.push(runner);
									break;
								}
								case 'filter': {
									// We only allow a single getLogs to be in-flight at a time
									if (!event._inflight) {
										event._inflight = true;
										// This is the first filter for this event, so we want to
										// restrict events to events that happened no earlier than now
										if (event._lastBlockNumber === -2) {
											event._lastBlockNumber = blockNumber - 1;
										}
										// Filter from the last *known* event; due to load-balancing
										// and some nodes returning updated block numbers before
										// indexing events, a logs result with 0 entries cannot be
										// trusted and we must retry a range which includes it again
										const filter = event.filter;
										filter.fromBlock = event._lastBlockNumber + 1;
										filter.toBlock = blockNumber;
										// Prevent fitler ranges from growing too wild, since it is quite
										// likely there just haven't been any events to move the lastBlockNumber.
										const minFromBlock = filter.toBlock - this._maxFilterBlockRange;
										if (minFromBlock > filter.fromBlock) {
											filter.fromBlock = minFromBlock;
										}
										if (filter.fromBlock < 0) {
											filter.fromBlock = 0;
										}
										const runner = this.getLogs(filter)
											.then((logs) => {
												// Allow the next getLogs
												event._inflight = false;
												if (logs.length === 0) {
													return;
												}
												logs.forEach((log) => {
													// Only when we get an event for a given block number
													// can we trust the events are indexed
													if (log.blockNumber > event._lastBlockNumber) {
														event._lastBlockNumber = log.blockNumber;
													}
													// Make sure we stall requests to fetch blocks and txs
													this._emitted['b:' + log.blockHash] = log.blockNumber;
													this._emitted['t:' + log.transactionHash] = log.blockNumber;
													this.emit(filter, log);
												});
											})
											.catch((error) => {
												this.emit('error', error);
												// Allow another getLogs (the range was not updated)
												event._inflight = false;
											});
										runners.push(runner);
									}
									break;
								}
							}
						});
						this._lastBlockNumber = blockNumber;
						// Once all events for this loop have been processed, emit "didPoll"
						Promise.all(runners)
							.then(() => {
								this.emit('didPoll', pollId);
							})
							.catch((error) => {
								this.emit('error', error);
							});
						return;
					});
				}
				// Deprecated; do not use this
				resetEventsBlock(blockNumber) {
					this._lastBlockNumber = blockNumber - 1;
					if (this.polling) {
						this.poll();
					}
				}
				get network() {
					return this._network;
				}
				// This method should query the network if the underlying network
				// can change, such as when connected to a JSON-RPC backend
				detectNetwork() {
					return __awaiter(this, void 0, void 0, function* () {
						return base_provider_logger.throwError(
							'provider does not support network detection',
							logger_lib_esm /* Logger */.Vy.errors.UNSUPPORTED_OPERATION,
							{
								operation: 'provider.detectNetwork'
							}
						);
					});
				}
				getNetwork() {
					return __awaiter(this, void 0, void 0, function* () {
						const network = yield this._ready();
						// Make sure we are still connected to the same network; this is
						// only an external call for backends which can have the underlying
						// network change spontaneously
						const currentNetwork = yield this.detectNetwork();
						if (network.chainId !== currentNetwork.chainId) {
							// We are allowing network changes, things can get complex fast;
							// make sure you know what you are doing if you use "any"
							if (this.anyNetwork) {
								this._network = currentNetwork;
								// Reset all internal block number guards and caches
								this._lastBlockNumber = -2;
								this._fastBlockNumber = null;
								this._fastBlockNumberPromise = null;
								this._fastQueryDate = 0;
								this._emitted.block = -2;
								this._maxInternalBlockNumber = -1024;
								this._internalBlockNumber = null;
								// The "network" event MUST happen before this method resolves
								// so any events have a chance to unregister, so we stall an
								// additional event loop before returning from /this/ call
								this.emit('network', currentNetwork, network);
								yield stall(0);
								return this._network;
							}
							const error = base_provider_logger.makeError(
								'underlying network changed',
								logger_lib_esm /* Logger */.Vy.errors.NETWORK_ERROR,
								{
									event: 'changed',
									network: network,
									detectedNetwork: currentNetwork
								}
							);
							this.emit('error', error);
							throw error;
						}
						return network;
					});
				}
				get blockNumber() {
					this._getInternalBlockNumber(100 + this.pollingInterval / 2).then(
						(blockNumber) => {
							this._setFastBlockNumber(blockNumber);
						},
						(error) => {}
					);
					return this._fastBlockNumber != null ? this._fastBlockNumber : -1;
				}
				get polling() {
					return this._poller != null;
				}
				set polling(value) {
					if (value && !this._poller) {
						this._poller = setInterval(() => {
							this.poll();
						}, this.pollingInterval);
						if (!this._bootstrapPoll) {
							this._bootstrapPoll = setTimeout(() => {
								this.poll();
								// We block additional polls until the polling interval
								// is done, to prevent overwhelming the poll function
								this._bootstrapPoll = setTimeout(() => {
									// If polling was disabled, something may require a poke
									// since starting the bootstrap poll and it was disabled
									if (!this._poller) {
										this.poll();
									}
									// Clear out the bootstrap so we can do another
									this._bootstrapPoll = null;
								}, this.pollingInterval);
							}, 0);
						}
					} else if (!value && this._poller) {
						clearInterval(this._poller);
						this._poller = null;
					}
				}
				get pollingInterval() {
					return this._pollingInterval;
				}
				set pollingInterval(value) {
					if (typeof value !== 'number' || value <= 0 || parseInt(String(value)) != value) {
						throw new Error('invalid polling interval');
					}
					this._pollingInterval = value;
					if (this._poller) {
						clearInterval(this._poller);
						this._poller = setInterval(() => {
							this.poll();
						}, this._pollingInterval);
					}
				}
				_getFastBlockNumber() {
					const now = getTime();
					// Stale block number, request a newer value
					if (now - this._fastQueryDate > 2 * this._pollingInterval) {
						this._fastQueryDate = now;
						this._fastBlockNumberPromise = this.getBlockNumber().then((blockNumber) => {
							if (this._fastBlockNumber == null || blockNumber > this._fastBlockNumber) {
								this._fastBlockNumber = blockNumber;
							}
							return this._fastBlockNumber;
						});
					}
					return this._fastBlockNumberPromise;
				}
				_setFastBlockNumber(blockNumber) {
					// Older block, maybe a stale request
					if (this._fastBlockNumber != null && blockNumber < this._fastBlockNumber) {
						return;
					}
					// Update the time we updated the blocknumber
					this._fastQueryDate = getTime();
					// Newer block number, use  it
					if (this._fastBlockNumber == null || blockNumber > this._fastBlockNumber) {
						this._fastBlockNumber = blockNumber;
						this._fastBlockNumberPromise = Promise.resolve(blockNumber);
					}
				}
				waitForTransaction(transactionHash, confirmations, timeout) {
					return __awaiter(this, void 0, void 0, function* () {
						return this._waitForTransaction(
							transactionHash,
							confirmations == null ? 1 : confirmations,
							timeout || 0,
							null
						);
					});
				}
				_waitForTransaction(transactionHash, confirmations, timeout, replaceable) {
					return __awaiter(this, void 0, void 0, function* () {
						const receipt = yield this.getTransactionReceipt(transactionHash);
						// Receipt is already good
						if ((receipt ? receipt.confirmations : 0) >= confirmations) {
							return receipt;
						}
						// Poll until the receipt is good...
						return new Promise((resolve, reject) => {
							const cancelFuncs = [];
							let done = false;
							const alreadyDone = function () {
								if (done) {
									return true;
								}
								done = true;
								cancelFuncs.forEach((func) => {
									func();
								});
								return false;
							};
							const minedHandler = (receipt) => {
								if (receipt.confirmations < confirmations) {
									return;
								}
								if (alreadyDone()) {
									return;
								}
								resolve(receipt);
							};
							this.on(transactionHash, minedHandler);
							cancelFuncs.push(() => {
								this.removeListener(transactionHash, minedHandler);
							});
							if (replaceable) {
								let lastBlockNumber = replaceable.startBlock;
								let scannedBlock = null;
								const replaceHandler = (blockNumber) =>
									__awaiter(this, void 0, void 0, function* () {
										if (done) {
											return;
										}
										// Wait 1 second; this is only used in the case of a fault, so
										// we will trade off a little bit of latency for more consistent
										// results and fewer JSON-RPC calls
										yield stall(1000);
										this.getTransactionCount(replaceable.from).then(
											(nonce) =>
												__awaiter(this, void 0, void 0, function* () {
													if (done) {
														return;
													}
													if (nonce <= replaceable.nonce) {
														lastBlockNumber = blockNumber;
													} else {
														// First check if the transaction was mined
														{
															const mined = yield this.getTransaction(transactionHash);
															if (mined && mined.blockNumber != null) {
																return;
															}
														}
														// First time scanning. We start a little earlier for some
														// wiggle room here to handle the eventually consistent nature
														// of blockchain (e.g. the getTransactionCount was for a
														// different block)
														if (scannedBlock == null) {
															scannedBlock = lastBlockNumber - 3;
															if (scannedBlock < replaceable.startBlock) {
																scannedBlock = replaceable.startBlock;
															}
														}
														while (scannedBlock <= blockNumber) {
															if (done) {
																return;
															}
															const block = yield this.getBlockWithTransactions(scannedBlock);
															for (let ti = 0; ti < block.transactions.length; ti++) {
																const tx = block.transactions[ti];
																// Successfully mined!
																if (tx.hash === transactionHash) {
																	return;
																}
																// Matches our transaction from and nonce; its a replacement
																if (
																	tx.from === replaceable.from &&
																	tx.nonce === replaceable.nonce
																) {
																	if (done) {
																		return;
																	}
																	// Get the receipt of the replacement
																	const receipt = yield this.waitForTransaction(
																		tx.hash,
																		confirmations
																	);
																	// Already resolved or rejected (prolly a timeout)
																	if (alreadyDone()) {
																		return;
																	}
																	// The reason we were replaced
																	let reason = 'replaced';
																	if (
																		tx.data === replaceable.data &&
																		tx.to === replaceable.to &&
																		tx.value.eq(replaceable.value)
																	) {
																		reason = 'repriced';
																	} else if (
																		tx.data === '0x' &&
																		tx.from === tx.to &&
																		tx.value.isZero()
																	) {
																		reason = 'cancelled';
																	}
																	// Explain why we were replaced
																	reject(
																		base_provider_logger.makeError(
																			'transaction was replaced',
																			logger_lib_esm /* Logger */.Vy.errors.TRANSACTION_REPLACED,
																			{
																				cancelled: reason === 'replaced' || reason === 'cancelled',
																				reason,
																				replacement: this._wrapTransaction(tx),
																				hash: transactionHash,
																				receipt
																			}
																		)
																	);
																	return;
																}
															}
															scannedBlock++;
														}
													}
													if (done) {
														return;
													}
													this.once('block', replaceHandler);
												}),
											(error) => {
												if (done) {
													return;
												}
												this.once('block', replaceHandler);
											}
										);
									});
								if (done) {
									return;
								}
								this.once('block', replaceHandler);
								cancelFuncs.push(() => {
									this.removeListener('block', replaceHandler);
								});
							}
							if (typeof timeout === 'number' && timeout > 0) {
								const timer = setTimeout(() => {
									if (alreadyDone()) {
										return;
									}
									reject(
										base_provider_logger.makeError(
											'timeout exceeded',
											logger_lib_esm /* Logger */.Vy.errors.TIMEOUT,
											{ timeout: timeout }
										)
									);
								}, timeout);
								if (timer.unref) {
									timer.unref();
								}
								cancelFuncs.push(() => {
									clearTimeout(timer);
								});
							}
						});
					});
				}
				getBlockNumber() {
					return __awaiter(this, void 0, void 0, function* () {
						return this._getInternalBlockNumber(0);
					});
				}
				getGasPrice() {
					return __awaiter(this, void 0, void 0, function* () {
						yield this.getNetwork();
						const result = yield this.perform('getGasPrice', {});
						try {
							return bignumber /* BigNumber */.gH
								.from(result);
						} catch (error) {
							return base_provider_logger.throwError(
								'bad result from backend',
								logger_lib_esm /* Logger */.Vy.errors.SERVER_ERROR,
								{
									method: 'getGasPrice',
									result,
									error
								}
							);
						}
					});
				}
				getBalance(addressOrName, blockTag) {
					return __awaiter(this, void 0, void 0, function* () {
						yield this.getNetwork();
						const params = yield (0, properties_lib_esm /* resolveProperties */.k_)({
							address: this._getAddress(addressOrName),
							blockTag: this._getBlockTag(blockTag)
						});
						const result = yield this.perform('getBalance', params);
						try {
							return bignumber /* BigNumber */.gH
								.from(result);
						} catch (error) {
							return base_provider_logger.throwError(
								'bad result from backend',
								logger_lib_esm /* Logger */.Vy.errors.SERVER_ERROR,
								{
									method: 'getBalance',
									params,
									result,
									error
								}
							);
						}
					});
				}
				getTransactionCount(addressOrName, blockTag) {
					return __awaiter(this, void 0, void 0, function* () {
						yield this.getNetwork();
						const params = yield (0, properties_lib_esm /* resolveProperties */.k_)({
							address: this._getAddress(addressOrName),
							blockTag: this._getBlockTag(blockTag)
						});
						const result = yield this.perform('getTransactionCount', params);
						try {
							return bignumber /* BigNumber */.gH
								.from(result)
								.toNumber();
						} catch (error) {
							return base_provider_logger.throwError(
								'bad result from backend',
								logger_lib_esm /* Logger */.Vy.errors.SERVER_ERROR,
								{
									method: 'getTransactionCount',
									params,
									result,
									error
								}
							);
						}
					});
				}
				getCode(addressOrName, blockTag) {
					return __awaiter(this, void 0, void 0, function* () {
						yield this.getNetwork();
						const params = yield (0, properties_lib_esm /* resolveProperties */.k_)({
							address: this._getAddress(addressOrName),
							blockTag: this._getBlockTag(blockTag)
						});
						const result = yield this.perform('getCode', params);
						try {
							return (0, bytes_lib_esm /* hexlify */.c$)(result);
						} catch (error) {
							return base_provider_logger.throwError(
								'bad result from backend',
								logger_lib_esm /* Logger */.Vy.errors.SERVER_ERROR,
								{
									method: 'getCode',
									params,
									result,
									error
								}
							);
						}
					});
				}
				getStorageAt(addressOrName, position, blockTag) {
					return __awaiter(this, void 0, void 0, function* () {
						yield this.getNetwork();
						const params = yield (0, properties_lib_esm /* resolveProperties */.k_)({
							address: this._getAddress(addressOrName),
							blockTag: this._getBlockTag(blockTag),
							position: Promise.resolve(position).then((p) =>
								(0, bytes_lib_esm /* hexValue */.Fh)(p)
							)
						});
						const result = yield this.perform('getStorageAt', params);
						try {
							return (0, bytes_lib_esm /* hexlify */.c$)(result);
						} catch (error) {
							return base_provider_logger.throwError(
								'bad result from backend',
								logger_lib_esm /* Logger */.Vy.errors.SERVER_ERROR,
								{
									method: 'getStorageAt',
									params,
									result,
									error
								}
							);
						}
					});
				}
				// This should be called by any subclass wrapping a TransactionResponse
				_wrapTransaction(tx, hash, startBlock) {
					if (hash != null && (0, bytes_lib_esm /* hexDataLength */.cm)(hash) !== 32) {
						throw new Error('invalid response - sendTransaction');
					}
					const result = tx;
					// Check the hash we expect is the same as the hash the server reported
					if (hash != null && tx.hash !== hash) {
						base_provider_logger.throwError(
							'Transaction hash mismatch from Provider.sendTransaction.',
							logger_lib_esm /* Logger */.Vy.errors.UNKNOWN_ERROR,
							{ expectedHash: tx.hash, returnedHash: hash }
						);
					}
					result.wait = (confirms, timeout) =>
						__awaiter(this, void 0, void 0, function* () {
							if (confirms == null) {
								confirms = 1;
							}
							if (timeout == null) {
								timeout = 0;
							}
							// Get the details to detect replacement
							let replacement = undefined;
							if (confirms !== 0 && startBlock != null) {
								replacement = {
									data: tx.data,
									from: tx.from,
									nonce: tx.nonce,
									to: tx.to,
									value: tx.value,
									startBlock
								};
							}
							const receipt = yield this._waitForTransaction(
								tx.hash,
								confirms,
								timeout,
								replacement
							);
							if (receipt == null && confirms === 0) {
								return null;
							}
							// No longer pending, allow the polling loop to garbage collect this
							this._emitted['t:' + tx.hash] = receipt.blockNumber;
							if (receipt.status === 0) {
								base_provider_logger.throwError(
									'transaction failed',
									logger_lib_esm /* Logger */.Vy.errors.CALL_EXCEPTION,
									{
										transactionHash: tx.hash,
										transaction: tx,
										receipt: receipt
									}
								);
							}
							return receipt;
						});
					return result;
				}
				sendTransaction(signedTransaction) {
					return __awaiter(this, void 0, void 0, function* () {
						yield this.getNetwork();
						const hexTx = yield Promise.resolve(signedTransaction).then((t) =>
							(0, bytes_lib_esm /* hexlify */.c$)(t)
						);
						const tx = this.formatter.transaction(signedTransaction);
						if (tx.confirmations == null) {
							tx.confirmations = 0;
						}
						const blockNumber = yield this._getInternalBlockNumber(100 + 2 * this.pollingInterval);
						try {
							const hash = yield this.perform('sendTransaction', { signedTransaction: hexTx });
							return this._wrapTransaction(tx, hash, blockNumber);
						} catch (error) {
							error.transaction = tx;
							error.transactionHash = tx.hash;
							throw error;
						}
					});
				}
				_getTransactionRequest(transaction) {
					return __awaiter(this, void 0, void 0, function* () {
						const values = yield transaction;
						const tx = {};
						['from', 'to'].forEach((key) => {
							if (values[key] == null) {
								return;
							}
							tx[key] = Promise.resolve(values[key]).then((v) => (v ? this._getAddress(v) : null));
						});
						['gasLimit', 'gasPrice', 'maxFeePerGas', 'maxPriorityFeePerGas', 'value'].forEach(
							(key) => {
								if (values[key] == null) {
									return;
								}
								tx[key] = Promise.resolve(values[key]).then((v) =>
									v
										? bignumber /* BigNumber */.gH
												.from(v)
										: null
								);
							}
						);
						['type'].forEach((key) => {
							if (values[key] == null) {
								return;
							}
							tx[key] = Promise.resolve(values[key]).then((v) => (v != null ? v : null));
						});
						if (values.accessList) {
							tx.accessList = this.formatter.accessList(values.accessList);
						}
						['data'].forEach((key) => {
							if (values[key] == null) {
								return;
							}
							tx[key] = Promise.resolve(values[key]).then((v) =>
								v ? (0, bytes_lib_esm /* hexlify */.c$)(v) : null
							);
						});
						return this.formatter.transactionRequest(
							yield (0, properties_lib_esm /* resolveProperties */.k_)(tx)
						);
					});
				}
				_getFilter(filter) {
					return __awaiter(this, void 0, void 0, function* () {
						filter = yield filter;
						const result = {};
						if (filter.address != null) {
							result.address = this._getAddress(filter.address);
						}
						['blockHash', 'topics'].forEach((key) => {
							if (filter[key] == null) {
								return;
							}
							result[key] = filter[key];
						});
						['fromBlock', 'toBlock'].forEach((key) => {
							if (filter[key] == null) {
								return;
							}
							result[key] = this._getBlockTag(filter[key]);
						});
						return this.formatter.filter(
							yield (0, properties_lib_esm /* resolveProperties */.k_)(result)
						);
					});
				}
				_call(transaction, blockTag, attempt) {
					return __awaiter(this, void 0, void 0, function* () {
						if (attempt >= MAX_CCIP_REDIRECTS) {
							base_provider_logger.throwError(
								'CCIP read exceeded maximum redirections',
								logger_lib_esm /* Logger */.Vy.errors.SERVER_ERROR,
								{
									redirects: attempt,
									transaction
								}
							);
						}
						const txSender = transaction.to;
						const result = yield this.perform('call', { transaction, blockTag });
						// CCIP Read request via OffchainLookup(address,string[],bytes,bytes4,bytes)
						if (
							attempt >= 0 &&
							blockTag === 'latest' &&
							txSender != null &&
							result.substring(0, 10) === '0x556f1830' &&
							(0, bytes_lib_esm /* hexDataLength */.cm)(result) % 32 === 4
						) {
							try {
								const data = (0, bytes_lib_esm /* hexDataSlice */.Ab)(result, 4);
								// Check the sender of the OffchainLookup matches the transaction
								const sender = (0, bytes_lib_esm /* hexDataSlice */.Ab)(data, 0, 32);
								if (
									!bignumber /* BigNumber */.gH
										.from(sender)
										.eq(txSender)
								) {
									base_provider_logger.throwError(
										'CCIP Read sender did not match',
										logger_lib_esm /* Logger */.Vy.errors.CALL_EXCEPTION,
										{
											name: 'OffchainLookup',
											signature: 'OffchainLookup(address,string[],bytes,bytes4,bytes)',
											transaction,
											data: result
										}
									);
								}
								// Read the URLs from the response
								const urls = [];
								const urlsOffset = bignumber /* BigNumber */.gH
									.from((0, bytes_lib_esm /* hexDataSlice */.Ab)(data, 32, 64))
									.toNumber();
								const urlsLength = bignumber /* BigNumber */.gH
									.from((0, bytes_lib_esm /* hexDataSlice */.Ab)(data, urlsOffset, urlsOffset + 32))
									.toNumber();
								const urlsData = (0, bytes_lib_esm /* hexDataSlice */.Ab)(data, urlsOffset + 32);
								for (let u = 0; u < urlsLength; u++) {
									const url = _parseString(urlsData, u * 32);
									if (url == null) {
										base_provider_logger.throwError(
											'CCIP Read contained corrupt URL string',
											logger_lib_esm /* Logger */.Vy.errors.CALL_EXCEPTION,
											{
												name: 'OffchainLookup',
												signature: 'OffchainLookup(address,string[],bytes,bytes4,bytes)',
												transaction,
												data: result
											}
										);
									}
									urls.push(url);
								}
								// Get the CCIP calldata to forward
								const calldata = _parseBytes(data, 64);
								// Get the callbackSelector (bytes4)
								if (
									!bignumber /* BigNumber */.gH
										.from((0, bytes_lib_esm /* hexDataSlice */.Ab)(data, 100, 128))
										.isZero()
								) {
									base_provider_logger.throwError(
										'CCIP Read callback selector included junk',
										logger_lib_esm /* Logger */.Vy.errors.CALL_EXCEPTION,
										{
											name: 'OffchainLookup',
											signature: 'OffchainLookup(address,string[],bytes,bytes4,bytes)',
											transaction,
											data: result
										}
									);
								}
								const callbackSelector = (0, bytes_lib_esm /* hexDataSlice */.Ab)(data, 96, 100);
								// Get the extra data to send back to the contract as context
								const extraData = _parseBytes(data, 128);
								const ccipResult = yield this.ccipReadFetch(transaction, calldata, urls);
								if (ccipResult == null) {
									base_provider_logger.throwError(
										'CCIP Read disabled or provided no URLs',
										logger_lib_esm /* Logger */.Vy.errors.CALL_EXCEPTION,
										{
											name: 'OffchainLookup',
											signature: 'OffchainLookup(address,string[],bytes,bytes4,bytes)',
											transaction,
											data: result
										}
									);
								}
								const tx = {
									to: txSender,
									data: (0, bytes_lib_esm /* hexConcat */.qn)([
										callbackSelector,
										encodeBytes([ccipResult, extraData])
									])
								};
								return this._call(tx, blockTag, attempt + 1);
							} catch (error) {
								if (error.code === logger_lib_esm /* Logger */.Vy.errors.SERVER_ERROR) {
									throw error;
								}
							}
						}
						try {
							return (0, bytes_lib_esm /* hexlify */.c$)(result);
						} catch (error) {
							return base_provider_logger.throwError(
								'bad result from backend',
								logger_lib_esm /* Logger */.Vy.errors.SERVER_ERROR,
								{
									method: 'call',
									params: { transaction, blockTag },
									result,
									error
								}
							);
						}
					});
				}
				call(transaction, blockTag) {
					return __awaiter(this, void 0, void 0, function* () {
						yield this.getNetwork();
						const resolved = yield (0, properties_lib_esm /* resolveProperties */.k_)({
							transaction: this._getTransactionRequest(transaction),
							blockTag: this._getBlockTag(blockTag),
							ccipReadEnabled: Promise.resolve(transaction.ccipReadEnabled)
						});
						return this._call(
							resolved.transaction,
							resolved.blockTag,
							resolved.ccipReadEnabled ? 0 : -1
						);
					});
				}
				estimateGas(transaction) {
					return __awaiter(this, void 0, void 0, function* () {
						yield this.getNetwork();
						const params = yield (0, properties_lib_esm /* resolveProperties */.k_)({
							transaction: this._getTransactionRequest(transaction)
						});
						const result = yield this.perform('estimateGas', params);
						try {
							return bignumber /* BigNumber */.gH
								.from(result);
						} catch (error) {
							return base_provider_logger.throwError(
								'bad result from backend',
								logger_lib_esm /* Logger */.Vy.errors.SERVER_ERROR,
								{
									method: 'estimateGas',
									params,
									result,
									error
								}
							);
						}
					});
				}
				_getAddress(addressOrName) {
					return __awaiter(this, void 0, void 0, function* () {
						addressOrName = yield addressOrName;
						if (typeof addressOrName !== 'string') {
							base_provider_logger.throwArgumentError(
								'invalid address or ENS name',
								'name',
								addressOrName
							);
						}
						const address = yield this.resolveName(addressOrName);
						if (address == null) {
							base_provider_logger.throwError(
								'ENS name not configured',
								logger_lib_esm /* Logger */.Vy.errors.UNSUPPORTED_OPERATION,
								{
									operation: `resolveName(${JSON.stringify(addressOrName)})`
								}
							);
						}
						return address;
					});
				}
				_getBlock(blockHashOrBlockTag, includeTransactions) {
					return __awaiter(this, void 0, void 0, function* () {
						yield this.getNetwork();
						blockHashOrBlockTag = yield blockHashOrBlockTag;
						// If blockTag is a number (not "latest", etc), this is the block number
						let blockNumber = -128;
						const params = {
							includeTransactions: !!includeTransactions
						};
						if ((0, bytes_lib_esm /* isHexString */.Lo)(blockHashOrBlockTag, 32)) {
							params.blockHash = blockHashOrBlockTag;
						} else {
							try {
								params.blockTag = yield this._getBlockTag(blockHashOrBlockTag);
								if ((0, bytes_lib_esm /* isHexString */.Lo)(params.blockTag)) {
									blockNumber = parseInt(params.blockTag.substring(2), 16);
								}
							} catch (error) {
								base_provider_logger.throwArgumentError(
									'invalid block hash or block tag',
									'blockHashOrBlockTag',
									blockHashOrBlockTag
								);
							}
						}
						return (0, web_lib_esm /* poll */.wt)(
							() =>
								__awaiter(this, void 0, void 0, function* () {
									const block = yield this.perform('getBlock', params);
									// Block was not found
									if (block == null) {
										// For blockhashes, if we didn't say it existed, that blockhash may
										// not exist. If we did see it though, perhaps from a log, we know
										// it exists, and this node is just not caught up yet.
										if (params.blockHash != null) {
											if (this._emitted['b:' + params.blockHash] == null) {
												return null;
											}
										}
										// For block tags, if we are asking for a future block, we return null
										if (params.blockTag != null) {
											if (blockNumber > this._emitted.block) {
												return null;
											}
										}
										// Retry on the next block
										return undefined;
									}
									// Add transactions
									if (includeTransactions) {
										let blockNumber = null;
										for (let i = 0; i < block.transactions.length; i++) {
											const tx = block.transactions[i];
											if (tx.blockNumber == null) {
												tx.confirmations = 0;
											} else if (tx.confirmations == null) {
												if (blockNumber == null) {
													blockNumber = yield this._getInternalBlockNumber(
														100 + 2 * this.pollingInterval
													);
												}
												// Add the confirmations using the fast block number (pessimistic)
												let confirmations = blockNumber - tx.blockNumber + 1;
												if (confirmations <= 0) {
													confirmations = 1;
												}
												tx.confirmations = confirmations;
											}
										}
										const blockWithTxs = this.formatter.blockWithTransactions(block);
										blockWithTxs.transactions = blockWithTxs.transactions.map((tx) =>
											this._wrapTransaction(tx)
										);
										return blockWithTxs;
									}
									return this.formatter.block(block);
								}),
							{ oncePoll: this }
						);
					});
				}
				getBlock(blockHashOrBlockTag) {
					return this._getBlock(blockHashOrBlockTag, false);
				}
				getBlockWithTransactions(blockHashOrBlockTag) {
					return this._getBlock(blockHashOrBlockTag, true);
				}
				getTransaction(transactionHash) {
					return __awaiter(this, void 0, void 0, function* () {
						yield this.getNetwork();
						transactionHash = yield transactionHash;
						const params = { transactionHash: this.formatter.hash(transactionHash, true) };
						return (0, web_lib_esm /* poll */.wt)(
							() =>
								__awaiter(this, void 0, void 0, function* () {
									const result = yield this.perform('getTransaction', params);
									if (result == null) {
										if (this._emitted['t:' + transactionHash] == null) {
											return null;
										}
										return undefined;
									}
									const tx = this.formatter.transactionResponse(result);
									if (tx.blockNumber == null) {
										tx.confirmations = 0;
									} else if (tx.confirmations == null) {
										const blockNumber = yield this._getInternalBlockNumber(
											100 + 2 * this.pollingInterval
										);
										// Add the confirmations using the fast block number (pessimistic)
										let confirmations = blockNumber - tx.blockNumber + 1;
										if (confirmations <= 0) {
											confirmations = 1;
										}
										tx.confirmations = confirmations;
									}
									return this._wrapTransaction(tx);
								}),
							{ oncePoll: this }
						);
					});
				}
				getTransactionReceipt(transactionHash) {
					return __awaiter(this, void 0, void 0, function* () {
						yield this.getNetwork();
						transactionHash = yield transactionHash;
						const params = { transactionHash: this.formatter.hash(transactionHash, true) };
						return (0, web_lib_esm /* poll */.wt)(
							() =>
								__awaiter(this, void 0, void 0, function* () {
									const result = yield this.perform('getTransactionReceipt', params);
									if (result == null) {
										if (this._emitted['t:' + transactionHash] == null) {
											return null;
										}
										return undefined;
									}
									// "geth-etc" returns receipts before they are ready
									if (result.blockHash == null) {
										return undefined;
									}
									const receipt = this.formatter.receipt(result);
									if (receipt.blockNumber == null) {
										receipt.confirmations = 0;
									} else if (receipt.confirmations == null) {
										const blockNumber = yield this._getInternalBlockNumber(
											100 + 2 * this.pollingInterval
										);
										// Add the confirmations using the fast block number (pessimistic)
										let confirmations = blockNumber - receipt.blockNumber + 1;
										if (confirmations <= 0) {
											confirmations = 1;
										}
										receipt.confirmations = confirmations;
									}
									return receipt;
								}),
							{ oncePoll: this }
						);
					});
				}
				getLogs(filter) {
					return __awaiter(this, void 0, void 0, function* () {
						yield this.getNetwork();
						const params = yield (0, properties_lib_esm /* resolveProperties */.k_)({
							filter: this._getFilter(filter)
						});
						const logs = yield this.perform('getLogs', params);
						logs.forEach((log) => {
							if (log.removed == null) {
								log.removed = false;
							}
						});
						return Formatter.arrayOf(this.formatter.filterLog.bind(this.formatter))(logs);
					});
				}
				getEtherPrice() {
					return __awaiter(this, void 0, void 0, function* () {
						yield this.getNetwork();
						return this.perform('getEtherPrice', {});
					});
				}
				_getBlockTag(blockTag) {
					return __awaiter(this, void 0, void 0, function* () {
						blockTag = yield blockTag;
						if (typeof blockTag === 'number' && blockTag < 0) {
							if (blockTag % 1) {
								base_provider_logger.throwArgumentError('invalid BlockTag', 'blockTag', blockTag);
							}
							let blockNumber = yield this._getInternalBlockNumber(100 + 2 * this.pollingInterval);
							blockNumber += blockTag;
							if (blockNumber < 0) {
								blockNumber = 0;
							}
							return this.formatter.blockTag(blockNumber);
						}
						return this.formatter.blockTag(blockTag);
					});
				}
				getResolver(name) {
					return __awaiter(this, void 0, void 0, function* () {
						let currentName = name;
						while (true) {
							if (currentName === '' || currentName === '.') {
								return null;
							}
							// Optimization since the eth node cannot change and does
							// not have a wildcard resolver
							if (name !== 'eth' && currentName === 'eth') {
								return null;
							}
							// Check the current node for a resolver
							const addr = yield this._getResolver(currentName, 'getResolver');
							// Found a resolver!
							if (addr != null) {
								const resolver = new Resolver(this, addr, name);
								// Legacy resolver found, using EIP-2544 so it isn't safe to use
								if (currentName !== name && !(yield resolver.supportsWildcard())) {
									return null;
								}
								return resolver;
							}
							// Get the parent node
							currentName = currentName.split('.').slice(1).join('.');
						}
					});
				}
				_getResolver(name, operation) {
					return __awaiter(this, void 0, void 0, function* () {
						if (operation == null) {
							operation = 'ENS';
						}
						const network = yield this.getNetwork();
						// No ENS...
						if (!network.ensAddress) {
							base_provider_logger.throwError(
								'network does not support ENS',
								logger_lib_esm /* Logger */.Vy.errors.UNSUPPORTED_OPERATION,
								{ operation, network: network.name }
							);
						}
						try {
							// keccak256("resolver(bytes32)")
							const addrData = yield this.call({
								to: network.ensAddress,
								data: '0x0178b8bf' + namehash(name).substring(2)
							});
							return this.formatter.callAddress(addrData);
						} catch (error) {
							// ENS registry cannot throw errors on resolver(bytes32)
						}
						return null;
					});
				}
				resolveName(name) {
					return __awaiter(this, void 0, void 0, function* () {
						name = yield name;
						// If it is already an address, nothing to resolve
						try {
							return Promise.resolve(this.formatter.address(name));
						} catch (error) {
							// If is is a hexstring, the address is bad (See #694)
							if ((0, bytes_lib_esm /* isHexString */.Lo)(name)) {
								throw error;
							}
						}
						if (typeof name !== 'string') {
							base_provider_logger.throwArgumentError('invalid ENS name', 'name', name);
						}
						// Get the addr from the resolver
						const resolver = yield this.getResolver(name);
						if (!resolver) {
							return null;
						}
						return yield resolver.getAddress();
					});
				}
				lookupAddress(address) {
					return __awaiter(this, void 0, void 0, function* () {
						address = yield address;
						address = this.formatter.address(address);
						const node = address.substring(2).toLowerCase() + '.addr.reverse';
						const resolverAddr = yield this._getResolver(node, 'lookupAddress');
						if (resolverAddr == null) {
							return null;
						}
						// keccak("name(bytes32)")
						const name = _parseString(
							yield this.call({
								to: resolverAddr,
								data: '0x691f3431' + namehash(node).substring(2)
							}),
							0
						);
						const addr = yield this.resolveName(name);
						if (addr != address) {
							return null;
						}
						return name;
					});
				}
				getAvatar(nameOrAddress) {
					return __awaiter(this, void 0, void 0, function* () {
						let resolver = null;
						if ((0, bytes_lib_esm /* isHexString */.Lo)(nameOrAddress)) {
							// Address; reverse lookup
							const address = this.formatter.address(nameOrAddress);
							const node = address.substring(2).toLowerCase() + '.addr.reverse';
							const resolverAddress = yield this._getResolver(node, 'getAvatar');
							if (!resolverAddress) {
								return null;
							}
							// Try resolving the avatar against the addr.reverse resolver
							resolver = new Resolver(this, resolverAddress, node);
							try {
								const avatar = yield resolver.getAvatar();
								if (avatar) {
									return avatar.url;
								}
							} catch (error) {
								if (error.code !== logger_lib_esm /* Logger */.Vy.errors.CALL_EXCEPTION) {
									throw error;
								}
							}
							// Try getting the name and performing forward lookup; allowing wildcards
							try {
								// keccak("name(bytes32)")
								const name = _parseString(
									yield this.call({
										to: resolverAddress,
										data: '0x691f3431' + namehash(node).substring(2)
									}),
									0
								);
								resolver = yield this.getResolver(name);
							} catch (error) {
								if (error.code !== logger_lib_esm /* Logger */.Vy.errors.CALL_EXCEPTION) {
									throw error;
								}
								return null;
							}
						} else {
							// ENS name; forward lookup with wildcard
							resolver = yield this.getResolver(nameOrAddress);
							if (!resolver) {
								return null;
							}
						}
						const avatar = yield resolver.getAvatar();
						if (avatar == null) {
							return null;
						}
						return avatar.url;
					});
				}
				perform(method, params) {
					return base_provider_logger.throwError(
						method + ' not implemented',
						logger_lib_esm /* Logger */.Vy.errors.NOT_IMPLEMENTED,
						{ operation: method }
					);
				}
				_startEvent(event) {
					this.polling = this._events.filter((e) => e.pollable()).length > 0;
				}
				_stopEvent(event) {
					this.polling = this._events.filter((e) => e.pollable()).length > 0;
				}
				_addEventListener(eventName, listener, once) {
					const event = new Event(getEventTag(eventName), listener, once);
					this._events.push(event);
					this._startEvent(event);
					return this;
				}
				on(eventName, listener) {
					return this._addEventListener(eventName, listener, false);
				}
				once(eventName, listener) {
					return this._addEventListener(eventName, listener, true);
				}
				emit(eventName, ...args) {
					let result = false;
					let stopped = [];
					let eventTag = getEventTag(eventName);
					this._events = this._events.filter((event) => {
						if (event.tag !== eventTag) {
							return true;
						}
						setTimeout(() => {
							event.listener.apply(this, args);
						}, 0);
						result = true;
						if (event.once) {
							stopped.push(event);
							return false;
						}
						return true;
					});
					stopped.forEach((event) => {
						this._stopEvent(event);
					});
					return result;
				}
				listenerCount(eventName) {
					if (!eventName) {
						return this._events.length;
					}
					let eventTag = getEventTag(eventName);
					return this._events.filter((event) => {
						return event.tag === eventTag;
					}).length;
				}
				listeners(eventName) {
					if (eventName == null) {
						return this._events.map((event) => event.listener);
					}
					let eventTag = getEventTag(eventName);
					return this._events
						.filter((event) => event.tag === eventTag)
						.map((event) => event.listener);
				}
				off(eventName, listener) {
					if (listener == null) {
						return this.removeAllListeners(eventName);
					}
					const stopped = [];
					let found = false;
					let eventTag = getEventTag(eventName);
					this._events = this._events.filter((event) => {
						if (event.tag !== eventTag || event.listener != listener) {
							return true;
						}
						if (found) {
							return true;
						}
						found = true;
						stopped.push(event);
						return false;
					});
					stopped.forEach((event) => {
						this._stopEvent(event);
					});
					return this;
				}
				removeAllListeners(eventName) {
					let stopped = [];
					if (eventName == null) {
						stopped = this._events;
						this._events = [];
					} else {
						const eventTag = getEventTag(eventName);
						this._events = this._events.filter((event) => {
							if (event.tag !== eventTag) {
								return true;
							}
							stopped.push(event);
							return false;
						});
					}
					stopped.forEach((event) => {
						this._stopEvent(event);
					});
					return this;
				}
			} // ../../node_modules/.pnpm/@ethersproject+providers@5.7.2_bufferutil@4.0.8_utf-8-validate@5.0.10/node_modules/@ethersproject/providers/lib.esm/json-rpc-provider.js
			//# sourceMappingURL=base-provider.js.map
			var json_rpc_provider_awaiter =
				(undefined && undefined.__awaiter) ||
				function (thisArg, _arguments, P, generator) {
					function adopt(value) {
						return value instanceof P
							? value
							: new P(function (resolve) {
									resolve(value);
								});
					}
					return new (P || (P = Promise))(function (resolve, reject) {
						function fulfilled(value) {
							try {
								step(generator.next(value));
							} catch (e) {
								reject(e);
							}
						}
						function rejected(value) {
							try {
								step(generator['throw'](value));
							} catch (e) {
								reject(e);
							}
						}
						function step(result) {
							result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
						}
						step((generator = generator.apply(thisArg, _arguments || [])).next());
					});
				};

			const json_rpc_provider_logger = new logger_lib_esm /* Logger */.Vy(_version /* version */.r);

			const errorGas = ['call', 'estimateGas'];
			function spelunk(value, requireData) {
				if (value == null) {
					return null;
				}
				// These *are* the droids we're looking for.
				if (typeof value.message === 'string' && value.message.match('reverted')) {
					const data = (0, bytes_lib_esm /* isHexString */.Lo)(value.data) ? value.data : null;
					if (!requireData || data) {
						return { message: value.message, data };
					}
				}
				// Spelunk further...
				if (typeof value === 'object') {
					for (const key in value) {
						const result = spelunk(value[key], requireData);
						if (result) {
							return result;
						}
					}
					return null;
				}
				// Might be a JSON string we can further descend...
				if (typeof value === 'string') {
					try {
						return spelunk(JSON.parse(value), requireData);
					} catch (error) {}
				}
				return null;
			}
			function checkError(method, error, params) {
				const transaction = params.transaction || params.signedTransaction;
				// Undo the "convenience" some nodes are attempting to prevent backwards
				// incompatibility; maybe for v6 consider forwarding reverts as errors
				if (method === 'call') {
					const result = spelunk(error, true);
					if (result) {
						return result.data;
					}
					// Nothing descriptive..
					json_rpc_provider_logger.throwError(
						'missing revert data in call exception; Transaction reverted without a reason string',
						logger_lib_esm /* Logger */.Vy.errors.CALL_EXCEPTION,
						{
							data: '0x',
							transaction,
							error
						}
					);
				}
				if (method === 'estimateGas') {
					// Try to find something, with a preference on SERVER_ERROR body
					let result = spelunk(error.body, false);
					if (result == null) {
						result = spelunk(error, false);
					}
					// Found "reverted", this is a CALL_EXCEPTION
					if (result) {
						json_rpc_provider_logger.throwError(
							'cannot estimate gas; transaction may fail or may require manual gas limit',
							logger_lib_esm /* Logger */.Vy.errors.UNPREDICTABLE_GAS_LIMIT,
							{
								reason: result.message,
								method,
								transaction,
								error
							}
						);
					}
				}
				// @TODO: Should we spelunk for message too?
				let message = error.message;
				if (
					error.code === logger_lib_esm /* Logger */.Vy.errors.SERVER_ERROR &&
					error.error &&
					typeof error.error.message === 'string'
				) {
					message = error.error.message;
				} else if (typeof error.body === 'string') {
					message = error.body;
				} else if (typeof error.responseText === 'string') {
					message = error.responseText;
				}
				message = (message || '').toLowerCase();
				// "insufficient funds for gas * price + value + cost(data)"
				if (message.match(/insufficient funds|base fee exceeds gas limit|InsufficientFunds/i)) {
					json_rpc_provider_logger.throwError(
						'insufficient funds for intrinsic transaction cost',
						logger_lib_esm /* Logger */.Vy.errors.INSUFFICIENT_FUNDS,
						{
							error,
							method,
							transaction
						}
					);
				}
				// "nonce too low"
				if (message.match(/nonce (is )?too low/i)) {
					json_rpc_provider_logger.throwError(
						'nonce has already been used',
						logger_lib_esm /* Logger */.Vy.errors.NONCE_EXPIRED,
						{
							error,
							method,
							transaction
						}
					);
				}
				// "replacement transaction underpriced"
				if (message.match(/replacement transaction underpriced|transaction gas price.*too low/i)) {
					json_rpc_provider_logger.throwError(
						'replacement fee too low',
						logger_lib_esm /* Logger */.Vy.errors.REPLACEMENT_UNDERPRICED,
						{
							error,
							method,
							transaction
						}
					);
				}
				// "replacement transaction underpriced"
				if (message.match(/only replay-protected/i)) {
					json_rpc_provider_logger.throwError(
						'legacy pre-eip-155 transactions not supported',
						logger_lib_esm /* Logger */.Vy.errors.UNSUPPORTED_OPERATION,
						{
							error,
							method,
							transaction
						}
					);
				}
				if (
					errorGas.indexOf(method) >= 0 &&
					message.match(
						/gas required exceeds allowance|always failing transaction|execution reverted|revert/
					)
				) {
					json_rpc_provider_logger.throwError(
						'cannot estimate gas; transaction may fail or may require manual gas limit',
						logger_lib_esm /* Logger */.Vy.errors.UNPREDICTABLE_GAS_LIMIT,
						{
							error,
							method,
							transaction
						}
					);
				}
				throw error;
			}
			function timer(timeout) {
				return new Promise(function (resolve) {
					setTimeout(resolve, timeout);
				});
			}
			function getResult(payload) {
				if (payload.error) {
					// @TODO: not any
					const error = new Error(payload.error.message);
					error.code = payload.error.code;
					error.data = payload.error.data;
					throw error;
				}
				return payload.result;
			}
			function getLowerCase(value) {
				if (value) {
					return value.toLowerCase();
				}
				return value;
			}
			const _constructorGuard = {};
			class JsonRpcSigner extends lib_esm /* Signer */.l {
				constructor(constructorGuard, provider, addressOrIndex) {
					super();
					if (constructorGuard !== _constructorGuard) {
						throw new Error(
							'do not call the JsonRpcSigner constructor directly; use provider.getSigner'
						);
					}
					(0, properties_lib_esm /* defineReadOnly */.yY)(this, 'provider', provider);
					if (addressOrIndex == null) {
						addressOrIndex = 0;
					}
					if (typeof addressOrIndex === 'string') {
						(0, properties_lib_esm /* defineReadOnly */.yY)(
							this,
							'_address',
							this.provider.formatter.address(addressOrIndex)
						);
						(0, properties_lib_esm /* defineReadOnly */.yY)(this, '_index', null);
					} else if (typeof addressOrIndex === 'number') {
						(0, properties_lib_esm /* defineReadOnly */.yY)(this, '_index', addressOrIndex);
						(0, properties_lib_esm /* defineReadOnly */.yY)(this, '_address', null);
					} else {
						json_rpc_provider_logger.throwArgumentError(
							'invalid address or index',
							'addressOrIndex',
							addressOrIndex
						);
					}
				}
				connect(provider) {
					return json_rpc_provider_logger.throwError(
						'cannot alter JSON-RPC Signer connection',
						logger_lib_esm /* Logger */.Vy.errors.UNSUPPORTED_OPERATION,
						{
							operation: 'connect'
						}
					);
				}
				connectUnchecked() {
					return new UncheckedJsonRpcSigner(
						_constructorGuard,
						this.provider,
						this._address || this._index
					);
				}
				getAddress() {
					if (this._address) {
						return Promise.resolve(this._address);
					}
					return this.provider.send('eth_accounts', []).then((accounts) => {
						if (accounts.length <= this._index) {
							json_rpc_provider_logger.throwError(
								'unknown account #' + this._index,
								logger_lib_esm /* Logger */.Vy.errors.UNSUPPORTED_OPERATION,
								{
									operation: 'getAddress'
								}
							);
						}
						return this.provider.formatter.address(accounts[this._index]);
					});
				}
				sendUncheckedTransaction(transaction) {
					transaction = (0, properties_lib_esm /* shallowCopy */.Ic)(transaction);
					const fromAddress = this.getAddress().then((address) => {
						if (address) {
							address = address.toLowerCase();
						}
						return address;
					});
					// The JSON-RPC for eth_sendTransaction uses 90000 gas; if the user
					// wishes to use this, it is easy to specify explicitly, otherwise
					// we look it up for them.
					if (transaction.gasLimit == null) {
						const estimate = (0, properties_lib_esm /* shallowCopy */.Ic)(transaction);
						estimate.from = fromAddress;
						transaction.gasLimit = this.provider.estimateGas(estimate);
					}
					if (transaction.to != null) {
						transaction.to = Promise.resolve(transaction.to).then((to) =>
							json_rpc_provider_awaiter(this, void 0, void 0, function* () {
								if (to == null) {
									return null;
								}
								const address = yield this.provider.resolveName(to);
								if (address == null) {
									json_rpc_provider_logger.throwArgumentError(
										'provided ENS name resolves to null',
										'tx.to',
										to
									);
								}
								return address;
							})
						);
					}
					return (0, properties_lib_esm /* resolveProperties */.k_)({
						tx: (0, properties_lib_esm /* resolveProperties */.k_)(transaction),
						sender: fromAddress
					}).then(({ tx, sender }) => {
						if (tx.from != null) {
							if (tx.from.toLowerCase() !== sender) {
								json_rpc_provider_logger.throwArgumentError(
									'from address mismatch',
									'transaction',
									transaction
								);
							}
						} else {
							tx.from = sender;
						}
						const hexTx = this.provider.constructor.hexlifyTransaction(tx, { from: true });
						return this.provider.send('eth_sendTransaction', [hexTx]).then(
							(hash) => {
								return hash;
							},
							(error) => {
								if (typeof error.message === 'string' && error.message.match(/user denied/i)) {
									json_rpc_provider_logger.throwError(
										'user rejected transaction',
										logger_lib_esm /* Logger */.Vy.errors.ACTION_REJECTED,
										{
											action: 'sendTransaction',
											transaction: tx
										}
									);
								}
								return checkError('sendTransaction', error, hexTx);
							}
						);
					});
				}
				signTransaction(transaction) {
					return json_rpc_provider_logger.throwError(
						'signing transactions is unsupported',
						logger_lib_esm /* Logger */.Vy.errors.UNSUPPORTED_OPERATION,
						{
							operation: 'signTransaction'
						}
					);
				}
				sendTransaction(transaction) {
					return json_rpc_provider_awaiter(this, void 0, void 0, function* () {
						// This cannot be mined any earlier than any recent block
						const blockNumber = yield this.provider._getInternalBlockNumber(
							100 + 2 * this.provider.pollingInterval
						);
						// Send the transaction
						const hash = yield this.sendUncheckedTransaction(transaction);
						try {
							// Unfortunately, JSON-RPC only provides and opaque transaction hash
							// for a response, and we need the actual transaction, so we poll
							// for it; it should show up very quickly
							return yield (0, web_lib_esm /* poll */.wt)(
								() =>
									json_rpc_provider_awaiter(this, void 0, void 0, function* () {
										const tx = yield this.provider.getTransaction(hash);
										if (tx === null) {
											return undefined;
										}
										return this.provider._wrapTransaction(tx, hash, blockNumber);
									}),
								{ oncePoll: this.provider }
							);
						} catch (error) {
							error.transactionHash = hash;
							throw error;
						}
					});
				}
				signMessage(message) {
					return json_rpc_provider_awaiter(this, void 0, void 0, function* () {
						const data =
							typeof message === 'string' ? (0, utf8 /* toUtf8Bytes */.YW)(message) : message;
						const address = yield this.getAddress();
						try {
							return yield this.provider.send('personal_sign', [
								(0, bytes_lib_esm /* hexlify */.c$)(data),
								address.toLowerCase()
							]);
						} catch (error) {
							if (typeof error.message === 'string' && error.message.match(/user denied/i)) {
								json_rpc_provider_logger.throwError(
									'user rejected signing',
									logger_lib_esm /* Logger */.Vy.errors.ACTION_REJECTED,
									{
										action: 'signMessage',
										from: address,
										messageData: message
									}
								);
							}
							throw error;
						}
					});
				}
				_legacySignMessage(message) {
					return json_rpc_provider_awaiter(this, void 0, void 0, function* () {
						const data =
							typeof message === 'string' ? (0, utf8 /* toUtf8Bytes */.YW)(message) : message;
						const address = yield this.getAddress();
						try {
							// https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_sign
							return yield this.provider.send('eth_sign', [
								address.toLowerCase(),
								(0, bytes_lib_esm /* hexlify */.c$)(data)
							]);
						} catch (error) {
							if (typeof error.message === 'string' && error.message.match(/user denied/i)) {
								json_rpc_provider_logger.throwError(
									'user rejected signing',
									logger_lib_esm /* Logger */.Vy.errors.ACTION_REJECTED,
									{
										action: '_legacySignMessage',
										from: address,
										messageData: message
									}
								);
							}
							throw error;
						}
					});
				}
				_signTypedData(domain, types, value) {
					return json_rpc_provider_awaiter(this, void 0, void 0, function* () {
						// Populate any ENS names (in-place)
						const populated = yield typed_data /* TypedDataEncoder */.z
							.resolveNames(domain, types, value, (name) => {
								return this.provider.resolveName(name);
							});
						const address = yield this.getAddress();
						try {
							return yield this.provider.send('eth_signTypedData_v4', [
								address.toLowerCase(),
								JSON.stringify(
									typed_data /* TypedDataEncoder */.z
										.getPayload(populated.domain, types, populated.value)
								)
							]);
						} catch (error) {
							if (typeof error.message === 'string' && error.message.match(/user denied/i)) {
								json_rpc_provider_logger.throwError(
									'user rejected signing',
									logger_lib_esm /* Logger */.Vy.errors.ACTION_REJECTED,
									{
										action: '_signTypedData',
										from: address,
										messageData: { domain: populated.domain, types, value: populated.value }
									}
								);
							}
							throw error;
						}
					});
				}
				unlock(password) {
					return json_rpc_provider_awaiter(this, void 0, void 0, function* () {
						const provider = this.provider;
						const address = yield this.getAddress();
						return provider.send('personal_unlockAccount', [address.toLowerCase(), password, null]);
					});
				}
			}
			class UncheckedJsonRpcSigner extends JsonRpcSigner {
				sendTransaction(transaction) {
					return this.sendUncheckedTransaction(transaction).then((hash) => {
						return {
							hash: hash,
							nonce: null,
							gasLimit: null,
							gasPrice: null,
							data: null,
							value: null,
							chainId: null,
							confirmations: 0,
							from: null,
							wait: (confirmations) => {
								return this.provider.waitForTransaction(hash, confirmations);
							}
						};
					});
				}
			}
			const allowedTransactionKeys = {
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
				constructor(url, network) {
					let networkOrReady = network;
					// The network is unknown, query the JSON-RPC for it
					if (networkOrReady == null) {
						networkOrReady = new Promise((resolve, reject) => {
							setTimeout(() => {
								this.detectNetwork().then(
									(network) => {
										resolve(network);
									},
									(error) => {
										reject(error);
									}
								);
							}, 0);
						});
					}
					super(networkOrReady);
					// Default URL
					if (!url) {
						url = (0, properties_lib_esm /* getStatic */.$J)(this.constructor, 'defaultUrl')();
					}
					if (typeof url === 'string') {
						(0, properties_lib_esm /* defineReadOnly */.yY)(
							this,
							'connection',
							Object.freeze({
								url: url
							})
						);
					} else {
						(0, properties_lib_esm /* defineReadOnly */.yY)(
							this,
							'connection',
							Object.freeze((0, properties_lib_esm /* shallowCopy */.Ic)(url))
						);
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
					return 'http:/\/localhost:8545';
				}
				detectNetwork() {
					if (!this._cache['detectNetwork']) {
						this._cache['detectNetwork'] = this._uncachedDetectNetwork();
						// Clear this cache at the beginning of the next event loop
						setTimeout(() => {
							this._cache['detectNetwork'] = null;
						}, 0);
					}
					return this._cache['detectNetwork'];
				}
				_uncachedDetectNetwork() {
					return json_rpc_provider_awaiter(this, void 0, void 0, function* () {
						yield timer(0);
						let chainId = null;
						try {
							chainId = yield this.send('eth_chainId', []);
						} catch (error) {
							try {
								chainId = yield this.send('net_version', []);
							} catch (error) {}
						}
						if (chainId != null) {
							const getNetwork = (0, properties_lib_esm /* getStatic */.$J)(
								this.constructor,
								'getNetwork'
							);
							try {
								return getNetwork(
									bignumber /* BigNumber */.gH
										.from(chainId)
										.toNumber()
								);
							} catch (error) {
								return json_rpc_provider_logger.throwError(
									'could not detect network',
									logger_lib_esm /* Logger */.Vy.errors.NETWORK_ERROR,
									{
										chainId: chainId,
										event: 'invalidNetwork',
										serverError: error
									}
								);
							}
						}
						return json_rpc_provider_logger.throwError(
							'could not detect network',
							logger_lib_esm /* Logger */.Vy.errors.NETWORK_ERROR,
							{
								event: 'noNetwork'
							}
						);
					});
				}
				getSigner(addressOrIndex) {
					return new JsonRpcSigner(_constructorGuard, this, addressOrIndex);
				}
				getUncheckedSigner(addressOrIndex) {
					return this.getSigner(addressOrIndex).connectUnchecked();
				}
				listAccounts() {
					return this.send('eth_accounts', []).then((accounts) => {
						return accounts.map((a) => this.formatter.address(a));
					});
				}
				send(method, params) {
					const request = {
						method: method,
						params: params,
						id: this._nextId++,
						jsonrpc: '2.0'
					};
					this.emit('debug', {
						action: 'request',
						request: (0, properties_lib_esm /* deepCopy */.A4)(request),
						provider: this
					});
					// We can expand this in the future to any call, but for now these
					// are the biggest wins and do not require any serializing parameters.
					const cache = ['eth_chainId', 'eth_blockNumber'].indexOf(method) >= 0;
					if (cache && this._cache[method]) {
						return this._cache[method];
					}
					const result = (0, web_lib_esm /* fetchJson */.x6)(
						this.connection,
						JSON.stringify(request),
						getResult
					).then(
						(result) => {
							this.emit('debug', {
								action: 'response',
								request: request,
								response: result,
								provider: this
							});
							return result;
						},
						(error) => {
							this.emit('debug', {
								action: 'response',
								error: error,
								request: request,
								provider: this
							});
							throw error;
						}
					);
					// Cache the fetch, but clear it on the next event loop
					if (cache) {
						this._cache[method] = result;
						setTimeout(() => {
							this._cache[method] = null;
						}, 0);
					}
					return result;
				}
				prepareRequest(method, params) {
					switch (method) {
						case 'getBlockNumber':
							return ['eth_blockNumber', []];
						case 'getGasPrice':
							return ['eth_gasPrice', []];
						case 'getBalance':
							return ['eth_getBalance', [getLowerCase(params.address), params.blockTag]];
						case 'getTransactionCount':
							return ['eth_getTransactionCount', [getLowerCase(params.address), params.blockTag]];
						case 'getCode':
							return ['eth_getCode', [getLowerCase(params.address), params.blockTag]];
						case 'getStorageAt':
							return [
								'eth_getStorageAt',
								[
									getLowerCase(params.address),
									(0, bytes_lib_esm /* hexZeroPad */.bj)(params.position, 32),
									params.blockTag
								]
							];
						case 'sendTransaction':
							return ['eth_sendRawTransaction', [params.signedTransaction]];
						case 'getBlock':
							if (params.blockTag) {
								return ['eth_getBlockByNumber', [params.blockTag, !!params.includeTransactions]];
							} else if (params.blockHash) {
								return ['eth_getBlockByHash', [params.blockHash, !!params.includeTransactions]];
							}
							return null;
						case 'getTransaction':
							return ['eth_getTransactionByHash', [params.transactionHash]];
						case 'getTransactionReceipt':
							return ['eth_getTransactionReceipt', [params.transactionHash]];
						case 'call': {
							const hexlifyTransaction = (0, properties_lib_esm /* getStatic */.$J)(
								this.constructor,
								'hexlifyTransaction'
							);
							return [
								'eth_call',
								[hexlifyTransaction(params.transaction, { from: true }), params.blockTag]
							];
						}
						case 'estimateGas': {
							const hexlifyTransaction = (0, properties_lib_esm /* getStatic */.$J)(
								this.constructor,
								'hexlifyTransaction'
							);
							return ['eth_estimateGas', [hexlifyTransaction(params.transaction, { from: true })]];
						}
						case 'getLogs':
							if (params.filter && params.filter.address != null) {
								params.filter.address = getLowerCase(params.filter.address);
							}
							return ['eth_getLogs', [params.filter]];
						default:
							break;
					}
					return null;
				}
				perform(method, params) {
					return json_rpc_provider_awaiter(this, void 0, void 0, function* () {
						// Legacy networks do not like the type field being passed along (which
						// is fair), so we delete type if it is 0 and a non-EIP-1559 network
						if (method === 'call' || method === 'estimateGas') {
							const tx = params.transaction;
							if (
								tx &&
								tx.type != null &&
								bignumber /* BigNumber */.gH
									.from(tx.type)
									.isZero()
							) {
								// If there are no EIP-1559 properties, it might be non-EIP-1559
								if (tx.maxFeePerGas == null && tx.maxPriorityFeePerGas == null) {
									const feeData = yield this.getFeeData();
									if (feeData.maxFeePerGas == null && feeData.maxPriorityFeePerGas == null) {
										// Network doesn't know about EIP-1559 (and hence type)
										params = (0, properties_lib_esm /* shallowCopy */.Ic)(params);
										params.transaction = (0, properties_lib_esm /* shallowCopy */.Ic)(tx);
										delete params.transaction.type;
									}
								}
							}
						}
						const args = this.prepareRequest(method, params);
						if (args == null) {
							json_rpc_provider_logger.throwError(
								method + ' not implemented',
								logger_lib_esm /* Logger */.Vy.errors.NOT_IMPLEMENTED,
								{ operation: method }
							);
						}
						try {
							return yield this.send(args[0], args[1]);
						} catch (error) {
							return checkError(method, error, params);
						}
					});
				}
				_startEvent(event) {
					if (event.tag === 'pending') {
						this._startPending();
					}
					super._startEvent(event);
				}
				_startPending() {
					if (this._pendingFilter != null) {
						return;
					}
					const self = this;
					const pendingFilter = this.send('eth_newPendingTransactionFilter', []);
					this._pendingFilter = pendingFilter;
					pendingFilter
						.then(function (filterId) {
							function poll() {
								self
									.send('eth_getFilterChanges', [filterId])
									.then(function (hashes) {
										if (self._pendingFilter != pendingFilter) {
											return null;
										}
										let seq = Promise.resolve();
										hashes.forEach(function (hash) {
											// @TODO: This should be garbage collected at some point... How? When?
											self._emitted['t:' + hash.toLowerCase()] = 'pending';
											seq = seq.then(function () {
												return self.getTransaction(hash).then(function (tx) {
													self.emit('pending', tx);
													return null;
												});
											});
										});
										return seq.then(function () {
											return timer(1000);
										});
									})
									.then(function () {
										if (self._pendingFilter != pendingFilter) {
											self.send('eth_uninstallFilter', [filterId]);
											return;
										}
										setTimeout(function () {
											poll();
										}, 0);
										return null;
									})
									.catch((error) => {});
							}
							poll();
							return filterId;
						})
						.catch((error) => {});
				}
				_stopEvent(event) {
					if (event.tag === 'pending' && this.listenerCount('pending') === 0) {
						this._pendingFilter = null;
					}
					super._stopEvent(event);
				}
				// Convert an ethers.js transaction into a JSON-RPC transaction
				//  - gasLimit => gas
				//  - All values hexlified
				//  - All numeric values zero-striped
				//  - All addresses are lowercased
				// NOTE: This allows a TransactionRequest, but all values should be resolved
				//       before this is called
				// @TODO: This will likely be removed in future versions and prepareRequest
				//        will be the preferred method for this.
				static hexlifyTransaction(transaction, allowExtra) {
					// Check only allowed properties are given
					const allowed = (0, properties_lib_esm /* shallowCopy */.Ic)(allowedTransactionKeys);
					if (allowExtra) {
						for (const key in allowExtra) {
							if (allowExtra[key]) {
								allowed[key] = true;
							}
						}
					}
					(0, properties_lib_esm /* checkProperties */.qN)(transaction, allowed);
					const result = {};
					// JSON-RPC now requires numeric values to be "quantity" values
					[
						'chainId',
						'gasLimit',
						'gasPrice',
						'type',
						'maxFeePerGas',
						'maxPriorityFeePerGas',
						'nonce',
						'value'
					].forEach(function (key) {
						if (transaction[key] == null) {
							return;
						}
						const value = (0, bytes_lib_esm /* hexValue */.Fh)(
							bignumber /* BigNumber */.gH
								.from(transaction[key])
						);
						if (key === 'gasLimit') {
							key = 'gas';
						}
						result[key] = value;
					});
					['from', 'to', 'data'].forEach(function (key) {
						if (transaction[key] == null) {
							return;
						}
						result[key] = (0, bytes_lib_esm /* hexlify */.c$)(transaction[key]);
					});
					if (transaction.accessList) {
						result['accessList'] = (0, transactions_lib_esm /* accessListify */.$2)(
							transaction.accessList
						);
					}
					return result;
				}
			}
			//# sourceMappingURL=json-rpc-provider.js.map

			/***/
		},

		/***/ 9949: /***/ (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
			__webpack_require__.r(__webpack_exports__);
			/* harmony export */ __webpack_require__.d(__webpack_exports__, {
				/* harmony export */ AlchemyProvider: () => /* binding */ AlchemyProvider
				/* harmony export */
			});
			/* harmony import */ var _index_87e431aa_js__WEBPACK_IMPORTED_MODULE_0__ =
				__webpack_require__(9764);
			/* harmony import */ var _ethersproject_networks__WEBPACK_IMPORTED_MODULE_3__ =
				__webpack_require__(9187);
			/* harmony import */ var _ethersproject_providers__WEBPACK_IMPORTED_MODULE_1__ =
				__webpack_require__(9414);
			/* harmony import */ var _ethersproject_web__WEBPACK_IMPORTED_MODULE_2__ =
				__webpack_require__(8628);

			/** Maximum size of a batch on the rpc provider. */
			const DEFAULT_MAX_REQUEST_BATCH_SIZE = 100;
			/** Timeout interval before the pending batch is sent. */
			const DEFAULT_REQUEST_BATCH_DELAY_MS = 10;
			/**
			 * Internal class to enqueue requests and automatically send/process batches.
			 *
			 * The underlying batching mechanism is loosely based on ethers.js's
			 * `JsonRpcBatchProvider`.
			 *
			 * @internal
			 */
			class RequestBatcher {
				constructor(sendBatchFn, maxBatchSize = DEFAULT_MAX_REQUEST_BATCH_SIZE) {
					this.sendBatchFn = sendBatchFn;
					this.maxBatchSize = maxBatchSize;
					/**
					 * Array of enqueued requests along with the constructed promise handlers for
					 * each request.
					 */
					this.pendingBatch = [];
				}
				/**
				 * Enqueues the provided request. The batch is immediately sent if the maximum
				 * batch size is reached. Otherwise, the request is enqueued onto a batch that
				 * is sent after 10ms.
				 *
				 * Returns a promise that resolves with the result of the request.
				 */
				enqueueRequest(request) {
					return (0, _index_87e431aa_js__WEBPACK_IMPORTED_MODULE_0__._)(
						this,
						void 0,
						void 0,
						function* () {
							const inflightRequest = {
								request,
								resolve: undefined,
								reject: undefined
							};
							const promise = new Promise((resolve, reject) => {
								inflightRequest.resolve = resolve;
								inflightRequest.reject = reject;
							});
							this.pendingBatch.push(inflightRequest);
							if (this.pendingBatch.length === this.maxBatchSize) {
								// Send batch immediately if we are at the maximum batch size.
								void this.sendBatchRequest();
							} else if (!this.pendingBatchTimer) {
								// Schedule batch for next event loop + short duration
								this.pendingBatchTimer = setTimeout(
									() => this.sendBatchRequest(),
									DEFAULT_REQUEST_BATCH_DELAY_MS
								);
							}
							return promise;
						}
					);
				}
				/**
				 * Sends the currently queued batches and resets the batch and timer. Processes
				 * the batched response results back to the original promises.
				 */
				sendBatchRequest() {
					return (0, _index_87e431aa_js__WEBPACK_IMPORTED_MODULE_0__._)(
						this,
						void 0,
						void 0,
						function* () {
							// Get the current batch and clear it, so new requests
							// go into the next batch
							const batch = this.pendingBatch;
							this.pendingBatch = [];
							if (this.pendingBatchTimer) {
								clearTimeout(this.pendingBatchTimer);
								this.pendingBatchTimer = undefined;
							}
							// Get the request as an array of requests
							const request = batch.map((inflight) => inflight.request);
							return this.sendBatchFn(request).then(
								(result) => {
									// For each result, feed it to the correct Promise, depending
									// on whether it was a success or error
									batch.forEach((inflightRequest, index) => {
										const payload = result[index];
										if (payload.error) {
											const error = new Error(payload.error.message);
											error.code = payload.error.code;
											error.data = payload.error.data;
											inflightRequest.reject(error);
										} else {
											inflightRequest.resolve(payload.result);
										}
									});
								},
								(error) => {
									batch.forEach((inflightRequest) => {
										inflightRequest.reject(error);
									});
								}
							);
						}
					);
				}
			}

			/**
			 * SDK's custom implementation of ethers.js's 'AlchemyProvider'.
			 *
			 * Do not call this constructor directly. Instead, instantiate an instance of
			 * {@link Alchemy} and call {@link Alchemy.config.getProvider()}.
			 *
			 * @public
			 */
			class AlchemyProvider extends _ethersproject_providers__WEBPACK_IMPORTED_MODULE_1__ /* .JsonRpcProvider */.F {
				/** @internal */
				constructor(config) {
					// Normalize the API Key to a string.
					const apiKey = AlchemyProvider.getApiKey(config.apiKey);
					// Generate our own connection info with the correct endpoint URLs.
					const alchemyNetwork = AlchemyProvider.getAlchemyNetwork(config.network);
					let connection = AlchemyProvider.getAlchemyConnectionInfo(alchemyNetwork, apiKey, 'http');
					// If a hardcoded url was specified in the config, use that instead of the
					// provided apiKey or network.
					if (config.url !== undefined) {
						connection.url = config.url;
					}
					connection.throttleLimit = config.maxRetries;
					// Add user provided overrides if they exist.
					if (config.connectionInfoOverrides) {
						connection = Object.assign(
							Object.assign({}, connection),
							config.connectionInfoOverrides
						);
					}
					// Normalize the Alchemy named network input to the network names used by
					// ethers. This allows the parent super constructor in JsonRpcProvider to
					// correctly set the network.
					const ethersNetwork = _index_87e431aa_js__WEBPACK_IMPORTED_MODULE_0__.E[alchemyNetwork];
					super(connection, ethersNetwork);
					this.apiKey = config.apiKey;
					this.maxRetries = config.maxRetries;
					this.batchRequests = config.batchRequests;
					// TODO: support individual headers when calling batch
					const batcherConnection = Object.assign(Object.assign({}, this.connection), {
						headers: Object.assign(Object.assign({}, this.connection.headers), {
							'Alchemy-Ethers-Sdk-Method': 'batchSend'
						})
					});
					const sendBatchFn = (requests) => {
						return (0, _ethersproject_web__WEBPACK_IMPORTED_MODULE_2__ /* .fetchJson */.x6)(
							batcherConnection,
							JSON.stringify(requests)
						);
					};
					this.batcher = new RequestBatcher(sendBatchFn);
					this.modifyFormatter();
				}
				/**
				 * Overrides the `UrlJsonRpcProvider.getApiKey` method as implemented by
				 * ethers.js. Returns the API key for an Alchemy provider.
				 *
				 * @internal
				 * @override
				 */
				static getApiKey(apiKey) {
					if (apiKey == null) {
						return _index_87e431aa_js__WEBPACK_IMPORTED_MODULE_0__.D;
					}
					if (apiKey && typeof apiKey !== 'string') {
						throw new Error(`Invalid apiKey '${apiKey}' provided. apiKey must be a string.`);
					}
					return apiKey;
				}
				/**
				 * Overrides the `BaseProvider.getNetwork` method as implemented by ethers.js.
				 *
				 * This override allows the SDK to set the provider's network to values not
				 * yet supported by ethers.js.
				 *
				 * @internal
				 * @override
				 */
				static getNetwork(network) {
					if (
						typeof network === 'string' &&
						network in _index_87e431aa_js__WEBPACK_IMPORTED_MODULE_0__.C
					) {
						return _index_87e431aa_js__WEBPACK_IMPORTED_MODULE_0__.C[network];
					}
					// Call the standard ethers.js getNetwork method for other networks.
					return (0, _ethersproject_networks__WEBPACK_IMPORTED_MODULE_3__ /* .getNetwork */.N)(
						network
					);
				}
				/**
				 * Converts the `Networkish` input to the network enum used by Alchemy.
				 *
				 * @internal
				 */
				static getAlchemyNetwork(network) {
					if (network === undefined) {
						return _index_87e431aa_js__WEBPACK_IMPORTED_MODULE_0__.a;
					}
					if (typeof network === 'number') {
						throw new Error(`Invalid network '${network}' provided. Network must be a string.`);
					}
					// Guaranteed that `typeof network === 'string`.
					const isValidNetwork = Object.values(
						_index_87e431aa_js__WEBPACK_IMPORTED_MODULE_0__.N
					).includes(network);
					if (!isValidNetwork) {
						throw new Error(
							`Invalid network '${network}' provided. Network must be one of: ` +
								`${Object.values(_index_87e431aa_js__WEBPACK_IMPORTED_MODULE_0__.N).join(', ')}.`
						);
					}
					return network;
				}
				/**
				 * Returns a {@link ConnectionInfo} object compatible with ethers that contains
				 * the correct URLs for Alchemy.
				 *
				 * @internal
				 */
				static getAlchemyConnectionInfo(network, apiKey, type) {
					const url =
						type === 'http'
							? (0, _index_87e431aa_js__WEBPACK_IMPORTED_MODULE_0__.g)(network, apiKey)
							: (0, _index_87e431aa_js__WEBPACK_IMPORTED_MODULE_0__.b)(network, apiKey);
					return {
						headers: _index_87e431aa_js__WEBPACK_IMPORTED_MODULE_0__.I
							? {
									'Alchemy-Ethers-Sdk-Version': _index_87e431aa_js__WEBPACK_IMPORTED_MODULE_0__.V
								}
							: {
									'Alchemy-Ethers-Sdk-Version': _index_87e431aa_js__WEBPACK_IMPORTED_MODULE_0__.V,
									'Accept-Encoding': 'gzip'
								},
						allowGzip: true,
						url
					};
				}
				/**
				 * Overrides the method in ethers.js's `StaticJsonRpcProvider` class. This
				 * method is called when calling methods on the parent class `BaseProvider`.
				 *
				 * @override
				 */
				detectNetwork() {
					const _super = Object.create(null, {
						detectNetwork: { get: () => super.detectNetwork }
					});
					return (0, _index_87e431aa_js__WEBPACK_IMPORTED_MODULE_0__._)(
						this,
						void 0,
						void 0,
						function* () {
							let network = this.network;
							if (network == null) {
								network = yield _super.detectNetwork.call(this);
								if (!network) {
									throw new Error('No network detected');
								}
							}
							return network;
						}
					);
				}
				_startPending() {
					(0, _index_87e431aa_js__WEBPACK_IMPORTED_MODULE_0__.l)(
						'WARNING: Alchemy Provider does not support pending filters'
					);
				}
				/**
				 * Overrides the ether's `isCommunityResource()` method. Returns true if the
				 * current api key is the default key.
				 *
				 * @override
				 */
				isCommunityResource() {
					return this.apiKey === _index_87e431aa_js__WEBPACK_IMPORTED_MODULE_0__.D;
				}
				/**
				 * Overrides the base {@link JsonRpcProvider.send} method to implement custom
				 * logic for sending requests to Alchemy.
				 *
				 * @param method The method name to use for the request.
				 * @param params The parameters to use for the request.
				 * @override
				 * @public
				 */
				// TODO: Add headers for `perform()` override.
				send(method, params) {
					return this._send(method, params, 'send');
				}
				/**
				 * DO NOT MODIFY.
				 *
				 * Original code copied over from ether.js's `JsonRpcProvider.send()`.
				 *
				 * This method is copied over directly in order to implement custom headers
				 *
				 * @internal
				 */
				_send(method, params, methodName, forceBatch = false) {
					const request = {
						method,
						params,
						id: this._nextId++,
						jsonrpc: '2.0'
					};
					// START MODIFIED CODE
					const connection = Object.assign({}, this.connection);
					connection.headers['Alchemy-Ethers-Sdk-Method'] = methodName;
					if (this.batchRequests || forceBatch) {
						return this.batcher.enqueueRequest(request);
					}
					// END MODIFIED CODE
					this.emit('debug', {
						action: 'request',
						request: (0, _index_87e431aa_js__WEBPACK_IMPORTED_MODULE_0__.d)(request),
						provider: this
					});
					// We can expand this in the future to any call, but for now these
					// are the biggest wins and do not require any serializing parameters.
					const cache = ['eth_chainId', 'eth_blockNumber'].indexOf(method) >= 0;
					if (cache && this._cache[method]) {
						return this._cache[method];
					}
					const result = (0, _ethersproject_web__WEBPACK_IMPORTED_MODULE_2__ /* .fetchJson */.x6)(
						this.connection,
						JSON.stringify(request),
						getResult
					).then(
						(result) => {
							this.emit('debug', {
								action: 'response',
								request,
								response: result,
								provider: this
							});
							return result;
						},
						(error) => {
							this.emit('debug', {
								action: 'response',
								error,
								request,
								provider: this
							});
							throw error;
						}
					);
					// Cache the fetch, but clear it on the next event loop
					if (cache) {
						this._cache[method] = result;
						setTimeout(() => {
							// @ts-ignore - This is done by ethers.
							this._cache[method] = null;
						}, 0);
					}
					return result;
				}
				/**
				 * Overrides the base `Formatter` class inherited from ethers to support
				 * returning custom fields in Ethers response types.
				 *
				 * For context, ethers has a `Formatter` class that is used to format the
				 * response from a JSON-RPC request. Any fields that are not defined in the
				 * `Formatter` class are removed from the returned response. By modifying the
				 * `Formatter` class in this method, we can add support for fields that are
				 * not defined in ethers.
				 */
				modifyFormatter() {
					this.formatter.formats['receiptLog']['removed'] = (val) => {
						if (typeof val === 'boolean') {
							return val;
						}
						return undefined;
					};
				}
			}
			/**
			 * DO NOT MODIFY.
			 *
			 * Original code copied over from ether.js's
			 * `@ethersproject/web/src.ts/index.ts`. Used to support
			 * {@link AlchemyProvider._send}, which is also copied over.
			 */
			function getResult(payload) {
				if (payload.error) {
					const error = new Error(payload.error.message);
					error.code = payload.error.code;
					error.data = payload.error.data;
					throw error;
				}
				return payload.result;
			}

			//# sourceMappingURL=alchemy-provider-ffcaaa67.js.map

			/***/
		},

		/***/ 5994: /***/ (module) => {
			var ALPHABET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

			// pre-compute lookup table
			var ALPHABET_MAP = {};
			for (var z = 0; z < ALPHABET.length; z++) {
				var x = ALPHABET.charAt(z);

				if (ALPHABET_MAP[x] !== undefined) throw new TypeError(x + ' is ambiguous');
				ALPHABET_MAP[x] = z;
			}

			function polymodStep(pre) {
				var b = pre >> 25;
				return (
					((pre & 0x1ffffff) << 5) ^
					(-((b >> 0) & 1) & 0x3b6a57b2) ^
					(-((b >> 1) & 1) & 0x26508e6d) ^
					(-((b >> 2) & 1) & 0x1ea119fa) ^
					(-((b >> 3) & 1) & 0x3d4233dd) ^
					(-((b >> 4) & 1) & 0x2a1462b3)
				);
			}

			function prefixChk(prefix) {
				var chk = 1;
				for (var i = 0; i < prefix.length; ++i) {
					var c = prefix.charCodeAt(i);
					if (c < 33 || c > 126) return 'Invalid prefix (' + prefix + ')';

					chk = polymodStep(chk) ^ (c >> 5);
				}
				chk = polymodStep(chk);

				for (i = 0; i < prefix.length; ++i) {
					var v = prefix.charCodeAt(i);
					chk = polymodStep(chk) ^ (v & 0x1f);
				}
				return chk;
			}

			function encode(prefix, words, LIMIT) {
				LIMIT = LIMIT || 90;
				if (prefix.length + 7 + words.length > LIMIT) throw new TypeError('Exceeds length limit');

				prefix = prefix.toLowerCase();

				// determine chk mod
				var chk = prefixChk(prefix);
				if (typeof chk === 'string') throw new Error(chk);

				var result = prefix + '1';
				for (var i = 0; i < words.length; ++i) {
					var x = words[i];
					if (x >> 5 !== 0) throw new Error('Non 5-bit word');

					chk = polymodStep(chk) ^ x;
					result += ALPHABET.charAt(x);
				}

				for (i = 0; i < 6; ++i) {
					chk = polymodStep(chk);
				}
				chk ^= 1;

				for (i = 0; i < 6; ++i) {
					var v = (chk >> ((5 - i) * 5)) & 0x1f;
					result += ALPHABET.charAt(v);
				}

				return result;
			}

			function __decode(str, LIMIT) {
				LIMIT = LIMIT || 90;
				if (str.length < 8) return str + ' too short';
				if (str.length > LIMIT) return 'Exceeds length limit';

				// don't allow mixed case
				var lowered = str.toLowerCase();
				var uppered = str.toUpperCase();
				if (str !== lowered && str !== uppered) return 'Mixed-case string ' + str;
				str = lowered;

				var split = str.lastIndexOf('1');
				if (split === -1) return 'No separator character for ' + str;
				if (split === 0) return 'Missing prefix for ' + str;

				var prefix = str.slice(0, split);
				var wordChars = str.slice(split + 1);
				if (wordChars.length < 6) return 'Data too short';

				var chk = prefixChk(prefix);
				if (typeof chk === 'string') return chk;

				var words = [];
				for (var i = 0; i < wordChars.length; ++i) {
					var c = wordChars.charAt(i);
					var v = ALPHABET_MAP[c];
					if (v === undefined) return 'Unknown character ' + c;
					chk = polymodStep(chk) ^ v;

					// not in the checksum?
					if (i + 6 >= wordChars.length) continue;
					words.push(v);
				}

				if (chk !== 1) return 'Invalid checksum for ' + str;
				return { prefix: prefix, words: words };
			}

			function decodeUnsafe() {
				var res = __decode.apply(null, arguments);
				if (typeof res === 'object') return res;
			}

			function decode(str) {
				var res = __decode.apply(null, arguments);
				if (typeof res === 'object') return res;

				throw new Error(res);
			}

			function convert(data, inBits, outBits, pad) {
				var value = 0;
				var bits = 0;
				var maxV = (1 << outBits) - 1;

				var result = [];
				for (var i = 0; i < data.length; ++i) {
					value = (value << inBits) | data[i];
					bits += inBits;

					while (bits >= outBits) {
						bits -= outBits;
						result.push((value >> bits) & maxV);
					}
				}

				if (pad) {
					if (bits > 0) {
						result.push((value << (outBits - bits)) & maxV);
					}
				} else {
					if (bits >= inBits) return 'Excess padding';
					if ((value << (outBits - bits)) & maxV) return 'Non-zero padding';
				}

				return result;
			}

			function toWordsUnsafe(bytes) {
				var res = convert(bytes, 8, 5, true);
				if (Array.isArray(res)) return res;
			}

			function toWords(bytes) {
				var res = convert(bytes, 8, 5, true);
				if (Array.isArray(res)) return res;

				throw new Error(res);
			}

			function fromWordsUnsafe(words) {
				var res = convert(words, 5, 8, false);
				if (Array.isArray(res)) return res;
			}

			function fromWords(words) {
				var res = convert(words, 5, 8, false);
				if (Array.isArray(res)) return res;

				throw new Error(res);
			}

			module.exports = {
				decodeUnsafe: decodeUnsafe,
				decode: decode,
				encode: encode,
				toWordsUnsafe: toWordsUnsafe,
				toWords: toWords,
				fromWordsUnsafe: fromWordsUnsafe,
				fromWords: fromWords
			};

			/***/
		}
	}
]);
