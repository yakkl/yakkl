export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "app",
	appPath: "app",
	assets: new Set([".DS_Store","css/.DS_Store","css/fonts/.DS_Store","css/fonts/Inter-italic.var.woff2","css/fonts/Inter-roman.var.woff2","css/inter.css","css/sidepanel.css","data/README.md","data/lists.json","data/uniswap.json","ext/154.js","ext/161.js","ext/166.js","ext/21.js","ext/213.js","ext/233.js","ext/257.js","ext/257.js.map","ext/284.js","ext/346.js","ext/358.js","ext/399.js","ext/399.js.map","ext/40.js","ext/40.js.LICENSE.txt","ext/425.js","ext/434.js","ext/474.js","ext/508.js","ext/54.js","ext/54.js.LICENSE.txt","ext/61.js","ext/650.js","ext/696.js","ext/755.js","ext/785.js","ext/810.js","ext/83.js","ext/837.js","ext/861.js","ext/92.js","ext/934.js","ext/949.js","ext/background.js","ext/background.js.LICENSE.txt","ext/background.js.map","ext/browser-polyfill-orig.js","ext/browser-polyfill-orig.min.js","ext/browser-polyfill.js","ext/browser-polyfill.min.js","ext/content.js","ext/content.js.LICENSE.txt","ext/content.js.map","ext/inpage.js","ext/inpage.js.LICENSE.txt","ext/inpage.js.map","ext/node_modules_pnpm_alchemy-sdk_3_5_1_bufferutil_4_0_9_utf-8-validate_5_0_10_node_modules_alche-68011d.js","ext/node_modules_pnpm_alchemy-sdk_3_5_1_bufferutil_4_0_9_utf-8-validate_5_0_10_node_modules_alche-68011d.js.LICENSE.txt","ext/node_modules_pnpm_alchemy-sdk_3_5_1_bufferutil_4_0_9_utf-8-validate_5_0_10_node_modules_alche-68011d.js.map","ext/node_modules_pnpm_alchemy-sdk_3_5_1_bufferutil_4_0_9_utf-8-validate_5_0_10_node_modules_alche-9b54f3.js","ext/node_modules_pnpm_alchemy-sdk_3_5_1_bufferutil_4_0_9_utf-8-validate_5_0_10_node_modules_alche-9b54f3.js.LICENSE.txt","ext/node_modules_pnpm_alchemy-sdk_3_5_1_bufferutil_4_0_9_utf-8-validate_5_0_10_node_modules_alche-9b54f3.js.map","ext/node_modules_pnpm_alchemy-sdk_3_6_0_bufferutil_4_0_9_typescript_5_8_3_utf-8-validate_5_0_10_n-632f4c.js","ext/node_modules_pnpm_alchemy-sdk_3_6_0_bufferutil_4_0_9_typescript_5_8_3_utf-8-validate_5_0_10_n-632f4c.js.LICENSE.txt","ext/node_modules_pnpm_alchemy-sdk_3_6_0_bufferutil_4_0_9_typescript_5_8_3_utf-8-validate_5_0_10_n-632f4c.js.map","ext/node_modules_pnpm_alchemy-sdk_3_6_0_bufferutil_4_0_9_typescript_5_8_3_utf-8-validate_5_0_10_n-d83b19.js","ext/node_modules_pnpm_alchemy-sdk_3_6_0_bufferutil_4_0_9_typescript_5_8_3_utf-8-validate_5_0_10_n-d83b19.js.LICENSE.txt","ext/node_modules_pnpm_alchemy-sdk_3_6_0_bufferutil_4_0_9_typescript_5_8_3_utf-8-validate_5_0_10_n-d83b19.js.map","ext/node_modules_pnpm_readable-stream_4_7_0_node_modules_readable-stream_lib_ours_browser_js.js","ext/node_modules_pnpm_readable-stream_4_7_0_node_modules_readable-stream_lib_ours_browser_js.js.LICENSE.txt","ext/node_modules_pnpm_stream-browserify_3_0_0_node_modules_stream-browserify_index_js.js","ext/node_modules_pnpm_stream-browserify_3_0_0_node_modules_stream-browserify_index_js.js.LICENSE.txt","ext/sandbox.js","ext/sandbox.js.LICENSE.txt","ext/sandbox.js.map","ext/src_lib_common_stores_securityWarning_ts.js","ext/src_lib_common_stores_securityWarning_ts.js.LICENSE.txt","ext/src_lib_common_stores_securityWarning_ts.js.map","ext/src_lib_managers_BalanceCacheManager_ts.js","ext/src_lib_managers_BalanceCacheManager_ts.js.LICENSE.txt","ext/src_lib_managers_BalanceCacheManager_ts.js.map","ext/vendors-node_modules_pnpm_alchemy-sdk_3_5_1_bufferutil_4_0_9_utf-8-validate_5_0_10_node_modul-b1e3f2.js","ext/vendors-node_modules_pnpm_alchemy-sdk_3_5_1_bufferutil_4_0_9_utf-8-validate_5_0_10_node_modul-b1e3f2.js.LICENSE.txt","ext/vendors-node_modules_pnpm_alchemy-sdk_3_5_1_bufferutil_4_0_9_utf-8-validate_5_0_10_node_modul-d67b96.js","ext/vendors-node_modules_pnpm_alchemy-sdk_3_5_1_bufferutil_4_0_9_utf-8-validate_5_0_10_node_modul-d67b96.js.LICENSE.txt","favicon.png","images/.DS_Store","images/FoundingUsers.png","images/address-book-regular.svg","images/address-book-solid.svg","images/background_1.png","images/background_gradient_1.png","images/background_gradient_2.png","images/background_gradient_3.png","images/bitcoin.svg","images/blank_token.svg","images/bot-avatar.png","images/data-image-logo-BW.txt","images/eth.svg","images/ethereum-background.png","images/ethereum.svg","images/ethereum_icon_purple.svg","images/facebook.svg","images/failIcon48x48.png","images/failIcon96x96.png","images/favicon.png","images/gas.svg","images/heroscene.png","images/imagebar.png","images/instagram.svg","images/linkedin.svg","images/logoBull128x128.png","images/logoBull16x16.png","images/logoBull32x32.png","images/logoBull48x48.png","images/logoBullFav-BW128x128.png","images/logoBullFav-BW16x16.png","images/logoBullFav-BW32x32.png","images/logoBullFav-BW48x48.png","images/logoBullFav-BW96x96.png","images/logoBullFav.svg","images/logoBullFav128x128.png","images/logoBullFav16x16.png","images/logoBullFav19x19.png","images/logoBullFav32x32.png","images/logoBullFav38x38.png","images/logoBullFav48x48.png","images/logoBullFav96x96.png","images/logoBullLock-BW128x128.png","images/logoBullLock-BW16x16.png","images/logoBullLock-BW32x32.png","images/logoBullLock-BW48x48.png","images/logoBullLock-BW96x96.png","images/logoBullLock128x128.png","images/logoBullLock16x16.png","images/logoBullLock32x32.png","images/logoBullLock48x48.png","images/logoBullLock96x96.png","images/logoUrgentBullLock128x128.png","images/logoUrgentBullLock16x16.png","images/logoUrgentBullLock32x32.png","images/logoUrgentBullLock48x48.png","images/logoUrgentBullLock96x96.png","images/logoUrgentBullUnlock128x128.png","images/logoUrgentBullUnlock16x16.png","images/logoUrgentBullUnlock32x32.png","images/logoUrgentBullUnlock48x48.png","images/logoUrgentBullUnlock96x96.png","images/logo_data_uri.txt","images/moonpay.svg","images/openai11746135467895.pdf","images/polygon-background.png","images/reddit.svg","images/sol.svg","images/splash_0.png","images/splash_1.png","images/splash_2.png","images/sponsors/logoCryptoGramps.png","images/sponsors/logoCryptoGrampsTrimmed.png","images/tiktok.svg","images/twitter.svg","images/uniswap.png","images/user-avatar.png","images/waiting.gif","images/web3.svg","js/.DS_Store","js/background-wrapper.js","js/clipboard.min.js","js/console.js","js/cookie_consent.js","js/darkmode.js","js/data_check.js.tmp","js/embed-widget-mini-symbol-overview.js","js/embed-widget-symbol-info.js","js/embed-widget-symbol-overview.js","js/embed-widget-technical-analysis.js","js/embed-widget-timeline.js","js/errorHandler.js","js/fontawesome-8d8e5192b2.js","js/helpers.js","js/index.min.js","js/jidenticon.min.js","js/popper.min.js","js/sidepanel.js","js/sidepanel2.js","js/targeting.js.tmp","manifest.json","sidepanel.html","sidepanel_orig.html","snippet-terms.html"]),
	mimeTypes: {".woff2":"font/woff2",".css":"text/css",".md":"text/markdown",".json":"application/json",".js":"text/javascript",".map":"application/json",".txt":"text/plain",".png":"image/png",".svg":"image/svg+xml",".pdf":"application/pdf",".gif":"image/gif",".html":"text/html"},
	_: {
		client: {start:"app/immutable/entry/start.Cca19n2v.js",app:"app/immutable/entry/app.BWuxDamq.js",imports:["app/immutable/entry/start.Cca19n2v.js","app/immutable/chunks/CkqS9PXN.js","app/immutable/chunks/BaS8d5lg.js","app/immutable/chunks/BOosul_h.js","app/immutable/chunks/B2gA1VsD.js","app/immutable/entry/app.BWuxDamq.js","app/immutable/chunks/Cb2naUpm.js","app/immutable/chunks/WDN37msH.js","app/immutable/chunks/CgCfpVku.js","app/immutable/chunks/B2gA1VsD.js","app/immutable/chunks/BaS8d5lg.js","app/immutable/chunks/BOosul_h.js","app/immutable/chunks/BGcrmAjg.js","app/immutable/chunks/D-mKCNoU.js","app/immutable/chunks/Ch26qbWO.js","app/immutable/chunks/CZAHYQZy.js","app/immutable/chunks/z-nmOEXa.js","app/immutable/chunks/CnIbzB-6.js","app/immutable/chunks/Dw28gLPr.js","app/immutable/chunks/BKVO1wI8.js","app/immutable/chunks/D-aJ6pD4.js","app/immutable/chunks/CZieKDFj.js","app/immutable/chunks/B7s-nLfi.js","app/immutable/chunks/Bmr6hs4q.js","app/immutable/chunks/COpD6KvM.js","app/immutable/chunks/CkqS9PXN.js","app/immutable/chunks/D59oTG1g.js","app/immutable/chunks/Cmwrv3PW.js","app/immutable/chunks/DiU70Is3.js","app/immutable/chunks/twIkBoiu.js","app/immutable/chunks/Cm3jf07C.js","app/immutable/chunks/BgcCkDX2.js","app/immutable/chunks/BXFaAXnq.js","app/immutable/chunks/3AhEABF_.js","app/immutable/chunks/COgMMZ9C.js","app/immutable/chunks/Q1yPWpQ-.js","app/immutable/chunks/d5hrMixo.js","app/immutable/chunks/Dv9a3G0k.js","app/immutable/chunks/D_ljX5ue.js","app/immutable/chunks/Dyu6WQ9w.js","app/immutable/chunks/BMXnoaUY.js","app/immutable/chunks/BYboeQtC.js","app/immutable/chunks/CViNpZsE.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js')),
			__memo(() => import('./nodes/8.js')),
			__memo(() => import('./nodes/9.js')),
			__memo(() => import('./nodes/10.js')),
			__memo(() => import('./nodes/11.js')),
			__memo(() => import('./nodes/12.js')),
			__memo(() => import('./nodes/13.js')),
			__memo(() => import('./nodes/14.js')),
			__memo(() => import('./nodes/15.js')),
			__memo(() => import('./nodes/16.js')),
			__memo(() => import('./nodes/17.js')),
			__memo(() => import('./nodes/18.js')),
			__memo(() => import('./nodes/19.js')),
			__memo(() => import('./nodes/20.js')),
			__memo(() => import('./nodes/21.js')),
			__memo(() => import('./nodes/22.js')),
			__memo(() => import('./nodes/23.js')),
			__memo(() => import('./nodes/24.js')),
			__memo(() => import('./nodes/25.js')),
			__memo(() => import('./nodes/26.js')),
			__memo(() => import('./nodes/27.js')),
			__memo(() => import('./nodes/28.js')),
			__memo(() => import('./nodes/29.js')),
			__memo(() => import('./nodes/30.js')),
			__memo(() => import('./nodes/31.js')),
			__memo(() => import('./nodes/32.js')),
			__memo(() => import('./nodes/33.js')),
			__memo(() => import('./nodes/34.js')),
			__memo(() => import('./nodes/35.js')),
			__memo(() => import('./nodes/36.js')),
			__memo(() => import('./nodes/37.js')),
			__memo(() => import('./nodes/38.js')),
			__memo(() => import('./nodes/39.js')),
			__memo(() => import('./nodes/40.js')),
			__memo(() => import('./nodes/41.js')),
			__memo(() => import('./nodes/42.js')),
			__memo(() => import('./nodes/43.js')),
			__memo(() => import('./nodes/44.js')),
			__memo(() => import('./nodes/45.js')),
			__memo(() => import('./nodes/46.js')),
			__memo(() => import('./nodes/47.js')),
			__memo(() => import('./nodes/48.js')),
			__memo(() => import('./nodes/49.js')),
			__memo(() => import('./nodes/50.js')),
			__memo(() => import('./nodes/51.js')),
			__memo(() => import('./nodes/52.js')),
			__memo(() => import('./nodes/53.js')),
			__memo(() => import('./nodes/54.js')),
			__memo(() => import('./nodes/55.js')),
			__memo(() => import('./nodes/56.js')),
			__memo(() => import('./nodes/57.js')),
			__memo(() => import('./nodes/58.js')),
			__memo(() => import('./nodes/59.js')),
			__memo(() => import('./nodes/60.js')),
			__memo(() => import('./nodes/61.js')),
			__memo(() => import('./nodes/62.js')),
			__memo(() => import('./nodes/63.js')),
			__memo(() => import('./nodes/64.js')),
			__memo(() => import('./nodes/65.js')),
			__memo(() => import('./nodes/66.js')),
			__memo(() => import('./nodes/67.js')),
			__memo(() => import('./nodes/68.js')),
			__memo(() => import('./nodes/69.js')),
			__memo(() => import('./nodes/70.js')),
			__memo(() => import('./nodes/71.js')),
			__memo(() => import('./nodes/72.js')),
			__memo(() => import('./nodes/73.js')),
			__memo(() => import('./nodes/74.js')),
			__memo(() => import('./nodes/75.js')),
			__memo(() => import('./nodes/76.js')),
			__memo(() => import('./nodes/77.js')),
			__memo(() => import('./nodes/78.js')),
			__memo(() => import('./nodes/79.js')),
			__memo(() => import('./nodes/80.js')),
			__memo(() => import('./nodes/81.js')),
			__memo(() => import('./nodes/82.js')),
			__memo(() => import('./nodes/83.js'))
		],
		routes: [
			{
				id: "/(wallet)",
				pattern: /^\/?$/,
				params: [],
				page: { layouts: [0,6,], errors: [1,,], leaf: 31 },
				endpoint: null
			},
			{
				id: "/(wallet)/accounts",
				pattern: /^\/accounts\/?$/,
				params: [],
				page: { layouts: [0,6,], errors: [1,,], leaf: 32 },
				endpoint: null
			},
			{
				id: "/(wallet)/accounts/ethereum",
				pattern: /^\/accounts\/ethereum\/?$/,
				params: [],
				page: { layouts: [0,6,], errors: [1,,], leaf: 33 },
				endpoint: null
			},
			{
				id: "/(wallet)/accounts/ethereum/create/derived",
				pattern: /^\/accounts\/ethereum\/create\/derived\/?$/,
				params: [],
				page: { layouts: [0,7,], errors: [1,,], leaf: 34 },
				endpoint: null
			},
			{
				id: "/(wallet)/accounts/ethereum/create/primary",
				pattern: /^\/accounts\/ethereum\/create\/primary\/?$/,
				params: [],
				page: { layouts: [0,7,], errors: [1,,], leaf: 35 },
				endpoint: null
			},
			{
				id: "/(wallet)/accounts/ethereum/transactions/buy",
				pattern: /^\/accounts\/ethereum\/transactions\/buy\/?$/,
				params: [],
				page: { layouts: [0,6,], errors: [1,,], leaf: 36 },
				endpoint: null
			},
			{
				id: "/(wallet)/accounts/ethereum/transactions/send",
				pattern: /^\/accounts\/ethereum\/transactions\/send\/?$/,
				params: [],
				page: { layouts: [0,6,], errors: [1,,], leaf: 37 },
				endpoint: null
			},
			{
				id: "/(wallet)/accounts/ethereum/transactions/stake",
				pattern: /^\/accounts\/ethereum\/transactions\/stake\/?$/,
				params: [],
				page: { layouts: [0,6,], errors: [1,,], leaf: 38 },
				endpoint: null
			},
			{
				id: "/(wallet)/contacts",
				pattern: /^\/contacts\/?$/,
				params: [],
				page: { layouts: [0,6,], errors: [1,,], leaf: 39 },
				endpoint: null
			},
			{
				id: "/(wallet)/crypto",
				pattern: /^\/crypto\/?$/,
				params: [],
				page: { layouts: [0,6,], errors: [1,,], leaf: 40 },
				endpoint: null
			},
			{
				id: "/(wallet)/cta",
				pattern: /^\/cta\/?$/,
				params: [],
				page: { layouts: [0,6,], errors: [1,,], leaf: 41 },
				endpoint: null
			},
			{
				id: "/(dapp)/dapp/EIP6963",
				pattern: /^\/dapp\/EIP6963\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 17 },
				endpoint: null
			},
			{
				id: "/(dapp)/dapp/login",
				pattern: /^\/dapp\/login\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 18 },
				endpoint: null
			},
			{
				id: "/(dapp)/dapp/popups/accounts",
				pattern: /^\/dapp\/popups\/accounts\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 19 },
				endpoint: null
			},
			{
				id: "/(dapp)/dapp/popups/approve",
				pattern: /^\/dapp\/popups\/approve\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 20 },
				endpoint: null
			},
			{
				id: "/(dapp)/dapp/popups/permissions",
				pattern: /^\/dapp\/popups\/permissions\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 21 },
				endpoint: null
			},
			{
				id: "/(dapp)/dapp/popups/sign",
				pattern: /^\/dapp\/popups\/sign\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 22 },
				endpoint: null
			},
			{
				id: "/(dapp)/dapp/popups/transactions",
				pattern: /^\/dapp\/popups\/transactions\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 23 },
				endpoint: null
			},
			{
				id: "/(dapp)/dapp/popups/wallet",
				pattern: /^\/dapp\/popups\/wallet\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 24 },
				endpoint: null
			},
			{
				id: "/(dapp)/dapp/walletConnect",
				pattern: /^\/dapp\/walletConnect\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 25 },
				endpoint: null
			},
			{
				id: "/(wallet)/import/import-phrase",
				pattern: /^\/import\/import-phrase\/?$/,
				params: [],
				page: { layouts: [0,8,], errors: [1,,], leaf: 42 },
				endpoint: null
			},
			{
				id: "/(wallet)/legal/Legal",
				pattern: /^\/legal\/Legal\/?$/,
				params: [],
				page: { layouts: [0,9,], errors: [1,,], leaf: 43 },
				endpoint: null
			},
			{
				id: "/(wallet)/lock",
				pattern: /^\/lock\/?$/,
				params: [],
				page: { layouts: [0,6,], errors: [1,,], leaf: 44 },
				endpoint: null
			},
			{
				id: "/(wallet)/login/Login",
				pattern: /^\/login\/Login\/?$/,
				params: [],
				page: { layouts: [0,10,], errors: [1,,], leaf: 45 },
				endpoint: null
			},
			{
				id: "/(wallet)/logout",
				pattern: /^\/logout\/?$/,
				params: [],
				page: { layouts: [0,6,], errors: [1,,], leaf: 46 },
				endpoint: null
			},
			{
				id: "/phishing",
				pattern: /^\/phishing\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 51 },
				endpoint: null
			},
			{
				id: "/(splash)/popup",
				pattern: /^\/popup\/?$/,
				params: [],
				page: { layouts: [0,4,], errors: [1,,], leaf: 27 },
				endpoint: null
			},
			{
				id: "/(splash)/popup/popup",
				pattern: /^\/popup\/popup\/?$/,
				params: [],
				page: { layouts: [0,4,5,], errors: [1,,,], leaf: 28 },
				endpoint: null
			},
			{
				id: "/preview1",
				pattern: /^\/preview1\/?$/,
				params: [],
				page: { layouts: [0,14,], errors: [1,,], leaf: 61 },
				endpoint: null
			},
			{
				id: "/preview1/emergency-kit",
				pattern: /^\/preview1\/emergency-kit\/?$/,
				params: [],
				page: { layouts: [0,14,], errors: [1,,], leaf: 62 },
				endpoint: null
			},
			{
				id: "/preview1/history",
				pattern: /^\/preview1\/history\/?$/,
				params: [],
				page: { layouts: [0,14,], errors: [1,,], leaf: 63 },
				endpoint: null
			},
			{
				id: "/preview1/receive",
				pattern: /^\/preview1\/receive\/?$/,
				params: [],
				page: { layouts: [0,14,], errors: [1,,], leaf: 64 },
				endpoint: null
			},
			{
				id: "/preview1/send",
				pattern: /^\/preview1\/send\/?$/,
				params: [],
				page: { layouts: [0,14,], errors: [1,,], leaf: 65 },
				endpoint: null
			},
			{
				id: "/preview1/settings",
				pattern: /^\/preview1\/settings\/?$/,
				params: [],
				page: { layouts: [0,14,], errors: [1,,], leaf: 66 },
				endpoint: null
			},
			{
				id: "/preview1/swap",
				pattern: /^\/preview1\/swap\/?$/,
				params: [],
				page: { layouts: [0,14,], errors: [1,,], leaf: 67 },
				endpoint: null
			},
			{
				id: "/preview1/watch-accounts",
				pattern: /^\/preview1\/watch-accounts\/?$/,
				params: [],
				page: { layouts: [0,14,], errors: [1,,], leaf: 68 },
				endpoint: null
			},
			{
				id: "/preview2",
				pattern: /^\/preview2\/?$/,
				params: [],
				page: { layouts: [0,15,], errors: [1,,], leaf: 69 },
				endpoint: null
			},
			{
				id: "/preview2/accounts",
				pattern: /^\/preview2\/accounts\/?$/,
				params: [],
				page: { layouts: [0,15,], errors: [1,,], leaf: 70 },
				endpoint: null
			},
			{
				id: "/preview2/ai-help",
				pattern: /^\/preview2\/ai-help\/?$/,
				params: [],
				page: { layouts: [0,15,], errors: [1,,], leaf: 71 },
				endpoint: null
			},
			{
				id: "/preview2/contacts",
				pattern: /^\/preview2\/contacts\/?$/,
				params: [],
				page: { layouts: [0,15,], errors: [1,,], leaf: 72 },
				endpoint: null
			},
			{
				id: "/preview2/legal",
				pattern: /^\/preview2\/legal\/?$/,
				params: [],
				page: { layouts: [0,15,], errors: [1,,], leaf: 73 },
				endpoint: null
			},
			{
				id: "/preview2/login",
				pattern: /^\/preview2\/login\/?$/,
				params: [],
				page: { layouts: [0,16,], errors: [1,,], leaf: 74 },
				endpoint: null
			},
			{
				id: "/preview2/mods",
				pattern: /^\/preview2\/mods\/?$/,
				params: [],
				page: { layouts: [0,15,], errors: [1,,], leaf: 75 },
				endpoint: null
			},
			{
				id: "/preview2/preferences",
				pattern: /^\/preview2\/preferences\/?$/,
				params: [],
				page: { layouts: [0,15,], errors: [1,,], leaf: 76 },
				endpoint: null
			},
			{
				id: "/preview2/register",
				pattern: /^\/preview2\/register\/?$/,
				params: [],
				page: { layouts: [0,15,], errors: [1,,], leaf: 77 },
				endpoint: null
			},
			{
				id: "/preview2/send",
				pattern: /^\/preview2\/send\/?$/,
				params: [],
				page: { layouts: [0,15,], errors: [1,,], leaf: 78 },
				endpoint: null
			},
			{
				id: "/preview2/settings",
				pattern: /^\/preview2\/settings\/?$/,
				params: [],
				page: { layouts: [0,15,], errors: [1,,], leaf: 79 },
				endpoint: null
			},
			{
				id: "/preview2/success",
				pattern: /^\/preview2\/success\/?$/,
				params: [],
				page: { layouts: [0,15,], errors: [1,,], leaf: 80 },
				endpoint: null
			},
			{
				id: "/preview2/swap",
				pattern: /^\/preview2\/swap\/?$/,
				params: [],
				page: { layouts: [0,15,], errors: [1,,], leaf: 81 },
				endpoint: null
			},
			{
				id: "/preview2/tokens",
				pattern: /^\/preview2\/tokens\/?$/,
				params: [],
				page: { layouts: [0,15,], errors: [1,,], leaf: 82 },
				endpoint: null
			},
			{
				id: "/preview2/upgrade",
				pattern: /^\/preview2\/upgrade\/?$/,
				params: [],
				page: { layouts: [0,15,], errors: [1,,], leaf: 83 },
				endpoint: null
			},
			{
				id: "/preview",
				pattern: /^\/preview\/?$/,
				params: [],
				page: { layouts: [0,13,], errors: [1,,], leaf: 52 },
				endpoint: null
			},
			{
				id: "/preview/accounts",
				pattern: /^\/preview\/accounts\/?$/,
				params: [],
				page: { layouts: [0,13,], errors: [1,,], leaf: 53 },
				endpoint: null
			},
			{
				id: "/preview/ai-help",
				pattern: /^\/preview\/ai-help\/?$/,
				params: [],
				page: { layouts: [0,13,], errors: [1,,], leaf: 54 },
				endpoint: null
			},
			{
				id: "/preview/contacts",
				pattern: /^\/preview\/contacts\/?$/,
				params: [],
				page: { layouts: [0,13,], errors: [1,,], leaf: 55 },
				endpoint: null
			},
			{
				id: "/preview/preferences",
				pattern: /^\/preview\/preferences\/?$/,
				params: [],
				page: { layouts: [0,13,], errors: [1,,], leaf: 56 },
				endpoint: null
			},
			{
				id: "/preview/send",
				pattern: /^\/preview\/send\/?$/,
				params: [],
				page: { layouts: [0,13,], errors: [1,,], leaf: 57 },
				endpoint: null
			},
			{
				id: "/preview/settings",
				pattern: /^\/preview\/settings\/?$/,
				params: [],
				page: { layouts: [0,13,], errors: [1,,], leaf: 58 },
				endpoint: null
			},
			{
				id: "/preview/swap",
				pattern: /^\/preview\/swap\/?$/,
				params: [],
				page: { layouts: [0,13,], errors: [1,,], leaf: 59 },
				endpoint: null
			},
			{
				id: "/preview/tokens",
				pattern: /^\/preview\/tokens\/?$/,
				params: [],
				page: { layouts: [0,13,], errors: [1,,], leaf: 60 },
				endpoint: null
			},
			{
				id: "/(wallet)/register/Register",
				pattern: /^\/register\/Register\/?$/,
				params: [],
				page: { layouts: [0,11,], errors: [1,,], leaf: 47 },
				endpoint: null
			},
			{
				id: "/(wallet)/security",
				pattern: /^\/security\/?$/,
				params: [],
				page: { layouts: [0,6,], errors: [1,,], leaf: 48 },
				endpoint: null
			},
			{
				id: "/(sidepanel)/sidepanel/sidepanel",
				pattern: /^\/sidepanel\/sidepanel\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 26 },
				endpoint: null
			},
			{
				id: "/(test)/test-registration-prompt",
				pattern: /^\/test-registration-prompt\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 29 },
				endpoint: null
			},
			{
				id: "/(wallet)/tokens",
				pattern: /^\/tokens\/?$/,
				params: [],
				page: { layouts: [0,12,], errors: [1,,], leaf: 49 },
				endpoint: null
			},
			{
				id: "/(upgrade)/upgrade",
				pattern: /^\/upgrade\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 30 },
				endpoint: null
			},
			{
				id: "/(wallet)/welcome/welcome",
				pattern: /^\/welcome\/welcome\/?$/,
				params: [],
				page: { layouts: [0,6,], errors: [1,,], leaf: 50 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
