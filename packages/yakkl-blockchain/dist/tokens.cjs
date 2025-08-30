"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
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
exports.commonTokens = commonTokens;
exports.formatTokenAmount = formatTokenAmount;
exports.getToken = getToken;
exports.getTokensByChain = getTokensByChain;
exports.getTokensBySymbol = getTokensBySymbol;
exports.isStablecoin = isStablecoin;
exports.isWrappedNative = isWrappedNative;
exports.mergeTokenLists = mergeTokenLists;
exports.parseTokenAmount = parseTokenAmount;
exports.validateTokenList = validateTokenList;
//# sourceMappingURL=tokens.cjs.map
