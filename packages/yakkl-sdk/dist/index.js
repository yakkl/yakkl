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
class EmbeddedWallet extends eventemitter3.EventEmitter {
  constructor(config) {
    var _a;
    super();
    this.container = null;
    this.initialized = false;
    this.config = config;
    const engineConfig = {
      name: ((_a = config.branding) == null ? void 0 : _a.name) || "Embedded YAKKL",
      version: "1.0.0",
      embedded: true,
      restrictions: config.restrictions || [],
      modDiscovery: config.enableMods !== false,
      branding: config.branding
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
      capabilities: {
        ui: false,
        background: false,
        api: false,
        storage: false,
        network: false
      }
    };
  }
  /**
   * Add UI capabilities to the mod
   */
  withUI(components) {
    this.components.push(...components);
    this.capabilities.ui = true;
    return this;
  }
  /**
   * Add background processing capabilities
   */
  withBackground(scripts) {
    this.capabilities.background = true;
    return this;
  }
  /**
   * Add API capabilities
   */
  withAPI(endpoints) {
    this.capabilities.api = true;
    return this;
  }
  /**
   * Add storage capabilities
   */
  withStorage(maxSize = 1024 * 1024) {
    this.capabilities.storage = true;
    return this;
  }
  /**
   * Add network access capabilities
   */
  withNetwork(allowedHosts) {
    this.capabilities.network = true;
    return this;
  }
  /**
   * Add permissions required by the mod
   */
  withPermissions(permissions) {
    this.manifest.permissions = [...this.manifest.permissions || [], ...permissions];
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
      tier: "community"
    }).withUI([
      {
        id: "portfolio-widget",
        name: "Portfolio Widget",
        type: "widget",
        mountPoint: "dashboard",
        props: {},
        conditions: []
      }
    ]).withStorage(5 * 1024 * 1024).withPermissions(["storage", "network"]).withNetwork(["api.coingecko.com", "api.coinmarketcap.com"]);
  }
  static tradingBot(config) {
    return new ModBuilder({
      ...config,
      description: config.description || "Automated trading strategies",
      category: "trading",
      tags: ["trading", "automation", "bot"],
      tier: "pro"
    }).withBackground(["trading-engine.js"]).withAPI(["execute-trade", "get-strategies"]).withStorage(10 * 1024 * 1024).withPermissions(["storage", "network", "transactions"]).withNetwork(["api.binance.com", "api.coinbase.com"]);
  }
  static defiDashboard(config) {
    return new ModBuilder({
      ...config,
      description: config.description || "Monitor DeFi positions and yields",
      category: "defi",
      tags: ["defi", "yield", "dashboard"],
      tier: "community"
    }).withUI([
      {
        id: "defi-dashboard",
        name: "DeFi Dashboard",
        type: "page",
        mountPoint: "dashboard",
        props: {},
        conditions: []
      }
    ]).withNetwork(["api.defipulse.com", "api.yearn.finance"]).withPermissions(["storage", "network"]);
  }
  static nftGallery(config) {
    return new ModBuilder({
      ...config,
      description: config.description || "Display and manage NFT collections",
      category: "nft",
      tags: ["nft", "gallery", "collectibles"],
      tier: "community"
    }).withUI([
      {
        id: "nft-gallery",
        name: "NFT Gallery",
        type: "page",
        mountPoint: "portfolio",
        props: {},
        conditions: []
      }
    ]).withStorage(50 * 1024 * 1024).withNetwork(["api.opensea.io", "api.rarible.org"]).withPermissions(["storage", "network"]);
  }
  static priceAlerts(config) {
    return new ModBuilder({
      ...config,
      description: config.description || "Set price alerts for cryptocurrencies",
      category: "alerts",
      tags: ["alerts", "notifications", "price"],
      tier: "community"
    }).withBackground(["price-monitor.js"]).withUI([
      {
        id: "alert-settings",
        name: "Alert Settings",
        type: "modal",
        mountPoint: "settings",
        props: {},
        conditions: []
      }
    ]).withStorage(1 * 1024 * 1024).withNetwork(["api.coingecko.com"]).withPermissions(["storage", "network", "notifications"]);
  }
  static transactionAnalyzer(config) {
    return new ModBuilder({
      ...config,
      description: config.description || "Analyze transaction patterns and costs",
      category: "analytics",
      tags: ["analytics", "transactions", "gas"],
      tier: "pro"
    }).withUI([
      {
        id: "tx-analyzer",
        name: "Transaction Analyzer",
        type: "page",
        mountPoint: "transaction",
        props: {},
        conditions: []
      }
    ]).withStorage(20 * 1024 * 1024).withNetwork(["api.etherscan.io", "api.polygonscan.com"]).withPermissions(["storage", "network", "transactions"]);
  }
  static securityScanner(config) {
    return new ModBuilder({
      ...config,
      description: config.description || "Scan transactions and contracts for security issues",
      category: "security",
      tags: ["security", "scanner", "audit"],
      tier: "private"
    }).withBackground(["security-scanner.js"]).withAPI(["scan-transaction", "scan-contract"]).withStorage(5 * 1024 * 1024).withNetwork(["api.slither.io", "api.mythx.io"]).withPermissions(["storage", "network", "transactions"]);
  }
  static backupManager(config) {
    return new ModBuilder({
      ...config,
      description: config.description || "Secure backup and recovery management",
      category: "security",
      tags: ["backup", "recovery", "security"],
      tier: "enterprise"
    }).withUI([
      {
        id: "backup-settings",
        name: "Backup Settings",
        type: "page",
        mountPoint: "settings",
        props: {},
        conditions: []
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
        logLevel: this.config.logLevel || "warn",
        provider: true
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
      this._chainId = `0x${currentNetwork.chainId.toString(16)}`;
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
        return await this.engine.accounts.getBalance(params[0]);
      case "eth_sendTransaction":
        if (!params[0]) throw new Error("Transaction object required");
        const transaction = await this.engine.transactions.send(params[0]);
        return transaction.hash;
      case "eth_signTransaction":
        if (!params[0]) throw new Error("Transaction object required");
        const signedTx = await this.engine.transactions.sign(params[0]);
        return signedTx.serialized;
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
      await this.engine.networks.switchTo(numericChainId.toString());
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
      await this.engine.networks.add({
        id: chainName.toLowerCase().replace(/\s+/g, "-"),
        chainId: parseInt(chainId, 16),
        name: chainName,
        rpcUrl: rpcUrls[0],
        currency: nativeCurrency,
        explorerUrl: blockExplorerUrls == null ? void 0 : blockExplorerUrls[0]
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
    this.engine.on("transaction:sent", (transaction) => {
      this.emit("message", {
        type: "transaction:sent",
        data: { hash: transaction.hash }
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
exports.BrandingManager = BrandingManager;
exports.EmbeddedProvider = EmbeddedProvider;
exports.EmbeddedWallet = EmbeddedWallet;
exports.EventBridge = EventBridge;
exports.ModBuilder = ModBuilder;
exports.ModTemplate = ModTemplate;
exports.SecureChannel = SecureChannel;
exports.WalletConnector = WalletConnector;
exports.WhiteLabelWallet = WhiteLabelWallet;
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
exports.createYakklProvider = createYakklProvider;
exports.generateModPackage = generateModPackage;
exports.modTemplates = modTemplates;
exports.whitelabelTemplates = whitelabelTemplates;
//# sourceMappingURL=index.js.map
