// IMPORTANT NOTE: Edit 'constants.mustache' since it is the template for 'constants.ts'

// Global shared constants. Network specifics are in the network/<whatever>/contants.js file
export const VERSION = "2.0.0-preview";

export const YEAR = "2025"; // Instead of computing year since user can change date on system - use a constant

export const TRIAL_DAYS = 14;
export const PRO_ELIGIBLE_PROMO_TYPES = [
  'investor',
  'influencer',
  'employee',
  'special',
  'founding', // Founding members
  'early',  // Early adopters
  'partner',
  'founder',
  'internal',
  'press'
];

export const FOUNDING_MEMBER_DEADLINE = '2025-08-15T04:00:00.000Z'; // UTC time with 4 hour difference for est
export const EARLY_ADOPTER_DEADLINES = [
  { date: '2025-10-01T04:00:00.000Z', price: 120 },
  { date: '2025-11-15T04:00:00.000Z', price: 132 },
  { date: '2026-01-01T04:00:00.000Z', price: 144 }
];

export const YAKKL_PRO_ANNUAL_FEE = 144;

export const DEFAULT_PERSONA = "default";
export const GAS_PER_BLOB = 131072; // 2**17

export const TIMELINES = ['1h', '24h', '7d', '30d'] as const;
export const NUM_OF_SPLASH_IMAGES = 3;
export const SPLASH_DELAY = 3000; //milliseconds
export const ALERT_DELAY = 3000; //milliseconds
export const IDLE_AUTO_LOCK_CYCLE = 2; // multiplier of seconds (e.g., 60000*1 = 1 minute)
export const IDLE_AUTO_LOCK_CYCLE_TIME = 60000; //milliseconds
export const DEBUG_ALL_LOGS = true; // NOTE: Make sure it is set to false for production
export const TIMER_CHECK_PRICE_INTERVAL_TIME = 10000 // 10 seconds
export const TIMER_PRICE_INTERVAL_TIME = 10000 // 10 seconds
export const TIMER_CHECK_GAS_PRICE_INTERVAL_TIME = 10000; //milliseconds (10 seconds)
export const TIMER_CONNECTION_INTERVAL_TIME = 30000;
export const TIMER_TOKEN_PRICE_CYCLE_TIME = 15000; //milliseconds (30 seconds)
export const TIMER_SWAP_FETCH_PRICES_TIME = 60000;
export const TIMER_ICON_CHECK_TIME = 60000;
export const TIMER_IDLE_THRESHOLD = 120000; //milliseconds (2 minutes)
export const TIMER_IDLE_LOCK_DELAY = 60000; //milliseconds (1 minute)
export const TIMER_IDLE_CHECK_INTERVAL = 15000; //milliseconds (15 seconds)
export const TIMER_IDLE_CHECK_INTERVAL_APP_WIDE = 15000; //milliseconds (15 seconds)
export const TIMER_GAS_PRICE_CHECK = 'gas_checkGasPrices';


export const TIMEOUT_COPY_TO_CLIPBOARD = 20000; //milliseconds - redacts the clipboard after this time

// Retry and backoff constants
export const DEV_MAX_RETRIES = 5;
export const DEV_BASE_DELAY = 1000; //milliseconds

export const ETH_BASE_EOA_GAS_UNITS = 21000; // Base amount of gas units it takes for a EOA transaction
export const ETH_BASE_SCA_GAS_UNITS = 45000; // Base amount of gas units it takes for a Smart Contract transaction
export const ETH_BASE_SWAP_GAS_UNITS = 500000n; // Base amount of gas units it takes for a Uniswap transaction
export const ETH_BASE_FORCANCEL_GAS_UNITS = ETH_BASE_EOA_GAS_UNITS * 3;

export const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // WETH address on Ethereum mainnet

