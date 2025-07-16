import { EventEmitter as l } from "eventemitter3";
import { M as g, D as y } from "./DiscoveryProtocol-C3idOBxL.mjs";
import { ethers as o } from "ethers";
class m extends l {
  constructor(t) {
    super(), this.accounts = /* @__PURE__ */ new Map(), this.currentAccountId = null, this.initialized = !1, this.engine = t;
  }
  /**
   * Initialize the account manager
   */
  async initialize() {
    if (!this.initialized)
      try {
        await this.loadAccounts(), await this.loadCurrentAccount(), this.initialized = !0;
      } catch (t) {
        throw new Error(`Failed to initialize AccountManager: ${t}`);
      }
  }
  /**
   * Create a new account
   */
  async create(t) {
    this.ensureInitialized();
    try {
      const e = o.Wallet.createRandom(), r = {
        id: this.generateId(),
        address: e.address,
        name: t || `Account ${this.accounts.size + 1}`,
        type: "eoa",
        publicKey: e.signingKey.publicKey,
        derivationPath: void 0,
        // For random wallets
        ens: void 0,
        username: void 0,
        avatar: void 0,
        createdAt: /* @__PURE__ */ new Date(),
        lastUsed: /* @__PURE__ */ new Date(),
        metadata: {
          isHardware: !1,
          isImported: !1,
          isWatchOnly: !1
        }
      };
      return this.accounts.set(r.id, r), await this.storePrivateKey(r.id, e.privateKey), await this.saveAccounts(), this.emit("account:created", r), this.accounts.size === 1 && await this.select(r.id), r;
    } catch (e) {
      throw new Error(`Failed to create account: ${e}`);
    }
  }
  /**
   * Import account from private key
   */
  async importFromPrivateKey(t, e) {
    this.ensureInitialized();
    try {
      const r = new o.Wallet(t);
      if (Array.from(this.accounts.values()).find((n) => n.address.toLowerCase() === r.address.toLowerCase()))
        throw new Error("Account already exists");
      const i = {
        id: this.generateId(),
        address: r.address,
        name: e || "Imported Account",
        type: "eoa",
        publicKey: r.signingKey.publicKey,
        derivationPath: void 0,
        ens: void 0,
        username: void 0,
        avatar: void 0,
        createdAt: /* @__PURE__ */ new Date(),
        lastUsed: /* @__PURE__ */ new Date(),
        metadata: {
          isHardware: !1,
          isImported: !0,
          isWatchOnly: !1
        }
      };
      return this.accounts.set(i.id, i), await this.storePrivateKey(i.id, t), await this.saveAccounts(), this.emit("account:created", i), i;
    } catch (r) {
      throw new Error(`Failed to import account: ${r}`);
    }
  }
  /**
   * Add watch-only account
   */
  async addWatchOnly(t, e) {
    this.ensureInitialized();
    try {
      if (!o.isAddress(t))
        throw new Error("Invalid address");
      if (Array.from(this.accounts.values()).find((i) => i.address.toLowerCase() === t.toLowerCase()))
        throw new Error("Account already exists");
      const s = {
        id: this.generateId(),
        address: o.getAddress(t),
        // Checksum address
        name: e || "Watch-Only Account",
        type: "watched",
        publicKey: "",
        // Not available for watch-only
        derivationPath: void 0,
        ens: void 0,
        username: void 0,
        avatar: void 0,
        createdAt: /* @__PURE__ */ new Date(),
        lastUsed: /* @__PURE__ */ new Date(),
        metadata: {
          isHardware: !1,
          isImported: !1,
          isWatchOnly: !0
        }
      };
      return this.accounts.set(s.id, s), await this.saveAccounts(), this.emit("account:created", s), s;
    } catch (r) {
      throw new Error(`Failed to add watch-only account: ${r}`);
    }
  }
  /**
   * Update account information
   */
  async update(t, e) {
    this.ensureInitialized();
    const r = this.accounts.get(t);
    if (!r)
      throw new Error("Account not found");
    const s = {
      ...r,
      ...e,
      id: r.id,
      // Prevent ID changes
      address: r.address,
      // Prevent address changes
      lastUsed: /* @__PURE__ */ new Date()
    };
    return this.accounts.set(t, s), await this.saveAccounts(), this.emit("account:updated", s), s;
  }
  /**
   * Remove an account
   */
  async remove(t) {
    if (this.ensureInitialized(), !this.accounts.get(t))
      throw new Error("Account not found");
    if (this.accounts.size === 1)
      throw new Error("Cannot remove the last account");
    if (this.accounts.delete(t), await this.removePrivateKey(t), await this.saveAccounts(), this.currentAccountId === t) {
      const r = Array.from(this.accounts.values())[0];
      await this.select(r.id);
    }
    this.emit("account:removed", t);
  }
  /**
   * Select an account as current
   */
  async select(t) {
    this.ensureInitialized();
    const e = this.accounts.get(t);
    if (!e)
      throw new Error("Account not found");
    const r = {
      ...e,
      lastUsed: /* @__PURE__ */ new Date()
    };
    return this.accounts.set(t, r), this.currentAccountId = t, await this.saveCurrentAccount(), await this.saveAccounts(), this.emit("account:selected", r), r;
  }
  /**
   * Get all accounts
   */
  getAll() {
    return Array.from(this.accounts.values()).sort((t, e) => e.lastUsed.getTime() - t.lastUsed.getTime());
  }
  /**
   * Get account by ID
   */
  get(t) {
    return this.accounts.get(t) || null;
  }
  /**
   * Get account by address
   */
  async getByAddress(t) {
    const e = t.toLowerCase();
    return Array.from(this.accounts.values()).find((r) => r.address.toLowerCase() === e) || null;
  }
  /**
   * Get current account
   */
  getCurrent() {
    return this.currentAccountId && this.accounts.get(this.currentAccountId) || null;
  }
  /**
   * Get private key for account (if available)
   */
  async getPrivateKey(t) {
    this.ensureInitialized();
    const e = this.accounts.get(t);
    if (!e)
      throw new Error("Account not found");
    if (e.type === "watched")
      throw new Error("Watch-only accounts have no private key");
    return this.loadPrivateKey(t);
  }
  /**
   * Sign a message with account
   */
  async signMessage(t, e) {
    const r = await this.getPrivateKey(t);
    return new o.Wallet(r).signMessage(e);
  }
  /**
   * Destroy the account manager
   */
  async destroy() {
    this.accounts.clear(), this.currentAccountId = null, this.initialized = !1, this.removeAllListeners();
  }
  /**
   * Private methods
   */
  generateId() {
    return `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  async loadAccounts() {
    try {
      const t = localStorage.getItem("yakkl:accounts");
      if (t) {
        const e = JSON.parse(t);
        for (const r of e)
          r.createdAt = new Date(r.createdAt), r.lastUsed = new Date(r.lastUsed), this.accounts.set(r.id, r);
      }
    } catch (t) {
      console.warn("Failed to load accounts:", t);
    }
  }
  async saveAccounts() {
    try {
      const t = Array.from(this.accounts.values());
      localStorage.setItem("yakkl:accounts", JSON.stringify(t));
    } catch (t) {
      throw console.error("Failed to save accounts:", t), t;
    }
  }
  async loadCurrentAccount() {
    try {
      const t = localStorage.getItem("yakkl:currentAccount");
      t && this.accounts.has(t) ? this.currentAccountId = t : this.accounts.size > 0 && (this.currentAccountId = Array.from(this.accounts.keys())[0]);
    } catch (t) {
      console.warn("Failed to load current account:", t);
    }
  }
  async saveCurrentAccount() {
    try {
      this.currentAccountId && localStorage.setItem("yakkl:currentAccount", this.currentAccountId);
    } catch (t) {
      console.error("Failed to save current account:", t);
    }
  }
  async storePrivateKey(t, e) {
    try {
      localStorage.setItem(`yakkl:pk:${t}`, e);
    } catch (r) {
      throw console.error("Failed to store private key:", r), r;
    }
  }
  async loadPrivateKey(t) {
    try {
      const e = localStorage.getItem(`yakkl:pk:${t}`);
      if (!e)
        throw new Error("Private key not found");
      return e;
    } catch (e) {
      throw console.error("Failed to load private key:", e), e;
    }
  }
  async removePrivateKey(t) {
    try {
      localStorage.removeItem(`yakkl:pk:${t}`);
    } catch (e) {
      console.error("Failed to remove private key:", e);
    }
  }
  ensureInitialized() {
    if (!this.initialized)
      throw new Error("AccountManager not initialized");
  }
}
class f extends l {
  constructor(t) {
    super(), this.networks = /* @__PURE__ */ new Map(), this.providers = /* @__PURE__ */ new Map(), this.currentNetworkId = null, this.initialized = !1, this.engine = t;
  }
  /**
   * Initialize the network manager
   */
  async initialize() {
    if (!this.initialized)
      try {
        await this.loadDefaultNetworks(), await this.loadCustomNetworks(), await this.loadCurrentNetwork(), this.initialized = !0;
      } catch (t) {
        throw new Error(`Failed to initialize NetworkManager: ${t}`);
      }
  }
  /**
   * Get all supported networks
   */
  getSupported() {
    return Array.from(this.networks.values()).sort((t, e) => t.isMainnet && !e.isMainnet ? -1 : !t.isMainnet && e.isMainnet ? 1 : !t.isTestnet && e.isTestnet ? -1 : t.isTestnet && !e.isTestnet ? 1 : t.name.localeCompare(e.name));
  }
  /**
   * Get network by ID
   */
  get(t) {
    return this.networks.get(t) || null;
  }
  /**
   * Get current network
   */
  getCurrent() {
    return this.currentNetworkId && this.networks.get(this.currentNetworkId) || null;
  }
  /**
   * Switch to a different network
   */
  async switch(t) {
    this.ensureInitialized();
    const e = this.networks.get(t);
    if (!e)
      throw new Error("Network not found");
    return await this.testConnection(e), this.currentNetworkId = t, await this.saveCurrentNetwork(), this.emit("network:switched", e), e;
  }
  /**
   * Add a custom network
   */
  async add(t) {
    if (this.ensureInitialized(), await this.validateNetworkConfig(t), Array.from(this.networks.values()).find((s) => s.chainId === t.chainId))
      throw new Error("Network with this chain ID already exists");
    const r = {
      id: this.generateNetworkId(),
      ...t,
      isCustom: !0
    };
    return this.networks.set(r.id, r), await this.saveCustomNetworks(), this.emit("network:added", r), r;
  }
  /**
   * Update a custom network
   */
  async update(t, e) {
    this.ensureInitialized();
    const r = this.networks.get(t);
    if (!r)
      throw new Error("Network not found");
    if (!r.isCustom)
      throw new Error("Cannot update built-in networks");
    const s = {
      ...r,
      ...e,
      id: r.id,
      // Prevent ID changes
      isCustom: !0
      // Ensure it stays custom
    };
    return await this.validateNetworkConfig(s), this.networks.set(t, s), await this.saveCustomNetworks(), this.emit("network:updated", s), s;
  }
  /**
   * Remove a custom network
   */
  async remove(t) {
    this.ensureInitialized();
    const e = this.networks.get(t);
    if (!e)
      throw new Error("Network not found");
    if (!e.isCustom)
      throw new Error("Cannot remove built-in networks");
    const r = this.providers.get(t);
    if (r && (r.destroy(), this.providers.delete(t)), this.networks.delete(t), await this.saveCustomNetworks(), this.currentNetworkId === t) {
      const s = Array.from(this.networks.values()).find((i) => i.isMainnet && !i.isCustom);
      s && await this.switch(s.id);
    }
    this.emit("network:removed", t);
  }
  /**
   * Get provider for network
   */
  getProvider(t) {
    const e = t || this.currentNetworkId;
    if (!e) return null;
    if (this.providers.has(e))
      return this.providers.get(e);
    const r = this.networks.get(e);
    if (!r) return null;
    try {
      const s = new o.JsonRpcProvider(r.rpcUrl);
      return this.providers.set(e, s), s;
    } catch (s) {
      return console.error(`Failed to create provider for network ${e}:`, s), null;
    }
  }
  /**
   * Test connection to a network
   */
  async testConnection(t) {
    try {
      const r = await new o.JsonRpcProvider(t.rpcUrl).getNetwork();
      if (Number(r.chainId) !== t.chainId)
        throw new Error("Chain ID mismatch");
      return !0;
    } catch (e) {
      throw new Error(`Network connection failed: ${e}`);
    }
  }
  /**
   * Get network statistics
   */
  async getNetworkStats(t) {
    const e = this.getProvider(t);
    if (!e)
      throw new Error("No provider available");
    try {
      const [r, s, i] = await Promise.all([
        e.getBlockNumber(),
        e.getFeeData(),
        e.getNetwork()
      ]);
      return {
        blockNumber: r,
        gasPrice: s.gasPrice || 0n,
        chainId: Number(i.chainId)
      };
    } catch (r) {
      throw new Error(`Failed to get network stats: ${r}`);
    }
  }
  /**
   * Destroy the network manager
   */
  async destroy() {
    for (const t of this.providers.values())
      t.destroy();
    this.networks.clear(), this.providers.clear(), this.currentNetworkId = null, this.initialized = !1, this.removeAllListeners();
  }
  /**
   * Private methods
   */
  async loadDefaultNetworks() {
    const t = [
      // Ethereum Mainnet
      {
        id: "ethereum",
        name: "Ethereum",
        chainId: 1,
        symbol: "ETH",
        rpcUrl: "https://eth.llamarpc.com",
        blockExplorerUrl: "https://etherscan.io",
        isTestnet: !1,
        isMainnet: !0,
        isCustom: !1,
        iconUrl: "/networks/ethereum.png",
        gasToken: {
          address: "0x0000000000000000000000000000000000000000",
          symbol: "ETH",
          name: "Ethereum",
          decimals: 18,
          chainId: 1,
          isNative: !0,
          isStable: !1
        },
        supportedFeatures: ["eip1559", "eip2930", "contracts", "tokens", "nft", "defi", "staking"]
      },
      // Polygon
      {
        id: "polygon",
        name: "Polygon",
        chainId: 137,
        symbol: "MATIC",
        rpcUrl: "https://polygon-rpc.com",
        blockExplorerUrl: "https://polygonscan.com",
        isTestnet: !1,
        isMainnet: !0,
        isCustom: !1,
        iconUrl: "/networks/polygon.png",
        gasToken: {
          address: "0x0000000000000000000000000000000000000000",
          symbol: "MATIC",
          name: "Polygon",
          decimals: 18,
          chainId: 137,
          isNative: !0,
          isStable: !1
        },
        supportedFeatures: ["eip1559", "eip2930", "contracts", "tokens", "nft", "defi", "bridges"]
      },
      // Arbitrum One
      {
        id: "arbitrum",
        name: "Arbitrum One",
        chainId: 42161,
        symbol: "ETH",
        rpcUrl: "https://arb1.arbitrum.io/rpc",
        blockExplorerUrl: "https://arbiscan.io",
        isTestnet: !1,
        isMainnet: !0,
        isCustom: !1,
        iconUrl: "/networks/arbitrum.png",
        gasToken: {
          address: "0x0000000000000000000000000000000000000000",
          symbol: "ETH",
          name: "Ethereum",
          decimals: 18,
          chainId: 42161,
          isNative: !0,
          isStable: !1
        },
        supportedFeatures: ["contracts", "tokens", "nft", "defi", "bridges"]
      },
      // Sepolia Testnet
      {
        id: "sepolia",
        name: "Sepolia",
        chainId: 11155111,
        symbol: "ETH",
        rpcUrl: "https://rpc.sepolia.org",
        blockExplorerUrl: "https://sepolia.etherscan.io",
        isTestnet: !0,
        isMainnet: !1,
        isCustom: !1,
        iconUrl: "/networks/ethereum.png",
        gasToken: {
          address: "0x0000000000000000000000000000000000000000",
          symbol: "ETH",
          name: "Ethereum",
          decimals: 18,
          chainId: 11155111,
          isNative: !0,
          isStable: !1
        },
        supportedFeatures: ["eip1559", "eip2930", "contracts", "tokens", "nft"]
      }
    ];
    for (const e of t)
      this.networks.set(e.id, e);
  }
  async loadCustomNetworks() {
    try {
      const t = localStorage.getItem("yakkl:customNetworks");
      if (t) {
        const e = JSON.parse(t);
        for (const r of e)
          this.networks.set(r.id, r);
      }
    } catch (t) {
      console.warn("Failed to load custom networks:", t);
    }
  }
  async saveCustomNetworks() {
    try {
      const t = Array.from(this.networks.values()).filter((e) => e.isCustom);
      localStorage.setItem("yakkl:customNetworks", JSON.stringify(t));
    } catch (t) {
      throw console.error("Failed to save custom networks:", t), t;
    }
  }
  async loadCurrentNetwork() {
    try {
      const t = localStorage.getItem("yakkl:currentNetwork");
      if (t && this.networks.has(t))
        this.currentNetworkId = t;
      else {
        const e = Array.from(this.networks.values()).find((r) => r.chainId === 1);
        e && (this.currentNetworkId = e.id);
      }
    } catch (t) {
      console.warn("Failed to load current network:", t);
    }
  }
  async saveCurrentNetwork() {
    try {
      this.currentNetworkId && localStorage.setItem("yakkl:currentNetwork", this.currentNetworkId);
    } catch (t) {
      console.error("Failed to save current network:", t);
    }
  }
  async validateNetworkConfig(t) {
    if (!t.name || !t.chainId || !t.rpcUrl)
      throw new Error("Network name, chainId, and rpcUrl are required");
    if (t.chainId <= 0)
      throw new Error("Chain ID must be positive");
    try {
      new URL(t.rpcUrl);
    } catch {
      throw new Error("Invalid RPC URL");
    }
    if (t.blockExplorerUrl)
      try {
        new URL(t.blockExplorerUrl);
      } catch {
        throw new Error("Invalid block explorer URL");
      }
  }
  generateNetworkId() {
    return `net_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  ensureInitialized() {
    if (!this.initialized)
      throw new Error("NetworkManager not initialized");
  }
}
class p extends l {
  constructor(t) {
    super(), this.pendingTransactions = /* @__PURE__ */ new Map(), this.transactionHistory = /* @__PURE__ */ new Map(), this.balanceCache = /* @__PURE__ */ new Map(), this.initialized = !1, this.engine = t;
  }
  /**
   * Initialize the transaction manager
   */
  async initialize() {
    if (!this.initialized)
      try {
        await this.loadTransactionHistory(), await this.loadPendingTransactions(), this.initialized = !0;
      } catch (t) {
        throw new Error(`Failed to initialize TransactionManager: ${t}`);
      }
  }
  /**
   * Sign a transaction
   */
  async sign(t) {
    this.ensureInitialized();
    try {
      const e = this.engine.getCurrentAccount();
      if (!e)
        throw new Error("No account selected");
      const r = await this.engine.accounts.getPrivateKey(e.id), s = new o.Wallet(r), i = this.engine.networks.getProvider();
      if (!i)
        throw new Error("No network provider available");
      const n = s.connect(i), u = {
        to: t.to,
        value: t.value,
        data: t.data,
        gasLimit: t.gasLimit,
        gasPrice: t.gasPrice,
        maxFeePerGas: t.maxFeePerGas,
        maxPriorityFeePerGas: t.maxPriorityFeePerGas,
        nonce: t.nonce,
        type: t.type
      }, a = await n.populateTransaction(u), c = await n.signTransaction(a), h = o.Transaction.from(c), w = {
        transaction: {
          ...t,
          gasLimit: a.gasLimit?.toString(),
          gasPrice: a.gasPrice?.toString(),
          maxFeePerGas: a.maxFeePerGas?.toString(),
          maxPriorityFeePerGas: a.maxPriorityFeePerGas?.toString(),
          nonce: a.nonce || 0
        },
        signature: {
          r: h.signature.r,
          s: h.signature.s,
          v: h.signature.v || 0
        },
        hash: h.hash,
        serialized: c
      };
      return this.emit("transaction:signed", w), w;
    } catch (e) {
      throw new Error(`Failed to sign transaction: ${e}`);
    }
  }
  /**
   * Send a transaction
   */
  async send(t) {
    this.ensureInitialized();
    try {
      const e = await this.sign(t), r = this.engine.networks.getProvider();
      if (!r)
        throw new Error("No network provider available");
      const s = await r.broadcastTransaction(e.serialized), i = s.hash;
      return this.pendingTransactions.set(i, t), await this.savePendingTransactions(), this.monitorTransaction(i, s), this.emit("transaction:sent", i, t), i;
    } catch (e) {
      throw new Error(`Failed to send transaction: ${e}`);
    }
  }
  /**
   * Get balance for an address
   */
  async getBalance(t) {
    this.ensureInitialized();
    try {
      const e = this.balanceCache.get(t);
      if (e && this.isBalanceCacheValid(e))
        return e;
      const r = this.engine.networks.getCurrent();
      if (!r)
        throw new Error("No network selected");
      const s = this.engine.networks.getProvider();
      if (!s)
        throw new Error("No network provider available");
      const i = await s.getBalance(t), n = {
        address: t,
        chainId: r.chainId,
        native: {
          token: r.gasToken,
          balance: i.toString(),
          value: "0",
          // Would calculate USD value in production
          price: "0"
        },
        tokens: [],
        // Would load ERC-20 tokens in production
        nfts: [],
        // Would load NFTs in production
        totalValue: "0",
        // Would calculate total USD value
        lastUpdated: /* @__PURE__ */ new Date()
      };
      return this.balanceCache.set(t, n), this.emit("balance:updated", t, n), n;
    } catch (e) {
      throw new Error(`Failed to get balance: ${e}`);
    }
  }
  /**
   * Get transaction history for an address
   */
  async getHistory(t, e = 50) {
    return this.ensureInitialized(), (this.transactionHistory.get(t) || []).slice(0, e);
  }
  /**
   * Estimate gas for a transaction
   */
  async estimateGas(t) {
    this.ensureInitialized();
    try {
      const e = this.engine.networks.getProvider();
      if (!e)
        throw new Error("No network provider available");
      return (await e.estimateGas({
        to: t.to,
        value: t.value,
        data: t.data
      })).toString();
    } catch (e) {
      throw new Error(`Failed to estimate gas: ${e}`);
    }
  }
  /**
   * Get current gas prices
   */
  async getGasPrices() {
    this.ensureInitialized();
    try {
      const t = this.engine.networks.getProvider();
      if (!t)
        throw new Error("No network provider available");
      const e = await t.getFeeData();
      if (e.maxFeePerGas && e.maxPriorityFeePerGas) {
        const s = e.maxFeePerGas - e.maxPriorityFeePerGas, i = e.maxPriorityFeePerGas / 2n, n = e.maxPriorityFeePerGas * 2n;
        return {
          slow: (s + i).toString(),
          standard: e.maxFeePerGas.toString(),
          fast: (s + n).toString(),
          maxFeePerGas: e.maxFeePerGas.toString(),
          maxPriorityFeePerGas: e.maxPriorityFeePerGas.toString()
        };
      }
      const r = e.gasPrice || 0n;
      return {
        slow: (r * 8n / 10n).toString(),
        // 80% of current
        standard: r.toString(),
        fast: (r * 12n / 10n).toString()
        // 120% of current
      };
    } catch (t) {
      throw new Error(`Failed to get gas prices: ${t}`);
    }
  }
  /**
   * Refresh balance for an address
   */
  async refreshBalance(t) {
    return this.balanceCache.delete(t), this.getBalance(t);
  }
  /**
   * Cancel a pending transaction (if possible)
   */
  async cancelTransaction(t) {
    this.ensureInitialized();
    const e = this.pendingTransactions.get(t);
    if (!e)
      throw new Error("Transaction not found or already confirmed");
    try {
      const r = this.engine.getCurrentAccount();
      if (!r)
        throw new Error("No account selected");
      const s = await this.getGasPrices(), i = {
        to: r.address,
        value: "0",
        chainId: e.chainId,
        nonce: e.nonce,
        gasLimit: "21000",
        // Use higher gas price to prioritize cancellation
        gasPrice: (BigInt(s.fast) * 11n / 10n).toString()
        // 110% of fast
      };
      return this.send(i);
    } catch (r) {
      throw new Error(`Failed to cancel transaction: ${r}`);
    }
  }
  /**
   * Destroy the transaction manager
   */
  async destroy() {
    this.pendingTransactions.clear(), this.transactionHistory.clear(), this.balanceCache.clear(), this.initialized = !1, this.removeAllListeners();
  }
  /**
   * Private methods
   */
  async monitorTransaction(t, e) {
    try {
      const r = await e.wait();
      this.pendingTransactions.delete(t), await this.savePendingTransactions(), await this.addToHistory(t, r), r.status === 1 ? this.emit("transaction:confirmed", t, r) : this.emit("transaction:failed", t, new Error("Transaction reverted"));
    } catch (r) {
      this.emit("transaction:failed", t, r);
    }
  }
  async addToHistory(t, e) {
    try {
      const r = this.engine.getCurrentAccount();
      if (!r) return;
      const s = this.engine.networks.getProvider();
      if (!s) return;
      const i = await s.getTransaction(t);
      if (!i) return;
      const n = await s.getBlock(e.blockNumber), u = {
        hash: t,
        blockNumber: e.blockNumber,
        timestamp: new Date(n.timestamp * 1e3),
        from: i.from || "",
        to: i.to || "",
        value: i.value.toString(),
        gasUsed: e.gasUsed.toString(),
        gasPrice: i.gasPrice?.toString() || "0",
        status: e.status === 1 ? "confirmed" : "failed",
        type: this.determineTransactionType(i),
        metadata: {
          blockHash: e.blockHash,
          transactionIndex: e.transactionIndex,
          logs: e.logs
        }
      }, a = r.address, c = this.transactionHistory.get(a) || [];
      c.unshift(u), c.length > 1e3 && c.splice(1e3), this.transactionHistory.set(a, c), await this.saveTransactionHistory();
    } catch (r) {
      console.error("Failed to add transaction to history:", r);
    }
  }
  determineTransactionType(t) {
    return t.data && t.data !== "0x" ? "contract" : (t.value && BigInt(t.value) > 0, "send");
  }
  isBalanceCacheValid(t) {
    return (/* @__PURE__ */ new Date()).getTime() - t.lastUpdated.getTime() < 3e4;
  }
  async loadTransactionHistory() {
    try {
      const t = localStorage.getItem("yakkl:transactionHistory");
      if (t) {
        const e = JSON.parse(t);
        for (const [r, s] of Object.entries(e)) {
          const i = s.map((n) => ({
            ...n,
            timestamp: new Date(n.timestamp)
          }));
          this.transactionHistory.set(r, i);
        }
      }
    } catch (t) {
      console.warn("Failed to load transaction history:", t);
    }
  }
  async saveTransactionHistory() {
    try {
      const t = Object.fromEntries(this.transactionHistory);
      localStorage.setItem("yakkl:transactionHistory", JSON.stringify(t));
    } catch (t) {
      console.error("Failed to save transaction history:", t);
    }
  }
  async loadPendingTransactions() {
    try {
      const t = localStorage.getItem("yakkl:pendingTransactions");
      if (t) {
        const e = JSON.parse(t);
        this.pendingTransactions = new Map(Object.entries(e));
      }
    } catch (t) {
      console.warn("Failed to load pending transactions:", t);
    }
  }
  async savePendingTransactions() {
    try {
      const t = Object.fromEntries(this.pendingTransactions);
      localStorage.setItem("yakkl:pendingTransactions", JSON.stringify(t));
    } catch (t) {
      console.error("Failed to save pending transactions:", t);
    }
  }
  ensureInitialized() {
    if (!this.initialized)
      throw new Error("TransactionManager not initialized");
  }
}
class k extends l {
  constructor(t = {}) {
    super(), this.initialized = !1, this.config = {
      name: "YAKKL Wallet",
      version: "1.0.0",
      embedded: !1,
      restrictions: [],
      modDiscovery: !0,
      ...t
    }, this.accounts = new m(this), this.networks = new f(this), this.transactions = new p(this), this.mods = new g(this), this.discovery = new y(this);
  }
  /**
   * Initialize the wallet engine
   */
  async initialize() {
    if (!this.initialized)
      try {
        await this.accounts.initialize(), await this.networks.initialize(), await this.transactions.initialize(), await this.mods.initialize(), this.config.modDiscovery && await this.discovery.start(), this.initialized = !0;
      } catch (t) {
        throw new Error(`Failed to initialize wallet engine: ${t}`);
      }
  }
  /**
   * Get wallet configuration
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * Core Account Management
   */
  async createAccount(t) {
    this.ensureInitialized();
    const e = await this.accounts.create(t);
    return this.emit("account:created", e), e;
  }
  async getAccounts() {
    return this.ensureInitialized(), this.accounts.getAll();
  }
  async selectAccount(t) {
    this.ensureInitialized();
    const e = await this.accounts.select(t);
    this.emit("account:selected", e);
  }
  getCurrentAccount() {
    return this.accounts.getCurrent();
  }
  /**
   * Core Network Management
   */
  async getSupportedNetworks() {
    return this.ensureInitialized(), this.networks.getSupported();
  }
  async switchNetwork(t) {
    this.ensureInitialized();
    const e = await this.networks.switch(t);
    this.emit("network:changed", e);
  }
  getCurrentNetwork() {
    return this.networks.getCurrent();
  }
  /**
   * Core Transaction Management
   */
  async signTransaction(t) {
    this.ensureInitialized();
    const e = await this.transactions.sign(t);
    return this.emit("transaction:signed", e), e;
  }
  async sendTransaction(t) {
    return this.ensureInitialized(), this.transactions.send(t);
  }
  async getBalance(t) {
    this.ensureInitialized();
    const e = t ? await this.accounts.getByAddress(t) : this.getCurrentAccount();
    if (!e)
      throw new Error("No account specified or selected");
    return this.transactions.getBalance(e.address);
  }
  /**
   * Mod Management
   */
  async loadMod(t) {
    this.ensureInitialized();
    const e = await this.mods.load(t);
    return this.emit("mod:loaded", e), e;
  }
  async getLoadedMods() {
    return this.mods.getLoaded();
  }
  async discoverMods() {
    this.ensureInitialized();
    const t = await this.discovery.scan();
    return this.emit("mod:discovered", t), t;
  }
  /**
   * Integration APIs
   */
  getEmbeddedAPI() {
    return null;
  }
  getRemoteAPI() {
    return null;
  }
  /**
   * Utility Methods
   */
  isInitialized() {
    return this.initialized;
  }
  async destroy() {
    await this.discovery.stop(), await this.mods.destroy(), await this.transactions.destroy(), await this.networks.destroy(), await this.accounts.destroy(), this.removeAllListeners(), this.initialized = !1;
  }
  ensureInitialized() {
    if (!this.initialized)
      throw new Error("Wallet engine not initialized. Call initialize() first.");
  }
}
class N {
  constructor(t) {
    this.engine = t;
  }
  /**
   * Get wallet information
   */
  async getWalletInfo() {
    return {
      version: "0.1.0",
      accounts: this.engine.accounts.getAll().length,
      currentNetwork: this.engine.networks.getCurrent()?.name,
      isLocked: !1
      // Would check actual lock state
    };
  }
  /**
   * Get current account
   */
  async getCurrentAccount() {
    return this.engine.getCurrentAccount();
  }
  /**
   * Get all accounts
   */
  async getAccounts() {
    return this.engine.accounts.getAll();
  }
  /**
   * Get current network
   */
  async getCurrentNetwork() {
    return this.engine.networks.getCurrent();
  }
  /**
   * Get supported networks
   */
  async getSupportedNetworks() {
    return this.engine.networks.getSupported();
  }
  /**
   * Request account connection
   */
  async connect() {
    return this.engine.accounts.getAll();
  }
  /**
   * Sign a transaction
   */
  async signTransaction(t) {
    return (await this.engine.transactions.sign(t)).serialized;
  }
  /**
   * Send a transaction
   */
  async sendTransaction(t) {
    return this.engine.transactions.send(t);
  }
  /**
   * Sign a message
   */
  async signMessage(t) {
    const e = this.engine.getCurrentAccount();
    if (!e)
      throw new Error("No account selected");
    return this.engine.accounts.signMessage(e.id, t);
  }
}
class P extends l {
  constructor() {
    super(...arguments), this.connected = !1, this.accounts = [], this.chainId = null;
  }
  /**
   * Connect to remote wallet
   */
  async connect() {
    return this.connected = !0, this.accounts = [], this.emit("connected"), this.accounts;
  }
  /**
   * Disconnect from remote wallet
   */
  async disconnect() {
    this.connected = !1, this.accounts = [], this.chainId = null, this.emit("disconnected");
  }
  /**
   * Check if connected
   */
  isConnected() {
    return this.connected;
  }
  /**
   * Get connected accounts
   */
  getAccounts() {
    return this.accounts;
  }
  /**
   * Get current chain ID
   */
  getChainId() {
    return this.chainId;
  }
  /**
   * Request account access
   */
  async requestAccounts() {
    if (!this.connected)
      throw new Error("Not connected to remote wallet");
    return this.accounts;
  }
  /**
   * Switch network
   */
  async switchNetwork(t) {
    if (!this.connected)
      throw new Error("Not connected to remote wallet");
    this.chainId = t, this.emit("chainChanged", t);
  }
}
class z {
  constructor(t) {
    this.engine = null, this.config = t;
  }
  /**
   * Initialize the integration
   */
  async initialize(t) {
    const e = {
      name: "YAKKL Integration",
      version: "1.0.0",
      embedded: !0,
      restrictions: [],
      modDiscovery: !1,
      enableMods: !0,
      enableDiscovery: !1,
      // Disable discovery for integrations
      storagePrefix: `integration:${this.config.appName}`,
      logLevel: "warn",
      ...t
    };
    this.engine = new k(e), await this.engine.initialize();
  }
  /**
   * Get the wallet engine
   */
  getEngine() {
    if (!this.engine)
      throw new Error("Integration not initialized");
    return this.engine;
  }
  /**
   * Check if a permission is granted
   */
  hasPermission(t) {
    return this.config.permissions.includes(t);
  }
  /**
   * Request additional permissions
   */
  async requestPermissions(t) {
    for (const e of t)
      this.config.permissions.includes(e) || this.config.permissions.push(e);
    return !0;
  }
  /**
   * Get integration info
   */
  getInfo() {
    return {
      appName: this.config.appName,
      appVersion: this.config.appVersion,
      permissions: this.config.permissions,
      isInitialized: this.engine !== null
    };
  }
  /**
   * Destroy the integration
   */
  async destroy() {
    this.engine && (await this.engine.destroy(), this.engine = null);
  }
}
export {
  m as A,
  N as E,
  z as I,
  f as N,
  P as R,
  p as T,
  k as W
};
//# sourceMappingURL=IntegrationAPI-BrnntV9A.mjs.map
