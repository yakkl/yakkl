/*! For license information please see 40.js.LICENSE.txt */
(self['webpackChunkwallet'] = self['webpackChunkwallet'] || []).push([
	[40],
	{
		8317: function (d) {
			(function webpackUniversalModuleDefinition(x, k) {
				if (true) d.exports = k();
				else {
				}
			})(this, function () {
				return (function () {
					var d = {
						686: function (d, x, k) {
							'use strict';
							k.d(x, {
								default: function () {
									return ie;
								}
							});
							var C = k(279);
							var j = k.n(C);
							var T = k(370);
							var K = k.n(T);
							var B = k(817);
							var D = k.n(B);
							function command(d) {
								try {
									return document.execCommand(d);
								} catch (d) {
									return false;
								}
							}
							var R = function ClipboardActionCut(d) {
								var x = D()(d);
								command('cut');
								return x;
							};
							var M = R;
							function createFakeElement(d) {
								var x = document.documentElement.getAttribute('dir') === 'rtl';
								var k = document.createElement('textarea');
								k.style.fontSize = '12pt';
								k.style.border = '0';
								k.style.padding = '0';
								k.style.margin = '0';
								k.style.position = 'absolute';
								k.style[x ? 'right' : 'left'] = '-9999px';
								var C = window.pageYOffset || document.documentElement.scrollTop;
								k.style.top = ''.concat(C, 'px');
								k.setAttribute('readonly', '');
								k.value = d;
								return k;
							}
							var F = function fakeCopyAction(d, x) {
								var k = createFakeElement(d);
								x.container.appendChild(k);
								var C = D()(k);
								command('copy');
								k.remove();
								return C;
							};
							var z = function ClipboardActionCopy(d) {
								var x =
									arguments.length > 1 && arguments[1] !== undefined
										? arguments[1]
										: { container: document.body };
								var k = '';
								if (typeof d === 'string') {
									k = F(d, x);
								} else if (
									d instanceof HTMLInputElement &&
									!['text', 'search', 'url', 'tel', 'password'].includes(
										d === null || d === void 0 ? void 0 : d.type
									)
								) {
									k = F(d.value, x);
								} else {
									k = D()(d);
									command('copy');
								}
								return k;
							};
							var W = z;
							function _typeof(d) {
								'@babel/helpers - typeof';
								if (typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol') {
									_typeof = function _typeof(d) {
										return typeof d;
									};
								} else {
									_typeof = function _typeof(d) {
										return d &&
											typeof Symbol === 'function' &&
											d.constructor === Symbol &&
											d !== Symbol.prototype
											? 'symbol'
											: typeof d;
									};
								}
								return _typeof(d);
							}
							var $ = function ClipboardActionDefault() {
								var d = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
								var x = d.action,
									k = x === void 0 ? 'copy' : x,
									C = d.container,
									j = d.target,
									T = d.text;
								if (k !== 'copy' && k !== 'cut') {
									throw new Error('Invalid "action" value, use either "copy" or "cut"');
								}
								if (j !== undefined) {
									if (j && _typeof(j) === 'object' && j.nodeType === 1) {
										if (k === 'copy' && j.hasAttribute('disabled')) {
											throw new Error(
												'Invalid "target" attribute. Please use "readonly" instead of "disabled" attribute'
											);
										}
										if (k === 'cut' && (j.hasAttribute('readonly') || j.hasAttribute('disabled'))) {
											throw new Error(
												'Invalid "target" attribute. You can\'t cut text from elements with "readonly" or "disabled" attributes'
											);
										}
									} else {
										throw new Error('Invalid "target" value, use a valid Element');
									}
								}
								if (T) {
									return W(T, { container: C });
								}
								if (j) {
									return k === 'cut' ? M(j) : W(j, { container: C });
								}
							};
							var Y = $;
							function clipboard_typeof(d) {
								'@babel/helpers - typeof';
								if (typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol') {
									clipboard_typeof = function _typeof(d) {
										return typeof d;
									};
								} else {
									clipboard_typeof = function _typeof(d) {
										return d &&
											typeof Symbol === 'function' &&
											d.constructor === Symbol &&
											d !== Symbol.prototype
											? 'symbol'
											: typeof d;
									};
								}
								return clipboard_typeof(d);
							}
							function _classCallCheck(d, x) {
								if (!(d instanceof x)) {
									throw new TypeError('Cannot call a class as a function');
								}
							}
							function _defineProperties(d, x) {
								for (var k = 0; k < x.length; k++) {
									var C = x[k];
									C.enumerable = C.enumerable || false;
									C.configurable = true;
									if ('value' in C) C.writable = true;
									Object.defineProperty(d, C.key, C);
								}
							}
							function _createClass(d, x, k) {
								if (x) _defineProperties(d.prototype, x);
								if (k) _defineProperties(d, k);
								return d;
							}
							function _inherits(d, x) {
								if (typeof x !== 'function' && x !== null) {
									throw new TypeError('Super expression must either be null or a function');
								}
								d.prototype = Object.create(x && x.prototype, {
									constructor: { value: d, writable: true, configurable: true }
								});
								if (x) _setPrototypeOf(d, x);
							}
							function _setPrototypeOf(d, x) {
								_setPrototypeOf =
									Object.setPrototypeOf ||
									function _setPrototypeOf(d, x) {
										d.__proto__ = x;
										return d;
									};
								return _setPrototypeOf(d, x);
							}
							function _createSuper(d) {
								var x = _isNativeReflectConstruct();
								return function _createSuperInternal() {
									var k = _getPrototypeOf(d),
										C;
									if (x) {
										var j = _getPrototypeOf(this).constructor;
										C = Reflect.construct(k, arguments, j);
									} else {
										C = k.apply(this, arguments);
									}
									return _possibleConstructorReturn(this, C);
								};
							}
							function _possibleConstructorReturn(d, x) {
								if (x && (clipboard_typeof(x) === 'object' || typeof x === 'function')) {
									return x;
								}
								return _assertThisInitialized(d);
							}
							function _assertThisInitialized(d) {
								if (d === void 0) {
									throw new ReferenceError(
										"this hasn't been initialised - super() hasn't been called"
									);
								}
								return d;
							}
							function _isNativeReflectConstruct() {
								if (typeof Reflect === 'undefined' || !Reflect.construct) return false;
								if (Reflect.construct.sham) return false;
								if (typeof Proxy === 'function') return true;
								try {
									Date.prototype.toString.call(Reflect.construct(Date, [], function () {}));
									return true;
								} catch (d) {
									return false;
								}
							}
							function _getPrototypeOf(d) {
								_getPrototypeOf = Object.setPrototypeOf
									? Object.getPrototypeOf
									: function _getPrototypeOf(d) {
											return d.__proto__ || Object.getPrototypeOf(d);
										};
								return _getPrototypeOf(d);
							}
							function getAttributeValue(d, x) {
								var k = 'data-clipboard-'.concat(d);
								if (!x.hasAttribute(k)) {
									return;
								}
								return x.getAttribute(k);
							}
							var Q = (function (d) {
								_inherits(Clipboard, d);
								var x = _createSuper(Clipboard);
								function Clipboard(d, k) {
									var C;
									_classCallCheck(this, Clipboard);
									C = x.call(this);
									C.resolveOptions(k);
									C.listenClick(d);
									return C;
								}
								_createClass(
									Clipboard,
									[
										{
											key: 'resolveOptions',
											value: function resolveOptions() {
												var d =
													arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
												this.action =
													typeof d.action === 'function' ? d.action : this.defaultAction;
												this.target =
													typeof d.target === 'function' ? d.target : this.defaultTarget;
												this.text = typeof d.text === 'function' ? d.text : this.defaultText;
												this.container =
													clipboard_typeof(d.container) === 'object' ? d.container : document.body;
											}
										},
										{
											key: 'listenClick',
											value: function listenClick(d) {
												var x = this;
												this.listener = K()(d, 'click', function (d) {
													return x.onClick(d);
												});
											}
										},
										{
											key: 'onClick',
											value: function onClick(d) {
												var x = d.delegateTarget || d.currentTarget;
												var k = this.action(x) || 'copy';
												var C = Y({
													action: k,
													container: this.container,
													target: this.target(x),
													text: this.text(x)
												});
												this.emit(C ? 'success' : 'error', {
													action: k,
													text: C,
													trigger: x,
													clearSelection: function clearSelection() {
														if (x) {
															x.focus();
														}
														window.getSelection().removeAllRanges();
													}
												});
											}
										},
										{
											key: 'defaultAction',
											value: function defaultAction(d) {
												return getAttributeValue('action', d);
											}
										},
										{
											key: 'defaultTarget',
											value: function defaultTarget(d) {
												var x = getAttributeValue('target', d);
												if (x) {
													return document.querySelector(x);
												}
											}
										},
										{
											key: 'defaultText',
											value: function defaultText(d) {
												return getAttributeValue('text', d);
											}
										},
										{
											key: 'destroy',
											value: function destroy() {
												this.listener.destroy();
											}
										}
									],
									[
										{
											key: 'copy',
											value: function copy(d) {
												var x =
													arguments.length > 1 && arguments[1] !== undefined
														? arguments[1]
														: { container: document.body };
												return W(d, x);
											}
										},
										{
											key: 'cut',
											value: function cut(d) {
												return M(d);
											}
										},
										{
											key: 'isSupported',
											value: function isSupported() {
												var d =
													arguments.length > 0 && arguments[0] !== undefined
														? arguments[0]
														: ['copy', 'cut'];
												var x = typeof d === 'string' ? [d] : d;
												var k = !!document.queryCommandSupported;
												x.forEach(function (d) {
													k = k && !!document.queryCommandSupported(d);
												});
												return k;
											}
										}
									]
								);
								return Clipboard;
							})(j());
							var ie = Q;
						},
						828: function (d) {
							var x = 9;
							if (typeof Element !== 'undefined' && !Element.prototype.matches) {
								var k = Element.prototype;
								k.matches =
									k.matchesSelector ||
									k.mozMatchesSelector ||
									k.msMatchesSelector ||
									k.oMatchesSelector ||
									k.webkitMatchesSelector;
							}
							function closest(d, k) {
								while (d && d.nodeType !== x) {
									if (typeof d.matches === 'function' && d.matches(k)) {
										return d;
									}
									d = d.parentNode;
								}
							}
							d.exports = closest;
						},
						438: function (d, x, k) {
							var C = k(828);
							function _delegate(d, x, k, C, j) {
								var T = listener.apply(this, arguments);
								d.addEventListener(k, T, j);
								return {
									destroy: function () {
										d.removeEventListener(k, T, j);
									}
								};
							}
							function delegate(d, x, k, C, j) {
								if (typeof d.addEventListener === 'function') {
									return _delegate.apply(null, arguments);
								}
								if (typeof k === 'function') {
									return _delegate.bind(null, document).apply(null, arguments);
								}
								if (typeof d === 'string') {
									d = document.querySelectorAll(d);
								}
								return Array.prototype.map.call(d, function (d) {
									return _delegate(d, x, k, C, j);
								});
							}
							function listener(d, x, k, j) {
								return function (k) {
									k.delegateTarget = C(k.target, x);
									if (k.delegateTarget) {
										j.call(d, k);
									}
								};
							}
							d.exports = delegate;
						},
						879: function (d, x) {
							x.node = function (d) {
								return d !== undefined && d instanceof HTMLElement && d.nodeType === 1;
							};
							x.nodeList = function (d) {
								var k = Object.prototype.toString.call(d);
								return (
									d !== undefined &&
									(k === '[object NodeList]' || k === '[object HTMLCollection]') &&
									'length' in d &&
									(d.length === 0 || x.node(d[0]))
								);
							};
							x.string = function (d) {
								return typeof d === 'string' || d instanceof String;
							};
							x.fn = function (d) {
								var x = Object.prototype.toString.call(d);
								return x === '[object Function]';
							};
						},
						370: function (d, x, k) {
							var C = k(879);
							var j = k(438);
							function listen(d, x, k) {
								if (!d && !x && !k) {
									throw new Error('Missing required arguments');
								}
								if (!C.string(x)) {
									throw new TypeError('Second argument must be a String');
								}
								if (!C.fn(k)) {
									throw new TypeError('Third argument must be a Function');
								}
								if (C.node(d)) {
									return listenNode(d, x, k);
								} else if (C.nodeList(d)) {
									return listenNodeList(d, x, k);
								} else if (C.string(d)) {
									return listenSelector(d, x, k);
								} else {
									throw new TypeError(
										'First argument must be a String, HTMLElement, HTMLCollection, or NodeList'
									);
								}
							}
							function listenNode(d, x, k) {
								d.addEventListener(x, k);
								return {
									destroy: function () {
										d.removeEventListener(x, k);
									}
								};
							}
							function listenNodeList(d, x, k) {
								Array.prototype.forEach.call(d, function (d) {
									d.addEventListener(x, k);
								});
								return {
									destroy: function () {
										Array.prototype.forEach.call(d, function (d) {
											d.removeEventListener(x, k);
										});
									}
								};
							}
							function listenSelector(d, x, k) {
								return j(document.body, d, x, k);
							}
							d.exports = listen;
						},
						817: function (d) {
							function select(d) {
								var x;
								if (d.nodeName === 'SELECT') {
									d.focus();
									x = d.value;
								} else if (d.nodeName === 'INPUT' || d.nodeName === 'TEXTAREA') {
									var k = d.hasAttribute('readonly');
									if (!k) {
										d.setAttribute('readonly', '');
									}
									d.select();
									d.setSelectionRange(0, d.value.length);
									if (!k) {
										d.removeAttribute('readonly');
									}
									x = d.value;
								} else {
									if (d.hasAttribute('contenteditable')) {
										d.focus();
									}
									var C = window.getSelection();
									var j = document.createRange();
									j.selectNodeContents(d);
									C.removeAllRanges();
									C.addRange(j);
									x = C.toString();
								}
								return x;
							}
							d.exports = select;
						},
						279: function (d) {
							function E() {}
							E.prototype = {
								on: function (d, x, k) {
									var C = this.e || (this.e = {});
									(C[d] || (C[d] = [])).push({ fn: x, ctx: k });
									return this;
								},
								once: function (d, x, k) {
									var C = this;
									function listener() {
										C.off(d, listener);
										x.apply(k, arguments);
									}
									listener._ = x;
									return this.on(d, listener, k);
								},
								emit: function (d) {
									var x = [].slice.call(arguments, 1);
									var k = ((this.e || (this.e = {}))[d] || []).slice();
									var C = 0;
									var j = k.length;
									for (C; C < j; C++) {
										k[C].fn.apply(k[C].ctx, x);
									}
									return this;
								},
								off: function (d, x) {
									var k = this.e || (this.e = {});
									var C = k[d];
									var j = [];
									if (C && x) {
										for (var T = 0, K = C.length; T < K; T++) {
											if (C[T].fn !== x && C[T].fn._ !== x) j.push(C[T]);
										}
									}
									j.length ? (k[d] = j) : delete k[d];
									return this;
								}
							};
							d.exports = E;
							d.exports.TinyEmitter = E;
						}
					};
					var x = {};
					function __nested_webpack_require_24495__(k) {
						if (x[k]) {
							return x[k].exports;
						}
						var C = (x[k] = { exports: {} });
						d[k](C, C.exports, __nested_webpack_require_24495__);
						return C.exports;
					}
					!(function () {
						__nested_webpack_require_24495__.n = function (d) {
							var x =
								d && d.__esModule
									? function () {
											return d['default'];
										}
									: function () {
											return d;
										};
							__nested_webpack_require_24495__.d(x, { a: x });
							return x;
						};
					})();
					!(function () {
						__nested_webpack_require_24495__.d = function (d, x) {
							for (var k in x) {
								if (
									__nested_webpack_require_24495__.o(x, k) &&
									!__nested_webpack_require_24495__.o(d, k)
								) {
									Object.defineProperty(d, k, { enumerable: true, get: x[k] });
								}
							}
						};
					})();
					!(function () {
						__nested_webpack_require_24495__.o = function (d, x) {
							return Object.prototype.hasOwnProperty.call(d, x);
						};
					})();
					return __nested_webpack_require_24495__(686);
				})().default;
			});
		},
		7445: (d, x, k) => {
			'use strict';
			k.d(x, { o0: () => detect });
			var C = k(5409);
			var j =
				(undefined && undefined.__spreadArray) ||
				function (d, x, k) {
					if (k || arguments.length === 2)
						for (var C = 0, j = x.length, T; C < j; C++) {
							if (T || !(C in x)) {
								if (!T) T = Array.prototype.slice.call(x, 0, C);
								T[C] = x[C];
							}
						}
					return d.concat(T || Array.prototype.slice.call(x));
				};
			var T = (function () {
				function BrowserInfo(d, x, k) {
					this.name = d;
					this.version = x;
					this.os = k;
					this.type = 'browser';
				}
				return BrowserInfo;
			})();
			var K = (function () {
				function NodeInfo(d) {
					this.version = d;
					this.type = 'node';
					this.name = 'node';
					this.os = C.platform;
				}
				return NodeInfo;
			})();
			var B = (function () {
				function SearchBotDeviceInfo(d, x, k, C) {
					this.name = d;
					this.version = x;
					this.os = k;
					this.bot = C;
					this.type = 'bot-device';
				}
				return SearchBotDeviceInfo;
			})();
			var D = (function () {
				function BotInfo() {
					this.type = 'bot';
					this.bot = true;
					this.name = 'bot';
					this.version = null;
					this.os = null;
				}
				return BotInfo;
			})();
			var R = (function () {
				function ReactNativeInfo() {
					this.type = 'react-native';
					this.name = 'react-native';
					this.version = null;
					this.os = null;
				}
				return ReactNativeInfo;
			})();
			var M =
				/alexa|bot|crawl(er|ing)|facebookexternalhit|feedburner|google web preview|nagios|postrank|pingdom|slurp|spider|yahoo!|yandex/;
			var F = /(nuhk|curl|Googlebot|Yammybot|Openbot|Slurp|MSNBot|Ask\ Jeeves\/Teoma|ia_archiver)/;
			var z = 3;
			var W = [
				['aol', /AOLShield\/([0-9\._]+)/],
				['edge', /Edge\/([0-9\._]+)/],
				['edge-ios', /EdgiOS\/([0-9\._]+)/],
				['yandexbrowser', /YaBrowser\/([0-9\._]+)/],
				['kakaotalk', /KAKAOTALK\s([0-9\.]+)/],
				['samsung', /SamsungBrowser\/([0-9\.]+)/],
				['silk', /\bSilk\/([0-9._-]+)\b/],
				['miui', /MiuiBrowser\/([0-9\.]+)$/],
				['beaker', /BeakerBrowser\/([0-9\.]+)/],
				['edge-chromium', /EdgA?\/([0-9\.]+)/],
				['chromium-webview', /(?!Chrom.*OPR)wv\).*Chrom(?:e|ium)\/([0-9\.]+)(:?\s|$)/],
				['chrome', /(?!Chrom.*OPR)Chrom(?:e|ium)\/([0-9\.]+)(:?\s|$)/],
				['phantomjs', /PhantomJS\/([0-9\.]+)(:?\s|$)/],
				['crios', /CriOS\/([0-9\.]+)(:?\s|$)/],
				['firefox', /Firefox\/([0-9\.]+)(?:\s|$)/],
				['fxios', /FxiOS\/([0-9\.]+)/],
				['opera-mini', /Opera Mini.*Version\/([0-9\.]+)/],
				['opera', /Opera\/([0-9\.]+)(?:\s|$)/],
				['opera', /OPR\/([0-9\.]+)(:?\s|$)/],
				['pie', /^Microsoft Pocket Internet Explorer\/(\d+\.\d+)$/],
				[
					'pie',
					/^Mozilla\/\d\.\d+\s\(compatible;\s(?:MSP?IE|MSInternet Explorer) (\d+\.\d+);.*Windows CE.*\)$/
				],
				['netfront', /^Mozilla\/\d\.\d+.*NetFront\/(\d.\d)/],
				['ie', /Trident\/7\.0.*rv\:([0-9\.]+).*\).*Gecko$/],
				['ie', /MSIE\s([0-9\.]+);.*Trident\/[4-7].0/],
				['ie', /MSIE\s(7\.0)/],
				['bb10', /BB10;\sTouch.*Version\/([0-9\.]+)/],
				['android', /Android\s([0-9\.]+)/],
				['ios', /Version\/([0-9\._]+).*Mobile.*Safari.*/],
				['safari', /Version\/([0-9\._]+).*Safari/],
				['facebook', /FB[AS]V\/([0-9\.]+)/],
				['instagram', /Instagram\s([0-9\.]+)/],
				['ios-webview', /AppleWebKit\/([0-9\.]+).*Mobile/],
				['ios-webview', /AppleWebKit\/([0-9\.]+).*Gecko\)$/],
				['curl', /^curl\/([0-9\.]+)$/],
				['searchbot', M]
			];
			var $ = [
				['iOS', /iP(hone|od|ad)/],
				['Android OS', /Android/],
				['BlackBerry OS', /BlackBerry|BB10/],
				['Windows Mobile', /IEMobile/],
				['Amazon OS', /Kindle/],
				['Windows 3.11', /Win16/],
				['Windows 95', /(Windows 95)|(Win95)|(Windows_95)/],
				['Windows 98', /(Windows 98)|(Win98)/],
				['Windows 2000', /(Windows NT 5.0)|(Windows 2000)/],
				['Windows XP', /(Windows NT 5.1)|(Windows XP)/],
				['Windows Server 2003', /(Windows NT 5.2)/],
				['Windows Vista', /(Windows NT 6.0)/],
				['Windows 7', /(Windows NT 6.1)/],
				['Windows 8', /(Windows NT 6.2)/],
				['Windows 8.1', /(Windows NT 6.3)/],
				['Windows 10', /(Windows NT 10.0)/],
				['Windows ME', /Windows ME/],
				['Windows CE', /Windows CE|WinCE|Microsoft Pocket Internet Explorer/],
				['Open BSD', /OpenBSD/],
				['Sun OS', /SunOS/],
				['Chrome OS', /CrOS/],
				['Linux', /(Linux)|(X11)/],
				['Mac OS', /(Mac_PowerPC)|(Macintosh)/],
				['QNX', /QNX/],
				['BeOS', /BeOS/],
				['OS/2', /OS\/2/]
			];
			function detect(d) {
				if (!!d) {
					return parseUserAgent(d);
				}
				if (
					typeof document === 'undefined' &&
					typeof navigator !== 'undefined' &&
					navigator.product === 'ReactNative'
				) {
					return new R();
				}
				if (typeof navigator !== 'undefined') {
					return parseUserAgent(navigator.userAgent);
				}
				return getNodeVersion();
			}
			function matchUserAgent(d) {
				return (
					d !== '' &&
					W.reduce(function (x, k) {
						var C = k[0],
							j = k[1];
						if (x) {
							return x;
						}
						var T = j.exec(d);
						return !!T && [C, T];
					}, false)
				);
			}
			function browserName(d) {
				var x = matchUserAgent(d);
				return x ? x[0] : null;
			}
			function parseUserAgent(d) {
				var x = matchUserAgent(d);
				if (!x) {
					return null;
				}
				var k = x[0],
					C = x[1];
				if (k === 'searchbot') {
					return new D();
				}
				var K = C[1] && C[1].split('.').join('_').split('_').slice(0, 3);
				if (K) {
					if (K.length < z) {
						K = j(j([], K, true), createVersionParts(z - K.length), true);
					}
				} else {
					K = [];
				}
				var R = K.join('.');
				var M = detectOS(d);
				var W = F.exec(d);
				if (W && W[1]) {
					return new B(k, R, M, W[1]);
				}
				return new T(k, R, M);
			}
			function detectOS(d) {
				for (var x = 0, k = $.length; x < k; x++) {
					var C = $[x],
						j = C[0],
						T = C[1];
					var K = T.exec(d);
					if (K) {
						return j;
					}
				}
				return null;
			}
			function getNodeVersion() {
				var d = typeof C !== 'undefined' && C.version;
				return d ? new K(C.version.slice(1)) : null;
			}
			function createVersionParts(d) {
				var x = [];
				for (var k = 0; k < d; k++) {
					x.push('0');
				}
				return x;
			}
		},
		504: function (d, x, k) {
			(function (x, k) {
				true ? (d.exports = k()) : 0;
			})(this, function () {
				'use strict';
				var s = function (d, x) {
					return (s =
						Object.setPrototypeOf ||
						({ __proto__: [] } instanceof Array &&
							function (d, x) {
								d.__proto__ = x;
							}) ||
						function (d, x) {
							for (var k in x) Object.prototype.hasOwnProperty.call(x, k) && (d[k] = x[k]);
						})(d, x);
				};
				var _ = function () {
					return (_ =
						Object.assign ||
						function (d) {
							for (var x, k = 1, C = arguments.length; k < C; k++)
								for (var j in (x = arguments[k]))
									Object.prototype.hasOwnProperty.call(x, j) && (d[j] = x[j]);
							return d;
						}).apply(this, arguments);
				};
				function i(d, x, k) {
					if (k || 2 === arguments.length)
						for (var C, j = 0, T = x.length; j < T; j++)
							(!C && j in x) || ((C = C || Array.prototype.slice.call(x, 0, j))[j] = x[j]);
					return d.concat(C || Array.prototype.slice.call(x));
				}
				var d =
						'undefined' != typeof globalThis
							? globalThis
							: 'undefined' != typeof self
								? self
								: 'undefined' != typeof window
									? window
									: k.g,
					x = Object.keys,
					C = Array.isArray;
				function a(d, k) {
					return (
						'object' != typeof k ||
							x(k).forEach(function (x) {
								d[x] = k[x];
							}),
						d
					);
				}
				'undefined' == typeof Promise || d.Promise || (d.Promise = Promise);
				var j = Object.getPrototypeOf,
					T = {}.hasOwnProperty;
				function m(d, x) {
					return T.call(d, x);
				}
				function r(d, k) {
					'function' == typeof k && (k = k(j(d))),
						('undefined' == typeof Reflect ? x : Reflect.ownKeys)(k).forEach(function (x) {
							l(d, x, k[x]);
						});
				}
				var K = Object.defineProperty;
				function l(d, x, k, C) {
					K(
						d,
						x,
						a(
							k && m(k, 'get') && 'function' == typeof k.get
								? { get: k.get, set: k.set, configurable: !0 }
								: { value: k, configurable: !0, writable: !0 },
							C
						)
					);
				}
				function o(d) {
					return {
						from: function (x) {
							return (
								(d.prototype = Object.create(x.prototype)),
								l(d.prototype, 'constructor', d),
								{ extend: r.bind(null, d.prototype) }
							);
						}
					};
				}
				var B = Object.getOwnPropertyDescriptor;
				var D = [].slice;
				function b(d, x, k) {
					return D.call(d, x, k);
				}
				function p(d, x) {
					return x(d);
				}
				function y(d) {
					if (!d) throw new Error('Assertion Failed');
				}
				function v(x) {
					d.setImmediate ? setImmediate(x) : setTimeout(x, 0);
				}
				function O(d, x) {
					if ('string' == typeof x && m(d, x)) return d[x];
					if (!x) return d;
					if ('string' != typeof x) {
						for (var k = [], C = 0, j = x.length; C < j; ++C) {
							var T = O(d, x[C]);
							k.push(T);
						}
						return k;
					}
					var K = x.indexOf('.');
					if (-1 !== K) {
						var B = d[x.substr(0, K)];
						return null == B ? void 0 : O(B, x.substr(K + 1));
					}
				}
				function P(d, x, k) {
					if (d && void 0 !== x && !('isFrozen' in Object && Object.isFrozen(d)))
						if ('string' != typeof x && 'length' in x) {
							y('string' != typeof k && 'length' in k);
							for (var j = 0, T = x.length; j < T; ++j) P(d, x[j], k[j]);
						} else {
							var K,
								B,
								D = x.indexOf('.');
							-1 !== D
								? ((K = x.substr(0, D)),
									'' === (B = x.substr(D + 1))
										? void 0 === k
											? C(d) && !isNaN(parseInt(K))
												? d.splice(K, 1)
												: delete d[K]
											: (d[K] = k)
										: P((D = !(D = d[K]) || !m(d, K) ? (d[K] = {}) : D), B, k))
								: void 0 === k
									? C(d) && !isNaN(parseInt(x))
										? d.splice(x, 1)
										: delete d[x]
									: (d[x] = k);
						}
				}
				function g(d) {
					var x,
						k = {};
					for (x in d) m(d, x) && (k[x] = d[x]);
					return k;
				}
				var R = [].concat;
				function w(d) {
					return R.apply([], d);
				}
				var M =
						'BigUint64Array,BigInt64Array,Array,Boolean,String,Date,RegExp,Blob,File,FileList,FileSystemFileHandle,FileSystemDirectoryHandle,ArrayBuffer,DataView,Uint8ClampedArray,ImageBitmap,ImageData,Map,Set,CryptoKey'
							.split(',')
							.concat(
								w(
									[8, 16, 32, 64].map(function (d) {
										return ['Int', 'Uint', 'Float'].map(function (x) {
											return x + d + 'Array';
										});
									})
								)
							)
							.filter(function (x) {
								return d[x];
							}),
					F = new Set(
						M.map(function (x) {
							return d[x];
						})
					);
				var z = null;
				function S(d) {
					z = new WeakMap();
					d = (function e(d) {
						if (!d || 'object' != typeof d) return d;
						var x = z.get(d);
						if (x) return x;
						if (C(d)) {
							(x = []), z.set(d, x);
							for (var k = 0, T = d.length; k < T; ++k) x.push(e(d[k]));
						} else if (F.has(d.constructor)) x = d;
						else {
							var K,
								B = j(d);
							for (K in ((x = B === Object.prototype ? {} : Object.create(B)), z.set(d, x), d))
								m(d, K) && (x[K] = e(d[K]));
						}
						return x;
					})(d);
					return (z = null), d;
				}
				var W = {}.toString;
				function A(d) {
					return W.call(d).slice(8, -1);
				}
				var $ = 'undefined' != typeof Symbol ? Symbol.iterator : '@@iterator',
					Y =
						'symbol' == typeof $
							? function (d) {
									var x;
									return null != d && (x = d[$]) && x.apply(d);
								}
							: function () {
									return null;
								};
				function q(d, x) {
					x = d.indexOf(x);
					return 0 <= x && d.splice(x, 1), 0 <= x;
				}
				var Q = {};
				function I(d) {
					var x, k, j, T;
					if (1 === arguments.length) {
						if (C(d)) return d.slice();
						if (this === Q && 'string' == typeof d) return [d];
						if ((T = Y(d))) {
							for (k = []; !(j = T.next()).done; ) k.push(j.value);
							return k;
						}
						if (null == d) return [d];
						if ('number' != typeof (x = d.length)) return [d];
						for (k = new Array(x); x--; ) k[x] = d[x];
						return k;
					}
					for (x = arguments.length, k = new Array(x); x--; ) k[x] = arguments[x];
					return k;
				}
				var ie =
						'undefined' != typeof Symbol
							? function (d) {
									return 'AsyncFunction' === d[Symbol.toStringTag];
								}
							: function () {
									return !1;
								},
					ae = [
						'Unknown',
						'Constraint',
						'Data',
						'TransactionInactive',
						'ReadOnly',
						'Version',
						'NotFound',
						'InvalidState',
						'InvalidAccess',
						'Abort',
						'Timeout',
						'QuotaExceeded',
						'Syntax',
						'DataClone'
					],
					ue = [
						'Modify',
						'Bulk',
						'OpenFailed',
						'VersionChange',
						'Schema',
						'Upgrade',
						'InvalidTable',
						'MissingAPI',
						'NoSuchDatabase',
						'InvalidArgument',
						'SubTransaction',
						'Unsupported',
						'Internal',
						'DatabaseClosed',
						'PrematureCommit',
						'ForeignAwait'
					].concat(ae),
					se = {
						VersionChanged: 'Database version changed by other database connection',
						DatabaseClosed: 'Database has been closed',
						Abort: 'Transaction aborted',
						TransactionInactive: 'Transaction has already completed or failed',
						MissingAPI: 'IndexedDB API missing. Please visit https://tinyurl.com/y2uuvskb'
					};
				function N(d, x) {
					(this.name = d), (this.message = x);
				}
				function L(d, x) {
					return (
						d +
						'. Errors: ' +
						Object.keys(x)
							.map(function (d) {
								return x[d].toString();
							})
							.filter(function (d, x, k) {
								return k.indexOf(d) === x;
							})
							.join('\n')
					);
				}
				function U(d, x, k, C) {
					(this.failures = x),
						(this.failedKeys = C),
						(this.successCount = k),
						(this.message = L(d, x));
				}
				function V(d, x) {
					(this.name = 'BulkError'),
						(this.failures = Object.keys(x).map(function (d) {
							return x[d];
						})),
						(this.failuresByPos = x),
						(this.message = L(d, this.failures));
				}
				o(N)
					.from(Error)
					.extend({
						toString: function () {
							return this.name + ': ' + this.message;
						}
					}),
					o(U).from(N),
					o(V).from(N);
				var ce = ue.reduce(function (d, x) {
						return (d[x] = x + 'Error'), d;
					}, {}),
					fe = N,
					he = ue.reduce(function (d, x) {
						var k = x + 'Error';
						function t(d, C) {
							(this.name = k),
								d
									? 'string' == typeof d
										? ((this.message = ''.concat(d).concat(C ? '\n ' + C : '')),
											(this.inner = C || null))
										: 'object' == typeof d &&
											((this.message = ''.concat(d.name, ' ').concat(d.message)), (this.inner = d))
									: ((this.message = se[x] || k), (this.inner = null));
						}
						return o(t).from(fe), (d[x] = t), d;
					}, {});
				(he.Syntax = SyntaxError), (he.Type = TypeError), (he.Range = RangeError);
				var de = ae.reduce(function (d, x) {
					return (d[x + 'Error'] = he[x]), d;
				}, {});
				var pe = ue.reduce(function (d, x) {
					return -1 === ['Syntax', 'Type', 'Range'].indexOf(x) && (d[x + 'Error'] = he[x]), d;
				}, {});
				function G() {}
				function X(d) {
					return d;
				}
				function H(d, x) {
					return null == d || d === X
						? x
						: function (k) {
								return x(d(k));
							};
				}
				function J(d, x) {
					return function () {
						d.apply(this, arguments), x.apply(this, arguments);
					};
				}
				function Z(d, x) {
					return d === G
						? x
						: function () {
								var k = d.apply(this, arguments);
								void 0 !== k && (arguments[0] = k);
								var C = this.onsuccess,
									j = this.onerror;
								(this.onsuccess = null), (this.onerror = null);
								var T = x.apply(this, arguments);
								return (
									C && (this.onsuccess = this.onsuccess ? J(C, this.onsuccess) : C),
									j && (this.onerror = this.onerror ? J(j, this.onerror) : j),
									void 0 !== T ? T : k
								);
							};
				}
				function ee(d, x) {
					return d === G
						? x
						: function () {
								d.apply(this, arguments);
								var k = this.onsuccess,
									C = this.onerror;
								(this.onsuccess = this.onerror = null),
									x.apply(this, arguments),
									k && (this.onsuccess = this.onsuccess ? J(k, this.onsuccess) : k),
									C && (this.onerror = this.onerror ? J(C, this.onerror) : C);
							};
				}
				function te(d, x) {
					return d === G
						? x
						: function (k) {
								var C = d.apply(this, arguments);
								a(k, C);
								var j = this.onsuccess,
									T = this.onerror;
								(this.onsuccess = null), (this.onerror = null);
								k = x.apply(this, arguments);
								return (
									j && (this.onsuccess = this.onsuccess ? J(j, this.onsuccess) : j),
									T && (this.onerror = this.onerror ? J(T, this.onerror) : T),
									void 0 === C ? (void 0 === k ? void 0 : k) : a(C, k)
								);
							};
				}
				function ne(d, x) {
					return d === G
						? x
						: function () {
								return !1 !== x.apply(this, arguments) && d.apply(this, arguments);
							};
				}
				function re(d, x) {
					return d === G
						? x
						: function () {
								var k = d.apply(this, arguments);
								if (k && 'function' == typeof k.then) {
									for (var C = this, j = arguments.length, T = new Array(j); j--; )
										T[j] = arguments[j];
									return k.then(function () {
										return x.apply(C, T);
									});
								}
								return x.apply(this, arguments);
							};
				}
				(pe.ModifyError = U), (pe.DexieError = N), (pe.BulkError = V);
				var ye =
					'undefined' != typeof location &&
					/^(http|https):\/\/(localhost|127\.0\.0\.1)/.test(location.href);
				function oe(d) {
					ye = d;
				}
				var ve = {},
					be = 100,
					M =
						'undefined' == typeof Promise
							? []
							: (function () {
									var d = Promise.resolve();
									if ('undefined' == typeof crypto || !crypto.subtle) return [d, j(d), d];
									var x = crypto.subtle.digest('SHA-512', new Uint8Array([0]));
									return [x, j(x), d];
								})(),
					ae = M[0],
					ue = M[1],
					M = M[2],
					ue = ue && ue.then,
					me = ae && ae.constructor,
					ge = !!M;
				var le = function (d, x) {
						Fe.push([d, x]), xe && (queueMicrotask(Se), (xe = !1));
					},
					we = !0,
					xe = !0,
					Ie = [],
					Be = [],
					De = X,
					Re = {
						id: 'global',
						global: !0,
						ref: 0,
						unhandleds: [],
						onunhandled: G,
						pgp: !1,
						env: {},
						finalize: G
					},
					Me = Re,
					Fe = [],
					Xe = 0,
					He = [];
				function _e(d) {
					if ('object' != typeof this) throw new TypeError('Promises must be constructed via new');
					(this._listeners = []), (this._lib = !1);
					var x = (this._PSD = Me);
					if ('function' != typeof d) {
						if (d !== ve) throw new TypeError('Not a function');
						return (
							(this._state = arguments[1]),
							(this._value = arguments[2]),
							void (!1 === this._state && Oe(this, this._value))
						);
					}
					(this._state = null),
						(this._value = null),
						++x.ref,
						(function t(d, x) {
							try {
								x(
									function (x) {
										if (null === d._state) {
											if (x === d) throw new TypeError('A promise cannot be resolved with itself.');
											var k = d._lib && je();
											x && 'function' == typeof x.then
												? t(d, function (d, k) {
														x instanceof _e ? x._then(d, k) : x.then(d, k);
													})
												: ((d._state = !0), (d._value = x), Pe(d)),
												k && Ae();
										}
									},
									Oe.bind(null, d)
								);
							} catch (x) {
								Oe(d, x);
							}
						})(this, d);
				}
				var Je = {
					get: function () {
						var d = Me,
							x = rt;
						function e(k, C) {
							var j = this,
								T = !d.global && (d !== Me || x !== rt),
								K = T && !Ue(),
								B = new _e(function (x, B) {
									Ke(j, new ke(Qe(k, d, T, K), Qe(C, d, T, K), x, B, d));
								});
							return this._consoleTask && (B._consoleTask = this._consoleTask), B;
						}
						return (e.prototype = ve), e;
					},
					set: function (d) {
						l(
							this,
							'then',
							d && d.prototype === ve
								? Je
								: {
										get: function () {
											return d;
										},
										set: Je.set
									}
						);
					}
				};
				function ke(d, x, k, C, j) {
					(this.onFulfilled = 'function' == typeof d ? d : null),
						(this.onRejected = 'function' == typeof x ? x : null),
						(this.resolve = k),
						(this.reject = C),
						(this.psd = j);
				}
				function Oe(d, x) {
					var k, C;
					Be.push(x),
						null === d._state &&
							((k = d._lib && je()),
							(x = De(x)),
							(d._state = !1),
							(d._value = x),
							(C = d),
							Ie.some(function (d) {
								return d._value === C._value;
							}) || Ie.push(C),
							Pe(d),
							k && Ae());
				}
				function Pe(d) {
					var x = d._listeners;
					d._listeners = [];
					for (var k = 0, C = x.length; k < C; ++k) Ke(d, x[k]);
					var j = d._PSD;
					--j.ref || j.finalize(),
						0 === Xe &&
							(++Xe,
							le(function () {
								0 == --Xe && Ce();
							}, []));
				}
				function Ke(d, x) {
					if (null !== d._state) {
						var k = d._state ? x.onFulfilled : x.onRejected;
						if (null === k) return (d._state ? x.resolve : x.reject)(d._value);
						++x.psd.ref, ++Xe, le(Ee, [k, d, x]);
					} else d._listeners.push(x);
				}
				function Ee(d, x, k) {
					try {
						var C,
							j = x._value;
						!x._state && Be.length && (Be = []),
							(C =
								ye && x._consoleTask
									? x._consoleTask.run(function () {
											return d(j);
										})
									: d(j)),
							x._state ||
								-1 !== Be.indexOf(j) ||
								(function (d) {
									var x = Ie.length;
									for (; x; ) if (Ie[--x]._value === d._value) return Ie.splice(x, 1);
								})(x),
							k.resolve(C);
					} catch (d) {
						k.reject(d);
					} finally {
						0 == --Xe && Ce(), --k.psd.ref || k.psd.finalize();
					}
				}
				function Se() {
					$e(Re, function () {
						je() && Ae();
					});
				}
				function je() {
					var d = we;
					return (xe = we = !1), d;
				}
				function Ae() {
					var d, x, k;
					do {
						for (; 0 < Fe.length; )
							for (d = Fe, Fe = [], k = d.length, x = 0; x < k; ++x) {
								var C = d[x];
								C[0].apply(null, C[1]);
							}
					} while (0 < Fe.length);
					xe = we = !0;
				}
				function Ce() {
					var d = Ie;
					(Ie = []),
						d.forEach(function (d) {
							d._PSD.onunhandled.call(null, d._value, d);
						});
					for (var x = He.slice(0), k = x.length; k; ) x[--k]();
				}
				function Te(d) {
					return new _e(ve, !1, d);
				}
				function qe(d, x) {
					var k = Me;
					return function () {
						var C = je(),
							j = Me;
						try {
							return We(k, !0), d.apply(this, arguments);
						} catch (C) {
							x && x(C);
						} finally {
							We(j, !1), C && Ae();
						}
					};
				}
				r(_e.prototype, {
					then: Je,
					_then: function (d, x) {
						Ke(this, new ke(null, null, d, x, Me));
					},
					catch: function (d) {
						if (1 === arguments.length) return this.then(null, d);
						var x = d,
							k = arguments[1];
						return 'function' == typeof x
							? this.then(null, function (d) {
									return (d instanceof x ? k : Te)(d);
								})
							: this.then(null, function (d) {
									return (d && d.name === x ? k : Te)(d);
								});
					},
					finally: function (d) {
						return this.then(
							function (x) {
								return _e.resolve(d()).then(function () {
									return x;
								});
							},
							function (x) {
								return _e.resolve(d()).then(function () {
									return Te(x);
								});
							}
						);
					},
					timeout: function (d, x) {
						var k = this;
						return d < 1 / 0
							? new _e(function (C, j) {
									var T = setTimeout(function () {
										return j(new he.Timeout(x));
									}, d);
									k.then(C, j).finally(clearTimeout.bind(null, T));
								})
							: this;
					}
				}),
					'undefined' != typeof Symbol &&
						Symbol.toStringTag &&
						l(_e.prototype, Symbol.toStringTag, 'Dexie.Promise'),
					(Re.env = Ye()),
					r(_e, {
						all: function () {
							var d = I.apply(null, arguments).map(Ve);
							return new _e(function (x, k) {
								0 === d.length && x([]);
								var C = d.length;
								d.forEach(function (j, T) {
									return _e.resolve(j).then(function (k) {
										(d[T] = k), --C || x(d);
									}, k);
								});
							});
						},
						resolve: function (d) {
							return d instanceof _e
								? d
								: d && 'function' == typeof d.then
									? new _e(function (x, k) {
											d.then(x, k);
										})
									: new _e(ve, !0, d);
						},
						reject: Te,
						race: function () {
							var d = I.apply(null, arguments).map(Ve);
							return new _e(function (x, k) {
								d.map(function (d) {
									return _e.resolve(d).then(x, k);
								});
							});
						},
						PSD: {
							get: function () {
								return Me;
							},
							set: function (d) {
								return (Me = d);
							}
						},
						totalEchoes: {
							get: function () {
								return rt;
							}
						},
						newPSD: Ne,
						usePSD: $e,
						scheduler: {
							get: function () {
								return le;
							},
							set: function (d) {
								le = d;
							}
						},
						rejectionMapper: {
							get: function () {
								return De;
							},
							set: function (d) {
								De = d;
							}
						},
						follow: function (d, x) {
							return new _e(function (k, C) {
								return Ne(
									function (x, k) {
										var C = Me;
										(C.unhandleds = []),
											(C.onunhandled = k),
											(C.finalize = J(function () {
												var d,
													C = this;
												(d = function () {
													0 === C.unhandleds.length ? x() : k(C.unhandleds[0]);
												}),
													He.push(function e() {
														d(), He.splice(He.indexOf(e), 1);
													}),
													++Xe,
													le(function () {
														0 == --Xe && Ce();
													}, []);
											}, C.finalize)),
											d();
									},
									x,
									k,
									C
								);
							});
						}
					}),
					me &&
						(me.allSettled &&
							l(_e, 'allSettled', function () {
								var d = I.apply(null, arguments).map(Ve);
								return new _e(function (x) {
									0 === d.length && x([]);
									var k = d.length,
										C = new Array(k);
									d.forEach(function (d, j) {
										return _e
											.resolve(d)
											.then(
												function (d) {
													return (C[j] = { status: 'fulfilled', value: d });
												},
												function (d) {
													return (C[j] = { status: 'rejected', reason: d });
												}
											)
											.then(function () {
												return --k || x(C);
											});
									});
								});
							}),
						me.any &&
							'undefined' != typeof AggregateError &&
							l(_e, 'any', function () {
								var d = I.apply(null, arguments).map(Ve);
								return new _e(function (x, k) {
									0 === d.length && k(new AggregateError([]));
									var C = d.length,
										j = new Array(C);
									d.forEach(function (d, T) {
										return _e.resolve(d).then(
											function (d) {
												return x(d);
											},
											function (d) {
												(j[T] = d), --C || k(new AggregateError(j));
											}
										);
									});
								});
							}),
						me.withResolvers && (_e.withResolvers = me.withResolvers));
				var Ze = { awaits: 0, echoes: 0, id: 0 },
					et = 0,
					tt = [],
					nt = 0,
					rt = 0,
					ot = 0;
				function Ne(d, x, k, C) {
					var j = Me,
						T = Object.create(j);
					(T.parent = j),
						(T.ref = 0),
						(T.global = !1),
						(T.id = ++ot),
						Re.env,
						(T.env = ge
							? {
									Promise: _e,
									PromiseProp: { value: _e, configurable: !0, writable: !0 },
									all: _e.all,
									race: _e.race,
									allSettled: _e.allSettled,
									any: _e.any,
									resolve: _e.resolve,
									reject: _e.reject
								}
							: {}),
						x && a(T, x),
						++j.ref,
						(T.finalize = function () {
							--this.parent.ref || this.parent.finalize();
						});
					C = $e(T, d, k, C);
					return 0 === T.ref && T.finalize(), C;
				}
				function Le() {
					return Ze.id || (Ze.id = ++et), ++Ze.awaits, (Ze.echoes += be), Ze.id;
				}
				function Ue() {
					return !!Ze.awaits && (0 == --Ze.awaits && (Ze.id = 0), (Ze.echoes = Ze.awaits * be), !0);
				}
				function Ve(d) {
					return Ze.echoes && d && d.constructor === me
						? (Le(),
							d.then(
								function (d) {
									return Ue(), d;
								},
								function (d) {
									return Ue(), ft(d);
								}
							))
						: d;
				}
				function ze() {
					var d = tt[tt.length - 1];
					tt.pop(), We(d, !1);
				}
				function We(x, k) {
					var C,
						j = Me;
					(k ? !Ze.echoes || (nt++ && x === Me) : !nt || (--nt && x === Me)) ||
						queueMicrotask(
							k
								? function (d) {
										++rt,
											(Ze.echoes && 0 != --Ze.echoes) || (Ze.echoes = Ze.awaits = Ze.id = 0),
											tt.push(Me),
											We(d, !0);
									}.bind(null, x)
								: ze
						),
						x !== Me &&
							((Me = x),
							j === Re && (Re.env = Ye()),
							ge &&
								((C = Re.env.Promise),
								(k = x.env),
								(j.global || x.global) &&
									(Object.defineProperty(d, 'Promise', k.PromiseProp),
									(C.all = k.all),
									(C.race = k.race),
									(C.resolve = k.resolve),
									(C.reject = k.reject),
									k.allSettled && (C.allSettled = k.allSettled),
									k.any && (C.any = k.any))));
				}
				function Ye() {
					var x = d.Promise;
					return ge
						? {
								Promise: x,
								PromiseProp: Object.getOwnPropertyDescriptor(d, 'Promise'),
								all: x.all,
								race: x.race,
								allSettled: x.allSettled,
								any: x.any,
								resolve: x.resolve,
								reject: x.reject
							}
						: {};
				}
				function $e(d, x, k, C, j) {
					var T = Me;
					try {
						return We(d, !0), x(k, C, j);
					} finally {
						We(T, !1);
					}
				}
				function Qe(d, x, k, C) {
					return 'function' != typeof d
						? d
						: function () {
								var j = Me;
								k && Le(), We(x, !0);
								try {
									return d.apply(this, arguments);
								} finally {
									We(j, !1), C && queueMicrotask(Ue);
								}
							};
				}
				function Ge(d) {
					Promise === me && 0 === Ze.echoes
						? 0 === nt
							? d()
							: enqueueNativeMicroTask(d)
						: setTimeout(d, 0);
				}
				-1 === ('' + ue).indexOf('[native code]') && (Le = Ue = G);
				var ft = _e.reject;
				var xt = String.fromCharCode(65535),
					Ot =
						'Invalid key provided. Keys must be of type string, number, Date or Array<string | number | Date>.',
					Nt = 'String expected.',
					Dt = [],
					Mt = '__dbnames',
					Ft = 'readonly',
					Lt = 'readwrite';
				function it(d, x) {
					return d
						? x
							? function () {
									return d.apply(this, arguments) && x.apply(this, arguments);
								}
							: d
						: x;
				}
				var Gt = { type: 3, lower: -1 / 0, lowerOpen: !1, upper: [[]], upperOpen: !1 };
				function at(d) {
					return 'string' != typeof d || /\./.test(d)
						? function (d) {
								return d;
							}
						: function (x) {
								return void 0 === x[d] && d in x && delete (x = S(x))[d], x;
							};
				}
				function ut() {
					throw he.Type();
				}
				function st(d, x) {
					try {
						var k = ct(d),
							C = ct(x);
						if (k !== C)
							return 'Array' === k
								? 1
								: 'Array' === C
									? -1
									: 'binary' === k
										? 1
										: 'binary' === C
											? -1
											: 'string' === k
												? 1
												: 'string' === C
													? -1
													: 'Date' === k
														? 1
														: 'Date' !== C
															? NaN
															: -1;
						switch (k) {
							case 'number':
							case 'Date':
							case 'string':
								return x < d ? 1 : d < x ? -1 : 0;
							case 'binary':
								return (function (d, x) {
									for (var k = d.length, C = x.length, j = k < C ? k : C, T = 0; T < j; ++T)
										if (d[T] !== x[T]) return d[T] < x[T] ? -1 : 1;
									return k === C ? 0 : k < C ? -1 : 1;
								})(lt(d), lt(x));
							case 'Array':
								return (function (d, x) {
									for (var k = d.length, C = x.length, j = k < C ? k : C, T = 0; T < j; ++T) {
										var K = st(d[T], x[T]);
										if (0 !== K) return K;
									}
									return k === C ? 0 : k < C ? -1 : 1;
								})(d, x);
						}
					} catch (d) {}
					return NaN;
				}
				function ct(d) {
					var x = typeof d;
					if ('object' != x) return x;
					if (ArrayBuffer.isView(d)) return 'binary';
					d = A(d);
					return 'ArrayBuffer' === d ? 'binary' : d;
				}
				function lt(d) {
					return d instanceof Uint8Array
						? d
						: ArrayBuffer.isView(d)
							? new Uint8Array(d.buffer, d.byteOffset, d.byteLength)
							: new Uint8Array(d);
				}
				var dn =
					((ht.prototype._trans = function (d, x, k) {
						var C = this._tx || Me.trans,
							j = this.name,
							T =
								ye &&
								'undefined' != typeof console &&
								console.createTask &&
								console.createTask(
									'Dexie: '.concat('readonly' === d ? 'read' : 'write', ' ').concat(this.name)
								);
						function a(d, k, C) {
							if (!C.schema[j]) throw new he.NotFound('Table ' + j + ' not part of transaction');
							return x(C.idbtrans, C);
						}
						var K = je();
						try {
							var B =
								C && C.db._novip === this.db._novip
									? C === Me.trans
										? C._promise(d, a, k)
										: Ne(
												function () {
													return C._promise(d, a, k);
												},
												{ trans: C, transless: Me.transless || Me }
											)
									: (function t(d, x, k, C) {
											if (d.idbdb && (d._state.openComplete || Me.letThrough || d._vip)) {
												var j = d._createTransaction(x, k, d._dbSchema);
												try {
													j.create(), (d._state.PR1398_maxLoop = 3);
												} catch (j) {
													return j.name === ce.InvalidState &&
														d.isOpen() &&
														0 < --d._state.PR1398_maxLoop
														? (console.warn('Dexie: Need to reopen db'),
															d.close({ disableAutoOpen: !1 }),
															d.open().then(function () {
																return t(d, x, k, C);
															}))
														: ft(j);
												}
												return j
													._promise(x, function (d, x) {
														return Ne(function () {
															return (Me.trans = j), C(d, x, j);
														});
													})
													.then(function (d) {
														if ('readwrite' === x)
															try {
																j.idbtrans.commit();
															} catch (d) {}
														return 'readonly' === x
															? d
															: j._completion.then(function () {
																	return d;
																});
													});
											}
											if (d._state.openComplete)
												return ft(new he.DatabaseClosed(d._state.dbOpenError));
											if (!d._state.isBeingOpened) {
												if (!d._state.autoOpen) return ft(new he.DatabaseClosed());
												d.open().catch(G);
											}
											return d._state.dbReadyPromise.then(function () {
												return t(d, x, k, C);
											});
										})(this.db, d, [this.name], a);
							return (
								T &&
									((B._consoleTask = T),
									(B = B.catch(function (d) {
										return console.trace(d), ft(d);
									}))),
								B
							);
						} finally {
							K && Ae();
						}
					}),
					(ht.prototype.get = function (d, x) {
						var k = this;
						return d && d.constructor === Object
							? this.where(d).first(x)
							: null == d
								? ft(new he.Type('Invalid argument to Table.get()'))
								: this._trans('readonly', function (x) {
										return k.core.get({ trans: x, key: d }).then(function (d) {
											return k.hook.reading.fire(d);
										});
									}).then(x);
					}),
					(ht.prototype.where = function (d) {
						if ('string' == typeof d) return new this.db.WhereClause(this, d);
						if (C(d)) return new this.db.WhereClause(this, '['.concat(d.join('+'), ']'));
						var k = x(d);
						if (1 === k.length) return this.where(k[0]).equals(d[k[0]]);
						var j = this.schema.indexes
							.concat(this.schema.primKey)
							.filter(function (d) {
								if (
									d.compound &&
									k.every(function (x) {
										return 0 <= d.keyPath.indexOf(x);
									})
								) {
									for (var x = 0; x < k.length; ++x) if (-1 === k.indexOf(d.keyPath[x])) return !1;
									return !0;
								}
								return !1;
							})
							.sort(function (d, x) {
								return d.keyPath.length - x.keyPath.length;
							})[0];
						if (j && this.db._maxKey !== xt) {
							var T = j.keyPath.slice(0, k.length);
							return this.where(T).equals(
								T.map(function (x) {
									return d[x];
								})
							);
						}
						!j &&
							ye &&
							console.warn(
								'The query '
									.concat(JSON.stringify(d), ' on ')
									.concat(this.name, ' would benefit from a ') +
									'compound index ['.concat(k.join('+'), ']')
							);
						var K = this.schema.idxByName;
						function u(d, x) {
							return 0 === st(d, x);
						}
						var B = k.reduce(
								function (x, k) {
									var j = x[0],
										T = x[1],
										x = K[k],
										B = d[k];
									return [
										j || x,
										j || !x
											? it(
													T,
													x && x.multi
														? function (d) {
																d = O(d, k);
																return (
																	C(d) &&
																	d.some(function (d) {
																		return u(B, d);
																	})
																);
															}
														: function (d) {
																return u(B, O(d, k));
															}
												)
											: T
									];
								},
								[null, null]
							),
							T = B[0],
							B = B[1];
						return T
							? this.where(T.name).equals(d[T.keyPath]).filter(B)
							: j
								? this.filter(B)
								: this.where(k).equals('');
					}),
					(ht.prototype.filter = function (d) {
						return this.toCollection().and(d);
					}),
					(ht.prototype.count = function (d) {
						return this.toCollection().count(d);
					}),
					(ht.prototype.offset = function (d) {
						return this.toCollection().offset(d);
					}),
					(ht.prototype.limit = function (d) {
						return this.toCollection().limit(d);
					}),
					(ht.prototype.each = function (d) {
						return this.toCollection().each(d);
					}),
					(ht.prototype.toArray = function (d) {
						return this.toCollection().toArray(d);
					}),
					(ht.prototype.toCollection = function () {
						return new this.db.Collection(new this.db.WhereClause(this));
					}),
					(ht.prototype.orderBy = function (d) {
						return new this.db.Collection(
							new this.db.WhereClause(this, C(d) ? '['.concat(d.join('+'), ']') : d)
						);
					}),
					(ht.prototype.reverse = function () {
						return this.toCollection().reverse();
					}),
					(ht.prototype.mapToClass = function (d) {
						var x,
							k = this.db,
							C = this.name;
						function i() {
							return (null !== x && x.apply(this, arguments)) || this;
						}
						(this.schema.mappedClass = d).prototype instanceof ut &&
							((function (d, x) {
								if ('function' != typeof x && null !== x)
									throw new TypeError(
										'Class extends value ' + String(x) + ' is not a constructor or null'
									);
								function n() {
									this.constructor = d;
								}
								s(d, x),
									(d.prototype =
										null === x ? Object.create(x) : ((n.prototype = x.prototype), new n()));
							})(i, (x = d)),
							Object.defineProperty(i.prototype, 'db', {
								get: function () {
									return k;
								},
								enumerable: !1,
								configurable: !0
							}),
							(i.prototype.table = function () {
								return C;
							}),
							(d = i));
						for (var T = new Set(), K = d.prototype; K; K = j(K))
							Object.getOwnPropertyNames(K).forEach(function (d) {
								return T.add(d);
							});
						function u(x) {
							if (!x) return x;
							var k,
								C = Object.create(d.prototype);
							for (k in x)
								if (!T.has(k))
									try {
										C[k] = x[k];
									} catch (x) {}
							return C;
						}
						return (
							this.schema.readHook && this.hook.reading.unsubscribe(this.schema.readHook),
							(this.schema.readHook = u),
							this.hook('reading', u),
							d
						);
					}),
					(ht.prototype.defineClass = function () {
						return this.mapToClass(function (d) {
							a(this, d);
						});
					}),
					(ht.prototype.add = function (d, x) {
						var k = this,
							C = this.schema.primKey,
							j = C.auto,
							T = C.keyPath,
							K = d;
						return (
							T && j && (K = at(T)(d)),
							this._trans('readwrite', function (d) {
								return k.core.mutate({
									trans: d,
									type: 'add',
									keys: null != x ? [x] : null,
									values: [K]
								});
							})
								.then(function (d) {
									return d.numFailures ? _e.reject(d.failures[0]) : d.lastResult;
								})
								.then(function (x) {
									if (T)
										try {
											P(d, T, x);
										} catch (x) {}
									return x;
								})
						);
					}),
					(ht.prototype.update = function (d, x) {
						if ('object' != typeof d || C(d)) return this.where(':id').equals(d).modify(x);
						d = O(d, this.schema.primKey.keyPath);
						return void 0 === d
							? ft(new he.InvalidArgument('Given object does not contain its primary key'))
							: this.where(':id').equals(d).modify(x);
					}),
					(ht.prototype.put = function (d, x) {
						var k = this,
							C = this.schema.primKey,
							j = C.auto,
							T = C.keyPath,
							K = d;
						return (
							T && j && (K = at(T)(d)),
							this._trans('readwrite', function (d) {
								return k.core.mutate({
									trans: d,
									type: 'put',
									values: [K],
									keys: null != x ? [x] : null
								});
							})
								.then(function (d) {
									return d.numFailures ? _e.reject(d.failures[0]) : d.lastResult;
								})
								.then(function (x) {
									if (T)
										try {
											P(d, T, x);
										} catch (x) {}
									return x;
								})
						);
					}),
					(ht.prototype.delete = function (d) {
						var x = this;
						return this._trans('readwrite', function (k) {
							return x.core.mutate({ trans: k, type: 'delete', keys: [d] });
						}).then(function (d) {
							return d.numFailures ? _e.reject(d.failures[0]) : void 0;
						});
					}),
					(ht.prototype.clear = function () {
						var d = this;
						return this._trans('readwrite', function (x) {
							return d.core.mutate({ trans: x, type: 'deleteRange', range: Gt });
						}).then(function (d) {
							return d.numFailures ? _e.reject(d.failures[0]) : void 0;
						});
					}),
					(ht.prototype.bulkGet = function (d) {
						var x = this;
						return this._trans('readonly', function (k) {
							return x.core.getMany({ keys: d, trans: k }).then(function (d) {
								return d.map(function (d) {
									return x.hook.reading.fire(d);
								});
							});
						});
					}),
					(ht.prototype.bulkAdd = function (d, x, k) {
						var C = this,
							j = Array.isArray(x) ? x : void 0,
							T = (k = k || (j ? void 0 : x)) ? k.allKeys : void 0;
						return this._trans('readwrite', function (x) {
							var k = C.schema.primKey,
								K = k.auto,
								k = k.keyPath;
							if (k && j)
								throw new he.InvalidArgument(
									'bulkAdd(): keys argument invalid on tables with inbound keys'
								);
							if (j && j.length !== d.length)
								throw new he.InvalidArgument(
									'Arguments objects and keys must have the same length'
								);
							var B = d.length,
								k = k && K ? d.map(at(k)) : d;
							return C.core
								.mutate({ trans: x, type: 'add', keys: j, values: k, wantResults: T })
								.then(function (d) {
									var x = d.numFailures,
										k = d.results,
										j = d.lastResult,
										d = d.failures;
									if (0 === x) return T ? k : j;
									throw new V(
										''
											.concat(C.name, '.bulkAdd(): ')
											.concat(x, ' of ')
											.concat(B, ' operations failed'),
										d
									);
								});
						});
					}),
					(ht.prototype.bulkPut = function (d, x, k) {
						var C = this,
							j = Array.isArray(x) ? x : void 0,
							T = (k = k || (j ? void 0 : x)) ? k.allKeys : void 0;
						return this._trans('readwrite', function (x) {
							var k = C.schema.primKey,
								K = k.auto,
								k = k.keyPath;
							if (k && j)
								throw new he.InvalidArgument(
									'bulkPut(): keys argument invalid on tables with inbound keys'
								);
							if (j && j.length !== d.length)
								throw new he.InvalidArgument(
									'Arguments objects and keys must have the same length'
								);
							var B = d.length,
								k = k && K ? d.map(at(k)) : d;
							return C.core
								.mutate({ trans: x, type: 'put', keys: j, values: k, wantResults: T })
								.then(function (d) {
									var x = d.numFailures,
										k = d.results,
										j = d.lastResult,
										d = d.failures;
									if (0 === x) return T ? k : j;
									throw new V(
										''
											.concat(C.name, '.bulkPut(): ')
											.concat(x, ' of ')
											.concat(B, ' operations failed'),
										d
									);
								});
						});
					}),
					(ht.prototype.bulkUpdate = function (d) {
						var x = this,
							k = this.core,
							C = d.map(function (d) {
								return d.key;
							}),
							j = d.map(function (d) {
								return d.changes;
							}),
							T = [];
						return this._trans('readwrite', function (K) {
							return k.getMany({ trans: K, keys: C, cache: 'clone' }).then(function (B) {
								var D = [],
									R = [];
								d.forEach(function (d, k) {
									var C = d.key,
										j = d.changes,
										K = B[k];
									if (K) {
										for (var M = 0, F = Object.keys(j); M < F.length; M++) {
											var z = F[M],
												W = j[z];
											if (z === x.schema.primKey.keyPath) {
												if (0 !== st(W, C))
													throw new he.Constraint('Cannot update primary key in bulkUpdate()');
											} else P(K, z, W);
										}
										T.push(k), D.push(C), R.push(K);
									}
								});
								var M = D.length;
								return k
									.mutate({
										trans: K,
										type: 'put',
										keys: D,
										values: R,
										updates: { keys: C, changeSpecs: j }
									})
									.then(function (d) {
										var k = d.numFailures,
											C = d.failures;
										if (0 === k) return M;
										for (var j = 0, K = Object.keys(C); j < K.length; j++) {
											var B,
												D = K[j],
												R = T[Number(D)];
											null != R && ((B = C[D]), delete C[D], (C[R] = B));
										}
										throw new V(
											''
												.concat(x.name, '.bulkUpdate(): ')
												.concat(k, ' of ')
												.concat(M, ' operations failed'),
											C
										);
									});
							});
						});
					}),
					(ht.prototype.bulkDelete = function (d) {
						var x = this,
							k = d.length;
						return this._trans('readwrite', function (k) {
							return x.core.mutate({ trans: k, type: 'delete', keys: d });
						}).then(function (d) {
							var C = d.numFailures,
								j = d.lastResult,
								d = d.failures;
							if (0 === C) return j;
							throw new V(
								''
									.concat(x.name, '.bulkDelete(): ')
									.concat(C, ' of ')
									.concat(k, ' operations failed'),
								d
							);
						});
					}),
					ht);
				function ht() {}
				function dt(d) {
					function t(x, C) {
						if (C) {
							for (var j = arguments.length, T = new Array(j - 1); --j; ) T[j - 1] = arguments[j];
							return k[x].subscribe.apply(null, T), d;
						}
						if ('string' == typeof x) return k[x];
					}
					var k = {};
					t.addEventType = u;
					for (var j = 1, T = arguments.length; j < T; ++j) u(arguments[j]);
					return t;
					function u(d, j, T) {
						if ('object' != typeof d) {
							var K;
							j = j || ne;
							var B = {
								subscribers: [],
								fire: (T = T || G),
								subscribe: function (d) {
									-1 === B.subscribers.indexOf(d) &&
										(B.subscribers.push(d), (B.fire = j(B.fire, d)));
								},
								unsubscribe: function (d) {
									(B.subscribers = B.subscribers.filter(function (x) {
										return x !== d;
									})),
										(B.fire = B.subscribers.reduce(j, T));
								}
							};
							return (k[d] = t[d] = B);
						}
						x((K = d)).forEach(function (d) {
							var x = K[d];
							if (C(x)) u(d, K[d][0], K[d][1]);
							else {
								if ('asap' !== x) throw new he.InvalidArgument('Invalid event config');
								var k = u(d, X, function () {
									for (var d = arguments.length, x = new Array(d); d--; ) x[d] = arguments[d];
									k.subscribers.forEach(function (d) {
										v(function () {
											d.apply(null, x);
										});
									});
								});
							}
						});
					}
				}
				function pt(d, x) {
					return o(x).from({ prototype: d }), x;
				}
				function yt(d, x) {
					return !(d.filter || d.algorithm || d.or) && (x ? d.justLimit : !d.replayFilter);
				}
				function vt(d, x) {
					d.filter = it(d.filter, x);
				}
				function mt(d, x, k) {
					var C = d.replayFilter;
					(d.replayFilter = C
						? function () {
								return it(C(), x());
							}
						: x),
						(d.justLimit = k && !C);
				}
				function bt(d, x) {
					if (d.isPrimKey) return x.primaryKey;
					var k = x.getIndexByKeyPath(d.index);
					if (!k)
						throw new he.Schema(
							'KeyPath ' + d.index + ' on object store ' + x.name + ' is not indexed'
						);
					return k;
				}
				function gt(d, x, k) {
					var C = bt(d, x.schema);
					return x.openCursor({
						trans: k,
						values: !d.keysOnly,
						reverse: 'prev' === d.dir,
						unique: !!d.unique,
						query: { index: C, range: d.range }
					});
				}
				function wt(d, x, k, C) {
					var j = d.replayFilter ? it(d.filter, d.replayFilter()) : d.filter;
					if (d.or) {
						var T = {},
							r = function (d, k, C) {
								var K, B;
								(j &&
									!j(
										k,
										C,
										function (d) {
											return k.stop(d);
										},
										function (d) {
											return k.fail(d);
										}
									)) ||
									('[object ArrayBuffer]' === (B = '' + (K = k.primaryKey)) &&
										(B = '' + new Uint8Array(K)),
									m(T, B) || ((T[B] = !0), x(d, k, C)));
							};
						return Promise.all([
							d.or._iterate(r, k),
							_t(gt(d, C, k), d.algorithm, r, !d.keysOnly && d.valueMapper)
						]);
					}
					return _t(gt(d, C, k), it(d.algorithm, j), x, !d.keysOnly && d.valueMapper);
				}
				function _t(d, x, k, C) {
					var j = qe(
						C
							? function (d, x, j) {
									return k(C(d), x, j);
								}
							: k
					);
					return d.then(function (d) {
						if (d)
							return d.start(function () {
								var t = function () {
									return d.continue();
								};
								(x &&
									!x(
										d,
										function (d) {
											return (t = d);
										},
										function (x) {
											d.stop(x), (t = G);
										},
										function (x) {
											d.fail(x), (t = G);
										}
									)) ||
									j(d.value, d, function (d) {
										return (t = d);
									}),
									t();
							});
					});
				}
				var An =
					((kt.prototype.execute = function (d) {
						var x = this['@@propmod'];
						if (void 0 !== x.add) {
							var k = x.add;
							if (C(k)) return i(i([], C(d) ? d : [], !0), k, !0).sort();
							if ('number' == typeof k) return (Number(d) || 0) + k;
							if ('bigint' == typeof k)
								try {
									return BigInt(d) + k;
								} catch (d) {
									return BigInt(0) + k;
								}
							throw new TypeError('Invalid term '.concat(k));
						}
						if (void 0 !== x.remove) {
							var j = x.remove;
							if (C(j))
								return C(d)
									? d
											.filter(function (d) {
												return !j.includes(d);
											})
											.sort()
									: [];
							if ('number' == typeof j) return Number(d) - j;
							if ('bigint' == typeof j)
								try {
									return BigInt(d) - j;
								} catch (d) {
									return BigInt(0) - j;
								}
							throw new TypeError('Invalid subtrahend '.concat(j));
						}
						k = null === (k = x.replacePrefix) || void 0 === k ? void 0 : k[0];
						return k && 'string' == typeof d && d.startsWith(k)
							? x.replacePrefix[1] + d.substring(k.length)
							: d;
					}),
					kt);
				function kt(d) {
					this['@@propmod'] = d;
				}
				var Sn =
					((Pt.prototype._read = function (d, x) {
						var k = this._ctx;
						return k.error
							? k.table._trans(null, ft.bind(null, k.error))
							: k.table._trans('readonly', d).then(x);
					}),
					(Pt.prototype._write = function (d) {
						var x = this._ctx;
						return x.error
							? x.table._trans(null, ft.bind(null, x.error))
							: x.table._trans('readwrite', d, 'locked');
					}),
					(Pt.prototype._addAlgorithm = function (d) {
						var x = this._ctx;
						x.algorithm = it(x.algorithm, d);
					}),
					(Pt.prototype._iterate = function (d, x) {
						return wt(this._ctx, d, x, this._ctx.table.core);
					}),
					(Pt.prototype.clone = function (d) {
						var x = Object.create(this.constructor.prototype),
							k = Object.create(this._ctx);
						return d && a(k, d), (x._ctx = k), x;
					}),
					(Pt.prototype.raw = function () {
						return (this._ctx.valueMapper = null), this;
					}),
					(Pt.prototype.each = function (d) {
						var x = this._ctx;
						return this._read(function (k) {
							return wt(x, d, k, x.table.core);
						});
					}),
					(Pt.prototype.count = function (d) {
						var x = this;
						return this._read(function (d) {
							var k = x._ctx,
								C = k.table.core;
							if (yt(k, !0))
								return C.count({
									trans: d,
									query: { index: bt(k, C.schema), range: k.range }
								}).then(function (d) {
									return Math.min(d, k.limit);
								});
							var j = 0;
							return wt(
								k,
								function () {
									return ++j, !1;
								},
								d,
								C
							).then(function () {
								return j;
							});
						}).then(d);
					}),
					(Pt.prototype.sortBy = function (d, x) {
						var k = d.split('.').reverse(),
							C = k[0],
							j = k.length - 1;
						function o(d, x) {
							return x ? o(d[k[x]], x - 1) : d[C];
						}
						var T = 'next' === this._ctx.dir ? 1 : -1;
						function u(d, x) {
							return st(o(d, j), o(x, j)) * T;
						}
						return this.toArray(function (d) {
							return d.sort(u);
						}).then(x);
					}),
					(Pt.prototype.toArray = function (d) {
						var x = this;
						return this._read(function (d) {
							var k = x._ctx;
							if ('next' === k.dir && yt(k, !0) && 0 < k.limit) {
								var C = k.valueMapper,
									j = bt(k, k.table.core.schema);
								return k.table.core
									.query({
										trans: d,
										limit: k.limit,
										values: !0,
										query: { index: j, range: k.range }
									})
									.then(function (d) {
										d = d.result;
										return C ? d.map(C) : d;
									});
							}
							var T = [];
							return wt(
								k,
								function (d) {
									return T.push(d);
								},
								d,
								k.table.core
							).then(function () {
								return T;
							});
						}, d);
					}),
					(Pt.prototype.offset = function (d) {
						var x = this._ctx;
						return (
							d <= 0 ||
								((x.offset += d),
								yt(x)
									? mt(x, function () {
											var x = d;
											return function (d, k) {
												return (
													0 === x ||
													(1 === x
														? --x
														: k(function () {
																d.advance(x), (x = 0);
															}),
													!1)
												);
											};
										})
									: mt(x, function () {
											var x = d;
											return function () {
												return --x < 0;
											};
										})),
							this
						);
					}),
					(Pt.prototype.limit = function (d) {
						return (
							(this._ctx.limit = Math.min(this._ctx.limit, d)),
							mt(
								this._ctx,
								function () {
									var x = d;
									return function (d, k, C) {
										return --x <= 0 && k(C), 0 <= x;
									};
								},
								!0
							),
							this
						);
					}),
					(Pt.prototype.until = function (d, x) {
						return (
							vt(this._ctx, function (k, C, j) {
								return !d(k.value) || (C(j), x);
							}),
							this
						);
					}),
					(Pt.prototype.first = function (d) {
						return this.limit(1)
							.toArray(function (d) {
								return d[0];
							})
							.then(d);
					}),
					(Pt.prototype.last = function (d) {
						return this.reverse().first(d);
					}),
					(Pt.prototype.filter = function (d) {
						var x;
						return (
							vt(this._ctx, function (x) {
								return d(x.value);
							}),
							((x = this._ctx).isMatch = it(x.isMatch, d)),
							this
						);
					}),
					(Pt.prototype.and = function (d) {
						return this.filter(d);
					}),
					(Pt.prototype.or = function (d) {
						return new this.db.WhereClause(this._ctx.table, d, this);
					}),
					(Pt.prototype.reverse = function () {
						return (
							(this._ctx.dir = 'prev' === this._ctx.dir ? 'next' : 'prev'),
							this._ondirectionchange && this._ondirectionchange(this._ctx.dir),
							this
						);
					}),
					(Pt.prototype.desc = function () {
						return this.reverse();
					}),
					(Pt.prototype.eachKey = function (d) {
						var x = this._ctx;
						return (
							(x.keysOnly = !x.isMatch),
							this.each(function (x, k) {
								d(k.key, k);
							})
						);
					}),
					(Pt.prototype.eachUniqueKey = function (d) {
						return (this._ctx.unique = 'unique'), this.eachKey(d);
					}),
					(Pt.prototype.eachPrimaryKey = function (d) {
						var x = this._ctx;
						return (
							(x.keysOnly = !x.isMatch),
							this.each(function (x, k) {
								d(k.primaryKey, k);
							})
						);
					}),
					(Pt.prototype.keys = function (d) {
						var x = this._ctx;
						x.keysOnly = !x.isMatch;
						var k = [];
						return this.each(function (d, x) {
							k.push(x.key);
						})
							.then(function () {
								return k;
							})
							.then(d);
					}),
					(Pt.prototype.primaryKeys = function (d) {
						var x = this._ctx;
						if ('next' === x.dir && yt(x, !0) && 0 < x.limit)
							return this._read(function (d) {
								var k = bt(x, x.table.core.schema);
								return x.table.core.query({
									trans: d,
									values: !1,
									limit: x.limit,
									query: { index: k, range: x.range }
								});
							})
								.then(function (d) {
									return d.result;
								})
								.then(d);
						x.keysOnly = !x.isMatch;
						var k = [];
						return this.each(function (d, x) {
							k.push(x.primaryKey);
						})
							.then(function () {
								return k;
							})
							.then(d);
					}),
					(Pt.prototype.uniqueKeys = function (d) {
						return (this._ctx.unique = 'unique'), this.keys(d);
					}),
					(Pt.prototype.firstKey = function (d) {
						return this.limit(1)
							.keys(function (d) {
								return d[0];
							})
							.then(d);
					}),
					(Pt.prototype.lastKey = function (d) {
						return this.reverse().firstKey(d);
					}),
					(Pt.prototype.distinct = function () {
						var d = this._ctx,
							d = d.index && d.table.schema.idxByName[d.index];
						if (!d || !d.multi) return this;
						var x = {};
						return (
							vt(this._ctx, function (d) {
								var k = d.primaryKey.toString(),
									d = m(x, k);
								return (x[k] = !0), !d;
							}),
							this
						);
					}),
					(Pt.prototype.modify = function (d) {
						var k = this,
							C = this._ctx;
						return this._write(function (j) {
							var T, K, B;
							B =
								'function' == typeof d
									? d
									: ((T = x(d)),
										(K = T.length),
										function (x) {
											for (var k = !1, C = 0; C < K; ++C) {
												var j = T[C],
													B = d[j],
													D = O(x, j);
												B instanceof An
													? (P(x, j, B.execute(D)), (k = !0))
													: D !== B && (P(x, j, B), (k = !0));
											}
											return k;
										});
							var D = C.table.core,
								R = D.schema.primaryKey,
								M = R.outbound,
								F = R.extractKey,
								z = 200,
								R = k.db._options.modifyChunkSize;
							R && (z = 'object' == typeof R ? R[D.name] || R['*'] || 200 : R);
							function g(d, k) {
								var C = k.failures,
									k = k.numFailures;
								$ += d - k;
								for (var j = 0, T = x(C); j < T.length; j++) {
									var K = T[j];
									W.push(C[K]);
								}
							}
							var W = [],
								$ = 0,
								Y = [];
							return k
								.clone()
								.primaryKeys()
								.then(function (x) {
									function f(C) {
										var T = Math.min(z, x.length - C);
										return D.getMany({
											trans: j,
											keys: x.slice(C, C + T),
											cache: 'immutable'
										}).then(function (K) {
											for (var R = [], W = [], $ = M ? [] : null, Y = [], Q = 0; Q < T; ++Q) {
												var ie = K[Q],
													ae = { value: S(ie), primKey: x[C + Q] };
												!1 !== B.call(ae, ae.value, ae) &&
													(null == ae.value
														? Y.push(x[C + Q])
														: M || 0 === st(F(ie), F(ae.value))
															? (W.push(ae.value), M && $.push(x[C + Q]))
															: (Y.push(x[C + Q]), R.push(ae.value)));
											}
											return Promise.resolve(
												0 < R.length &&
													D.mutate({ trans: j, type: 'add', values: R }).then(function (d) {
														for (var x in d.failures) Y.splice(parseInt(x), 1);
														g(R.length, d);
													})
											)
												.then(function () {
													return (
														(0 < W.length || (k && 'object' == typeof d)) &&
														D.mutate({
															trans: j,
															type: 'put',
															keys: $,
															values: W,
															criteria: k,
															changeSpec: 'function' != typeof d && d,
															isAdditionalChunk: 0 < C
														}).then(function (d) {
															return g(W.length, d);
														})
													);
												})
												.then(function () {
													return (
														(0 < Y.length || (k && d === Kt)) &&
														D.mutate({
															trans: j,
															type: 'delete',
															keys: Y,
															criteria: k,
															isAdditionalChunk: 0 < C
														}).then(function (d) {
															return g(Y.length, d);
														})
													);
												})
												.then(function () {
													return x.length > C + T && f(C + z);
												});
										});
									}
									var k = yt(C) &&
										C.limit === 1 / 0 &&
										('function' != typeof d || d === Kt) && { index: C.index, range: C.range };
									return f(0).then(function () {
										if (0 < W.length) throw new U('Error modifying one or more objects', W, $, Y);
										return x.length;
									});
								});
						});
					}),
					(Pt.prototype.delete = function () {
						var d = this._ctx,
							x = d.range;
						return yt(d) && (d.isPrimKey || 3 === x.type)
							? this._write(function (k) {
									var C = d.table.core.schema.primaryKey,
										j = x;
									return d.table.core
										.count({ trans: k, query: { index: C, range: j } })
										.then(function (x) {
											return d.table.core
												.mutate({ trans: k, type: 'deleteRange', range: j })
												.then(function (d) {
													var k = d.failures;
													d.lastResult, d.results;
													d = d.numFailures;
													if (d)
														throw new U(
															'Could not delete some values',
															Object.keys(k).map(function (d) {
																return k[d];
															}),
															x - d
														);
													return x - d;
												});
										});
								})
							: this.modify(Kt);
					}),
					Pt);
				function Pt() {}
				var Kt = function (d, x) {
					return (x.value = null);
				};
				function Et(d, x) {
					return d < x ? -1 : d === x ? 0 : 1;
				}
				function St(d, x) {
					return x < d ? -1 : d === x ? 0 : 1;
				}
				function jt(d, x, k) {
					d = d instanceof jn ? new d.Collection(d) : d;
					return (d._ctx.error = new (k || TypeError)(x)), d;
				}
				function At(d) {
					return new d.Collection(d, function () {
						return qt('');
					}).limit(0);
				}
				function Ct(d, x, k, C) {
					var j,
						T,
						K,
						B,
						D,
						R,
						M,
						F = k.length;
					if (
						!k.every(function (d) {
							return 'string' == typeof d;
						})
					)
						return jt(d, Nt);
					function t(d) {
						(j =
							'next' === d
								? function (d) {
										return d.toUpperCase();
									}
								: function (d) {
										return d.toLowerCase();
									}),
							(T =
								'next' === d
									? function (d) {
											return d.toLowerCase();
										}
									: function (d) {
											return d.toUpperCase();
										}),
							(K = 'next' === d ? Et : St);
						var x = k
							.map(function (d) {
								return { lower: T(d), upper: j(d) };
							})
							.sort(function (d, x) {
								return K(d.lower, x.lower);
							});
						(B = x.map(function (d) {
							return d.upper;
						})),
							(D = x.map(function (d) {
								return d.lower;
							})),
							(M = 'next' === (R = d) ? '' : C);
					}
					t('next');
					d = new d.Collection(d, function () {
						return Tt(B[0], D[F - 1] + C);
					});
					d._ondirectionchange = function (d) {
						t(d);
					};
					var z = 0;
					return (
						d._addAlgorithm(function (d, k, C) {
							var j = d.key;
							if ('string' != typeof j) return !1;
							var W = T(j);
							if (x(W, D, z)) return !0;
							for (var $ = null, Y = z; Y < F; ++Y) {
								var Q = (function (d, x, k, C, j, T) {
									for (var K = Math.min(d.length, C.length), B = -1, D = 0; D < K; ++D) {
										var R = x[D];
										if (R !== C[D])
											return j(d[D], k[D]) < 0
												? d.substr(0, D) + k[D] + k.substr(D + 1)
												: j(d[D], C[D]) < 0
													? d.substr(0, D) + C[D] + k.substr(D + 1)
													: 0 <= B
														? d.substr(0, B) + x[B] + k.substr(B + 1)
														: null;
										j(d[D], R) < 0 && (B = D);
									}
									return K < C.length && 'next' === T
										? d + k.substr(d.length)
										: K < d.length && 'prev' === T
											? d.substr(0, k.length)
											: B < 0
												? null
												: d.substr(0, B) + C[B] + k.substr(B + 1);
								})(j, W, B[Y], D[Y], K, R);
								null === Q && null === $ ? (z = Y + 1) : (null === $ || 0 < K($, Q)) && ($ = Q);
							}
							return (
								k(
									null !== $
										? function () {
												d.continue($ + M);
											}
										: C
								),
								!1
							);
						}),
						d
					);
				}
				function Tt(d, x, k, C) {
					return { type: 2, lower: d, upper: x, lowerOpen: k, upperOpen: C };
				}
				function qt(d) {
					return { type: 1, lower: d, upper: d };
				}
				var jn =
					(Object.defineProperty(It.prototype, 'Collection', {
						get: function () {
							return this._ctx.table.db.Collection;
						},
						enumerable: !1,
						configurable: !0
					}),
					(It.prototype.between = function (d, x, k, C) {
						(k = !1 !== k), (C = !0 === C);
						try {
							return 0 < this._cmp(d, x) || (0 === this._cmp(d, x) && (k || C) && (!k || !C))
								? At(this)
								: new this.Collection(this, function () {
										return Tt(d, x, !k, !C);
									});
						} catch (d) {
							return jt(this, Ot);
						}
					}),
					(It.prototype.equals = function (d) {
						return null == d
							? jt(this, Ot)
							: new this.Collection(this, function () {
									return qt(d);
								});
					}),
					(It.prototype.above = function (d) {
						return null == d
							? jt(this, Ot)
							: new this.Collection(this, function () {
									return Tt(d, void 0, !0);
								});
					}),
					(It.prototype.aboveOrEqual = function (d) {
						return null == d
							? jt(this, Ot)
							: new this.Collection(this, function () {
									return Tt(d, void 0, !1);
								});
					}),
					(It.prototype.below = function (d) {
						return null == d
							? jt(this, Ot)
							: new this.Collection(this, function () {
									return Tt(void 0, d, !1, !0);
								});
					}),
					(It.prototype.belowOrEqual = function (d) {
						return null == d
							? jt(this, Ot)
							: new this.Collection(this, function () {
									return Tt(void 0, d);
								});
					}),
					(It.prototype.startsWith = function (d) {
						return 'string' != typeof d ? jt(this, Nt) : this.between(d, d + xt, !0, !0);
					}),
					(It.prototype.startsWithIgnoreCase = function (d) {
						return '' === d
							? this.startsWith(d)
							: Ct(
									this,
									function (d, x) {
										return 0 === d.indexOf(x[0]);
									},
									[d],
									xt
								);
					}),
					(It.prototype.equalsIgnoreCase = function (d) {
						return Ct(
							this,
							function (d, x) {
								return d === x[0];
							},
							[d],
							''
						);
					}),
					(It.prototype.anyOfIgnoreCase = function () {
						var d = I.apply(Q, arguments);
						return 0 === d.length
							? At(this)
							: Ct(
									this,
									function (d, x) {
										return -1 !== x.indexOf(d);
									},
									d,
									''
								);
					}),
					(It.prototype.startsWithAnyOfIgnoreCase = function () {
						var d = I.apply(Q, arguments);
						return 0 === d.length
							? At(this)
							: Ct(
									this,
									function (d, x) {
										return x.some(function (x) {
											return 0 === d.indexOf(x);
										});
									},
									d,
									xt
								);
					}),
					(It.prototype.anyOf = function () {
						var d = this,
							x = I.apply(Q, arguments),
							k = this._cmp;
						try {
							x.sort(k);
						} catch (C) {
							return jt(this, Ot);
						}
						if (0 === x.length) return At(this);
						var C = new this.Collection(this, function () {
							return Tt(x[0], x[x.length - 1]);
						});
						C._ondirectionchange = function (C) {
							(k = 'next' === C ? d._ascending : d._descending), x.sort(k);
						};
						var j = 0;
						return (
							C._addAlgorithm(function (d, C, T) {
								for (var K = d.key; 0 < k(K, x[j]); ) if (++j === x.length) return C(T), !1;
								return (
									0 === k(K, x[j]) ||
									(C(function () {
										d.continue(x[j]);
									}),
									!1)
								);
							}),
							C
						);
					}),
					(It.prototype.notEqual = function (d) {
						return this.inAnyRange(
							[
								[-1 / 0, d],
								[d, this.db._maxKey]
							],
							{ includeLowers: !1, includeUppers: !1 }
						);
					}),
					(It.prototype.noneOf = function () {
						var d = I.apply(Q, arguments);
						if (0 === d.length) return new this.Collection(this);
						try {
							d.sort(this._ascending);
						} catch (d) {
							return jt(this, Ot);
						}
						var x = d.reduce(function (d, x) {
							return d ? d.concat([[d[d.length - 1][1], x]]) : [[-1 / 0, x]];
						}, null);
						return (
							x.push([d[d.length - 1], this.db._maxKey]),
							this.inAnyRange(x, { includeLowers: !1, includeUppers: !1 })
						);
					}),
					(It.prototype.inAnyRange = function (d, x) {
						var k = this,
							C = this._cmp,
							j = this._ascending,
							T = this._descending,
							K = this._min,
							B = this._max;
						if (0 === d.length) return At(this);
						if (
							!d.every(function (d) {
								return void 0 !== d[0] && void 0 !== d[1] && j(d[0], d[1]) <= 0;
							})
						)
							return jt(
								this,
								'First argument to inAnyRange() must be an Array of two-value Arrays [lower,upper] where upper must not be lower than lower',
								he.InvalidArgument
							);
						var D = !x || !1 !== x.includeLowers,
							R = x && !0 === x.includeUppers;
						var M,
							F = j;
						function h(d, x) {
							return F(d[0], x[0]);
						}
						try {
							(M = d.reduce(function (d, x) {
								for (var k = 0, j = d.length; k < j; ++k) {
									var T = d[k];
									if (C(x[0], T[1]) < 0 && 0 < C(x[1], T[0])) {
										(T[0] = K(T[0], x[0])), (T[1] = B(T[1], x[1]));
										break;
									}
								}
								return k === j && d.push(x), d;
							}, [])).sort(h);
						} catch (d) {
							return jt(this, Ot);
						}
						var z = 0,
							W = R
								? function (d) {
										return 0 < j(d, M[z][1]);
									}
								: function (d) {
										return 0 <= j(d, M[z][1]);
									},
							$ = D
								? function (d) {
										return 0 < T(d, M[z][0]);
									}
								: function (d) {
										return 0 <= T(d, M[z][0]);
									};
						var Y = W,
							d = new this.Collection(this, function () {
								return Tt(M[0][0], M[M.length - 1][1], !D, !R);
							});
						return (
							(d._ondirectionchange = function (d) {
								(F = 'next' === d ? ((Y = W), j) : ((Y = $), T)), M.sort(h);
							}),
							d._addAlgorithm(function (d, x, C) {
								for (var T, K = d.key; Y(K); ) if (++z === M.length) return x(C), !1;
								return (
									(!W((T = K)) && !$(T)) ||
									(0 === k._cmp(K, M[z][1]) ||
										0 === k._cmp(K, M[z][0]) ||
										x(function () {
											F === j ? d.continue(M[z][0]) : d.continue(M[z][1]);
										}),
									!1)
								);
							}),
							d
						);
					}),
					(It.prototype.startsWithAnyOf = function () {
						var d = I.apply(Q, arguments);
						return d.every(function (d) {
							return 'string' == typeof d;
						})
							? 0 === d.length
								? At(this)
								: this.inAnyRange(
										d.map(function (d) {
											return [d, d + xt];
										})
									)
							: jt(this, 'startsWithAnyOf() only works with strings');
					}),
					It);
				function It() {}
				function Bt(d) {
					return qe(function (x) {
						return Rt(x), d(x.target.error), !1;
					});
				}
				function Rt(d) {
					d.stopPropagation && d.stopPropagation(), d.preventDefault && d.preventDefault();
				}
				var Nn = 'storagemutated',
					Rn = 'x-storagemutated-1',
					Un = dt(null, Nn),
					Wn =
						((Ut.prototype._lock = function () {
							return (
								y(!Me.global),
								++this._reculock,
								1 !== this._reculock || Me.global || (Me.lockOwnerFor = this),
								this
							);
						}),
						(Ut.prototype._unlock = function () {
							if ((y(!Me.global), 0 == --this._reculock))
								for (
									Me.global || (Me.lockOwnerFor = null);
									0 < this._blockedFuncs.length && !this._locked();

								) {
									var d = this._blockedFuncs.shift();
									try {
										$e(d[1], d[0]);
									} catch (d) {}
								}
							return this;
						}),
						(Ut.prototype._locked = function () {
							return this._reculock && Me.lockOwnerFor !== this;
						}),
						(Ut.prototype.create = function (d) {
							var x = this;
							if (!this.mode) return this;
							var k = this.db.idbdb,
								C = this.db._state.dbOpenError;
							if ((y(!this.idbtrans), !d && !k))
								switch (C && C.name) {
									case 'DatabaseClosedError':
										throw new he.DatabaseClosed(C);
									case 'MissingAPIError':
										throw new he.MissingAPI(C.message, C);
									default:
										throw new he.OpenFailed(C);
								}
							if (!this.active) throw new he.TransactionInactive();
							return (
								y(null === this._completion._state),
								((d = this.idbtrans =
									d ||
									(this.db.core || k).transaction(this.storeNames, this.mode, {
										durability: this.chromeTransactionDurability
									})).onerror = qe(function (k) {
									Rt(k), x._reject(d.error);
								})),
								(d.onabort = qe(function (k) {
									Rt(k),
										x.active && x._reject(new he.Abort(d.error)),
										(x.active = !1),
										x.on('abort').fire(k);
								})),
								(d.oncomplete = qe(function () {
									(x.active = !1),
										x._resolve(),
										'mutatedParts' in d && Un.storagemutated.fire(d.mutatedParts);
								})),
								this
							);
						}),
						(Ut.prototype._promise = function (d, x, k) {
							var C = this;
							if ('readwrite' === d && 'readwrite' !== this.mode)
								return ft(new he.ReadOnly('Transaction is readonly'));
							if (!this.active) return ft(new he.TransactionInactive());
							if (this._locked())
								return new _e(function (j, T) {
									C._blockedFuncs.push([
										function () {
											C._promise(d, x, k).then(j, T);
										},
										Me
									]);
								});
							if (k)
								return Ne(function () {
									var d = new _e(function (d, k) {
										C._lock();
										var j = x(d, k, C);
										j && j.then && j.then(d, k);
									});
									return (
										d.finally(function () {
											return C._unlock();
										}),
										(d._lib = !0),
										d
									);
								});
							var j = new _e(function (d, k) {
								var j = x(d, k, C);
								j && j.then && j.then(d, k);
							});
							return (j._lib = !0), j;
						}),
						(Ut.prototype._root = function () {
							return this.parent ? this.parent._root() : this;
						}),
						(Ut.prototype.waitFor = function (d) {
							var x,
								k = this._root(),
								C = _e.resolve(d);
							k._waitingFor
								? (k._waitingFor = k._waitingFor.then(function () {
										return C;
									}))
								: ((k._waitingFor = C),
									(k._waitingQueue = []),
									(x = k.idbtrans.objectStore(k.storeNames[0])),
									(function e() {
										for (++k._spinCount; k._waitingQueue.length; ) k._waitingQueue.shift()();
										k._waitingFor && (x.get(-1 / 0).onsuccess = e);
									})());
							var j = k._waitingFor;
							return new _e(function (d, x) {
								C.then(
									function (x) {
										return k._waitingQueue.push(qe(d.bind(null, x)));
									},
									function (d) {
										return k._waitingQueue.push(qe(x.bind(null, d)));
									}
								).finally(function () {
									k._waitingFor === j && (k._waitingFor = null);
								});
							});
						}),
						(Ut.prototype.abort = function () {
							this.active &&
								((this.active = !1),
								this.idbtrans && this.idbtrans.abort(),
								this._reject(new he.Abort()));
						}),
						(Ut.prototype.table = function (d) {
							var x = this._memoizedTables || (this._memoizedTables = {});
							if (m(x, d)) return x[d];
							var k = this.schema[d];
							if (!k) throw new he.NotFound('Table ' + d + ' not part of transaction');
							k = new this.db.Table(d, k, this);
							return (k.core = this.db.core.table(d)), (x[d] = k);
						}),
						Ut);
				function Ut() {}
				function Vt(d, x, k, C, j, T, K) {
					return {
						name: d,
						keyPath: x,
						unique: k,
						multi: C,
						auto: j,
						compound: T,
						src: (k && !K ? '&' : '') + (C ? '*' : '') + (j ? '++' : '') + zt(x)
					};
				}
				function zt(d) {
					return 'string' == typeof d ? d : d ? '[' + [].join.call(d, '+') + ']' : '';
				}
				function Wt(d, x, k) {
					return {
						name: d,
						primKey: x,
						indexes: k,
						mappedClass: null,
						idxByName:
							((C = function (d) {
								return [d.name, d];
							}),
							k.reduce(function (d, x, k) {
								k = C(x, k);
								return k && (d[k[0]] = k[1]), d;
							}, {}))
					};
					var C;
				}
				var Yt = function (d) {
					try {
						return (
							d.only([[]]),
							(Yt = function () {
								return [[]];
							}),
							[[]]
						);
					} catch (d) {
						return (
							(Yt = function () {
								return xt;
							}),
							xt
						);
					}
				};
				function $t(d) {
					return null == d
						? function () {}
						: 'string' == typeof d
							? 1 === (x = d).split('.').length
								? function (d) {
										return d[x];
									}
								: function (d) {
										return O(d, x);
									}
							: function (x) {
									return O(x, d);
								};
					var x;
				}
				function Qt(d) {
					return [].slice.call(d);
				}
				var Jn = 0;
				function Xt(d) {
					return null == d ? ':id' : 'string' == typeof d ? d : '['.concat(d.join('+'), ']');
				}
				function Ht(d, x, k) {
					function _(d) {
						if (3 === d.type) return null;
						if (4 === d.type) throw new Error('Cannot convert never type to IDBKeyRange');
						var k = d.lower,
							C = d.upper,
							j = d.lowerOpen,
							d = d.upperOpen;
						return void 0 === k
							? void 0 === C
								? null
								: x.upperBound(C, !!d)
							: void 0 === C
								? x.lowerBound(k, !!j)
								: x.bound(k, C, !!j, !!d);
					}
					function n(d) {
						var x,
							k = d.name;
						return {
							name: k,
							schema: d,
							mutate: function (d) {
								var x = d.trans,
									C = d.type,
									j = d.keys,
									T = d.values,
									K = d.range;
								return new Promise(function (d, B) {
									d = qe(d);
									var D = x.objectStore(k),
										R = null == D.keyPath,
										M = 'put' === C || 'add' === C;
									if (!M && 'delete' !== C && 'deleteRange' !== C)
										throw new Error('Invalid operation type: ' + C);
									var F,
										z = (j || T || { length: 1 }).length;
									if (j && T && j.length !== T.length)
										throw new Error(
											'Given keys array must have same length as given values array.'
										);
									if (0 === z)
										return d({ numFailures: 0, failures: {}, results: [], lastResult: void 0 });
									function u(d) {
										++Y, Rt(d);
									}
									var W = [],
										$ = [],
										Y = 0;
									if ('deleteRange' === C) {
										if (4 === K.type)
											return d({ numFailures: Y, failures: $, results: [], lastResult: void 0 });
										3 === K.type ? W.push((F = D.clear())) : W.push((F = D.delete(_(K))));
									} else {
										var R = M ? (R ? [T, j] : [T, null]) : [j, null],
											Q = R[0],
											ie = R[1];
										if (M)
											for (var ae = 0; ae < z; ++ae)
												W.push((F = ie && void 0 !== ie[ae] ? D[C](Q[ae], ie[ae]) : D[C](Q[ae]))),
													(F.onerror = u);
										else for (ae = 0; ae < z; ++ae) W.push((F = D[C](Q[ae]))), (F.onerror = u);
									}
									function p(x) {
										(x = x.target.result),
											W.forEach(function (d, x) {
												return null != d.error && ($[x] = d.error);
											}),
											d({
												numFailures: Y,
												failures: $,
												results:
													'delete' === C
														? j
														: W.map(function (d) {
																return d.result;
															}),
												lastResult: x
											});
									}
									(F.onerror = function (d) {
										u(d), p(d);
									}),
										(F.onsuccess = p);
								});
							},
							getMany: function (d) {
								var x = d.trans,
									C = d.keys;
								return new Promise(function (d, j) {
									d = qe(d);
									for (
										var T,
											K = x.objectStore(k),
											B = C.length,
											D = new Array(B),
											R = 0,
											M = 0,
											s = function (x) {
												x = x.target;
												(D[x._pos] = x.result), ++M === R && d(D);
											},
											F = Bt(j),
											z = 0;
										z < B;
										++z
									)
										null != C[z] &&
											(((T = K.get(C[z]))._pos = z), (T.onsuccess = s), (T.onerror = F), ++R);
									0 === R && d(D);
								});
							},
							get: function (d) {
								var x = d.trans,
									C = d.key;
								return new Promise(function (d, j) {
									d = qe(d);
									var T = x.objectStore(k).get(C);
									(T.onsuccess = function (x) {
										return d(x.target.result);
									}),
										(T.onerror = Bt(j));
								});
							},
							query:
								((x = D),
								function (d) {
									return new Promise(function (C, j) {
										C = qe(C);
										var T,
											K,
											B,
											D = d.trans,
											R = d.values,
											M = d.limit,
											F = d.query,
											z = M === 1 / 0 ? void 0 : M,
											W = F.index,
											F = F.range,
											D = D.objectStore(k),
											W = W.isPrimaryKey ? D : D.index(W.name),
											F = _(F);
										if (0 === M) return C({ result: [] });
										x
											? (((z = R ? W.getAll(F, z) : W.getAllKeys(F, z)).onsuccess = function (d) {
													return C({ result: d.target.result });
												}),
												(z.onerror = Bt(j)))
											: ((T = 0),
												(K = !R && 'openKeyCursor' in W ? W.openKeyCursor(F) : W.openCursor(F)),
												(B = []),
												(K.onsuccess = function (d) {
													var x = K.result;
													return x
														? (B.push(R ? x.value : x.primaryKey),
															++T === M ? C({ result: B }) : void x.continue())
														: C({ result: B });
												}),
												(K.onerror = Bt(j)));
									});
								}),
							openCursor: function (d) {
								var x = d.trans,
									C = d.values,
									j = d.query,
									T = d.reverse,
									K = d.unique;
								return new Promise(function (d, B) {
									d = qe(d);
									var D = j.index,
										R = j.range,
										M = x.objectStore(k),
										M = D.isPrimaryKey ? M : M.index(D.name),
										D = T ? (K ? 'prevunique' : 'prev') : K ? 'nextunique' : 'next',
										F =
											!C && 'openKeyCursor' in M ? M.openKeyCursor(_(R), D) : M.openCursor(_(R), D);
									(F.onerror = Bt(B)),
										(F.onsuccess = qe(function (k) {
											var C,
												j,
												T,
												K,
												D = F.result;
											D
												? ((D.___id = ++Jn),
													(D.done = !1),
													(C = D.continue.bind(D)),
													(j = (j = D.continuePrimaryKey) && j.bind(D)),
													(T = D.advance.bind(D)),
													(K = function () {
														throw new Error('Cursor not stopped');
													}),
													(D.trans = x),
													(D.stop =
														D.continue =
														D.continuePrimaryKey =
														D.advance =
															function () {
																throw new Error('Cursor not started');
															}),
													(D.fail = qe(B)),
													(D.next = function () {
														var d = this,
															x = 1;
														return this.start(function () {
															return x-- ? d.continue() : d.stop();
														}).then(function () {
															return d;
														});
													}),
													(D.start = function (d) {
														function t() {
															if (F.result)
																try {
																	d();
																} catch (d) {
																	D.fail(d);
																}
															else
																(D.done = !0),
																	(D.start = function () {
																		throw new Error('Cursor behind last entry');
																	}),
																	D.stop();
														}
														var x = new Promise(function (d, x) {
															(d = qe(d)),
																(F.onerror = Bt(x)),
																(D.fail = x),
																(D.stop = function (x) {
																	(D.stop = D.continue = D.continuePrimaryKey = D.advance = K),
																		d(x);
																});
														});
														return (
															(F.onsuccess = qe(function (d) {
																(F.onsuccess = t), t();
															})),
															(D.continue = C),
															(D.continuePrimaryKey = j),
															(D.advance = T),
															t(),
															x
														);
													}),
													d(D))
												: d(null);
										}, B));
								});
							},
							count: function (d) {
								var x = d.query,
									C = d.trans,
									j = x.index,
									T = x.range;
								return new Promise(function (d, x) {
									var K = C.objectStore(k),
										B = j.isPrimaryKey ? K : K.index(j.name),
										K = _(T),
										B = K ? B.count(K) : B.count();
									(B.onsuccess = qe(function (x) {
										return d(x.target.result);
									})),
										(B.onerror = Bt(x));
								});
							}
						};
					}
					var j,
						T,
						K,
						B =
							((T = k),
							(K = Qt((j = d).objectStoreNames)),
							{
								schema: {
									name: j.name,
									tables: K.map(function (d) {
										return T.objectStore(d);
									}).map(function (d) {
										var x = d.keyPath,
											k = d.autoIncrement,
											j = C(x),
											T = {},
											k = {
												name: d.name,
												primaryKey: {
													name: null,
													isPrimaryKey: !0,
													outbound: null == x,
													compound: j,
													keyPath: x,
													autoIncrement: k,
													unique: !0,
													extractKey: $t(x)
												},
												indexes: Qt(d.indexNames)
													.map(function (x) {
														return d.index(x);
													})
													.map(function (d) {
														var x = d.name,
															k = d.unique,
															j = d.multiEntry,
															d = d.keyPath,
															j = {
																name: x,
																compound: C(d),
																keyPath: d,
																unique: k,
																multiEntry: j,
																extractKey: $t(d)
															};
														return (T[Xt(d)] = j);
													}),
												getIndexByKeyPath: function (d) {
													return T[Xt(d)];
												}
											};
										return (T[':id'] = k.primaryKey), null != x && (T[Xt(x)] = k.primaryKey), k;
									})
								},
								hasGetAll:
									0 < K.length &&
									'getAll' in T.objectStore(K[0]) &&
									!(
										'undefined' != typeof navigator &&
										/Safari/.test(navigator.userAgent) &&
										!/(Chrome\/|Edge\/)/.test(navigator.userAgent) &&
										[].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604
									)
							}),
						k = B.schema,
						D = B.hasGetAll,
						B = k.tables.map(n),
						R = {};
					return (
						B.forEach(function (d) {
							return (R[d.name] = d);
						}),
						{
							stack: 'dbcore',
							transaction: d.transaction.bind(d),
							table: function (d) {
								if (!R[d]) throw new Error("Table '".concat(d, "' not found"));
								return R[d];
							},
							MIN_KEY: -1 / 0,
							MAX_KEY: Yt(x),
							schema: k
						}
					);
				}
				function Jt(d, x, k, C) {
					var j = k.IDBKeyRange;
					return (
						k.indexedDB,
						{
							dbcore:
								((C = Ht(x, j, C)),
								d.dbcore.reduce(function (d, x) {
									x = x.create;
									return _(_({}, d), x(d));
								}, C))
						}
					);
				}
				function Zt(d, x) {
					var k = x.db,
						x = Jt(d._middlewares, k, d._deps, x);
					(d.core = x.dbcore),
						d.tables.forEach(function (x) {
							var k = x.name;
							d.core.schema.tables.some(function (d) {
								return d.name === k;
							}) && ((x.core = d.core.table(k)), d[k] instanceof d.Table && (d[k].core = x.core));
						});
				}
				function en(d, x, k, C) {
					k.forEach(function (k) {
						var T = C[k];
						x.forEach(function (x) {
							var C = (function e(d, x) {
								return B(d, x) || ((d = j(d)) && e(d, x));
							})(x, k);
							(!C || ('value' in C && void 0 === C.value)) &&
								(x === d.Transaction.prototype || x instanceof d.Transaction
									? l(x, k, {
											get: function () {
												return this.table(k);
											},
											set: function (d) {
												K(this, k, { value: d, writable: !0, configurable: !0, enumerable: !0 });
											}
										})
									: (x[k] = new d.Table(k, T)));
						});
					});
				}
				function tn(d, x) {
					x.forEach(function (x) {
						for (var k in x) x[k] instanceof d.Table && delete x[k];
					});
				}
				function nn(d, x) {
					return d._cfg.version - x._cfg.version;
				}
				function rn(d, k, C, j) {
					var T = d._dbSchema;
					C.objectStoreNames.contains('$meta') &&
						!T.$meta &&
						((T.$meta = Wt('$meta', hn('')[0], [])), d._storeNames.push('$meta'));
					var K = d._createTransaction('readwrite', d._storeNames, T);
					K.create(C), K._completion.catch(j);
					var B = K._reject.bind(K),
						D = Me.transless || Me;
					Ne(function () {
						return (
							(Me.trans = K),
							(Me.transless = D),
							0 !== k
								? (Zt(d, C),
									(R = k),
									((j = K).storeNames.includes('$meta')
										? j
												.table('$meta')
												.get('version')
												.then(function (d) {
													return null != d ? d : R;
												})
										: _e.resolve(R)
									)
										.then(function (k) {
											return (
												(T = k),
												(B = K),
												(D = C),
												(R = []),
												(k = (j = d)._versions),
												(M = j._dbSchema = ln(0, j.idbdb, D)),
												0 !==
												(k = k.filter(function (d) {
													return d._cfg.version >= T;
												})).length
													? (k.forEach(function (d) {
															R.push(function () {
																var k = M,
																	C = d._cfg.dbschema;
																fn(j, k, D), fn(j, C, D), (M = j._dbSchema = C);
																var K = an(k, C);
																K.add.forEach(function (d) {
																	un(D, d[0], d[1].primKey, d[1].indexes);
																}),
																	K.change.forEach(function (d) {
																		if (d.recreate)
																			throw new he.Upgrade(
																				'Not yet support for changing primary key'
																			);
																		var x = D.objectStore(d.name);
																		d.add.forEach(function (d) {
																			return cn(x, d);
																		}),
																			d.change.forEach(function (d) {
																				x.deleteIndex(d.name), cn(x, d);
																			}),
																			d.del.forEach(function (d) {
																				return x.deleteIndex(d);
																			});
																	});
																var R = d._cfg.contentUpgrade;
																if (R && d._cfg.version > T) {
																	Zt(j, D), (B._memoizedTables = {});
																	var F = g(C);
																	K.del.forEach(function (d) {
																		F[d] = k[d];
																	}),
																		tn(j, [j.Transaction.prototype]),
																		en(j, [j.Transaction.prototype], x(F), F),
																		(B.schema = F);
																	var z,
																		W = ie(R);
																	W && Le();
																	K = _e.follow(function () {
																		var d;
																		(z = R(B)) && W && ((d = Ue.bind(null, null)), z.then(d, d));
																	});
																	return z && 'function' == typeof z.then
																		? _e.resolve(z)
																		: K.then(function () {
																				return z;
																			});
																}
															}),
																R.push(function (x) {
																	var k,
																		C,
																		T = d._cfg.dbschema;
																	(k = T),
																		(C = x),
																		[].slice.call(C.db.objectStoreNames).forEach(function (d) {
																			return null == k[d] && C.db.deleteObjectStore(d);
																		}),
																		tn(j, [j.Transaction.prototype]),
																		en(j, [j.Transaction.prototype], j._storeNames, j._dbSchema),
																		(B.schema = j._dbSchema);
																}),
																R.push(function (x) {
																	j.idbdb.objectStoreNames.contains('$meta') &&
																		(Math.ceil(j.idbdb.version / 10) === d._cfg.version
																			? (j.idbdb.deleteObjectStore('$meta'),
																				delete j._dbSchema.$meta,
																				(j._storeNames = j._storeNames.filter(function (d) {
																					return '$meta' !== d;
																				})))
																			: x.objectStore('$meta').put(d._cfg.version, 'version'));
																});
														}),
														(function e() {
															return R.length
																? _e.resolve(R.shift()(B.idbtrans)).then(e)
																: _e.resolve();
														})().then(function () {
															sn(M, D);
														}))
													: _e.resolve()
											);
											var j, T, B, D, R, M;
										})
										.catch(B))
								: (x(T).forEach(function (d) {
										un(C, d, T[d].primKey, T[d].indexes);
									}),
									Zt(d, C),
									void _e
										.follow(function () {
											return d.on.populate.fire(K);
										})
										.catch(B))
						);
						var j, R;
					});
				}
				function on(d, x) {
					sn(d._dbSchema, x),
						x.db.version % 10 != 0 ||
							x.objectStoreNames.contains('$meta') ||
							x.db.createObjectStore('$meta').add(Math.ceil(x.db.version / 10 - 1), 'version');
					var k = ln(0, d.idbdb, x);
					fn(d, d._dbSchema, x);
					for (var C = 0, j = an(k, d._dbSchema).change; C < j.length; C++) {
						var T = (function (d) {
							if (d.change.length || d.recreate)
								return (
									console.warn(
										'Unable to patch indexes of table '.concat(
											d.name,
											' because it has changes on the type of index or primary key.'
										)
									),
									{ value: void 0 }
								);
							var k = x.objectStore(d.name);
							d.add.forEach(function (x) {
								ye &&
									console.debug(
										'Dexie upgrade patch: Creating missing index '.concat(d.name, '.').concat(x.src)
									),
									cn(k, x);
							});
						})(j[C]);
						if ('object' == typeof T) return T.value;
					}
				}
				function an(d, x) {
					var k,
						C = { del: [], add: [], change: [] };
					for (k in d) x[k] || C.del.push(k);
					for (k in x) {
						var j = d[k],
							T = x[k];
						if (j) {
							var K = { name: k, def: T, recreate: !1, del: [], add: [], change: [] };
							if (
								'' + (j.primKey.keyPath || '') != '' + (T.primKey.keyPath || '') ||
								j.primKey.auto !== T.primKey.auto
							)
								(K.recreate = !0), C.change.push(K);
							else {
								var B = j.idxByName,
									D = T.idxByName,
									R = void 0;
								for (R in B) D[R] || K.del.push(R);
								for (R in D) {
									var M = B[R],
										F = D[R];
									M ? M.src !== F.src && K.change.push(F) : K.add.push(F);
								}
								(0 < K.del.length || 0 < K.add.length || 0 < K.change.length) && C.change.push(K);
							}
						} else C.add.push([k, T]);
					}
					return C;
				}
				function un(d, x, k, C) {
					var j = d.db.createObjectStore(
						x,
						k.keyPath ? { keyPath: k.keyPath, autoIncrement: k.auto } : { autoIncrement: k.auto }
					);
					return (
						C.forEach(function (d) {
							return cn(j, d);
						}),
						j
					);
				}
				function sn(d, k) {
					x(d).forEach(function (x) {
						k.db.objectStoreNames.contains(x) ||
							(ye && console.debug('Dexie: Creating missing table', x),
							un(k, x, d[x].primKey, d[x].indexes));
					});
				}
				function cn(d, x) {
					d.createIndex(x.name, x.keyPath, { unique: x.unique, multiEntry: x.multi });
				}
				function ln(d, x, k) {
					var C = {};
					return (
						b(x.objectStoreNames, 0).forEach(function (d) {
							for (
								var x = k.objectStore(d),
									j = Vt(
										zt((D = x.keyPath)),
										D || '',
										!0,
										!1,
										!!x.autoIncrement,
										D && 'string' != typeof D,
										!0
									),
									T = [],
									K = 0;
								K < x.indexNames.length;
								++K
							) {
								var B = x.index(x.indexNames[K]),
									D = B.keyPath,
									B = Vt(B.name, D, !!B.unique, !!B.multiEntry, !1, D && 'string' != typeof D, !1);
								T.push(B);
							}
							C[d] = Wt(d, j, T);
						}),
						C
					);
				}
				function fn(x, k, C) {
					for (var j = C.db.objectStoreNames, T = 0; T < j.length; ++T) {
						var K = j[T],
							B = C.objectStore(K);
						x._hasGetAll = 'getAll' in B;
						for (var D = 0; D < B.indexNames.length; ++D) {
							var R = B.indexNames[D],
								M = B.index(R).keyPath,
								F = 'string' == typeof M ? M : '[' + b(M).join('+') + ']';
							!k[K] ||
								((M = k[K].idxByName[F]) &&
									((M.name = R), delete k[K].idxByName[F], (k[K].idxByName[R] = M)));
						}
					}
					'undefined' != typeof navigator &&
						/Safari/.test(navigator.userAgent) &&
						!/(Chrome\/|Edge\/)/.test(navigator.userAgent) &&
						d.WorkerGlobalScope &&
						d instanceof d.WorkerGlobalScope &&
						[].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604 &&
						(x._hasGetAll = !1);
				}
				function hn(d) {
					return d.split(',').map(function (d, x) {
						var k = (d = d.trim()).replace(/([&*]|\+\+)/g, ''),
							j = /^\[/.test(k) ? k.match(/^\[(.*)\]$/)[1].split('+') : k;
						return Vt(k, j || null, /\&/.test(d), /\*/.test(d), /\+\+/.test(d), C(j), 0 === x);
					});
				}
				var er =
					((pn.prototype._parseStoresSpec = function (d, k) {
						x(d).forEach(function (x) {
							if (null !== d[x]) {
								var C = hn(d[x]),
									j = C.shift();
								if (((j.unique = !0), j.multi))
									throw new he.Schema('Primary key cannot be multi-valued');
								C.forEach(function (d) {
									if (d.auto)
										throw new he.Schema('Only primary key can be marked as autoIncrement (++)');
									if (!d.keyPath)
										throw new he.Schema('Index must have a name and cannot be an empty string');
								}),
									(k[x] = Wt(x, j, C));
							}
						});
					}),
					(pn.prototype.stores = function (d) {
						var k = this.db;
						this._cfg.storesSource = this._cfg.storesSource ? a(this._cfg.storesSource, d) : d;
						var d = k._versions,
							C = {},
							j = {};
						return (
							d.forEach(function (d) {
								a(C, d._cfg.storesSource), (j = d._cfg.dbschema = {}), d._parseStoresSpec(C, j);
							}),
							(k._dbSchema = j),
							tn(k, [k._allTables, k, k.Transaction.prototype]),
							en(k, [k._allTables, k, k.Transaction.prototype, this._cfg.tables], x(j), j),
							(k._storeNames = x(j)),
							this
						);
					}),
					(pn.prototype.upgrade = function (d) {
						return (this._cfg.contentUpgrade = re(this._cfg.contentUpgrade || G, d)), this;
					}),
					pn);
				function pn() {}
				function yn(d, x) {
					var k = d._dbNamesDB;
					return (
						k ||
							(k = d._dbNamesDB = new pr(Mt, { addons: [], indexedDB: d, IDBKeyRange: x }))
								.version(1)
								.stores({ dbnames: 'name' }),
						k.table('dbnames')
					);
				}
				function vn(d) {
					return d && 'function' == typeof d.databases;
				}
				function mn(d) {
					return Ne(function () {
						return (Me.letThrough = !0), d();
					});
				}
				function bn(d) {
					return !('from' in d);
				}
				var gn = function (d, x) {
					if (!this) {
						var k = new gn();
						return d && 'd' in d && a(k, d), k;
					}
					a(
						this,
						arguments.length ? { d: 1, from: d, to: 1 < arguments.length ? x : d } : { d: 0 }
					);
				};
				function wn(d, x, k) {
					var C = st(x, k);
					if (!isNaN(C)) {
						if (0 < C) throw RangeError();
						if (bn(d)) return a(d, { from: x, to: k, d: 1 });
						var j = d.l,
							C = d.r;
						if (st(k, d.from) < 0)
							return j ? wn(j, x, k) : (d.l = { from: x, to: k, d: 1, l: null, r: null }), On(d);
						if (0 < st(x, d.to))
							return C ? wn(C, x, k) : (d.r = { from: x, to: k, d: 1, l: null, r: null }), On(d);
						st(x, d.from) < 0 && ((d.from = x), (d.l = null), (d.d = C ? C.d + 1 : 1)),
							0 < st(k, d.to) && ((d.to = k), (d.r = null), (d.d = d.l ? d.l.d + 1 : 1));
						k = !d.r;
						j && !d.l && _n(d, j), C && k && _n(d, C);
					}
				}
				function _n(d, x) {
					bn(x) ||
						(function e(d, x) {
							var k = x.from,
								C = x.to,
								j = x.l,
								x = x.r;
							wn(d, k, C), j && e(d, j), x && e(d, x);
						})(d, x);
				}
				function xn(d, x) {
					var k = kn(x),
						C = k.next();
					if (C.done) return !1;
					for (var j = C.value, T = kn(d), K = T.next(j.from), B = K.value; !C.done && !K.done; ) {
						if (st(B.from, j.to) <= 0 && 0 <= st(B.to, j.from)) return !0;
						st(j.from, B.from) < 0
							? (j = (C = k.next(B.from)).value)
							: (B = (K = T.next(j.from)).value);
					}
					return !1;
				}
				function kn(d) {
					var x = bn(d) ? null : { s: 0, n: d };
					return {
						next: function (d) {
							for (var k = 0 < arguments.length; x; )
								switch (x.s) {
									case 0:
										if (((x.s = 1), k))
											for (; x.n.l && st(d, x.n.from) < 0; ) x = { up: x, n: x.n.l, s: 1 };
										else for (; x.n.l; ) x = { up: x, n: x.n.l, s: 1 };
									case 1:
										if (((x.s = 2), !k || st(d, x.n.to) <= 0)) return { value: x.n, done: !1 };
									case 2:
										if (x.n.r) {
											(x.s = 3), (x = { up: x, n: x.n.r, s: 0 });
											continue;
										}
									case 3:
										x = x.up;
								}
							return { done: !0 };
						}
					};
				}
				function On(d) {
					var x,
						k,
						C =
							((null === (x = d.r) || void 0 === x ? void 0 : x.d) || 0) -
							((null === (k = d.l) || void 0 === k ? void 0 : k.d) || 0),
						j = 1 < C ? 'r' : C < -1 ? 'l' : '';
					j &&
						((x = 'r' == j ? 'l' : 'r'),
						(k = _({}, d)),
						(C = d[j]),
						(d.from = C.from),
						(d.to = C.to),
						(d[j] = C[j]),
						(k[j] = C[x]),
						((d[x] = k).d = Pn(k))),
						(d.d = Pn(d));
				}
				function Pn(d) {
					var x = d.r,
						d = d.l;
					return (x ? (d ? Math.max(x.d, d.d) : x.d) : d ? d.d : 0) + 1;
				}
				function Kn(d, k) {
					return (
						x(k).forEach(function (x) {
							d[x]
								? _n(d[x], k[x])
								: (d[x] = (function e(d) {
										var x,
											k,
											C = {};
										for (x in d)
											m(d, x) &&
												((k = d[x]),
												(C[x] = !k || 'object' != typeof k || F.has(k.constructor) ? k : e(k)));
										return C;
									})(k[x]));
						}),
						d
					);
				}
				function En(d, x) {
					return (
						d.all ||
						x.all ||
						Object.keys(d).some(function (k) {
							return x[k] && xn(x[k], d[k]);
						})
					);
				}
				r(
					gn.prototype,
					(((ue = {
						add: function (d) {
							return _n(this, d), this;
						},
						addKey: function (d) {
							return wn(this, d, d), this;
						},
						addKeys: function (d) {
							var x = this;
							return (
								d.forEach(function (d) {
									return wn(x, d, d);
								}),
								this
							);
						},
						hasKey: function (d) {
							var x = kn(this).next(d).value;
							return x && st(x.from, d) <= 0 && 0 <= st(x.to, d);
						}
					})[$] = function () {
						return kn(this);
					}),
					ue)
				);
				var nr = {},
					rr = {},
					ar = !1;
				function Cn(d) {
					Kn(rr, d),
						ar ||
							((ar = !0),
							setTimeout(function () {
								(ar = !1), Tn(rr, !(rr = {}));
							}, 0));
				}
				function Tn(d, x) {
					void 0 === x && (x = !1);
					var k = new Set();
					if (d.all)
						for (var C = 0, j = Object.values(nr); C < j.length; C++) qn((K = j[C]), d, k, x);
					else
						for (var T in d) {
							var K,
								B = /^idb\:\/\/(.*)\/(.*)\//.exec(T);
							B &&
								((T = B[1]),
								(B = B[2]),
								(K = nr['idb://'.concat(T, '/').concat(B)]) && qn(K, d, k, x));
						}
					k.forEach(function (d) {
						return d();
					});
				}
				function qn(d, x, k, C) {
					for (var j = [], T = 0, K = Object.entries(d.queries.query); T < K.length; T++) {
						for (var B = K[T], D = B[0], R = [], M = 0, F = B[1]; M < F.length; M++) {
							var z = F[M];
							En(x, z.obsSet)
								? z.subscribers.forEach(function (d) {
										return k.add(d);
									})
								: C && R.push(z);
						}
						C && j.push([D, R]);
					}
					if (C)
						for (var W = 0, $ = j; W < $.length; W++) {
							var Y = $[W],
								D = Y[0],
								R = Y[1];
							d.queries.query[D] = R;
						}
				}
				function Dn(d) {
					var k = d._state,
						C = d._deps.indexedDB;
					if (k.isBeingOpened || d.idbdb)
						return k.dbReadyPromise.then(function () {
							return k.dbOpenError ? ft(k.dbOpenError) : d;
						});
					(k.isBeingOpened = !0), (k.dbOpenError = null), (k.openComplete = !1);
					var j = k.openCanceller,
						T = Math.round(10 * d.verno),
						K = !1;
					function e() {
						if (k.openCanceller !== j) throw new he.DatabaseClosed('db.open() was cancelled');
					}
					function y() {
						return new _e(function (j, B) {
							if ((e(), !C)) throw new he.MissingAPI();
							var D = d.name,
								F = k.autoSchema || !T ? C.open(D) : C.open(D, T);
							if (!F) throw new he.MissingAPI();
							(F.onerror = Bt(B)),
								(F.onblocked = qe(d._fireOnBlocked)),
								(F.onupgradeneeded = qe(function (x) {
									var j;
									(R = F.transaction),
										k.autoSchema && !d._options.allowEmptyDB
											? ((F.onerror = Rt),
												R.abort(),
												F.result.close(),
												((j = C.deleteDatabase(D)).onsuccess = j.onerror =
													qe(function () {
														B(new he.NoSuchDatabase('Database '.concat(D, ' doesnt exist')));
													})))
											: ((R.onerror = Bt(B)),
												(x = x.oldVersion > Math.pow(2, 62) ? 0 : x.oldVersion),
												(M = x < 1),
												(d.idbdb = F.result),
												K && on(d, R),
												rn(d, x / 10, R, B));
								}, B)),
								(F.onsuccess = qe(function () {
									R = null;
									var C,
										B,
										z,
										W,
										$,
										Y = (d.idbdb = F.result),
										Q = b(Y.objectStoreNames);
									if (0 < Q.length)
										try {
											var ie = Y.transaction(1 === (W = Q).length ? W[0] : W, 'readonly');
											if (k.autoSchema)
												(B = Y),
													(z = ie),
													((C = d).verno = B.version / 10),
													(z = C._dbSchema = ln(0, B, z)),
													(C._storeNames = b(B.objectStoreNames, 0)),
													en(C, [C._allTables], x(z), z);
											else if (
												(fn(d, d._dbSchema, ie),
												(($ = an(ln(0, ($ = d).idbdb, ie), $._dbSchema)).add.length ||
													$.change.some(function (d) {
														return d.add.length || d.change.length;
													})) &&
													!K)
											)
												return (
													console.warn(
														'Dexie SchemaDiff: Schema was extended without increasing the number passed to db.version(). Dexie will add missing parts and increment native version number to workaround this.'
													),
													Y.close(),
													(T = Y.version + 1),
													(K = !0),
													j(y())
												);
											Zt(d, ie);
										} catch (C) {}
									Dt.push(d),
										(Y.onversionchange = qe(function (x) {
											(k.vcFired = !0), d.on('versionchange').fire(x);
										})),
										(Y.onclose = qe(function (x) {
											d.on('close').fire(x);
										})),
										M &&
											(($ = d._deps),
											(ie = D),
											(Y = $.indexedDB),
											($ = $.IDBKeyRange),
											vn(Y) || ie === Mt || yn(Y, $).put({ name: ie }).catch(G)),
										j();
								}, B));
						}).catch(function (d) {
							switch (null == d ? void 0 : d.name) {
								case 'UnknownError':
									if (0 < k.PR1398_maxLoop)
										return (
											k.PR1398_maxLoop--,
											console.warn('Dexie: Workaround for Chrome UnknownError on open()'),
											y()
										);
									break;
								case 'VersionError':
									if (0 < T) return (T = 0), y();
							}
							return _e.reject(d);
						});
					}
					var B,
						D = k.dbReadyResolve,
						R = null,
						M = !1;
					return _e
						.race([
							j,
							('undefined' == typeof navigator
								? _e.resolve()
								: !navigator.userAgentData &&
									  /Safari\//.test(navigator.userAgent) &&
									  !/Chrom(e|ium)\//.test(navigator.userAgent) &&
									  indexedDB.databases
									? new Promise(function (d) {
											function t() {
												return indexedDB.databases().finally(d);
											}
											(B = setInterval(t, 100)), t();
										}).finally(function () {
											return clearInterval(B);
										})
									: Promise.resolve()
							).then(y)
						])
						.then(function () {
							return (
								e(),
								(k.onReadyBeingFired = []),
								_e
									.resolve(
										mn(function () {
											return d.on.ready.fire(d.vip);
										})
									)
									.then(function e() {
										if (0 < k.onReadyBeingFired.length) {
											var x = k.onReadyBeingFired.reduce(re, G);
											return (
												(k.onReadyBeingFired = []),
												_e
													.resolve(
														mn(function () {
															return x(d.vip);
														})
													)
													.then(e)
											);
										}
									})
							);
						})
						.finally(function () {
							k.openCanceller === j && ((k.onReadyBeingFired = null), (k.isBeingOpened = !1));
						})
						.catch(function (x) {
							k.dbOpenError = x;
							try {
								R && R.abort();
							} catch (x) {}
							return j === k.openCanceller && d._close(), ft(x);
						})
						.finally(function () {
							(k.openComplete = !0), D();
						})
						.then(function () {
							var x;
							return (
								M &&
									((x = {}),
									d.tables.forEach(function (k) {
										k.schema.indexes.forEach(function (C) {
											C.name &&
												(x['idb://'.concat(d.name, '/').concat(k.name, '/').concat(C.name)] =
													new gn(-1 / 0, [[[]]]));
										}),
											(x['idb://'.concat(d.name, '/').concat(k.name, '/')] = x[
												'idb://'.concat(d.name, '/').concat(k.name, '/:dels')
											] =
												new gn(-1 / 0, [[[]]]));
									}),
									Un(Nn).fire(x),
									Tn(x, !0)),
								d
							);
						});
				}
				function In(d) {
					function e(x) {
						return d.next(x);
					}
					var x = n(e),
						k = n(function (x) {
							return d.throw(x);
						});
					function n(d) {
						return function (j) {
							var T = d(j),
								j = T.value;
							return T.done
								? j
								: j && 'function' == typeof j.then
									? j.then(x, k)
									: C(j)
										? Promise.all(j).then(x, k)
										: x(j);
						};
					}
					return n(e)();
				}
				function Bn(d, x, k) {
					for (var j = C(d) ? d.slice() : [d], T = 0; T < k; ++T) j.push(x);
					return j;
				}
				var sr = {
					stack: 'dbcore',
					name: 'VirtualIndexMiddleware',
					level: 1,
					create: function (d) {
						return _(_({}, d), {
							table: function (x) {
								var k = d.table(x),
									C = k.schema,
									j = {},
									T = [];
								function c(d, x, k) {
									var C = Xt(d),
										K = (j[C] = j[C] || []),
										B = null == d ? 0 : 'string' == typeof d ? 1 : d.length,
										D = 0 < x,
										D = _(_({}, k), {
											name: D ? ''.concat(C, '(virtual-from:').concat(k.name, ')') : k.name,
											lowLevelIndex: k,
											isVirtual: D,
											keyTail: x,
											keyLength: B,
											extractKey: $t(d),
											unique: !D && k.unique
										});
									return (
										K.push(D),
										D.isPrimaryKey || T.push(D),
										1 < B && c(2 === B ? d[0] : d.slice(0, B - 1), x + 1, k),
										K.sort(function (d, x) {
											return d.keyTail - x.keyTail;
										}),
										D
									);
								}
								x = c(C.primaryKey.keyPath, 0, C.primaryKey);
								j[':id'] = [x];
								for (var K = 0, B = C.indexes; K < B.length; K++) {
									var D = B[K];
									c(D.keyPath, 0, D);
								}
								function l(x) {
									var k,
										C = x.query.index;
									return C.isVirtual
										? _(_({}, x), {
												query: {
													index: C.lowLevelIndex,
													range:
														((k = x.query.range),
														(C = C.keyTail),
														{
															type: 1 === k.type ? 2 : k.type,
															lower: Bn(k.lower, k.lowerOpen ? d.MAX_KEY : d.MIN_KEY, C),
															lowerOpen: !0,
															upper: Bn(k.upper, k.upperOpen ? d.MIN_KEY : d.MAX_KEY, C),
															upperOpen: !0
														})
												}
											})
										: x;
								}
								return _(_({}, k), {
									schema: _(_({}, C), {
										primaryKey: x,
										indexes: T,
										getIndexByKeyPath: function (d) {
											return (d = j[Xt(d)]) && d[0];
										}
									}),
									count: function (d) {
										return k.count(l(d));
									},
									query: function (d) {
										return k.query(l(d));
									},
									openCursor: function (x) {
										var C = x.query.index,
											j = C.keyTail,
											T = C.isVirtual,
											K = C.keyLength;
										return T
											? k.openCursor(l(x)).then(function (d) {
													return d && o(d);
												})
											: k.openCursor(x);
										function o(k) {
											return Object.create(k, {
												continue: {
													value: function (C) {
														null != C
															? k.continue(Bn(C, x.reverse ? d.MAX_KEY : d.MIN_KEY, j))
															: x.unique
																? k.continue(
																		k.key.slice(0, K).concat(x.reverse ? d.MIN_KEY : d.MAX_KEY, j)
																	)
																: k.continue();
													}
												},
												continuePrimaryKey: {
													value: function (x, C) {
														k.continuePrimaryKey(Bn(x, d.MAX_KEY, j), C);
													}
												},
												primaryKey: {
													get: function () {
														return k.primaryKey;
													}
												},
												key: {
													get: function () {
														var d = k.key;
														return 1 === K ? d[0] : d.slice(0, K);
													}
												},
												value: {
													get: function () {
														return k.value;
													}
												}
											});
										}
									}
								});
							}
						});
					}
				};
				function Fn(d, k, C, j) {
					return (
						(C = C || {}),
						(j = j || ''),
						x(d).forEach(function (x) {
							var T, K, B;
							m(k, x)
								? ((T = d[x]),
									(K = k[x]),
									'object' == typeof T && 'object' == typeof K && T && K
										? (B = A(T)) !== A(K)
											? (C[j + x] = k[x])
											: 'Object' === B
												? Fn(T, K, C, j + x + '.')
												: T !== K && (C[j + x] = k[x])
										: T !== K && (C[j + x] = k[x]))
								: (C[j + x] = void 0);
						}),
						x(k).forEach(function (x) {
							m(d, x) || (C[j + x] = k[x]);
						}),
						C
					);
				}
				function Mn(d, x) {
					return 'delete' === x.type ? x.keys : x.keys || x.values.map(d.extractKey);
				}
				var cr = {
					stack: 'dbcore',
					name: 'HooksMiddleware',
					level: 2,
					create: function (d) {
						return _(_({}, d), {
							table: function (x) {
								var k = d.table(x),
									C = k.schema.primaryKey;
								return _(_({}, k), {
									mutate: function (d) {
										var j = Me.trans,
											T = j.table(x).hook,
											K = T.deleting,
											B = T.creating,
											D = T.updating;
										switch (d.type) {
											case 'add':
												if (B.fire === G) break;
												return j._promise(
													'readwrite',
													function () {
														return a(d);
													},
													!0
												);
											case 'put':
												if (B.fire === G && D.fire === G) break;
												return j._promise(
													'readwrite',
													function () {
														return a(d);
													},
													!0
												);
											case 'delete':
												if (K.fire === G) break;
												return j._promise(
													'readwrite',
													function () {
														return a(d);
													},
													!0
												);
											case 'deleteRange':
												if (K.fire === G) break;
												return j._promise(
													'readwrite',
													function () {
														return (function n(d, x, j) {
															return k
																.query({
																	trans: d,
																	values: !1,
																	query: { index: C, range: x },
																	limit: j
																})
																.then(function (k) {
																	var C = k.result;
																	return a({ type: 'delete', keys: C, trans: d }).then(
																		function (k) {
																			return 0 < k.numFailures
																				? Promise.reject(k.failures[0])
																				: C.length < j
																					? { failures: [], numFailures: 0, lastResult: void 0 }
																					: n(
																							d,
																							_(_({}, x), {
																								lower: C[C.length - 1],
																								lowerOpen: !0
																							}),
																							j
																						);
																		}
																	);
																});
														})(d.trans, d.range, 1e4);
													},
													!0
												);
										}
										return k.mutate(d);
										function a(d) {
											var x,
												j,
												T,
												R = Me.trans,
												M = d.keys || Mn(C, d);
											if (!M) throw new Error('Keys missing');
											return (
												'delete' !==
													(d =
														'add' === d.type || 'put' === d.type
															? _(_({}, d), { keys: M })
															: _({}, d)).type && (d.values = i([], d.values, !0)),
												d.keys && (d.keys = i([], d.keys, !0)),
												(x = k),
												(T = M),
												('add' === (j = d).type
													? Promise.resolve([])
													: x.getMany({ trans: j.trans, keys: T, cache: 'immutable' })
												).then(function (x) {
													var j = M.map(function (k, j) {
														var T,
															M,
															F,
															z = x[j],
															W = { onerror: null, onsuccess: null };
														return (
															'delete' === d.type
																? K.fire.call(W, k, z, R)
																: 'add' === d.type || void 0 === z
																	? ((T = B.fire.call(W, k, d.values[j], R)),
																		null == k &&
																			null != T &&
																			((d.keys[j] = k = T),
																			C.outbound || P(d.values[j], C.keyPath, k)))
																	: ((T = Fn(z, d.values[j])),
																		(M = D.fire.call(W, T, k, z, R)) &&
																			((F = d.values[j]),
																			Object.keys(M).forEach(function (d) {
																				m(F, d) ? (F[d] = M[d]) : P(F, d, M[d]);
																			}))),
															W
														);
													});
													return k
														.mutate(d)
														.then(function (k) {
															for (
																var C = k.failures,
																	T = k.results,
																	K = k.numFailures,
																	k = k.lastResult,
																	B = 0;
																B < M.length;
																++B
															) {
																var D = (T || M)[B],
																	R = j[B];
																null == D
																	? R.onerror && R.onerror(C[B])
																	: R.onsuccess &&
																		R.onsuccess('put' === d.type && x[B] ? d.values[B] : D);
															}
															return { failures: C, results: T, numFailures: K, lastResult: k };
														})
														.catch(function (d) {
															return (
																j.forEach(function (x) {
																	return x.onerror && x.onerror(d);
																}),
																Promise.reject(d)
															);
														});
												})
											);
										}
									}
								});
							}
						});
					}
				};
				function Ln(d, x, k) {
					try {
						if (!x) return null;
						if (x.keys.length < d.length) return null;
						for (var C = [], j = 0, T = 0; j < x.keys.length && T < d.length; ++j)
							0 === st(x.keys[j], d[T]) && (C.push(k ? S(x.values[j]) : x.values[j]), ++T);
						return C.length === d.length ? C : null;
					} catch (d) {
						return null;
					}
				}
				var fr = {
					stack: 'dbcore',
					level: -1,
					create: function (d) {
						return {
							table: function (x) {
								var k = d.table(x);
								return _(_({}, k), {
									getMany: function (d) {
										if (!d.cache) return k.getMany(d);
										var x = Ln(d.keys, d.trans._cache, 'clone' === d.cache);
										return x
											? _e.resolve(x)
											: k.getMany(d).then(function (x) {
													return (
														(d.trans._cache = {
															keys: d.keys,
															values: 'clone' === d.cache ? S(x) : x
														}),
														x
													);
												});
									},
									mutate: function (d) {
										return 'add' !== d.type && (d.trans._cache = null), k.mutate(d);
									}
								});
							}
						};
					}
				};
				function Vn(d, x) {
					return (
						'readonly' === d.trans.mode &&
						!!d.subscr &&
						!d.trans.explicit &&
						'disabled' !== d.trans.db._options.cache &&
						!x.schema.primaryKey.outbound
					);
				}
				function zn(d, x) {
					switch (d) {
						case 'query':
							return x.values && !x.unique;
						case 'get':
						case 'getMany':
						case 'count':
						case 'openCursor':
							return !1;
					}
				}
				var hr = {
					stack: 'dbcore',
					level: 0,
					name: 'Observability',
					create: function (d) {
						var k = d.schema.name,
							j = new gn(d.MIN_KEY, d.MAX_KEY);
						return _(_({}, d), {
							transaction: function (x, k, C) {
								if (Me.subscr && 'readonly' !== k)
									throw new he.ReadOnly(
										'Readwrite transaction in liveQuery context. Querier source: '.concat(
											Me.querier
										)
									);
								return d.transaction(x, k, C);
							},
							table: function (T) {
								var K = d.table(T),
									B = K.schema,
									D = B.primaryKey,
									e = B.indexes,
									R = D.extractKey,
									M = D.outbound,
									F =
										D.autoIncrement &&
										e.filter(function (d) {
											return d.compound && d.keyPath.includes(D.keyPath);
										}),
									z = _(_({}, K), {
										mutate: function (x) {
											function u(d) {
												return (
													(d = 'idb://'.concat(k, '/').concat(T, '/').concat(d)),
													$[d] || ($[d] = new gn())
												);
											}
											var R,
												M,
												z,
												W = x.trans,
												$ = x.mutatedParts || (x.mutatedParts = {}),
												Y = u(''),
												Q = u(':dels'),
												ie = x.type,
												ae =
													'deleteRange' === x.type
														? [x.range]
														: 'delete' === x.type
															? [x.keys]
															: x.values.length < 50
																? [
																		Mn(D, x).filter(function (d) {
																			return d;
																		}),
																		x.values
																	]
																: [],
												ue = ae[0],
												se = ae[1],
												ae = x.trans._cache;
											return (
												C(ue)
													? (Y.addKeys(ue),
														(ae = 'delete' === ie || ue.length === se.length ? Ln(ue, ae) : null) ||
															Q.addKeys(ue),
														(ae || se) &&
															((R = u),
															(M = ae),
															(z = se),
															B.indexes.forEach(function (d) {
																var x = R(d.name || '');
																function r(x) {
																	return null != x ? d.extractKey(x) : null;
																}
																function i(k) {
																	return d.multiEntry && C(k)
																		? k.forEach(function (d) {
																				return x.addKey(d);
																			})
																		: x.addKey(k);
																}
																(M || z).forEach(function (d, x) {
																	var k = M && r(M[x]),
																		x = z && r(z[x]);
																	0 !== st(k, x) && (null != k && i(k), null != x && i(x));
																});
															})))
													: ue
														? ((se = {
																from: null !== (se = ue.lower) && void 0 !== se ? se : d.MIN_KEY,
																to: null !== (se = ue.upper) && void 0 !== se ? se : d.MAX_KEY
															}),
															Q.add(se),
															Y.add(se))
														: (Y.add(j),
															Q.add(j),
															B.indexes.forEach(function (d) {
																return u(d.name).add(j);
															})),
												K.mutate(x).then(function (d) {
													return (
														!ue ||
															('add' !== x.type && 'put' !== x.type) ||
															(Y.addKeys(d.results),
															F &&
																F.forEach(function (k) {
																	for (
																		var C = x.values.map(function (d) {
																				return k.extractKey(d);
																			}),
																			j = k.keyPath.findIndex(function (d) {
																				return d === D.keyPath;
																			}),
																			T = 0,
																			K = d.results.length;
																		T < K;
																		++T
																	)
																		C[T][j] = d.results[T];
																	u(k.name).addKeys(C);
																})),
														(W.mutatedParts = Kn(W.mutatedParts || {}, $)),
														d
													);
												})
											);
										}
									}),
									e = function (x) {
										var k = x.query,
											x = k.index,
											k = k.range;
										return [
											x,
											new gn(
												null !== (x = k.lower) && void 0 !== x ? x : d.MIN_KEY,
												null !== (k = k.upper) && void 0 !== k ? k : d.MAX_KEY
											)
										];
									},
									W = {
										get: function (d) {
											return [D, new gn(d.key)];
										},
										getMany: function (d) {
											return [D, new gn().addKeys(d.keys)];
										},
										count: e,
										query: e,
										openCursor: e
									};
								return (
									x(W).forEach(function (d) {
										z[d] = function (x) {
											var C = Me.subscr,
												B = !!C,
												D = Vn(Me, K) && zn(d, x) ? (x.obsSet = {}) : C;
											if (B) {
												var r = function (d) {
														d = 'idb://'.concat(k, '/').concat(T, '/').concat(d);
														return D[d] || (D[d] = new gn());
													},
													F = r(''),
													z = r(':dels'),
													C = W[d](x),
													B = C[0],
													C = C[1];
												if (
													(('query' === d && B.isPrimaryKey && !x.values ? z : r(B.name || '')).add(
														C
													),
													!B.isPrimaryKey)
												) {
													if ('count' !== d) {
														var $ =
															'query' === d &&
															M &&
															x.values &&
															K.query(_(_({}, x), { values: !1 }));
														return K[d].apply(this, arguments).then(function (k) {
															if ('query' === d) {
																if (M && x.values)
																	return $.then(function (d) {
																		d = d.result;
																		return F.addKeys(d), k;
																	});
																var C = x.values ? k.result.map(R) : k.result;
																(x.values ? F : z).addKeys(C);
															} else if ('openCursor' === d) {
																var j = k,
																	T = x.values;
																return (
																	j &&
																	Object.create(j, {
																		key: {
																			get: function () {
																				return z.addKey(j.primaryKey), j.key;
																			}
																		},
																		primaryKey: {
																			get: function () {
																				var d = j.primaryKey;
																				return z.addKey(d), d;
																			}
																		},
																		value: {
																			get: function () {
																				return T && F.addKey(j.primaryKey), j.value;
																			}
																		}
																	})
																);
															}
															return k;
														});
													}
													z.add(j);
												}
											}
											return K[d].apply(this, arguments);
										};
									}),
									z
								);
							}
						});
					}
				};
				function Yn(d, x, k) {
					if (0 === k.numFailures) return x;
					if ('deleteRange' === x.type) return null;
					var j = x.keys ? x.keys.length : 'values' in x && x.values ? x.values.length : 1;
					if (k.numFailures === j) return null;
					x = _({}, x);
					return (
						C(x.keys) &&
							(x.keys = x.keys.filter(function (d, x) {
								return !(x in k.failures);
							})),
						'values' in x &&
							C(x.values) &&
							(x.values = x.values.filter(function (d, x) {
								return !(x in k.failures);
							})),
						x
					);
				}
				function $n(d, x) {
					return (
						(k = d),
						(void 0 === (C = x).lower ||
							(C.lowerOpen ? 0 < st(k, C.lower) : 0 <= st(k, C.lower))) &&
							((d = d),
							void 0 === (x = x).upper || (x.upperOpen ? st(d, x.upper) < 0 : st(d, x.upper) <= 0))
					);
					var k, C;
				}
				function Qn(d, x, k, j, T, K) {
					if (!k || 0 === k.length) return d;
					var B = x.query.index,
						D = B.multiEntry,
						R = x.query.range,
						M = j.schema.primaryKey.extractKey,
						F = B.extractKey,
						z = (B.lowLevelIndex || B).extractKey,
						k = k.reduce(function (d, k) {
							var j = d,
								T = [];
							if ('add' === k.type || 'put' === k.type)
								for (var K = new gn(), B = k.values.length - 1; 0 <= B; --B) {
									var z,
										W = k.values[B],
										$ = M(W);
									K.hasKey($) ||
										((z = F(W)),
										(D && C(z)
											? z.some(function (d) {
													return $n(d, R);
												})
											: $n(z, R)) && (K.addKey($), T.push(W)));
								}
							switch (k.type) {
								case 'add':
									var Y = new gn().addKeys(
											x.values
												? d.map(function (d) {
														return M(d);
													})
												: d
										),
										j = d.concat(
											x.values
												? T.filter(function (d) {
														d = M(d);
														return !Y.hasKey(d) && (Y.addKey(d), !0);
													})
												: T.map(function (d) {
														return M(d);
													}).filter(function (d) {
														return !Y.hasKey(d) && (Y.addKey(d), !0);
													})
										);
									break;
								case 'put':
									var Q = new gn().addKeys(
										k.values.map(function (d) {
											return M(d);
										})
									);
									j = d
										.filter(function (d) {
											return !Q.hasKey(x.values ? M(d) : d);
										})
										.concat(
											x.values
												? T
												: T.map(function (d) {
														return M(d);
													})
										);
									break;
								case 'delete':
									var ie = new gn().addKeys(k.keys);
									j = d.filter(function (d) {
										return !ie.hasKey(x.values ? M(d) : d);
									});
									break;
								case 'deleteRange':
									var ae = k.range;
									j = d.filter(function (d) {
										return !$n(M(d), ae);
									});
							}
							return j;
						}, d);
					return k === d
						? d
						: (k.sort(function (d, x) {
								return st(z(d), z(x)) || st(M(d), M(x));
							}),
							x.limit &&
								x.limit < 1 / 0 &&
								(k.length > x.limit
									? (k.length = x.limit)
									: d.length === x.limit && k.length < x.limit && (T.dirty = !0)),
							K ? Object.freeze(k) : k);
				}
				function Gn(d, x) {
					return (
						0 === st(d.lower, x.lower) &&
						0 === st(d.upper, x.upper) &&
						!!d.lowerOpen == !!x.lowerOpen &&
						!!d.upperOpen == !!x.upperOpen
					);
				}
				function Xn(d, x) {
					return (
						(function (d, x, k, C) {
							if (void 0 === d) return void 0 !== x ? -1 : 0;
							if (void 0 === x) return 1;
							if (0 === (x = st(d, x))) {
								if (k && C) return 0;
								if (k) return 1;
								if (C) return -1;
							}
							return x;
						})(d.lower, x.lower, d.lowerOpen, x.lowerOpen) <= 0 &&
						0 <=
							(function (d, x, k, C) {
								if (void 0 === d) return void 0 !== x ? 1 : 0;
								if (void 0 === x) return -1;
								if (0 === (x = st(d, x))) {
									if (k && C) return 0;
									if (k) return -1;
									if (C) return 1;
								}
								return x;
							})(d.upper, x.upper, d.upperOpen, x.upperOpen)
					);
				}
				function Hn(d, x, k, C) {
					d.subscribers.add(k),
						C.addEventListener('abort', function () {
							var C, j;
							d.subscribers.delete(k),
								0 === d.subscribers.size &&
									((C = d),
									(j = x),
									setTimeout(function () {
										0 === C.subscribers.size && q(j, C);
									}, 3e3));
						});
				}
				var dr = {
					stack: 'dbcore',
					level: 0,
					name: 'Cache',
					create: function (d) {
						var x = d.schema.name;
						return _(_({}, d), {
							transaction: function (k, C, j) {
								var T,
									K,
									B = d.transaction(k, C, j);
								return (
									'readwrite' === C &&
										((K = (T = new AbortController()).signal),
										(j = function (j) {
											return function () {
												if ((T.abort(), 'readwrite' === C)) {
													for (var K = new Set(), D = 0, R = k; D < R.length; D++) {
														var M = R[D],
															F = nr['idb://'.concat(x, '/').concat(M)];
														if (F) {
															var z = d.table(M),
																W = F.optimisticOps.filter(function (d) {
																	return d.trans === B;
																});
															if (B._explicit && j && B.mutatedParts)
																for (
																	var $ = 0, Y = Object.values(F.queries.query);
																	$ < Y.length;
																	$++
																)
																	for (var Q = 0, ie = (se = Y[$]).slice(); Q < ie.length; Q++)
																		En((ce = ie[Q]).obsSet, B.mutatedParts) &&
																			(q(se, ce),
																			ce.subscribers.forEach(function (d) {
																				return K.add(d);
																			}));
															else if (0 < W.length) {
																F.optimisticOps = F.optimisticOps.filter(function (d) {
																	return d.trans !== B;
																});
																for (
																	var ae = 0, ue = Object.values(F.queries.query);
																	ae < ue.length;
																	ae++
																)
																	for (
																		var se, ce, fe, he = 0, de = (se = ue[ae]).slice();
																		he < de.length;
																		he++
																	)
																		null != (ce = de[he]).res &&
																			B.mutatedParts &&
																			(j && !ce.dirty
																				? ((fe = Object.isFrozen(ce.res)),
																					(fe = Qn(ce.res, ce.req, W, z, ce, fe)),
																					ce.dirty
																						? (q(se, ce),
																							ce.subscribers.forEach(function (d) {
																								return K.add(d);
																							}))
																						: fe !== ce.res &&
																							((ce.res = fe),
																							(ce.promise = _e.resolve({ result: fe }))))
																				: (ce.dirty && q(se, ce),
																					ce.subscribers.forEach(function (d) {
																						return K.add(d);
																					})));
															}
														}
													}
													K.forEach(function (d) {
														return d();
													});
												}
											};
										}),
										B.addEventListener('abort', j(!1), { signal: K }),
										B.addEventListener('error', j(!1), { signal: K }),
										B.addEventListener('complete', j(!0), { signal: K })),
									B
								);
							},
							table: function (k) {
								var C = d.table(k),
									j = C.schema.primaryKey;
								return _(_({}, C), {
									mutate: function (d) {
										var T = Me.trans;
										if (
											j.outbound ||
											'disabled' === T.db._options.cache ||
											T.explicit ||
											'readwrite' !== T.idbtrans.mode
										)
											return C.mutate(d);
										var K = nr['idb://'.concat(x, '/').concat(k)];
										if (!K) return C.mutate(d);
										T = C.mutate(d);
										return (
											('add' !== d.type && 'put' !== d.type) ||
											!(
												50 <= d.values.length ||
												Mn(j, d).some(function (d) {
													return null == d;
												})
											)
												? (K.optimisticOps.push(d),
													d.mutatedParts && Cn(d.mutatedParts),
													T.then(function (x) {
														0 < x.numFailures &&
															(q(K.optimisticOps, d),
															(x = Yn(0, d, x)) && K.optimisticOps.push(x),
															d.mutatedParts && Cn(d.mutatedParts));
													}),
													T.catch(function () {
														q(K.optimisticOps, d), d.mutatedParts && Cn(d.mutatedParts);
													}))
												: T.then(function (x) {
														var k = Yn(
															0,
															_(_({}, d), {
																values: d.values.map(function (d, k) {
																	var C;
																	if (x.failures[k]) return d;
																	d =
																		null !== (C = j.keyPath) && void 0 !== C && C.includes('.')
																			? S(d)
																			: _({}, d);
																	return P(d, j.keyPath, x.results[k]), d;
																})
															}),
															x
														);
														K.optimisticOps.push(k),
															queueMicrotask(function () {
																return d.mutatedParts && Cn(d.mutatedParts);
															});
													}),
											T
										);
									},
									query: function (d) {
										if (!Vn(Me, C) || !zn('query', d)) return C.query(d);
										var j =
												'immutable' ===
												(null === (D = Me.trans) || void 0 === D ? void 0 : D.db._options.cache),
											T = Me,
											K = T.requery,
											B = T.signal,
											D = (function (d, x, k, C) {
												var j = nr['idb://'.concat(d, '/').concat(x)];
												if (!j) return [];
												if (!(x = j.queries[k])) return [null, !1, j, null];
												var T = x[(C.query ? C.query.index.name : null) || ''];
												if (!T) return [null, !1, j, null];
												switch (k) {
													case 'query':
														var K = T.find(function (d) {
															return (
																d.req.limit === C.limit &&
																d.req.values === C.values &&
																Gn(d.req.query.range, C.query.range)
															);
														});
														return K
															? [K, !0, j, T]
															: [
																	T.find(function (d) {
																		return (
																			('limit' in d.req ? d.req.limit : 1 / 0) >= C.limit &&
																			(!C.values || d.req.values) &&
																			Xn(d.req.query.range, C.query.range)
																		);
																	}),
																	!1,
																	j,
																	T
																];
													case 'count':
														K = T.find(function (d) {
															return Gn(d.req.query.range, C.query.range);
														});
														return [K, !!K, j, T];
												}
											})(x, k, 'query', d),
											R = D[0],
											T = D[1],
											M = D[2],
											F = D[3];
										return (
											R && T
												? (R.obsSet = d.obsSet)
												: ((T = C.query(d)
														.then(function (d) {
															var x = d.result;
															if ((R && (R.res = x), j)) {
																for (var k = 0, C = x.length; k < C; ++k) Object.freeze(x[k]);
																Object.freeze(x);
															} else d.result = S(x);
															return d;
														})
														.catch(function (d) {
															return F && R && q(F, R), Promise.reject(d);
														})),
													(R = {
														obsSet: d.obsSet,
														promise: T,
														subscribers: new Set(),
														type: 'query',
														req: d,
														dirty: !1
													}),
													F
														? F.push(R)
														: ((F = [R]),
															((M =
																M ||
																(nr['idb://'.concat(x, '/').concat(k)] = {
																	queries: { query: {}, count: {} },
																	objs: new Map(),
																	optimisticOps: [],
																	unsignaledParts: {}
																})).queries.query[d.query.index.name || ''] = F))),
											Hn(R, F, K, B),
											R.promise.then(function (x) {
												return {
													result: Qn(x.result, d, null == M ? void 0 : M.optimisticOps, C, R, j)
												};
											})
										);
									}
								});
							}
						});
					}
				};
				function Zn(d, x) {
					return new Proxy(d, {
						get: function (d, k, C) {
							return 'db' === k ? x : Reflect.get(d, k, C);
						}
					});
				}
				var pr =
					((tr.prototype.version = function (d) {
						if (isNaN(d) || d < 0.1) throw new he.Type('Given version is not a positive number');
						if (((d = Math.round(10 * d) / 10), this.idbdb || this._state.isBeingOpened))
							throw new he.Schema('Cannot add version when database is open');
						this.verno = Math.max(this.verno, d);
						var x = this._versions,
							k = x.filter(function (x) {
								return x._cfg.version === d;
							})[0];
						return (
							k ||
							((k = new this.Version(d)),
							x.push(k),
							x.sort(nn),
							k.stores({}),
							(this._state.autoSchema = !1),
							k)
						);
					}),
					(tr.prototype._whenReady = function (d) {
						var x = this;
						return this.idbdb && (this._state.openComplete || Me.letThrough || this._vip)
							? d()
							: new _e(function (d, k) {
									if (x._state.openComplete) return k(new he.DatabaseClosed(x._state.dbOpenError));
									if (!x._state.isBeingOpened) {
										if (!x._state.autoOpen) return void k(new he.DatabaseClosed());
										x.open().catch(G);
									}
									x._state.dbReadyPromise.then(d, k);
								}).then(d);
					}),
					(tr.prototype.use = function (d) {
						var x = d.stack,
							k = d.create,
							C = d.level,
							j = d.name;
						j && this.unuse({ stack: x, name: j });
						d = this._middlewares[x] || (this._middlewares[x] = []);
						return (
							d.push({ stack: x, create: k, level: null == C ? 10 : C, name: j }),
							d.sort(function (d, x) {
								return d.level - x.level;
							}),
							this
						);
					}),
					(tr.prototype.unuse = function (d) {
						var x = d.stack,
							k = d.name,
							C = d.create;
						return (
							x &&
								this._middlewares[x] &&
								(this._middlewares[x] = this._middlewares[x].filter(function (d) {
									return C ? d.create !== C : !!k && d.name !== k;
								})),
							this
						);
					}),
					(tr.prototype.open = function () {
						var d = this;
						return $e(Re, function () {
							return Dn(d);
						});
					}),
					(tr.prototype._close = function () {
						var d = this._state,
							x = Dt.indexOf(this);
						if ((0 <= x && Dt.splice(x, 1), this.idbdb)) {
							try {
								this.idbdb.close();
							} catch (x) {}
							this.idbdb = null;
						}
						d.isBeingOpened ||
							((d.dbReadyPromise = new _e(function (x) {
								d.dbReadyResolve = x;
							})),
							(d.openCanceller = new _e(function (x, k) {
								d.cancelOpen = k;
							})));
					}),
					(tr.prototype.close = function (d) {
						var x = (void 0 === d ? { disableAutoOpen: !0 } : d).disableAutoOpen,
							d = this._state;
						x
							? (d.isBeingOpened && d.cancelOpen(new he.DatabaseClosed()),
								this._close(),
								(d.autoOpen = !1),
								(d.dbOpenError = new he.DatabaseClosed()))
							: (this._close(),
								(d.autoOpen = this._options.autoOpen || d.isBeingOpened),
								(d.openComplete = !1),
								(d.dbOpenError = null));
					}),
					(tr.prototype.delete = function (d) {
						var x = this;
						void 0 === d && (d = { disableAutoOpen: !0 });
						var k = 0 < arguments.length && 'object' != typeof arguments[0],
							C = this._state;
						return new _e(function (j, T) {
							function e() {
								x.close(d);
								var k = x._deps.indexedDB.deleteDatabase(x.name);
								(k.onsuccess = qe(function () {
									var d, k, C;
									(d = x._deps),
										(k = x.name),
										(C = d.indexedDB),
										(d = d.IDBKeyRange),
										vn(C) || k === Mt || yn(C, d).delete(k).catch(G),
										j();
								})),
									(k.onerror = Bt(T)),
									(k.onblocked = x._fireOnBlocked);
							}
							if (k) throw new he.InvalidArgument('Invalid closeOptions argument to db.delete()');
							C.isBeingOpened ? C.dbReadyPromise.then(e) : e();
						});
					}),
					(tr.prototype.backendDB = function () {
						return this.idbdb;
					}),
					(tr.prototype.isOpen = function () {
						return null !== this.idbdb;
					}),
					(tr.prototype.hasBeenClosed = function () {
						var d = this._state.dbOpenError;
						return d && 'DatabaseClosed' === d.name;
					}),
					(tr.prototype.hasFailed = function () {
						return null !== this._state.dbOpenError;
					}),
					(tr.prototype.dynamicallyOpened = function () {
						return this._state.autoSchema;
					}),
					Object.defineProperty(tr.prototype, 'tables', {
						get: function () {
							var d = this;
							return x(this._allTables).map(function (x) {
								return d._allTables[x];
							});
						},
						enumerable: !1,
						configurable: !0
					}),
					(tr.prototype.transaction = function () {
						var d = function (d, x, k) {
							var C = arguments.length;
							if (C < 2) throw new he.InvalidArgument('Too few arguments');
							for (var j = new Array(C - 1); --C; ) j[C - 1] = arguments[C];
							return (k = j.pop()), [d, w(j), k];
						}.apply(this, arguments);
						return this._transaction.apply(this, d);
					}),
					(tr.prototype._transaction = function (d, x, k) {
						var C = this,
							j = Me.trans;
						(j && j.db === this && -1 === d.indexOf('!')) || (j = null);
						var T,
							K,
							B = -1 !== d.indexOf('?');
						d = d.replace('!', '').replace('?', '');
						try {
							if (
								((K = x.map(function (d) {
									d = d instanceof C.Table ? d.name : d;
									if ('string' != typeof d)
										throw new TypeError(
											'Invalid table argument to Dexie.transaction(). Only Table or String are allowed'
										);
									return d;
								})),
								'r' == d || d === Ft)
							)
								T = Ft;
							else {
								if ('rw' != d && d != Lt)
									throw new he.InvalidArgument('Invalid transaction mode: ' + d);
								T = Lt;
							}
							if (j) {
								if (j.mode === Ft && T === Lt) {
									if (!B)
										throw new he.SubTransaction(
											'Cannot enter a sub-transaction with READWRITE mode when parent transaction is READONLY'
										);
									j = null;
								}
								j &&
									K.forEach(function (d) {
										if (j && -1 === j.storeNames.indexOf(d)) {
											if (!B)
												throw new he.SubTransaction(
													'Table ' + d + ' not included in parent transaction.'
												);
											j = null;
										}
									}),
									B && j && !j.active && (j = null);
							}
						} catch (k) {
							return j
								? j._promise(null, function (d, x) {
										x(k);
									})
								: ft(k);
						}
						var D = function i(d, x, k, C, j) {
							return _e.resolve().then(function () {
								var T = Me.transless || Me,
									K = d._createTransaction(x, k, d._dbSchema, C);
								if (((K.explicit = !0), (T = { trans: K, transless: T }), C))
									K.idbtrans = C.idbtrans;
								else
									try {
										K.create(), (K.idbtrans._explicit = !0), (d._state.PR1398_maxLoop = 3);
									} catch (T) {
										return T.name === ce.InvalidState && d.isOpen() && 0 < --d._state.PR1398_maxLoop
											? (console.warn('Dexie: Need to reopen db'),
												d.close({ disableAutoOpen: !1 }),
												d.open().then(function () {
													return i(d, x, k, null, j);
												}))
											: ft(T);
									}
								var B,
									D = ie(j);
								return (
									D && Le(),
									(T = _e.follow(function () {
										var d;
										(B = j.call(K, K)) &&
											(D
												? ((d = Ue.bind(null, null)), B.then(d, d))
												: 'function' == typeof B.next &&
													'function' == typeof B.throw &&
													(B = In(B)));
									}, T)),
									(B && 'function' == typeof B.then
										? _e.resolve(B).then(function (d) {
												return K.active
													? d
													: ft(
															new he.PrematureCommit(
																'Transaction committed too early. See http://bit.ly/2kdckMn'
															)
														);
											})
										: T.then(function () {
												return B;
											})
									)
										.then(function (d) {
											return (
												C && K._resolve(),
												K._completion.then(function () {
													return d;
												})
											);
										})
										.catch(function (d) {
											return K._reject(d), ft(d);
										})
								);
							});
						}.bind(null, this, T, K, j, k);
						return j
							? j._promise(T, D, 'lock')
							: Me.trans
								? $e(Me.transless, function () {
										return C._whenReady(D);
									})
								: this._whenReady(D);
					}),
					(tr.prototype.table = function (d) {
						if (!m(this._allTables, d))
							throw new he.InvalidTable('Table '.concat(d, ' does not exist'));
						return this._allTables[d];
					}),
					tr);
				function tr(d, x) {
					var k = this;
					(this._middlewares = {}), (this.verno = 0);
					var C = tr.dependencies;
					(this._options = x =
						_(
							{
								addons: tr.addons,
								autoOpen: !0,
								indexedDB: C.indexedDB,
								IDBKeyRange: C.IDBKeyRange,
								cache: 'cloned'
							},
							x
						)),
						(this._deps = { indexedDB: x.indexedDB, IDBKeyRange: x.IDBKeyRange });
					C = x.addons;
					(this._dbSchema = {}),
						(this._versions = []),
						(this._storeNames = []),
						(this._allTables = {}),
						(this.idbdb = null),
						(this._novip = this);
					var j,
						T,
						K,
						B,
						D,
						R = {
							dbOpenError: null,
							isBeingOpened: !1,
							onReadyBeingFired: null,
							openComplete: !1,
							dbReadyResolve: G,
							dbReadyPromise: null,
							cancelOpen: G,
							openCanceller: null,
							autoSchema: !0,
							PR1398_maxLoop: 3,
							autoOpen: x.autoOpen
						};
					(R.dbReadyPromise = new _e(function (d) {
						R.dbReadyResolve = d;
					})),
						(R.openCanceller = new _e(function (d, x) {
							R.cancelOpen = x;
						})),
						(this._state = R),
						(this.name = d),
						(this.on = dt(this, 'populate', 'blocked', 'versionchange', 'close', {
							ready: [re, G]
						})),
						(this.on.ready.subscribe = p(this.on.ready.subscribe, function (d) {
							return function (x, C) {
								tr.vip(function () {
									var j,
										T = k._state;
									T.openComplete
										? (T.dbOpenError || _e.resolve().then(x), C && d(x))
										: T.onReadyBeingFired
											? (T.onReadyBeingFired.push(x), C && d(x))
											: (d(x),
												(j = k),
												C ||
													d(function e() {
														j.on.ready.unsubscribe(x), j.on.ready.unsubscribe(e);
													}));
								});
							};
						})),
						(this.Collection =
							((j = this),
							pt(Sn.prototype, function (d, x) {
								this.db = j;
								var k = Gt,
									C = null;
								if (x)
									try {
										k = x();
									} catch (d) {
										C = d;
									}
								var T = d._ctx,
									x = T.table,
									d = x.hook.reading.fire;
								this._ctx = {
									table: x,
									index: T.index,
									isPrimKey:
										!T.index || (x.schema.primKey.keyPath && T.index === x.schema.primKey.name),
									range: k,
									keysOnly: !1,
									dir: 'next',
									unique: '',
									algorithm: null,
									filter: null,
									replayFilter: null,
									justLimit: !0,
									isMatch: null,
									offset: 0,
									limit: 1 / 0,
									error: C,
									or: T.or,
									valueMapper: d !== X ? d : null
								};
							}))),
						(this.Table =
							((T = this),
							pt(dn.prototype, function (d, x, k) {
								(this.db = T),
									(this._tx = k),
									(this.name = d),
									(this.schema = x),
									(this.hook = T._allTables[d]
										? T._allTables[d].hook
										: dt(null, {
												creating: [Z, G],
												reading: [H, X],
												updating: [te, G],
												deleting: [ee, G]
											}));
							}))),
						(this.Transaction =
							((K = this),
							pt(Wn.prototype, function (d, x, k, C, j) {
								var T = this;
								(this.db = K),
									(this.mode = d),
									(this.storeNames = x),
									(this.schema = k),
									(this.chromeTransactionDurability = C),
									(this.idbtrans = null),
									(this.on = dt(this, 'complete', 'error', 'abort')),
									(this.parent = j || null),
									(this.active = !0),
									(this._reculock = 0),
									(this._blockedFuncs = []),
									(this._resolve = null),
									(this._reject = null),
									(this._waitingFor = null),
									(this._waitingQueue = null),
									(this._spinCount = 0),
									(this._completion = new _e(function (d, x) {
										(T._resolve = d), (T._reject = x);
									})),
									this._completion.then(
										function () {
											(T.active = !1), T.on.complete.fire();
										},
										function (d) {
											var x = T.active;
											return (
												(T.active = !1),
												T.on.error.fire(d),
												T.parent ? T.parent._reject(d) : x && T.idbtrans && T.idbtrans.abort(),
												ft(d)
											);
										}
									);
							}))),
						(this.Version =
							((B = this),
							pt(er.prototype, function (d) {
								(this.db = B),
									(this._cfg = {
										version: d,
										storesSource: null,
										dbschema: {},
										tables: {},
										contentUpgrade: null
									});
							}))),
						(this.WhereClause =
							((D = this),
							pt(jn.prototype, function (d, x, k) {
								if (
									((this.db = D),
									(this._ctx = { table: d, index: ':id' === x ? null : x, or: k }),
									(this._cmp = this._ascending = st),
									(this._descending = function (d, x) {
										return st(x, d);
									}),
									(this._max = function (d, x) {
										return 0 < st(d, x) ? d : x;
									}),
									(this._min = function (d, x) {
										return st(d, x) < 0 ? d : x;
									}),
									(this._IDBKeyRange = D._deps.IDBKeyRange),
									!this._IDBKeyRange)
								)
									throw new he.MissingAPI();
							}))),
						this.on('versionchange', function (d) {
							0 < d.newVersion
								? console.warn(
										"Another connection wants to upgrade database '".concat(
											k.name,
											"'. Closing db now to resume the upgrade."
										)
									)
								: console.warn(
										"Another connection wants to delete database '".concat(
											k.name,
											"'. Closing db now to resume the delete request."
										)
									),
								k.close({ disableAutoOpen: !1 });
						}),
						this.on('blocked', function (d) {
							!d.newVersion || d.newVersion < d.oldVersion
								? console.warn("Dexie.delete('".concat(k.name, "') was blocked"))
								: console.warn(
										"Upgrade '"
											.concat(k.name, "' blocked by other connection holding version ")
											.concat(d.oldVersion / 10)
									);
						}),
						(this._maxKey = Yt(x.IDBKeyRange)),
						(this._createTransaction = function (d, x, C, j) {
							return new k.Transaction(d, x, C, k._options.chromeTransactionDurability, j);
						}),
						(this._fireOnBlocked = function (d) {
							k.on('blocked').fire(d),
								Dt.filter(function (d) {
									return d.name === k.name && d !== k && !d._state.vcFired;
								}).map(function (x) {
									return x.on('versionchange').fire(d);
								});
						}),
						this.use(fr),
						this.use(dr),
						this.use(hr),
						this.use(sr),
						this.use(cr);
					var M = new Proxy(this, {
						get: function (d, x, C) {
							if ('_vip' === x) return !0;
							if ('table' === x)
								return function (d) {
									return Zn(k.table(d), M);
								};
							var j = Reflect.get(d, x, C);
							return j instanceof dn
								? Zn(j, M)
								: 'tables' === x
									? j.map(function (d) {
											return Zn(d, M);
										})
									: '_createTransaction' === x
										? function () {
												return Zn(j.apply(this, arguments), M);
											}
										: j;
						}
					});
					(this.vip = M),
						C.forEach(function (d) {
							return d(k);
						});
				}
				var yr,
					ue =
						'undefined' != typeof Symbol && 'observable' in Symbol
							? Symbol.observable
							: '@@observable',
					vr =
						((ir.prototype.subscribe = function (d, x, k) {
							return this._subscribe(
								d && 'function' != typeof d ? d : { next: d, error: x, complete: k }
							);
						}),
						(ir.prototype[ue] = function () {
							return this;
						}),
						ir);
				function ir(d) {
					this._subscribe = d;
				}
				try {
					yr = {
						indexedDB: d.indexedDB || d.mozIndexedDB || d.webkitIndexedDB || d.msIndexedDB,
						IDBKeyRange: d.IDBKeyRange || d.webkitIDBKeyRange
					};
				} catch (M) {
					yr = { indexedDB: null, IDBKeyRange: null };
				}
				function or(d) {
					var x,
						k = !1,
						C = new vr(function (C) {
							var j = ie(d);
							var T,
								K = !1,
								B = {},
								D = {},
								R = {
									get closed() {
										return K;
									},
									unsubscribe: function () {
										K || ((K = !0), T && T.abort(), M && Un.storagemutated.unsubscribe(f));
									}
								};
							C.start && C.start(R);
							var M = !1,
								l = function () {
									return Ge(t);
								};
							var f = function (d) {
									Kn(B, d), En(D, B) && l();
								},
								t = function () {
									var R, F, z;
									!K &&
										yr.indexedDB &&
										((B = {}),
										(R = {}),
										T && T.abort(),
										(T = new AbortController()),
										(z = (function (x) {
											var k = je();
											try {
												j && Le();
												var C = Ne(d, x);
												return (C = j ? C.finally(Ue) : C);
											} finally {
												k && Ae();
											}
										})((F = { subscr: R, signal: T.signal, requery: l, querier: d, trans: null }))),
										Promise.resolve(z).then(
											function (d) {
												(k = !0),
													(x = d),
													K ||
														F.signal.aborted ||
														((B = {}),
														(function (d) {
															for (var x in d) if (m(d, x)) return;
															return 1;
														})((D = R)) ||
															M ||
															(Un(Nn, f), (M = !0)),
														Ge(function () {
															return !K && C.next && C.next(d);
														}));
											},
											function (d) {
												(k = !1),
													['DatabaseClosedError', 'AbortError'].includes(
														null == d ? void 0 : d.name
													) ||
														K ||
														Ge(function () {
															K || (C.error && C.error(d));
														});
											}
										));
								};
							return setTimeout(l, 0), R;
						});
					return (
						(C.hasValue = function () {
							return k;
						}),
						(C.getValue = function () {
							return x;
						}),
						C
					);
				}
				var br = pr;
				function ur(d) {
					var x = gr;
					try {
						(gr = !0), Un.storagemutated.fire(d), Tn(d, !0);
					} finally {
						gr = x;
					}
				}
				r(
					br,
					_(_({}, pe), {
						delete: function (d) {
							return new br(d, { addons: [] }).delete();
						},
						exists: function (d) {
							return new br(d, { addons: [] })
								.open()
								.then(function (d) {
									return d.close(), !0;
								})
								.catch('NoSuchDatabaseError', function () {
									return !1;
								});
						},
						getDatabaseNames: function (d) {
							try {
								return (
									(x = br.dependencies),
									(k = x.indexedDB),
									(x = x.IDBKeyRange),
									(vn(k)
										? Promise.resolve(k.databases()).then(function (d) {
												return d
													.map(function (d) {
														return d.name;
													})
													.filter(function (d) {
														return d !== Mt;
													});
											})
										: yn(k, x).toCollection().primaryKeys()
									).then(d)
								);
							} catch (d) {
								return ft(new he.MissingAPI());
							}
							var x, k;
						},
						defineClass: function () {
							return function (d) {
								a(this, d);
							};
						},
						ignoreTransaction: function (d) {
							return Me.trans ? $e(Me.transless, d) : d();
						},
						vip: mn,
						async: function (d) {
							return function () {
								try {
									var x = In(d.apply(this, arguments));
									return x && 'function' == typeof x.then ? x : _e.resolve(x);
								} catch (x) {
									return ft(x);
								}
							};
						},
						spawn: function (d, x, k) {
							try {
								var C = In(d.apply(k, x || []));
								return C && 'function' == typeof C.then ? C : _e.resolve(C);
							} catch (d) {
								return ft(d);
							}
						},
						currentTransaction: {
							get: function () {
								return Me.trans || null;
							}
						},
						waitFor: function (d, x) {
							x = _e
								.resolve('function' == typeof d ? br.ignoreTransaction(d) : d)
								.timeout(x || 6e4);
							return Me.trans ? Me.trans.waitFor(x) : x;
						},
						Promise: _e,
						debug: {
							get: function () {
								return ye;
							},
							set: function (d) {
								oe(d);
							}
						},
						derive: o,
						extend: a,
						props: r,
						override: p,
						Events: dt,
						on: Un,
						liveQuery: or,
						extendObservabilitySet: Kn,
						getByKeyPath: O,
						setByKeyPath: P,
						delByKeyPath: function (d, x) {
							'string' == typeof x
								? P(d, x, void 0)
								: 'length' in x &&
									[].map.call(x, function (x) {
										P(d, x, void 0);
									});
						},
						shallowClone: g,
						deepClone: S,
						getObjectDiff: Fn,
						cmp: st,
						asap: v,
						minKey: -1 / 0,
						addons: [],
						connections: Dt,
						errnames: ce,
						dependencies: yr,
						cache: nr,
						semVer: '4.0.11',
						version: '4.0.11'
							.split('.')
							.map(function (d) {
								return parseInt(d);
							})
							.reduce(function (d, x, k) {
								return d + x / Math.pow(10, 2 * k);
							})
					})
				),
					(br.maxKey = Yt(br.dependencies.IDBKeyRange)),
					'undefined' != typeof dispatchEvent &&
						'undefined' != typeof addEventListener &&
						(Un(Nn, function (d) {
							gr ||
								((d = new CustomEvent(Rn, { detail: d })), (gr = !0), dispatchEvent(d), (gr = !1));
						}),
						addEventListener(Rn, function (d) {
							d = d.detail;
							gr || ur(d);
						}));
				var mr,
					gr = !1,
					lr = function () {};
				return (
					'undefined' != typeof BroadcastChannel &&
						((lr = function () {
							(mr = new BroadcastChannel(Rn)).onmessage = function (d) {
								return d.data && ur(d.data);
							};
						})(),
						'function' == typeof mr.unref && mr.unref(),
						Un(Nn, function (d) {
							gr || mr.postMessage(d);
						})),
					'undefined' != typeof addEventListener &&
						(addEventListener('pagehide', function (d) {
							if (!pr.disableBfCache && d.persisted) {
								ye && console.debug('Dexie: handling persisted pagehide'), null != mr && mr.close();
								for (var x = 0, k = Dt; x < k.length; x++) k[x].close({ disableAutoOpen: !1 });
							}
						}),
						addEventListener('pageshow', function (d) {
							!pr.disableBfCache &&
								d.persisted &&
								(ye && console.debug('Dexie: handling persisted pageshow'),
								lr(),
								ur({ all: new gn(-1 / 0, [[]]) }));
						})),
					(_e.rejectionMapper = function (d, x) {
						return !d ||
							d instanceof N ||
							d instanceof TypeError ||
							d instanceof SyntaxError ||
							!d.name ||
							!de[d.name]
							? d
							: ((x = new de[d.name](x || d.message, d)),
								'stack' in d &&
									l(x, 'stack', {
										get: function () {
											return this.inner.stack;
										}
									}),
								x);
					}),
					oe(ye),
					_(
						pr,
						Object.freeze({
							__proto__: null,
							Dexie: pr,
							liveQuery: or,
							Entity: ut,
							cmp: st,
							PropModification: An,
							replacePrefix: function (d, x) {
								return new An({ replacePrefix: [d, x] });
							},
							add: function (d) {
								return new An({ add: d });
							},
							remove: function (d) {
								return new An({ remove: d });
							},
							default: pr,
							RangeSet: gn,
							mergeRanges: _n,
							rangesOverlap: xn
						}),
						{ default: pr }
					),
					pr
				);
			});
		},
		8507: function (d) {
			(function webpackUniversalModuleDefinition(x, k) {
				if (true) d.exports = k();
				else {
				}
			})(this, function () {
				return (function (d) {
					var x = {};
					function __nested_webpack_require_563__(k) {
						if (x[k]) return x[k].exports;
						var C = (x[k] = { exports: {}, id: k, loaded: false });
						d[k].call(C.exports, C, C.exports, __nested_webpack_require_563__);
						C.loaded = true;
						return C.exports;
					}
					__nested_webpack_require_563__.m = d;
					__nested_webpack_require_563__.c = x;
					__nested_webpack_require_563__.p = '';
					return __nested_webpack_require_563__(0);
				})([
					function (d, x, k) {
						const C = k(1);
						const j = k(2);
						const T = new Array(4);
						function seedrand(d) {
							for (let d = 0; d < T.length; d++) {
								T[d] = 0;
							}
							for (let x = 0; x < d.length; x++) {
								T[x % 4] = (T[x % 4] << 5) - T[x % 4] + d.charCodeAt(x);
							}
						}
						function rand() {
							const d = T[0] ^ (T[0] << 11);
							T[0] = T[1];
							T[1] = T[2];
							T[2] = T[3];
							T[3] = T[3] ^ (T[3] >> 19) ^ d ^ (d >> 8);
							return (T[3] >>> 0) / ((1 << 31) >>> 0);
						}
						function createColor() {
							const d = Math.floor(rand() * 360);
							const x = rand() * 60 + 40;
							const k = (rand() + rand() + rand() + rand()) * 25;
							return [d / 360, x / 100, k / 100];
						}
						function createImageData(d) {
							const x = d;
							const k = d;
							const C = Math.ceil(x / 2);
							const j = x - C;
							const T = [];
							for (let d = 0; d < k; d++) {
								let d = [];
								for (let x = 0; x < C; x++) {
									d[x] = Math.floor(rand() * 2.3);
								}
								const x = d.slice(0, j).reverse();
								d = d.concat(x);
								for (let x = 0; x < d.length; x++) {
									T.push(d[x]);
								}
							}
							return T;
						}
						function fillRect(d, x, k, C, j, T) {
							for (let K = 0; K < C; K++) {
								for (let C = 0; C < j; C++) {
									d.buffer[d.index(x + K, k + C)] = T;
								}
							}
						}
						function buildOpts(d) {
							if (!d.seed) {
								throw new Error('No seed provided');
							}
							seedrand(d.seed);
							return Object.assign(
								{
									size: 8,
									scale: 16,
									color: createColor(),
									bgcolor: createColor(),
									spotcolor: createColor()
								},
								d
							);
						}
						function makeBlockie(d) {
							const x = buildOpts({ seed: d.toLowerCase() });
							const k = createImageData(x.size);
							const T = Math.sqrt(k.length);
							const K = new C(x.size * x.scale, x.size * x.scale, 3);
							const B = K.color(...j(...x.bgcolor));
							const D = K.color(...j(...x.color));
							const R = K.color(...j(...x.spotcolor));
							for (let d = 0; d < k.length; d++) {
								const C = Math.floor(d / T);
								const j = d % T;
								if (k[d]) {
									const T = k[d] == 1 ? D : R;
									fillRect(K, j * x.scale, C * x.scale, x.scale, x.scale, T);
								}
							}
							return `data:image/png;base64,${K.getBase64()}`;
						}
						d.exports = makeBlockie;
					},
					function (d, x) {
						d.exports = function (d, x, k) {
							function write(d, x) {
								for (var k = 2; k < arguments.length; k++) {
									for (var C = 0; C < arguments[k].length; C++) {
										d[x++] = arguments[k].charAt(C);
									}
								}
							}
							function byte2(d) {
								return String.fromCharCode((d >> 8) & 255, d & 255);
							}
							function byte4(d) {
								return String.fromCharCode(
									(d >> 24) & 255,
									(d >> 16) & 255,
									(d >> 8) & 255,
									d & 255
								);
							}
							function byte2lsb(d) {
								return String.fromCharCode(d & 255, (d >> 8) & 255);
							}
							this.width = d;
							this.height = x;
							this.depth = k;
							this.pix_size = x * (d + 1);
							this.data_size =
								2 + this.pix_size + 5 * Math.floor((65534 + this.pix_size) / 65535) + 4;
							this.ihdr_offs = 0;
							this.ihdr_size = 4 + 4 + 13 + 4;
							this.plte_offs = this.ihdr_offs + this.ihdr_size;
							this.plte_size = 4 + 4 + 3 * k + 4;
							this.trns_offs = this.plte_offs + this.plte_size;
							this.trns_size = 4 + 4 + k + 4;
							this.idat_offs = this.trns_offs + this.trns_size;
							this.idat_size = 4 + 4 + this.data_size + 4;
							this.iend_offs = this.idat_offs + this.idat_size;
							this.iend_size = 4 + 4 + 4;
							this.buffer_size = this.iend_offs + this.iend_size;
							this.buffer = new Array();
							this.palette = new Object();
							this.pindex = 0;
							var C = new Array();
							for (var j = 0; j < this.buffer_size; j++) {
								this.buffer[j] = '\0';
							}
							write(
								this.buffer,
								this.ihdr_offs,
								byte4(this.ihdr_size - 12),
								'IHDR',
								byte4(d),
								byte4(x),
								'\b'
							);
							write(this.buffer, this.plte_offs, byte4(this.plte_size - 12), 'PLTE');
							write(this.buffer, this.trns_offs, byte4(this.trns_size - 12), 'tRNS');
							write(this.buffer, this.idat_offs, byte4(this.idat_size - 12), 'IDAT');
							write(this.buffer, this.iend_offs, byte4(this.iend_size - 12), 'IEND');
							var T = ((8 + (7 << 4)) << 8) | (3 << 6);
							T += 31 - (T % 31);
							write(this.buffer, this.idat_offs + 8, byte2(T));
							for (var j = 0; (j << 16) - 1 < this.pix_size; j++) {
								var K, B;
								if (j + 65535 < this.pix_size) {
									K = 65535;
									B = '\0';
								} else {
									K = this.pix_size - (j << 16) - j;
									B = '';
								}
								write(
									this.buffer,
									this.idat_offs + 8 + 2 + (j << 16) + (j << 2),
									B,
									byte2lsb(K),
									byte2lsb(~K)
								);
							}
							for (var j = 0; j < 256; j++) {
								var D = j;
								for (var R = 0; R < 8; R++) {
									if (D & 1) {
										D = -306674912 ^ ((D >> 1) & 2147483647);
									} else {
										D = (D >> 1) & 2147483647;
									}
								}
								C[j] = D;
							}
							this.index = function (d, x) {
								var k = x * (this.width + 1) + d + 1;
								var C = this.idat_offs + 8 + 2 + 5 * Math.floor(k / 65535 + 1) + k;
								return C;
							};
							this.color = function (d, x, k, C) {
								C = C >= 0 ? C : 255;
								var j = (((((C << 8) | d) << 8) | x) << 8) | k;
								if (typeof this.palette[j] == 'undefined') {
									if (this.pindex == this.depth) return '\0';
									var T = this.plte_offs + 8 + 3 * this.pindex;
									this.buffer[T + 0] = String.fromCharCode(d);
									this.buffer[T + 1] = String.fromCharCode(x);
									this.buffer[T + 2] = String.fromCharCode(k);
									this.buffer[this.trns_offs + 8 + this.pindex] = String.fromCharCode(C);
									this.palette[j] = String.fromCharCode(this.pindex++);
								}
								return this.palette[j];
							};
							this.getBase64 = function () {
								var d = this.getDump();
								var x = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
								var k, C, j, T, K, B, D;
								var R = d.length;
								var M = 0;
								var F = '';
								do {
									k = d.charCodeAt(M);
									T = k >> 2;
									C = d.charCodeAt(M + 1);
									K = ((k & 3) << 4) | (C >> 4);
									j = d.charCodeAt(M + 2);
									if (R < M + 2) {
										B = 64;
									} else {
										B = ((C & 15) << 2) | (j >> 6);
									}
									if (R < M + 3) {
										D = 64;
									} else {
										D = j & 63;
									}
									F += x.charAt(T) + x.charAt(K) + x.charAt(B) + x.charAt(D);
								} while ((M += 3) < R);
								return F;
							};
							this.getDump = function () {
								var d = 65521;
								var x = 5552;
								var k = 1;
								var j = 0;
								var T = x;
								for (var K = 0; K < this.height; K++) {
									for (var B = -1; B < this.width; B++) {
										k += this.buffer[this.index(B, K)].charCodeAt(0);
										j += k;
										if ((T -= 1) == 0) {
											k %= d;
											j %= d;
											T = x;
										}
									}
								}
								k %= d;
								j %= d;
								write(this.buffer, this.idat_offs + this.idat_size - 8, byte4((j << 16) | k));
								function crc32(d, x, k) {
									var j = -1;
									for (var T = 4; T < k - 4; T += 1) {
										j = C[(j ^ d[x + T].charCodeAt(0)) & 255] ^ ((j >> 8) & 16777215);
									}
									write(d, x + k - 4, byte4(j ^ -1));
								}
								crc32(this.buffer, this.ihdr_offs, this.ihdr_size);
								crc32(this.buffer, this.plte_offs, this.plte_size);
								crc32(this.buffer, this.trns_offs, this.trns_size);
								crc32(this.buffer, this.idat_offs, this.idat_size);
								crc32(this.buffer, this.iend_offs, this.iend_size);
								return 'PNG\r\n\n' + this.buffer.join('');
							};
						};
					},
					function (d, x) {
						function hue2rgb(d, x, k) {
							if (k < 0) k += 1;
							if (k > 1) k -= 1;
							if (k < 1 / 6) return d + (x - d) * 6 * k;
							if (k < 1 / 2) return x;
							if (k < 2 / 3) return d + (x - d) * (2 / 3 - k) * 6;
							return d;
						}
						function hsl2rgb(d, x, k) {
							let C, j, T;
							if (x == 0) {
								C = j = T = k;
							} else {
								const K = k < 0.5 ? k * (1 + x) : k + x - k * x;
								const B = 2 * k - K;
								C = hue2rgb(B, K, d + 1 / 3);
								j = hue2rgb(B, K, d);
								T = hue2rgb(B, K, d - 1 / 3);
							}
							return [Math.round(C * 255), Math.round(j * 255), Math.round(T * 255), 255];
						}
						d.exports = hsl2rgb;
					}
				]);
			});
		},
		6704: (d, x, k) => {
			'use strict';
			var C = k(6608).Buffer;
			var j =
				C.isEncoding ||
				function (d) {
					d = '' + d;
					switch (d && d.toLowerCase()) {
						case 'hex':
						case 'utf8':
						case 'utf-8':
						case 'ascii':
						case 'binary':
						case 'base64':
						case 'ucs2':
						case 'ucs-2':
						case 'utf16le':
						case 'utf-16le':
						case 'raw':
							return true;
						default:
							return false;
					}
				};
			function _normalizeEncoding(d) {
				if (!d) return 'utf8';
				var x;
				while (true) {
					switch (d) {
						case 'utf8':
						case 'utf-8':
							return 'utf8';
						case 'ucs2':
						case 'ucs-2':
						case 'utf16le':
						case 'utf-16le':
							return 'utf16le';
						case 'latin1':
						case 'binary':
							return 'latin1';
						case 'base64':
						case 'ascii':
						case 'hex':
							return d;
						default:
							if (x) return;
							d = ('' + d).toLowerCase();
							x = true;
					}
				}
			}
			function normalizeEncoding(d) {
				var x = _normalizeEncoding(d);
				if (typeof x !== 'string' && (C.isEncoding === j || !j(d)))
					throw new Error('Unknown encoding: ' + d);
				return x || d;
			}
			x.StringDecoder = StringDecoder;
			function StringDecoder(d) {
				this.encoding = normalizeEncoding(d);
				var x;
				switch (this.encoding) {
					case 'utf16le':
						this.text = utf16Text;
						this.end = utf16End;
						x = 4;
						break;
					case 'utf8':
						this.fillLast = utf8FillLast;
						x = 4;
						break;
					case 'base64':
						this.text = base64Text;
						this.end = base64End;
						x = 3;
						break;
					default:
						this.write = simpleWrite;
						this.end = simpleEnd;
						return;
				}
				this.lastNeed = 0;
				this.lastTotal = 0;
				this.lastChar = C.allocUnsafe(x);
			}
			StringDecoder.prototype.write = function (d) {
				if (d.length === 0) return '';
				var x;
				var k;
				if (this.lastNeed) {
					x = this.fillLast(d);
					if (x === undefined) return '';
					k = this.lastNeed;
					this.lastNeed = 0;
				} else {
					k = 0;
				}
				if (k < d.length) return x ? x + this.text(d, k) : this.text(d, k);
				return x || '';
			};
			StringDecoder.prototype.end = utf8End;
			StringDecoder.prototype.text = utf8Text;
			StringDecoder.prototype.fillLast = function (d) {
				if (this.lastNeed <= d.length) {
					d.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
					return this.lastChar.toString(this.encoding, 0, this.lastTotal);
				}
				d.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, d.length);
				this.lastNeed -= d.length;
			};
			function utf8CheckByte(d) {
				if (d <= 127) return 0;
				else if (d >> 5 === 6) return 2;
				else if (d >> 4 === 14) return 3;
				else if (d >> 3 === 30) return 4;
				return d >> 6 === 2 ? -1 : -2;
			}
			function utf8CheckIncomplete(d, x, k) {
				var C = x.length - 1;
				if (C < k) return 0;
				var j = utf8CheckByte(x[C]);
				if (j >= 0) {
					if (j > 0) d.lastNeed = j - 1;
					return j;
				}
				if (--C < k || j === -2) return 0;
				j = utf8CheckByte(x[C]);
				if (j >= 0) {
					if (j > 0) d.lastNeed = j - 2;
					return j;
				}
				if (--C < k || j === -2) return 0;
				j = utf8CheckByte(x[C]);
				if (j >= 0) {
					if (j > 0) {
						if (j === 2) j = 0;
						else d.lastNeed = j - 3;
					}
					return j;
				}
				return 0;
			}
			function utf8CheckExtraBytes(d, x, k) {
				if ((x[0] & 192) !== 128) {
					d.lastNeed = 0;
					return '�';
				}
				if (d.lastNeed > 1 && x.length > 1) {
					if ((x[1] & 192) !== 128) {
						d.lastNeed = 1;
						return '�';
					}
					if (d.lastNeed > 2 && x.length > 2) {
						if ((x[2] & 192) !== 128) {
							d.lastNeed = 2;
							return '�';
						}
					}
				}
			}
			function utf8FillLast(d) {
				var x = this.lastTotal - this.lastNeed;
				var k = utf8CheckExtraBytes(this, d, x);
				if (k !== undefined) return k;
				if (this.lastNeed <= d.length) {
					d.copy(this.lastChar, x, 0, this.lastNeed);
					return this.lastChar.toString(this.encoding, 0, this.lastTotal);
				}
				d.copy(this.lastChar, x, 0, d.length);
				this.lastNeed -= d.length;
			}
			function utf8Text(d, x) {
				var k = utf8CheckIncomplete(this, d, x);
				if (!this.lastNeed) return d.toString('utf8', x);
				this.lastTotal = k;
				var C = d.length - (k - this.lastNeed);
				d.copy(this.lastChar, 0, C);
				return d.toString('utf8', x, C);
			}
			function utf8End(d) {
				var x = d && d.length ? this.write(d) : '';
				if (this.lastNeed) return x + '�';
				return x;
			}
			function utf16Text(d, x) {
				if ((d.length - x) % 2 === 0) {
					var k = d.toString('utf16le', x);
					if (k) {
						var C = k.charCodeAt(k.length - 1);
						if (C >= 55296 && C <= 56319) {
							this.lastNeed = 2;
							this.lastTotal = 4;
							this.lastChar[0] = d[d.length - 2];
							this.lastChar[1] = d[d.length - 1];
							return k.slice(0, -1);
						}
					}
					return k;
				}
				this.lastNeed = 1;
				this.lastTotal = 2;
				this.lastChar[0] = d[d.length - 1];
				return d.toString('utf16le', x, d.length - 1);
			}
			function utf16End(d) {
				var x = d && d.length ? this.write(d) : '';
				if (this.lastNeed) {
					var k = this.lastTotal - this.lastNeed;
					return x + this.lastChar.toString('utf16le', 0, k);
				}
				return x;
			}
			function base64Text(d, x) {
				var k = (d.length - x) % 3;
				if (k === 0) return d.toString('base64', x);
				this.lastNeed = 3 - k;
				this.lastTotal = 3;
				if (k === 1) {
					this.lastChar[0] = d[d.length - 1];
				} else {
					this.lastChar[0] = d[d.length - 2];
					this.lastChar[1] = d[d.length - 1];
				}
				return d.toString('base64', x, d.length - k);
			}
			function base64End(d) {
				var x = d && d.length ? this.write(d) : '';
				if (this.lastNeed) return x + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
				return x;
			}
			function simpleWrite(d) {
				return d.toString(this.encoding);
			}
			function simpleEnd(d) {
				return d && d.length ? this.write(d) : '';
			}
		},
		1091: (d, x, k) => {
			'use strict';
			k.d(x, { Ay: () => Q });
			var C = k(504);
			const j = Symbol.for('Dexie');
			const T = globalThis[j] || (globalThis[j] = C);
			if (C.semVer !== T.semVer) {
				throw new Error(
					`Two different versions of Dexie loaded in the same app: ${C.semVer} and ${T.semVer}`
				);
			}
			const {
				liveQuery: K,
				mergeRanges: B,
				rangesOverlap: D,
				RangeSet: R,
				cmp: M,
				Entity: F,
				PropModification: z,
				replacePrefix: W,
				add: $,
				remove: Y
			} = T;
			const Q = T;
		},
		1969: (d, x, k) => {
			'use strict';
			k.d(x, { A: () => Hi });
			var C = k(4261);
			function stackClear() {
				this.__data__ = new C.A();
				this.size = 0;
			}
			const j = stackClear;
			function stackDelete(d) {
				var x = this.__data__,
					k = x['delete'](d);
				this.size = x.size;
				return k;
			}
			const T = stackDelete;
			function stackGet(d) {
				return this.__data__.get(d);
			}
			const K = stackGet;
			function stackHas(d) {
				return this.__data__.has(d);
			}
			const B = stackHas;
			var D = k(2615);
			var R = k(4794);
			var M = 200;
			function stackSet(d, x) {
				var k = this.__data__;
				if (k instanceof C.A) {
					var j = k.__data__;
					if (!D.A || j.length < M - 1) {
						j.push([d, x]);
						this.size = ++k.size;
						return this;
					}
					k = this.__data__ = new R.A(j);
				}
				k.set(d, x);
				this.size = k.size;
				return this;
			}
			const F = stackSet;
			function Stack(d) {
				var x = (this.__data__ = new C.A(d));
				this.size = x.size;
			}
			Stack.prototype.clear = j;
			Stack.prototype['delete'] = T;
			Stack.prototype.get = K;
			Stack.prototype.has = B;
			Stack.prototype.set = F;
			const z = Stack;
			var W = '__lodash_hash_undefined__';
			function setCacheAdd(d) {
				this.__data__.set(d, W);
				return this;
			}
			const $ = setCacheAdd;
			function setCacheHas(d) {
				return this.__data__.has(d);
			}
			const Y = setCacheHas;
			function SetCache(d) {
				var x = -1,
					k = d == null ? 0 : d.length;
				this.__data__ = new R.A();
				while (++x < k) {
					this.add(d[x]);
				}
			}
			SetCache.prototype.add = SetCache.prototype.push = $;
			SetCache.prototype.has = Y;
			const Q = SetCache;
			function arraySome(d, x) {
				var k = -1,
					C = d == null ? 0 : d.length;
				while (++k < C) {
					if (x(d[k], k, d)) {
						return true;
					}
				}
				return false;
			}
			const ie = arraySome;
			function cacheHas(d, x) {
				return d.has(x);
			}
			const ae = cacheHas;
			var ue = 1,
				se = 2;
			function equalArrays(d, x, k, C, j, T) {
				var K = k & ue,
					B = d.length,
					D = x.length;
				if (B != D && !(K && D > B)) {
					return false;
				}
				var R = T.get(d);
				var M = T.get(x);
				if (R && M) {
					return R == x && M == d;
				}
				var F = -1,
					z = true,
					W = k & se ? new Q() : undefined;
				T.set(d, x);
				T.set(x, d);
				while (++F < B) {
					var $ = d[F],
						Y = x[F];
					if (C) {
						var ce = K ? C(Y, $, F, x, d, T) : C($, Y, F, d, x, T);
					}
					if (ce !== undefined) {
						if (ce) {
							continue;
						}
						z = false;
						break;
					}
					if (W) {
						if (
							!ie(x, function (d, x) {
								if (!ae(W, x) && ($ === d || j($, d, k, C, T))) {
									return W.push(x);
								}
							})
						) {
							z = false;
							break;
						}
					} else if (!($ === Y || j($, Y, k, C, T))) {
						z = false;
						break;
					}
				}
				T['delete'](d);
				T['delete'](x);
				return z;
			}
			const ce = equalArrays;
			var fe = k(4633);
			var he = k(3077);
			var de = he.A.Uint8Array;
			const pe = de;
			var ye = k(4336);
			function mapToArray(d) {
				var x = -1,
					k = Array(d.size);
				d.forEach(function (d, C) {
					k[++x] = [C, d];
				});
				return k;
			}
			const ve = mapToArray;
			function setToArray(d) {
				var x = -1,
					k = Array(d.size);
				d.forEach(function (d) {
					k[++x] = d;
				});
				return k;
			}
			const be = setToArray;
			var me = 1,
				ge = 2;
			var we = '[object Boolean]',
				xe = '[object Date]',
				Ie = '[object Error]',
				Be = '[object Map]',
				De = '[object Number]',
				Re = '[object RegExp]',
				Me = '[object Set]',
				Fe = '[object String]',
				Xe = '[object Symbol]';
			var He = '[object ArrayBuffer]',
				Je = '[object DataView]';
			var Ze = fe.A ? fe.A.prototype : undefined,
				et = Ze ? Ze.valueOf : undefined;
			function equalByTag(d, x, k, C, j, T, K) {
				switch (k) {
					case Je:
						if (d.byteLength != x.byteLength || d.byteOffset != x.byteOffset) {
							return false;
						}
						d = d.buffer;
						x = x.buffer;
					case He:
						if (d.byteLength != x.byteLength || !T(new pe(d), new pe(x))) {
							return false;
						}
						return true;
					case we:
					case xe:
					case De:
						return (0, ye.A)(+d, +x);
					case Ie:
						return d.name == x.name && d.message == x.message;
					case Re:
					case Fe:
						return d == x + '';
					case Be:
						var B = ve;
					case Me:
						var D = C & me;
						B || (B = be);
						if (d.size != x.size && !D) {
							return false;
						}
						var R = K.get(d);
						if (R) {
							return R == x;
						}
						C |= ge;
						K.set(d, x);
						var M = ce(B(d), B(x), C, j, T, K);
						K['delete'](d);
						return M;
					case Xe:
						if (et) {
							return et.call(d) == et.call(x);
						}
				}
				return false;
			}
			const tt = equalByTag;
			function arrayPush(d, x) {
				var k = -1,
					C = x.length,
					j = d.length;
				while (++k < C) {
					d[j + k] = x[k];
				}
				return d;
			}
			const nt = arrayPush;
			var rt = Array.isArray;
			const ot = rt;
			function baseGetAllKeys(d, x, k) {
				var C = x(d);
				return ot(d) ? C : nt(C, k(d));
			}
			const ft = baseGetAllKeys;
			function arrayFilter(d, x) {
				var k = -1,
					C = d == null ? 0 : d.length,
					j = 0,
					T = [];
				while (++k < C) {
					var K = d[k];
					if (x(K, k, d)) {
						T[j++] = K;
					}
				}
				return T;
			}
			const xt = arrayFilter;
			function stubArray() {
				return [];
			}
			const Ot = stubArray;
			var Nt = Object.prototype;
			var Dt = Nt.propertyIsEnumerable;
			var Mt = Object.getOwnPropertySymbols;
			var Ft = !Mt
				? Ot
				: function (d) {
						if (d == null) {
							return [];
						}
						d = Object(d);
						return xt(Mt(d), function (x) {
							return Dt.call(d, x);
						});
					};
			const Lt = Ft;
			function baseTimes(d, x) {
				var k = -1,
					C = Array(d);
				while (++k < d) {
					C[k] = x(k);
				}
				return C;
			}
			const Gt = baseTimes;
			var dn = k(4855);
			function isObjectLike(d) {
				return d != null && typeof d == 'object';
			}
			const An = isObjectLike;
			var Sn = '[object Arguments]';
			function baseIsArguments(d) {
				return An(d) && (0, dn.A)(d) == Sn;
			}
			const jn = baseIsArguments;
			var Nn = Object.prototype;
			var Rn = Nn.hasOwnProperty;
			var Un = Nn.propertyIsEnumerable;
			var Wn = jn(
				(function () {
					return arguments;
				})()
			)
				? jn
				: function (d) {
						return An(d) && Rn.call(d, 'callee') && !Un.call(d, 'callee');
					};
			const Jn = Wn;
			function stubFalse() {
				return false;
			}
			const er = stubFalse;
			var nr = typeof exports == 'object' && exports && !exports.nodeType && exports;
			var rr = nr && typeof module == 'object' && module && !module.nodeType && module;
			var ar = rr && rr.exports === nr;
			var sr = ar ? he.A.Buffer : undefined;
			var cr = sr ? sr.isBuffer : undefined;
			var fr = cr || er;
			const hr = fr;
			var dr = 9007199254740991;
			var pr = /^(?:0|[1-9]\d*)$/;
			function isIndex(d, x) {
				var k = typeof d;
				x = x == null ? dr : x;
				return (
					!!x && (k == 'number' || (k != 'symbol' && pr.test(d))) && d > -1 && d % 1 == 0 && d < x
				);
			}
			const yr = isIndex;
			var vr = 9007199254740991;
			function isLength(d) {
				return typeof d == 'number' && d > -1 && d % 1 == 0 && d <= vr;
			}
			const br = isLength;
			var mr = '[object Arguments]',
				gr = '[object Array]',
				_r = '[object Boolean]',
				wr = '[object Date]',
				xr = '[object Error]',
				kr = '[object Function]',
				Ar = '[object Map]',
				Sr = '[object Number]',
				Or = '[object Object]',
				Pr = '[object RegExp]',
				Er = '[object Set]',
				Cr = '[object String]',
				jr = '[object WeakMap]';
			var Tr = '[object ArrayBuffer]',
				Ir = '[object DataView]',
				Kr = '[object Float32Array]',
				qr = '[object Float64Array]',
				Br = '[object Int8Array]',
				Nr = '[object Int16Array]',
				Dr = '[object Int32Array]',
				Rr = '[object Uint8Array]',
				Mr = '[object Uint8ClampedArray]',
				Fr = '[object Uint16Array]',
				zr = '[object Uint32Array]';
			var Lr = {};
			Lr[Kr] = Lr[qr] = Lr[Br] = Lr[Nr] = Lr[Dr] = Lr[Rr] = Lr[Mr] = Lr[Fr] = Lr[zr] = true;
			Lr[mr] =
				Lr[gr] =
				Lr[Tr] =
				Lr[_r] =
				Lr[Ir] =
				Lr[wr] =
				Lr[xr] =
				Lr[kr] =
				Lr[Ar] =
				Lr[Sr] =
				Lr[Or] =
				Lr[Pr] =
				Lr[Er] =
				Lr[Cr] =
				Lr[jr] =
					false;
			function baseIsTypedArray(d) {
				return An(d) && br(d.length) && !!Lr[(0, dn.A)(d)];
			}
			const Ur = baseIsTypedArray;
			function baseUnary(d) {
				return function (x) {
					return d(x);
				};
			}
			const Wr = baseUnary;
			var Vr = k(2752);
			var Gr = typeof exports == 'object' && exports && !exports.nodeType && exports;
			var $r = Gr && typeof module == 'object' && module && !module.nodeType && module;
			var Xr = $r && $r.exports === Gr;
			var Yr = Xr && Vr.A.process;
			var Qr = (function () {
				try {
					var d = $r && $r.require && $r.require('util').types;
					if (d) {
						return d;
					}
					return Yr && Yr.binding && Yr.binding('util');
				} catch (d) {}
			})();
			const Hr = Qr;
			var Jr = Hr && Hr.isTypedArray;
			var Zr = Jr ? Wr(Jr) : Ur;
			const ei = Zr;
			var ti = Object.prototype;
			var ni = ti.hasOwnProperty;
			function arrayLikeKeys(d, x) {
				var k = ot(d),
					C = !k && Jn(d),
					j = !k && !C && hr(d),
					T = !k && !C && !j && ei(d),
					K = k || C || j || T,
					B = K ? Gt(d.length, String) : [],
					D = B.length;
				for (var R in d) {
					if (
						(x || ni.call(d, R)) &&
						!(
							K &&
							(R == 'length' ||
								(j && (R == 'offset' || R == 'parent')) ||
								(T && (R == 'buffer' || R == 'byteLength' || R == 'byteOffset')) ||
								yr(R, D))
						)
					) {
						B.push(R);
					}
				}
				return B;
			}
			const ri = arrayLikeKeys;
			var ii = Object.prototype;
			function isPrototype(d) {
				var x = d && d.constructor,
					k = (typeof x == 'function' && x.prototype) || ii;
				return d === k;
			}
			const oi = isPrototype;
			function overArg(d, x) {
				return function (k) {
					return d(x(k));
				};
			}
			const ai = overArg;
			var ui = ai(Object.keys, Object);
			const si = ui;
			var ci = Object.prototype;
			var li = ci.hasOwnProperty;
			function baseKeys(d) {
				if (!oi(d)) {
					return si(d);
				}
				var x = [];
				for (var k in Object(d)) {
					if (li.call(d, k) && k != 'constructor') {
						x.push(k);
					}
				}
				return x;
			}
			const fi = baseKeys;
			var hi = k(6770);
			function isArrayLike(d) {
				return d != null && br(d.length) && !(0, hi.A)(d);
			}
			const di = isArrayLike;
			function keys(d) {
				return di(d) ? ri(d) : fi(d);
			}
			const pi = keys;
			function getAllKeys(d) {
				return ft(d, pi, Lt);
			}
			const yi = getAllKeys;
			var vi = 1;
			var bi = Object.prototype;
			var mi = bi.hasOwnProperty;
			function equalObjects(d, x, k, C, j, T) {
				var K = k & vi,
					B = yi(d),
					D = B.length,
					R = yi(x),
					M = R.length;
				if (D != M && !K) {
					return false;
				}
				var F = D;
				while (F--) {
					var z = B[F];
					if (!(K ? z in x : mi.call(x, z))) {
						return false;
					}
				}
				var W = T.get(d);
				var $ = T.get(x);
				if (W && $) {
					return W == x && $ == d;
				}
				var Y = true;
				T.set(d, x);
				T.set(x, d);
				var Q = K;
				while (++F < D) {
					z = B[F];
					var ie = d[z],
						ae = x[z];
					if (C) {
						var ue = K ? C(ae, ie, z, x, d, T) : C(ie, ae, z, d, x, T);
					}
					if (!(ue === undefined ? ie === ae || j(ie, ae, k, C, T) : ue)) {
						Y = false;
						break;
					}
					Q || (Q = z == 'constructor');
				}
				if (Y && !Q) {
					var se = d.constructor,
						ce = x.constructor;
					if (
						se != ce &&
						'constructor' in d &&
						'constructor' in x &&
						!(
							typeof se == 'function' &&
							se instanceof se &&
							typeof ce == 'function' &&
							ce instanceof ce
						)
					) {
						Y = false;
					}
				}
				T['delete'](d);
				T['delete'](x);
				return Y;
			}
			const gi = equalObjects;
			var _i = k(9130);
			var wi = (0, _i.A)(he.A, 'DataView');
			const xi = wi;
			var ki = (0, _i.A)(he.A, 'Promise');
			const Ai = ki;
			var Si = (0, _i.A)(he.A, 'Set');
			const Oi = Si;
			var Pi = (0, _i.A)(he.A, 'WeakMap');
			const Ei = Pi;
			var Ci = k(1465);
			var ji = '[object Map]',
				Ti = '[object Object]',
				Ii = '[object Promise]',
				Ki = '[object Set]',
				qi = '[object WeakMap]';
			var Bi = '[object DataView]';
			var Ni = (0, Ci.A)(xi),
				Di = (0, Ci.A)(D.A),
				Ri = (0, Ci.A)(Ai),
				Mi = (0, Ci.A)(Oi),
				Fi = (0, Ci.A)(Ei);
			var zi = dn.A;
			if (
				(xi && zi(new xi(new ArrayBuffer(1))) != Bi) ||
				(D.A && zi(new D.A()) != ji) ||
				(Ai && zi(Ai.resolve()) != Ii) ||
				(Oi && zi(new Oi()) != Ki) ||
				(Ei && zi(new Ei()) != qi)
			) {
				zi = function (d) {
					var x = (0, dn.A)(d),
						k = x == Ti ? d.constructor : undefined,
						C = k ? (0, Ci.A)(k) : '';
					if (C) {
						switch (C) {
							case Ni:
								return Bi;
							case Di:
								return ji;
							case Ri:
								return Ii;
							case Mi:
								return Ki;
							case Fi:
								return qi;
						}
					}
					return x;
				};
			}
			const Li = zi;
			var Ui = 1;
			var Wi = '[object Arguments]',
				Vi = '[object Array]',
				Gi = '[object Object]';
			var $i = Object.prototype;
			var Xi = $i.hasOwnProperty;
			function baseIsEqualDeep(d, x, k, C, j, T) {
				var K = ot(d),
					B = ot(x),
					D = K ? Vi : Li(d),
					R = B ? Vi : Li(x);
				D = D == Wi ? Gi : D;
				R = R == Wi ? Gi : R;
				var M = D == Gi,
					F = R == Gi,
					W = D == R;
				if (W && hr(d)) {
					if (!hr(x)) {
						return false;
					}
					K = true;
					M = false;
				}
				if (W && !M) {
					T || (T = new z());
					return K || ei(d) ? ce(d, x, k, C, j, T) : tt(d, x, D, k, C, j, T);
				}
				if (!(k & Ui)) {
					var $ = M && Xi.call(d, '__wrapped__'),
						Y = F && Xi.call(x, '__wrapped__');
					if ($ || Y) {
						var Q = $ ? d.value() : d,
							ie = Y ? x.value() : x;
						T || (T = new z());
						return j(Q, ie, k, C, T);
					}
				}
				if (!W) {
					return false;
				}
				T || (T = new z());
				return gi(d, x, k, C, j, T);
			}
			const Yi = baseIsEqualDeep;
			function baseIsEqual(d, x, k, C, j) {
				if (d === x) {
					return true;
				}
				if (d == null || x == null || (!An(d) && !An(x))) {
					return d !== d && x !== x;
				}
				return Yi(d, x, k, C, baseIsEqual, j);
			}
			const Qi = baseIsEqual;
			function isEqual(d, x) {
				return Qi(d, x);
			}
			const Hi = isEqual;
		},
		4155: (d, x, k) => {
			'use strict';
			k.d(x, { Jt: () => j.Jt, T5: () => j.T5 });
			var C = k(2522);
			var j = k(3757);
			var T = k(6681);
			function toStore(d, x) {
				let k = d();
				const C = writable(k, (x) => {
					let C = k !== d();
					const j = effect_root(() => {
						render_effect(() => {
							const k = d();
							if (C) x(k);
						});
					});
					C = true;
					return j;
				});
				if (x) {
					return { set: x, update: (k) => x(k(d())), subscribe: C.subscribe };
				}
				return { subscribe: C.subscribe };
			}
			function fromStore(d) {
				let x = undefined;
				const k = createSubscriber((k) => {
					let C = false;
					const j = d.subscribe((d) => {
						x = d;
						if (C) k();
					});
					C = true;
					return j;
				});
				function current() {
					if (effect_tracking()) {
						k();
						return x;
					}
					return get(d);
				}
				if ('set' in d) {
					return {
						get current() {
							return current();
						},
						set current(x) {
							d.set(x);
						}
					};
				}
				return {
					get current() {
						return current();
					}
				};
			}
		},
		3757: (d, x, k) => {
			'use strict';
			k.d(x, { Jt: () => get, T5: () => writable });
			var C = k(5372);
			var j = k(2190);
			var T = k(3370);
			const K = [];
			function readable(d, x) {
				return { subscribe: writable(d, x).subscribe };
			}
			function writable(d, x = C.lQ) {
				let k = null;
				const T = new Set();
				function set(x) {
					if ((0, j.jX)(d, x)) {
						d = x;
						if (k) {
							const x = !K.length;
							for (const x of T) {
								x[1]();
								K.push(x, d);
							}
							if (x) {
								for (let d = 0; d < K.length; d += 2) {
									K[d][0](K[d + 1]);
								}
								K.length = 0;
							}
						}
					}
				}
				function update(x) {
					set(x(d));
				}
				function subscribe(j, K = C.lQ) {
					const B = [j, K];
					T.add(B);
					if (T.size === 1) {
						k = x(set, update) || C.lQ;
					}
					j(d);
					return () => {
						T.delete(B);
						if (T.size === 0 && k) {
							k();
							k = null;
						}
					};
				}
				return { set, update, subscribe };
			}
			function derived(d, x, k) {
				const C = !Array.isArray(d);
				const j = C ? [d] : d;
				if (!j.every(Boolean)) {
					throw new Error('derived() expects stores as input, got a falsy value');
				}
				const T = x.length < 2;
				return readable(k, (d, k) => {
					let K = false;
					const B = [];
					let D = 0;
					let R = noop;
					const sync = () => {
						if (D) {
							return;
						}
						R();
						const j = x(C ? B[0] : B, d, k);
						if (T) {
							d(j);
						} else {
							R = typeof j === 'function' ? j : noop;
						}
					};
					const M = j.map((d, x) =>
						subscribe_to_store(
							d,
							(d) => {
								B[x] = d;
								D &= ~(1 << x);
								if (K) {
									sync();
								}
							},
							() => {
								D |= 1 << x;
							}
						)
					);
					K = true;
					sync();
					return function stop() {
						run_all(M);
						R();
						K = false;
					};
				});
			}
			function readonly(d) {
				return { subscribe: d.subscribe.bind(d) };
			}
			function get(d) {
				let x;
				(0, T.T)(d, (d) => (x = d))();
				return x;
			}
		},
		3370: (d, x, k) => {
			'use strict';
			k.d(x, { T: () => subscribe_to_store });
			var C = k(1951);
			var j = k(5372);
			var T = k(4193);
			var K = k(3091);
			var B = k(3285);
			function onMount(d) {
				if (component_context === null) {
					lifecycle_outside_component('onMount');
				}
				if (legacy_mode_flag && component_context.l !== null) {
					init_update_callbacks(component_context).m.push(d);
				} else {
					user_effect(() => {
						const x = untrack(d);
						if (typeof x === 'function') return x;
					});
				}
			}
			function onDestroy(d) {
				if (component_context === null) {
					lifecycle_outside_component('onDestroy');
				}
				onMount(() => () => untrack(d));
			}
			function create_custom_event(d, x, { bubbles: k = false, cancelable: C = false } = {}) {
				return new CustomEvent(d, { detail: x, bubbles: k, cancelable: C });
			}
			function createEventDispatcher() {
				const d = component_context;
				if (d === null) {
					lifecycle_outside_component('createEventDispatcher');
				}
				return (x, k, C) => {
					const j = d.s.$$events?.[x];
					if (j) {
						const T = is_array(j) ? j.slice() : [j];
						const K = create_custom_event(x, k, C);
						for (const x of T) {
							x.call(d.x, K);
						}
						return !K.defaultPrevented;
					}
					return true;
				};
			}
			function beforeUpdate(d) {
				if (component_context === null) {
					lifecycle_outside_component('beforeUpdate');
				}
				if (component_context.l === null) {
					e.lifecycle_legacy_only('beforeUpdate');
				}
				init_update_callbacks(component_context).b.push(d);
			}
			function afterUpdate(d) {
				if (component_context === null) {
					lifecycle_outside_component('afterUpdate');
				}
				if (component_context.l === null) {
					e.lifecycle_legacy_only('afterUpdate');
				}
				init_update_callbacks(component_context).a.push(d);
			}
			function init_update_callbacks(d) {
				var x = d.l;
				return (x.u ??= { a: [], b: [], m: [] });
			}
			function flushSync(d) {
				flush_sync(d);
			}
			function subscribe_to_store(d, x, k) {
				if (d == null) {
					x(undefined);
					if (k) k(undefined);
					return j.lQ;
				}
				const T = (0, C.vz)(() => d.subscribe(x, k));
				return T.unsubscribe ? () => T.unsubscribe() : T;
			}
		}
	}
]);