export const YAKKL_GAS_ESTIMATE_MIN_USD = 3.50;
export const YAKKL_GAS_ESTIMATE_MULTIHOP_SWAP_DEFAULT = 3750000;
export const YAKKL_GAS_ESTIMATE_MULTIPLIER_BASIS_POINTS = 30000n; // 300%
export const YAKKL_FEE_BASIS_POINTS = 42.25; //875; // 0.875%
export const YAKKL_FEE_BASIS_POINTS_DIVISOR = 10_000;
export const YAKKL_FEE_ACCEPTABLE_TOKENS = ["ETH", "WETH", "YAKKL", "USDC", "USDT", "DAI", "WBTC"] // Tokens that are acceptable for fee payment

export const YAKKL_ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const YAKKL_ZERO_ACCOUNT_NAME = "YAKKL - Zero Account - YAKKL";
export const YAKKL_ZERO_ACCOUNT_TYPE = "NA"; // Not applicable - default value

export const YAKKL_INTERNAL = "yakkl-internal";
export const YAKKL_EXTERNAL = "yakkl-external";
export const YAKKL_PROVIDER_EIP6963 = "yakkl-provider-eip6963";
export const YAKKL_PROVIDER = "yakkl-provider";
export const YAKKL_PROVIDER_ETHEREUM = "yakkl-provider-ethereum";
export const YAKKL_SPLASH = "yakkl-splash";
export const YAKKL_DAPP = "yakkl-dapp";
export const YAKKL_UNIFIED_PORT = 'yakkl-unified';
export const YAKKL_ETH = "yakkl-eth";

// Logical viewport size of iPhone pro max
export const DEFAULT_POPUP_WIDTH = 428; //394;
export const DEFAULT_POPUP_HEIGHT = 926; //620;
export const DEFAULT_EXT_HEIGHT = 926; //600;
export const DEFAULT_TITLE = "YAKKL® Smart Wallet";
export const DEFAULT_UPGRADE_LABEL = "Pro - ";

export const DEFAULT_DERIVED_PATH_ETH = "m/44'/60'/"; // '0'/0/0' - First of these three represents the account. Last of these three represents index and gets dynamically created. Middle one of these three is always '0'

export const DEFAULT_YAKKL_ASSETS = "yakklAssets"; // Not stored in local storage but static json.

export const CURRENT_STORAGE_VERSION = 1; // Increment this value when the storage format changes for migration purposes. Secure storage keys are versioned.
export const STORAGE_YAKKL_PREFERENCES = "preferences";
export const STORAGE_YAKKL_SETTINGS = "settings";
export const STORAGE_YAKKL_SECURITY = "yakklSecurity";
export const STORAGE_YAKKL_PORTFOLIO = "yakklPortfolio";
export const STORAGE_YAKKL_CURRENTLY_SELECTED = "yakklCurrentlySelected";
export const STORAGE_YAKKL_REGISTERED_DATA = "yakklRegisteredData";

export const STORAGE_YAKKL_PROFILE = "profile";
export const STORAGE_YAKKL_PROFILES = "profiles";
export const STORAGE_YAKKL_ACCOUNTS = "yakklAccounts";
export const STORAGE_YAKKL_PRIMARY_ACCOUNTS = "yakklPrimaryAccounts";
export const STORAGE_YAKKL_CONTACTS = "yakklContacts";
//export const STORAGE_YAKKL_TOKENS = "yakklTokens";
export const STORAGE_YAKKL_TOKENDATA = "yakklTokenData";
export const STORAGE_YAKKL_TOKENDATA_CUSTOM = "yakklTokenDataCustom";
export const STORAGE_YAKKL_COMBINED_TOKENS = "yakklCombinedTokens";
export const STORAGE_YAKKL_CHATS = "yakklChats";
export const STORAGE_YAKKL_WATCHLIST = "yakklWatchList";
export const STORAGE_YAKKL_BLOCKEDLIST = "yakklBlockedList";
export const STORAGE_YAKKL_CONNECTED_DOMAINS = "yakklConnectedDomains";

export const STORAGE_YAKKL_WALLET_PROVIDERS = "yakklWalletProviders";
export const STORAGE_YAKKL_WALLET_BLOCKCHAINS = "yakklWalletBlockchains";
export const STORAGE_YAKKL_WALLET_ACTIVE_TAB = "yakklWalletActiveTab";

