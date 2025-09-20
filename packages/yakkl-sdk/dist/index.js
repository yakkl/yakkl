"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const core = require("@yakkl/core");
const eventemitter3 = require("eventemitter3");
class WalletClient {
  constructor(config = {}) {
    this.isConnected = false;
    this.config = {
      apiUrl: config.apiUrl || "https://api.yakkl.com",
      timeout: config.timeout || 3e4,
      ...config
    };
  }
  /**
   * Connect to wallet
   */
  async connect() {
    if (this.isConnected) return true;
    try {
      if (typeof window !== "undefined" && "yakkl" in window) {
        await window.yakkl.request({ method: "eth_requestAccounts" });
        this.isConnected = true;
        return true;
      }
      if (this.config.provider) {
        await this.config.provider.connect();
        this.isConnected = true;
        return true;
      }
      throw new Error("No wallet provider available");
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      return false;
    }
  }
  /**
   * Disconnect wallet
   */
  async disconnect() {
    if (this.config.provider) {
      await this.config.provider.disconnect();
    }
    this.isConnected = false;
  }
  /**
   * Get connected accounts
   */
  async getAccounts() {
    if (!this.isConnected) {
      throw new Error("Wallet not connected");
    }
    if (typeof window !== "undefined" && "yakkl" in window) {
      const addresses = await window.yakkl.request({
        method: "eth_accounts"
      });
      return addresses.map((address) => ({
        address,
        type: "imported",
        chainId: 1
      }));
    }
    return [];
  }
  /**
   * Get account balance
   */
  async getBalance(address, chainId) {
    if (!this.isConnected) {
      throw new Error("Wallet not connected");
    }
    if (this.config.provider) {
      return String(await this.config.provider.getBalance(address));
    }
    if (typeof window !== "undefined" && "yakkl" in window) {
      const balance = await window.yakkl.request({
        method: "eth_getBalance",
        params: [address, "latest"]
      });
      return balance;
    }
    throw new Error("No provider available");
  }
  /**
   * Send transaction
   */
  async sendTransaction(params) {
    if (!this.isConnected) {
      throw new Error("Wallet not connected");
    }
    if (typeof window !== "undefined" && "yakkl" in window) {
      return await window.yakkl.request({
        method: "eth_sendTransaction",
        params: [params]
      });
    }
    if (this.config.provider) {
      const response = await this.config.provider.sendTransaction({
        from: params.from,
        to: params.to,
        value: params.value || "0",
        data: params.data || "0x"
      });
      return typeof response === "string" ? response : response.hash;
    }
    throw new Error("No provider available");
  }
  /**
   * Sign message
   */
  async signMessage(address, message) {
    if (!this.isConnected) {
      throw new Error("Wallet not connected");
    }
    if (typeof window !== "undefined" && "yakkl" in window) {
      return await window.yakkl.request({
        method: "personal_sign",
        params: [message, address]
      });
    }
    throw new Error("Signing not available");
  }
  /**
   * Switch network
   */
  async switchNetwork(chainId) {
    if (!this.isConnected) {
      throw new Error("Wallet not connected");
    }
    const chainIdHex = `0x${chainId.toString(16)}`;
    if (typeof window !== "undefined" && "yakkl" in window) {
      try {
        await window.yakkl.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: chainIdHex }]
        });
      } catch (error) {
        if (error.code === 4902) {
          throw new Error("Please add this network to your wallet");
        }
        throw error;
      }
    }
  }
  /**
   * Get transaction history
   */
  async getTransactionHistory(address, options) {
    const response = await this.request("/transactions", {
      params: {
        address,
        ...options
      }
    });
    return response.transactions || [];
  }
  /**
   * Make API request
   */
  async request(endpoint, options) {
    const url = `${this.config.apiUrl}${endpoint}`;
    const method = (options == null ? void 0 : options.method) || "GET";
    const headers = {
      "Content-Type": "application/json"
    };
    if (this.config.apiKey) {
      headers["X-API-Key"] = this.config.apiKey;
    }
    const requestOptions = {
      method,
      headers,
      signal: AbortSignal.timeout(this.config.timeout)
    };
    if (method === "GET" && (options == null ? void 0 : options.params)) {
      const params = new URLSearchParams(options.params);
      url.concat("?" + params.toString());
    } else if (options == null ? void 0 : options.data) {
      requestOptions.body = JSON.stringify(options.data);
    }
    const response = await fetch(url, requestOptions);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    return await response.json();
  }
  /**
   * Check if wallet is connected
   */
  isWalletConnected() {
    return this.isConnected;
  }
  /**
   * Get wallet info
   */
  async getWalletInfo() {
    if (typeof window !== "undefined" && "yakkl" in window) {
      const yakkl = window.yakkl;
      return {
        version: yakkl.version || "unknown",
        name: "YAKKL Wallet",
        features: ["signing", "transactions", "multi-chain"]
      };
    }
    return {
      version: "unknown",
      name: "YAKKL SDK",
      features: []
    };
  }
}
var StandardRPCMethods = /* @__PURE__ */ ((StandardRPCMethods2) => {
  StandardRPCMethods2["ETH_ACCOUNTS"] = "eth_accounts";
  StandardRPCMethods2["ETH_REQUEST_ACCOUNTS"] = "eth_requestAccounts";
  StandardRPCMethods2["ETH_CHAIN_ID"] = "eth_chainId";
  StandardRPCMethods2["ETH_BLOCK_NUMBER"] = "eth_blockNumber";
  StandardRPCMethods2["ETH_GET_BALANCE"] = "eth_getBalance";
  StandardRPCMethods2["ETH_GET_TRANSACTION_BY_HASH"] = "eth_getTransactionByHash";
  StandardRPCMethods2["ETH_GET_TRANSACTION_RECEIPT"] = "eth_getTransactionReceipt";
  StandardRPCMethods2["ETH_SEND_TRANSACTION"] = "eth_sendTransaction";
  StandardRPCMethods2["ETH_SIGN_TRANSACTION"] = "eth_signTransaction";
  StandardRPCMethods2["ETH_SEND_RAW_TRANSACTION"] = "eth_sendRawTransaction";
  StandardRPCMethods2["ETH_CALL"] = "eth_call";
  StandardRPCMethods2["ETH_ESTIMATE_GAS"] = "eth_estimateGas";
  StandardRPCMethods2["ETH_GAS_PRICE"] = "eth_gasPrice";
  StandardRPCMethods2["ETH_GET_CODE"] = "eth_getCode";
  StandardRPCMethods2["ETH_GET_STORAGE_AT"] = "eth_getStorageAt";
  StandardRPCMethods2["PERSONAL_SIGN"] = "personal_sign";
  StandardRPCMethods2["ETH_SIGN_TYPED_DATA"] = "eth_signTypedData";
  StandardRPCMethods2["ETH_SIGN_TYPED_DATA_V3"] = "eth_signTypedData_v3";
  StandardRPCMethods2["ETH_SIGN_TYPED_DATA_V4"] = "eth_signTypedData_v4";
  StandardRPCMethods2["WALLET_SWITCH_ETHEREUM_CHAIN"] = "wallet_switchEthereumChain";
  StandardRPCMethods2["WALLET_ADD_ETHEREUM_CHAIN"] = "wallet_addEthereumChain";
  StandardRPCMethods2["WALLET_WATCH_ASSET"] = "wallet_watchAsset";
  StandardRPCMethods2["WALLET_REQUEST_PERMISSIONS"] = "wallet_requestPermissions";
  StandardRPCMethods2["WALLET_GET_PERMISSIONS"] = "wallet_getPermissions";
  return StandardRPCMethods2;
})(StandardRPCMethods || {});
var YAKKLRPCMethods = /* @__PURE__ */ ((YAKKLRPCMethods2) => {
  YAKKLRPCMethods2["YAKKL_GET_VERSION"] = "yakkl_getVersion";
  YAKKLRPCMethods2["YAKKL_GET_FEATURES"] = "yakkl_getFeatures";
  YAKKLRPCMethods2["YAKKL_GET_PLAN"] = "yakkl_getPlan";
  YAKKLRPCMethods2["YAKKL_ENABLE_FEATURE"] = "yakkl_enableFeature";
  YAKKLRPCMethods2["YAKKL_DISABLE_FEATURE"] = "yakkl_disableFeature";
  YAKKLRPCMethods2["YAKKL_GET_SUPPORTED_CHAINS"] = "yakkl_getSupportedChains";
  YAKKLRPCMethods2["YAKKL_SWITCH_CHAIN"] = "yakkl_switchChain";
  YAKKLRPCMethods2["YAKKL_ADD_CUSTOM_CHAIN"] = "yakkl_addCustomChain";
  YAKKLRPCMethods2["YAKKL_LOCK_WALLET"] = "yakkl_lockWallet";
  YAKKLRPCMethods2["YAKKL_UNLOCK_WALLET"] = "yakkl_unlockWallet";
  YAKKLRPCMethods2["YAKKL_SET_IDLE_TIMEOUT"] = "yakkl_setIdleTimeout";
  YAKKLRPCMethods2["YAKKL_EXPORT_EMERGENCY_KIT"] = "yakkl_exportEmergencyKit";
  YAKKLRPCMethods2["YAKKL_CREATE_ACCOUNT"] = "yakkl_createAccount";
  YAKKLRPCMethods2["YAKKL_IMPORT_ACCOUNT"] = "yakkl_importAccount";
  YAKKLRPCMethods2["YAKKL_EXPORT_ACCOUNT"] = "yakkl_exportAccount";
  YAKKLRPCMethods2["YAKKL_REMOVE_ACCOUNT"] = "yakkl_removeAccount";
  YAKKLRPCMethods2["YAKKL_SET_ACCOUNT_NAME"] = "yakkl_setAccountName";
  YAKKLRPCMethods2["YAKKL_SIMULATE_TRANSACTION"] = "yakkl_simulateTransaction";
  YAKKLRPCMethods2["YAKKL_GET_GAS_RECOMMENDATION"] = "yakkl_getGasRecommendation";
  YAKKLRPCMethods2["YAKKL_BATCH_TRANSACTIONS"] = "yakkl_batchTransactions";
  YAKKLRPCMethods2["YAKKL_GET_TOKEN_PRICE"] = "yakkl_getTokenPrice";
  YAKKLRPCMethods2["YAKKL_GET_SWAP_QUOTE"] = "yakkl_getSwapQuote";
  YAKKLRPCMethods2["YAKKL_EXECUTE_SWAP"] = "yakkl_executeSwap";
  YAKKLRPCMethods2["YAKKL_GET_PORTFOLIO_VALUE"] = "yakkl_getPortfolioValue";
  YAKKLRPCMethods2["YAKKL_GET_TRANSACTION_HISTORY"] = "yakkl_getTransactionHistory";
  YAKKLRPCMethods2["YAKKL_GET_ANALYTICS"] = "yakkl_getAnalytics";
  return YAKKLRPCMethods2;
})(YAKKLRPCMethods || {});
const RPC_ERROR_CODES = {
  // Standard JSON-RPC errors
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // Ethereum provider errors
  USER_REJECTED: 4001,
  UNAUTHORIZED: 4100,
  UNSUPPORTED_METHOD: 4200,
  DISCONNECTED: 4900,
  CHAIN_DISCONNECTED: 4901,
  // YAKKL-specific errors
  WALLET_LOCKED: 5001,
  INVALID_CHAIN: 5002,
  INSUFFICIENT_FUNDS: 5003,
  FEATURE_DISABLED: 5004,
  PLAN_REQUIRED: 5005
};
class RPCHandler {
  constructor() {
    this.handlers = /* @__PURE__ */ new Map();
    this.middleware = [];
    this.registerDefaultHandlers();
  }
  /**
   * Register default RPC handlers
   */
  registerDefaultHandlers() {
    this.register(StandardRPCMethods.ETH_ACCOUNTS, async () => {
      return [];
    });
    this.register(StandardRPCMethods.ETH_REQUEST_ACCOUNTS, async () => {
      throw this.createError(
        RPC_ERROR_CODES.UNAUTHORIZED,
        "User must authorize account access"
      );
    });
    this.register(StandardRPCMethods.ETH_CHAIN_ID, async () => {
      return "0x1";
    });
    this.register(YAKKLRPCMethods.YAKKL_GET_VERSION, async () => {
      return { version: "2.0.0", build: "stable" };
    });
    this.register(YAKKLRPCMethods.YAKKL_GET_FEATURES, async () => {
      return [
        "multi-chain",
        "hardware-wallet",
        "defi-swaps",
        "nft-support",
        "emergency-kit"
      ];
    });
  }
  /**
   * Register RPC method handler
   */
  register(method, handler) {
    this.handlers.set(method, handler);
  }
  /**
   * Unregister RPC method handler
   */
  unregister(method) {
    this.handlers.delete(method);
  }
  /**
   * Add middleware
   */
  use(middleware) {
    this.middleware.push(middleware);
  }
  /**
   * Handle RPC request
   */
  async handle(request) {
    try {
      this.validateRequest(request);
      for (const mw of this.middleware) {
        await mw(request);
      }
      const handler = this.handlers.get(request.method);
      if (!handler) {
        throw this.createError(
          RPC_ERROR_CODES.METHOD_NOT_FOUND,
          `Method "${request.method}" not found`
        );
      }
      const result = await handler(request.params);
      return {
        jsonrpc: "2.0",
        id: request.id,
        result
      };
    } catch (error) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: this.formatError(error)
      };
    }
  }
  /**
   * Handle batch requests
   */
  async handleBatch(requests) {
    return Promise.all(requests.map((req) => this.handle(req)));
  }
  /**
   * Validate RPC request
   */
  validateRequest(request) {
    if (!request.jsonrpc || request.jsonrpc !== "2.0") {
      throw this.createError(
        RPC_ERROR_CODES.INVALID_REQUEST,
        "Invalid JSON-RPC version"
      );
    }
    if (!request.method || typeof request.method !== "string") {
      throw this.createError(
        RPC_ERROR_CODES.INVALID_REQUEST,
        "Method is required"
      );
    }
    if (request.id === void 0 || request.id === null) {
      throw this.createError(
        RPC_ERROR_CODES.INVALID_REQUEST,
        "ID is required"
      );
    }
  }
  /**
   * Create RPC error
   */
  createError(code, message, data) {
    return { code, message, data };
  }
  /**
   * Format error for response
   */
  formatError(error) {
    if (error.code && error.message) {
      return error;
    }
    return {
      code: RPC_ERROR_CODES.INTERNAL_ERROR,
      message: error.message || "Internal error",
      data: error.data
    };
  }
  /**
   * Check if method is supported
   */
  isMethodSupported(method) {
    return this.handlers.has(method);
  }
  /**
   * Get supported methods
   */
  getSupportedMethods() {
    return Array.from(this.handlers.keys());
  }
}
function createYAKKLRPCHandler() {
  const handler = new RPCHandler();
  handler.register(YAKKLRPCMethods.YAKKL_GET_PLAN, async () => {
    return { plan: "explorer", features: ["basic"] };
  });
  handler.register(YAKKLRPCMethods.YAKKL_GET_SUPPORTED_CHAINS, async () => {
    return [
      { chainId: 1, name: "Ethereum Mainnet" },
      { chainId: 137, name: "Polygon" },
      { chainId: 42161, name: "Arbitrum One" },
      { chainId: 10, name: "Optimism" },
      { chainId: 8453, name: "Base" }
    ];
  });
  handler.use(async (request) => {
    console.log(`[RPC] ${request.method}`, request.params);
  });
  return handler;
}
class EmbeddedWallet extends eventemitter3.EventEmitter {
  constructor(config) {
    var _a, _b;
    super();
    this.container = null;
    this.initialized = false;
    this.config = config;
    const restrictions = (config.restrictions || []).filter((r) => ["no-external-connections", "no-mod-discovery", "enterprise-only", "read-only", "mainnet-only"].includes(r));
    let coreBranding;
    if (config.branding) {
      const theme = {};
      if ((_a = config.branding.theme) == null ? void 0 : _a.colors) {
        Object.assign(theme, config.branding.theme.colors);
      }
      coreBranding = {
        name: config.branding.name || "YAKKL",
        logo: config.branding.logo || "",
        theme,
        whiteLabel: false
      };
    }
    const engineConfig = {
      name: ((_b = config.branding) == null ? void 0 : _b.name) || "Embedded YAKKL",
      version: "1.0.0",
      embedded: true,
      restrictions,
      modDiscovery: config.enableMods !== false,
      branding: coreBranding
    };
    this.engine = new core.WalletEngine(engineConfig);
    this.setupEventListeners();
  }
  /**
   * Mount the embedded wallet to a DOM element
   */
  async mount(container) {
    if (typeof container === "string") {
      this.container = document.querySelector(container);
    } else {
      this.container = container;
    }
    if (!this.container) {
      throw new Error("Container element not found");
    }
    try {
      await this.engine.initialize();
      await this.renderUI();
      this.initialized = true;
      this.emit("wallet:ready");
    } catch (error) {
      this.emit("wallet:error", error);
      throw error;
    }
  }
  /**
   * Unmount the embedded wallet
   */
  async unmount() {
    if (this.container) {
      this.container.innerHTML = "";
      this.container = null;
    }
    if (this.initialized) {
      await this.engine.destroy();
      this.initialized = false;
    }
  }
  /**
   * Get the wallet engine for advanced operations
   */
  getEngine() {
    return this.engine;
  }
  /**
   * Create a new account
   */
  async createAccount(name) {
    this.ensureInitialized();
    return this.engine.createAccount(name);
  }
  /**
   * Get all accounts
   */
  async getAccounts() {
    this.ensureInitialized();
    return this.engine.getAccounts();
  }
  /**
   * Select an account
   */
  async selectAccount(accountId) {
    this.ensureInitialized();
    await this.engine.selectAccount(accountId);
  }
  /**
   * Sign a transaction
   */
  async signTransaction(transaction) {
    var _a;
    this.ensureInitialized();
    if ((_a = this.config.restrictions) == null ? void 0 : _a.includes("read-only")) {
      throw new Error("Wallet is in read-only mode");
    }
    const signedTx = await this.engine.signTransaction(transaction);
    return signedTx.hash;
  }
  /**
   * Send a transaction
   */
  async sendTransaction(transaction) {
    var _a;
    this.ensureInitialized();
    if ((_a = this.config.restrictions) == null ? void 0 : _a.includes("no-external-connections")) {
      throw new Error("External connections are disabled");
    }
    return this.engine.sendTransaction(transaction);
  }
  /**
   * Get current balance
   */
  async getBalance(address) {
    this.ensureInitialized();
    return this.engine.getBalance(address);
  }
  /**
   * Load a mod
   */
  async loadMod(modId) {
    this.ensureInitialized();
    if (!this.config.enableMods) {
      throw new Error("Mods are disabled");
    }
    return this.engine.loadMod(modId);
  }
  /**
   * Get configuration
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * Update branding
   */
  updateBranding(branding) {
    this.config.branding = { ...this.config.branding, ...branding };
    if (this.initialized) {
      this.renderUI();
    }
  }
  /**
   * Check if wallet is initialized
   */
  isInitialized() {
    return this.initialized;
  }
  /**
   * Setup event listeners for the wallet engine
   */
  setupEventListeners() {
    this.engine.on("account:created", (account) => {
      this.emit("account:created", account);
    });
    this.engine.on("account:selected", (account) => {
      this.emit("account:selected", account);
    });
    this.engine.on("transaction:signed", (tx) => {
      this.emit("transaction:signed", tx.transaction);
    });
  }
  /**
   * Render the wallet UI
   */
  async renderUI() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A, _B, _C, _D, _E, _F, _G, _H, _I, _J, _K, _L;
    if (!this.container) return;
    const walletHTML = `
      <div class="yakkl-embedded-wallet" style="
        font-family: ${((_c = (_b = (_a = this.config.branding) == null ? void 0 : _a.theme) == null ? void 0 : _b.fonts) == null ? void 0 : _c.body) || "system-ui, sans-serif"};
        background: ${((_f = (_e = (_d = this.config.branding) == null ? void 0 : _d.theme) == null ? void 0 : _e.colors) == null ? void 0 : _f.background) || "#ffffff"};
        border: 1px solid ${((_i = (_h = (_g = this.config.branding) == null ? void 0 : _g.theme) == null ? void 0 : _h.colors) == null ? void 0 : _i.border) || "#e5e7eb"};
        border-radius: 12px;
        padding: 20px;
        max-width: 400px;
        margin: 0 auto;
      ">
        <div class="wallet-header" style="
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          border-bottom: 1px solid ${((_l = (_k = (_j = this.config.branding) == null ? void 0 : _j.theme) == null ? void 0 : _k.colors) == null ? void 0 : _l.border) || "#e5e7eb"};
          padding-bottom: 16px;
        ">
          ${((_m = this.config.branding) == null ? void 0 : _m.logo) ? `<img src="${this.config.branding.logo}" alt="Logo" style="width: 32px; height: 32px;">` : '<div style="width: 32px; height: 32px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 8px;"></div>'}
          <div>
            <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: ${((_p = (_o = (_n = this.config.branding) == null ? void 0 : _n.theme) == null ? void 0 : _o.colors) == null ? void 0 : _p.text) || "#1f2937"};">
              ${((_q = this.config.branding) == null ? void 0 : _q.name) || "YAKKL Wallet"}
            </h2>
            <p style="margin: 0; font-size: 14px; color: ${((_t = (_s = (_r = this.config.branding) == null ? void 0 : _r.theme) == null ? void 0 : _s.colors) == null ? void 0 : _t.textSecondary) || "#6b7280"};">
              Embedded Wallet
            </p>
          </div>
        </div>
        
        <div class="wallet-content">
          <div class="account-section" style="margin-bottom: 16px;">
            <div style="font-size: 14px; color: ${((_w = (_v = (_u = this.config.branding) == null ? void 0 : _u.theme) == null ? void 0 : _v.colors) == null ? void 0 : _w.textSecondary) || "#6b7280"}; margin-bottom: 8px;">
              Account
            </div>
            <div style="
              background: ${((_z = (_y = (_x = this.config.branding) == null ? void 0 : _x.theme) == null ? void 0 : _y.colors) == null ? void 0 : _z.surface) || "#f9fafb"};
              padding: 12px;
              border-radius: 8px;
              font-family: monospace;
              font-size: 14px;
              color: ${((_C = (_B = (_A = this.config.branding) == null ? void 0 : _A.theme) == null ? void 0 : _B.colors) == null ? void 0 : _C.text) || "#1f2937"};
            ">
              No account selected
            </div>
          </div>
          
          <div class="actions" style="display: flex; gap: 8px;">
            <button class="create-account-btn" style="
              flex: 1;
              padding: 10px 16px;
              background: ${((_F = (_E = (_D = this.config.branding) == null ? void 0 : _D.theme) == null ? void 0 : _E.colors) == null ? void 0 : _F.primary) || "#6366f1"};
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: opacity 0.2s;
            " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
              Create Account
            </button>
            
            ${this.config.enableMods !== false ? `
              <button class="mods-btn" style="
                padding: 10px 16px;
                background: transparent;
                color: ${((_I = (_H = (_G = this.config.branding) == null ? void 0 : _G.theme) == null ? void 0 : _H.colors) == null ? void 0 : _I.primary) || "#6366f1"};
                border: 1px solid ${((_L = (_K = (_J = this.config.branding) == null ? void 0 : _J.theme) == null ? void 0 : _K.colors) == null ? void 0 : _L.primary) || "#6366f1"};
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
              ">
                Mods
              </button>
            ` : ""}
          </div>
        </div>
      </div>
    `;
    this.container.innerHTML = walletHTML;
    const createBtn = this.container.querySelector(".create-account-btn");
    createBtn == null ? void 0 : createBtn.addEventListener("click", () => {
      this.createAccount("Embedded Account");
    });
    const modsBtn = this.container.querySelector(".mods-btn");
    modsBtn == null ? void 0 : modsBtn.addEventListener("click", () => {
      console.log("Opening mods dashboard...");
    });
  }
  /**
   * Ensure wallet is initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error("Embedded wallet not initialized. Call mount() first.");
    }
  }
}
class EmbeddedProvider extends eventemitter3.EventEmitter {
  constructor(engine) {
    super();
    this._chainId = "0x1";
    this._accounts = [];
    this._isConnected = false;
    this.engine = engine;
    this.initialize();
  }
  async initialize() {
    try {
      const currentNetwork = this.engine.networks.getCurrent();
      if (currentNetwork) {
        this._chainId = `0x${currentNetwork.chainId.toString(16)}`;
      }
      const currentAccount = this.engine.getCurrentAccount();
      if (currentAccount) {
        this._accounts = [currentAccount.address];
      }
      this._isConnected = true;
      this.emit("connect", { chainId: this._chainId });
      this.engine.on("account:selected", (account) => {
        this._accounts = [account.address];
        this.emit("accountsChanged", this._accounts);
      });
      this.engine.on("network:changed", (network) => {
        this._chainId = `0x${network.chainId.toString(16)}`;
        this.emit("chainChanged", this._chainId);
      });
    } catch (error) {
      console.error("Failed to initialize embedded provider:", error);
    }
  }
  /**
   * Standard EIP-1193 request method
   */
  async request(args) {
    var _a, _b, _c, _d, _e, _f, _g;
    const { method, params = [] } = args;
    switch (method) {
      case "eth_requestAccounts":
      case "eth_accounts":
        return this._accounts;
      case "eth_chainId":
        return this._chainId;
      case "net_version":
        return parseInt(this._chainId, 16).toString();
      case "eth_getBalance":
        if (params[0] && this._accounts.includes(params[0])) {
          const balance = await this.engine.transactions.getBalance(params[0]);
          return `0x${BigInt(balance.native.balance).toString(16)}`;
        }
        throw new Error("Address not found");
      case "eth_sendTransaction":
        if (params[0]) {
          const txHash = await this.engine.transactions.send(params[0]);
          return txHash;
        }
        throw new Error("Transaction parameters required");
      case "eth_signTransaction":
        if (params[0]) {
          const signedTx = await this.engine.transactions.sign(params[0]);
          return signedTx.serialized;
        }
        throw new Error("Transaction parameters required");
      case "personal_sign":
      case "eth_sign":
        if (params[0] && params[1]) {
          const currentAccount = this.engine.getCurrentAccount();
          if (currentAccount && this._accounts.includes(params[1])) {
            return await this.engine.accounts.signMessage(currentAccount.id, params[0]);
          }
        }
        throw new Error("Sign parameters required");
      case "wallet_switchEthereumChain":
        if ((_a = params[0]) == null ? void 0 : _a.chainId) {
          const chainId = parseInt(params[0].chainId, 16);
          const networks = this.engine.networks.getSupported();
          const network = networks.find((n) => n.chainId === chainId);
          if (network) {
            await this.engine.networks.switch(network.id);
            return null;
          }
          throw new Error("Chain not supported");
        }
        throw new Error("Chain ID required");
      case "wallet_addEthereumChain":
        if (params[0]) {
          const chainConfig = params[0];
          await this.engine.networks.add({
            name: chainConfig.chainName,
            chainId: parseInt(chainConfig.chainId, 16),
            symbol: ((_b = chainConfig.nativeCurrency) == null ? void 0 : _b.symbol) || "ETH",
            rpcUrl: chainConfig.rpcUrls[0],
            blockExplorerUrl: (_c = chainConfig.blockExplorerUrls) == null ? void 0 : _c[0],
            isTestnet: false,
            isMainnet: false,
            iconUrl: (_d = chainConfig.iconUrls) == null ? void 0 : _d[0],
            gasToken: {
              address: "0x0000000000000000000000000000000000000000",
              symbol: ((_e = chainConfig.nativeCurrency) == null ? void 0 : _e.symbol) || "ETH",
              name: ((_f = chainConfig.nativeCurrency) == null ? void 0 : _f.name) || "Ethereum",
              decimals: ((_g = chainConfig.nativeCurrency) == null ? void 0 : _g.decimals) || 18,
              chainId: parseInt(chainConfig.chainId, 16),
              isNative: true,
              isStable: false
            },
            supportedFeatures: ["contracts", "tokens"]
          });
          return null;
        }
        throw new Error("Chain configuration required");
      case "wallet_getPermissions":
        return [
          {
            id: "accounts",
            parentCapability: "eth_accounts",
            invoker: window.location.origin,
            caveats: [
              {
                type: "restrictReturnedAccounts",
                value: this._accounts
              }
            ]
          }
        ];
      case "wallet_requestPermissions":
        return [
          {
            id: "accounts",
            parentCapability: "eth_accounts",
            invoker: window.location.origin,
            caveats: [
              {
                type: "restrictReturnedAccounts",
                value: this._accounts
              }
            ]
          }
        ];
      default:
        throw new Error(`Method ${method} not supported`);
    }
  }
  /**
   * Legacy send method for backward compatibility
   */
  send(methodOrPayload, paramsOrCallback) {
    if (typeof methodOrPayload === "string") {
      return this.request({ method: methodOrPayload, params: paramsOrCallback });
    } else {
      const callback = paramsOrCallback;
      this.request(methodOrPayload).then((result) => {
        callback(null, { id: methodOrPayload.id, jsonrpc: "2.0", result });
      }).catch((error) => {
        callback(error, null);
      });
    }
  }
  /**
   * Legacy sendAsync method for backward compatibility
   */
  sendAsync(payload, callback) {
    this.request(payload).then((result) => {
      callback(null, { id: payload.id, jsonrpc: "2.0", result });
    }).catch((error) => {
      callback(error, null);
    });
  }
  /**
   * Check if provider is connected
   */
  isConnected() {
    return this._isConnected;
  }
  /**
   * Get current chain ID
   */
  get chainId() {
    return this._chainId;
  }
  /**
   * Get selected accounts
   */
  get selectedAddress() {
    return this._accounts[0] || null;
  }
  /**
   * Enable the provider (for legacy compatibility)
   */
  async enable() {
    return this.request({ method: "eth_requestAccounts" });
  }
}
function createEmbeddedWallet(config) {
  return new EmbeddedWallet(config);
}
class ModBuilder {
  constructor(config) {
    this.manifest = {};
    this.components = [];
    this.capabilities = {};
    this.manifest = {
      id: config.id,
      name: config.name,
      version: config.version,
      description: config.description,
      author: config.author,
      license: config.license || "MIT",
      tier: config.tier || "community",
      category: config.category || "utility",
      tags: config.tags || [],
      permissions: [],
      minimumWalletVersion: "1.0.0",
      supportedPlatforms: ["web", "extension"],
      discoverable: true,
      enhances: [],
      conflicts: [],
      iconUrl: "",
      screenshotUrls: [],
      capabilities: {}
    };
  }
  /**
   * Add UI capabilities to the mod
   */
  withUI(components) {
    this.components.push(...components);
    this.capabilities.ui = {
      components
      // Will be converted to proper type when loaded
    };
    return this;
  }
  /**
   * Add background processing capabilities
   */
  withBackground(scripts) {
    this.capabilities.background = {
      scripts: scripts.map((script, index) => ({
        id: `script-${index}`,
        script,
        persistent: false,
        permissions: []
      }))
    };
    return this;
  }
  /**
   * Add API capabilities
   */
  withAPI(endpoints) {
    this.capabilities.apis = [{
      name: "ModAPI",
      version: "1.0.0",
      endpoints: endpoints.map((endpoint) => ({
        path: endpoint,
        method: "GET",
        handler: endpoint,
        permissions: [],
        rateLimit: { requests: 100, period: 60 }
      }))
    }];
    return this;
  }
  /**
   * Add storage capabilities
   */
  withStorage(maxSize = 1024 * 1024) {
    this.capabilities.storage = {
      encrypted: false,
      shared: false,
      maxSize
    };
    return this;
  }
  /**
   * Add network access capabilities
   */
  withNetwork(allowedHosts) {
    const permissions = allowedHosts.map((host) => `network:${host}`);
    if (this.manifest.permissions) {
      this.manifest.permissions.push(...permissions);
    } else {
      this.manifest.permissions = permissions;
    }
    return this;
  }
  /**
   * Add permissions required by the mod
   */
  withPermissions(permissions) {
    const modPermissions = permissions;
    this.manifest.permissions = [...this.manifest.permissions || [], ...modPermissions];
    return this;
  }
  /**
   * Set mods that this mod enhances
   */
  enhances(modIds) {
    this.manifest.enhances = modIds;
    return this;
  }
  /**
   * Set mods that conflict with this mod
   */
  conflicts(modIds) {
    this.manifest.conflicts = modIds;
    return this;
  }
  /**
   * Set mod metadata
   */
  withMetadata(metadata) {
    Object.assign(this.manifest, metadata);
    return this;
  }
  /**
   * Build the mod manifest
   */
  buildManifest() {
    this.manifest.capabilities = this.capabilities;
    if (!this.manifest.id || !this.manifest.name || !this.manifest.version) {
      throw new Error("Mod manifest missing required fields: id, name, version");
    }
    return this.manifest;
  }
  /**
   * Generate mod template code
   */
  generateTemplate() {
    const manifest = this.buildManifest();
    return `/**
 * ${manifest.name} - ${manifest.description}
 * Generated by YAKKL ModBuilder
 */

import type { Mod, WalletEngine } from '@yakkl/core';

export class ${this.toPascalCase(manifest.id)}Mod implements Mod {
  manifest = ${JSON.stringify(manifest, null, 2)};
  
  private engine: WalletEngine | null = null;
  private loaded = false;
  private active = false;

  async initialize(engine: WalletEngine): Promise<void> {
    this.engine = engine;
    this.loaded = true;
    this.active = true;
    
    // TODO: Add your initialization logic here
    console.log('${manifest.name} mod initialized');
  }

  async destroy(): Promise<void> {
    this.loaded = false;
    this.active = false;
    this.engine = null;
    
    // TODO: Add your cleanup logic here
    console.log('${manifest.name} mod destroyed');
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  isActive(): boolean {
    return this.active;
  }

  getComponent(id: string): any {
    // TODO: Return your UI components
    return null;
  }

  getWidget(id: string): any {
    // TODO: Return your widgets
    return null;
  }

  getBackgroundScript(id: string): any {
    // TODO: Return your background scripts
    return null;
  }

  async handleAPICall(endpoint: string, data: any): Promise<any> {
    // TODO: Handle API calls
    throw new Error('API endpoint not implemented: ' + endpoint);
  }

  emit(event: string, data: any): void {
    // TODO: Emit events
  }

  on(event: string, handler: (data: any) => void): void {
    // TODO: Listen to events
  }

  off(event: string, handler: (data: any) => void): void {
    // TODO: Remove event listeners
  }

  async enhance(otherMod: Mod): Promise<boolean> {
    // TODO: Enhance other mods
    return false;
  }

  getEnhancements(): any[] {
    // TODO: Return available enhancements
    return [];
  }
}

export default ${this.toPascalCase(manifest.id)}Mod;
`;
  }
  /**
   * Convert string to PascalCase
   */
  toPascalCase(str) {
    return str.split(/[-_\s]/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join("");
  }
}
class ModTemplate {
  static portfolioTracker(config) {
    return new ModBuilder({
      ...config,
      description: config.description || "Track and analyze your crypto portfolio",
      category: "finance",
      tags: ["portfolio", "tracking", "analytics"],
      tier: "community",
      version: "2.0.2"
    }).withUI([
      {
        id: "portfolio-widget",
        name: "Portfolio Widget",
        type: "widget",
        mountPoint: "dashboard",
        props: {}
      }
    ]).withStorage(5 * 1024 * 1024).withPermissions(["storage", "network"]).withNetwork(["api.coingecko.com", "api.coinmarketcap.com"]);
  }
  static tradingBot(config) {
    return new ModBuilder({
      ...config,
      description: config.description || "Automated trading strategies",
      category: "trading",
      tags: ["trading", "automation", "bot"],
      tier: "pro",
      version: "2.0.2"
    }).withBackground(["trading-engine.js"]).withAPI(["execute-trade", "get-strategies"]).withStorage(10 * 1024 * 1024).withPermissions(["storage", "network", "transactions"]).withNetwork(["api.binance.com", "api.coinbase.com"]);
  }
  static defiDashboard(config) {
    return new ModBuilder({
      ...config,
      description: config.description || "Monitor DeFi positions and yields",
      category: "defi",
      tags: ["defi", "yield", "dashboard"],
      tier: "community",
      version: "2.0.2"
    }).withUI([
      {
        id: "defi-dashboard",
        name: "DeFi Dashboard",
        type: "page",
        mountPoint: "dashboard",
        props: {}
      }
    ]).withNetwork(["api.defipulse.com", "api.yearn.finance"]).withPermissions(["storage", "network"]);
  }
  static nftGallery(config) {
    return new ModBuilder({
      ...config,
      description: config.description || "Display and manage NFT collections",
      category: "nft",
      tags: ["nft", "gallery", "collectibles"],
      tier: "community",
      version: "2.0.2"
    }).withUI([
      {
        id: "nft-gallery",
        name: "NFT Gallery",
        type: "page",
        mountPoint: "portfolio",
        props: {}
      }
    ]).withStorage(50 * 1024 * 1024).withNetwork(["api.opensea.io", "api.rarible.org"]).withPermissions(["storage", "network"]);
  }
  static priceAlerts(config) {
    return new ModBuilder({
      ...config,
      description: config.description || "Set price alerts for cryptocurrencies",
      category: "alerts",
      tags: ["alerts", "notifications", "price"],
      tier: "community",
      version: "2.0.2"
    }).withBackground(["price-monitor.js"]).withUI([
      {
        id: "alert-settings",
        name: "Alert Settings",
        type: "modal",
        mountPoint: "settings",
        props: {}
      }
    ]).withStorage(1 * 1024 * 1024).withNetwork(["api.coingecko.com"]).withPermissions(["storage", "network", "notifications"]);
  }
  static transactionAnalyzer(config) {
    return new ModBuilder({
      ...config,
      description: config.description || "Analyze transaction patterns and costs",
      category: "analytics",
      tags: ["analytics", "transactions", "gas"],
      tier: "pro",
      version: "2.0.2"
    }).withUI([
      {
        id: "tx-analyzer",
        name: "Transaction Analyzer",
        type: "page",
        mountPoint: "transaction",
        props: {}
      }
    ]).withStorage(20 * 1024 * 1024).withNetwork(["api.etherscan.io", "api.polygonscan.com"]).withPermissions(["storage", "network", "transactions"]);
  }
  static securityScanner(config) {
    return new ModBuilder({
      ...config,
      description: config.description || "Scan transactions and contracts for security issues",
      category: "security",
      tags: ["security", "scanner", "audit"],
      tier: "private",
      version: "2.0.2"
    }).withBackground(["security-scanner.js"]).withAPI(["scan-transaction", "scan-contract"]).withStorage(5 * 1024 * 1024).withNetwork(["api.slither.io", "api.mythx.io"]).withPermissions(["storage", "network", "transactions"]);
  }
  static backupManager(config) {
    return new ModBuilder({
      ...config,
      description: config.description || "Secure backup and recovery management",
      category: "security",
      tags: ["backup", "recovery", "security"],
      tier: "enterprise",
      version: "2.0.2"
    }).withUI([
      {
        id: "backup-settings",
        name: "Backup Settings",
        type: "page",
        mountPoint: "settings",
        props: {}
      }
    ]).withBackground(["backup-scheduler.js"]).withStorage(100 * 1024 * 1024).withPermissions(["storage", "network", "accounts"]);
  }
  /**
   * Create a mod from a template
   */
  static create(type, config) {
    switch (type) {
      case "portfolio-tracker":
        return this.portfolioTracker(config);
      case "trading-bot":
        return this.tradingBot(config);
      case "defi-dashboard":
        return this.defiDashboard(config);
      case "nft-gallery":
        return this.nftGallery(config);
      case "price-alerts":
        return this.priceAlerts(config);
      case "transaction-analyzer":
        return this.transactionAnalyzer(config);
      case "security-scanner":
        return this.securityScanner(config);
      case "backup-manager":
        return this.backupManager(config);
      default:
        throw new Error(`Unknown template type: ${type}`);
    }
  }
  /**
   * Get available template types
   */
  static getAvailableTemplates() {
    return [
      "portfolio-tracker",
      "trading-bot",
      "defi-dashboard",
      "nft-gallery",
      "price-alerts",
      "transaction-analyzer",
      "security-scanner",
      "backup-manager"
    ];
  }
  /**
   * Get template description
   */
  static getTemplateDescription(type) {
    const descriptions = {
      "portfolio-tracker": "Track and analyze your crypto portfolio with real-time data",
      "trading-bot": "Automated trading strategies with risk management",
      "defi-dashboard": "Monitor DeFi positions, yields, and opportunities",
      "nft-gallery": "Display and manage NFT collections with metadata",
      "price-alerts": "Set customizable price alerts with notifications",
      "transaction-analyzer": "Analyze transaction patterns, costs, and optimization",
      "security-scanner": "Scan transactions and contracts for security vulnerabilities",
      "backup-manager": "Secure backup and recovery management system"
    };
    return descriptions[type];
  }
}
function createMod(config) {
  return new ModBuilder(config);
}
function createModFromTemplate(type, config) {
  return ModTemplate.create(type, config);
}
const modTemplates = {
  portfolioTracker: (config) => ModTemplate.portfolioTracker(config),
  tradingBot: (config) => ModTemplate.tradingBot(config),
  defiDashboard: (config) => ModTemplate.defiDashboard(config),
  nftGallery: (config) => ModTemplate.nftGallery(config),
  priceAlerts: (config) => ModTemplate.priceAlerts(config),
  transactionAnalyzer: (config) => ModTemplate.transactionAnalyzer(config),
  securityScanner: (config) => ModTemplate.securityScanner(config),
  backupManager: (config) => ModTemplate.backupManager(config)
};
function generateModPackage(builder) {
  var _a;
  const manifest = builder.buildManifest();
  const modClass = builder.generateTemplate();
  const packageJson = JSON.stringify({
    name: `@yakkl/mod-${manifest.id}`,
    version: manifest.version,
    description: manifest.description,
    main: "dist/index.js",
    types: "dist/index.d.ts",
    files: ["dist", "README.md"],
    scripts: {
      build: "tsc",
      dev: "tsc --watch",
      prepublishOnly: "npm run build"
    },
    dependencies: {
      "@yakkl/core": "workspace:*"
    },
    devDependencies: {
      "typescript": "^5.0.0"
    },
    keywords: ["yakkl", "wallet", "mod", "plugin", ...manifest.tags],
    author: manifest.author,
    license: manifest.license,
    repository: manifest.repository,
    homepage: manifest.website
  }, null, 2);
  const readme = `# ${manifest.name}

${manifest.description}

## Installation

\`\`\`bash
npm install @yakkl/mod-${manifest.id}
\`\`\`

## Usage

This mod is automatically loaded by YAKKL Wallet when installed.

## Features

${manifest.tags.map((tag) => `- ${tag.charAt(0).toUpperCase() + tag.slice(1)}`).join("\n")}

## Permissions

${((_a = manifest.permissions) == null ? void 0 : _a.map((permission) => `- ${permission}`).join("\n")) || "None"}

## Author

${manifest.author}

## License

${manifest.license}
`;
  return {
    manifest: JSON.stringify(manifest, null, 2),
    index: modClass,
    packageJson,
    readme
  };
}
class BrandingManager {
  constructor(config) {
    this.styleElement = null;
    this.applied = false;
    this.config = config;
  }
  /**
   * Apply branding to the current page
   */
  async apply() {
    if (this.applied) return;
    try {
      this.applyCSSVariables();
      if (this.config.fonts) {
        await this.loadFonts();
      }
      this.updatePageMetadata();
      this.applied = true;
    } catch (error) {
      console.error("Failed to apply branding:", error);
      throw error;
    }
  }
  /**
   * Update branding configuration
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
    if (this.applied) {
      this.cleanup();
      this.apply();
    }
  }
  /**
   * Get current branding configuration
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * Generate CSS for the branding
   */
  generateCSS() {
    const { colors, theme } = this.config;
    return `
      :root {
        --yakkl-brand-primary: ${colors.primary};
        --yakkl-brand-secondary: ${colors.secondary};
        --yakkl-brand-accent: ${colors.accent};
        --yakkl-brand-background: ${colors.background};
        --yakkl-brand-surface: ${colors.surface};
        --yakkl-brand-text: ${colors.text};
        --yakkl-brand-theme: ${theme || "auto"};
      }
      
      .yakkl-branded {
        --primary: var(--yakkl-brand-primary);
        --secondary: var(--yakkl-brand-secondary);
        --accent: var(--yakkl-brand-accent);
        background-color: var(--yakkl-brand-background);
        color: var(--yakkl-brand-text);
      }
      
      .yakkl-branded .btn-primary {
        background-color: var(--yakkl-brand-primary);
        border-color: var(--yakkl-brand-primary);
      }
      
      .yakkl-branded .btn-secondary {
        background-color: var(--yakkl-brand-secondary);
        border-color: var(--yakkl-brand-secondary);
      }
      
      .yakkl-branded .text-primary {
        color: var(--yakkl-brand-primary);
      }
      
      .yakkl-branded .bg-primary {
        background-color: var(--yakkl-brand-primary);
      }
    `;
  }
  /**
   * Create branded component wrapper
   */
  createBrandedWrapper(element) {
    var _a;
    const wrapper = document.createElement("div");
    wrapper.className = "yakkl-branded";
    wrapper.style.cssText = `
      --primary: ${this.config.colors.primary};
      --secondary: ${this.config.colors.secondary};
      --accent: ${this.config.colors.accent};
      background-color: ${this.config.colors.background};
      color: ${this.config.colors.text};
    `;
    if ((_a = this.config.fonts) == null ? void 0 : _a.primary) {
      wrapper.style.fontFamily = this.config.fonts.primary;
    }
    wrapper.appendChild(element);
    return wrapper;
  }
  /**
   * Get logo URL
   */
  getLogoUrl() {
    return this.config.logo;
  }
  /**
   * Get brand name
   */
  getBrandName() {
    return this.config.name;
  }
  /**
   * Check if dark theme should be used
   */
  isDarkTheme() {
    if (this.config.theme === "dark") return true;
    if (this.config.theme === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  /**
   * Cleanup applied branding
   */
  async cleanup() {
    if (this.styleElement && this.styleElement.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement);
      this.styleElement = null;
    }
    const root = document.documentElement;
    root.style.removeProperty("--yakkl-brand-primary");
    root.style.removeProperty("--yakkl-brand-secondary");
    root.style.removeProperty("--yakkl-brand-accent");
    root.style.removeProperty("--yakkl-brand-background");
    root.style.removeProperty("--yakkl-brand-surface");
    root.style.removeProperty("--yakkl-brand-text");
    root.style.removeProperty("--yakkl-brand-theme");
    this.applied = false;
  }
  /**
   * Private methods
   */
  applyCSSVariables() {
    const css = this.generateCSS();
    this.styleElement = document.createElement("style");
    this.styleElement.textContent = css;
    this.styleElement.setAttribute("data-yakkl-branding", "true");
    document.head.appendChild(this.styleElement);
    const root = document.documentElement;
    Object.entries(this.config.colors).forEach(([key, value]) => {
      root.style.setProperty(`--yakkl-brand-${key}`, value);
    });
  }
  async loadFonts() {
    const { fonts } = this.config;
    if (!fonts) return;
    const fontPromises = [];
    if (fonts.primary) {
      fontPromises.push(this.loadFont(fonts.primary));
    }
    if (fonts.secondary) {
      fontPromises.push(this.loadFont(fonts.secondary));
    }
    await Promise.all(fontPromises);
  }
  async loadFont(fontFamily) {
    if (fontFamily.includes("http") || fontFamily.includes("fonts.googleapis.com")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = fontFamily;
      document.head.appendChild(link);
      return new Promise((resolve) => {
        link.onload = () => resolve();
        link.onerror = () => resolve();
      });
    }
    return Promise.resolve();
  }
  updatePageMetadata() {
    if (document.title.includes("YAKKL")) {
      document.title = document.title.replace("YAKKL", this.config.name);
    }
    if (this.config.logo && (this.config.logo.endsWith(".ico") || this.config.logo.endsWith(".png") || this.config.logo.endsWith(".svg"))) {
      let favicon = document.querySelector('link[rel="icon"]');
      if (!favicon) {
        favicon = document.createElement("link");
        favicon.rel = "icon";
        document.head.appendChild(favicon);
      }
      favicon.href = this.config.logo;
    }
  }
}
class WhiteLabelWallet {
  constructor(config) {
    this.engine = null;
    this.initialized = false;
    this.config = config;
    this.branding = new BrandingManager(config.branding);
  }
  /**
   * Initialize the white label wallet
   */
  async initialize() {
    var _a, _b;
    if (this.initialized) return;
    try {
      const { createWallet } = await import("@yakkl/core");
      this.engine = await createWallet({
        name: this.config.appName,
        version: this.config.appVersion,
        embedded: true,
        restrictions: this.mapRestrictions(),
        enableMods: false,
        // Disable mods for white label
        enableDiscovery: false,
        storagePrefix: `whitelabel:${this.config.appName}`,
        logLevel: "warn",
        branding: {
          name: this.config.branding.name,
          logo: this.config.branding.logo,
          theme: this.config.branding.colors,
          whiteLabel: true
        }
      });
      await this.branding.apply();
      this.setupCallbacks();
      this.initialized = true;
    } catch (error) {
      (_b = (_a = this.config.callbacks) == null ? void 0 : _a.onError) == null ? void 0 : _b.call(_a, error);
      throw error;
    }
  }
  /**
   * Get the wallet engine
   */
  getEngine() {
    if (!this.engine) {
      throw new Error("White label wallet not initialized");
    }
    return this.engine;
  }
  /**
   * Get branding manager
   */
  getBrandingManager() {
    return this.branding;
  }
  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature) {
    var _a;
    return ((_a = this.config.features) == null ? void 0 : _a[feature]) ?? false;
  }
  /**
   * Get wallet configuration
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * Update branding at runtime
   */
  async updateBranding(branding) {
    this.config.branding = { ...this.config.branding, ...branding };
    this.branding.updateConfig(this.config.branding);
    await this.branding.apply();
  }
  /**
   * Create embedded wallet UI
   */
  createEmbeddedUI(container, options) {
    const iframe = document.createElement("iframe");
    iframe.style.width = (options == null ? void 0 : options.width) || "400px";
    iframe.style.height = (options == null ? void 0 : options.height) || "600px";
    iframe.style.border = "none";
    iframe.style.borderRadius = "12px";
    iframe.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
    const params = new URLSearchParams({
      appName: this.config.appName,
      theme: JSON.stringify(this.config.branding.colors),
      mode: (options == null ? void 0 : options.mode) || "inline"
    });
    iframe.src = `/wallet-embed?${params.toString()}`;
    container.appendChild(iframe);
    return iframe;
  }
  /**
   * Destroy the white label wallet
   */
  async destroy() {
    if (this.engine) {
      await this.engine.destroy();
      this.engine = null;
    }
    await this.branding.cleanup();
    this.initialized = false;
  }
  /**
   * Private methods
   */
  mapRestrictions() {
    var _a, _b, _c;
    const restrictions = [];
    if ((_a = this.config.restrictions) == null ? void 0 : _a.requireKYC) {
      restrictions.push("enterprise-only");
    }
    if ((_c = (_b = this.config.restrictions) == null ? void 0 : _b.allowedNetworks) == null ? void 0 : _c.length) {
      restrictions.push("no-external-connections");
    }
    return restrictions;
  }
  setupCallbacks() {
    if (!this.engine) return;
    this.engine.on("transaction:signed", (signedTx) => {
      var _a, _b, _c, _d;
      (_b = (_a = this.config.callbacks) == null ? void 0 : _a.onTransactionSigned) == null ? void 0 : _b.call(_a, signedTx.hash);
      (_d = (_c = this.config.callbacks) == null ? void 0 : _c.onUserAction) == null ? void 0 : _d.call(_c, "transaction:signed", { hash: signedTx.hash });
    });
    this.engine.on("account:selected", (account) => {
      var _a, _b;
      (_b = (_a = this.config.callbacks) == null ? void 0 : _a.onUserAction) == null ? void 0 : _b.call(_a, "account:selected", { address: account.address });
    });
    this.engine.on("network:changed", (network) => {
      var _a, _b;
      (_b = (_a = this.config.callbacks) == null ? void 0 : _a.onUserAction) == null ? void 0 : _b.call(_a, "network:changed", { chainId: network.chainId });
    });
  }
}
function createWhiteLabelWallet(config) {
  return new WhiteLabelWallet(config);
}
function createBrandingManager(config) {
  return new BrandingManager(config);
}
function createQuickWhiteLabelWallet(options) {
  var _a, _b, _c, _d, _e, _f;
  const config = {
    apiKey: options.apiKey,
    appName: options.appName,
    appVersion: "1.0.0",
    branding: {
      name: options.appName,
      logo: options.logo || "",
      colors: {
        primary: options.primaryColor,
        secondary: adjustColor(options.primaryColor, -20),
        accent: adjustColor(options.primaryColor, 20),
        background: "#ffffff",
        surface: "#f8f9fa",
        text: "#212529"
      },
      theme: "auto"
    },
    features: {
      enableSwap: ((_a = options.features) == null ? void 0 : _a.includes("swap")) ?? true,
      enableBuy: ((_b = options.features) == null ? void 0 : _b.includes("buy")) ?? true,
      enableStaking: ((_c = options.features) == null ? void 0 : _c.includes("staking")) ?? false,
      enableNFTs: ((_d = options.features) == null ? void 0 : _d.includes("nfts")) ?? true,
      enableDeFi: ((_e = options.features) == null ? void 0 : _e.includes("defi")) ?? false,
      customNetworks: ((_f = options.features) == null ? void 0 : _f.includes("custom-networks")) ?? false
    }
  };
  return new WhiteLabelWallet(config);
}
function createEnterpriseWhiteLabelWallet(options) {
  const config = {
    apiKey: options.apiKey,
    appName: options.appName,
    appVersion: "1.0.0",
    branding: options.branding,
    features: {
      enableSwap: true,
      enableBuy: true,
      enableStaking: true,
      enableNFTs: true,
      enableDeFi: true,
      customNetworks: true
    },
    restrictions: {
      allowedNetworks: options.allowedNetworks,
      maxTransactionAmount: options.maxTransactionAmount,
      requireKYC: options.requireKYC ?? false
    }
  };
  return new WhiteLabelWallet(config);
}
const whitelabelTemplates = {
  /**
   * Simple trading wallet
   */
  trading: (apiKey, appName, primaryColor) => createQuickWhiteLabelWallet({
    apiKey,
    appName,
    primaryColor,
    features: ["swap", "buy"]
  }),
  /**
   * Full-featured DeFi wallet
   */
  defi: (apiKey, appName, primaryColor) => createQuickWhiteLabelWallet({
    apiKey,
    appName,
    primaryColor,
    features: ["swap", "buy", "staking", "defi", "custom-networks"]
  }),
  /**
   * NFT-focused wallet
   */
  nft: (apiKey, appName, primaryColor) => createQuickWhiteLabelWallet({
    apiKey,
    appName,
    primaryColor,
    features: ["nfts", "buy"]
  }),
  /**
   * Enterprise custody wallet
   */
  custody: (apiKey, appName, branding) => createEnterpriseWhiteLabelWallet({
    apiKey,
    appName,
    branding,
    requireKYC: true,
    allowedNetworks: ["ethereum", "polygon"]
  })
};
function adjustColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 255) + amt;
  const B = (num & 255) + amt;
  return "#" + (16777216 + (R < 255 ? R < 1 ? 0 : R : 255) * 65536 + (G < 255 ? G < 1 ? 0 : G : 255) * 256 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}
