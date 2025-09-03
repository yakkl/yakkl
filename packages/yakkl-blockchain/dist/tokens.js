const commonTokens = {
  // Ethereum Mainnet
  "USDC_ETH": {
    chainId: 1,
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
    tags: ["stablecoin"]
  },
  "USDT_ETH": {
    chainId: 1,
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    name: "Tether USD",
    symbol: "USDT",
    decimals: 6,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png",
    tags: ["stablecoin"]
  },
  "DAI_ETH": {
    chainId: 1,
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    name: "Dai Stablecoin",
    symbol: "DAI",
    decimals: 18,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png",
    tags: ["stablecoin"]
  },
  "WETH_ETH": {
    chainId: 1,
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    name: "Wrapped Ether",
    symbol: "WETH",
    decimals: 18,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png",
    tags: ["wrapped"]
  },
  "WBTC_ETH": {
    chainId: 1,
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    name: "Wrapped BTC",
    symbol: "WBTC",
    decimals: 8,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png",
    tags: ["wrapped"]
  },
  // Polygon
  "USDC_POLYGON": {
    chainId: 137,
    address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    tags: ["stablecoin"]
  },
  "USDT_POLYGON": {
    chainId: 137,
    address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    name: "Tether USD",
    symbol: "USDT",
    decimals: 6,
    tags: ["stablecoin"]
  },
  "WMATIC_POLYGON": {
    chainId: 137,
    address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    name: "Wrapped Matic",
    symbol: "WMATIC",
    decimals: 18,
    tags: ["wrapped"]
  },
  // Arbitrum
  "USDC_ARB": {
    chainId: 42161,
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    tags: ["stablecoin"]
  },
  "USDT_ARB": {
    chainId: 42161,
    address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    name: "Tether USD",
    symbol: "USDT",
    decimals: 6,
    tags: ["stablecoin"]
  },
  // Optimism
  "USDC_OP": {
    chainId: 10,
    address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    tags: ["stablecoin"]
  },
  // Base
  "USDC_BASE": {
    chainId: 8453,
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    tags: ["stablecoin"]
  }
};
function getToken(address, chainId) {
  const normalizedAddress = address.toLowerCase();
  return Object.values(commonTokens).find(
    (token) => token.address.toLowerCase() === normalizedAddress && token.chainId === chainId
  );
}
function getTokensByChain(chainId) {
  return Object.values(commonTokens).filter((token) => token.chainId === chainId);
}
function getTokensBySymbol(symbol) {
  return Object.values(commonTokens).filter(
    (token) => token.symbol.toLowerCase() === symbol.toLowerCase()
  );
}
function isStablecoin(token) {
  var _a;
  return ((_a = token.tags) == null ? void 0 : _a.includes("stablecoin")) || false;
}
function isWrappedNative(token) {
  var _a;
  return ((_a = token.tags) == null ? void 0 : _a.includes("wrapped")) || false;
}
function formatTokenAmount(amount, decimals, displayDecimals = 6) {
  const value = typeof amount === "string" ? BigInt(amount) : amount;
  const divisor = BigInt(10 ** decimals);
  const quotient = value / divisor;
  const remainder = value % divisor;
  const integerPart = quotient.toString();
  const fractionalPart = remainder.toString().padStart(decimals, "0");
  if (displayDecimals === 0) {
    return integerPart;
  }
  const truncatedFractional = fractionalPart.slice(0, displayDecimals);
  return `${integerPart}.${truncatedFractional}`;
}
function parseTokenAmount(amount, decimals) {
  const [integerPart, fractionalPart = ""] = amount.split(".");
  const paddedFractional = fractionalPart.padEnd(decimals, "0").slice(0, decimals);
  const combined = integerPart + paddedFractional;
  return BigInt(combined);
}
function validateTokenList(list) {
  if (!list || typeof list !== "object") return false;
  if (!list.name || typeof list.name !== "string") return false;
  if (!Array.isArray(list.tokens)) return false;
  if (!list.version || typeof list.version !== "object") return false;
  return list.tokens.every(
    (token) => token && typeof token.chainId === "number" && typeof token.address === "string" && typeof token.name === "string" && typeof token.symbol === "string" && typeof token.decimals === "number"
  );
}
function mergeTokenLists(...lists) {
  const mergedTokens = /* @__PURE__ */ new Map();
  for (const list of lists) {
    for (const token of list.tokens) {
      const key = `${token.chainId}-${token.address.toLowerCase()}`;
      mergedTokens.set(key, token);
    }
  }
  return {
    name: "Merged Token List",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    version: { major: 1, minor: 0, patch: 0 },
    tokens: Array.from(mergedTokens.values())
  };
}
class BaseToken {
  constructor(info, metadata, provider) {
    this.address = info.address;
    this.name = info.name;
    this.symbol = info.symbol;
    this.decimals = info.decimals;
    this.chainId = info.chainId;
    this.logoURI = info.logoURI;
    this.description = info.description;
    this.tags = info.tags;
    if (metadata) {
      this.isNative = metadata.isNative;
      this.isStablecoin = metadata.isStablecoin;
      this.isWrapped = metadata.isWrapped;
      this.isLPToken = metadata.isLPToken;
      this.website = metadata.website;
      this.twitter = metadata.twitter;
      this.coingeckoId = metadata.coingeckoId;
      this.coinmarketcapId = metadata.coinmarketcapId;
    }
    this.provider = provider;
  }
  // Utility methods
  setProvider(provider) {
    this.provider = provider;
  }
  getProvider() {
    return this.provider;
  }
  /**
   * Format balance from smallest unit to human-readable
   */
  formatBalance(balance) {
    const balanceStr = balance.toString();
    const divisor = BigInt(10 ** this.decimals);
    const wholePart = BigInt(balanceStr) / divisor;
    const fractionalPart = BigInt(balanceStr) % divisor;
    if (fractionalPart === 0n) {
      return wholePart.toString();
    }
    const fractionalStr = fractionalPart.toString().padStart(this.decimals, "0");
    const trimmedFractional = fractionalStr.replace(/0+$/, "");
    if (trimmedFractional === "") {
      return wholePart.toString();
    }
    return `${wholePart}.${trimmedFractional}`;
  }
  /**
   * Parse human-readable amount to smallest unit
   */
  parseAmount(amount) {
    const amountStr = amount.toString();
    const parts = amountStr.split(".");
    if (parts.length > 2) {
      throw new Error("Invalid amount format");
    }
    const wholePart = BigInt(parts[0] || 0);
    let fractionalPart = 0n;
    if (parts[1]) {
      const fractionalStr = parts[1].padEnd(this.decimals, "0").slice(0, this.decimals);
      fractionalPart = BigInt(fractionalStr);
    }
    return wholePart * BigInt(10 ** this.decimals) + fractionalPart;
  }
  /**
   * Check if this token is the same as another
   */
  equals(other) {
    return this.address.toLowerCase() === other.address.toLowerCase() && this.chainId === other.chainId;
  }
  /**
   * Get a unique identifier for this token
   */
  getId() {
    return `${this.chainId}-${this.address.toLowerCase()}`;
  }
  /**
   * Convert to JSON representation
   */
  toJSON() {
    return {
      address: this.address,
      name: this.name,
      symbol: this.symbol,
      decimals: this.decimals,
      chainId: this.chainId,
      logoURI: this.logoURI,
      description: this.description,
      tags: this.tags,
      isNative: this.isNative,
      isStablecoin: this.isStablecoin,
      isWrapped: this.isWrapped,
      isLPToken: this.isLPToken,
      website: this.website,
      twitter: this.twitter,
      coingeckoId: this.coingeckoId,
      coinmarketcapId: this.coinmarketcapId
    };
  }
  /**
   * Create a string representation
   */
  toString() {
    return `${this.symbol} (${this.name})`;
  }
}
class ERC20Token extends BaseToken {
  constructor(info, metadata, provider) {
    super(info, metadata, provider);
  }
  /**
   * Get token name from contract (IERC20 method)
   */
  async getName() {
    if (!this.provider) {
      throw new Error("Provider not set");
    }
    const data = await this.provider.call({
      to: this.address,
      data: this.encodeFunctionData("name", [])
    });
    return this.decodeFunctionResult("name", data);
  }
  /**
   * Get token symbol from contract (IERC20 method)
   */
  async getSymbol() {
    if (!this.provider) {
      throw new Error("Provider not set");
    }
    const data = await this.provider.call({
      to: this.address,
      data: this.encodeFunctionData("symbol", [])
    });
    return this.decodeFunctionResult("symbol", data);
  }
  /**
   * Get token decimals from contract (IERC20 method)
   */
  async getDecimals() {
    if (!this.provider) {
      throw new Error("Provider not set");
    }
    const data = await this.provider.call({
      to: this.address,
      data: this.encodeFunctionData("decimals", [])
    });
    return Number(this.decodeFunctionResult("decimals", data));
  }
  /**
   * Get total supply of the token
   */
  async totalSupply() {
    if (!this.provider) {
      throw new Error("Provider not set");
    }
    const data = await this.provider.call({
      to: this.address,
      data: this.encodeFunctionData("totalSupply", [])
    });
    return BigInt(data);
  }
  /**
   * Get balance of an address
   */
  async balanceOf(account) {
    return this.getBalance(account);
  }
  /**
   * Get balance implementation
   */
  async getBalance(address) {
    if (!this.provider) {
      throw new Error("Provider not set");
    }
    if (this.isNative) {
      return await this.provider.getBalance(address);
    }
    const data = await this.provider.call({
      to: this.address,
      data: this.encodeFunctionData("balanceOf", [address])
    });
    return BigInt(data);
  }
  /**
   * Transfer tokens to another address
   */
  async transfer(to, amount) {
    if (!this.provider) {
      throw new Error("Provider not set");
    }
    const tx = await this.provider.sendTransaction({
      to: this.address,
      data: this.encodeFunctionData("transfer", [to, amount.toString()])
    });
    return tx.hash;
  }
  /**
   * Get allowance for a spender
   */
  async allowance(owner, spender) {
    if (!this.provider) {
      throw new Error("Provider not set");
    }
    const data = await this.provider.call({
      to: this.address,
      data: this.encodeFunctionData("allowance", [owner, spender])
    });
    return BigInt(data);
  }
  /**
   * Approve a spender to use tokens
   */
  async approve(spender, amount) {
    if (!this.provider) {
      throw new Error("Provider not set");
    }
    const tx = await this.provider.sendTransaction({
      to: this.address,
      data: this.encodeFunctionData("approve", [spender, amount.toString()])
    });
    return tx.hash;
  }
  /**
   * Transfer tokens from one address to another (requires approval)
   */
  async transferFrom(from, to, amount) {
    if (!this.provider) {
      throw new Error("Provider not set");
    }
    const tx = await this.provider.sendTransaction({
      to: this.address,
      data: this.encodeFunctionData("transferFrom", [from, to, amount.toString()])
    });
    const receipt = await this.provider.waitForTransaction(tx.hash);
    return receipt.status === 1;
  }
  /**
   * Encode function data for contract calls
   * This is a simplified version - in production, use ethers.js or similar
   */
  encodeFunctionData(functionName, args) {
    const functionSignatures = {
      "name": "0x06fdde03",
      "symbol": "0x95d89b41",
      "decimals": "0x313ce567",
      "totalSupply": "0x18160ddd",
      "balanceOf": "0x70a08231",
      "transfer": "0xa9059cbb",
      "allowance": "0xdd62ed3e",
      "approve": "0x095ea7b3",
      "transferFrom": "0x23b872dd"
    };
    let data = functionSignatures[functionName];
    if (!data) {
      throw new Error(`Unknown function: ${functionName}`);
    }
    for (const arg of args) {
      if (typeof arg === "string" && arg.startsWith("0x")) {
        data += arg.slice(2).padStart(64, "0");
      } else {
        const hex = BigInt(arg).toString(16);
        data += hex.padStart(64, "0");
      }
    }
    return data;
  }
  /**
   * Decode function result from contract call
   * This is a simplified version - in production, use ethers.js or similar
   */
  decodeFunctionResult(functionName, data) {
    const hexData = data.startsWith("0x") ? data.slice(2) : data;
    switch (functionName) {
      case "name":
      case "symbol":
        const length = parseInt(hexData.slice(64, 128), 16);
        const stringData = hexData.slice(128, 128 + length * 2);
        return Buffer.from(stringData, "hex").toString("utf8");
      case "decimals":
        return parseInt(hexData.slice(-2), 16);
      case "totalSupply":
      case "balanceOf":
      case "allowance":
        return BigInt("0x" + hexData);
      case "transfer":
      case "approve":
      case "transferFrom":
        return hexData === "0".repeat(63) + "1";
      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }
  /**
   * Create an ERC20 token instance from an address
   */
  static async fromAddress(address, chainId, provider) {
    const temp = new ERC20Token(
      {
        address,
        chainId,
        name: "",
        symbol: "",
        decimals: 18
      },
      {},
      provider
    );
    const [name, symbol, decimals] = await Promise.all([
      temp.getName(),
      temp.getSymbol(),
      temp.getDecimals()
    ]);
    return new ERC20Token(
      {
        address,
        chainId,
        name,
        symbol,
        decimals
      },
      {},
      provider
    );
  }
}
class TokenService {
  constructor(config = {}, provider) {
    this.tokenCache = /* @__PURE__ */ new Map();
    this.priceCache = /* @__PURE__ */ new Map();
    this.tokenLists = /* @__PURE__ */ new Map();
    this.config = {
      autoUpdatePrices: false,
      priceUpdateInterval: 6e4,
      // 1 minute
      cacheEnabled: true,
      cacheDuration: 3e5,
      // 5 minutes
      ...config
    };
    this.provider = provider;
    if (this.config.autoUpdatePrices) {
      this.startPriceUpdates();
    }
  }
  /**
   * Set the provider for blockchain interactions
   */
  setProvider(provider) {
    this.provider = provider;
  }
  /**
   * Load a token list from URL
   */
  async loadTokenList(url) {
    if (this.tokenLists.has(url)) {
      return this.tokenLists.get(url);
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load token list from ${url}`);
    }
    const tokenList = await response.json();
    this.tokenLists.set(url, tokenList);
    for (const token of tokenList.tokens) {
      const tokenId = this.getTokenId(token.chainId, token.address);
      if (!this.tokenCache.has(tokenId) && this.provider) {
        const erc20Token = new ERC20Token(token, void 0, this.provider);
        this.tokenCache.set(tokenId, erc20Token);
      }
    }
    return tokenList;
  }
  /**
   * Get a token by address and chain
   */
  async getToken(address, chainId) {
    const tokenId = this.getTokenId(chainId, address);
    if (this.tokenCache.has(tokenId)) {
      return this.tokenCache.get(tokenId);
    }
    if (!this.provider) {
      return null;
    }
    try {
      const token = await ERC20Token.fromAddress(address, chainId, this.provider);
      this.tokenCache.set(tokenId, token);
      return token;
    } catch (error) {
      console.error(`Failed to load token ${address} on chain ${chainId}:`, error);
      return null;
    }
  }
  /**
   * Get token balance for an address
   */
  async getTokenBalance(tokenAddress, ownerAddress, chainId) {
    const token = await this.getToken(tokenAddress, chainId);
    if (!token) {
      return null;
    }
    try {
      const balance = await token.getBalance(ownerAddress);
      const tokenInfo = token.toJSON();
      return {
        ...tokenInfo,
        balance,
        balanceFormatted: token.formatBalance(balance)
      };
    } catch (error) {
      console.error(`Failed to get balance for ${tokenAddress}:`, error);
      return null;
    }
  }
  /**
   * Get multiple token balances
   */
  async getTokenBalances(tokens, ownerAddress) {
    const balancePromises = tokens.map(
      ({ address, chainId }) => this.getTokenBalance(address, ownerAddress, chainId)
    );
    const results = await Promise.all(balancePromises);
    return results.filter((balance) => balance !== null);
  }
  /**
   * Get portfolio items with prices
   */
  async getPortfolio(ownerAddress, chainId, options) {
    const allTokens = [];
    for (const tokenList of this.tokenLists.values()) {
      const chainTokens = tokenList.tokens.filter((t) => t.chainId === chainId);
      allTokens.push(...chainTokens);
    }
    let filteredTokens = this.filterTokens(allTokens, options);
    const balances = await this.getTokenBalances(
      filteredTokens.map((t) => ({ address: t.address, chainId: t.chainId })),
      ownerAddress
    );
    const portfolioItems = [];
    let totalValue = 0;
    for (const balance of balances) {
      const price = await this.getTokenPrice(balance.symbol);
      const value = price ? Number(balance.balanceFormatted || 0) * price.price : 0;
      totalValue += value;
      portfolioItems.push({
        ...balance,
        price: price == null ? void 0 : price.price,
        value,
        valueUSD: value,
        change24h: price == null ? void 0 : price.change24h,
        change24hPercent: price == null ? void 0 : price.change24hPercent
      });
    }
    for (const item of portfolioItems) {
      item.allocation = totalValue > 0 ? (item.valueUSD || 0) / totalValue * 100 : 0;
    }
    return portfolioItems;
  }
  /**
   * Search for tokens
   */
  searchTokens(query, chainId) {
    const results = [];
    const searchLower = query.toLowerCase();
    for (const tokenList of this.tokenLists.values()) {
      const matches = tokenList.tokens.filter((token) => {
        if (chainId && token.chainId !== chainId) {
          return false;
        }
        return token.symbol.toLowerCase().includes(searchLower) || token.name.toLowerCase().includes(searchLower) || token.address.toLowerCase() === searchLower;
      });
      results.push(...matches);
    }
    const unique = /* @__PURE__ */ new Map();
    for (const token of results) {
      const id = this.getTokenId(token.chainId, token.address);
      if (!unique.has(id)) {
        unique.set(id, token);
      }
    }
    return Array.from(unique.values());
  }
  /**
   * Filter tokens based on options
   */
  filterTokens(tokens, options) {
    if (!options) {
      return tokens;
    }
    return tokens.filter((token) => {
      if (options.chainId && token.chainId !== options.chainId) {
        return false;
      }
      if (options.search) {
        const searchLower = options.search.toLowerCase();
        if (!token.symbol.toLowerCase().includes(searchLower) && !token.name.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      if (options.tags && options.tags.length > 0) {
        if (!token.tags || !options.tags.some((tag) => token.tags.includes(tag))) {
          return false;
        }
      }
      return true;
    });
  }
  /**
   * Sort tokens based on options
   */
  sortTokens(tokens, options) {
    const sorted = [...tokens];
    const multiplier = options.direction === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (options.field) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "symbol":
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case "balance":
          comparison = Number(a.balance) - Number(b.balance);
          break;
        case "value":
          comparison = (a.valueUSD || 0) - (b.valueUSD || 0);
          break;
        case "change24h":
          comparison = (a.change24hPercent || 0) - (b.change24hPercent || 0);
          break;
      }
      return comparison * multiplier;
    });
    return sorted;
  }
  /**
   * Get token price (mock implementation - replace with actual price provider)
   */
  async getTokenPrice(symbol) {
    if (this.priceCache.has(symbol)) {
      const cached = this.priceCache.get(symbol);
      if (Date.now() - (cached.lastUpdated || 0) < this.config.cacheDuration) {
        return cached;
      }
    }
    const mockPrice = {
      symbol,
      price: Math.random() * 1e3,
      currency: "USD",
      change24h: (Math.random() - 0.5) * 100,
      change24hPercent: (Math.random() - 0.5) * 20,
      volume24h: Math.random() * 1e6,
      marketCap: Math.random() * 1e7,
      lastUpdated: Date.now()
    };
    this.priceCache.set(symbol, mockPrice);
    return mockPrice;
  }
  /**
   * Start automatic price updates
   */
  startPriceUpdates() {
    setInterval(() => {
      for (const [symbol] of this.priceCache) {
        this.getTokenPrice(symbol);
      }
    }, this.config.priceUpdateInterval);
  }
  /**
   * Get a unique token ID
   */
  getTokenId(chainId, address) {
    return `${chainId}-${address.toLowerCase()}`;
  }
  /**
   * Clear all caches
   */
  clearCache() {
    this.tokenCache.clear();
    this.priceCache.clear();
    this.tokenLists.clear();
  }
}
export {
  BaseToken,
  ERC20Token,
  TokenService,
  commonTokens,
  formatTokenAmount,
  getToken,
  getTokensByChain,
  getTokensBySymbol,
  isStablecoin,
  isWrappedNative,
  mergeTokenLists,
  parseTokenAmount,
  validateTokenList
};
//# sourceMappingURL=tokens.js.map