export const STORAGE_YAKKL_MEMPOOL = "yakklMemPool";

export const PASSKEY_HINTS_MIN = 3;

export const PATH_HOME = "/";
export const PATH_REGISTER = "/register/Register";
export const PATH_LOGIN = "/login/Login";
export const PATH_LOCK = "/lock";
export const PATH_CONTACTS = "/contacts";
export const PATH_WELCOME = "/welcome/welcome";
export const PATH_DASHBOARD = "/dashboard";
export const PATH_LOGOUT = "/logout";
export const PATH_IMPORT_EMERGENCYKIT = "/import/import-emergencykit";
export const PATH_IMPORT_PRIVATEKEY = "/import/import-privatekey";
export const PATH_IMPORT_WATCH = "/import/import-watch";
export const PATH_IMPORT_PHRASE = "/import/import-phrase";
export const PATH_EXPORT = "/export";
export const PATH_EXPORT_EXPORT = "/export/export";
export const PATH_ACCOUNTS = "/accounts";
export const PATH_ACCOUNTS_ETHEREUM_CREATE_PRIMARY = "/accounts/ethereum/create/primary";
export const PATH_ACCOUNTS_ETHEREUM_CREATE_DERIVED = "/accounts/ethereum/create/derived";
export const PATH_ACCOUNT_MAINTENANCE = "/accounts/ethereum/maintenance";
export const PATH_LEGAL = "/legal/Legal";
export const PATH_PROFILE = "/components/profile";
export const PATH_ACTIVITIES = "/activities";
export const PATH_CRYPTO = "/crypto";
export const PATH_NFTS = "/nfts";
export const PATH_UNIVERSITY = "/university";
export const PATH_SECURITY = "/security";
export const PATH_SECURITY_PASSWORD = "/security/password";
export const PATH_SECURITY_2FA = "/security/2fa";
export const PATH_SECURITY_USERNAME = "/security/username";
export const PATH_SECURITY_SECRET = "/security/secret";
export const PATH_SECURITY_RESET = "/security/reset";
export const PATH_SETTINGS = "/settings";
export const PATH_SETTINGS_PREFERENCES = "/settings/preferences";
export const PATH_SETTINGS_SETTINGS = "/settings/settings";
export const PATH_TOKENS = "/tokens";
export const PATH_WEB3 = "/web3";
export const PATH_DAPP_TRANSACTIONS = "/dapp/popups/transactions";
export const PATH_DAPP_ACCOUNTS = "/dapp/popups/accounts";
export const PATH_DAPP_POPUPS = "/dapp/popups"; // base for all popups specific for dapps
export const PATH_ETHEREUM_TRANSACTIONS_SEND = "/accounts/ethereum/transactions/send";
export const PATH_ETHEREUM_TRANSACTIONS_RECV = "/accounts/ethereum/transactions/recv";
export const PATH_ETHEREUM_TRANSACTIONS_SWAP = "/accounts/ethereum/transactions/swap";
export const PATH_ETHEREUM_TRANSACTIONS_SELL = "/accounts/ethereum/transactions/sell";
export const PATH_ETHEREUM_TRANSACTIONS_STAKE = "/accounts/ethereum/transactions/stake";
export const PATH_ETHEREUM_TRANSACTIONS_BUY = "/accounts/ethereum/transactions/buy";

export enum EVMDenominations {
  ETH = 'ETH',
  GWEI = 'GWEI',
  WEI = 'WEI',
}

// Add other blockchain denominations