class YakklProvider extends eventemitter3.EventEmitter {
  constructor(config = {}) {
    super();
    this.isYakkl = true;
    this.isMetaMask = false;
    this.engine = null;
    this._accounts = [];
    this._chainId = "0x1";
    this._connected = false;
    this._initialized = false;
    this.config = {
      network: "ethereum",
      autoConnect: false,
      enableMods: true,
      logLevel: "warn",
      ...config
    };
  }
  /**
   * Initialize the provider
   */
  async initialize() {
    if (this._initialized) return;
    try {
      const { createWallet } = await import("@yakkl/core");
      this.engine = await createWallet({
        name: "YAKKL Provider",
        version: "1.0.0",
        embedded: true,
        enableMods: this.config.enableMods,
        logLevel: this.config.logLevel || "warn"
      });
      this.setupEventListeners();
      this._initialized = true;
      if (this.config.autoConnect) {
        await this.connect();
      }
    } catch (error) {
      console.error("Failed to initialize YAKKL provider:", error);
      throw error;
    }
  }
  /**
   * Connect to the wallet
   */
  async connect() {
    if (!this.engine) {
      throw new Error("Provider not initialized");
    }
    try {
      const accounts = await this.engine.accounts.getAll();
      this._accounts = accounts.map((account) => account.address);
      if (this._accounts.length === 0) {
        const newAccount = await this.engine.accounts.create();
        this._accounts = [newAccount.address];
      }
      const currentNetwork = await this.engine.networks.getCurrent();
      if (currentNetwork) {
        this._chainId = `0x${currentNetwork.chainId.toString(16)}`;
      } else {
        this._chainId = "0x1";
      }
      this._connected = true;
      this.emit("connect", this._accounts);
      this.emit("accountsChanged", this._accounts);
      return this._accounts;
    } catch (error) {
      console.error("Failed to connect:", error);
      throw error;
    }
  }
  /**
   * Disconnect from the wallet
   */
  async disconnect() {
    this._connected = false;
    this._accounts = [];
    this.emit("disconnect");
    this.emit("accountsChanged", []);
  }
  /**
   * Send an RPC request
   */
  async request(args) {
    var _a;
    if (!this.engine) {
      throw new Error("Provider not initialized");
    }
    const { method, params = [] } = args;
    switch (method) {
      case "eth_requestAccounts":
        return await this.connect();
      case "eth_accounts":
        return this._accounts;
      case "eth_chainId":
        return this._chainId;
      case "net_version":
        return parseInt(this._chainId, 16).toString();
      case "eth_getBalance":
        if (!params[0]) throw new Error("Address required");
        const balance = await this.engine.getBalance(params[0]);
        return balance.native;
      case "eth_sendTransaction":
        if (!params[0]) throw new Error("Transaction object required");
        const txHash = await this.engine.transactions.send(params[0]);
        return txHash;
      case "eth_signTransaction":
        if (!params[0]) throw new Error("Transaction object required");
        const signedTx = await this.engine.transactions.sign(params[0]);
        return signedTx;
      case "personal_sign":
      case "eth_sign":
        if (!params[0] || !params[1]) throw new Error("Message and address required");
        throw new Error("Message signing not yet implemented");
      case "eth_signTypedData":
      case "eth_signTypedData_v4":
        if (!params[0] || !params[1]) throw new Error("Address and typed data required");
        throw new Error("Typed data signing not yet implemented");
      case "wallet_switchEthereumChain":
        if (!((_a = params[0]) == null ? void 0 : _a.chainId)) throw new Error("Chain ID required");
        return await this.switchChain(params[0].chainId);
      case "wallet_addEthereumChain":
        if (!params[0]) throw new Error("Chain parameters required");
        return await this.addChain(params[0]);
      case "wallet_getPermissions":
        return [{ parentCapability: "eth_accounts" }];
      case "wallet_requestPermissions":
        return [{ parentCapability: "eth_accounts" }];
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }
  /**
   * Check if the provider is connected
   */
  isConnected() {
    return this._connected;
  }
  /**
   * Get current accounts
   */
  get accounts() {
    return [...this._accounts];
  }
  /**
   * Get current chain ID
   */
  get chainId() {
    return this._chainId;
  }
  /**
   * Get the wallet engine instance
   */
  getEngine() {
    return this.engine;
  }
  /**
   * Private methods
   */
  async switchChain(chainId) {
    if (!this.engine) throw new Error("Provider not initialized");
    const numericChainId = parseInt(chainId, 16);
    try {
      await this.engine.networks.switch(numericChainId.toString());
      this._chainId = chainId;
      this.emit("chainChanged", chainId);
    } catch (error) {
      throw new Error(`Failed to switch to chain ${chainId}: ${error}`);
    }
  }
  async addChain(chainParams) {
    if (!this.engine) throw new Error("Provider not initialized");
    const { chainId, chainName, rpcUrls, nativeCurrency, blockExplorerUrls } = chainParams;
    try {
      const networkChainId = parseInt(chainId, 16);
      await this.engine.networks.add({
        chainId: networkChainId,
        name: chainName,
        rpcUrl: rpcUrls[0],
        symbol: (nativeCurrency == null ? void 0 : nativeCurrency.symbol) || "ETH",
        blockExplorerUrl: (blockExplorerUrls == null ? void 0 : blockExplorerUrls[0]) || "",
        isTestnet: false,
        isMainnet: networkChainId === 1,
        gasToken: {
          address: "0x0000000000000000000000000000000000000000",
          symbol: (nativeCurrency == null ? void 0 : nativeCurrency.symbol) || "ETH",
          decimals: (nativeCurrency == null ? void 0 : nativeCurrency.decimals) || 18,
          name: (nativeCurrency == null ? void 0 : nativeCurrency.name) || chainName,
          chainId: networkChainId
        },
        supportedFeatures: ["eip1559", "contracts", "tokens", "nft"]
      });
    } catch (error) {
      throw new Error(`Failed to add chain: ${error}`);
    }
  }
  setupEventListeners() {
    if (!this.engine) return;
    this.engine.on("account:selected", (account) => {
      this._accounts = [account.address];
      this.emit("accountsChanged", this._accounts);
    });
    this.engine.on("network:changed", (network) => {
      this._chainId = `0x${network.chainId.toString(16)}`;
      this.emit("chainChanged", this._chainId);
    });
    this.engine.on("transaction:signed", (transaction) => {
      this.emit("message", {
        type: "transaction:signed",
        data: transaction
      });
    });
  }
}
function createYakklProvider(config) {
  return new YakklProvider(config);
}
class WalletConnector extends eventemitter3.EventEmitter {
  constructor() {
    super();
    this.connectedWallet = null;
    this.provider = null;
    this.yakklProvider = null;
    this.setupYakklProvider();
  }
  /**
   * Get available wallets
   */
  getAvailableWallets() {
    var _a, _b;
    const wallets = [
      {
        name: "YAKKL Wallet",
        icon: "/yakkl-icon.svg",
        description: "Connect with YAKKL Wallet",
        installed: true,
        provider: this.yakklProvider
      }
    ];
    if (typeof window !== "undefined" && ((_a = window.ethereum) == null ? void 0 : _a.isMetaMask)) {
      wallets.push({
        name: "MetaMask",
        icon: "/metamask-icon.svg",
        description: "Connect with MetaMask",
        installed: true,
        provider: window.ethereum
      });
    }
    if (typeof window !== "undefined" && ((_b = window.ethereum) == null ? void 0 : _b.isCoinbaseWallet)) {
      wallets.push({
        name: "Coinbase Wallet",
        icon: "/coinbase-icon.svg",
        description: "Connect with Coinbase Wallet",
        installed: true,
        provider: window.ethereum
      });
    }
    if (typeof window !== "undefined" && window.WalletConnect) {
      wallets.push({
        name: "WalletConnect",
        icon: "/walletconnect-icon.svg",
        description: "Connect with WalletConnect",
        installed: true,
        provider: null
        // WalletConnect requires special handling
      });
    }
    return wallets;
  }
  /**
   * Connect to a specific wallet
   */
  async connect(walletName) {
    const wallet = this.getAvailableWallets().find((w) => w.name === walletName);
    if (!wallet) {
      throw new Error(`Wallet ${walletName} not found`);
    }
    if (!wallet.installed) {
      throw new Error(`Wallet ${walletName} is not installed`);
    }
    try {
      let accounts = [];
      if (wallet.name === "YAKKL Wallet") {
        if (!this.yakklProvider) {
          throw new Error("YAKKL provider not initialized");
        }
        await this.yakklProvider.initialize();
        accounts = await this.yakklProvider.connect();
        this.provider = this.yakklProvider;
      } else {
        if (!wallet.provider) {
          throw new Error(`Provider not available for ${walletName}`);
        }
        this.provider = wallet.provider;
        accounts = await this.provider.request({ method: "eth_requestAccounts" });
      }
      this.connectedWallet = wallet;
      this.setupProviderListeners();
      this.emit("walletConnected", wallet, accounts);
      return accounts;
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }
  /**
   * Disconnect from current wallet
   */
  async disconnect() {
    if (!this.connectedWallet) return;
    try {
      if (this.connectedWallet.name === "YAKKL Wallet" && this.yakklProvider) {
        await this.yakklProvider.disconnect();
      }
      const wallet = this.connectedWallet;
      this.connectedWallet = null;
      this.provider = null;
      this.emit("walletDisconnected", wallet);
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }
  /**
   * Send a request to the connected wallet
   */
  async request(args) {
    if (!this.provider) {
      throw new Error("No wallet connected");
    }
    try {
      return await this.provider.request(args);
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }
  /**
   * Check if a wallet is connected
   */
  isConnected() {
    return this.connectedWallet !== null;
  }
  /**
   * Get currently connected wallet
   */
  getConnectedWallet() {
    return this.connectedWallet;
  }
  /**
   * Get the current provider
   */
  getProvider() {
    return this.provider;
  }
  /**
   * Get current accounts
   */
  async getAccounts() {
    if (!this.provider) return [];
    try {
      return await this.provider.request({ method: "eth_accounts" });
    } catch (error) {
      return [];
    }
  }
  /**
   * Get current chain ID
   */
  async getChainId() {
    if (!this.provider) return "0x1";
    try {
      return await this.provider.request({ method: "eth_chainId" });
    } catch (error) {
      return "0x1";
    }
  }
  /**
   * Switch to a different network
   */
  async switchNetwork(chainId) {
    if (!this.provider) {
      throw new Error("No wallet connected");
    }
    try {
      await this.provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId }]
      });
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }
  /**
   * Add a new network to the wallet
   */
  async addNetwork(networkParams) {
    if (!this.provider) {
      throw new Error("No wallet connected");
    }
    try {
      await this.provider.request({
        method: "wallet_addEthereumChain",
        params: [networkParams]
      });
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }
  /**
   * Sign a message
   */
  async signMessage(address, message) {
    if (!this.provider) {
      throw new Error("No wallet connected");
    }
    try {
      return await this.provider.request({
        method: "personal_sign",
        params: [message, address]
      });
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }
  /**
   * Private methods
   */
  setupYakklProvider() {
    this.yakklProvider = new YakklProvider({
      autoConnect: false,
      enableMods: true
    });
  }
  setupProviderListeners() {
    if (!this.provider) return;
    this.removeAllListeners();
    if (this.provider.on) {
      this.provider.on("accountsChanged", (accounts) => {
        this.emit("accountsChanged", accounts);
      });
      this.provider.on("chainChanged", (chainId) => {
        this.emit("chainChanged", chainId);
      });
      this.provider.on("disconnect", () => {
        if (this.connectedWallet) {
          const wallet = this.connectedWallet;
          this.connectedWallet = null;
          this.provider = null;
          this.emit("walletDisconnected", wallet);
        }
      });
    }
  }
}
function createWalletConnector() {
  return new WalletConnector();
}
class EventBridge extends eventemitter3.EventEmitter {
  // 30 seconds
  constructor(options = {}) {
    super();
    this.pendingRequests = /* @__PURE__ */ new Map();
    this.requestTimeout = 3e4;
    this.messageHandler = (event) => {
      if (this.allowedOrigins.length > 0 && !this.allowedOrigins.includes("*") && !this.allowedOrigins.includes(event.origin)) {
        return;
      }
      const message = event.data;
      if (!this.isValidMessage(message)) {
        return;
      }
      if (message.target !== this.instanceId && message.target !== "*") {
        return;
      }
      if (message.type.endsWith(":response")) {
        this.handleResponse(message);
        return;
      }
      this.emit("message", message);
      if (message.data && typeof message.data === "object" && !message.type.endsWith(":response")) {
        this.emit("request", message);
      }
    };
    this.instanceId = options.instanceId || this.generateId();
    this.allowedOrigins = options.allowedOrigins || ["*"];
    this.requestTimeout = options.requestTimeout || 3e4;
    this.setupMessageListener();
  }
  /**
   * Send a message to a target
   */
  send(target, type, data = {}) {
    const message = {
      id: this.generateId(),
      type,
      source: this.instanceId,
      target,
      data,
      timestamp: Date.now()
    };
    this.postMessage(message);
  }
  /**
   * Send a request and wait for response
   */
  async request(target, type, data = {}) {
    const message = {
      id: this.generateId(),
      type,
      source: this.instanceId,
      target,
      data,
      timestamp: Date.now()
    };
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(message.id);
        reject(new Error(`Request timeout: ${type}`));
      }, this.requestTimeout);
      this.pendingRequests.set(message.id, {
        resolve,
        reject,
        timeout
      });
      this.postMessage(message);
    });
  }
  /**
   * Respond to a request
   */
  respond(originalMessage, data) {
    const response = {
      id: this.generateId(),
      type: `${originalMessage.type}:response`,
      source: this.instanceId,
      target: originalMessage.source,
      data: {
        requestId: originalMessage.id,
        ...data
      },
      timestamp: Date.now()
    };
    this.postMessage(response);
  }
  /**
   * Register a handler for a specific message type
   */
  onMessage(type, handler) {
    this.on("message", (message) => {
      if (message.type === type) {
        handler(message.data, message);
      }
    });
  }
  /**
   * Register a handler for a specific request type
   */
  onRequest(type, handler) {
    this.on("request", async (message) => {
      if (message.type === type) {
        try {
          const result = await handler(message.data, message);
          this.respond(message, { success: true, result });
        } catch (error) {
          this.respond(message, {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
    });
  }
  /**
   * Set allowed origins for security
   */
  setAllowedOrigins(origins) {
    this.allowedOrigins = origins;
  }
  /**
   * Connect to a specific window/frame
   */
  connectToWindow(targetWindow, targetOrigin = "*") {
    this.postMessage = (message) => {
      targetWindow.postMessage(message, targetOrigin);
    };
  }
  /**
   * Connect to parent window (for iframes)
   */
  connectToParent() {
    if (window.parent && window.parent !== window) {
      this.connectToWindow(window.parent);
    }
  }
  /**
   * Connect to opener window (for popups)
   */
  connectToOpener() {
    if (window.opener) {
      this.connectToWindow(window.opener);
    }
  }
  /**
   * Broadcast to all connected windows
   */
  broadcast(type, data = {}) {
    const message = {
      id: this.generateId(),
      type,
      source: this.instanceId,
      target: "*",
      data,
      timestamp: Date.now()
    };
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, "*");
    }
    if (window.opener) {
      window.opener.postMessage(message, "*");
    }
  }
  /**
   * Create a secure channel between two instances
   */
  createSecureChannel(target, sharedSecret) {
    return new SecureChannel(this, target, sharedSecret);
  }
  /**
   * Destroy the bridge and clean up
   */
  destroy() {
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error("Bridge destroyed"));
    }
    this.pendingRequests.clear();
    this.removeAllListeners();
    if (typeof window !== "undefined") {
      window.removeEventListener("message", this.messageHandler);
    }
  }
  setupMessageListener() {
    if (typeof window !== "undefined") {
      window.addEventListener("message", this.messageHandler);
    }
  }
  handleResponse(message) {
    var _a;
    const requestId = (_a = message.data) == null ? void 0 : _a.requestId;
    if (!requestId || !this.pendingRequests.has(requestId)) {
      return;
    }
    const request = this.pendingRequests.get(requestId);
    this.pendingRequests.delete(requestId);
    clearTimeout(request.timeout);
    if (message.data.success) {
      request.resolve(message.data.result);
    } else {
      request.reject(new Error(message.data.error || "Request failed"));
    }
  }
  isValidMessage(message) {
    return message && typeof message === "object" && typeof message.id === "string" && typeof message.type === "string" && typeof message.source === "string" && typeof message.target === "string" && typeof message.timestamp === "number";
  }
  postMessage(message) {
    if (typeof window !== "undefined") {
      window.postMessage(message, "*");
    }
  }
  generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}
