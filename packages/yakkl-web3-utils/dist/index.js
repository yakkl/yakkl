// src/address.ts
function isValidAddress(address) {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
function isContractAddress(address) {
  if (!isValidAddress(address)) return false;
  if (address.toLowerCase() === "0x0000000000000000000000000000000000000000") {
    return true;
  }
  const hasUpperCase = /[A-F]/.test(address.slice(2));
  const hasLowerCase = /[a-f]/.test(address.slice(2));
  return !hasUpperCase || !hasLowerCase;
}
function formatAddress(address, startChars = 6, endChars = 4) {
  if (!address) return "";
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}
function toChecksumAddress(address) {
  if (!isValidAddress(address)) {
    throw new Error("Invalid Ethereum address");
  }
  const addr = address.toLowerCase().replace("0x", "");
  const encoder = new TextEncoder();
  encoder.encode(addr);
  let checksumAddress = "0x";
  for (let i = 0; i < addr.length; i++) {
    const char = addr[i];
    if (parseInt(char, 16) >= 8) {
      checksumAddress += char.toUpperCase();
    } else {
      checksumAddress += char;
    }
  }
  return checksumAddress;
}
function isSameAddress(address1, address2) {
  if (!address1 || !address2) return false;
  return address1.toLowerCase() === address2.toLowerCase();
}
function getAddressType(address) {
  if (!isValidAddress(address)) return "invalid";
  if (isContractAddress(address)) return "contract";
  return "eoa";
}

// src/units.ts
var UNITS = {
  wei: 1n,
  kwei: 1000n,
  mwei: 1000000n,
  gwei: 1000000000n,
  szabo: 1000000000000n,
  finney: 1000000000000000n,
  ether: 1000000000000000000n
};
function fromWei(wei, unit = "ether") {
  const weiAmount = typeof wei === "string" ? BigInt(wei) : wei;
  const divisor = UNITS[unit];
  const wholePart = weiAmount / divisor;
  const remainder = weiAmount % divisor;
  if (remainder === 0n) {
    return wholePart.toString();
  }
  const decimalPart = remainder * 1000000n / divisor;
  const decimalStr = decimalPart.toString().padStart(6, "0").replace(/0+$/, "");
  return decimalStr ? `${wholePart}.${decimalStr}` : wholePart.toString();
}
function toWei(amount, unit = "ether") {
  const multiplier = UNITS[unit];
  if (typeof amount === "number") {
    amount = amount.toString();
  }
  const parts = amount.split(".");
  if (parts.length === 1) {
    return BigInt(parts[0]) * multiplier;
  }
  if (parts.length > 2) {
    throw new Error("Invalid number format");
  }
  const wholePart = BigInt(parts[0]) * multiplier;
  const decimalPart = parts[1];
  const decimalMultiplier = multiplier / 10n ** BigInt(decimalPart.length);
  const decimalValue = BigInt(decimalPart) * decimalMultiplier;
  return wholePart + decimalValue;
}
function formatUnits(wei, decimals = 18, displayDecimals = 4) {
  const weiAmount = typeof wei === "string" ? BigInt(wei) : wei;
  const divisor = 10n ** BigInt(decimals);
  const wholePart = weiAmount / divisor;
  const remainder = weiAmount % divisor;
  if (remainder === 0n) {
    return wholePart.toString();
  }
  const decimalDivisor = 10n ** BigInt(decimals - displayDecimals);
  const decimalPart = remainder / decimalDivisor;
  const decimalStr = decimalPart.toString().padStart(displayDecimals, "0").replace(/0+$/, "");
  return decimalStr ? `${wholePart}.${decimalStr}` : wholePart.toString();
}
function parseUnits(value, decimals = 18) {
  const multiplier = 10n ** BigInt(decimals);
  const parts = value.split(".");
  if (parts.length === 1) {
    return BigInt(parts[0]) * multiplier;
  }
  if (parts.length > 2) {
    throw new Error("Invalid number format");
  }
  const wholePart = BigInt(parts[0]) * multiplier;
  let decimalPart = parts[1];
  if (decimalPart.length > decimals) {
    decimalPart = decimalPart.slice(0, decimals);
  } else {
    decimalPart = decimalPart.padEnd(decimals, "0");
  }
  return wholePart + BigInt(decimalPart);
}
function formatWithCommas(value, separator = ",") {
  const str = value.toString();
  const parts = str.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return parts.join(".");
}

// src/gas.ts
function calculateGasCost(gasLimit, gasPrice) {
  const limit = typeof gasLimit === "number" ? BigInt(gasLimit) : gasLimit;
  return limit * gasPrice;
}
function estimateGasPriceLevels(baseGasPrice) {
  return {
    slow: baseGasPrice * 90n / 100n,
    // 90% of base
    standard: baseGasPrice,
    // 100% of base
    fast: baseGasPrice * 125n / 100n,
    // 125% of base
    instant: baseGasPrice * 150n / 100n
    // 150% of base
  };
}
function calculateEIP1559Fees(baseFee, priorityLevel = "standard") {
  const priorityFees = {
    slow: 1000000000n,
    // 1 gwei
    standard: 1500000000n,
    // 1.5 gwei
    fast: 2000000000n
    // 2 gwei
  };
  const maxPriorityFeePerGas = priorityFees[priorityLevel];
  const maxFeePerGas = baseFee * 2n + maxPriorityFeePerGas;
  return {
    maxFeePerGas,
    maxPriorityFeePerGas,
    baseFeePerGas: baseFee
  };
}
function formatGasPrice(gasPrice, unit = "gwei") {
  if (unit === "gwei") {
    const gwei = gasPrice / 1000000000n;
    const remainder = gasPrice % 1000000000n;
    if (remainder === 0n) {
      return `${gwei} gwei`;
    }
    const decimal = remainder * 100n / 1000000000n;
    return `${gwei}.${decimal.toString().padStart(2, "0")} gwei`;
  }
  const ether = gasPrice / 1000000000000000000n;
  return `${ether} ETH`;
}
function addGasBuffer(estimatedGas, bufferPercent = 10) {
  const gas = typeof estimatedGas === "number" ? BigInt(estimatedGas) : estimatedGas;
  const buffer = gas * BigInt(bufferPercent) / 100n;
  return gas + buffer;
}
function isReasonableGasPrice(gasPrice, maxGwei = 500) {
  const maxWei = BigInt(maxGwei) * 1000000000n;
  return gasPrice <= maxWei;
}
var STANDARD_GAS_LIMITS = {
  transfer: 21000n,
  // Standard ETH transfer
  erc20Transfer: 65000n,
  // ERC20 token transfer
  erc20Approve: 45000n,
  // ERC20 approval
  contractDeploy: 3000000n,
  // Contract deployment (varies widely)
  swap: 250000n,
  // DEX swap (estimate)
  nftMint: 150000n
  // NFT minting (estimate)
};
function getRecommendedGasLimit(txType, customLimit) {
  if (customLimit) return customLimit;
  return STANDARD_GAS_LIMITS[txType];
}

// src/index.ts
var VERSION = "0.1.0";

export { STANDARD_GAS_LIMITS, UNITS, VERSION, addGasBuffer, calculateEIP1559Fees, calculateGasCost, estimateGasPriceLevels, formatAddress, formatGasPrice, formatUnits, formatWithCommas, fromWei, getAddressType, getRecommendedGasLimit, isContractAddress, isReasonableGasPrice, isSameAddress, isValidAddress, parseUnits, toChecksumAddress, toWei };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map