// Just temporary...
export const WEB3_SVG = '<svg height="512" viewBox="0 0 512 512" width="512" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" focusable="false" style="width: 28px; height: 28px;"><radialGradient id="injected-a" cx="1.813132%" cy="50%" r="98.186868%"><stop offset="0" stop-color="#424242"></stop><stop offset="1"></stop></radialGradient><g fill="none" fill-rule="evenodd"><path d="m256 0c141.384896 0 256 114.615104 256 256 0 141.384896-114.615104 256-256 256-141.384896 0-256-114.615104-256-256 0-141.384896 114.615104-256 256-256z" fill="url(#injected-a)"></path><path d="m137.902344 242.761719-15.820313 55.957031h-16.699219l-22.382812-84.550781h18.398438l13.183593 59.589843h.9375l15.410157-59.589843h14.941406l15.703125 59.589843h.9375l13.066406-59.589843h18.28125l-22.441406 84.550781h-16.582031l-15.996094-55.957031zm127.324218 40.839843v15.117188h-56.015624v-84.550781h56.015624v15.117187h-38.320312v19.746094h36.152344v14.003906h-36.152344v20.566406zm56.601563 15.117188h-37.96875v-84.550781h36.972656c16.40625 0 26.191407 8.027343 26.191407 21.09375 0 8.964843-6.621094 16.757812-15.292969 18.046875v1.054687c11.191406.820313 19.335937 9.257813 19.335937 20.15625 0 14.824219-11.191406 24.199219-29.238281 24.199219zm-20.273437-71.015625v21.503906h13.300781c9.550781 0 14.765625-3.925781 14.765625-10.722656 0-6.738281-4.863282-10.78125-13.300782-10.78125zm0 57.480469h15.761718c10.195313 0 15.703125-4.277344 15.703125-12.1875 0-7.734375-5.683593-11.835938-16.113281-11.835938h-15.351562zm84.433593-23.144532v-13.183593h10.3125c8.027344 0 13.476563-4.6875 13.476563-11.601563 0-6.796875-5.273438-11.132812-13.535156-11.132812-8.203126 0-13.652344 4.628906-14.121094 11.953125h-16.347656c.585937-15.996094 12.480468-26.074219 30.9375-26.074219 17.34375 0 29.824218 9.492188 29.824218 22.792969 0 9.785156-6.152344 17.402343-15.585937 19.335937v1.054688c11.601562 1.289062 18.867187 9.023437 18.867187 20.15625 0 14.824218-13.945312 25.546875-33.222656 25.546875-18.867188 0-31.640625-10.429688-32.402344-26.367188h16.933594c.527344 7.148438 6.5625 11.660157 15.644531 11.660157 8.847657 0 15-4.980469 15-12.1875 0-7.382813-5.800781-11.953126-15.292969-11.953126z" fill="#fff"></path></g></svg>';

