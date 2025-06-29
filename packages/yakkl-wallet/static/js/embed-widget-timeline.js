(() => {
	'use strict';
	var t = {
			151: (t, e) => {
				function r(t, e) {
					if (void 0 === t) throw new Error(''.concat(null != e ? e : 'Value', ' is undefined'));
					return t;
				}
				function i(t, e) {
					if (null === t) throw new Error(''.concat(null != e ? e : 'Value', ' is null'));
					return t;
				}
				(e.ensureNotNull = void 0), (e.ensureNotNull = i);
			}
		},
		e = {};
	function r(i) {
		var s = e[i];
		if (void 0 !== s) return s.exports;
		var n = (e[i] = { exports: {} });
		return t[i](n, n.exports, r), n.exports;
	}
	(() => {
		var t = r(151);
		const e = {
			'color-cold-gray-300': '#B2B5BE',
			'color-brand': '#2962FF',
			'color-brand-hover': '#1E53E5',
			'color-brand-active': '#1848CC'
		};
		const i = JSON.parse(
			'{"crypto-mkt-screener":{"width":1000,"height":490,"defaultColumn":"overview","market":"crypto","screener_type":"crypto_mkt","displayCurrency":"USD","isTransparent":false},"events":{"width":510,"height":600,"isTransparent":false,"hideImportanceIndicator":false,"autosize":false},"forex-cross-rates":{"width":770,"height":400,"isTransparent":false,"currencies":["EUR","USD","JPY","GBP","CHF","AUD","CAD","NZD"],"frameElementId":null,"autosize":false},"forex-heat-map":{"width":770,"height":400,"isTransparent":false,"currencies":["EUR","USD","JPY","GBP","CHF","AUD","CAD","NZD","CNY"],"frameElementId":null,"autosize":false},"hotlists":{"width":400,"height":600,"isTransparent":false,"dateRange":"12M","showSymbolLogo":false},"market-overview":{"width":400,"height":650,"isTransparent":false,"dateRange":"12M","showSymbolLogo":true},"market-quotes":{"width":770,"height":450,"isTransparent":false,"showSymbolLogo":false},"mini-symbol-overview":{"width":350,"height":220,"symbol":"FX:EURUSD","dateRange":"12M","isTransparent":false,"autosize":false,"largeChartUrl":""},"symbol-overview":{"width":1000,"height":500,"symbols":[["Apple","AAPL|1D"],["Google","GOOGL|1D"],["Microsoft","MSFT|1D"]],"autosize":false,"chartOnly":false,"hideDateRanges":false,"hideMarketStatus":false,"hideSymbolLogo":false,"scalePosition":"right","scaleMode":"Normal","fontFamily":"-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif","fontSize":"10","noTimeScale":false,"chartType":"area","valuesTracking":"0","changeMode":"price-and-percent"},"advanced-chart":{"bodyId":"widget-container","bodyClasses":["chart-page","unselectable","on-widget"]},"screener":{"width":1100,"height":523,"defaultColumn":"overview","defaultScreen":"general","market":"forex","showToolbar":true,"isTransparent":false},"single-quote":{"width":350,"symbol":"FX:EURUSD","isTransparent":false},"symbol-profile":{"width":480,"height":650,"symbol":"NASDAQ:AAPL","isTransparent":false},"symbol-info":{"width":1000,"symbol":"NASDAQ:AAPL","isTransparent":false},"technical-analysis":{"interval":"1m","width":425,"isTransparent":false,"height":450,"symbol":"NASDAQ:AAPL","showIntervalTabs":true,"displayMode":"single"},"ticker-tape":{"isTransparent":false,"displayMode":"adaptive","showSymbolLogo":false},"tickers":{"isTransparent":false,"showSymbolLogo":false},"financials":{"width":480,"height":830,"autosize":false,"symbol":"NASDAQ:AAPL","isTransparent":false,"displayMode":"regular","largeChartUrl":""},"timeline":{"width":480,"height":830,"autosize":false,"isTransparent":false,"displayMode":"regular","feedMode":"all_symbols"},"stock-heatmap":{"width":500,"height":500,"autosize":true,"dataSource":"SPX500","exchanges":[],"grouping":"sector","blockSize":"market_cap_basic","blockColor":"change","hasTopBar":false,"isDataSetEnabled":false,"isZoomEnabled":true,"hasSymbolTooltip":true,"symbolUrl":"","isMonoSize":false},"crypto-coins-heatmap":{"width":500,"height":500,"autosize":true,"dataSource":"Crypto","blockSize":"market_cap_calc","blockColor":"change","hasTopBar":false,"isDataSetEnabled":false,"isZoomEnabled":true,"hasSymbolTooltip":true,"symbolUrl":"","isMonoSize":false},"etf-heatmap":{"width":500,"height":500,"autosize":true,"dataSource":"AllUSEtf","blockSize":"aum","blockColor":"change","grouping":"asset_class","hasTopBar":false,"isDataSetEnabled":false,"isZoomEnabled":true,"hasSymbolTooltip":true,"symbolUrl":"","isMonoSize":false}}'
		);
		var s, n;
		!(function (t) {
			let e;
			!(function (t) {
				(t.SetSymbol = 'set-symbol'), (t.SetInterval = 'set-interval');
			})((e = t.Names || (t.Names = {})));
		})(s || (s = {})),
			(function (t) {
				let e;
				!(function (t) {
					(t.SymbolClick = 'tv-widget-symbol-click'),
						(t.WidgetLoad = 'tv-widget-load'),
						(t.WidgetReady = 'tv-widget-ready'),
						(t.ResizeIframe = 'tv-widget-resize-iframe'),
						(t.NoData = 'tv-widget-no-data');
				})((e = t.Names || (t.Names = {})));
			})(n || (n = {}));
		const o = '__FAIL__',
			a = '__NHTTP__',
			l = new RegExp('^http(s)?:(//)?');
		function c(t = location.href) {
			const e = (function (t) {
				try {
					const e = new URL(t);
					return l.test(e.protocol) ? null : a;
				} catch (t) {
					return o;
				}
			})(t);
			return e || t.replace(l, '');
		}
		const h = ['locale', 'symbol', 'market'],
			d = 'https://www.tradingview-widget.com',
			u = 'BATTLE';
		class g {
			constructor(t) {
				this._copyrightContainer = null;
				const e = t ?? this._getScriptInfo();
				e && this._replaceScript(e);
			}
			hasCopyright() {
				return !!this._copyrightContainer;
			}
			get widgetId() {
				throw new Error('Method must be overridden');
			}
			widgetUtmName() {
				return this.widgetId;
			}
			get defaultSettings() {
				return i[this.widgetId];
			}
			get propertiesToWorkWith() {
				return [];
			}
			get useParamsForConnectSocket() {
				return !1;
			}
			get useSnowplowPageView() {
				return !1;
			}
			useQueryStringParameters(t) {
				return {};
			}
			filterRawSettings(t) {
				const e = {},
					r = { ...t, ...this.useQueryStringParameters(t) },
					i = Object.keys(r),
					s = new Set(this.propertiesToWorkWith);
				return (
					i.forEach((t) => {
						s.has(t) && (e[t] = r[t]);
					}),
					e
				);
			}
			get shouldListenToIframeResize() {
				return !0;
			}
			get propertiesToSkipInHash() {
				return ['customer', 'locale'];
			}
			get propertiesToAddToGetParams() {
				return ['locale'];
			}
			_defaultWidth() {}
			_defaultHeight() {}
			_getScriptInfo() {
				const t = document.currentScript;
				if (!t || !t.src)
					return (
						console.error('Could not self-replace the script, widget embedding has been aborted'),
						null
					);
				return {
					scriptURL: (function (t) {
						const e = new URL(t, document.baseURI);
						return { host: e.host, pathname: e.pathname, href: e.href, protocol: e.protocol };
					})(t.src),
					scriptElement: t,
					id: t.id,
					rawSettings: this._scriptContentToJSON(t),
					overrideHost: t.getAttribute('override-host')
				};
			}
			_replaceScript(r) {
				const { scriptURL: i, scriptElement: s, rawSettings: o, id: a, overrideHost: l } = r,
					c =
						l ||
						(function (t) {
							if ('BATTLE' === u) {
								if (window.WIDGET_HOST) return window.WIDGET_HOST;
								if (t.host.match(/\.\wst\w*\.\wv$/i))
									return `https://${t.host.replace(/\.(\w)v$/i, (t, e) => `-widget.${e}v`)}`;
							}
							return d;
						})(i),
					h = s.parentNode;
				o && 'timeline' === this.widgetUtmName() && (o.locale = 'en');
				const g = s.nonce || s.getAttribute('nonce'),
					m = (function (t) {
						if (null === t) return null;
						const e = t.querySelector('#tradingview-copyright'),
							r = t.querySelector('#tradingview-quotes'),
							i = e || r;
						return i && t.removeChild(i), i;
					})(h),
					p = h.querySelector('.tradingview-widget-copyright');
				this._copyrightContainer = m || p;
				const f = h.classList.contains('tradingview-widget-container');
				(this.iframeContainer = h && f ? h : document.createElement('div')),
					o && (this.settings = this.filterRawSettings(o)),
					(o && this._validateSettings()) ||
						(console.error('Invalid settings provided, fall back to defaults'),
						(this.settings = this.filterRawSettings(this.defaultSettings)));
				const w = '32px',
					{ width: y, height: b } = this.settings,
					S = void 0 === b ? void 0 : `${b}${Number.isInteger(b) ? 'px' : ''}`,
					v = void 0 === y ? void 0 : `${y}${Number.isInteger(y) ? 'px' : ''}`;
				void 0 !== v && (this.iframeContainer.style.width = v),
					void 0 !== S && (this.iframeContainer.style.height = S);
				const T = (function () {
					const t = document.createElement('style');
					return (
						(t.innerHTML = `\n\t.tradingview-widget-copyright {\n\t\tfont-size: 13px !important;\n\t\tline-height: 32px !important;\n\t\ttext-align: center !important;\n\t\tvertical-align: middle !important;\n\t\t/* @mixin sf-pro-display-font; */\n\t\tfont-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif !important;\n\t\tcolor: ${e['color-cold-gray-300']} !important;\n\t}\n\n\t.tradingview-widget-copyright .blue-text {\n\t\tcolor: ${e['color-brand']} !important;\n\t}\n\n\t.tradingview-widget-copyright a {\n\t\ttext-decoration: none !important;\n\t\tcolor: ${e['color-cold-gray-300']} !important;\n\t}\n\n\t.tradingview-widget-copyright a:visited {\n\t\tcolor: ${e['color-cold-gray-300']} !important;\n\t}\n\n\t.tradingview-widget-copyright a:hover .blue-text {\n\t\tcolor: ${e['color-brand-hover']} !important;\n\t}\n\n\t.tradingview-widget-copyright a:active .blue-text {\n\t\tcolor: ${e['color-brand-active']} !important;\n\t}\n\n\t.tradingview-widget-copyright a:visited .blue-text {\n\t\tcolor: ${e['color-brand']} !important;\n\t}\n\t`),
						t
					);
				})();
				g && T.setAttribute('nonce', g), this.iframeContainer.appendChild(T);
				const C = this.hasCopyright() ? `calc(100% - ${w})` : '100%',
					_ = location.hostname,
					k = p ? 'widget_new' : 'widget',
					A = this.widgetUtmName();
				(this.settings.utm_source = _),
					(this.settings.utm_medium = k),
					(this.settings.utm_campaign = A),
					this._updateCopyrightHrefParams(_, k, A);
				const E =
						this.settings.iframeTitle || `${this.widgetId.replace('-', ' ')} TradingView widget`,
					I = this.settings.iframeLang || 'en';
				(this.iframe = this._createIframe(C, c, a, E, I)),
					this._addCSPErrorListener(c),
					g && this.iframe.setAttribute('nonce', g);
				const P = this.iframeContainer.querySelector('.tradingview-widget-container__widget');
				if (
					(P
						? ((0, t.ensureNotNull)(P.parentElement).replaceChild(this.iframe, P), s?.remove())
						: f
							? (this.iframeContainer.appendChild(this.iframe), s?.remove())
							: (this.iframeContainer.appendChild(this.iframe),
								h.replaceChild(this.iframeContainer, (0, t.ensureNotNull)(s))),
					this.shouldListenToIframeResize &&
						(function (t, e, r) {
							const i = e.contentWindow;
							if (!i)
								return (
									console.error(
										'Cannot listen to the event from the provided iframe, contentWindow is not available'
									),
									() => {}
								);
							function s(e) {
								e.source &&
									e.source === i &&
									e.data &&
									e.data.name &&
									e.data.name === t &&
									r(e.data.data);
							}
							window.addEventListener('message', s, !1);
						})(n.Names.ResizeIframe, this.iframe, (t) => {
							t.width &&
								((this.iframe.style.width = t.width + 'px'),
								(this.iframeContainer.style.width = t.width + 'px')),
								(this.iframe.style.height = t.height + 'px'),
								(this.iframeContainer.style.height =
									t.height + (this.hasCopyright() ? 32 : 0) + 'px');
						}),
					m)
				) {
					const t = document.createElement('div');
					(t.style.height = w),
						(t.style.lineHeight = w),
						void 0 !== v && (t.style.width = v),
						(t.style.textAlign = 'center'),
						(t.style.verticalAlign = 'middle'),
						(t.innerHTML = m.innerHTML),
						this.iframeContainer.appendChild(t);
				}
			}
			_iframeSrcBase(t) {
				let e = `${t}/embed-widget/${this.widgetId}/`;
				return (
					this.settings.customer &&
						-1 !== this.propertiesToSkipInHash.indexOf('customer') &&
						(e += `${this.settings.customer}/`),
					e
				);
			}
			_validateSettings() {
				const t = (t, e) => {
						if (void 0 === t) return e;
						const r = String(t);
						return /^\d+$/.test(r) ? parseInt(r) : /^(\d+%|auto)$/.test(r) ? r : null;
					},
					e = t(this.settings.width, this._defaultWidth()),
					r = t(this.settings.height, this._defaultHeight());
				return (
					null !== e && null !== r && ((this.settings.width = e), (this.settings.height = r), !0)
				);
			}
			_setSettingsQueryString(t) {
				const e = this.propertiesToAddToGetParams.filter((t) => -1 !== h.indexOf(t)),
					r = (function (t, e) {
						const r = Object.create(Object.getPrototypeOf(t));
						for (const i of e) Object.prototype.hasOwnProperty.call(t, i) && (r[i] = t[i]);
						return r;
					})(this.settings, e);
				for (const [e, i] of Object.entries(r)) t.searchParams.append(e, i);
			}
			_setHashString(t, e) {
				const r = {};
				e && (r.frameElementId = e),
					Object.keys(this.settings).forEach((t) => {
						-1 === this.propertiesToSkipInHash.indexOf(t) && (r[t] = this.settings[t]);
					}),
					(this.useParamsForConnectSocket || this.useSnowplowPageView) && (r['page-uri'] = c());
				Object.keys(r).length > 0 && (t.hash = encodeURIComponent(JSON.stringify(r)));
			}
			_scriptContentToJSON(t) {
				const e = t.innerHTML.trim();
				try {
					return JSON.parse(e);
				} catch (t) {
					return console.error(`Widget settings parse error: ${t}`), null;
				}
			}
			_createIframe(t, e, r, i, s) {
				const n = document.createElement('iframe');
				r && (n.id = r),
					this.settings.enableScrolling || n.setAttribute('scrolling', 'no'),
					n.setAttribute('allowtransparency', 'true'),
					n.setAttribute('frameborder', '0'),
					(n.style.userSelect = 'none'),
					(n.style.boxSizing = 'border-box'),
					(n.style.display = 'block'),
					(n.style.height = t),
					(n.style.width = '100%');
				const o = new URL(this._iframeSrcBase(e));
				return (
					this._setSettingsQueryString(o),
					this._setHashString(o, r),
					n.setAttribute('src', o.toString()),
					(n.title = i),
					(n.lang = s),
					n
				);
			}
			_addCSPErrorListener(t) {
				document.addEventListener('securitypolicyviolation', (e) => {
					e.blockedURI.includes(t) &&
						(this._tryFixCSPIssueWithFallback(t),
						console.warn(
							'Please update your CSP rules to allow the tradingview-widget.com origin for frame-src.'
						));
				});
			}
			_tryFixCSPIssueWithFallback(t) {
				const e = this.iframe.getAttribute('src');
				if (e) {
					const r = new URL(e.replace(t, 'https://s.tradingview.com'));
					this.iframe.setAttribute('src', r.href);
				}
			}
			_updateCopyrightHrefParams(t, e, r) {
				if (this._copyrightContainer) {
					const i = this._copyrightContainer.querySelector('a');
					if (i) {
						const s = i.getAttribute('href');
						if (s)
							try {
								const n = new URL(s);
								n.searchParams.set('utm_source', t),
									n.searchParams.set('utm_medium', e),
									n.searchParams.set('utm_campaign', r),
									i.setAttribute('href', n.toString());
							} catch (t) {
								console.log(`Cannot update link UTM params, href="${s}"`);
							}
					}
				}
			}
		}
		var m, p, f;
		!(function (t) {
			(t.Adaptive = 'adaptive'), (t.Regular = 'regular'), (t.Compact = 'compact');
		})(m || (m = {})),
			(function (t) {
				(t.AllSymbols = 'all_symbols'), (t.Market = 'market'), (t.Symbol = 'symbol');
			})(p || (p = {})),
			(function (t) {
				(t.Cryptocurrencies = 'crypto'),
					(t.Currencies = 'forex'),
					(t.Stocks = 'stock'),
					(t.Indices = 'index'),
					(t.Futures = 'futures'),
					(t.Bonds = 'cfd');
			})(f || (f = {}));
		new (class extends g {
			get widgetId() {
				return 'timeline';
			}
			get useSnowplowPageView() {
				return !0;
			}
			get propertiesToAddToGetParams() {
				return ['market', 'symbol'];
			}
			useQueryStringParameters(t) {
				return t && t.feedMode === p.Symbol
					? (function (t) {
							try {
								const e = new URL(window.location.href),
									r = {};
								for (const [i, s] of Object.entries(t)) {
									const t = e.searchParams.get(s);
									t && (r[i] = t);
								}
								return r;
							} catch {
								return {};
							}
						})({ symbol: 'tvwidgetsymbol' })
					: {};
			}
			get propertiesToWorkWith() {
				return [
					'width',
					'height',
					'market',
					'symbol',
					'colorTheme',
					'isTransparent',
					'colorTheme',
					'displayMode',
					'largeChartUrl'
				];
			}
		})();
	})();
})();
