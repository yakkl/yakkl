"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const UNISWAP_INFO = {
  name: "Uniswap",
  version: "V3",
  chainIds: [1, 137, 42161, 10, 8453],
  website: "https://uniswap.org",
  documentation: "https://docs.uniswap.org",
  github: "https://github.com/Uniswap"
};
const UNISWAP_V3_FACTORY = {
  1: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  // Ethereum
  137: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  // Polygon
  42161: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  // Arbitrum
  10: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  // Optimism
  8453: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD"
  // Base
};
const UNISWAP_V3_ROUTER = {
  1: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  // Ethereum
  137: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  // Polygon
  42161: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  // Arbitrum
  10: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  // Optimism
  8453: "0x2626664c2603336E57B271c5C0b26F421741e481"
  // Base
};
const UNISWAP_V2_FACTORY = {
  1: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
  // Ethereum
  137: "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32",
  // Polygon (QuickSwap)
  42161: "0xf1D7CC64Fb4452F05c498126312eBE29f30Fbcf9",
  // Arbitrum (Sushiswap)
  10: "0x0c3c1c532F1e39EdF36BE9Fe0bE1410313E074Bf",
  // Optimism
  8453: "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6"
  // Base
};
const UNISWAP_V2_ROUTER = {
  1: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  // Ethereum
  137: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
  // Polygon (QuickSwap)
  42161: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
  // Arbitrum (Sushiswap)
  10: "0x9c12939390052919aF3155f41Bf4160Fd3666A6f",
  // Optimism (Velodrome)
  8453: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24"
  // Base
};
var UniswapV3FeeTier = /* @__PURE__ */ ((UniswapV3FeeTier2) => {
  UniswapV3FeeTier2[UniswapV3FeeTier2["LOWEST"] = 100] = "LOWEST";
  UniswapV3FeeTier2[UniswapV3FeeTier2["LOW"] = 500] = "LOW";
  UniswapV3FeeTier2[UniswapV3FeeTier2["MEDIUM"] = 3e3] = "MEDIUM";
  UniswapV3FeeTier2[UniswapV3FeeTier2["HIGH"] = 1e4] = "HIGH";
  return UniswapV3FeeTier2;
})(UniswapV3FeeTier || {});
function getUniswapAddresses(chainId, version = "V3") {
  if (version === "V3") {
    return {
      factory: UNISWAP_V3_FACTORY[chainId],
      router: UNISWAP_V3_ROUTER[chainId]
    };
  } else {
    return {
      factory: UNISWAP_V2_FACTORY[chainId],
      router: UNISWAP_V2_ROUTER[chainId]
    };
  }
}
function calculatePriceImpact(amountIn, amountOut, spotPrice, decimalsIn, decimalsOut) {
  const executionPrice = amountOut * BigInt(10 ** decimalsIn) / amountIn;
  const spotPriceAdjusted = spotPrice * BigInt(10 ** decimalsOut) / BigInt(10 ** decimalsIn);
  const impact = Number((spotPriceAdjusted - executionPrice) * BigInt(1e4) / spotPriceAdjusted) / 100;
  return Math.abs(impact);
}
function calculateMinimumAmountOut(amountOut, slippageTolerance = 0.5) {
  const slippageFactor = BigInt(Math.floor((100 - slippageTolerance) * 100));
  return amountOut * slippageFactor / BigInt(1e4);
}
function getV3PoolAddress(tokenA, tokenB, fee, factoryAddress) {
  const [token0, token1] = tokenA.toLowerCase() < tokenB.toLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA];
  return `pool-${token0}-${token1}-${fee}`;
}
function hasLiquidity(reserves0, reserves1, minLiquidityUSD = 1e3) {
  return reserves0 > 0n && reserves1 > 0n;
}
function getOptimalRoute(tokenIn, tokenOut, chainId) {
  const WETH = {
    1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    137: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    // WMATIC
    42161: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    10: "0x4200000000000000000000000000000000000006",
    8453: "0x4200000000000000000000000000000000000006"
  };
  const USDC = {
    1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    137: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    10: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  };
  const weth = WETH[chainId];
  const usdc = USDC[chainId];
  if (tokenIn === tokenOut) return [tokenIn];
  if (weth && tokenIn !== weth && tokenOut !== weth) {
    return [tokenIn, weth, tokenOut];
  }
  if (usdc && tokenIn !== usdc && tokenOut !== usdc) {
    return [tokenIn, usdc, tokenOut];
  }
  return [tokenIn, tokenOut];
}
const AAVE_INFO = {
  name: "Aave",
  version: "V3",
  chainIds: [1, 137, 42161, 10, 8453, 43114],
  website: "https://aave.com",
  documentation: "https://docs.aave.com",
  github: "https://github.com/aave"
};
const AAVE_V3_POOL = {
  1: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
  // Ethereum
  137: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
  // Polygon
  42161: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
  // Arbitrum
  10: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
  // Optimism
  8453: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
  // Base
  43114: "0x794a61358D6845594F94dc1DB02A252b5b4814aD"
  // Avalanche
};
const AAVE_V3_DATA_PROVIDER = {
  1: "0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3",
  // Ethereum
  137: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
  // Polygon
  42161: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
  // Arbitrum
  10: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
  // Optimism
  8453: "0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac",
  // Base
  43114: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654"
  // Avalanche
};
const AAVE_ORACLE = {
  1: "0x54586bE62E3c3580375aE3723C145253060Ca0C2",
  // Ethereum
  137: "0xb023e699F5a33916Ea823A16485e259257cA8Bd1",
  // Polygon
  42161: "0xb56c2F0B653B2e0b10C9b928C8580Ac5Df02C7C7",
  // Arbitrum
  10: "0xD81eb3728a631871a7eBBaD631b5f424909f0c77",
  // Optimism
  8453: "0x2Cc0Fc26eD4563A5ce5e8bdcfe1A2878676Ae156",
  // Base
  43114: "0xEBd36016B3eD09D4693Ed4251c67Bd858c3c7C9C"
  // Avalanche
};
var InterestRateMode = /* @__PURE__ */ ((InterestRateMode2) => {
  InterestRateMode2[InterestRateMode2["NONE"] = 0] = "NONE";
  InterestRateMode2[InterestRateMode2["STABLE"] = 1] = "STABLE";
  InterestRateMode2[InterestRateMode2["VARIABLE"] = 2] = "VARIABLE";
  return InterestRateMode2;
})(InterestRateMode || {});
const HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 1;
const HEALTH_FACTOR_WARNING_THRESHOLD = 1.5;
const HEALTH_FACTOR_SAFE_THRESHOLD = 2;
function getAaveAddresses(chainId) {
  return {
    pool: AAVE_V3_POOL[chainId],
    dataProvider: AAVE_V3_DATA_PROVIDER[chainId],
    oracle: AAVE_ORACLE[chainId]
  };
}
function calculateHealthFactor(totalCollateralETH, totalDebtETH, liquidationThreshold) {
  if (totalDebtETH === 0n) {
    return Number.MAX_SAFE_INTEGER;
  }
  const threshold = BigInt(Math.floor(liquidationThreshold * 1e4));
  const healthFactor = totalCollateralETH * threshold / (totalDebtETH * BigInt(1e4));
  return Number(healthFactor * BigInt(100)) / 100;
}
function calculateMaxBorrow(totalCollateralETH, totalDebtETH, ltv) {
  const maxBorrowETH = totalCollateralETH * BigInt(Math.floor(ltv * 1e4)) / BigInt(1e4);
  const availableBorrowETH = maxBorrowETH > totalDebtETH ? maxBorrowETH - totalDebtETH : 0n;
  return availableBorrowETH;
}
function calculateBorrowAPY(borrowRate) {
  const RAY = BigInt(10 ** 27);
  const SECONDS_PER_YEAR = BigInt(31536e3);
  const ratePerSecond = borrowRate / SECONDS_PER_YEAR;
  const apy = Number(ratePerSecond * BigInt(100) / (RAY / BigInt(100))) / 100;
  return apy;
}
function calculateSupplyAPY(liquidityRate) {
  const RAY = BigInt(10 ** 27);
  const SECONDS_PER_YEAR = BigInt(31536e3);
  const ratePerSecond = liquidityRate / SECONDS_PER_YEAR;
  const apy = Number(ratePerSecond * BigInt(100) / (RAY / BigInt(100))) / 100;
  return apy;
}
function getRiskLevel(healthFactor) {
  if (healthFactor < HEALTH_FACTOR_LIQUIDATION_THRESHOLD) {
    return "critical";
  } else if (healthFactor < HEALTH_FACTOR_WARNING_THRESHOLD) {
    return "high";
  } else if (healthFactor < HEALTH_FACTOR_SAFE_THRESHOLD) {
    return "medium";
  } else {
    return "low";
  }
}
const AAVE_ATOKENS = {
  "aUSDC": {
    1: "0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c",
    // Ethereum
    137: "0x625E7708f30cA75bfd92586e17077590C60eb4cD",
    // Polygon
    42161: "0x625E7708f30cA75bfd92586e17077590C60eb4cD",
    // Arbitrum
    10: "0x625E7708f30cA75bfd92586e17077590C60eb4cD",
    // Optimism
    8453: "0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB"
    // Base
  },
  "aWETH": {
    1: "0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8",
    // Ethereum
    137: "0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8",
    // Polygon (WMATIC)
    42161: "0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8",
    // Arbitrum
    10: "0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8",
    // Optimism
    8453: "0xD4a0e0b9149BCee3C920d2E00b5dE09138fd8bb7"
    // Base
  },
  "aDAI": {
    1: "0x018008bfb33d285247A21d44E50697654f754e63",
    // Ethereum
    137: "0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE",
    // Polygon
    42161: "0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE",
    // Arbitrum
    10: "0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE",
    // Optimism
    8453: "0x50390975D942E83D661D4Bde43BF73B0ef27b426"
    // Base
  }
};
exports.AAVE_ATOKENS = AAVE_ATOKENS;
exports.AAVE_INFO = AAVE_INFO;
exports.AAVE_ORACLE = AAVE_ORACLE;
exports.AAVE_V3_DATA_PROVIDER = AAVE_V3_DATA_PROVIDER;
exports.AAVE_V3_POOL = AAVE_V3_POOL;
exports.HEALTH_FACTOR_LIQUIDATION_THRESHOLD = HEALTH_FACTOR_LIQUIDATION_THRESHOLD;
exports.HEALTH_FACTOR_SAFE_THRESHOLD = HEALTH_FACTOR_SAFE_THRESHOLD;
exports.HEALTH_FACTOR_WARNING_THRESHOLD = HEALTH_FACTOR_WARNING_THRESHOLD;
exports.InterestRateMode = InterestRateMode;
exports.UNISWAP_INFO = UNISWAP_INFO;
exports.UNISWAP_V2_FACTORY = UNISWAP_V2_FACTORY;
exports.UNISWAP_V2_ROUTER = UNISWAP_V2_ROUTER;
exports.UNISWAP_V3_FACTORY = UNISWAP_V3_FACTORY;
exports.UNISWAP_V3_ROUTER = UNISWAP_V3_ROUTER;
exports.UniswapV3FeeTier = UniswapV3FeeTier;
exports.calculateBorrowAPY = calculateBorrowAPY;
exports.calculateHealthFactor = calculateHealthFactor;
exports.calculateMaxBorrow = calculateMaxBorrow;
exports.calculateMinimumAmountOut = calculateMinimumAmountOut;
exports.calculatePriceImpact = calculatePriceImpact;
exports.calculateSupplyAPY = calculateSupplyAPY;
exports.getAaveAddresses = getAaveAddresses;
exports.getOptimalRoute = getOptimalRoute;
exports.getRiskLevel = getRiskLevel;
exports.getUniswapAddresses = getUniswapAddresses;
exports.getV3PoolAddress = getV3PoolAddress;
exports.hasLiquidity = hasLiquidity;
//# sourceMappingURL=protocols.cjs.map