export const WEB3_SVG_DATA = 'data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIHdpZHRoPSI1MTIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIGFyaWEtaGlkZGVuPSJ0cnVlIiBmb2N1c2FibGU9ImZhbHNlIiBzdHlsZT0id2lkdGg6IDQ4cHg7IGhlaWdodDogNDhweDsiPjxyYWRpYWxHcmFkaWVudCBpZD0iaW5qZWN0ZWQtYSIgY3g9IjEuODEzMTMyJSIgY3k9IjUwJSIgcj0iOTguMTg2ODY4JSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjNDI0MjQyIj48L3N0b3A+PHN0b3Agb2Zmc2V0PSIxIj48L3N0b3A+PC9yYWRpYWxHcmFkaWVudD48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Im0yNTYgMGMxNDEuMzg0ODk2IDAgMjU2IDExNC42MTUxMDQgMjU2IDI1NiAwIDE0MS4zODQ4OTYtMTE0LjYxNTEwNCAyNTYtMjU2IDI1Ni0xNDEuMzg0ODk2IDAtMjU2LTExNC42MTUxMDQtMjU2LTI1NiAwLTE0MS4zODQ4OTYgMTE0LjYxNTEwNC0yNTYgMjU2LTI1NnoiIGZpbGw9InVybCgjaW5qZWN0ZWQtYSkiPjwvcGF0aD48cGF0aCBkPSJtMTM3LjkwMjM0NCAyNDIuNzYxNzE5LTE1LjgyMDMxMyA1NS45NTcwMzFoLTE2LjY5OTIxOWwtMjIuMzgyODEyLTg0LjU1MDc4MWgxOC4zOTg0MzhsMTMuMTgzNTkzIDU5LjU4OTg0M2guOTM3NWwxNS40MTAxNTctNTkuNTg5ODQzaDE0Ljk0MTQwNmwxNS43MDMxMjUgNTkuNTg5ODQzaC45Mzc1bDEzLjA2NjQwNi01OS41ODk4NDNoMTguMjgxMjVsLTIyLjQ0MTQwNiA4NC41NTA3ODFoLTE2LjU4MjAzMWwtMTUuOTk2MDk0LTU1Ljk1NzAzMXptMTI3LjMyNDIxOCA0MC44Mzk4NDN2MTUuMTE3MTg4aC01Ni4wMTU2MjR2LTg0LjU1MDc4MWg1Ni4wMTU2MjR2MTUuMTE3MTg3aC0zOC4zMjAzMTJ2MTkuNzQ2MDk0aDM2LjE1MjM0NHYxNC4wMDM5MDZoLTM2LjE1MjM0NHYyMC41NjY0MDZ6bTU2LjYwMTU2MyAxNS4xMTcxODhoLTM3Ljk2ODc1di04NC41NTA3ODFoMzYuOTcyNjU2YzE2LjQwNjI1IDAgMjYuMTkxNDA3IDguMDI3MzQzIDI2LjE5MTQwNyAyMS4wOTM3NSAwIDguOTY0ODQzLTYuNjIxMDk0IDE2Ljc1NzgxMi0xNS4yOTI5NjkgMTguMDQ2ODc1djEuMDU0Njg3YzExLjE5MTQwNi44MjAzMTMgMTkuMzM1OTM3IDkuMjU3ODEzIDE5LjMzNTkzNyAyMC4xNTYyNSAwIDE0LjgyNDIxOS0xMS4xOTE0MDYgMjQuMTk5MjE5LTI5LjIzODI4MSAyNC4xOTkyMTl6bS0yMC4yNzM0MzctNzEuMDE1NjI1djIxLjUwMzkwNmgxMy4zMDA3ODFjOS41NTA3ODEgMCAxNC43NjU2MjUtMy45MjU3ODEgMTQuNzY1NjI1LTEwLjcyMjY1NiAwLTYuNzM4MjgxLTQuODYzMjgyLTEwLjc4MTI1LTEzLjMwMDc4Mi0xMC43ODEyNXptMCA1Ny40ODA0NjloMTUuNzYxNzE4YzEwLjE5NTMxMyAwIDE1LjcwMzEyNS00LjI3NzM0NCAxNS43MDMxMjUtMTIuMTg3NSAwLTcuNzM0Mzc1LTUuNjgzNTkzLTExLjgzNTkzOC0xNi4xMTMyODEtMTEuODM1OTM4aC0xNS4zNTE1NjJ6bTg0LjQzMzU5My0yMy4xNDQ1MzJ2LTEzLjE4MzU5M2gxMC4zMTI1YzguMDI3MzQ0IDAgMTMuNDc2NTYzLTQuNjg3NSAxMy40NzY1NjMtMTEuNjAxNTYzIDAtNi43OTY4NzUtNS4yNzM0MzgtMTEuMTMyODEyLTEzLjUzNTE1Ni0xMS4xMzI4MTItOC4yMDMxMjYgMC0xMy42NTIzNDQgNC42Mjg5MDYtMTQuMTIxMDk0IDExLjk1MzEyNWgtMTYuMzQ3NjU2Yy41ODU5MzctMTUuOTk2MDk0IDEyLjQ4MDQ2OC0yNi4wNzQyMTkgMzAuOTM3NS0yNi4wNzQyMTkgMTcuMzQzNzUgMCAyOS44MjQyMTggOS40OTIxODggMjkuODI0MjE4IDIyLjc5Mjk2OSAwIDkuNzg1MTU2LTYuMTUyMzQ0IDE3LjQwMjM0My0xNS41ODU5MzcgMTkuMzM1OTM3djEuMDU0Njg4YzExLjYwMTU2MiAxLjI4OTA2MiAxOC44NjcxODcgOS4wMjM0MzcgMTguODY3MTg3IDIwLjE1NjI1IDAgMTQuODI0MjE4LTEzLjk0NTMxMiAyNS41NDY4NzUtMzMuMjIyNjU2IDI1LjU0Njg3NS0xOC44NjcxODggMC0zMS42NDA2MjUtMTAuNDI5Njg4LTMyLjQwMjM0NC0yNi4zNjcxODhoMTYuOTMzNTk0Yy41MjczNDQgNy4xNDg0MzggNi41NjI1IDExLjY2MDE1NyAxNS42NDQ1MzEgMTEuNjYwMTU3IDguODQ3NjU3IDAgMTUtNC45ODA0NjkgMTUtMTIuMTg3NSAwLTcuMzgyODEzLTUuODAwNzgxLTExLjk1MzEyNi0xNS4yOTI5NjktMTEuOTUzMTI2eiIgZmlsbD0iI2ZmZiI+PC9wYXRoPjwvZz48L3N2Zz4K';