class SecureChannel {
  constructor(bridge, target, sharedSecret) {
    this.bridge = bridge;
    this.target = target;
    this.secret = sharedSecret || this.generateSecret();
  }
  /**
   * Send encrypted message
   */
  async send(type, data) {
    const encryptedData = await this.encrypt(data);
    this.bridge.send(this.target, `secure:${type}`, {
      encrypted: true,
      data: encryptedData
    });
  }
  /**
   * Send encrypted request
   */
  async request(type, data) {
    const encryptedData = await this.encrypt(data);
    const response = await this.bridge.request(this.target, `secure:${type}`, {
      encrypted: true,
      data: encryptedData
    });
    if (response.encrypted) {
      return await this.decrypt(response.data);
    }
    return response;
  }
  /**
   * Listen for encrypted messages
   */
  onMessage(type, handler) {
    this.bridge.onMessage(`secure:${type}`, async (messageData) => {
      if (messageData.encrypted) {
        const decryptedData = await this.decrypt(messageData.data);
        handler(decryptedData);
      }
    });
  }
  async encrypt(data) {
    const json = JSON.stringify(data);
    const encrypted = Array.from(json).map(
      (char, i) => String.fromCharCode(char.charCodeAt(0) ^ this.secret.charCodeAt(i % this.secret.length))
    ).join("");
    return btoa(encrypted);
  }
  async decrypt(encryptedData) {
    const encrypted = atob(encryptedData);
    const decrypted = Array.from(encrypted).map(
      (char, i) => String.fromCharCode(char.charCodeAt(0) ^ this.secret.charCodeAt(i % this.secret.length))
    ).join("");
    return JSON.parse(decrypted);
  }
  generateSecret() {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  }
}
function createEventBridge(options) {
  return new EventBridge(options);
}
var LoadBalancerStrategy = /* @__PURE__ */ ((LoadBalancerStrategy2) => {
  LoadBalancerStrategy2["ROUND_ROBIN"] = "round_robin";
  LoadBalancerStrategy2["WEIGHTED_ROUND_ROBIN"] = "weighted_round_robin";
  LoadBalancerStrategy2["LEAST_CONNECTIONS"] = "least_connections";
  LoadBalancerStrategy2["LEAST_RESPONSE_TIME"] = "least_response_time";
  LoadBalancerStrategy2["PRIORITY"] = "priority";
  LoadBalancerStrategy2["COST_OPTIMIZED"] = "cost_optimized";
  return LoadBalancerStrategy2;
})(LoadBalancerStrategy || {});
class LoadBalancer {
  constructor(providers, strategy) {
    this.providers = [];
    this.currentIndex = 0;
    this.weightedIndexes = [];
    this.strategy = strategy;
    this.updateProviders(providers);
  }
  /**
   * Update the list of providers
   */
  updateProviders(providers) {
    this.providers = providers.map((provider) => ({
      provider,
      activeConnections: 0,
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
      averageResponseTime: 0,
      lastResponseTime: 0,
      isHealthy: true,
      weight: provider.config.weight || 1,
      priority: provider.config.priority || 100,
      costPerRequest: this.getProviderCost(provider)
    }));
    this.buildWeightedIndexes();
  }
  /**
   * Select a provider based on the configured strategy
   */
  async selectProvider() {
    const healthyProviders = this.providers.filter((p) => p.isHealthy);
    if (healthyProviders.length === 0) {
      return null;
    }
    switch (this.strategy) {
      case "round_robin":
        return this.selectRoundRobin(healthyProviders);
      case "weighted_round_robin":
        return this.selectWeightedRoundRobin(healthyProviders);
      case "least_connections":
        return this.selectLeastConnections(healthyProviders);
      case "least_response_time":
        return this.selectLeastResponseTime(healthyProviders);
      case "priority":
        return this.selectByPriority(healthyProviders);
      case "cost_optimized":
        return this.selectByCost(healthyProviders);
      default:
        return this.selectRoundRobin(healthyProviders);
    }
  }
  /**
   * Round-robin selection
   */
  selectRoundRobin(providers) {
    const provider = providers[this.currentIndex % providers.length];
    this.currentIndex++;
    provider.activeConnections++;
    return provider.provider;
  }
  /**
   * Weighted round-robin selection
   */
  selectWeightedRoundRobin(providers) {
    if (this.weightedIndexes.length === 0) {
      this.buildWeightedIndexes();
    }
    const index = this.weightedIndexes[this.currentIndex % this.weightedIndexes.length];
    this.currentIndex++;
    const provider = providers[index];
    provider.activeConnections++;
    return provider.provider;
  }
  /**
   * Select provider with least active connections
   */
  selectLeastConnections(providers) {
    const provider = providers.reduce(
      (min, p) => p.activeConnections < min.activeConnections ? p : min
    );
    provider.activeConnections++;
    return provider.provider;
  }
  /**
   * Select provider with best response time
   */
  selectLeastResponseTime(providers) {
    const provider = providers.reduce((best, p) => {
      if (p.totalRequests === 0) return p;
      if (best.totalRequests === 0) return best;
      return p.averageResponseTime < best.averageResponseTime ? p : best;
    });
    provider.activeConnections++;
    return provider.provider;
  }
  /**
   * Select by priority (lower number = higher priority)
   */
  selectByPriority(providers) {
    const provider = providers.reduce(
      (best, p) => p.priority < best.priority ? p : best
    );
    provider.activeConnections++;
    return provider.provider;
  }
  /**
   * Select cheapest provider
   */
  selectByCost(providers) {
    const provider = providers.reduce((cheapest, p) => {
      if (p.costPerRequest === void 0) return cheapest;
      if (cheapest.costPerRequest === void 0) return p;
      return p.costPerRequest < cheapest.costPerRequest ? p : cheapest;
    });
    provider.activeConnections++;
    return provider.provider;
  }
  /**
   * Record successful request
   */
  recordSuccess(provider, responseTime) {
    const metrics = this.providers.find((p) => p.provider === provider);
    if (metrics) {
      metrics.activeConnections = Math.max(0, metrics.activeConnections - 1);
      metrics.totalRequests++;
      metrics.successCount++;
      if (responseTime !== void 0) {
        metrics.lastResponseTime = responseTime;
        metrics.averageResponseTime = (metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime) / metrics.totalRequests;
      }
    }
  }
  /**
   * Record failed request
   */
  recordFailure(provider) {
    const metrics = this.providers.find((p) => p.provider === provider);
    if (metrics) {
      metrics.activeConnections = Math.max(0, metrics.activeConnections - 1);
      metrics.totalRequests++;
      metrics.failureCount++;
      const failureRate = metrics.failureCount / metrics.totalRequests;
      if (failureRate > 0.5 && metrics.totalRequests > 10) {
        metrics.isHealthy = false;
      }
    }
  }
  /**
   * Mark provider as unhealthy
   */
  markUnhealthy(provider) {
    const metrics = this.providers.find((p) => p.provider === provider);
    if (metrics) {
      metrics.isHealthy = false;
    }
  }
  /**
   * Mark provider as healthy
   */
  markHealthy(provider) {
    const metrics = this.providers.find((p) => p.provider === provider);
    if (metrics) {
      metrics.isHealthy = true;
    }
  }
  /**
   * Build weighted indexes for weighted round-robin
   */
  buildWeightedIndexes() {
    this.weightedIndexes = [];
    this.providers.forEach((provider, index) => {
      const weight = provider.weight;
      for (let i = 0; i < weight; i++) {
        this.weightedIndexes.push(index);
      }
    });
    for (let i = this.weightedIndexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.weightedIndexes[i], this.weightedIndexes[j]] = [this.weightedIndexes[j], this.weightedIndexes[i]];
    }
  }
  /**
   * Estimate cost per request for a provider
   */
  getProviderCost(provider) {
    const costEstimates = {
      "alchemy": 0.12,
      // Alchemy pricing
      "infura": 0.1,
      // Infura pricing
      "quicknode": 0.15,
      // QuickNode pricing
      "etherscan": 0,
      // Free tier
      "custom": 0.05
      // Assume self-hosted
    };
    return costEstimates[provider.type] ? costEstimates[provider.type] / 1e3 : void 0;
  }
  /**
   * Get current metrics
   */
  getMetrics() {
    return [...this.providers];
  }
  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.providers.forEach((metrics) => {
      metrics.activeConnections = 0;
      metrics.totalRequests = 0;
      metrics.successCount = 0;
      metrics.failureCount = 0;
      metrics.averageResponseTime = 0;
      metrics.lastResponseTime = 0;
    });
  }
}
class ProviderCache {
  constructor(config = {}) {
    this.cache = /* @__PURE__ */ new Map();
    this.memoryUsage = 0;
    this.NO_CACHE_METHODS = /* @__PURE__ */ new Set([
      "eth_sendTransaction",
      "eth_sendRawTransaction",
      "eth_sign",
      "eth_signTransaction",
      "eth_signTypedData",
      "personal_sign",
      "eth_accounts",
      "eth_coinbase",
      "eth_mining",
      "eth_hashrate",
      "eth_submitWork",
      "eth_submitHashrate"
    ]);
    this.SHORT_TTL_METHODS = /* @__PURE__ */ new Set([
      "eth_gasPrice",
      "eth_blockNumber",
      "eth_getBalance",
      "eth_getTransactionCount",
      "eth_estimateGas",
      "eth_getBlockByNumber",
      "eth_syncing",
      "net_peerCount"
    ]);
    this.LONG_TTL_METHODS = /* @__PURE__ */ new Set([
      "eth_getCode",
      "eth_getStorageAt",
      "eth_getTransactionByHash",
      "eth_getTransactionReceipt",
      "eth_getBlockByHash",
      "eth_getLogs",
      "eth_chainId",
      "net_version"
    ]);
    this.config = {
      ttl: config.ttl || 6e4,
      // 1 minute default
      maxSize: config.maxSize || 1e3,
      // 1000 entries
      maxMemory: config.maxMemory || 50 * 1024 * 1024
      // 50MB
    };
  }
  /**
   * Get a value from cache
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return void 0;
    }
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return void 0;
    }
    entry.hits++;
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }
  /**
   * Set a value in cache
   */
  set(key, value, ttl) {
    const method = this.extractMethod(key);
    if (this.NO_CACHE_METHODS.has(method)) {
      return;
    }
    const finalTtl = ttl || this.getTTLForMethod(method) || this.config.ttl;
    const size = this.estimateSize(value);
    if (this.memoryUsage + size > this.config.maxMemory) {
      this.evictLRU();
    }
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }
    const entry = {
      value,
      timestamp: Date.now(),
      ttl: finalTtl,
      hits: 0
    };
    this.cache.set(key, entry);
    this.memoryUsage += size;
  }
  /**
   * Delete a specific entry
   */
  delete(key) {
    const entry = this.cache.get(key);
    if (entry) {
      const size = this.estimateSize(entry.value);
      this.memoryUsage = Math.max(0, this.memoryUsage - size);
    }
    return this.cache.delete(key);
  }
  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.memoryUsage = 0;
  }
  /**
   * Get cache statistics
   */
  getStats() {
    let totalHits = 0;
    let entriesWithHits = 0;
    this.cache.forEach((entry) => {
      totalHits += entry.hits;
      if (entry.hits > 0) entriesWithHits++;
    });
    return {
      entries: this.cache.size,
      memoryUsage: this.memoryUsage,
      hitRate: this.cache.size > 0 ? entriesWithHits / this.cache.size : 0,
      avgHits: this.cache.size > 0 ? totalHits / this.cache.size : 0
    };
  }
  /**
   * Extract method name from cache key
   */
  extractMethod(key) {
    const colonIndex = key.indexOf(":");
    return colonIndex > 0 ? key.substring(0, colonIndex) : "";
  }
  /**
   * Get TTL for specific method
   */
  getTTLForMethod(method) {
    if (this.SHORT_TTL_METHODS.has(method)) {
      return 5e3;
    }
    if (this.LONG_TTL_METHODS.has(method)) {
      return 3e5;
    }
    return void 0;
  }
  /**
   * Evict least recently used entry
   */
  evictLRU() {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.delete(firstKey);
    }
  }
  /**
   * Estimate memory size of a value
   */
  estimateSize(value) {
    const str = JSON.stringify(value);
    return str.length * 2;
  }
  /**
   * Clean up expired entries (can be called periodically)
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.delete(key));
  }
}
class RateLimiter {
  constructor(requestsPerWindow, windowMs) {
    this.queue = [];
    this.maxTokens = requestsPerWindow;
    this.tokens = requestsPerWindow;
    this.refillRate = requestsPerWindow / windowMs * 1e3;
    this.lastRefill = Date.now();
  }
  /**
   * Check if a request can be made immediately
   */
  canMakeRequest() {
    this.refill();
    return this.tokens >= 1;
  }
  /**
   * Consume a token for a request
   */
  async consumeToken() {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens--;
      return;
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }
  /**
   * Refill tokens based on elapsed time
   */
  refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed / 1e3 * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
  /**
   * Process queued requests
   */
  processQueue() {
    this.refill();
    while (this.queue.length > 0 && this.tokens >= 1) {
      const resolve = this.queue.shift();
      if (resolve) {
        this.tokens--;
        resolve();
      }
    }
    if (this.queue.length > 0) {
      const timeToNextToken = 1 / this.refillRate * 1e3;
      setTimeout(() => this.processQueue(), timeToNextToken);
    }
  }
  /**
   * Get current state
   */
  getState() {
    this.refill();
    return {
      tokens: Math.floor(this.tokens),
      queueLength: this.queue.length
    };
  }
  /**
   * Reset the rate limiter
   */
  reset() {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    this.queue = [];
  }
}
class ProviderManager {
  constructor(config) {
    var _a, _b;
    this.providers = /* @__PURE__ */ new Map();
    this.rateLimiters = /* @__PURE__ */ new Map();
    this.config = config;
    config.providers.forEach((provider) => {
      this.addProvider(provider);
    });
    this.loadBalancer = new LoadBalancer(
      Array.from(this.providers.values()),
      config.strategy || LoadBalancerStrategy.ROUND_ROBIN
    );
    if ((_a = config.cache) == null ? void 0 : _a.enabled) {
      this.cache = new ProviderCache({
        ttl: config.cache.ttl || 6e4,
        // 1 minute default
        maxSize: config.cache.maxSize || 1e3
      });
    }
    if ((_b = config.monitoring) == null ? void 0 : _b.enabled) {
      this.startHealthMonitoring();
    }
  }
  /**
   * Add a provider to the manager
   */
  addProvider(provider) {
    const key = `${provider.type}_${provider.name}`;
    this.providers.set(key, provider);
    if (provider.config.rateLimit) {
      this.rateLimiters.set(key, new RateLimiter(
        provider.config.rateLimit.requests,
        provider.config.rateLimit.window
      ));
    }
    this.loadBalancer.updateProviders(Array.from(this.providers.values()));
  }
  /**
   * Remove a provider from the manager
   */
  removeProvider(type, name) {
    const key = `${type}_${name}`;
    const provider = this.providers.get(key);
    if (provider) {
      provider.disconnect();
      this.providers.delete(key);
      this.rateLimiters.delete(key);
      this.loadBalancer.updateProviders(Array.from(this.providers.values()));
    }
  }
  /**
   * Execute a request with automatic provider selection and fallback
   */
  async request(args) {
    var _a, _b;
    const cacheKey = this.getCacheKey(args);
    if (this.cache) {
      const cached = this.cache.get(cacheKey);
      if (cached !== void 0) {
        return cached;
      }
    }
    const maxRetries = ((_a = this.config.fallback) == null ? void 0 : _a.maxRetries) || 3;
    const retryDelay = ((_b = this.config.fallback) == null ? void 0 : _b.retryDelay) || 1e3;
    let lastError;
    for (let retry = 0; retry < maxRetries; retry++) {
      const provider = await this.selectProvider(args.method);
      if (!provider) {
        throw new Error("No healthy providers available");
      }
      try {
        const rateLimiter = this.rateLimiters.get(
          `${provider.type}_${provider.name}`
        );
        if (rateLimiter && !rateLimiter.canMakeRequest()) {
          continue;
        }
        const result = await provider.request(args);
        if (this.cache) {
          this.cache.set(cacheKey, result);
        }
        this.loadBalancer.recordSuccess(provider);
        return result;
      } catch (error) {
        lastError = error;
        this.loadBalancer.recordFailure(provider);
        if (retry < maxRetries - 1) {
          await this.delay(retryDelay * Math.pow(2, retry));
        }
      }
    }
    throw lastError || new Error("All providers failed");
  }
  /**
   * Select the best provider for a specific method
   */
  async selectProvider(method) {
    return this.loadBalancer.selectProvider();
  }
  /**
   * Batch multiple requests (optimized for providers that support batch)
   */
  async batch(requests) {
    const batchProvider = Array.from(this.providers.values()).find((p) => p.batch);
    if (batchProvider && batchProvider.batch) {
      try {
        return await batchProvider.batch(requests.map((r) => ({
          method: r.method,
          params: r.params || []
        })));
      } catch (error) {
      }
    }
    return Promise.all(requests.map((req) => this.request(req)));
  }
  /**
   * Get statistics for all providers
   */
  getStats() {
    const stats = /* @__PURE__ */ new Map();
    this.providers.forEach((provider, key) => {
      stats.set(key, provider.getStats());
    });
    return stats;
  }
  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    var _a;
    const interval = ((_a = this.config.monitoring) == null ? void 0 : _a.healthCheckInterval) || 3e4;
    this.healthCheckInterval = setInterval(async () => {
      const checks = Array.from(this.providers.values()).map(async (provider) => {
        const healthy = await provider.healthCheck();
        if (!healthy) {
          this.loadBalancer.markUnhealthy(provider);
        } else {
          this.loadBalancer.markHealthy(provider);
        }
      });
      await Promise.all(checks);
    }, interval);
  }
  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = void 0;
    }
  }
  /**
   * Generate cache key for a request
   */
  getCacheKey(args) {
    return `${args.method}:${JSON.stringify(args.params || [])}`;
  }
  /**
   * Helper delay function
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /**
   * Cleanup resources
   */
  async destroy() {
    var _a;
    this.stopHealthMonitoring();
    const disconnects = Array.from(this.providers.values()).map((p) => p.disconnect());
    await Promise.all(disconnects);
    this.providers.clear();
    this.rateLimiters.clear();
    (_a = this.cache) == null ? void 0 : _a.clear();
  }
  // Convenience methods that use the request method
  async getBalance(address) {
    return this.request({ method: "eth_getBalance", params: [address, "latest"] });
  }
  async getTransactionCount(address) {
    const result = await this.request({
      method: "eth_getTransactionCount",
      params: [address, "latest"]
    });
    return parseInt(result, 16);
  }
  async getGasPrice() {
    return this.request({ method: "eth_gasPrice" });
  }
  async getBlockNumber() {
    const result = await this.request({ method: "eth_blockNumber" });
    return parseInt(result, 16);
  }
  async getChainId() {
    const result = await this.request({ method: "eth_chainId" });
    return parseInt(result, 16);
  }
  async sendTransaction(transaction) {
    return this.request({ method: "eth_sendTransaction", params: [transaction] });
  }
  async getTransaction(hash) {
    return this.request({ method: "eth_getTransactionByHash", params: [hash] });
  }
  async getTransactionReceipt(hash) {
    return this.request({ method: "eth_getTransactionReceipt", params: [hash] });
  }
}
var ProviderType = /* @__PURE__ */ ((ProviderType2) => {
  ProviderType2["ALCHEMY"] = "alchemy";
  ProviderType2["INFURA"] = "infura";
  ProviderType2["QUICKNODE"] = "quicknode";
  ProviderType2["ETHERSCAN"] = "etherscan";
  ProviderType2["CUSTOM"] = "custom";
  ProviderType2["BROWSER_EXTENSION"] = "browser_extension";
  ProviderType2["WEBSOCKET"] = "websocket";
  ProviderType2["IPC"] = "ipc";
  return ProviderType2;
})(ProviderType || {});
class BaseProvider {
  constructor(config) {
    this.stats = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      isHealthy: true
    };
    this.config = config;
  }
  // Default implementations using call()
  async send(method, params) {
    return this.call(method, params);
  }
  async request(args) {
    return this.call(args.method, args.params || []);
  }
  async getBalance(address) {
    return this.call("eth_getBalance", [address, "latest"]);
  }
  async getTransactionCount(address) {
    const result = await this.call("eth_getTransactionCount", [address, "latest"]);
    return parseInt(result, 16);
  }
  async getGasPrice() {
    return this.call("eth_gasPrice", []);
  }
  async estimateGas(transaction) {
    return this.call("eth_estimateGas", [transaction]);
  }
  async sendTransaction(transaction) {
    return this.call("eth_sendTransaction", [transaction]);
  }
  async getTransaction(hash) {
    return this.call("eth_getTransactionByHash", [hash]);
  }
  async getTransactionReceipt(hash) {
    return this.call("eth_getTransactionReceipt", [hash]);
  }
  async getBlock(blockHashOrNumber) {
    const method = typeof blockHashOrNumber === "string" ? "eth_getBlockByHash" : "eth_getBlockByNumber";
    const param = typeof blockHashOrNumber === "number" ? `0x${blockHashOrNumber.toString(16)}` : blockHashOrNumber;
    return this.call(method, [param, false]);
  }
  async getBlockNumber() {
    const result = await this.call("eth_blockNumber", []);
    return parseInt(result, 16);
  }
  async getChainId() {
    const result = await this.call("eth_chainId", []);
    return parseInt(result, 16);
  }
  getStats() {
    return { ...this.stats };
  }
  async healthCheck() {
    try {
      await this.getBlockNumber();
      this.stats.isHealthy = true;
      return true;
    } catch (error) {
      this.stats.isHealthy = false;
      this.stats.lastError = error;
      return false;
    }
  }
  // Helper method to track stats
  async trackRequest(operation) {
    const startTime = Date.now();
    this.stats.requestCount++;
    this.stats.lastRequestTime = /* @__PURE__ */ new Date();
    try {
      const result = await operation();
      const responseTime = Date.now() - startTime;
      this.stats.averageResponseTime = (this.stats.averageResponseTime * (this.stats.requestCount - 1) + responseTime) / this.stats.requestCount;
      return result;
    } catch (error) {
      this.stats.errorCount++;
      this.stats.lastError = error;
      throw error;
    }
  }
}
class AlchemyProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.type = ProviderType.ALCHEMY;
    this.name = "Alchemy";
    this.connected = false;
    const network = config.network || "eth-mainnet";
    this.url = `https://${network}.g.alchemy.com/v2/${config.apiKey}`;
    if (typeof WebSocket !== "undefined") {
      this.wsUrl = `wss://${network}.g.alchemy.com/v2/${config.apiKey}`;
    }
  }
  async connect() {
    await this.getBlockNumber();
    this.connected = true;
    if (this.wsUrl && typeof WebSocket !== "undefined") {
      this.connectWebSocket();
    }
  }
  async disconnect() {
    this.connected = false;
    if (this.ws) {
      this.ws.close();
      this.ws = void 0;
    }
  }
  isConnected() {
    return this.connected;
  }
  async call(method, params) {
    return this.trackRequest(async () => {
      const response = await fetch(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method,
          params
        })
      });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message || "RPC Error");
      }
      return data.result;
    });
  }
  // Alchemy-specific methods
  /**
   * Get NFTs for an address
   */
  async getNFTs(owner, options) {
    return this.call("alchemy_getNFTs", [{
      owner,
      ...options
    }]);
  }
  /**
   * Get token balances for an address
   */
  async getTokenBalances(address, contractAddresses) {
    return this.call("alchemy_getTokenBalances", [
      address,
      contractAddresses || "DEFAULT_TOKENS"
    ]);
  }
  /**
   * Get token metadata
   */
  async getTokenMetadata(contractAddress) {
    return this.call("alchemy_getTokenMetadata", [contractAddress]);
  }
  /**
   * Get asset transfers (transaction history)
   */
  async getAssetTransfers(params) {
    return this.call("alchemy_getAssetTransfers", [params]);
  }
  /**
   * Enhanced transaction receipts
   */
  async getTransactionReceipts(params) {
    return this.call("alchemy_getTransactionReceipts", [params]);
  }
  /**
   * Simulate transaction execution
   */
  async simulateExecution(transaction, blockNumber) {
    return this.call("alchemy_simulateExecution", [
      transaction,
      blockNumber || "latest"
    ]);
  }
  /**
   * Batch support for Alchemy
   */
  async batch(requests) {
    const response = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        requests.map((req, index) => ({
          jsonrpc: "2.0",
          id: index,
          method: req.method,
          params: req.params
        }))
      )
    });
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("Invalid batch response");
    }
    data.sort((a, b) => a.id - b.id);
    return data.map((item) => {
      if (item.error) {
        throw new Error(item.error.message);
      }
      return item.result;
    });
  }
  /**
   * Subscribe to events (WebSocket)
   */
  subscribe(event, callback) {
    if (!this.ws) {
      throw new Error("WebSocket not connected");
    }
    const subscriptionId = Date.now().toString();
    this.ws.send(JSON.stringify({
      jsonrpc: "2.0",
      id: subscriptionId,
      method: "eth_subscribe",
      params: [event]
    }));
    this.ws.addEventListener("message", (e) => {
      const data = JSON.parse(e.data);
      if (data.params && data.params.subscription === subscriptionId) {
        callback(data.params.result);
      }
    });
  }
  /**
   * Connect WebSocket for subscriptions
   */
  connectWebSocket() {
    if (!this.wsUrl) return;
    this.ws = new WebSocket(this.wsUrl);
    this.ws.addEventListener("open", () => {
      console.log("Alchemy WebSocket connected");
    });
    this.ws.addEventListener("error", (error) => {
      console.error("Alchemy WebSocket error:", error);
      this.stats.lastError = new Error("WebSocket error");
    });
    this.ws.addEventListener("close", () => {
      console.log("Alchemy WebSocket disconnected");
      if (this.connected) {
        setTimeout(() => this.connectWebSocket(), 5e3);
      }
    });
  }
}
class HistoricalPriceProvider {
  constructor(config) {
    this.config = config;
  }
  /**
   * Check if provider supports this query
   */
  canHandle(token, chainId, timestamp) {
    if (!this.capabilities.supportedChains.includes(chainId)) {
      return false;
    }
    if (this.capabilities.supportedTokens && !this.capabilities.supportedTokens.includes(token)) {
      return false;
    }
    const maxHistory = Date.now() - this.capabilities.maxHistoryDays * 24 * 60 * 60 * 1e3;
    if (timestamp < maxHistory) {
      return false;
    }
    return true;
  }
  /**
   * Calculate confidence score for a price point
   */
  calculateConfidence(source, age) {
    const agePenalty = Math.min(age / (365 * 24 * 60 * 60 * 1e3), 0.5);
    const sourceScores = {
      "onchain": 1,
      // Direct from blockchain
      "coingecko": 0.9,
      // Aggregated from multiple exchanges
      "coinmarketcap": 0.85,
      "messari": 0.85,
      "dexscreener": 0.8,
      "transaction": 0.7,
      // Derived from user transactions
      "interpolated": 0.5
      // Interpolated between known points
    };
    const baseScore = sourceScores[source] || 0.5;
    return baseScore * (1 - agePenalty);
  }
}
class HistoricalPriceService {
  constructor() {
    this.providers = /* @__PURE__ */ new Map();
    this.cache = /* @__PURE__ */ new Map();
    this.initializeStorage();
  }
  /**
   * Register a provider
   */
  registerProvider(provider) {
    this.providers.set(provider.name, provider);
    console.info(`[HistoricalPriceService] Registered provider: ${provider.name}`);
  }
  /**
   * Get price at specific timestamp with automatic provider selection
   */
  async getPriceAtTime(token, chainId, timestamp) {
    const cacheKey = `${token}-${chainId}-${timestamp}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    const stored = await this.getFromStorage(cacheKey);
    if (stored) {
      this.cache.set(cacheKey, stored);
      return stored;
    }
    const capableProviders = Array.from(this.providers.values()).filter((p) => p.canHandle(token, chainId, timestamp)).sort((a, b) => a.config.priority - b.config.priority);
    for (const provider of capableProviders) {
      try {
        const price = await provider.getPriceAtTime(token, chainId, timestamp);
        if (price) {
          this.cache.set(cacheKey, price);
          await this.saveToStorage(cacheKey, price);
          return price;
        }
      } catch (error) {
        console.warn(`[HistoricalPriceService] Provider ${provider.name} failed:`, error);
      }
    }
    return this.interpolatePrice(token, chainId, timestamp);
  }
  /**
   * Get price at specific block
   */
  async getPriceAtBlock(token, chainId, blockNumber) {
    const blockProviders = Array.from(this.providers.values()).filter((p) => p.capabilities.hasBlockLevel);
    for (const provider of blockProviders) {
      try {
        const price = await provider.getPriceAtBlock(token, chainId, blockNumber);
        if (price) return price;
      } catch (error) {
        console.warn(`[HistoricalPriceService] Block provider ${provider.name} failed:`, error);
      }
    }
    const estimatedTime = await this.estimateBlockTimestamp(chainId, blockNumber);
    if (estimatedTime) {
      return this.getPriceAtTime(token, chainId, estimatedTime);
    }
    return null;
  }
  /**
   * Get price range for charting
   */
  async getPriceRange(token, chainId, startTime, endTime, interval = "hour") {
    const rangeProviders = Array.from(this.providers.values()).filter((p) => p.capabilities.resolution[interval]).sort((a, b) => a.config.priority - b.config.priority);
    for (const provider of rangeProviders) {
      try {
        const range = await provider.getPriceRange(
          token,
          chainId,
          startTime,
          endTime,
          interval
        );
        if (range && range.prices.length > 0) {
          return range;
        }
      } catch (error) {
        console.warn(`[HistoricalPriceService] Range provider ${provider.name} failed:`, error);
      }
    }
    return this.buildRangeFromPoints(token, chainId, startTime, endTime, interval);
  }
  /**
   * Build price history from user's transactions
   */
  async buildPriceHistoryFromTransactions(transactions) {
    const priceHistory = /* @__PURE__ */ new Map();
    for (const tx of transactions) {
      if (!tx.tokenAddress || !tx.tokenAmount || !tx.value) continue;
      const ethValue = parseFloat(tx.value);
      const tokenAmount = parseFloat(tx.tokenAmount);
      if (tokenAmount > 0) {
        const impliedPrice = ethValue / tokenAmount;
        const token = tx.tokenAddress.toLowerCase();
        if (!priceHistory.has(token)) {
          priceHistory.set(token, []);
        }
        priceHistory.get(token).push({
          timestamp: tx.timestamp,
          price: impliedPrice,
          source: "transaction",
          confidence: this.calculateConfidence("transaction", Date.now() - tx.timestamp)
        });
      }
    }
    for (const [token, points] of priceHistory.entries()) {
      for (const point of points) {
        const cacheKey = `${token}-1-${point.timestamp}`;
        this.cache.set(cacheKey, point);
        await this.saveToStorage(cacheKey, point);
      }
    }
    return priceHistory;
  }
  /**
   * Interpolate price between known points
   */
  async interpolatePrice(token, chainId, timestamp) {
    const before = await this.findNearestPrice(token, chainId, timestamp, "before");
    const after = await this.findNearestPrice(token, chainId, timestamp, "after");
    if (!before || !after) return null;
    const timeDiff = after.timestamp - before.timestamp;
    const priceDiff = after.price - before.price;
    const timeOffset = timestamp - before.timestamp;
    const interpolatedPrice = before.price + priceDiff * (timeOffset / timeDiff);
    return {
      timestamp,
      price: interpolatedPrice,
      source: "interpolated",
      confidence: Math.min(before.confidence, after.confidence) * 0.8
      // Reduce confidence for interpolated
    };
  }
  /**
   * Initialize IndexedDB storage
   */
  async initializeStorage() {
    if (typeof indexedDB === "undefined") return;
    const request = indexedDB.open("HistoricalPrices", 1);
    request.onerror = () => {
      console.error("[HistoricalPriceService] Failed to open IndexedDB");
    };
    request.onsuccess = () => {
      this.storage = request.result;
    };
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("prices")) {
        const store = db.createObjectStore("prices", { keyPath: "key" });
        store.createIndex("token", "token", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  }
  async getFromStorage(key) {
    if (!this.storage) return null;
    return new Promise((resolve) => {
      const transaction = this.storage.transaction(["prices"], "readonly");
      const store = transaction.objectStore("prices");
      const request = store.get(key);
      request.onsuccess = () => {
        var _a;
        resolve(((_a = request.result) == null ? void 0 : _a.data) || null);
      };
      request.onerror = () => {
        resolve(null);
      };
    });
  }
  async saveToStorage(key, price) {
    if (!this.storage) return;
    const transaction = this.storage.transaction(["prices"], "readwrite");
    const store = transaction.objectStore("prices");
    store.put({
      key,
      token: key.split("-")[0],
      timestamp: price.timestamp,
      data: price
    });
  }
  async findNearestPrice(token, chainId, timestamp, direction) {
    return null;
  }
  async estimateBlockTimestamp(chainId, blockNumber) {
    return null;
  }
  async buildRangeFromPoints(token, chainId, startTime, endTime, interval) {
    const prices = [];
    const intervalMs = {
      minute: 60 * 1e3,
      hour: 60 * 60 * 1e3,
      day: 24 * 60 * 60 * 1e3
    }[interval];
    for (let time = startTime; time <= endTime; time += intervalMs) {
      const price = await this.getPriceAtTime(token, chainId, time);
      if (price) prices.push(price);
    }
    return {
      token,
      chainId,
      startTime,
      endTime,
      interval,
      prices
    };
  }
  calculateConfidence(source, age) {
    const agePenalty = Math.min(age / (365 * 24 * 60 * 60 * 1e3), 0.5);
    const sourceScores = {
      "onchain": 1,
      "coingecko": 0.9,
      "transaction": 0.7,
      "interpolated": 0.5
    };
    const baseScore = sourceScores[source] || 0.5;
    return baseScore * (1 - agePenalty);
  }
}
class CoinGeckoHistoricalProvider extends HistoricalPriceProvider {
  constructor() {
    super(...arguments);
    this.name = "coingecko";
    this.capabilities = {
      maxHistoryDays: 365,
      supportedChains: [1, 137, 56, 43114, 250, 10, 42161],
      // Major EVM chains
      hasBlockLevel: false,
      hasVolumeData: true,
      hasFreeTier: true,
      resolution: {
        hour: true,
        day: true
      }
    };
    this.baseUrl = "https://api.coingecko.com/api/v3";
    this.tokenIdCache = /* @__PURE__ */ new Map();
  }
  async getPriceAtTime(tokenAddress, chainId, timestamp) {
    var _a, _b, _c, _d;
    try {
      const tokenId = await this.getTokenId(tokenAddress, chainId);
      if (!tokenId) return null;
      const date = new Date(timestamp);
      const dateStr = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
      const url = `${this.baseUrl}/coins/${tokenId}/history?date=${dateStr}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }
      const data = await response.json();
      if (!((_b = (_a = data.market_data) == null ? void 0 : _a.current_price) == null ? void 0 : _b.usd)) {
        return null;
      }
      return {
        timestamp,
        price: data.market_data.current_price.usd,
        volume24h: (_c = data.market_data.total_volume) == null ? void 0 : _c.usd,
        marketCap: (_d = data.market_data.market_cap) == null ? void 0 : _d.usd,
        source: "coingecko",
        confidence: this.calculateConfidence("coingecko", Date.now() - timestamp)
      };
    } catch (error) {
      console.warn("[CoinGecko] Failed to get historical price:", error);
      return null;
    }
  }
  async getPriceAtBlock(tokenAddress, chainId, blockNumber) {
    return null;
  }
  async getPriceRange(tokenAddress, chainId, startTime, endTime, interval) {
    try {
      const tokenId = await this.getTokenId(tokenAddress, chainId);
      if (!tokenId) {
        return {
          token: tokenAddress,
          chainId,
          startTime,
          endTime,
          interval: interval || "hour",
          prices: []
        };
      }
      const days = Math.ceil((endTime - startTime) / (1e3 * 60 * 60 * 24));
      const url = `${this.baseUrl}/coins/${tokenId}/market_chart?vs_currency=usd&days=${days}&interval=${interval || "hourly"}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }
      const data = await response.json();
      const prices = data.prices.map(([timestamp, price]) => ({
        timestamp,
        price,
        source: "coingecko",
        confidence: this.calculateConfidence("coingecko", Date.now() - timestamp)
      }));
      if (data.total_volumes) {
        data.total_volumes.forEach(([timestamp, volume], index) => {
          if (prices[index] && prices[index].timestamp === timestamp) {
            prices[index].volume24h = volume;
          }
        });
      }
      if (data.market_caps) {
        data.market_caps.forEach(([timestamp, marketCap], index) => {
          if (prices[index] && prices[index].timestamp === timestamp) {
            prices[index].marketCap = marketCap;
          }
        });
      }
      return {
        token: tokenAddress,
        chainId,
        startTime,
        endTime,
        interval: interval || "hour",
        prices: prices.filter((p) => p.timestamp >= startTime && p.timestamp <= endTime)
      };
    } catch (error) {
      console.warn("[CoinGecko] Failed to get price range:", error);
      return {
        token: tokenAddress,
        chainId,
        startTime,
        endTime,
        interval: interval || "hour",
        prices: []
      };
    }
  }
  /**
   * Map token address to CoinGecko ID
   */
  async getTokenId(tokenAddress, chainId) {
    const cacheKey = `${chainId}-${tokenAddress.toLowerCase()}`;
    if (this.tokenIdCache.has(cacheKey)) {
      return this.tokenIdCache.get(cacheKey);
    }
    try {
      const platformMap = {
        1: "ethereum",
        137: "polygon-pos",
        56: "binance-smart-chain",
        43114: "avalanche",
        250: "fantom",
        10: "optimistic-ethereum",
        42161: "arbitrum-one"
      };
      const platform = platformMap[chainId];
      if (!platform) return null;
      if (tokenAddress.toLowerCase() === "0x0000000000000000000000000000000000000000") {
        const nativeTokens = {
          1: "ethereum",
          137: "matic-network",
          56: "binancecoin",
          43114: "avalanche-2",
          250: "fantom",
          10: "ethereum",
          // Uses ETH
          42161: "ethereum"
          // Uses ETH
        };
        const tokenId = nativeTokens[chainId];
        if (tokenId) {
          this.tokenIdCache.set(cacheKey, tokenId);
          return tokenId;
        }
      }
      const url = `${this.baseUrl}/coins/${platform}/contract/${tokenAddress.toLowerCase()}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const tokenId = data.id;
        this.tokenIdCache.set(cacheKey, tokenId);
        return tokenId;
      }
      return null;
    } catch (error) {
      console.warn("[CoinGecko] Failed to get token ID:", error);
      return null;
    }
  }
}
class OnChainDEXProvider extends HistoricalPriceProvider {
  constructor(config) {
    super(config);
    this.name = "onchain-dex";
    this.capabilities = {
      maxHistoryDays: Infinity,
      // Limited only by archive node
      supportedChains: [1, 137, 42161, 10],
      // Chains with good DEX liquidity
      hasBlockLevel: true,
      hasVolumeData: true,
      hasFreeTier: false,
      // Requires archive node
      resolution: {
        minute: true,
        hour: true,
        day: true
      }
    };
    this.poolCache = /* @__PURE__ */ new Map();
    this.archiveNodeUrl = config.archiveNodeUrl || "";
  }
  async getPriceAtTime(tokenAddress, chainId, timestamp) {
    try {
      const blockNumber = await this.getBlockFromTimestamp(chainId, timestamp);
      if (!blockNumber) return null;
      return this.getPriceAtBlock(tokenAddress, chainId, blockNumber);
    } catch (error) {
      console.warn("[OnChainDEX] Failed to get price at time:", error);
      return null;
    }
  }
  async getPriceAtBlock(tokenAddress, chainId, blockNumber) {
    try {
      if (!this.archiveNodeUrl) {
        throw new Error("Archive node URL not configured");
      }
      const pool = await this.findBestPool(tokenAddress, chainId);
      if (!pool) return null;
      const reserves = await this.getPoolReserves(pool, blockNumber);
      if (!reserves) return null;
      const price = this.calculatePriceFromReserves(
        tokenAddress,
        pool,
        reserves
      );
      const timestamp = await this.getBlockTimestamp(chainId, blockNumber);
      return {
        timestamp,
        blockNumber,
        price,
        source: "onchain",
        confidence: 1
        // Maximum confidence for on-chain data
      };
    } catch (error) {
      console.warn("[OnChainDEX] Failed to get price at block:", error);
      return null;
    }
  }
  async getPriceRange(tokenAddress, chainId, startTime, endTime, interval) {
    try {
      const pool = await this.findBestPool(tokenAddress, chainId);
      if (!pool) {
        return {
          token: tokenAddress,
          chainId,
          startTime,
          endTime,
          interval: interval || "hour",
          prices: []
        };
      }
      const swapEvents = await this.getSwapEvents(
        pool,
        startTime,
        endTime
      );
      const prices = this.aggregateSwapsIntoPrices(
        swapEvents,
        tokenAddress,
        pool,
        interval || "hour"
      );
      return {
        token: tokenAddress,
        chainId,
        startTime,
        endTime,
        interval: interval || "hour",
        prices
      };
    } catch (error) {
      console.warn("[OnChainDEX] Failed to get price range:", error);
      return {
        token: tokenAddress,
        chainId,
        startTime,
        endTime,
        interval: interval || "hour",
        prices: []
      };
    }
  }
  /**
   * Find the best liquidity pool for a token
   */
  async findBestPool(tokenAddress, chainId) {
    const cacheKey = `${chainId}-${tokenAddress}`;
    if (this.poolCache.has(cacheKey)) {
      const pools = this.poolCache.get(cacheKey);
      return pools[0];
    }
    try {
      const quoteTokens = this.getQuoteTokens(chainId);
      const pools = [];
      for (const quoteToken of quoteTokens) {
        const v3Pool = await this.findUniswapV3Pool(
          tokenAddress,
          quoteToken,
          chainId
        );
        if (v3Pool) pools.push(v3Pool);
      }
      for (const quoteToken of quoteTokens) {
        const v2Pool = await this.findUniswapV2Pool(
          tokenAddress,
          quoteToken,
          chainId
        );
        if (v2Pool) pools.push(v2Pool);
      }
      if (pools.length === 0) return null;
      const sortedPools = await this.sortPoolsByLiquidity(pools);
      this.poolCache.set(cacheKey, sortedPools);
      return sortedPools[0];
    } catch (error) {
      console.warn("[OnChainDEX] Failed to find pool:", error);
      return null;
    }
  }
  /**
   * Get pool reserves at specific block
   */
  async getPoolReserves(pool, blockNumber) {
    try {
      const response = await fetch(this.archiveNodeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [
            {
              to: pool.address,
              data: "0x0902f1ac"
              // getReserves() selector
            },
            `0x${blockNumber.toString(16)}`
          ]
        })
      });
      const data = await response.json();
      if (!data.result) return null;
      const result = data.result.slice(2);
      const reserve0 = BigInt("0x" + result.slice(0, 64));
      const reserve1 = BigInt("0x" + result.slice(64, 128));
      return { reserve0, reserve1 };
    } catch (error) {
      console.warn("[OnChainDEX] Failed to get reserves:", error);
      return null;
    }
  }
  /**
   * Calculate price from pool reserves
   */
  calculatePriceFromReserves(tokenAddress, pool, reserves) {
    const isToken0 = pool.token0.toLowerCase() === tokenAddress.toLowerCase();
    const tokenReserve = isToken0 ? reserves.reserve0 : reserves.reserve1;
    const quoteReserve = isToken0 ? reserves.reserve1 : reserves.reserve0;
    const price = Number(quoteReserve) / Number(tokenReserve);
    return price;
  }
  /**
   * Get swap events from a pool
   */
  async getSwapEvents(pool, startTime, endTime) {
    return [];
  }
  /**
   * Aggregate swap events into price points
   */
  aggregateSwapsIntoPrices(swaps, tokenAddress, pool, interval) {
    const intervalMs = {
      minute: 60 * 1e3,
      hour: 60 * 60 * 1e3,
      day: 24 * 60 * 60 * 1e3
    }[interval];
    const grouped = /* @__PURE__ */ new Map();
    for (const swap of swaps) {
      const intervalKey = Math.floor(swap.timestamp / intervalMs) * intervalMs;
      if (!grouped.has(intervalKey)) {
        grouped.set(intervalKey, []);
      }
      grouped.get(intervalKey).push(swap);
    }
    const prices = [];
    for (const [timestamp, intervalSwaps] of grouped.entries()) {
      let totalVolume = 0;
      let volumeWeightedPrice = 0;
      for (const swap of intervalSwaps) {
        const volume = swap.amount;
        const price = swap.price;
        totalVolume += volume;
        volumeWeightedPrice += price * volume;
      }
      prices.push({
        timestamp,
        price: volumeWeightedPrice / totalVolume,
        volume24h: totalVolume,
        source: "onchain",
        confidence: 1
      });
    }
    return prices.sort((a, b) => a.timestamp - b.timestamp);
  }
  /**
   * Helper methods
   */
  getQuoteTokens(chainId) {
    const tokens = {
      1: [
        // Ethereum
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        // WETH
        "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        // USDC
        "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        // USDT
        "0x6B175474E89094C44Da98b954EedeAC495271d0F"
        // DAI
      ],
      137: [
        // Polygon
        "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
        // WMATIC
        "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        // USDC
        "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
        // USDT
      ],
      42161: [
        // Arbitrum
        "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
        // WETH
        "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8"
        // USDC
      ],
      10: [
        // Optimism
        "0x4200000000000000000000000000000000000006",
        // WETH
        "0x7F5c764cBc14f9669B88837ca1490cCa17c31607"
        // USDC
      ]
    };
    return tokens[chainId] || [];
  }
  async findUniswapV3Pool(token0, token1, chainId) {
    return null;
  }
  async findUniswapV2Pool(token0, token1, chainId) {
    return null;
  }
  async sortPoolsByLiquidity(pools) {
    return pools;
  }
  async getBlockFromTimestamp(chainId, timestamp) {
    return null;
  }
  async getBlockTimestamp(chainId, blockNumber) {
    try {
      const response = await fetch(this.archiveNodeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getBlockByNumber",
          params: [`0x${blockNumber.toString(16)}`, false]
        })
      });
      const data = await response.json();
      return parseInt(data.result.timestamp, 16) * 1e3;
    } catch {
      return Date.now();
    }
  }
}
class AbstractTransactionProvider {
  constructor(config, name) {
    this.config = config;
    this.name = name;
  }
  /**
   * Get the provider name
   */
  getName() {
    return this.name;
  }
  /**
   * Validate the provider configuration
   */
  validateConfig() {
    if (!this.config.apiKey) {
      throw new Error(`${this.name} provider requires an API key`);
    }
  }
  /**
   * Build the RPC URL for a specific chain
   * Override this in providers that use RPC endpoints
   */
  buildRpcUrl(chainId) {
    throw new Error(`Provider ${this.name} must implement buildRpcUrl`);
  }
  /**
   * Helper method to handle rate limiting
   */
  async rateLimitDelay() {
    if (this.config.rateLimit) {
      await new Promise((resolve) => setTimeout(resolve, this.config.rateLimit));
    }
  }
  /**
   * Helper method to retry failed requests
   */
  async retryRequest(fn, retries = this.config.retryCount || 3) {
    let lastError;
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1e3));
        }
      }
    }
    throw lastError || new Error("Request failed after retries");
  }
  /**
   * Convert provider-specific transaction format to standard format
   * Each provider should override this if needed
   */
  normalizeTransaction(tx, chainId) {
    return {
      hash: tx.hash || tx.transactionHash,
      from: tx.from,
      to: tx.to,
      value: tx.value || "0",
      blockNumber: parseInt(tx.blockNumber),
      timestamp: tx.timestamp || Date.now(),
      nonce: tx.nonce,
      gasPrice: tx.gasPrice,
      gasUsed: tx.gasUsed,
      gasLimit: tx.gasLimit || tx.gas,
      status: tx.status ? "confirmed" : "pending",
      confirmations: tx.confirmations,
      type: this.determineTransactionType(tx),
      chainId,
      symbol: tx.symbol || "ETH"
    };
  }
  /**
   * Determine transaction type based on transaction data
   */
  determineTransactionType(tx) {
    if (tx.input && tx.input !== "0x" && tx.input !== "0x0") {
      return "contract";
    }
    return "send";
  }
  /**
   * Make an RPC call
   * Helper method for providers that use JSON-RPC
   */
  async rpcCall(url, method, params = []) {
    const controller = new AbortController();
    const timeout = this.config.timeout || 3e4;
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method,
          params
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(`RPC error: ${data.error.message || JSON.stringify(data.error)}`);
      }
      return data.result;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }
}
class AlchemyTransactionProvider extends AbstractTransactionProvider {
  constructor(config) {
    super(config, "Alchemy");
    this.SUPPORTED_CHAINS = [1, 11155111, 137, 42161, 10, 8453, 43114];
    this.NETWORK_URLS = {
      1: "https://eth-mainnet.g.alchemy.com/v2/",
      11155111: "https://eth-sepolia.g.alchemy.com/v2/",
      137: "https://polygon-mainnet.g.alchemy.com/v2/",
      42161: "https://arb-mainnet.g.alchemy.com/v2/",
      10: "https://opt-mainnet.g.alchemy.com/v2/",
      8453: "https://base-mainnet.g.alchemy.com/v2/",
      43114: "https://avax-mainnet.g.alchemy.com/v2/"
    };
    this.validateConfig();
  }
  /**
   * Build the RPC URL for a specific chain
   */
  buildRpcUrl(chainId) {
    const baseUrl = this.NETWORK_URLS[chainId];
    if (!baseUrl) {
      throw new Error(`Chain ${chainId} is not supported by Alchemy`);
    }
    return baseUrl + this.config.apiKey;
  }
  /**
   * Check if the provider supports a specific chain
   */
  supportsChain(chainId) {
    return this.SUPPORTED_CHAINS.includes(chainId);
  }
  /**
   * Get supported chains
   */
  getSupportedChains() {
    return [...this.SUPPORTED_CHAINS];
  }
  /**
   * Get the current block number
   */
  async getCurrentBlockNumber(chainId) {
    const url = this.buildRpcUrl(chainId);
    const result = await this.rpcCall(url, "eth_blockNumber");
    return parseInt(result, 16);
  }
  /**
   * Fetch transactions using Alchemy's getAssetTransfers API
   */
  async fetchTransactions(address, chainId, options = {}) {
    if (!this.supportsChain(chainId)) {
      throw new Error(`Chain ${chainId} is not supported by Alchemy`);
    }
    const url = this.buildRpcUrl(chainId);
    const limit = options.limit || 100;
    const sort = options.sort || "desc";
    const [outgoing, incoming] = await Promise.all([
      this.fetchTransfers(url, address, "from", limit, sort),
      this.fetchTransfers(url, address, "to", limit, sort)
    ]);
    const allTransfers = [...outgoing, ...incoming];
    const uniqueTransfers = Array.from(
      new Map(allTransfers.map((tx) => [tx.hash, tx])).values()
    );
    uniqueTransfers.sort((a, b) => {
      if (sort === "desc") {
        return b.timestamp - a.timestamp;
      }
      return a.timestamp - b.timestamp;
    });
    return uniqueTransfers.slice(0, limit);
  }
  /**
   * Fetch transfers using Alchemy's getAssetTransfers
   */
  async fetchTransfers(url, address, direction, limit, order) {
    const params = {
      category: ["external", "erc20", "erc721", "erc1155", "internal"],
      withMetadata: true,
      maxCount: `0x${limit.toString(16)}`,
      order
    };
    if (direction === "from") {
      params.fromAddress = address;
    } else {
      params.toAddress = address;
    }
    const result = await this.retryRequest(
      () => this.rpcCall(url, "alchemy_getAssetTransfers", [params])
    );
    const transfers = result.transfers || [];
    return transfers.map((tx) => this.convertAlchemyToStandard(tx, address));
  }
  /**
   * Fetch a single transaction by hash
   */
  async fetchTransaction(txHash, chainId) {
    const url = this.buildRpcUrl(chainId);
    const [tx, receipt] = await Promise.all([
      this.rpcCall(url, "eth_getTransactionByHash", [txHash]),
      this.rpcCall(url, "eth_getTransactionReceipt", [txHash])
    ]);
    if (!tx) {
      return null;
    }
    const currentBlock = await this.getCurrentBlockNumber(chainId);
    const blockNumber = parseInt(tx.blockNumber, 16);
    const confirmations = currentBlock - blockNumber;
    const block = await this.rpcCall(url, "eth_getBlockByNumber", [tx.blockNumber, false]);
    const timestamp = parseInt(block.timestamp, 16) * 1e3;
    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to || "",
      value: parseInt(tx.value, 16).toString(),
      blockNumber,
      timestamp,
      nonce: parseInt(tx.nonce, 16),
      gasPrice: parseInt(tx.gasPrice || tx.maxFeePerGas || "0", 16).toString(),
      gasUsed: receipt ? parseInt(receipt.gasUsed, 16).toString() : void 0,
      gasLimit: parseInt(tx.gas, 16).toString(),
      status: receipt ? receipt.status === "0x1" ? "confirmed" : "failed" : "pending",
      confirmations,
      type: this.determineTransactionType(tx),
      chainId,
      symbol: "ETH"
    };
  }
  /**
   * Convert Alchemy transfer format to standard format
   */
  convertAlchemyToStandard(transfer, userAddress) {
    var _a, _b, _c, _d, _e;
    const isOutgoing = ((_a = transfer.from) == null ? void 0 : _a.toLowerCase()) === userAddress.toLowerCase();
    let timestamp = Date.now();
    if ((_b = transfer.metadata) == null ? void 0 : _b.blockTimestamp) {
      timestamp = new Date(transfer.metadata.blockTimestamp).getTime();
    }
    let value = "0";
    if (transfer.value) {
      value = transfer.value.toString();
    } else if ((_c = transfer.rawContract) == null ? void 0 : _c.value) {
      value = parseInt(transfer.rawContract.value, 16).toString();
    }
    const blockNumber = transfer.blockNum ? parseInt(transfer.blockNum, 16) : 0;
    let type = isOutgoing ? "send" : "receive";
    if (transfer.category === "internal") {
      type = "contract";
    }
    return {
      hash: transfer.hash || transfer.uniqueId,
      from: transfer.from || "",
      to: transfer.to || "",
      value,
      blockNumber,
      timestamp,
      status: "confirmed",
      // Alchemy only returns confirmed transfers
      type,
      chainId: 1,
      // Will be set by the caller
      symbol: transfer.asset || "ETH",
      tokenAddress: (_d = transfer.rawContract) == null ? void 0 : _d.address,
      tokenDecimals: (_e = transfer.rawContract) == null ? void 0 : _e.decimal
    };
  }
}
class EtherscanTransactionProvider extends AbstractTransactionProvider {
  constructor(config) {
    super(config, "Etherscan");
    this.SUPPORTED_CHAINS = [1, 11155111, 137, 42161, 10, 8453, 56, 43114];
    this.API_URLS = {
      1: "https://api.etherscan.io/api",
      11155111: "https://api-sepolia.etherscan.io/api",
      137: "https://api.polygonscan.com/api",
      42161: "https://api.arbiscan.io/api",
      10: "https://api-optimistic.etherscan.io/api",
      8453: "https://api.basescan.org/api",
      56: "https://api.bscscan.com/api",
      43114: "https://api.snowscan.xyz/api"
    };
    this.validateConfig();
  }
  /**
   * Get the API URL for a specific chain
   */
  getApiUrl(chainId) {
    const url = this.API_URLS[chainId];
    if (!url) {
      throw new Error(`Chain ${chainId} is not supported by Etherscan`);
    }
    return url;
  }
  /**
   * Check if the provider supports a specific chain
   */
  supportsChain(chainId) {
    return this.SUPPORTED_CHAINS.includes(chainId);
  }
  /**
   * Get supported chains
   */
  getSupportedChains() {
    return [...this.SUPPORTED_CHAINS];
  }
  /**
   * Get the current block number
   */
  async getCurrentBlockNumber(chainId) {
    const url = this.getApiUrl(chainId);
    const params = new URLSearchParams({
      module: "proxy",
      action: "eth_blockNumber",
      apikey: this.config.apiKey
    });
    const response = await this.fetchWithRetry(`${url}?${params}`);
    const data = await response.json();
    if (data.status === "1" && data.result) {
      return parseInt(data.result, 16);
    }
    throw new Error(`Failed to get block number: ${data.message || "Unknown error"}`);
  }
  /**
   * Fetch transactions using Etherscan's API
   */
  async fetchTransactions(address, chainId, options = {}) {
    if (!this.supportsChain(chainId)) {
      throw new Error(`Chain ${chainId} is not supported by Etherscan`);
    }
    const url = this.getApiUrl(chainId);
    const limit = options.limit || 100;
    const sort = options.sort || "desc";
    const startBlock = options.startBlock || 0;
    const endBlock = options.endBlock || 999999999;
    const normalTxs = await this.fetchNormalTransactions(
      url,
      address,
      startBlock,
      endBlock,
      sort
    );
    let tokenTxs = [];
    if (options.includeTokenTransfers !== false) {
      tokenTxs = await this.fetchTokenTransactions(
        url,
        address,
        startBlock,
        endBlock,
        sort
      );
    }
    let internalTxs = [];
    if (options.includeInternalTransactions) {
      internalTxs = await this.fetchInternalTransactions(
        url,
        address,
        startBlock,
        endBlock,
        sort
      );
    }
    const allTxs = [...normalTxs, ...tokenTxs, ...internalTxs];
    const uniqueTxs = Array.from(
      new Map(allTxs.map((tx) => [tx.hash, tx])).values()
    );
    uniqueTxs.sort((a, b) => {
      if (sort === "desc") {
        return b.timestamp - a.timestamp;
      }
      return a.timestamp - b.timestamp;
    });
    return uniqueTxs.slice(0, limit).map((tx) => ({ ...tx, chainId }));
  }
  /**
   * Fetch normal transactions
   */
  async fetchNormalTransactions(baseUrl, address, startBlock, endBlock, sort) {
    const params = new URLSearchParams({
      module: "account",
      action: "txlist",
      address,
      startblock: startBlock.toString(),
      endblock: endBlock.toString(),
      sort,
      apikey: this.config.apiKey
    });
    const response = await this.fetchWithRetry(`${baseUrl}?${params}`);
    const data = await response.json();
    if (data.status === "1" && Array.isArray(data.result)) {
      return data.result.map((tx) => this.convertEtherscanToStandard(tx, address));
    }
    if (data.status === "0" && data.message === "No transactions found") {
      return [];
    }
    throw new Error(`Etherscan API error: ${data.message || "Unknown error"}`);
  }
  /**
   * Fetch token transactions (ERC20, ERC721, etc.)
   */
  async fetchTokenTransactions(baseUrl, address, startBlock, endBlock, sort) {
    const params = new URLSearchParams({
      module: "account",
      action: "tokentx",
      address,
      startblock: startBlock.toString(),
      endblock: endBlock.toString(),
      sort,
      apikey: this.config.apiKey
    });
    const response = await this.fetchWithRetry(`${baseUrl}?${params}`);
    const data = await response.json();
    if (data.status === "1" && Array.isArray(data.result)) {
      return data.result.map((tx) => this.convertTokenTxToStandard(tx, address));
    }
    return [];
  }
  /**
   * Fetch internal transactions
   */
  async fetchInternalTransactions(baseUrl, address, startBlock, endBlock, sort) {
    const params = new URLSearchParams({
      module: "account",
      action: "txlistinternal",
      address,
      startblock: startBlock.toString(),
      endblock: endBlock.toString(),
      sort,
      apikey: this.config.apiKey
    });
    const response = await this.fetchWithRetry(`${baseUrl}?${params}`);
    const data = await response.json();
    if (data.status === "1" && Array.isArray(data.result)) {
      return data.result.map((tx) => this.convertInternalTxToStandard(tx, address));
    }
    return [];
  }
  /**
   * Fetch a single transaction by hash
   */
  async fetchTransaction(txHash, chainId) {
    const url = this.getApiUrl(chainId);
    const params = new URLSearchParams({
      module: "proxy",
      action: "eth_getTransactionByHash",
      txhash: txHash,
      apikey: this.config.apiKey
    });
    const response = await this.fetchWithRetry(`${url}?${params}`);
    const data = await response.json();
    if (data.result) {
      const tx = data.result;
      const receiptParams = new URLSearchParams({
        module: "proxy",
        action: "eth_getTransactionReceipt",
        txhash: txHash,
        apikey: this.config.apiKey
      });
      const receiptResponse = await this.fetchWithRetry(`${url}?${receiptParams}`);
      const receiptData = await receiptResponse.json();
      const receipt = receiptData.result;
      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to || "",
        value: parseInt(tx.value, 16).toString(),
        blockNumber: parseInt(tx.blockNumber, 16),
        timestamp: Date.now(),
        // Would need to fetch block for actual timestamp
        nonce: parseInt(tx.nonce, 16),
        gasPrice: parseInt(tx.gasPrice || tx.maxFeePerGas || "0", 16).toString(),
        gasUsed: receipt ? parseInt(receipt.gasUsed, 16).toString() : void 0,
        gasLimit: parseInt(tx.gas, 16).toString(),
        status: receipt ? receipt.status === "0x1" ? "confirmed" : "failed" : "pending",
        type: this.determineTransactionType(tx),
        chainId,
        symbol: "ETH"
      };
    }
    return null;
  }
  /**
   * Convert Etherscan format to standard format
   */
  convertEtherscanToStandard(tx, userAddress) {
    const isOutgoing = tx.from.toLowerCase() === userAddress.toLowerCase();
    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      blockNumber: parseInt(tx.blockNumber),
      timestamp: parseInt(tx.timeStamp) * 1e3,
      // Etherscan returns Unix seconds
      nonce: parseInt(tx.nonce),
      gasPrice: tx.gasPrice,
      gasUsed: tx.gasUsed,
      gasLimit: tx.gas,
      status: tx.isError === "0" ? "confirmed" : "failed",
      confirmations: parseInt(tx.confirmations),
      type: isOutgoing ? "send" : "receive",
      chainId: 1,
      // Will be set by caller
      symbol: "ETH",
      methodId: tx.methodId,
      functionName: tx.functionName
    };
  }
  /**
   * Convert token transaction to standard format
   */
  convertTokenTxToStandard(tx, userAddress) {
    const isOutgoing = tx.from.toLowerCase() === userAddress.toLowerCase();
    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      blockNumber: parseInt(tx.blockNumber),
      timestamp: parseInt(tx.timeStamp) * 1e3,
      nonce: parseInt(tx.nonce),
      gasPrice: tx.gasPrice,
      gasUsed: tx.gasUsed,
      gasLimit: tx.gas,
      status: "confirmed",
      confirmations: parseInt(tx.confirmations),
      type: isOutgoing ? "send" : "receive",
      chainId: 1,
      symbol: tx.tokenSymbol,
      tokenAddress: tx.contractAddress,
      tokenName: tx.tokenName,
      tokenDecimals: parseInt(tx.tokenDecimal)
    };
  }
  /**
   * Convert internal transaction to standard format
   */
  convertInternalTxToStandard(tx, userAddress) {
    tx.from.toLowerCase() === userAddress.toLowerCase();
    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      blockNumber: parseInt(tx.blockNumber),
      timestamp: parseInt(tx.timeStamp) * 1e3,
      status: tx.isError === "0" ? "confirmed" : "failed",
      type: "contract",
      chainId: 1,
      symbol: "ETH",
      gasLimit: tx.gas,
      gasUsed: tx.gasUsed
    };
  }
  /**
   * Helper method for fetch with retry
   */
  async fetchWithRetry(url, retries = 3) {
    return this.retryRequest(async () => {
      await this.rateLimitDelay();
      const controller = new AbortController();
      const timeout = this.config.timeout || 3e4;
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok && response.status !== 400) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === "AbortError") {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw error;
      }
    }, retries);
  }
}
class InfuraTransactionProvider extends AbstractTransactionProvider {
  constructor(config) {
    super(config, "Infura");
    this.SUPPORTED_CHAINS = [1, 11155111, 137, 42161, 10, 43114];
    this.NETWORK_URLS = {
      1: "https://mainnet.infura.io/v3/",
      11155111: "https://sepolia.infura.io/v3/",
      137: "https://polygon-mainnet.infura.io/v3/",
      42161: "https://arbitrum-mainnet.infura.io/v3/",
      10: "https://optimism-mainnet.infura.io/v3/",
      43114: "https://avalanche-mainnet.infura.io/v3/"
    };
    this.TRANSFER_EVENT_SIGNATURE = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    this.validateConfig();
  }
  /**
   * Build the RPC URL for a specific chain
   */
  buildRpcUrl(chainId) {
    const baseUrl = this.NETWORK_URLS[chainId];
    if (!baseUrl) {
      throw new Error(`Chain ${chainId} is not supported by Infura`);
    }
    return baseUrl + this.config.apiKey;
  }
  /**
   * Check if the provider supports a specific chain
   */
  supportsChain(chainId) {
    return this.SUPPORTED_CHAINS.includes(chainId);
  }
  /**
   * Get supported chains
   */
  getSupportedChains() {
    return [...this.SUPPORTED_CHAINS];
  }
  /**
   * Get the current block number
   */
  async getCurrentBlockNumber(chainId) {
    const url = this.buildRpcUrl(chainId);
    const result = await this.rpcCall(url, "eth_blockNumber");
    return parseInt(result, 16);
  }
  /**
   * Fetch transactions using eth_getLogs
   * This is a simplified approach that fetches transfer events
   */
  async fetchTransactions(address, chainId, options = {}) {
    if (!this.supportsChain(chainId)) {
      throw new Error(`Chain ${chainId} is not supported by Infura`);
    }
    const url = this.buildRpcUrl(chainId);
    const currentBlock = await this.getCurrentBlockNumber(chainId);
    const endBlock = options.endBlock || currentBlock;
    const startBlock = options.startBlock || Math.max(0, endBlock - 1e4);
    const limit = options.limit || 100;
    const [ethTransactions, tokenTransfers] = await Promise.all([
      this.fetchNativeTransactions(url, address, startBlock, endBlock, limit),
      options.includeTokenTransfers !== false ? this.fetchTokenTransfers(url, address, startBlock, endBlock, limit) : Promise.resolve([])
    ]);
    const allTransactions = [...ethTransactions, ...tokenTransfers];
    allTransactions.sort((a, b) => b.blockNumber - a.blockNumber);
    const transactionsWithConfirmations = allTransactions.map((tx) => ({
      ...tx,
      confirmations: currentBlock - tx.blockNumber,
      chainId
    }));
    return transactionsWithConfirmations.slice(0, limit);
  }
  /**
   * Fetch native ETH transactions
   * Note: This is limited as Infura doesn't have a direct transaction history API
   * We use eth_getLogs to find transactions involving the address
   */
  async fetchNativeTransactions(url, address, fromBlock, toBlock, limit) {
    const logs = await this.rpcCall(url, "eth_getLogs", [{
      fromBlock: `0x${fromBlock.toString(16)}`,
      toBlock: `0x${toBlock.toString(16)}`,
      address: null,
      // Get logs from all addresses
      topics: [
        null,
        // Any event
        `0x000000000000000000000000${address.slice(2).toLowerCase()}`,
        // From address
        `0x000000000000000000000000${address.slice(2).toLowerCase()}`
        // To address
      ]
    }]);
    const uniqueTxHashes = Array.from(new Set(logs.map((log) => log.transactionHash)));
    const transactions = await Promise.all(
      uniqueTxHashes.slice(0, limit).map((hash) => this.fetchTransactionByHash(url, hash))
    );
    return transactions.filter(Boolean);
  }
  /**
   * Fetch ERC20 token transfers
   */
  async fetchTokenTransfers(url, address, fromBlock, toBlock, limit) {
    const paddedAddress = `0x000000000000000000000000${address.slice(2).toLowerCase()}`;
    const sentLogs = await this.rpcCall(url, "eth_getLogs", [{
      fromBlock: `0x${fromBlock.toString(16)}`,
      toBlock: `0x${toBlock.toString(16)}`,
      topics: [
        this.TRANSFER_EVENT_SIGNATURE,
        paddedAddress,
        // From address
        null
        // Any recipient
      ]
    }]);
    const receivedLogs = await this.rpcCall(url, "eth_getLogs", [{
      fromBlock: `0x${fromBlock.toString(16)}`,
      toBlock: `0x${toBlock.toString(16)}`,
      topics: [
        this.TRANSFER_EVENT_SIGNATURE,
        null,
        // Any sender
        paddedAddress
        // To address
      ]
    }]);
    const allLogs = [...sentLogs, ...receivedLogs];
    const uniqueLogs = Array.from(
      new Map(allLogs.map((log) => [log.transactionHash + log.logIndex, log])).values()
    );
    const transfers = await Promise.all(
      uniqueLogs.slice(0, limit).map((log) => this.convertLogToTransaction(url, log, address))
    );
    return transfers.filter(Boolean);
  }
  /**
   * Convert a log entry to a transaction
   */
  async convertLogToTransaction(url, log, userAddress) {
    try {
      const tx = await this.fetchTransactionByHash(url, log.transactionHash);
      if (!tx) return null;
      const value = log.data ? parseInt(log.data, 16).toString() : "0";
      const fromAddress = `0x${log.topics[1].slice(26)}`;
      const toAddress = `0x${log.topics[2].slice(26)}`;
      const isOutgoing = fromAddress.toLowerCase() === userAddress.toLowerCase();
      return {
        ...tx,
        value,
        from: fromAddress,
        to: toAddress,
        type: isOutgoing ? "send" : "receive",
        tokenAddress: log.address,
        symbol: "TOKEN"
        // Would need additional call to get token symbol
      };
    } catch (error) {
      console.error("Error converting log to transaction:", error);
      return null;
    }
  }
  /**
   * Fetch a transaction by hash and get its details
   */
  async fetchTransactionByHash(url, hash) {
    try {
      const [tx, receipt] = await Promise.all([
        this.rpcCall(url, "eth_getTransactionByHash", [hash]),
        this.rpcCall(url, "eth_getTransactionReceipt", [hash])
      ]);
      if (!tx) return null;
      const block = await this.rpcCall(url, "eth_getBlockByNumber", [tx.blockNumber, false]);
      const timestamp = parseInt(block.timestamp, 16) * 1e3;
      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to || "",
        value: parseInt(tx.value, 16).toString(),
        blockNumber: parseInt(tx.blockNumber, 16),
        timestamp,
        nonce: parseInt(tx.nonce, 16),
        gasPrice: parseInt(tx.gasPrice || tx.maxFeePerGas || "0", 16).toString(),
        gasUsed: receipt ? parseInt(receipt.gasUsed, 16).toString() : void 0,
        gasLimit: parseInt(tx.gas, 16).toString(),
        status: receipt ? receipt.status === "0x1" ? "confirmed" : "failed" : "pending",
        type: this.determineTransactionType(tx),
        chainId: parseInt(tx.chainId || "0x1", 16),
        symbol: "ETH"
      };
    } catch (error) {
      console.error("Error fetching transaction:", hash, error);
      return null;
    }
  }
  /**
   * Fetch a single transaction by hash
   */
  async fetchTransaction(txHash, chainId) {
    const url = this.buildRpcUrl(chainId);
    const tx = await this.fetchTransactionByHash(url, txHash);
    if (tx) {
      const currentBlock = await this.getCurrentBlockNumber(chainId);
      tx.confirmations = currentBlock - tx.blockNumber;
      tx.chainId = chainId;
    }
    return tx;
  }
}
class QuickNodeTransactionProvider extends AbstractTransactionProvider {
  constructor(config) {
    super(config, "QuickNode");
    this.SUPPORTED_CHAINS = [1, 11155111, 137, 42161, 10, 56, 43114];
    this.validateConfig();
  }
  /**
   * Build the RPC URL for QuickNode
   * QuickNode URLs are typically in format: https://xxx.quiknode.pro/yyy/
   */
  buildRpcUrl(chainId) {
    if (!this.config.apiKey.includes("quiknode.pro")) {
      throw new Error("QuickNode requires a valid QuickNode endpoint URL as the API key");
    }
    return this.config.apiKey;
  }
  /**
   * Check if the provider supports a specific chain
   */
  supportsChain(chainId) {
    return this.SUPPORTED_CHAINS.includes(chainId);
  }
  /**
   * Get supported chains
   */
  getSupportedChains() {
    return [...this.SUPPORTED_CHAINS];
  }
  /**
   * Get the current block number
   */
  async getCurrentBlockNumber(chainId) {
    const url = this.buildRpcUrl(chainId);
    const result = await this.rpcCall(url, "eth_blockNumber");
    return parseInt(result, 16);
  }
  /**
   * Fetch transactions using QuickNode's qn_getWalletTokenTransactions
   */
  async fetchTransactions(address, chainId, options = {}) {
    if (!this.supportsChain(chainId)) {
      throw new Error(`Chain ${chainId} is not supported by QuickNode`);
    }
    const url = this.buildRpcUrl(chainId);
    const limit = options.limit || 100;
    try {
      const transactions = await this.fetchWithQuickNodeAPI(url, address, limit);
      if (transactions.length > 0) {
        return transactions.map((tx) => ({ ...tx, chainId }));
      }
    } catch (error) {
      console.warn("QuickNode enhanced API not available, falling back to standard methods", error);
    }
    return this.fetchWithStandardRPC(url, address, chainId, options);
  }
  /**
   * Fetch transactions using QuickNode's enhanced API
   */
  async fetchWithQuickNodeAPI(url, address, limit) {
    try {
      const tokenTxResult = await this.rpcCall(url, "qn_getWalletTokenTransactions", [{
        address,
        page: 1,
        perPage: limit
      }]);
      const transactions = [];
      if (tokenTxResult && tokenTxResult.transfers) {
        for (const transfer of tokenTxResult.transfers) {
          transactions.push(this.convertQuickNodeTransfer(transfer, address));
        }
      }
      const txListResult = await this.rpcCall(url, "qn_getTransactionsByAddress", [{
        address,
        page: 1,
        perPage: limit
      }]);
      if (txListResult && txListResult.transactions) {
        for (const tx of txListResult.transactions) {
          transactions.push(await this.convertQuickNodeTransaction(tx, url));
        }
      }
      return transactions;
    } catch (error) {
      throw error;
    }
  }
  /**
   * Fallback to standard RPC methods
   */
  async fetchWithStandardRPC(url, address, chainId, options) {
    const currentBlock = await this.getCurrentBlockNumber(chainId);
    const startBlock = options.startBlock || Math.max(0, currentBlock - 1e4);
    const endBlock = options.endBlock || currentBlock;
    const limit = options.limit || 100;
    const logs = await this.fetchLogsForAddress(url, address, startBlock, endBlock);
    const txHashes = [...new Set(logs.map((log) => log.transactionHash))];
    const transactions = await Promise.all(
      txHashes.slice(0, limit).map((hash) => this.fetchTransactionByHash(url, hash))
    );
    return transactions.filter(Boolean).map((tx) => ({
      ...tx,
      confirmations: currentBlock - tx.blockNumber,
      chainId
    }));
  }
  /**
   * Fetch logs for an address
   */
  async fetchLogsForAddress(url, address, fromBlock, toBlock) {
    const paddedAddress = `0x000000000000000000000000${address.slice(2).toLowerCase()}`;
    const [sentLogs, receivedLogs] = await Promise.all([
      this.rpcCall(url, "eth_getLogs", [{
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: `0x${toBlock.toString(16)}`,
        topics: [
          null,
          paddedAddress,
          // From address
          null
        ]
      }]),
      this.rpcCall(url, "eth_getLogs", [{
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: `0x${toBlock.toString(16)}`,
        topics: [
          null,
          null,
          paddedAddress
          // To address
        ]
      }])
    ]);
    return [...sentLogs, ...receivedLogs];
  }
  /**
   * Fetch a transaction by hash
   */
  async fetchTransactionByHash(url, hash) {
    try {
      const [tx, receipt] = await Promise.all([
        this.rpcCall(url, "eth_getTransactionByHash", [hash]),
        this.rpcCall(url, "eth_getTransactionReceipt", [hash])
      ]);
      if (!tx) return null;
      const block = await this.rpcCall(url, "eth_getBlockByNumber", [tx.blockNumber, false]);
      const timestamp = parseInt(block.timestamp, 16) * 1e3;
      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to || "",
        value: parseInt(tx.value, 16).toString(),
        blockNumber: parseInt(tx.blockNumber, 16),
        timestamp,
        nonce: parseInt(tx.nonce, 16),
        gasPrice: parseInt(tx.gasPrice || tx.maxFeePerGas || "0", 16).toString(),
        gasUsed: receipt ? parseInt(receipt.gasUsed, 16).toString() : void 0,
        gasLimit: parseInt(tx.gas, 16).toString(),
        status: receipt ? receipt.status === "0x1" ? "confirmed" : "failed" : "pending",
        type: this.determineTransactionType(tx),
        chainId: parseInt(tx.chainId || "0x1", 16),
        symbol: "ETH"
      };
    } catch (error) {
      console.error("Error fetching transaction:", hash, error);
      return null;
    }
  }
  /**
   * Fetch a single transaction by hash
   */
  async fetchTransaction(txHash, chainId) {
    const url = this.buildRpcUrl(chainId);
    const tx = await this.fetchTransactionByHash(url, txHash);
    if (tx) {
      const currentBlock = await this.getCurrentBlockNumber(chainId);
      tx.confirmations = currentBlock - tx.blockNumber;
      tx.chainId = chainId;
    }
    return tx;
  }
  /**
   * Convert QuickNode transfer format to standard
   */
  convertQuickNodeTransfer(transfer, userAddress) {
    var _a;
    const isOutgoing = ((_a = transfer.from) == null ? void 0 : _a.toLowerCase()) === userAddress.toLowerCase();
    return {
      hash: transfer.transactionHash,
      from: transfer.from,
      to: transfer.to,
      value: transfer.value || "0",
      blockNumber: transfer.blockNumber,
      timestamp: transfer.timestamp || Date.now(),
      type: isOutgoing ? "send" : "receive",
      chainId: 1,
      symbol: transfer.symbol || "ETH",
      tokenAddress: transfer.contractAddress,
      tokenName: transfer.name,
      tokenDecimals: transfer.decimals,
      status: "confirmed"
    };
  }
  /**
   * Convert QuickNode transaction format to standard
   */
  async convertQuickNodeTransaction(tx, url) {
    const receipt = await this.rpcCall(url, "eth_getTransactionReceipt", [tx.hash]);
    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to || "",
      value: tx.value || "0",
      blockNumber: tx.blockNumber,
      timestamp: tx.timestamp || Date.now(),
      nonce: tx.nonce,
      gasPrice: tx.gasPrice,
      gasUsed: receipt ? receipt.gasUsed : void 0,
      gasLimit: tx.gas,
      status: receipt ? receipt.status === "0x1" ? "confirmed" : "failed" : "pending",
      type: this.determineTransactionType(tx),
      chainId: 1,
      symbol: "ETH"
    };
  }
}
exports.AbstractTransactionProvider = AbstractTransactionProvider;
exports.AlchemyProvider = AlchemyProvider;
exports.AlchemyTransactionProvider = AlchemyTransactionProvider;
exports.BrandingManager = BrandingManager;
exports.CoinGeckoHistoricalProvider = CoinGeckoHistoricalProvider;
exports.EmbeddedProvider = EmbeddedProvider;
exports.EmbeddedWallet = EmbeddedWallet;
exports.EtherscanTransactionProvider = EtherscanTransactionProvider;
exports.EventBridge = EventBridge;
exports.HistoricalPriceService = HistoricalPriceService;
exports.InfuraTransactionProvider = InfuraTransactionProvider;
exports.ModBuilder = ModBuilder;
exports.ModTemplate = ModTemplate;
exports.OnChainDEXProvider = OnChainDEXProvider;
exports.ProviderManager = ProviderManager;
exports.QuickNodeTransactionProvider = QuickNodeTransactionProvider;
exports.RPCHandler = RPCHandler;
exports.RPC_ERROR_CODES = RPC_ERROR_CODES;
exports.SecureChannel = SecureChannel;
exports.StandardRPCMethods = StandardRPCMethods;
exports.WalletClient = WalletClient;
exports.WalletConnector = WalletConnector;
exports.WhiteLabelWallet = WhiteLabelWallet;
exports.YAKKLRPCMethods = YAKKLRPCMethods;
exports.YakklProvider = YakklProvider;
exports.createBrandingManager = createBrandingManager;
exports.createEmbeddedWallet = createEmbeddedWallet;
exports.createEnterpriseWhiteLabelWallet = createEnterpriseWhiteLabelWallet;
exports.createEventBridge = createEventBridge;
exports.createMod = createMod;
exports.createModFromTemplate = createModFromTemplate;
exports.createQuickWhiteLabelWallet = createQuickWhiteLabelWallet;
exports.createWalletConnector = createWalletConnector;
exports.createWhiteLabelWallet = createWhiteLabelWallet;
exports.createYAKKLRPCHandler = createYAKKLRPCHandler;
exports.createYakklProvider = createYakklProvider;
exports.generateModPackage = generateModPackage;
exports.modTemplates = modTemplates;
exports.whitelabelTemplates = whitelabelTemplates;
//# sourceMappingURL=index.js.map
