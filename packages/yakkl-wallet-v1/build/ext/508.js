(self['webpackChunkwallet'] = self['webpackChunkwallet'] || []).push([
	[508],
	{
		/***/ 7508: /***/ (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
			'use strict';
			// ESM COMPAT FLAG
			__webpack_require__.r(__webpack_exports__);

			// EXPORTS
			__webpack_require__.d(__webpack_exports__, {
				AlchemyWebSocketProvider: () => /* binding */ AlchemyWebSocketProvider
			});

			// EXTERNAL MODULE: ../../node_modules/alchemy-sdk/dist/esm/index-893f7c9e.js + 21 modules
			var index_893f7c9e = __webpack_require__(7700);
			// EXTERNAL MODULE: ../../node_modules/sturdy-websocket/dist/index.js
			var dist = __webpack_require__(5004);
			// EXTERNAL MODULE: ../../node_modules/@ethersproject/bignumber/lib.esm/bignumber.js
			var bignumber = __webpack_require__(9674);
			// EXTERNAL MODULE: ../../node_modules/@ethersproject/networks/lib.esm/index.js + 1 modules
			var lib_esm = __webpack_require__(9406);
			// EXTERNAL MODULE: ../../node_modules/@ethersproject/properties/lib.esm/index.js + 1 modules
			var properties_lib_esm = __webpack_require__(2428);
			// EXTERNAL MODULE: ../../node_modules/@ethersproject/providers/lib.esm/json-rpc-provider.js + 8 modules
			var json_rpc_provider = __webpack_require__(8814);
			// EXTERNAL MODULE: ../../node_modules/@ethersproject/logger/lib.esm/index.js + 1 modules
			var logger_lib_esm = __webpack_require__(7587);
			// EXTERNAL MODULE: ../../node_modules/@ethersproject/providers/lib.esm/_version.js
			var _version = __webpack_require__(469); // CONCATENATED MODULE: ../../node_modules/@ethersproject/providers/lib.esm/ws.js
			let WS = null;
			try {
				WS = WebSocket;
				if (WS == null) {
					throw new Error('inject please');
				}
			} catch (error) {
				const logger = new logger_lib_esm /* Logger */.Vy(_version /* version */.r);
				WS = function () {
					logger.throwError(
						'WebSockets not supported in this environment',
						logger_lib_esm /* Logger */.Vy.errors.UNSUPPORTED_OPERATION,
						{
							operation: 'new WebSocket()'
						}
					);
				};
			} // CONCATENATED MODULE: ../../node_modules/@ethersproject/providers/lib.esm/websocket-provider.js
			//export default WS;
			//module.exports = WS;

			//# sourceMappingURL=ws.js.map
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

			const logger = new logger_lib_esm /* Logger */.Vy(_version /* version */.r);
			/**
			 *  Notes:
			 *
			 *  This provider differs a bit from the polling providers. One main
			 *  difference is how it handles consistency. The polling providers
			 *  will stall responses to ensure a consistent state, while this
			 *  WebSocket provider assumes the connected backend will manage this.
			 *
			 *  For example, if a polling provider emits an event which indicates
			 *  the event occurred in blockhash XXX, a call to fetch that block by
			 *  its hash XXX, if not present will retry until it is present. This
			 *  can occur when querying a pool of nodes that are mildly out of sync
			 *  with each other.
			 */
			let NextId = 1;
			// For more info about the Real-time Event API see:
			//   https://geth.ethereum.org/docs/rpc/pubsub
			class WebSocketProvider extends json_rpc_provider /* JsonRpcProvider */.F {
				constructor(url, network) {
					// This will be added in the future; please open an issue to expedite
					if (network === 'any') {
						logger.throwError(
							"WebSocketProvider does not support 'any' network yet",
							logger_lib_esm /* Logger */.Vy.errors.UNSUPPORTED_OPERATION,
							{
								operation: 'network:any'
							}
						);
					}
					if (typeof url === 'string') {
						super(url, network);
					} else {
						super('_websocket', network);
					}
					this._pollingInterval = -1;
					this._wsReady = false;
					if (typeof url === 'string') {
						(0, properties_lib_esm /* defineReadOnly */.yY)(
							this,
							'_websocket',
							new WS(this.connection.url)
						);
					} else {
						(0, properties_lib_esm /* defineReadOnly */.yY)(this, '_websocket', url);
					}
					(0, properties_lib_esm /* defineReadOnly */.yY)(this, '_requests', {});
					(0, properties_lib_esm /* defineReadOnly */.yY)(this, '_subs', {});
					(0, properties_lib_esm /* defineReadOnly */.yY)(this, '_subIds', {});
					(0, properties_lib_esm /* defineReadOnly */.yY)(
						this,
						'_detectNetwork',
						super.detectNetwork()
					);
					// Stall sending requests until the socket is open...
					this.websocket.onopen = () => {
						this._wsReady = true;
						Object.keys(this._requests).forEach((id) => {
							this.websocket.send(this._requests[id].payload);
						});
					};
					this.websocket.onmessage = (messageEvent) => {
						const data = messageEvent.data;
						const result = JSON.parse(data);
						if (result.id != null) {
							const id = String(result.id);
							const request = this._requests[id];
							delete this._requests[id];
							if (result.result !== undefined) {
								request.callback(null, result.result);
								this.emit('debug', {
									action: 'response',
									request: JSON.parse(request.payload),
									response: result.result,
									provider: this
								});
							} else {
								let error = null;
								if (result.error) {
									error = new Error(result.error.message || 'unknown error');
									(0, properties_lib_esm /* defineReadOnly */.yY)(
										error,
										'code',
										result.error.code || null
									);
									(0, properties_lib_esm /* defineReadOnly */.yY)(error, 'response', data);
								} else {
									error = new Error('unknown error');
								}
								request.callback(error, undefined);
								this.emit('debug', {
									action: 'response',
									error: error,
									request: JSON.parse(request.payload),
									provider: this
								});
							}
						} else if (result.method === 'eth_subscription') {
							// Subscription...
							const sub = this._subs[result.params.subscription];
							if (sub) {
								//this.emit.apply(this,                  );
								sub.processFunc(result.params.result);
							}
						} else {
							console.warn('this should not happen');
						}
					};
					// This Provider does not actually poll, but we want to trigger
					// poll events for things that depend on them (like stalling for
					// block and transaction lookups)
					const fauxPoll = setInterval(() => {
						this.emit('poll');
					}, 1000);
					if (fauxPoll.unref) {
						fauxPoll.unref();
					}
				}
				// Cannot narrow the type of _websocket, as that is not backwards compatible
				// so we add a getter and let the WebSocket be a public API.
				get websocket() {
					return this._websocket;
				}
				detectNetwork() {
					return this._detectNetwork;
				}
				get pollingInterval() {
					return 0;
				}
				resetEventsBlock(blockNumber) {
					logger.throwError(
						'cannot reset events block on WebSocketProvider',
						logger_lib_esm /* Logger */.Vy.errors.UNSUPPORTED_OPERATION,
						{
							operation: 'resetEventBlock'
						}
					);
				}
				set pollingInterval(value) {
					logger.throwError(
						'cannot set polling interval on WebSocketProvider',
						logger_lib_esm /* Logger */.Vy.errors.UNSUPPORTED_OPERATION,
						{
							operation: 'setPollingInterval'
						}
					);
				}
				poll() {
					return __awaiter(this, void 0, void 0, function* () {
						return null;
					});
				}
				set polling(value) {
					if (!value) {
						return;
					}
					logger.throwError(
						'cannot set polling on WebSocketProvider',
						logger_lib_esm /* Logger */.Vy.errors.UNSUPPORTED_OPERATION,
						{
							operation: 'setPolling'
						}
					);
				}
				send(method, params) {
					const rid = NextId++;
					return new Promise((resolve, reject) => {
						function callback(error, result) {
							if (error) {
								return reject(error);
							}
							return resolve(result);
						}
						const payload = JSON.stringify({
							method: method,
							params: params,
							id: rid,
							jsonrpc: '2.0'
						});
						this.emit('debug', {
							action: 'request',
							request: JSON.parse(payload),
							provider: this
						});
						this._requests[String(rid)] = { callback, payload };
						if (this._wsReady) {
							this.websocket.send(payload);
						}
					});
				}
				static defaultUrl() {
					return 'ws:/\/localhost:8546';
				}
				_subscribe(tag, param, processFunc) {
					return __awaiter(this, void 0, void 0, function* () {
						let subIdPromise = this._subIds[tag];
						if (subIdPromise == null) {
							subIdPromise = Promise.all(param).then((param) => {
								return this.send('eth_subscribe', param);
							});
							this._subIds[tag] = subIdPromise;
						}
						const subId = yield subIdPromise;
						this._subs[subId] = { tag, processFunc };
					});
				}
				_startEvent(event) {
					switch (event.type) {
						case 'block':
							this._subscribe('block', ['newHeads'], (result) => {
								const blockNumber = bignumber /* BigNumber */.gH
									.from(result.number)
									.toNumber();
								this._emitted.block = blockNumber;
								this.emit('block', blockNumber);
							});
							break;
						case 'pending':
							this._subscribe('pending', ['newPendingTransactions'], (result) => {
								this.emit('pending', result);
							});
							break;
						case 'filter':
							this._subscribe(event.tag, ['logs', this._getFilter(event.filter)], (result) => {
								if (result.removed == null) {
									result.removed = false;
								}
								this.emit(event.filter, this.formatter.filterLog(result));
							});
							break;
						case 'tx': {
							const emitReceipt = (event) => {
								const hash = event.hash;
								this.getTransactionReceipt(hash).then((receipt) => {
									if (!receipt) {
										return;
									}
									this.emit(hash, receipt);
								});
							};
							// In case it is already mined
							emitReceipt(event);
							// To keep things simple, we start up a single newHeads subscription
							// to keep an eye out for transactions we are watching for.
							// Starting a subscription for an event (i.e. "tx") that is already
							// running is (basically) a nop.
							this._subscribe('tx', ['newHeads'], (result) => {
								this._events.filter((e) => e.type === 'tx').forEach(emitReceipt);
							});
							break;
						}
						// Nothing is needed
						case 'debug':
						case 'poll':
						case 'willPoll':
						case 'didPoll':
						case 'error':
							break;
						default:
							console.log('unhandled:', event);
							break;
					}
				}
				_stopEvent(event) {
					let tag = event.tag;
					if (event.type === 'tx') {
						// There are remaining transaction event listeners
						if (this._events.filter((e) => e.type === 'tx').length) {
							return;
						}
						tag = 'tx';
					} else if (this.listenerCount(event.event)) {
						// There are remaining event listeners
						return;
					}
					const subId = this._subIds[tag];
					if (!subId) {
						return;
					}
					delete this._subIds[tag];
					subId.then((subId) => {
						if (!this._subs[subId]) {
							return;
						}
						delete this._subs[subId];
						this.send('eth_unsubscribe', [subId]);
					});
				}
				destroy() {
					return __awaiter(this, void 0, void 0, function* () {
						// Wait until we have connected before trying to disconnect
						if (this.websocket.readyState === WS.CONNECTING) {
							yield new Promise((resolve) => {
								this.websocket.onopen = function () {
									resolve(true);
								};
								this.websocket.onerror = function () {
									resolve(false);
								};
							});
						}
						// Hangup
						// See: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent#Status_codes
						this.websocket.close(1000);
					});
				}
			}
			//# sourceMappingURL=websocket-provider.js.map
			// EXTERNAL MODULE: ../../node_modules/alchemy-sdk/dist/esm/alchemy-provider-ac155d2c.js
			var alchemy_provider_ac155d2c = __webpack_require__(6083);
			// EXTERNAL MODULE: ../../node_modules/axios/index.js
			var axios = __webpack_require__(6660); // CONCATENATED MODULE: ../../node_modules/alchemy-sdk/dist/esm/alchemy-websocket-provider-d78b64af.js
			/* provided dependency */ var process = __webpack_require__(9907);

			/**
			 * The maximum number of blocks to backfill. If more than this many blocks have
			 * been missed, then we'll sadly miss data, but we want to make sure we don't
			 * end up requesting thousands of blocks if somebody left their laptop closed for a week.
			 */
			const MAX_BACKFILL_BLOCKS = 120;
			/**
			 * The WebsocketBackfiller fetches events that were sent since a provided block
			 * number. This is used in the {@link AlchemyWebSocketProvider} to backfill
			 * events that were transmitted while the websocket connection was down.
			 *
			 * The backfiller backfills two main eth_subscribe events: `logs` and `newHeads`.
			 *
			 * @internal
			 */
			class WebsocketBackfiller {
				constructor(provider) {
					this.provider = provider;
					// TODO: Use HTTP provider to do backfill.
					this.maxBackfillBlocks = MAX_BACKFILL_BLOCKS;
				}
				/**
				 * Runs backfill for `newHeads` events.
				 *
				 * @param isCancelled Whether the backfill request is cancelled.
				 * @param previousHeads Previous head requests that were sent.
				 * @param fromBlockNumber The block number to start backfilling from.
				 * @returns A list of `newHeads` events that were sent since the last backfill.
				 */
				getNewHeadsBackfill(isCancelled, previousHeads, fromBlockNumber) {
					return (0, index_893f7c9e._)(this, void 0, void 0, function* () {
						throwIfCancelled(isCancelled);
						const toBlockNumber = yield this.getBlockNumber();
						throwIfCancelled(isCancelled);
						// If there are no previous heads to fetch, return new heads since
						// `fromBlockNumber`, or up to maxBackfillBlocks from the current head.
						if (previousHeads.length === 0) {
							return this.getHeadEventsInRange(
								Math.max(fromBlockNumber, toBlockNumber - this.maxBackfillBlocks) + 1,
								toBlockNumber + 1
							);
						}
						// If the last emitted event is too far back in the past, there's no need
						// to backfill for reorgs. Just fetch the last `maxBackfillBlocks` worth of
						// new heads.
						const lastSeenBlockNumber = (0, index_893f7c9e.f)(
							previousHeads[previousHeads.length - 1].number
						);
						const minBlockNumber = toBlockNumber - this.maxBackfillBlocks + 1;
						if (lastSeenBlockNumber <= minBlockNumber) {
							return this.getHeadEventsInRange(minBlockNumber, toBlockNumber + 1);
						}
						// To capture all `newHeads` events, return all head events from the last
						// seen block number to current + any of the previous heads that were re-orged.
						const reorgHeads = yield this.getReorgHeads(isCancelled, previousHeads);
						throwIfCancelled(isCancelled);
						const intermediateHeads = yield this.getHeadEventsInRange(
							lastSeenBlockNumber + 1,
							toBlockNumber + 1
						);
						throwIfCancelled(isCancelled);
						return [...reorgHeads, ...intermediateHeads];
					});
				}
				/**
				 * Runs backfill for `logs` events.
				 *
				 * @param isCancelled Whether the backfill request is cancelled.
				 * @param filter The filter object that accompanies a logs subscription.
				 * @param previousLogs Previous log requests that were sent.
				 * @param fromBlockNumber The block number to start backfilling from.
				 */
				getLogsBackfill(isCancelled, filter, previousLogs, fromBlockNumber) {
					return (0, index_893f7c9e._)(this, void 0, void 0, function* () {
						throwIfCancelled(isCancelled);
						const toBlockNumber = yield this.getBlockNumber();
						throwIfCancelled(isCancelled);
						// If there are no previous logs to fetch, return new logs since
						// `fromBlockNumber`, or up to `maxBackfillBlocks` from the current head.
						if (previousLogs.length === 0) {
							return this.getLogsInRange(
								filter,
								Math.max(fromBlockNumber, toBlockNumber - this.maxBackfillBlocks) + 1,
								toBlockNumber + 1
							);
						}
						// If the last emitted log is too far back in the past, there's no need
						// to backfill for removed logs. Just fetch the last `maxBackfillBlocks`
						// worth of logs.
						const lastSeenBlockNumber = (0, index_893f7c9e.f)(
							previousLogs[previousLogs.length - 1].blockNumber
						);
						const minBlockNumber = toBlockNumber - this.maxBackfillBlocks + 1;
						if (lastSeenBlockNumber < minBlockNumber) {
							return this.getLogsInRange(filter, minBlockNumber, toBlockNumber + 1);
						}
						// Return all log events that have happened along with log events that have
						// been removed due to a chain reorg.
						const commonAncestor = yield this.getCommonAncestor(isCancelled, previousLogs);
						throwIfCancelled(isCancelled);
						// All previous logs with a block number greater than the common ancestor
						// were part of a re-org, so mark them as such.
						const removedLogs = previousLogs
							.filter((log) => (0, index_893f7c9e.f)(log.blockNumber) > commonAncestor.blockNumber)
							.map((log) => Object.assign(Object.assign({}, log), { removed: true }));
						// If no common ancestor was found, start backfill from the oldest log's
						// block number.
						const fromBlockInclusive =
							commonAncestor.blockNumber === Number.NEGATIVE_INFINITY
								? (0, index_893f7c9e.f)(previousLogs[0].blockNumber)
								: commonAncestor.blockNumber;
						let addedLogs = yield this.getLogsInRange(
							filter,
							fromBlockInclusive,
							toBlockNumber + 1
						);
						// De-dupe any logs that were already emitted.
						addedLogs = addedLogs.filter(
							(log) =>
								log &&
								((0, index_893f7c9e.f)(log.blockNumber) > commonAncestor.blockNumber ||
									(0, index_893f7c9e.f)(log.logIndex) > commonAncestor.logIndex)
						);
						throwIfCancelled(isCancelled);
						return [...removedLogs, ...addedLogs];
					});
				}
				/**
				 * Sets a new max backfill blocks. VISIBLE ONLY FOR TESTING.
				 *
				 * @internal
				 */
				setMaxBackfillBlock(newMax) {
					this.maxBackfillBlocks = newMax;
				}
				/**
				 * Gets the current block number as a number.
				 *
				 * @private
				 */
				getBlockNumber() {
					return (0, index_893f7c9e._)(this, void 0, void 0, function* () {
						const blockNumberHex = yield this.provider.send('eth_blockNumber');
						return (0, index_893f7c9e.f)(blockNumberHex);
					});
				}
				/**
				 * Gets all `newHead` events in the provided range. Note that the returned
				 * heads do not include re-orged heads. Use {@link getReorgHeads} to find heads
				 * that were part of a re-org.
				 *
				 * @private
				 */
				getHeadEventsInRange(fromBlockInclusive, toBlockExclusive) {
					return (0, index_893f7c9e._)(this, void 0, void 0, function* () {
						if (fromBlockInclusive >= toBlockExclusive) {
							return [];
						}
						const batchParts = [];
						for (let i = fromBlockInclusive; i < toBlockExclusive; i++) {
							batchParts.push({
								method: 'eth_getBlockByNumber',
								params: [(0, index_893f7c9e.t)(i), false]
							});
						}
						// TODO: handle errors
						const blockHeads = yield this.provider.sendBatch(batchParts);
						return blockHeads.map(toNewHeadsEvent);
					});
				}
				/**
				 * Returns all heads that were part of a reorg event.
				 *
				 * @private
				 */
				getReorgHeads(isCancelled, previousHeads) {
					return (0, index_893f7c9e._)(this, void 0, void 0, function* () {
						const result = [];
						// Iterate from the most recent head backwards in order to find the first
						// block that was part of a re-org.
						for (let i = previousHeads.length - 1; i >= 0; i--) {
							const oldEvent = previousHeads[i];
							const blockHead = yield this.getBlockByNumber((0, index_893f7c9e.f)(oldEvent.number));
							throwIfCancelled(isCancelled);
							// If the hashes match, then current head in the iteration was not re-orged.
							if (oldEvent.hash === blockHead.hash) {
								break;
							}
							result.push(toNewHeadsEvent(blockHead));
						}
						return result.reverse();
					});
				}
				/**
				 * Simple wrapper around `eth_getBlockByNumber` that returns the complete
				 * block information for the provided block number.
				 *
				 * @private
				 */
				getBlockByNumber(blockNumber) {
					return (0, index_893f7c9e._)(this, void 0, void 0, function* () {
						return this.provider.send('eth_getBlockByNumber', [
							(0, index_893f7c9e.t)(blockNumber),
							false
						]);
					});
				}
				/**
				 * Given a list of previous log events, finds the common block number from the
				 * logs that matches the block head.
				 *
				 * This can be used to identify which logs are part of a re-org.
				 *
				 * Returns 1 less than the oldest log's block number if no common ancestor was found.
				 *
				 * @private
				 */
				getCommonAncestor(isCancelled, previousLogs) {
					return (0, index_893f7c9e._)(this, void 0, void 0, function* () {
						// Iterate from the most recent head backwards in order to find the first
						// block that was part of a re-org.
						let blockHead = yield this.getBlockByNumber(
							(0, index_893f7c9e.f)(previousLogs[previousLogs.length - 1].blockNumber)
						);
						throwIfCancelled(isCancelled);
						for (let i = previousLogs.length - 1; i >= 0; i--) {
							const oldLog = previousLogs[i];
							// Ensure that updated blocks are fetched every time the log's block number
							// changes.
							if (oldLog.blockNumber !== blockHead.number) {
								blockHead = yield this.getBlockByNumber((0, index_893f7c9e.f)(oldLog.blockNumber));
							}
							// Since logs are ordered in ascending order, the first log that matches
							// the hash should be the largest logIndex.
							if (oldLog.blockHash === blockHead.hash) {
								return {
									blockNumber: (0, index_893f7c9e.f)(oldLog.blockNumber),
									logIndex: (0, index_893f7c9e.f)(oldLog.logIndex)
								};
							}
						}
						return {
							blockNumber: Number.NEGATIVE_INFINITY,
							logIndex: Number.NEGATIVE_INFINITY
						};
					});
				}
				/**
				 * Gets all `logs` events in the provided range. Note that the returned logs
				 * do not include removed logs.
				 *
				 * @private
				 */ getLogsInRange(filter, fromBlockInclusive, toBlockExclusive) {
					return (0, index_893f7c9e._)(this, void 0, void 0, function* () {
						if (fromBlockInclusive >= toBlockExclusive) {
							return [];
						}
						const rangeFilter = Object.assign(Object.assign({}, filter), {
							fromBlock: (0, index_893f7c9e.t)(fromBlockInclusive),
							toBlock: (0, index_893f7c9e.t)(toBlockExclusive - 1)
						});
						return this.provider.send('eth_getLogs', [rangeFilter]);
					});
				}
			}
			function toNewHeadsEvent(head) {
				const result = Object.assign({}, head);
				delete result.totalDifficulty;
				delete result.transactions;
				delete result.uncles;
				return result;
			}
			function dedupeNewHeads(events) {
				return dedupe(events, (event) => event.hash);
			}
			function dedupeLogs(events) {
				return dedupe(events, (event) => `${event.blockHash}/${event.logIndex}`);
			}
			function dedupe(items, getKey) {
				const keysSeen = new Set();
				const result = [];
				items.forEach((item) => {
					const key = getKey(item);
					if (!keysSeen.has(key)) {
						keysSeen.add(key);
						result.push(item);
					}
				});
				return result;
			}
			const CANCELLED = new Error('Cancelled');
			function throwIfCancelled(isCancelled) {
				if (isCancelled()) {
					throw CANCELLED;
				}
			}

			const HEARTBEAT_INTERVAL = 30000;
			const HEARTBEAT_WAIT_TIME = 10000;
			const BACKFILL_TIMEOUT = 60000;
			const BACKFILL_RETRIES = 5;
			/**
			 * Subscriptions have a memory of recent events they have sent so that in the
			 * event that they disconnect and need to backfill, they can detect re-orgs.
			 * Keep a buffer that goes back at least these many blocks, the maximum amount
			 * at which we might conceivably see a re-org.
			 *
			 * Note that while our buffer goes back this many blocks, it may contain more
			 * than this many elements, since in the case of logs subscriptions more than
			 * one event may be emitted for a block.
			 */
			const RETAINED_EVENT_BLOCK_COUNT = 10;
			/**
			 * SDK's custom implementation fo the ethers.js's 'AlchemyWebSocketProvider'.
			 *
			 * Do not call this constructor directly. Instead, instantiate an instance of
			 * {@link Alchemy} and call {@link Alchemy.config.getWebSocketProvider()}.
			 *
			 * @public
			 */
			class AlchemyWebSocketProvider extends WebSocketProvider {
				/** @internal */
				constructor(config, wsConstructor) {
					var _a;
					// Normalize the API Key to a string.
					const apiKey = alchemy_provider_ac155d2c.AlchemyProvider.getApiKey(config.apiKey);
					// Generate our own connection info with the correct endpoint URLs.
					const alchemyNetwork = alchemy_provider_ac155d2c.AlchemyProvider.getAlchemyNetwork(
						config.network
					);
					const connection = alchemy_provider_ac155d2c.AlchemyProvider.getAlchemyConnectionInfo(
						alchemyNetwork,
						apiKey,
						'wss'
					);
					const protocol = `alchemy-sdk-${index_893f7c9e.V}`;
					// Use the provided config URL override if it exists, otherwise use the created one.
					const ws = new dist /* default */.A(
						(_a = config.url) !== null && _a !== void 0 ? _a : connection.url,
						protocol,
						{
							wsConstructor:
								wsConstructor !== null && wsConstructor !== void 0
									? wsConstructor
									: getWebsocketConstructor()
						}
					);
					// Normalize the Alchemy named network input to the network names used by
					// ethers. This allows the parent super constructor in JsonRpcProvider to
					// correctly set the network.
					const ethersNetwork = index_893f7c9e.E[alchemyNetwork];
					super(ws, ethersNetwork);
					this._events = [];
					// In the case of a WebSocket reconnection, all subscriptions are lost and we
					// create new ones to replace them, but we want to create the illusion that
					// the original subscriptions persist. Thus, maintain a mapping from the
					// "virtual" subscription ids which are visible to the consumer to the
					// "physical" subscription ids of the actual connections. This terminology is
					// borrowed from virtual and physical memory, which has a similar mapping.
					/** @internal */
					this.virtualSubscriptionsById = new Map();
					/** @internal */
					this.virtualIdsByPhysicalId = new Map();
					/**
					 * The underlying ethers {@link WebSocketProvider} already handles and emits
					 * messages. To allow backfilling, track all messages that are emitted.
					 *
					 * This is a field arrow function in order to preserve `this` context when
					 * passing the method as an event listener.
					 *
					 * @internal
					 */
					this.handleMessage = (event) => {
						const message = JSON.parse(event.data);
						if (!isSubscriptionEvent(message)) {
							return;
						}
						const physicalId = message.params.subscription;
						const virtualId = this.virtualIdsByPhysicalId.get(physicalId);
						if (!virtualId) {
							return;
						}
						const subscription = this.virtualSubscriptionsById.get(virtualId);
						if (subscription.method !== 'eth_subscribe') {
							return;
						}
						switch (subscription.params[0]) {
							case 'newHeads': {
								const newHeadsSubscription = subscription;
								const newHeadsMessage = message;
								const { isBackfilling, backfillBuffer } = newHeadsSubscription;
								const { result } = newHeadsMessage.params;
								if (isBackfilling) {
									addToNewHeadsEventsBuffer(backfillBuffer, result);
								} else if (physicalId !== virtualId) {
									// In the case of a re-opened subscription, ethers will not emit the
									// event, so the SDK has to.
									this.emitAndRememberEvent(virtualId, result, getNewHeadsBlockNumber);
								} else {
									// Ethers subscription mapping will emit the event, just store it.
									this.rememberEvent(virtualId, result, getNewHeadsBlockNumber);
								}
								break;
							}
							case 'logs': {
								const logsSubscription = subscription;
								const logsMessage = message;
								const { isBackfilling, backfillBuffer } = logsSubscription;
								const { result } = logsMessage.params;
								if (isBackfilling) {
									addToLogsEventsBuffer(backfillBuffer, result);
								} else if (virtualId !== physicalId) {
									this.emitAndRememberEvent(virtualId, result, getLogsBlockNumber);
								} else {
									this.rememberEvent(virtualId, result, getLogsBlockNumber);
								}
								break;
							}
							default:
								if (physicalId !== virtualId) {
									// In the case of a re-opened subscription, ethers will not emit the
									// event, so the SDK has to.
									const { result } = message.params;
									this.emitEvent(virtualId, result);
								}
						}
					};
					/**
					 * When the websocket connection reopens:
					 *
					 * 1. Resubscribe to all existing subscriptions and start backfilling
					 * 2. Restart heart beat.
					 *
					 * This is a field arrow function in order to preserve `this` context when
					 * passing the method as an event listener.
					 *
					 * @internal
					 */
					this.handleReopen = () => {
						this.virtualIdsByPhysicalId.clear();
						const { cancel, isCancelled } = makeCancelToken();
						this.cancelBackfill = cancel;
						for (const subscription of this.virtualSubscriptionsById.values()) {
							void (() =>
								(0, index_893f7c9e._)(this, void 0, void 0, function* () {
									try {
										yield this.resubscribeAndBackfill(isCancelled, subscription);
									} catch (error) {
										if (!isCancelled()) {
											console.error(
												`Error while backfilling "${subscription.params[0]}" subscription. Some events may be missing.`,
												error
											);
										}
									}
								}))();
						}
						this.startHeartbeat();
					};
					/**
					 * Cancels the heartbeat and any pending backfills being performed. This is
					 * called when the websocket connection goes down or is disconnected.
					 *
					 * This is a field arrow function in order to preserve `this` context when
					 * passing the method as an event listener.
					 *
					 * @internal
					 */
					this.stopHeartbeatAndBackfill = () => {
						if (this.heartbeatIntervalId != null) {
							clearInterval(this.heartbeatIntervalId);
							this.heartbeatIntervalId = undefined;
						}
						this.cancelBackfill();
					};
					this.apiKey = apiKey;
					// Start heartbeat and backfiller for the websocket connection.
					this.backfiller = new WebsocketBackfiller(this);
					this.addSocketListeners();
					this.startHeartbeat();
					this.cancelBackfill = index_893f7c9e.n;
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
					if (typeof network === 'string' && network in index_893f7c9e.C) {
						return index_893f7c9e.C[network];
					}
					// Call the standard ethers.js getNetwork method for other networks.
					return (0, lib_esm /* getNetwork */.N)(network);
				}
				/**
				 * Overridden implementation of ethers that includes Alchemy based subscriptions.
				 *
				 * @param eventName Event to subscribe to
				 * @param listener The listener function to call when the event is triggered.
				 * @override
				 * @public
				 */
				// TODO: Override `Listener` type to get type autocompletions.
				on(eventName, listener) {
					return this._addEventListener(eventName, listener, false);
				}
				/**
				 * Overridden implementation of ethers that includes Alchemy based
				 * subscriptions. Adds a listener to the triggered for only the next
				 * {@link eventName} event, after which it will be removed.
				 *
				 * @param eventName Event to subscribe to
				 * @param listener The listener function to call when the event is triggered.
				 * @override
				 * @public
				 */
				// TODO: Override `Listener` type to get type autocompletions.
				once(eventName, listener) {
					return this._addEventListener(eventName, listener, true);
				}
				/**
				 * Removes the provided {@link listener} for the {@link eventName} event. If no
				 * listener is provided, all listeners for the event will be removed.
				 *
				 * @param eventName Event to unlisten to.
				 * @param listener The listener function to remove.
				 * @override
				 * @public
				 */
				off(eventName, listener) {
					if ((0, index_893f7c9e.i)(eventName)) {
						return this._off(eventName, listener);
					} else {
						return super.off(eventName, listener);
					}
				}
				/**
				 * Remove all listeners for the provided {@link eventName} event. If no event
				 * is provided, all events and their listeners are removed.
				 *
				 * @param eventName The event to remove all listeners for.
				 * @override
				 * @public
				 */
				removeAllListeners(eventName) {
					if (eventName !== undefined && (0, index_893f7c9e.i)(eventName)) {
						return this._removeAllListeners(eventName);
					} else {
						return super.removeAllListeners(eventName);
					}
				}
				/**
				 * Returns the number of listeners for the provided {@link eventName} event. If
				 * no event is provided, the total number of listeners for all events is returned.
				 *
				 * @param eventName The event to get the number of listeners for.
				 * @public
				 * @override
				 */
				listenerCount(eventName) {
					if (eventName !== undefined && (0, index_893f7c9e.i)(eventName)) {
						return this._listenerCount(eventName);
					} else {
						return super.listenerCount(eventName);
					}
				}
				/**
				 * Returns an array of listeners for the provided {@link eventName} event. If
				 * no event is provided, all listeners will be included.
				 *
				 * @param eventName The event to get the listeners for.
				 * @public
				 * @override
				 */
				listeners(eventName) {
					if (eventName !== undefined && (0, index_893f7c9e.i)(eventName)) {
						return this._listeners(eventName);
					} else {
						return super.listeners(eventName);
					}
				}
				/**
				 * Overrides the method in `BaseProvider` in order to properly format the
				 * Alchemy subscription events.
				 *
				 * @internal
				 * @override
				 */
				_addEventListener(eventName, listener, once) {
					if ((0, index_893f7c9e.i)(eventName)) {
						(0, index_893f7c9e.v)(eventName);
						const event = new index_893f7c9e.c((0, index_893f7c9e.e)(eventName), listener, once);
						this._events.push(event);
						this._startEvent(event);
						return this;
					} else {
						return super._addEventListener(eventName, listener, once);
					}
				}
				/**
				 * Overrides the `_startEvent()` method in ethers.js's
				 * {@link WebSocketProvider} to include additional alchemy methods.
				 *
				 * @param event
				 * @override
				 * @internal
				 */
				_startEvent(event) {
					// Check if the event type is a custom Alchemy subscription.
					const customLogicTypes = [...index_893f7c9e.A, 'block', 'filter'];
					if (customLogicTypes.includes(event.type)) {
						this.customStartEvent(event);
					} else {
						super._startEvent(event);
					}
				}
				/**
				 * Overridden from ethers.js's {@link WebSocketProvider}
				 *
				 * Modified in order to add mappings for backfilling.
				 *
				 * @internal
				 * @override
				 */
				_subscribe(tag, param, processFunc, event) {
					return (0, index_893f7c9e._)(this, void 0, void 0, function* () {
						let subIdPromise = this._subIds[tag];
						// BEGIN MODIFIED CODE
						const startingBlockNumber = yield this.getBlockNumber();
						// END MODIFIED CODE
						if (subIdPromise == null) {
							subIdPromise = Promise.all(param).then((param) => {
								return this.send('eth_subscribe', param);
							});
							this._subIds[tag] = subIdPromise;
						}
						const subId = yield subIdPromise;
						// BEGIN MODIFIED CODE
						const resolvedParams = yield Promise.all(param);
						this.virtualSubscriptionsById.set(subId, {
							event: event,
							method: 'eth_subscribe',
							params: resolvedParams,
							startingBlockNumber,
							virtualId: subId,
							physicalId: subId,
							sentEvents: [],
							isBackfilling: false,
							backfillBuffer: []
						});
						this.virtualIdsByPhysicalId.set(subId, subId);
						// END MODIFIED CODE
						this._subs[subId] = { tag, processFunc };
					});
				}
				/**
				 * DO NOT MODIFY.
				 *
				 * Original code copied over from ether.js's `BaseProvider`.
				 *
				 * This method is copied over directly in order to implement Alchemy's unique
				 * subscription types. The only difference is that this method calls
				 * {@link getAlchemyEventTag} instead of the original `getEventTag()` method in
				 * order to parse the Alchemy subscription event.
				 *
				 * @internal
				 * @override
				 */
				emit(eventName, ...args) {
					if ((0, index_893f7c9e.i)(eventName)) {
						let result = false;
						const stopped = [];
						// This line is the only modified line from the original method.
						const eventTag = (0, index_893f7c9e.e)(eventName);
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
					} else {
						return super.emit(eventName, ...args);
					}
				}
				/** @internal */
				sendBatch(parts) {
					return (0, index_893f7c9e._)(this, void 0, void 0, function* () {
						let nextId = 0;
						const payload = parts.map(({ method, params }) => {
							return {
								method,
								params,
								jsonrpc: '2.0',
								id: `alchemy-sdk:${nextId++}`
							};
						});
						return this.sendBatchConcurrently(payload);
					});
				}
				/** @override */
				destroy() {
					this.removeSocketListeners();
					this.stopHeartbeatAndBackfill();
					return super.destroy();
				}
				/**
				 * Overrides the ether's `isCommunityResource()` method. Returns true if the
				 * current api key is the default key.
				 *
				 * @override
				 */
				isCommunityResource() {
					return this.apiKey === index_893f7c9e.D;
				}
				/**
				 * DO NOT MODIFY.
				 *
				 * Original code copied over from ether.js's `WebSocketProvider._stopEvent()`.
				 *
				 * This method is copied over directly in order to support Alchemy's
				 * subscription type by allowing the provider to properly stop Alchemy's
				 * subscription events.
				 *
				 * @internal
				 */
				_stopEvent(event) {
					let tag = event.tag;
					// START MODIFIED CODE
					if (index_893f7c9e.A.includes(event.type)) {
						// There are remaining pending transaction listeners.
						if (this._events.filter((e) => index_893f7c9e.A.includes(e.type)).length) {
							return;
						}
						// END MODIFIED CODE
					} else if (event.type === 'tx') {
						// There are remaining transaction event listeners
						if (this._events.filter((e) => e.type === 'tx').length) {
							return;
						}
						tag = 'tx';
					} else if (this.listenerCount(event.event)) {
						// There are remaining event listeners
						return;
					}
					const subId = this._subIds[tag];
					if (!subId) {
						return;
					}
					delete this._subIds[tag];
					void subId.then((subId) => {
						if (!this._subs[subId]) {
							return;
						}
						delete this._subs[subId];
						void this.send('eth_unsubscribe', [subId]);
					});
				}
				/** @internal */
				addSocketListeners() {
					this._websocket.addEventListener('message', this.handleMessage);
					this._websocket.addEventListener('reopen', this.handleReopen);
					this._websocket.addEventListener('down', this.stopHeartbeatAndBackfill);
				}
				/** @internal */
				removeSocketListeners() {
					this._websocket.removeEventListener('message', this.handleMessage);
					this._websocket.removeEventListener('reopen', this.handleReopen);
					this._websocket.removeEventListener('down', this.stopHeartbeatAndBackfill);
				}
				/**
				 * Reopens the backfill based on
				 *
				 * @param isCancelled
				 * @param subscription
				 * @internal
				 */
				resubscribeAndBackfill(isCancelled, subscription) {
					return (0, index_893f7c9e._)(this, void 0, void 0, function* () {
						const { virtualId, method, params, sentEvents, backfillBuffer, startingBlockNumber } =
							subscription;
						subscription.isBackfilling = true;
						backfillBuffer.length = 0;
						try {
							const physicalId = yield this.send(method, params);
							throwIfCancelled(isCancelled);
							subscription.physicalId = physicalId;
							this.virtualIdsByPhysicalId.set(physicalId, virtualId);
							switch (params[0]) {
								case 'newHeads': {
									const backfillEvents = yield withBackoffRetries(
										() =>
											withTimeout(
												this.backfiller.getNewHeadsBackfill(
													isCancelled,
													sentEvents,
													startingBlockNumber
												),
												BACKFILL_TIMEOUT
											),
										BACKFILL_RETRIES,
										() => !isCancelled()
									);
									throwIfCancelled(isCancelled);
									const events = dedupeNewHeads([...backfillEvents, ...backfillBuffer]);
									events.forEach((event) => this.emitNewHeadsEvent(virtualId, event));
									break;
								}
								case 'logs': {
									const filter = params[1] || {};
									const backfillEvents = yield withBackoffRetries(
										() =>
											withTimeout(
												this.backfiller.getLogsBackfill(
													isCancelled,
													filter,
													sentEvents,
													startingBlockNumber
												),
												BACKFILL_TIMEOUT
											),
										BACKFILL_RETRIES,
										() => !isCancelled()
									);
									throwIfCancelled(isCancelled);
									const events = dedupeLogs([...backfillEvents, ...backfillBuffer]);
									events.forEach((event) => this.emitLogsEvent(virtualId, event));
									break;
								}
								default:
									break;
							}
						} finally {
							subscription.isBackfilling = false;
							backfillBuffer.length = 0;
						}
					});
				}
				/** @internal */
				emitNewHeadsEvent(virtualId, result) {
					this.emitAndRememberEvent(virtualId, result, getNewHeadsBlockNumber);
				}
				/** @internal */
				emitLogsEvent(virtualId, result) {
					this.emitAndRememberEvent(virtualId, result, getLogsBlockNumber);
				}
				/**
				 * Emits an event to consumers, but also remembers it in its subscriptions's
				 * `sentEvents` buffer so that we can detect re-orgs if the connection drops
				 * and needs to be reconnected.
				 *
				 * @internal
				 */
				emitAndRememberEvent(virtualId, result, getBlockNumber) {
					this.rememberEvent(virtualId, result, getBlockNumber);
					this.emitEvent(virtualId, result);
				}
				emitEvent(virtualId, result) {
					const subscription = this.virtualSubscriptionsById.get(virtualId);
					if (!subscription) {
						return;
					}
					this.emitGenericEvent(subscription, result);
				}
				/** @internal */
				rememberEvent(virtualId, result, getBlockNumber) {
					const subscription = this.virtualSubscriptionsById.get(virtualId);
					if (!subscription) {
						return;
					}
					// Web3 modifies these event objects once we pass them on (changing hex
					// numbers to numbers). We want the original event, so make a defensive
					// copy.
					addToPastEventsBuffer(subscription.sentEvents, Object.assign({}, result), getBlockNumber);
				}
				/** @internal */
				emitGenericEvent(subscription, result) {
					const emitFunction = this.emitProcessFn(subscription.event);
					emitFunction(result);
				}
				/**
				 * Starts a heartbeat that pings the websocket server periodically to ensure
				 * that the connection stays open.
				 *
				 * @internal
				 */
				startHeartbeat() {
					if (this.heartbeatIntervalId != null) {
						return;
					}
					this.heartbeatIntervalId = setInterval(
						() =>
							(0, index_893f7c9e._)(this, void 0, void 0, function* () {
								try {
									yield withTimeout(this.send('net_version'), HEARTBEAT_WAIT_TIME);
								} catch (_a) {
									this._websocket.reconnect();
								}
							}),
						HEARTBEAT_INTERVAL
					);
				}
				/**
				 * This method sends the batch concurrently as individual requests rather than
				 * as a batch, which was the original implementation. The original batch logic
				 * is preserved in this implementation in order for faster porting.
				 *
				 * @param payload
				 * @internal
				 */
				// TODO(cleanup): Refactor and remove usages of `sendBatch()`.
				// TODO(errors): Use allSettled() once we have more error handling.
				sendBatchConcurrently(payload) {
					return (0, index_893f7c9e._)(this, void 0, void 0, function* () {
						return Promise.all(payload.map((req) => this.send(req.method, req.params)));
					});
				}
				/** @internal */
				customStartEvent(event) {
					if (event.type === index_893f7c9e.h) {
						const { fromAddress, toAddress, hashesOnly } = event;
						void this._subscribe(
							event.tag,
							[index_893f7c9e.j.PENDING_TRANSACTIONS, { fromAddress, toAddress, hashesOnly }],
							this.emitProcessFn(event),
							event
						);
					} else if (event.type === index_893f7c9e.k) {
						const { addresses, includeRemoved, hashesOnly } = event;
						void this._subscribe(
							event.tag,
							[index_893f7c9e.j.MINED_TRANSACTIONS, { addresses, includeRemoved, hashesOnly }],
							this.emitProcessFn(event),
							event
						);
					} else if (event.type === 'block') {
						void this._subscribe('block', ['newHeads'], this.emitProcessFn(event), event);
					} else if (event.type === 'filter') {
						void this._subscribe(
							event.tag,
							['logs', this._getFilter(event.filter)],
							this.emitProcessFn(event),
							event
						);
					}
				}
				/** @internal */
				emitProcessFn(event) {
					switch (event.type) {
						case index_893f7c9e.h:
							return (result) =>
								this.emit(
									{
										method: index_893f7c9e.j.PENDING_TRANSACTIONS,
										fromAddress: event.fromAddress,
										toAddress: event.toAddress,
										hashesOnly: event.hashesOnly
									},
									result
								);
						case index_893f7c9e.k:
							return (result) =>
								this.emit(
									{
										method: index_893f7c9e.j.MINED_TRANSACTIONS,
										addresses: event.addresses,
										includeRemoved: event.includeRemoved,
										hashesOnly: event.hashesOnly
									},
									result
								);
						case 'block':
							return (result) => {
								const blockNumber = bignumber /* BigNumber */.gH
									.from(result.number)
									.toNumber();
								this._emitted.block = blockNumber;
								this.emit('block', blockNumber);
							};
						case 'filter':
							return (result) => {
								if (result.removed == null) {
									result.removed = false;
								}
								this.emit(event.filter, this.formatter.filterLog(result));
							};
						default:
							throw new Error('Invalid event type to `emitProcessFn()`');
					}
				}
				/**
				 * DO NOT MODIFY.
				 *
				 * Original code copied over from ether.js's `BaseProvider.off()`.
				 *
				 * This method is copied over directly in order to implement Alchemy's unique
				 * subscription types. The only difference is that this method calls
				 * {@link getAlchemyEventTag} instead of the original `getEventTag()` method in
				 * order to parse the Alchemy subscription event.
				 *
				 * @private
				 */
				_off(eventName, listener) {
					if (listener == null) {
						return this.removeAllListeners(eventName);
					}
					const stopped = [];
					let found = false;
					const eventTag = (0, index_893f7c9e.e)(eventName);
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
				/**
				 * DO NOT MODIFY.
				 *
				 * Original code copied over from ether.js's `BaseProvider.removeAllListeners()`.
				 *
				 * This method is copied over directly in order to implement Alchemy's unique
				 * subscription types. The only difference is that this method calls
				 * {@link getAlchemyEventTag} instead of the original `getEventTag()` method in
				 * order to parse the Alchemy subscription event.
				 *
				 * @private
				 */
				_removeAllListeners(eventName) {
					let stopped = [];
					if (eventName == null) {
						stopped = this._events;
						this._events = [];
					} else {
						const eventTag = (0, index_893f7c9e.e)(eventName);
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
				/**
				 * DO NOT MODIFY.
				 *
				 * Original code copied over from ether.js's `BaseProvider.listenerCount()`.
				 *
				 * This method is copied over directly in order to implement Alchemy's unique
				 * subscription types. The only difference is that this method calls
				 * {@link getAlchemyEventTag} instead of the original `getEventTag()` method in
				 * order to parse the Alchemy subscription event.
				 *
				 * @private
				 */
				_listenerCount(eventName) {
					if (!eventName) {
						return this._events.length;
					}
					const eventTag = (0, index_893f7c9e.e)(eventName);
					return this._events.filter((event) => {
						return event.tag === eventTag;
					}).length;
				}
				/**
				 * DO NOT MODIFY.
				 *
				 * Original code copied over from ether.js's `BaseProvider.listeners()`.
				 *
				 * This method is copied over directly in order to implement Alchemy's unique
				 * subscription types. The only difference is that this method calls
				 * {@link getAlchemyEventTag} instead of the original `getEventTag()` method in
				 * order to parse the Alchemy subscription event.
				 *
				 * @private
				 */
				_listeners(eventName) {
					if (eventName == null) {
						return this._events.map((event) => event.listener);
					}
					const eventTag = (0, index_893f7c9e.e)(eventName);
					return this._events
						.filter((event) => event.tag === eventTag)
						.map((event) => event.listener);
				}
			}
			function getWebsocketConstructor() {
				return isNodeEnvironment() ? __webpack_require__(4217).w3cwebsocket : WebSocket;
			}
			function isNodeEnvironment() {
				return (
					typeof process !== 'undefined' &&
					process != null &&
					process.versions != null &&
					process.versions.node != null
				);
			}
			// TODO(cleanup): Use class variable rather than passing `isCancelled` everywhere.
			function makeCancelToken() {
				let cancelled = false;
				return { cancel: () => (cancelled = true), isCancelled: () => cancelled };
			}
			// TODO(cleanup): replace with SDK's backoff implementation
			const MIN_RETRY_DELAY = 1000;
			const RETRY_BACKOFF_FACTOR = 2;
			const MAX_RETRY_DELAY = 30000;
			function withBackoffRetries(f, retryCount, shouldRetry = () => true) {
				return (0, index_893f7c9e._)(this, void 0, void 0, function* () {
					let nextWaitTime = 0;
					let i = 0;
					while (true) {
						try {
							return yield f();
						} catch (error) {
							i++;
							if (i >= retryCount || !shouldRetry(error)) {
								throw error;
							}
							yield delay(nextWaitTime);
							if (!shouldRetry(error)) {
								throw error;
							}
							nextWaitTime =
								nextWaitTime === 0
									? MIN_RETRY_DELAY
									: Math.min(MAX_RETRY_DELAY, RETRY_BACKOFF_FACTOR * nextWaitTime);
						}
					}
				});
			}
			function delay(ms) {
				return new Promise((resolve) => setTimeout(resolve, ms));
			}
			function withTimeout(promise, ms) {
				return Promise.race([
					promise,
					new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
				]);
			}
			function getNewHeadsBlockNumber(event) {
				return (0, index_893f7c9e.f)(event.number);
			}
			function getLogsBlockNumber(event) {
				return (0, index_893f7c9e.f)(event.blockNumber);
			}
			function isResponse(message) {
				return Array.isArray(message) || (message.jsonrpc === '2.0' && message.id !== undefined);
			}
			function isSubscriptionEvent(message) {
				return !isResponse(message);
			}
			function addToNewHeadsEventsBuffer(pastEvents, event) {
				addToPastEventsBuffer(pastEvents, event, getNewHeadsBlockNumber);
			}
			function addToLogsEventsBuffer(pastEvents, event) {
				addToPastEventsBuffer(pastEvents, event, getLogsBlockNumber);
			}
			/**
			 * Adds a new event to an array of events, evicting any events which are so old
			 * that they will no longer feasibly be part of a reorg.
			 */
			function addToPastEventsBuffer(pastEvents, event, getBlockNumber) {
				const currentBlockNumber = getBlockNumber(event);
				// Find first index of an event recent enough to retain, then drop everything
				// at a lower index.
				const firstGoodIndex = pastEvents.findIndex(
					(e) => getBlockNumber(e) > currentBlockNumber - RETAINED_EVENT_BLOCK_COUNT
				);
				if (firstGoodIndex === -1) {
					pastEvents.length = 0;
				} else {
					pastEvents.splice(0, firstGoodIndex);
				}
				pastEvents.push(event);
			}

			//# sourceMappingURL=alchemy-websocket-provider-d78b64af.js.map

			/***/
		},

		/***/ 9444: /***/ (module) => {
			var naiveFallback = function () {
				if (typeof self === 'object' && self) return self;
				if (typeof window === 'object' && window) return window;
				throw new Error('Unable to resolve global `this`');
			};

			module.exports = (function () {
				if (this) return this;

				// Unexpected strict mode (may happen if e.g. bundled into ESM module)

				// Fallback to standard globalThis if available
				if (typeof globalThis === 'object' && globalThis) return globalThis;

				// Thanks @mathiasbynens -> https://mathiasbynens.be/notes/globalthis
				// In all ES5+ engines global object inherits from Object.prototype
				// (if you approached one that doesn't please report)
				try {
					Object.defineProperty(Object.prototype, '__global__', {
						get: function () {
							return this;
						},
						configurable: true
					});
				} catch (error) {
					// Unfortunate case of updates to Object.prototype being restricted
					// via preventExtensions, seal or freeze
					return naiveFallback();
				}
				try {
					// Safari case (window.__global__ works, but __global__ does not)
					if (!__global__) return naiveFallback();
					return __global__;
				} finally {
					delete Object.prototype.__global__;
				}
			})();

			/***/
		},

		/***/ 5004: /***/ (__unused_webpack_module, exports) => {
			'use strict';
			var __webpack_unused_export__;

			__webpack_unused_export__ = { value: true };
			var SHOULD_RECONNECT_FALSE_MESSAGE =
				'Provided shouldReconnect() returned false. Closing permanently.';
			var SHOULD_RECONNECT_PROMISE_FALSE_MESSAGE =
				'Provided shouldReconnect() resolved to false. Closing permanently.';
			var SturdyWebSocket = /** @class */ (function () {
				function SturdyWebSocket(url, protocolsOrOptions, options) {
					if (options === void 0) {
						options = {};
					}
					this.url = url;
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
					if (
						protocolsOrOptions == null ||
						typeof protocolsOrOptions === 'string' ||
						Array.isArray(protocolsOrOptions)
					) {
						this.protocols = protocolsOrOptions;
					} else {
						options = protocolsOrOptions;
					}
					this.options = applyDefaultOptions(options);
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
					set: function (binaryType) {
						this.binaryTypeInternal = binaryType;
						if (this.ws) {
							this.ws.binaryType = binaryType;
						}
					},
					enumerable: true,
					configurable: true
				});
				Object.defineProperty(SturdyWebSocket.prototype, 'bufferedAmount', {
					get: function () {
						var sum = this.ws ? this.ws.bufferedAmount : 0;
						var hasUnknownAmount = false;
						this.messageBuffer.forEach(function (data) {
							var byteLength = getDataByteLength(data);
							if (byteLength != null) {
								sum += byteLength;
							} else {
								hasUnknownAmount = true;
							}
						});
						if (hasUnknownAmount) {
							this.debugLog(
								'Some buffered data had unknown length. bufferedAmount()' +
									' return value may be below the correct amount.'
							);
						}
						return sum;
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
				SturdyWebSocket.prototype.close = function (code, reason) {
					this.disposeSocket(code, reason);
					this.shutdown();
					this.debugLog('WebSocket permanently closed by client.');
				};
				SturdyWebSocket.prototype.send = function (data) {
					if (this.isClosed) {
						throw new Error('WebSocket is already in CLOSING or CLOSED state.');
					} else if (this.ws && this.ws.readyState === this.OPEN) {
						this.ws.send(data);
					} else {
						this.messageBuffer.push(data);
					}
				};
				SturdyWebSocket.prototype.reconnect = function () {
					if (this.isClosed) {
						throw new Error('Cannot call reconnect() on socket which is permanently closed.');
					}
					this.disposeSocket(1000, 'Client requested reconnect.');
					this.handleClose(undefined);
				};
				SturdyWebSocket.prototype.addEventListener = function (type, listener) {
					if (!this.listeners[type]) {
						this.listeners[type] = [];
					}
					this.listeners[type].push(listener);
				};
				SturdyWebSocket.prototype.dispatchEvent = function (event) {
					return this.dispatchEventOfType(event.type, event);
				};
				SturdyWebSocket.prototype.removeEventListener = function (type, listener) {
					if (this.listeners[type]) {
						this.listeners[type] = this.listeners[type].filter(function (l) {
							return l !== listener;
						});
					}
				};
				SturdyWebSocket.prototype.openNewWebSocket = function () {
					var _this = this;
					if (this.isClosed) {
						return;
					}
					var _a = this.options,
						connectTimeout = _a.connectTimeout,
						wsConstructor = _a.wsConstructor;
					this.debugLog('Opening new WebSocket to ' + this.url + '.');
					var ws = new wsConstructor(this.url, this.protocols);
					ws.onclose = function (event) {
						return _this.handleClose(event);
					};
					ws.onerror = function (event) {
						return _this.handleError(event);
					};
					ws.onmessage = function (event) {
						return _this.handleMessage(event);
					};
					ws.onopen = function (event) {
						return _this.handleOpen(event);
					};
					this.connectTimeoutId = setTimeout(function () {
						// If this is running, we still haven't opened the websocket.
						// Kill it so we can try again.
						_this.clearConnectTimeout();
						_this.disposeSocket();
						_this.handleClose(undefined);
					}, connectTimeout);
					this.ws = ws;
				};
				SturdyWebSocket.prototype.handleOpen = function (event) {
					var _this = this;
					if (!this.ws || this.isClosed) {
						return;
					}
					var allClearResetTime = this.options.allClearResetTime;
					this.debugLog('WebSocket opened.');
					if (this.binaryTypeInternal != null) {
						this.ws.binaryType = this.binaryTypeInternal;
					} else {
						this.binaryTypeInternal = this.ws.binaryType;
					}
					this.clearConnectTimeout();
					if (this.hasBeenOpened) {
						this.dispatchEventOfType('reopen', event);
					} else {
						this.dispatchEventOfType('open', event);
						this.hasBeenOpened = true;
					}
					this.messageBuffer.forEach(function (message) {
						return _this.send(message);
					});
					this.messageBuffer = [];
					this.allClearTimeoutId = setTimeout(function () {
						_this.clearAllClearTimeout();
						_this.nextRetryTime = 0;
						_this.reconnectCount = 0;
						var openTime = (allClearResetTime / 1000) | 0;
						_this.debugLog(
							'WebSocket remained open for ' +
								openTime +
								' seconds. Resetting' +
								' retry time and count.'
						);
					}, allClearResetTime);
				};
				SturdyWebSocket.prototype.handleMessage = function (event) {
					if (this.isClosed) {
						return;
					}
					this.dispatchEventOfType('message', event);
				};
				SturdyWebSocket.prototype.handleClose = function (event) {
					var _this = this;
					if (this.isClosed) {
						return;
					}
					var _a = this.options,
						maxReconnectAttempts = _a.maxReconnectAttempts,
						shouldReconnect = _a.shouldReconnect;
					this.clearConnectTimeout();
					this.clearAllClearTimeout();
					if (this.ws) {
						this.lastKnownExtensions = this.ws.extensions;
						this.lastKnownProtocol = this.ws.protocol;
						this.disposeSocket();
					}
					this.dispatchEventOfType('down', event);
					if (this.reconnectCount >= maxReconnectAttempts) {
						this.stopReconnecting(event, this.getTooManyFailedReconnectsMessage());
						return;
					}
					var willReconnect = !event || shouldReconnect(event);
					if (typeof willReconnect === 'boolean') {
						this.handleWillReconnect(willReconnect, event, SHOULD_RECONNECT_FALSE_MESSAGE);
					} else {
						willReconnect.then(function (willReconnectResolved) {
							if (_this.isClosed) {
								return;
							}
							_this.handleWillReconnect(
								willReconnectResolved,
								event,
								SHOULD_RECONNECT_PROMISE_FALSE_MESSAGE
							);
						});
					}
				};
				SturdyWebSocket.prototype.handleError = function (event) {
					this.dispatchEventOfType('error', event);
					this.debugLog('WebSocket encountered an error.');
				};
				SturdyWebSocket.prototype.handleWillReconnect = function (
					willReconnect,
					event,
					denialReason
				) {
					if (willReconnect) {
						this.reestablishConnection();
					} else {
						this.stopReconnecting(event, denialReason);
					}
				};
				SturdyWebSocket.prototype.reestablishConnection = function () {
					var _this = this;
					var _a = this.options,
						minReconnectDelay = _a.minReconnectDelay,
						maxReconnectDelay = _a.maxReconnectDelay,
						reconnectBackoffFactor = _a.reconnectBackoffFactor;
					this.reconnectCount++;
					var retryTime = this.nextRetryTime;
					this.nextRetryTime = Math.max(
						minReconnectDelay,
						Math.min(this.nextRetryTime * reconnectBackoffFactor, maxReconnectDelay)
					);
					setTimeout(function () {
						return _this.openNewWebSocket();
					}, retryTime);
					var retryTimeSeconds = (retryTime / 1000) | 0;
					this.debugLog('WebSocket was closed. Re-opening in ' + retryTimeSeconds + ' seconds.');
				};
				SturdyWebSocket.prototype.stopReconnecting = function (event, debugReason) {
					this.debugLog(debugReason);
					this.shutdown();
					if (event) {
						this.dispatchEventOfType('close', event);
					}
				};
				SturdyWebSocket.prototype.shutdown = function () {
					this.isClosed = true;
					this.clearAllTimeouts();
					this.messageBuffer = [];
					this.disposeSocket();
				};
				SturdyWebSocket.prototype.disposeSocket = function (closeCode, reason) {
					if (!this.ws) {
						return;
					}
					// Use noop handlers instead of null because some WebSocket
					// implementations, such as the one from isomorphic-ws, raise a stink on
					// unhandled events.
					this.ws.onerror = noop;
					this.ws.onclose = noop;
					this.ws.onmessage = noop;
					this.ws.onopen = noop;
					this.ws.close(closeCode, reason);
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
				SturdyWebSocket.prototype.dispatchEventOfType = function (type, event) {
					var _this = this;
					switch (type) {
						case 'close':
							if (this.onclose) {
								this.onclose(event);
							}
							break;
						case 'error':
							if (this.onerror) {
								this.onerror(event);
							}
							break;
						case 'message':
							if (this.onmessage) {
								this.onmessage(event);
							}
							break;
						case 'open':
							if (this.onopen) {
								this.onopen(event);
							}
							break;
						case 'down':
							if (this.ondown) {
								this.ondown(event);
							}
							break;
						case 'reopen':
							if (this.onreopen) {
								this.onreopen(event);
							}
							break;
					}
					if (type in this.listeners) {
						this.listeners[type].slice().forEach(function (listener) {
							return _this.callListener(listener, event);
						});
					}
					return !event || !event.defaultPrevented;
				};
				SturdyWebSocket.prototype.callListener = function (listener, event) {
					if (typeof listener === 'function') {
						listener.call(this, event);
					} else {
						listener.handleEvent.call(this, event);
					}
				};
				SturdyWebSocket.prototype.debugLog = function (message) {
					if (this.options.debug) {
						// tslint:disable-next-line:no-console
						console.log(message);
					}
				};
				SturdyWebSocket.prototype.getTooManyFailedReconnectsMessage = function () {
					var maxReconnectAttempts = this.options.maxReconnectAttempts;
					return (
						'Failed to reconnect after ' +
						maxReconnectAttempts +
						' ' +
						pluralize('attempt', maxReconnectAttempts) +
						'. Closing permanently.'
					);
				};
				SturdyWebSocket.DEFAULT_OPTIONS = {
					allClearResetTime: 5000,
					connectTimeout: 5000,
					debug: false,
					minReconnectDelay: 1000,
					maxReconnectDelay: 30000,
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
			exports.A = SturdyWebSocket;
			function applyDefaultOptions(options) {
				var result = {};
				Object.keys(SturdyWebSocket.DEFAULT_OPTIONS).forEach(function (key) {
					var value = options[key];
					result[key] = value === undefined ? SturdyWebSocket.DEFAULT_OPTIONS[key] : value;
				});
				return result;
			}
			function getDataByteLength(data) {
				if (typeof data === 'string') {
					// UTF-16 strings use two bytes per character.
					return 2 * data.length;
				} else if (data instanceof ArrayBuffer) {
					return data.byteLength;
				} else if (data instanceof Blob) {
					return data.size;
				} else {
					return undefined;
				}
			}
			function pluralize(s, n) {
				return n === 1 ? s : s + 's';
			}
			function noop() {
				// Nothing.
			}
			//# sourceMappingURL=index.js.map

			/***/
		},

		/***/ 4217: /***/ (module, __unused_webpack_exports, __webpack_require__) => {
			var _globalThis;
			if (typeof globalThis === 'object') {
				_globalThis = globalThis;
			} else {
				try {
					_globalThis = __webpack_require__(9444);
				} catch (error) {
				} finally {
					if (!_globalThis && typeof window !== 'undefined') {
						_globalThis = window;
					}
					if (!_globalThis) {
						throw new Error('Could not determine global this');
					}
				}
			}

			var NativeWebSocket = _globalThis.WebSocket || _globalThis.MozWebSocket;
			var websocket_version = __webpack_require__(6409);

			/**
			 * Expose a W3C WebSocket class with just one or two arguments.
			 */
			function W3CWebSocket(uri, protocols) {
				var native_instance;

				if (protocols) {
					native_instance = new NativeWebSocket(uri, protocols);
				} else {
					native_instance = new NativeWebSocket(uri);
				}

				/**
				 * 'native_instance' is an instance of nativeWebSocket (the browser's WebSocket
				 * class). Since it is an Object it will be returned as it is when creating an
				 * instance of W3CWebSocket via 'new W3CWebSocket()'.
				 *
				 * ECMAScript 5: http://bclary.com/2004/11/07/#a-13.2.2
				 */
				return native_instance;
			}
			if (NativeWebSocket) {
				['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(function (prop) {
					Object.defineProperty(W3CWebSocket, prop, {
						get: function () {
							return NativeWebSocket[prop];
						}
					});
				});
			}

			/**
			 * Module exports.
			 */
			module.exports = {
				w3cwebsocket: NativeWebSocket ? W3CWebSocket : null,
				version: websocket_version
			};

			/***/
		},

		/***/ 6409: /***/ (module, __unused_webpack_exports, __webpack_require__) => {
			module.exports = __webpack_require__(9438).version;

			/***/
		},

		/***/ 9438: /***/ (module) => {
			'use strict';
			module.exports = { version: '1.0.35' };

			/***/
		}
	}
]);