export const LOGO_BULLFAV48x48 = 'data:image/png;base64,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'

export const LOGO_BULLFAV_SVG_DATA = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIGlkPSJhIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgNzU4LjczIDczOC45MiI+PGRlZnM+PHJhZGlhbEdyYWRpZW50IGlkPSJiIiBjeD0iMzk5LjMiIGN5PSIzNTkuNDIiIGZ4PSIzOTkuMyIgZnk9IjM1OS40MiIgcj0iMzUxLjY2IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHN0b3Agb2Zmc2V0PSIuMDMiIHN0b3AtY29sb3I9IiNhZTVlYTQiLz48c3RvcCBvZmZzZXQ9Ii4zNCIgc3RvcC1jb2xvcj0iIzhmNGI5YiIvPjxzdG9wIG9mZnNldD0iLjg5IiBzdG9wLWNvbG9yPSIjNWMyZDhjIi8+PHN0b3Agb2Zmc2V0PSIuOTUiIHN0b3AtY29sb3I9IiM1YTJjOGEiLz48c3RvcCBvZmZzZXQ9Ii45OCIgc3RvcC1jb2xvcj0iIzU1MmI4MyIvPjxzdG9wIG9mZnNldD0iLjk5IiBzdG9wLWNvbG9yPSIjNGQyODc3Ii8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjNDgyNzcwIi8+PC9yYWRpYWxHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImMiIHgxPSIyMTkuNjMiIHkxPSI0OC4yMSIgeDI9IjU3OC45OCIgeTI9IjY3MC42MyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2RlOWQyNiIvPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4YzkyNyIvPjxzdG9wIG9mZnNldD0iLjMyIiBzdG9wLWNvbG9yPSIjZTJhZTI0Ii8+PHN0b3Agb2Zmc2V0PSIuNjgiIHN0b3AtY29sb3I9IiNmY2YyOTAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNmZmQ0M2YiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iZCIgeDE9IjI3MS40MSIgeTE9IjQxMy40OSIgeDI9IjM0MC45MyIgeTI9IjQxMy40OSIgeGxpbms6aHJlZj0iI2MiLz48bGluZWFyR3JhZGllbnQgaWQ9ImUiIHgxPSI0NTcuNjciIHkxPSI0MTMuNDkiIHgyPSI1MjcuMiIgeTI9IjQxMy40OSIgeGxpbms6aHJlZj0iI2MiLz48bGluZWFyR3JhZGllbnQgaWQ9ImYiIHgxPSIxMjAuNjIiIHkxPSI0MTkuMjgiIHgyPSI2NzcuOTkiIHkyPSI0MTkuMjgiIHhsaW5rOmhyZWY9IiNjIi8+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMzU4LjU5IiB5MT0iMjkzLjk3IiB4Mj0iNDQwLjAyIiB5Mj0iMjkzLjk3IiB4bGluazpocmVmPSIjYyIvPjwvZGVmcz48Y2lyY2xlIGN4PSIzOTkuMyIgY3k9IjM1OS40MiIgcj0iMzUxLjY2IiBzdHlsZT0iZmlsbDp1cmwoI2IpOyBzdHJva2Utd2lkdGg6MHB4OyIvPjxwYXRoIGQ9Im0zOTkuMyw3MTguODRjLTE5OC4xOSwwLTM1OS40Mi0xNjEuMjQtMzU5LjQyLTM1OS40MlMyMDEuMTIsMCwzOTkuMywwczM1OS40MiwxNjEuMjQsMzU5LjQyLDM1OS40Mi0xNjEuMjQsMzU5LjQyLTM1OS40MiwzNTkuNDJabTAtNzAzLjMzQzIwOS42NywxNS41Miw1NS40LDE2OS43OSw1NS40LDM1OS40MnMxNTQuMjcsMzQzLjksMzQzLjksMzQzLjksMzQzLjktMTU0LjI3LDM0My45LTM0My45UzU4OC45MywxNS41MiwzOTkuMywxNS41MloiIHN0eWxlPSJmaWxsOnVybCgjYyk7IHN0cm9rZS13aWR0aDowcHg7Ii8+PHBhdGggZD0ibTMwNS4xNywzNjkuODhzLTE5LjM0LTE4LjI5LTMzLjc2LTIxLjF2NTQuODZsNjcuNTMsNzQuNTZzNi4zMy0yMy4yMS0zLjUyLTUzLjQ2YzAsMC0zNC4xMS0xNC40Mi0zMC4yNS01NC44NloiIHN0eWxlPSJmaWxsOnVybCgjZCk7IHN0cm9rZS13aWR0aDowcHg7Ii8+PHBhdGggZD0ibTQ2My4xOSw0MjQuNzRjLTkuODUsMzAuMjUtMy41Miw1My40Ni0zLjUyLDUzLjQ2bDY3LjUzLTc0LjU2di01NC44NmMtMTQuNDIsMi44MS0zMy43NiwyMS4xLTMzLjc2LDIxLjEsMy44Nyw0MC40NC0zMC4yNSw1NC44Ni0zMC4yNSw1NC44NloiIHN0eWxlPSJmaWxsOnVybCgjZSk7IHN0cm9rZS13aWR0aDowcHg7Ii8+PHBhdGggZD0ibTQ2MC40LDI2Mi45M2wtNDkuMzYsODUuNDljLTUuMDgsOC43OS0xOC40MSw4Ljc5LTIzLjQ4LDBsLTQ5LjM2LTg1LjQ5Yy04NS4wOCw0Ny4yNS0yMTcuNTgtMzUuOTgtMjE3LjU4LTM1Ljk4LDM3LjI2LDQ4LjUxLDc5LjcxLDY5LjczLDExNS4zLDc4LjM3LDU2LjczLDEzLjc3LDEwNS43LDQ3LjYxLDEzNS4xNiw5NS41M2wuNjYsMS4wN2MtMS45OCw3Ljk3LTIuOTgsMTYuMTMtMi45OCwyNC4zMnYxMDguODVjMCwyLjQzLS4yNiw0LjgzLS42OSw3LjItMTEuMDQsNy4xNy0xOC4wOSwxOC4wNS0xOC4wOSwzMC4yMywwLDIxLjU4LDIyLjA5LDM5LjA4LDQ5LjMzLDM5LjA4czQ5LjMzLTE3LjUsNDkuMzMtMzkuMDhjMC0xMi4xOS03LjA1LTIzLjA3LTE4LjA5LTMwLjIzLS40My0yLjM3LS42OS00Ljc3LS42OS03LjJ2LTEwOC44NWMwLTguMTktMS0xNi4zNS0yLjk4LTI0LjMybC42Ni0xLjA3YzI5LjQ2LTQ3LjkyLDc4LjQzLTgxLjc3LDEzNS4xNi05NS41MywzNS41OS04LjY0LDc4LjA0LTI5Ljg2LDExNS4zLTc4LjM3LDAsMC0xNjEuMDgsODUuOTYtMjE3LjU4LDM1Ljk4Wm0tNjEuMSwzNDIuNDljLTIyLjksMC00MS41Mi0xNC43Ni00MS41Mi0zMi45LDAtMi41Ni40MS01LjAzLDEuMTEtNy40Mmg4MC44NGMuNywyLjM5LDEuMTEsNC44NywxLjExLDcuNDIsMCwxOC4xNC0xOC42MywzMi45LTQxLjUyLDMyLjlaIiBzdHlsZT0iZmlsbDp1cmwoI2YpOyBzdHJva2Utd2lkdGg6MHB4OyIvPjxwYXRoIGQ9Im00MDcuMTMsMzIxLjA3bDMyLjg5LTYwLjE3cy00Mi41MywxNi45Mi04MS40MywwbDMyLjg5LDYwLjE3czguMzEsMTMuNDMsMTUuNjUsMFoiIHN0eWxlPSJmaWxsOnVybCgjZyk7IHN0cm9rZS13aWR0aDowcHg7Ii8+PHRleHQvPjwvc3ZnPg=="

