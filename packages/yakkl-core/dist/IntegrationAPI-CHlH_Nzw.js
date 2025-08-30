"use strict";
const eventemitter3 = require("eventemitter3");
const DiscoveryProtocol = require("./DiscoveryProtocol-D-qfIqfp.js");
const ethers = require("ethers");
const { Wallet: Wallet$1 } = ethers.ethers;
const { isAddress, getAddress } = ethers.ethers.utils;
class AccountManager extends eventemitter3.EventEmitter {
  constructor(engine) {
    super();
    this.accounts = /* @__PURE__ */ new Map();
    this.currentAccountId = null;
    this.initialized = false;
    this.engine = engine;
  }
  /**
   * Initialize the account manager
   */
  async initialize() {
    if (this.initialized) return;
    try {
      await this.loadAccounts();
      await this.loadCurrentAccount();
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize AccountManager: ${error}`);
    }
  }
  /**
   * Create a new account
   */
  async create(name) {
    this.ensureInitialized();
    try {
      const wallet = ethers.ethers.Wallet.createRandom();
      const account = {
        id: this.generateId(),
        address: wallet.address,
        name: name || `Account ${this.accounts.size + 1}`,
        type: "eoa",
        publicKey: wallet.publicKey,
        derivationPath: void 0,
        // For random wallets
        ens: void 0,
        username: void 0,
        avatar: void 0,
        createdAt: /* @__PURE__ */ new Date(),
        lastUsed: /* @__PURE__ */ new Date(),
        metadata: {
          isHardware: false,
          isImported: false,
          isWatchOnly: false
        }
      };
      this.accounts.set(account.id, account);
      await this.storePrivateKey(account.id, wallet.privateKey);
      await this.saveAccounts();
      this.emit("account:created", account);
      if (this.accounts.size === 1) {
        await this.select(account.id);
      }
      return account;
    } catch (error) {
      throw new Error(`Failed to create account: ${error}`);
    }
  }
  /**
   * Import account from private key
   */
  async importFromPrivateKey(privateKey, name) {
    this.ensureInitialized();
    try {
      const wallet = new ethers.ethers.Wallet(privateKey);
      const existing = Array.from(this.accounts.values()).find((acc) => acc.address.toLowerCase() === wallet.address.toLowerCase());
      if (existing) {
        throw new Error("Account already exists");
      }
      const account = {
        id: this.generateId(),
        address: wallet.address,
        name: name || `Imported Account`,
        type: "eoa",
        publicKey: wallet.publicKey,
        derivationPath: void 0,
        ens: void 0,
        username: void 0,
        avatar: void 0,
        createdAt: /* @__PURE__ */ new Date(),
        lastUsed: /* @__PURE__ */ new Date(),
        metadata: {
          isHardware: false,
          isImported: true,
          isWatchOnly: false
        }
      };
      this.accounts.set(account.id, account);
      await this.storePrivateKey(account.id, privateKey);
      await this.saveAccounts();
      this.emit("account:created", account);
      return account;
    } catch (error) {
      throw new Error(`Failed to import account: ${error}`);
    }
  }
  /**
   * Add watch-only account
   */
  async addWatchOnly(address, name) {
    this.ensureInitialized();
    try {
      if (!isAddress(address)) {
        throw new Error("Invalid address");
      }
      const existing = Array.from(this.accounts.values()).find((acc) => acc.address.toLowerCase() === address.toLowerCase());
      if (existing) {
        throw new Error("Account already exists");
      }
      const account = {
        id: this.generateId(),
        address: getAddress(address),
        // Checksum address
        name: name || `Watch-Only Account`,
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
          isHardware: false,
          isImported: false,
          isWatchOnly: true
        }
      };
      this.accounts.set(account.id, account);
      await this.saveAccounts();
      this.emit("account:created", account);
      return account;
    } catch (error) {
      throw new Error(`Failed to add watch-only account: ${error}`);
    }
  }
  /**
   * Update account information
   */
  async update(accountId, updates) {
    this.ensureInitialized();
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error("Account not found");
    }
    const updatedAccount = {
      ...account,
      ...updates,
      id: account.id,
      // Prevent ID changes
      address: account.address,
      // Prevent address changes
      lastUsed: /* @__PURE__ */ new Date()
    };
    this.accounts.set(accountId, updatedAccount);
    await this.saveAccounts();
    this.emit("account:updated", updatedAccount);
    return updatedAccount;
  }
  /**
   * Remove an account
   */
  async remove(accountId) {
    this.ensureInitialized();
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error("Account not found");
    }
    if (this.accounts.size === 1) {
      throw new Error("Cannot remove the last account");
    }
    this.accounts.delete(accountId);
    await this.removePrivateKey(accountId);
    await this.saveAccounts();
    if (this.currentAccountId === accountId) {
      const firstAccount = Array.from(this.accounts.values())[0];
      await this.select(firstAccount.id);
    }
    this.emit("account:removed", accountId);
  }
  /**
   * Select an account as current
   */
  async select(accountId) {
    this.ensureInitialized();
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error("Account not found");
    }
    const updatedAccount = {
      ...account,
      lastUsed: /* @__PURE__ */ new Date()
    };
    this.accounts.set(accountId, updatedAccount);
    this.currentAccountId = accountId;
    await this.saveCurrentAccount();
    await this.saveAccounts();
    this.emit("account:selected", updatedAccount);
    return updatedAccount;
  }
  /**
   * Get all accounts
   */
  getAll() {
    return Array.from(this.accounts.values()).sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
  }
  /**
   * Get account by ID
   */
  get(accountId) {
    return this.accounts.get(accountId) || null;
  }
  /**
   * Get account by address
   */
  async getByAddress(address) {
    const normalizedAddress = address.toLowerCase();
    return Array.from(this.accounts.values()).find((acc) => acc.address.toLowerCase() === normalizedAddress) || null;
  }
  /**
   * Get current account
   */
  getCurrent() {
    if (!this.currentAccountId) return null;
    return this.accounts.get(this.currentAccountId) || null;
  }
  /**
   * Get private key for account (if available)
   */
  async getPrivateKey(accountId) {
    this.ensureInitialized();
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error("Account not found");
    }
    if (account.type === "watched") {
      throw new Error("Watch-only accounts have no private key");
    }
    return this.loadPrivateKey(accountId);
  }
  /**
   * Sign a message with account
   */
  async signMessage(accountId, message) {
    const privateKey = await this.getPrivateKey(accountId);
    const wallet = new Wallet$1(privateKey);
    return wallet.signMessage(message);
  }
  /**
   * Destroy the account manager
   */
  async destroy() {
    this.accounts.clear();
    this.currentAccountId = null;
    this.initialized = false;
    this.removeAllListeners();
  }
  /**
   * Private methods
   */
  generateId() {
    return `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  async loadAccounts() {
    try {
      const stored = localStorage.getItem("yakkl:accounts");
      if (stored) {
        const accountsData = JSON.parse(stored);
        for (const acc of accountsData) {
          acc.createdAt = new Date(acc.createdAt);
          acc.lastUsed = new Date(acc.lastUsed);
          this.accounts.set(acc.id, acc);
        }
      }
    } catch (error) {
      console.warn("Failed to load accounts:", error);
    }
  }
  async saveAccounts() {
    try {
      const accountsData = Array.from(this.accounts.values());
      localStorage.setItem("yakkl:accounts", JSON.stringify(accountsData));
    } catch (error) {
      console.error("Failed to save accounts:", error);
      throw error;
    }
  }
  async loadCurrentAccount() {
    try {
      const stored = localStorage.getItem("yakkl:currentAccount");
      if (stored && this.accounts.has(stored)) {
        this.currentAccountId = stored;
      } else if (this.accounts.size > 0) {
        this.currentAccountId = Array.from(this.accounts.keys())[0];
      }
    } catch (error) {
      console.warn("Failed to load current account:", error);
    }
  }
  async saveCurrentAccount() {
    try {
      if (this.currentAccountId) {
        localStorage.setItem("yakkl:currentAccount", this.currentAccountId);
      }
    } catch (error) {
      console.error("Failed to save current account:", error);
    }
  }
  async storePrivateKey(accountId, privateKey) {
    try {
      localStorage.setItem(`yakkl:pk:${accountId}`, privateKey);
    } catch (error) {
      console.error("Failed to store private key:", error);
      throw error;
    }
  }
  async loadPrivateKey(accountId) {
    try {
      const privateKey = localStorage.getItem(`yakkl:pk:${accountId}`);
      if (!privateKey) {
        throw new Error("Private key not found");
      }
      return privateKey;
    } catch (error) {
      console.error("Failed to load private key:", error);
      throw error;
    }
  }
  async removePrivateKey(accountId) {
    try {
      localStorage.removeItem(`yakkl:pk:${accountId}`);
    } catch (error) {
      console.error("Failed to remove private key:", error);
    }
  }
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error("AccountManager not initialized");
    }
  }
}
const { providers } = ethers.ethers;
const { JsonRpcProvider } = providers;
class NetworkManager extends eventemitter3.EventEmitter {
  constructor(engine) {
    super();
    this.networks = /* @__PURE__ */ new Map();
    this.providers = /* @__PURE__ */ new Map();
    this.currentNetworkId = null;
    this.initialized = false;
    this.engine = engine;
  }
  /**
   * Initialize the network manager
   */
  async initialize() {
    if (this.initialized) return;
    try {
      await this.loadDefaultNetworks();
      await this.loadCustomNetworks();
      await this.loadCurrentNetwork();
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize NetworkManager: ${error}`);
    }
  }
  /**
   * Get all supported networks
   */
  getSupported() {
    return Array.from(this.networks.values()).sort((a, b) => {
      if (a.isMainnet && !b.isMainnet) return -1;
      if (!a.isMainnet && b.isMainnet) return 1;
      if (!a.isTestnet && b.isTestnet) return -1;
      if (a.isTestnet && !b.isTestnet) return 1;
      return a.name.localeCompare(b.name);
    });
  }
  /**
   * Get network by ID
   */
  get(networkId) {
    return this.networks.get(networkId) || null;
  }
  /**
   * Get current network
   */
  getCurrent() {
    if (!this.currentNetworkId) return null;
    return this.networks.get(this.currentNetworkId) || null;
  }
  /**
   * Switch to a different network
   */
  async switch(networkId) {
    this.ensureInitialized();
    const network = this.networks.get(networkId);
    if (!network) {
      throw new Error("Network not found");
    }
    await this.testConnection(network);
    this.currentNetworkId = networkId;
    await this.saveCurrentNetwork();
    this.emit("network:switched", network);
    return network;
  }
  /**
   * Add a custom network
   */
  async add(networkConfig) {
    this.ensureInitialized();
    await this.validateNetworkConfig(networkConfig);
    const existing = Array.from(this.networks.values()).find((n) => n.chainId === networkConfig.chainId);
    if (existing) {
      throw new Error("Network with this chain ID already exists");
    }
    const network = {
      id: this.generateNetworkId(),
      ...networkConfig,
      isCustom: true
    };
    this.networks.set(network.id, network);
    await this.saveCustomNetworks();
    this.emit("network:added", network);
    return network;
  }
  /**
   * Update a custom network
   */
  async update(networkId, updates) {
    this.ensureInitialized();
    const network = this.networks.get(networkId);
    if (!network) {
      throw new Error("Network not found");
    }
    if (!network.isCustom) {
      throw new Error("Cannot update built-in networks");
    }
    const updatedNetwork = {
      ...network,
      ...updates,
      id: network.id,
      // Prevent ID changes
      isCustom: true
      // Ensure it stays custom
    };
    await this.validateNetworkConfig(updatedNetwork);
    this.networks.set(networkId, updatedNetwork);
    await this.saveCustomNetworks();
    this.emit("network:updated", updatedNetwork);
    return updatedNetwork;
  }
  /**
   * Remove a custom network
   */
  async remove(networkId) {
    this.ensureInitialized();
    const network = this.networks.get(networkId);
    if (!network) {
      throw new Error("Network not found");
    }
    if (!network.isCustom) {
      throw new Error("Cannot remove built-in networks");
    }
    const provider = this.providers.get(networkId);
    if (provider) {
      provider.destroy();
      this.providers.delete(networkId);
    }
    this.networks.delete(networkId);
    await this.saveCustomNetworks();
    if (this.currentNetworkId === networkId) {
      const defaultNetwork = Array.from(this.networks.values()).find((n) => n.isMainnet && !n.isCustom);
      if (defaultNetwork) {
        await this.switch(defaultNetwork.id);
      }
    }
    this.emit("network:removed", networkId);
  }
  /**
   * Get provider for network
   */
  getProvider(networkId) {
    const id = networkId || this.currentNetworkId;
    if (!id) return null;
    if (this.providers.has(id)) {
      return this.providers.get(id);
    }
    const network = this.networks.get(id);
    if (!network) return null;
    try {
      const provider = new JsonRpcProvider(network.rpcUrl);
      this.providers.set(id, provider);
      return provider;
    } catch (error) {
      console.error(`Failed to create provider for network ${id}:`, error);
      return null;
    }
  }
  /**
   * Test connection to a network
   */
  async testConnection(network) {
    try {
      const provider = new JsonRpcProvider(network.rpcUrl);
      const chainId = await provider.getNetwork();
      if (Number(chainId.chainId) !== network.chainId) {
        throw new Error("Chain ID mismatch");
      }
      return true;
    } catch (error) {
      throw new Error(`Network connection failed: ${error}`);
    }
  }
  /**
   * Get network statistics
   */
  async getNetworkStats(networkId) {
    const provider = this.getProvider(networkId);
    if (!provider) {
      throw new Error("No provider available");
    }
    try {
      const [blockNumber, feeData, network] = await Promise.all([
        provider.getBlockNumber(),
        provider.getFeeData(),
        provider.getNetwork()
      ]);
      return {
        blockNumber,
        gasPrice: feeData.gasPrice || 0n,
        chainId: Number(network.chainId)
      };
    } catch (error) {
      throw new Error(`Failed to get network stats: ${error}`);
    }
  }
  /**
   * Destroy the network manager
   */
  async destroy() {
    for (const provider of this.providers.values()) {
      provider.destroy();
    }
    this.networks.clear();
    this.providers.clear();
    this.currentNetworkId = null;
    this.initialized = false;
    this.removeAllListeners();
  }
  /**
   * Private methods
   */
  async loadDefaultNetworks() {
    const defaultNetworks = [
      // Ethereum Mainnet
      {
        id: "ethereum",
        name: "Ethereum",
        chainId: 1,
        symbol: "ETH",
        rpcUrl: "https://eth.llamarpc.com",
        blockExplorerUrl: "https://etherscan.io",
        isTestnet: false,
        isMainnet: true,
        isCustom: false,
        iconUrl: "/networks/ethereum.png",
        gasToken: {
          address: "0x0000000000000000000000000000000000000000",
          symbol: "ETH",
          name: "Ethereum",
          decimals: 18,
          chainId: 1,
          isNative: true,
          isStable: false
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
        isTestnet: false,
        isMainnet: true,
        isCustom: false,
        iconUrl: "/networks/polygon.png",
        gasToken: {
          address: "0x0000000000000000000000000000000000000000",
          symbol: "MATIC",
          name: "Polygon",
          decimals: 18,
          chainId: 137,
          isNative: true,
          isStable: false
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
        isTestnet: false,
        isMainnet: true,
        isCustom: false,
        iconUrl: "/networks/arbitrum.png",
        gasToken: {
          address: "0x0000000000000000000000000000000000000000",
          symbol: "ETH",
          name: "Ethereum",
          decimals: 18,
          chainId: 42161,
          isNative: true,
          isStable: false
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
        isTestnet: true,
        isMainnet: false,
        isCustom: false,
        iconUrl: "/networks/ethereum.png",
        gasToken: {
          address: "0x0000000000000000000000000000000000000000",
          symbol: "ETH",
          name: "Ethereum",
          decimals: 18,
          chainId: 11155111,
          isNative: true,
          isStable: false
        },
        supportedFeatures: ["eip1559", "eip2930", "contracts", "tokens", "nft"]
      }
    ];
    for (const network of defaultNetworks) {
      this.networks.set(network.id, network);
    }
  }
  async loadCustomNetworks() {
    try {
      const stored = localStorage.getItem("yakkl:customNetworks");
      if (stored) {
        const customNetworks = JSON.parse(stored);
        for (const network of customNetworks) {
          this.networks.set(network.id, network);
        }
      }
    } catch (error) {
      console.warn("Failed to load custom networks:", error);
    }
  }
  async saveCustomNetworks() {
    try {
      const customNetworks = Array.from(this.networks.values()).filter((n) => n.isCustom);
      localStorage.setItem("yakkl:customNetworks", JSON.stringify(customNetworks));
    } catch (error) {
      console.error("Failed to save custom networks:", error);
      throw error;
    }
  }
  async loadCurrentNetwork() {
    try {
      const stored = localStorage.getItem("yakkl:currentNetwork");
      if (stored && this.networks.has(stored)) {
        this.currentNetworkId = stored;
      } else {
        const ethereum = Array.from(this.networks.values()).find((n) => n.chainId === 1);
        if (ethereum) {
          this.currentNetworkId = ethereum.id;
        }
      }
    } catch (error) {
      console.warn("Failed to load current network:", error);
    }
  }
  async saveCurrentNetwork() {
    try {
      if (this.currentNetworkId) {
        localStorage.setItem("yakkl:currentNetwork", this.currentNetworkId);
      }
    } catch (error) {
      console.error("Failed to save current network:", error);
    }
  }
  async validateNetworkConfig(config) {
    if (!config.name || !config.chainId || !config.rpcUrl) {
      throw new Error("Network name, chainId, and rpcUrl are required");
    }
    if (config.chainId <= 0) {
      throw new Error("Chain ID must be positive");
    }
    try {
      new URL(config.rpcUrl);
    } catch {
      throw new Error("Invalid RPC URL");
    }
    if (config.blockExplorerUrl) {
      try {
        new URL(config.blockExplorerUrl);
      } catch {
        throw new Error("Invalid block explorer URL");
      }
    }
  }
  generateNetworkId() {
    return `net_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error("NetworkManager not initialized");
    }
  }
}
const { Wallet } = ethers.ethers;
class TransactionManager extends eventemitter3.EventEmitter {
  constructor(engine) {
    super();
    this.pendingTransactions = /* @__PURE__ */ new Map();
    this.transactionHistory = /* @__PURE__ */ new Map();
    this.balanceCache = /* @__PURE__ */ new Map();
    this.initialized = false;
    this.engine = engine;
  }
  /**
   * Initialize the transaction manager
   */
  async initialize() {
    if (this.initialized) return;
    try {
      await this.loadTransactionHistory();
      await this.loadPendingTransactions();
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize TransactionManager: ${error}`);
    }
  }
  /**
   * Sign a transaction
   */
  async sign(transaction) {
    this.ensureInitialized();
    try {
      const currentAccount = this.engine.getCurrentAccount();
      if (!currentAccount) {
        throw new Error("No account selected");
      }
      const privateKey = await this.engine.accounts.getPrivateKey(currentAccount.id);
      const wallet = new ethers.ethers.Wallet(privateKey);
      const provider = this.engine.networks.getProvider();
      if (!provider) {
        throw new Error("No network provider available");
      }
      const connectedWallet = wallet.connect(provider);
      const txRequest = {
        to: transaction.to,
        value: transaction.value,
        data: transaction.data,
        gasLimit: transaction.gasLimit,
        gasPrice: transaction.gasPrice,
        maxFeePerGas: transaction.maxFeePerGas,
        maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
        nonce: transaction.nonce,
        type: transaction.type
      };
      const populatedTx = await connectedWallet.populateTransaction(txRequest);
      const signedTxResponse = await connectedWallet.signTransaction(populatedTx);
      const parsedTx = ethers.ethers.utils.parseTransaction(signedTxResponse);
      const signedTransaction = {
        transaction: {
          ...transaction,
          gasLimit: populatedTx.gasLimit?.toString(),
          gasPrice: populatedTx.gasPrice?.toString(),
          maxFeePerGas: populatedTx.maxFeePerGas?.toString(),
          maxPriorityFeePerGas: populatedTx.maxPriorityFeePerGas?.toString(),
          nonce: populatedTx.nonce ? Number(populatedTx.nonce) : 0
        },
        signature: {
          r: parsedTx.r,
          s: parsedTx.s,
          v: parsedTx.v || 0
        },
        hash: parsedTx.hash,
        serialized: signedTxResponse
      };
      this.emit("transaction:signed", signedTransaction);
      return signedTransaction;
    } catch (error) {
      throw new Error(`Failed to sign transaction: ${error}`);
    }
  }
  /**
   * Send a transaction
   */
  async send(transaction) {
    this.ensureInitialized();
    try {
      const signedTx = await this.sign(transaction);
      const provider = this.engine.networks.getProvider();
      if (!provider) {
        throw new Error("No network provider available");
      }
      const txResponse = await provider.broadcastTransaction(signedTx.serialized);
      const hash = txResponse.hash;
      this.pendingTransactions.set(hash, transaction);
      await this.savePendingTransactions();
      this.monitorTransaction(hash, txResponse);
      this.emit("transaction:sent", hash, transaction);
      return hash;
    } catch (error) {
      throw new Error(`Failed to send transaction: ${error}`);
    }
  }
  /**
   * Get balance for an address
   */
  async getBalance(address) {
    this.ensureInitialized();
    try {
      const cached = this.balanceCache.get(address);
      if (cached && this.isBalanceCacheValid(cached)) {
        return cached;
      }
      const network = this.engine.networks.getCurrent();
      if (!network) {
        throw new Error("No network selected");
      }
      const provider = this.engine.networks.getProvider();
      if (!provider) {
        throw new Error("No network provider available");
      }
      const nativeBalance = await provider.getBalance(address);
      const balance = {
        address,
        chainId: network.chainId,
        native: {
          token: network.gasToken,
          balance: nativeBalance.toString(),
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
      this.balanceCache.set(address, balance);
      this.emit("balance:updated", address, balance);
      return balance;
    } catch (error) {
      throw new Error(`Failed to get balance: ${error}`);
    }
  }
  /**
   * Get transaction history for an address
   */
  async getHistory(address, limit = 50) {
    this.ensureInitialized();
    const history = this.transactionHistory.get(address) || [];
    return history.slice(0, limit);
  }
  /**
   * Estimate gas for a transaction
   */
  async estimateGas(transaction) {
    this.ensureInitialized();
    try {
      const provider = this.engine.networks.getProvider();
      if (!provider) {
        throw new Error("No network provider available");
      }
      const gasEstimate = await provider.estimateGas({
        to: transaction.to,
        value: transaction.value,
        data: transaction.data
      });
      return gasEstimate.toString();
    } catch (error) {
      throw new Error(`Failed to estimate gas: ${error}`);
    }
  }
  /**
   * Get current gas prices
   */
  async getGasPrices() {
    this.ensureInitialized();
    try {
      const provider = this.engine.networks.getProvider();
      if (!provider) {
        throw new Error("No network provider available");
      }
      const feeData = await provider.getFeeData();
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        const baseFee = feeData.maxFeePerGas.sub(feeData.maxPriorityFeePerGas);
        const slowPriority = feeData.maxPriorityFeePerGas.div(2);
        const fastPriority = feeData.maxPriorityFeePerGas.mul(2);
        return {
          slow: baseFee.add(slowPriority).toString(),
          standard: feeData.maxFeePerGas.toString(),
          fast: baseFee.add(fastPriority).toString(),
          maxFeePerGas: feeData.maxFeePerGas.toString(),
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas.toString()
        };
      }
      const gasPrice = feeData.gasPrice || 0n;
      return {
        slow: (gasPrice * 8n / 10n).toString(),
        // 80% of current
        standard: gasPrice.toString(),
        fast: (gasPrice * 12n / 10n).toString()
        // 120% of current
      };
    } catch (error) {
      throw new Error(`Failed to get gas prices: ${error}`);
    }
  }
  /**
   * Refresh balance for an address
   */
  async refreshBalance(address) {
    this.balanceCache.delete(address);
    return this.getBalance(address);
  }
  /**
   * Cancel a pending transaction (if possible)
   */
  async cancelTransaction(hash) {
    this.ensureInitialized();
    const pendingTx = this.pendingTransactions.get(hash);
    if (!pendingTx) {
      throw new Error("Transaction not found or already confirmed");
    }
    try {
      const currentAccount = this.engine.getCurrentAccount();
      if (!currentAccount) {
        throw new Error("No account selected");
      }
      const gasPrices = await this.getGasPrices();
      const cancelTx = {
        to: currentAccount.address,
        value: "0",
        chainId: pendingTx.chainId,
        nonce: pendingTx.nonce,
        gasLimit: "21000",
        // Use higher gas price to prioritize cancellation
        gasPrice: (BigInt(gasPrices.fast) * 11n / 10n).toString()
        // 110% of fast
      };
      return this.send(cancelTx);
    } catch (error) {
      throw new Error(`Failed to cancel transaction: ${error}`);
    }
  }
  /**
   * Destroy the transaction manager
   */
  async destroy() {
    this.pendingTransactions.clear();
    this.transactionHistory.clear();
    this.balanceCache.clear();
    this.initialized = false;
    this.removeAllListeners();
  }
  /**
   * Private methods
   */
  async monitorTransaction(hash, txResponse) {
    try {
      const receipt = await txResponse.wait();
      this.pendingTransactions.delete(hash);
      await this.savePendingTransactions();
      await this.addToHistory(hash, receipt);
      if (receipt.status === 1) {
        this.emit("transaction:confirmed", hash, receipt);
      } else {
        this.emit("transaction:failed", hash, new Error("Transaction reverted"));
      }
    } catch (error) {
      this.emit("transaction:failed", hash, error);
    }
  }
  async addToHistory(hash, receipt) {
    try {
      const currentAccount = this.engine.getCurrentAccount();
      if (!currentAccount) return;
      const provider = this.engine.networks.getProvider();
      if (!provider) return;
      const tx = await provider.getTransaction(hash);
      if (!tx) return;
      const block = await provider.getBlock(receipt.blockNumber);
      const historyItem = {
        hash,
        blockNumber: receipt.blockNumber,
        timestamp: new Date(block.timestamp * 1e3),
        from: tx.from || "",
        to: tx.to || "",
        value: tx.value.toString(),
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: tx.gasPrice?.toString() || "0",
        status: receipt.status === 1 ? "confirmed" : "failed",
        type: this.determineTransactionType(tx),
        metadata: {
          blockHash: receipt.blockHash,
          transactionIndex: receipt.transactionIndex,
          logs: receipt.logs
        }
      };
      const address = currentAccount.address;
      const existing = this.transactionHistory.get(address) || [];
      existing.unshift(historyItem);
      if (existing.length > 1e3) {
        existing.splice(1e3);
      }
      this.transactionHistory.set(address, existing);
      await this.saveTransactionHistory();
    } catch (error) {
      console.error("Failed to add transaction to history:", error);
    }
  }
  determineTransactionType(tx) {
    if (tx.data && tx.data !== "0x") {
      return "contract";
    }
    if (tx.value && BigInt(tx.value) > 0) {
      return "send";
    }
    return "send";
  }
  isBalanceCacheValid(balance) {
    const now = /* @__PURE__ */ new Date();
    const age = now.getTime() - balance.lastUpdated.getTime();
    return age < 3e4;
  }
  async loadTransactionHistory() {
    try {
      const stored = localStorage.getItem("yakkl:transactionHistory");
      if (stored) {
        const data = JSON.parse(stored);
        for (const [address, history] of Object.entries(data)) {
          const typedHistory = history.map((item) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          }));
          this.transactionHistory.set(address, typedHistory);
        }
      }
    } catch (error) {
      console.warn("Failed to load transaction history:", error);
    }
  }
  async saveTransactionHistory() {
    try {
      const data = Object.fromEntries(this.transactionHistory);
      localStorage.setItem("yakkl:transactionHistory", JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save transaction history:", error);
    }
  }
  async loadPendingTransactions() {
    try {
      const stored = localStorage.getItem("yakkl:pendingTransactions");
      if (stored) {
        const data = JSON.parse(stored);
        this.pendingTransactions = new Map(Object.entries(data));
      }
    } catch (error) {
      console.warn("Failed to load pending transactions:", error);
    }
  }
  async savePendingTransactions() {
    try {
      const data = Object.fromEntries(this.pendingTransactions);
      localStorage.setItem("yakkl:pendingTransactions", JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save pending transactions:", error);
    }
  }
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error("TransactionManager not initialized");
    }
  }
}
class WalletEngine extends eventemitter3.EventEmitter {
  constructor(config = {}) {
    super();
    this.initialized = false;
    this.config = {
      name: "YAKKL Wallet",
      version: "1.0.0",
      embedded: false,
      restrictions: [],
      modDiscovery: true,
      ...config
    };
    this.accounts = new AccountManager(this);
    this.networks = new NetworkManager(this);
    this.transactions = new TransactionManager(this);
    this.mods = new DiscoveryProtocol.ModRegistry(this);
    this.discovery = new DiscoveryProtocol.DiscoveryProtocol(this);
  }
  /**
   * Initialize the wallet engine
   */
  async initialize() {
    if (this.initialized) return;
    try {
      await this.accounts.initialize();
      await this.networks.initialize();
      await this.transactions.initialize();
      await this.mods.initialize();
      if (this.config.modDiscovery) {
        await this.discovery.start();
      }
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize wallet engine: ${error}`);
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
  async createAccount(name) {
    this.ensureInitialized();
    const account = await this.accounts.create(name);
    this.emit("account:created", account);
    return account;
  }
  async getAccounts() {
    this.ensureInitialized();
    return this.accounts.getAll();
  }
  async selectAccount(accountId) {
    this.ensureInitialized();
    const account = await this.accounts.select(accountId);
    this.emit("account:selected", account);
  }
  getCurrentAccount() {
    return this.accounts.getCurrent();
  }
  /**
   * Core Network Management
   */
  async getSupportedNetworks() {
    this.ensureInitialized();
    return this.networks.getSupported();
  }
  async switchNetwork(networkId) {
    this.ensureInitialized();
    const network = await this.networks.switch(networkId);
    this.emit("network:changed", network);
  }
  getCurrentNetwork() {
    return this.networks.getCurrent();
  }
  /**
   * Core Transaction Management
   */
  async signTransaction(transaction) {
    this.ensureInitialized();
    const signedTx = await this.transactions.sign(transaction);
    this.emit("transaction:signed", signedTx);
    return signedTx;
  }
  async sendTransaction(transaction) {
    this.ensureInitialized();
    return this.transactions.send(transaction);
  }
  async getBalance(address) {
    this.ensureInitialized();
    const account = address ? await this.accounts.getByAddress(address) : this.getCurrentAccount();
    if (!account) {
      throw new Error("No account specified or selected");
    }
    return this.transactions.getBalance(account.address);
  }
  /**
   * Mod Management
   */
  async loadMod(id) {
    this.ensureInitialized();
    const mod = await this.mods.load(id);
    this.emit("mod:loaded", mod);
    return mod;
  }
  async getLoadedMods() {
    return this.mods.getLoaded();
  }
  async discoverMods() {
    this.ensureInitialized();
    const discovered = await this.discovery.scan();
    this.emit("mod:discovered", discovered);
    return discovered;
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
    await this.discovery.stop();
    await this.mods.destroy();
    await this.transactions.destroy();
    await this.networks.destroy();
    await this.accounts.destroy();
    this.removeAllListeners();
    this.initialized = false;
  }
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error("Wallet engine not initialized. Call initialize() first.");
    }
  }
}
class EmbeddedAPI {
  constructor(engine) {
    this.engine = engine;
  }
  /**
   * Get wallet information
   */
  async getWalletInfo() {
    return {
      version: "0.1.0",
      accounts: this.engine.accounts.getAll().length,
      currentNetwork: this.engine.networks.getCurrent()?.name,
      isLocked: false
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
  async signTransaction(transaction) {
    const signed = await this.engine.transactions.sign(transaction);
    return signed.serialized;
  }
  /**
   * Send a transaction
   */
  async sendTransaction(transaction) {
    return this.engine.transactions.send(transaction);
  }
  /**
   * Sign a message
   */
  async signMessage(message) {
    const currentAccount = this.engine.getCurrentAccount();
    if (!currentAccount) {
      throw new Error("No account selected");
    }
    return this.engine.accounts.signMessage(currentAccount.id, message);
  }
}
class RemoteAPI extends eventemitter3.EventEmitter {
  constructor() {
    super(...arguments);
    this.connected = false;
    this.accounts = [];
    this.chainId = null;
  }
  /**
   * Connect to remote wallet
   */
  async connect() {
    this.connected = true;
    this.accounts = [];
    this.emit("connected");
    return this.accounts;
  }
  /**
   * Disconnect from remote wallet
   */
  async disconnect() {
    this.connected = false;
    this.accounts = [];
    this.chainId = null;
    this.emit("disconnected");
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
    if (!this.connected) {
      throw new Error("Not connected to remote wallet");
    }
    return this.accounts;
  }
  /**
   * Switch network
   */
  async switchNetwork(chainId) {
    if (!this.connected) {
      throw new Error("Not connected to remote wallet");
    }
    this.chainId = chainId;
    this.emit("chainChanged", chainId);
  }
}
class IntegrationAPI {
  constructor(config) {
    this.engine = null;
    this.config = config;
  }
  /**
   * Initialize the integration
   */
  async initialize(walletConfig) {
    const config = {
      name: "YAKKL Integration",
      version: "1.0.0",
      embedded: true,
      restrictions: [],
      modDiscovery: false,
      enableMods: true,
      enableDiscovery: false,
      // Disable discovery for integrations
      storagePrefix: `integration:${this.config.appName}`,
      logLevel: "warn",
      ...walletConfig
    };
    this.engine = new WalletEngine(config);
    await this.engine.initialize();
  }
  /**
   * Get the wallet engine
   */
  getEngine() {
    if (!this.engine) {
      throw new Error("Integration not initialized");
    }
    return this.engine;
  }
  /**
   * Check if a permission is granted
   */
  hasPermission(permission) {
    return this.config.permissions.includes(permission);
  }
  /**
   * Request additional permissions
   */
  async requestPermissions(permissions) {
    for (const permission of permissions) {
      if (!this.config.permissions.includes(permission)) {
        this.config.permissions.push(permission);
      }
    }
    return true;
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
    if (this.engine) {
      await this.engine.destroy();
      this.engine = null;
    }
  }
}
exports.AccountManager = AccountManager;
exports.EmbeddedAPI = EmbeddedAPI;
exports.IntegrationAPI = IntegrationAPI;
exports.NetworkManager = NetworkManager;
exports.RemoteAPI = RemoteAPI;
exports.TransactionManager = TransactionManager;
exports.WalletEngine = WalletEngine;
//# sourceMappingURL=IntegrationAPI-CHlH_Nzw.js.map
