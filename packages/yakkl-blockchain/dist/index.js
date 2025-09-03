import { arbitrum, avalanche, base, bsc, chainById, chains, ethereum, getChainById, getChainByNetwork, getMainnetChains, getTestnetChains, isTestnet, optimism, polygon, sepolia } from "./chains.js";
import { BaseToken, ERC20Token, TokenService, commonTokens, formatTokenAmount, getToken, getTokensByChain, getTokensBySymbol, isStablecoin, isWrappedNative, mergeTokenLists, parseTokenAmount, validateTokenList } from "./tokens.js";
import { AAVE_ATOKENS, AAVE_INFO, AAVE_ORACLE, AAVE_V3_DATA_PROVIDER, AAVE_V3_POOL, HEALTH_FACTOR_LIQUIDATION_THRESHOLD, HEALTH_FACTOR_SAFE_THRESHOLD, HEALTH_FACTOR_WARNING_THRESHOLD, InterestRateMode, UNISWAP_INFO, UNISWAP_V2_FACTORY, UNISWAP_V2_ROUTER, UNISWAP_V3_FACTORY, UNISWAP_V3_ROUTER, UniswapV3FeeTier, calculateBorrowAPY, calculateHealthFactor, calculateMaxBorrow, calculateMinimumAmountOut, calculatePriceImpact, calculateSupplyAPY, getAaveAddresses, getOptimalRoute, getRiskLevel, getUniswapAddresses, getV3PoolAddress, hasLiquidity } from "./protocols.js";
class BaseProvider {
  constructor(config) {
    this.listeners = /* @__PURE__ */ new Map();
    this.connected = false;
    this.config = config;
    this.name = config.name;
    this.blockchains = config.blockchains || [];
    this.chainIds = config.chainIds || [];
    this.currentChainId = config.chainId || 1;
  }
  // Common implementation for transaction waiting
  async waitForTransaction(transactionHash, confirmations = 1, timeout = 6e4) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const receipt = await this.getTransactionReceipt(transactionHash);
      if (receipt) {
        if (confirmations <= 1) {
          return receipt;
        }
        const currentBlock = await this.getBlockNumber();
        const confirmationCount = currentBlock - receipt.blockNumber + 1;
        if (confirmationCount >= confirmations) {
          return receipt;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1e3));
    }
    throw new Error(`Transaction ${transactionHash} timed out after ${timeout}ms`);
  }
  // Event management implementation
  on(eventName, listener) {
    const eventKey = this.getEventKey(eventName);
    if (!this.listeners.has(eventKey)) {
      this.listeners.set(eventKey, /* @__PURE__ */ new Set());
    }
    this.listeners.get(eventKey).add(listener);
  }
  once(eventName, listener) {
    const wrappedListener = (...args) => {
      listener(...args);
      this.off(eventName, wrappedListener);
    };
    this.on(eventName, wrappedListener);
  }
  off(eventName, listener) {
    const eventKey = this.getEventKey(eventName);
    if (!listener) {
      this.listeners.delete(eventKey);
    } else {
      const listeners = this.listeners.get(eventKey);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listeners.delete(eventKey);
        }
      }
    }
  }
  removeAllListeners(eventName) {
    if (eventName) {
      const eventKey = this.getEventKey(eventName);
      this.listeners.delete(eventKey);
    } else {
      this.listeners.clear();
    }
  }
  emit(eventName, ...args) {
    const eventKey = this.getEventKey(eventName);
    const listeners = this.listeners.get(eventKey);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${eventKey}:`, error);
        }
      });
    }
  }
  getEventKey(eventName) {
    if (typeof eventName === "string") {
      return eventName;
    }
    return JSON.stringify(eventName);
  }
  // Connection management
  async connect() {
    if (this.connected) {
      return;
    }
    this.connected = true;
    this.emit("connect");
  }
  async disconnect() {
    if (!this.connected) {
      return;
    }
    this.connected = false;
    this.emit("disconnect");
    this.removeAllListeners();
  }
  isConnected() {
    return this.connected;
  }
  // Helper methods
  getName() {
    return this.name;
  }
  getBlockchains() {
    return this.blockchains;
  }
  getChainIds() {
    return this.chainIds;
  }
  getCurrentChainId() {
    return this.currentChainId;
  }
  async switchChain(chainId) {
    if (!this.chainIds.includes(chainId)) {
      throw new Error(`Chain ID ${chainId} not supported by ${this.name} provider`);
    }
    this.currentChainId = chainId;
    this.emit("chainChanged", chainId);
  }
  // Utility method to validate addresses
  isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
  // Utility method to normalize addresses
  normalizeAddress(address) {
    if (!address.startsWith("0x")) {
      address = "0x" + address;
    }
    return address.toLowerCase();
  }
  // Utility method to handle RPC errors
  handleRpcError(error) {
    if (error.code && error.message) {
      return new Error(`RPC Error ${error.code}: ${error.message}`);
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
const NETWORK_MAP = {
  1: "eth-mainnet",
  5: "eth-goerli",
  11155111: "eth-sepolia",
  137: "polygon-mainnet",
  80001: "polygon-mumbai",
  42161: "arb-mainnet",
  421613: "arb-goerli",
  10: "opt-mainnet",
  420: "opt-goerli",
  8453: "base-mainnet",
  84531: "base-goerli"
};
class AlchemyProvider extends BaseProvider {
  constructor(config) {
    super({
      ...config,
      name: "Alchemy",
      blockchains: config.blockchains || ["Ethereum", "Polygon", "Arbitrum", "Optimism", "Base"],
      chainIds: config.chainIds || [1, 5, 11155111, 137, 80001, 42161, 421613, 10, 420, 8453, 84531]
    });
    this.baseUrl = "";
    this.apiKey = config.apiKey;
    this.updateBaseUrl();
  }
  updateBaseUrl() {
    const network = NETWORK_MAP[this.currentChainId] || "eth-mainnet";
    this.baseUrl = `https://${network}.g.alchemy.com/v2/${this.apiKey}`;
  }
  async makeRpcCall(method, params = []) {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method,
        params
      })
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.error) {
      throw this.handleRpcError(data.error);
    }
    return data.result;
  }
  async getNetwork() {
    const chainId = await this.getChainId();
    const name = this.getNetworkName(chainId);
    return { name, chainId };
  }
  getNetworkName(chainId) {
    const networkNames = {
      1: "mainnet",
      5: "goerli",
      11155111: "sepolia",
      137: "matic",
      80001: "maticmum",
      42161: "arbitrum",
      421613: "arbitrum-goerli",
      10: "optimism",
      420: "optimism-goerli",
      8453: "base",
      84531: "base-goerli"
    };
    return networkNames[chainId] || "unknown";
  }
  async getChainId() {
    const result = await this.makeRpcCall("eth_chainId");
    return parseInt(result, 16);
  }
  async getBlockNumber() {
    const result = await this.makeRpcCall("eth_blockNumber");
    return parseInt(result, 16);
  }
  async getBlock(blockHashOrBlockTag) {
    const params = [
      this.formatBlockTag(blockHashOrBlockTag),
      false
      // Don't include transactions
    ];
    const result = await this.makeRpcCall("eth_getBlockByNumber", params);
    return result ? this.formatBlock(result) : null;
  }
  async getBlockWithTransactions(blockHashOrBlockTag) {
    const params = [
      this.formatBlockTag(blockHashOrBlockTag),
      true
      // Include transactions
    ];
    const result = await this.makeRpcCall("eth_getBlockByNumber", params);
    return result ? this.formatBlockWithTransactions(result) : null;
  }
  async getBalance(address, blockTag) {
    const params = [
      address,
      blockTag ? this.formatBlockTag(blockTag) : "latest"
    ];
    const result = await this.makeRpcCall("eth_getBalance", params);
    return BigInt(result);
  }
  async getTransactionCount(address, blockTag) {
    const params = [
      address,
      blockTag ? this.formatBlockTag(blockTag) : "latest"
    ];
    const result = await this.makeRpcCall("eth_getTransactionCount", params);
    return parseInt(result, 16);
  }
  async getCode(address, blockTag) {
    const params = [
      address,
      blockTag ? this.formatBlockTag(blockTag) : "latest"
    ];
    return await this.makeRpcCall("eth_getCode", params);
  }
  async call(transaction, blockTag) {
    const params = [
      this.formatTransaction(transaction),
      blockTag ? this.formatBlockTag(blockTag) : "latest"
    ];
    return await this.makeRpcCall("eth_call", params);
  }
  async estimateGas(transaction) {
    const params = [this.formatTransaction(transaction)];
    const result = await this.makeRpcCall("eth_estimateGas", params);
    return BigInt(result);
  }
  async sendTransaction(transaction) {
    throw new Error("sendTransaction requires transaction signing - use with a Signer");
  }
  async getTransaction(transactionHash) {
    const result = await this.makeRpcCall("eth_getTransactionByHash", [transactionHash]);
    return result ? this.formatTransaction(result) : null;
  }
  async getTransactionReceipt(transactionHash) {
    const result = await this.makeRpcCall("eth_getTransactionReceipt", [transactionHash]);
    return result ? this.formatReceipt(result) : null;
  }
  async getGasPrice() {
    const result = await this.makeRpcCall("eth_gasPrice");
    return BigInt(result);
  }
  async getFeeData() {
    const [gasPrice, block] = await Promise.all([
      this.getGasPrice(),
      this.getBlock("latest")
    ]);
    let maxFeePerGas = null;
    let maxPriorityFeePerGas = null;
    let lastBaseFeePerGas = null;
    if (block && block.baseFeePerGas) {
      lastBaseFeePerGas = BigInt(block.baseFeePerGas.toString());
      maxPriorityFeePerGas = BigInt(15e8);
      maxFeePerGas = lastBaseFeePerGas * 2n + maxPriorityFeePerGas;
    }
    return {
      gasPrice,
      lastBaseFeePerGas,
      maxFeePerGas,
      maxPriorityFeePerGas
    };
  }
  async getLogs(filter) {
    const params = [this.formatFilter(filter)];
    const result = await this.makeRpcCall("eth_getLogs", params);
    return result.map((log) => this.formatLog(log));
  }
  async switchChain(chainId) {
    await super.switchChain(chainId);
    this.updateBaseUrl();
  }
  // Formatting helpers
  formatBlockTag(blockTag) {
    if (typeof blockTag === "string") {
      return blockTag;
    }
    if (typeof blockTag === "number") {
      return `0x${blockTag.toString(16)}`;
    }
    return "latest";
  }
  formatTransaction(tx) {
    const formatted = {};
    if (tx.to) formatted.to = tx.to;
    if (tx.from) formatted.from = tx.from;
    if (tx.value) formatted.value = `0x${BigInt(tx.value).toString(16)}`;
    if (tx.data) formatted.data = tx.data;
    if (tx.gasLimit) formatted.gas = `0x${BigInt(tx.gasLimit).toString(16)}`;
    if (tx.gasPrice) formatted.gasPrice = `0x${BigInt(tx.gasPrice).toString(16)}`;
    if (tx.nonce !== void 0) formatted.nonce = `0x${tx.nonce.toString(16)}`;
    return formatted;
  }
  formatBlock(block) {
    return {
      hash: block.hash,
      parentHash: block.parentHash,
      number: parseInt(block.number, 16),
      timestamp: parseInt(block.timestamp, 16),
      gasLimit: BigInt(block.gasLimit),
      gasUsed: BigInt(block.gasUsed),
      miner: block.miner,
      baseFeePerGas: block.baseFeePerGas ? BigInt(block.baseFeePerGas) : void 0,
      transactions: block.transactions || []
    };
  }
  formatBlockWithTransactions(block) {
    const formatted = this.formatBlock(block);
    formatted.transactions = block.transactions.map((tx) => this.formatTransaction(tx));
    return formatted;
  }
  formatReceipt(receipt) {
    return {
      transactionHash: receipt.transactionHash,
      blockHash: receipt.blockHash,
      blockNumber: parseInt(receipt.blockNumber, 16),
      transactionIndex: parseInt(receipt.transactionIndex, 16),
      from: receipt.from,
      to: receipt.to,
      contractAddress: receipt.contractAddress,
      cumulativeGasUsed: BigInt(receipt.cumulativeGasUsed),
      gasUsed: BigInt(receipt.gasUsed),
      effectiveGasPrice: receipt.effectiveGasPrice ? BigInt(receipt.effectiveGasPrice) : void 0,
      logs: receipt.logs.map((log) => this.formatLog(log)),
      logsBloom: receipt.logsBloom,
      status: parseInt(receipt.status, 16)
    };
  }
  formatLog(log) {
    return {
      address: log.address,
      topics: log.topics,
      data: log.data,
      blockNumber: log.blockNumber ? parseInt(log.blockNumber, 16) : void 0,
      blockHash: log.blockHash,
      transactionHash: log.transactionHash,
      transactionIndex: log.transactionIndex ? parseInt(log.transactionIndex, 16) : void 0,
      logIndex: log.logIndex ? parseInt(log.logIndex, 16) : void 0,
      removed: log.removed || false
    };
  }
  formatFilter(filter) {
    const formatted = {};
    if (filter.address) formatted.address = filter.address;
    if (filter.topics) formatted.topics = filter.topics;
    if (filter.fromBlock) formatted.fromBlock = this.formatBlockTag(filter.fromBlock);
    if (filter.toBlock) formatted.toBlock = this.formatBlockTag(filter.toBlock);
    return formatted;
  }
}
class ProviderFactory {
  static create(type, config) {
    switch (type.toLowerCase()) {
      case "alchemy":
        const { AlchemyProvider: AlchemyProvider2 } = require("./network/AlchemyProvider");
        return new AlchemyProvider2(config);
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }
}
const VERSION = "0.1.0";
export {
  AAVE_ATOKENS,
  AAVE_INFO,
  AAVE_ORACLE,
  AAVE_V3_DATA_PROVIDER,
  AAVE_V3_POOL,
  AlchemyProvider,
  BaseProvider,
  BaseToken,
  ERC20Token,
  HEALTH_FACTOR_LIQUIDATION_THRESHOLD,
  HEALTH_FACTOR_SAFE_THRESHOLD,
  HEALTH_FACTOR_WARNING_THRESHOLD,
  InterestRateMode,
  ProviderFactory,
  TokenService,
  UNISWAP_INFO,
  UNISWAP_V2_FACTORY,
  UNISWAP_V2_ROUTER,
  UNISWAP_V3_FACTORY,
  UNISWAP_V3_ROUTER,
  UniswapV3FeeTier,
  VERSION,
  arbitrum,
  avalanche,
  base,
  bsc,
  calculateBorrowAPY,
  calculateHealthFactor,
  calculateMaxBorrow,
  calculateMinimumAmountOut,
  calculatePriceImpact,
  calculateSupplyAPY,
  chainById,
  chains,
  commonTokens,
  ethereum,
  formatTokenAmount,
  getAaveAddresses,
  getChainById,
  getChainByNetwork,
  getMainnetChains,
  getOptimalRoute,
  getRiskLevel,
  getTestnetChains,
  getToken,
  getTokensByChain,
  getTokensBySymbol,
  getUniswapAddresses,
  getV3PoolAddress,
  hasLiquidity,
  isStablecoin,
  isTestnet,
  isWrappedNative,
  mergeTokenLists,
  optimism,
  parseTokenAmount,
  polygon,
  sepolia,
  validateTokenList
};
//# sourceMappingURL=index.js.map