export const PROVIDERS = {
    YAKKL: 'yakkl',
    INFURA: 'infura',
    ALCHEMY: 'alchemy',
    ETHERSCAN: 'etherscan',
};

export const PRICE_PROVIDERS = {
    ETHERSCAN: 'etherscan',
    COINBASE: 'coinbase',
    KRAKEN: 'kraken',
};

export const BLOCKCHAINS = {
    ETHEREUM: 'ethereum',
    BITCOIN: 'bitcoin',
    SOLANA: 'solana',
    CARDANO: 'cardano',
};

export const BLOCKCHAINS_NETWORKS = {
    ETHEREUM: {
        mainnet: 'mainnet',
        sepolia: 'sepolia',
    },
    BITCOIN: 'bitcoin',
    SOLANA: 'solana',
    CARDANO: 'cardano',
};

export const ENVIRONMENT_TYPES = {
    BACKGROUND: 'background',
    BROWSER: 'browser',
    NOTIFICATION: 'notification',
    POPUP: 'index',
};

export const PLATFORM_TYPES = {
    BRAVE: 'Brave',
    CHROME: 'Chrome',
    EDGE: 'Edge',
    FIREFOX: 'Firefox',
    OPERA: 'Opera',
    SAFARI: 'Safari',  // We don't support currently
};

export const TOKEN_IMAGES = {
    ETH_URL: './images/eth_logo.svg',
    BNB_URL: './images/bnb.png',
    MATIC_URL: './images/matic-token.png',
};

// Maybe change these to reflect the user_agent value
export const OS_TYPES = {
    OSX: 'OSX', //Mac
    WINDOWS: 'Windows',
    LINUX_REDHAT: 'Red Hat',
    LINUX_UBUNTU: 'Ubuntu',
    LINUX_OTHER: 'Linux',
    CHROME: 'Chrome OS',
    ANDROID: 'Android',
    IOS: "iOS",
};

export const SMART_TRANSACTION_STATUSES = {
    CANCELLED: 'cancelled',
    PENDING: 'pending',
    SUCCESS: 'success',
};

// Wallet security configuration
import { SecurityLevel } from '$lib/permissions/types';

export const WALLET_SECURITY_CONFIG = {
  DEFAULT_SECURITY_LEVEL: 'medium' as SecurityLevel,
  DEFAULT_INJECT_IFRAMES: true,
  TRUSTED_DOMAINS: [
    'ethereum.org',
    'uniswap.org',
    'opensea.io',
    'metamask.io',
    // Add other trusted domains as needed
  ],
  SECURITY_LEVEL_SETTINGS: {
    'high': {
      injectIframes: false,
      description: 'No iframe injection (highest security)'
    },
    'medium': {
      injectIframes: true,
      description: 'Inject into trusted domains only (balanced security)'
    },
    'standard': {
      injectIframes: true,
      description: 'Inject into all non-null origin frames (dApp compatible)'
    }
  } as Record<SecurityLevel, { injectIframes: boolean; description: string }>
} as const;

// Security level types
// export type SecurityLevel = 0 | 1 | 2;

// Security level descriptions
export const SECURITY_LEVEL_DESCRIPTIONS: Record<SecurityLevel, string> = {
  'high': 'Most restrictive - no iframe injection',
  'medium': 'Trusted domains only - injects only into known dApp domains',
  'standard': 'Most permissive - injects into all non-null origin frames'
} as const;

