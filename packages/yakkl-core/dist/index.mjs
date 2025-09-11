import { W as WalletEngine } from "./IntegrationAPI-DTOxywBx.mjs";
import { A, E, I, N, R, T } from "./IntegrationAPI-DTOxywBx.mjs";
import { D, L, a, M } from "./DiscoveryProtocol-Bno4a3vM.mjs";
import { EventEmitter } from "eventemitter3";
var StorageType = /* @__PURE__ */ ((StorageType2) => {
  StorageType2["LOCAL"] = "local";
  StorageType2["SESSION"] = "session";
  StorageType2["INDEXED_DB"] = "indexeddb";
  StorageType2["CHROME_LOCAL"] = "chrome_local";
  StorageType2["CHROME_SYNC"] = "chrome_sync";
  StorageType2["MEMORY"] = "memory";
  StorageType2["FILE"] = "file";
  return StorageType2;
})(StorageType || {});
var MessageType = /* @__PURE__ */ ((MessageType2) => {
  MessageType2["REQUEST"] = "request";
  MessageType2["RESPONSE"] = "response";
  MessageType2["ERROR"] = "error";
  MessageType2["EVENT"] = "event";
  MessageType2["BROADCAST"] = "broadcast";
  MessageType2["PING"] = "ping";
  MessageType2["PONG"] = "pong";
  MessageType2["SUBSCRIBE"] = "subscribe";
  MessageType2["UNSUBSCRIBE"] = "unsubscribe";
  MessageType2["STREAM_START"] = "stream_start";
  MessageType2["STREAM_DATA"] = "stream_data";
  MessageType2["STREAM_END"] = "stream_end";
  MessageType2["STREAM_ERROR"] = "stream_error";
  return MessageType2;
})(MessageType || {});
var StreamState = /* @__PURE__ */ ((StreamState2) => {
  StreamState2["IDLE"] = "idle";
  StreamState2["ACTIVE"] = "active";
  StreamState2["PAUSED"] = "paused";
  StreamState2["COMPLETED"] = "completed";
  StreamState2["ABORTED"] = "aborted";
  return StreamState2;
})(StreamState || {});
var LogLevel = /* @__PURE__ */ ((LogLevel2) => {
  LogLevel2[LogLevel2["TRACE"] = 0] = "TRACE";
  LogLevel2[LogLevel2["DEBUG"] = 1] = "DEBUG";
  LogLevel2[LogLevel2["INFO"] = 2] = "INFO";
  LogLevel2[LogLevel2["WARN"] = 3] = "WARN";
  LogLevel2[LogLevel2["ERROR"] = 4] = "ERROR";
  LogLevel2[LogLevel2["FATAL"] = 5] = "FATAL";
  LogLevel2[LogLevel2["SILENT"] = 6] = "SILENT";
  return LogLevel2;
})(LogLevel || {});
var AccountType = /* @__PURE__ */ ((AccountType2) => {
  AccountType2["IMPORTED"] = "imported";
  AccountType2["HD_WALLET"] = "hd_wallet";
  AccountType2["HARDWARE"] = "hardware";
  AccountType2["WATCH_ONLY"] = "watch_only";
  return AccountType2;
})(AccountType || {});
var ChainType = /* @__PURE__ */ ((ChainType2) => {
  ChainType2["EVM"] = "evm";
  ChainType2["BITCOIN"] = "bitcoin";
  ChainType2["SOLANA"] = "solana";
  ChainType2["COSMOS"] = "cosmos";
  ChainType2["POLKADOT"] = "polkadot";
  ChainType2["NEAR"] = "near";
  ChainType2["TRON"] = "tron";
  return ChainType2;
})(ChainType || {});
var TransactionCategory = /* @__PURE__ */ ((TransactionCategory2) => {
  TransactionCategory2["SEND"] = "send";
  TransactionCategory2["RECEIVE"] = "receive";
  TransactionCategory2["SWAP"] = "swap";
  TransactionCategory2["BRIDGE"] = "bridge";
  TransactionCategory2["CONTRACT_CALL"] = "contract_call";
  TransactionCategory2["TOKEN_TRANSFER"] = "token_transfer";
  TransactionCategory2["NFT_TRANSFER"] = "nft_transfer";
  TransactionCategory2["STAKE"] = "stake";
  TransactionCategory2["UNSTAKE"] = "unstake";
  TransactionCategory2["APPROVAL"] = "approval";
  return TransactionCategory2;
})(TransactionCategory || {});
var CacheEvictionPolicy = /* @__PURE__ */ ((CacheEvictionPolicy2) => {
  CacheEvictionPolicy2["LRU"] = "lru";
  CacheEvictionPolicy2["LFU"] = "lfu";
  CacheEvictionPolicy2["FIFO"] = "fifo";
  CacheEvictionPolicy2["TTL"] = "ttl";
  CacheEvictionPolicy2["SIZE"] = "size";
  return CacheEvictionPolicy2;
})(CacheEvictionPolicy || {});
var SystemTheme = /* @__PURE__ */ ((SystemTheme2) => {
  SystemTheme2["DARK"] = "dark";
  SystemTheme2["LIGHT"] = "light";
  SystemTheme2["SYSTEM"] = "system";
  return SystemTheme2;
})(SystemTheme || {});
var AccountTypeCategory = /* @__PURE__ */ ((AccountTypeCategory2) => {
  AccountTypeCategory2["PRIMARY"] = "primary";
  AccountTypeCategory2["SUB"] = "sub";
  AccountTypeCategory2["CONTRACT"] = "contract";
  AccountTypeCategory2["IMPORTED"] = "imported";
  return AccountTypeCategory2;
})(AccountTypeCategory || {});
var AccountTypeStatus = /* @__PURE__ */ ((AccountTypeStatus2) => {
  AccountTypeStatus2["ACTIVE"] = "active";
  AccountTypeStatus2["INACTIVE"] = "inactive";
  AccountTypeStatus2["DELETED"] = "deleted";
  return AccountTypeStatus2;
})(AccountTypeStatus || {});
var RegisteredType = /* @__PURE__ */ ((RegisteredType2) => {
  RegisteredType2["EXPLORER_MEMBER"] = "explorer_member";
  RegisteredType2["FOUNDING_MEMBER"] = "founding_member";
  RegisteredType2["EARLY_ADOPTER"] = "early_adopter";
  RegisteredType2["YAKKL_PRO"] = "yakkl_pro";
  RegisteredType2["YAKKL_PRO_PLUS"] = "yakkl_pro_plus";
  RegisteredType2["INSTITUTION"] = "institution";
  RegisteredType2["BETA"] = "beta";
  RegisteredType2["NONE"] = "none";
  return RegisteredType2;
})(RegisteredType || {});
var ChainId = /* @__PURE__ */ ((ChainId2) => {
  ChainId2[ChainId2["ETHEREUM"] = 1] = "ETHEREUM";
  ChainId2[ChainId2["GOERLI"] = 5] = "GOERLI";
  ChainId2[ChainId2["SEPOLIA"] = 11155111] = "SEPOLIA";
  ChainId2[ChainId2["POLYGON"] = 137] = "POLYGON";
  ChainId2[ChainId2["POLYGON_MUMBAI"] = 80001] = "POLYGON_MUMBAI";
  ChainId2[ChainId2["ARBITRUM"] = 42161] = "ARBITRUM";
  ChainId2[ChainId2["ARBITRUM_GOERLI"] = 421613] = "ARBITRUM_GOERLI";
  ChainId2[ChainId2["OPTIMISM"] = 10] = "OPTIMISM";
  ChainId2[ChainId2["OPTIMISM_GOERLI"] = 420] = "OPTIMISM_GOERLI";
  ChainId2[ChainId2["BASE"] = 8453] = "BASE";
  ChainId2[ChainId2["BASE_GOERLI"] = 84531] = "BASE_GOERLI";
  ChainId2[ChainId2["BSC"] = 56] = "BSC";
  ChainId2[ChainId2["BSC_TESTNET"] = 97] = "BSC_TESTNET";
  ChainId2[ChainId2["AVALANCHE"] = 43114] = "AVALANCHE";
  ChainId2[ChainId2["AVALANCHE_FUJI"] = 43113] = "AVALANCHE_FUJI";
  return ChainId2;
})(ChainId || {});
var TransactionStatus = /* @__PURE__ */ ((TransactionStatus2) => {
  TransactionStatus2["PENDING"] = "pending";
  TransactionStatus2["CONFIRMED"] = "confirmed";
  TransactionStatus2["FAILED"] = "failed";
  TransactionStatus2["DROPPED"] = "dropped";
  TransactionStatus2["REPLACED"] = "replaced";
  return TransactionStatus2;
})(TransactionStatus || {});
var SortDirection = /* @__PURE__ */ ((SortDirection2) => {
  SortDirection2["ASC"] = "asc";
  SortDirection2["DESC"] = "desc";
  return SortDirection2;
})(SortDirection || {});
var Status = /* @__PURE__ */ ((Status2) => {
  Status2["IDLE"] = "idle";
  Status2["LOADING"] = "loading";
  Status2["SUCCESS"] = "success";
  Status2["ERROR"] = "error";
  return Status2;
})(Status || {});
function isAddress(value) {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}
function isHexString(value) {
  return typeof value === "string" && /^0x[a-fA-F0-9]*$/.test(value);
}
function isTransactionHash(value) {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}
const CORE_VERSION = "0.1.0";
const ETH_BASE_EOA_GAS_UNITS = 21e3;
const ETH_BASE_SCA_GAS_UNITS = 45e3;
const ETH_BASE_SWAP_GAS_UNITS = 500000n;
const ETH_BASE_FORCANCEL_GAS_UNITS = ETH_BASE_EOA_GAS_UNITS * 3;
const GAS_PER_BLOB = 131072;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const WETH_ADDRESS_MAINNET = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const BASIS_POINTS_DIVISOR = 1e4;
const DEFAULT_DERIVED_PATH_ETH = "m/44'/60'/";
var EVMDenominations = /* @__PURE__ */ ((EVMDenominations2) => {
  EVMDenominations2["ETH"] = "ETH";
  EVMDenominations2["GWEI"] = "GWEI";
  EVMDenominations2["WEI"] = "WEI";
  return EVMDenominations2;
})(EVMDenominations || {});
var TokenStandard = /* @__PURE__ */ ((TokenStandard2) => {
  TokenStandard2["ERC20"] = "ERC20";
  TokenStandard2["ERC721"] = "ERC721";
  TokenStandard2["ERC1155"] = "ERC1155";
  TokenStandard2["ERC777"] = "ERC777";
  TokenStandard2["BEP20"] = "BEP20";
  TokenStandard2["SPL"] = "SPL";
  TokenStandard2["TRC20"] = "TRC20";
  return TokenStandard2;
})(TokenStandard || {});
var TransactionType = /* @__PURE__ */ ((TransactionType2) => {
  TransactionType2[TransactionType2["LEGACY"] = 0] = "LEGACY";
  TransactionType2[TransactionType2["EIP2930"] = 1] = "EIP2930";
  TransactionType2[TransactionType2["EIP1559"] = 2] = "EIP1559";
  return TransactionType2;
})(TransactionType || {});
const SECOND = 1e3;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY = 1e3;
const DEFAULT_BACKOFF_MULTIPLIER = 2;
const DEFAULT_RPC_TIMEOUT = 3e4;
const DEFAULT_HTTP_TIMEOUT = 6e4;
const STORAGE_VERSION = 1;
const NETWORK_NAMES = {
  1: "Ethereum Mainnet",
  5: "Goerli Testnet",
  11155111: "Sepolia Testnet",
  137: "Polygon",
  80001: "Polygon Mumbai",
  42161: "Arbitrum One",
  421613: "Arbitrum Goerli",
  10: "Optimism",
  420: "Optimism Goerli",
  8453: "Base",
  84531: "Base Goerli",
  56: "BSC",
  97: "BSC Testnet",
  43114: "Avalanche C-Chain",
  43113: "Avalanche Fuji"
};
const NATIVE_TOKEN_SYMBOLS = {
  1: "ETH",
  137: "MATIC",
  56: "BNB",
  43114: "AVAX",
  42161: "ETH",
  10: "ETH",
  8453: "ETH"
};
var RPCErrorCode = /* @__PURE__ */ ((RPCErrorCode2) => {
  RPCErrorCode2[RPCErrorCode2["INVALID_REQUEST"] = -32600] = "INVALID_REQUEST";
  RPCErrorCode2[RPCErrorCode2["METHOD_NOT_FOUND"] = -32601] = "METHOD_NOT_FOUND";
  RPCErrorCode2[RPCErrorCode2["INVALID_PARAMS"] = -32602] = "INVALID_PARAMS";
  RPCErrorCode2[RPCErrorCode2["INTERNAL_ERROR"] = -32603] = "INTERNAL_ERROR";
  RPCErrorCode2[RPCErrorCode2["PARSE_ERROR"] = -32700] = "PARSE_ERROR";
  RPCErrorCode2[RPCErrorCode2["USER_REJECTED"] = 4001] = "USER_REJECTED";
  RPCErrorCode2[RPCErrorCode2["UNAUTHORIZED"] = 4100] = "UNAUTHORIZED";
  RPCErrorCode2[RPCErrorCode2["UNSUPPORTED_METHOD"] = 4200] = "UNSUPPORTED_METHOD";
  RPCErrorCode2[RPCErrorCode2["DISCONNECTED"] = 4900] = "DISCONNECTED";
  RPCErrorCode2[RPCErrorCode2["CHAIN_DISCONNECTED"] = 4901] = "CHAIN_DISCONNECTED";
  return RPCErrorCode2;
})(RPCErrorCode || {});
const MIME_TYPES = {
  JSON: "application/json",
  FORM: "application/x-www-form-urlencoded",
  MULTIPART: "multipart/form-data",
  TEXT: "text/plain",
  HTML: "text/html"
};
const PATTERNS = {
  ETH_ADDRESS: /^0x[a-fA-F0-9]{40}$/,
  TRANSACTION_HASH: /^0x[a-fA-F0-9]{64}$/,
  HEX_STRING: /^0x[a-fA-F0-9]*$/,
  PRIVATE_KEY: /^0x[a-fA-F0-9]{64}$/,
  MNEMONIC_WORD: /^[a-z]+$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  IPFS_HASH: /^Qm[a-zA-Z0-9]{44}$/
};
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const SALT_ROUNDS = 10;
const PBKDF2_ITERATIONS = 1e5;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const CACHE_TTL = {
  PRICE: 60,
  // 1 minute for price data
  BALANCE: 30,
  // 30 seconds for balance data
  TRANSACTION: 300,
  // 5 minutes for transaction data
  METADATA: 3600,
  // 1 hour for metadata
  STATIC: 86400
  // 1 day for static data
};
var CurrencyCode = /* @__PURE__ */ ((CurrencyCode2) => {
  CurrencyCode2["USD"] = "USD";
  CurrencyCode2["EUR"] = "EUR";
  CurrencyCode2["GBP"] = "GBP";
  return CurrencyCode2;
})(CurrencyCode || {});
class BigNumber {
  constructor(value = null) {
    this._value = value;
  }
  // Getter for value
  get value() {
    return this._value;
  }
  // Setter for value
  set value(newValue) {
    this._value = newValue;
  }
  compare(other, decimals = 18) {
    const a2 = this.toBigInt(decimals);
    const b = BigNumber.from(other).toBigInt(decimals);
    if (a2 === null || b === null) {
      throw new Error("Cannot compare null values");
    }
    if (a2 < b) return -1;
    if (a2 > b) return 1;
    return 0;
  }
  // Type guard to check if value is BigNumber
  static isBigNumber(value) {
    return value instanceof BigNumber;
  }
  // Type guard to check if value is an object with hex property
  static isHexObject(value) {
    return typeof value === "object" && value !== null && "hex" in value && "type" in value;
  }
  // Method to convert the value to a number
  toNumber() {
    if (this._value === null) {
      return null;
    }
    if (typeof this._value === "string" || typeof this._value === "number") {
      return Number(this._value);
    }
    if (typeof this._value === "bigint") {
      return Number(this._value);
    }
    if (BigNumber.isBigNumber(this._value)) {
      return this._value.toNumber();
    }
    if (BigNumber.isHexObject(this._value)) {
      return Number(BigInt(this._value.hex));
    }
    return null;
  }
  // Method to convert the value to a bigint
  toBigInt(decimals = 18) {
    if (this._value === null) {
      return null;
    }
    if (typeof this._value === "string") {
      if (this._value.includes(".")) {
        const [integerPart, fractionalPart] = this._value.split(".");
        const factor = BigInt(10 ** decimals);
        return BigInt(integerPart) * factor + BigInt((fractionalPart + "0".repeat(decimals)).slice(0, decimals));
      }
      return BigInt(this._value);
    }
    if (typeof this._value === "number") {
      if (!Number.isInteger(this._value)) {
        const str = this._value.toString();
        const [integerPart, fractionalPart = ""] = str.split(".");
        const factor = BigInt(10 ** decimals);
        return BigInt(integerPart) * factor + BigInt((fractionalPart + "0".repeat(decimals)).slice(0, decimals));
      }
      return BigInt(this._value);
    }
    if (typeof this._value === "bigint") {
      return this._value;
    }
    if (BigNumber.isBigNumber(this._value)) {
      return this._value.toBigInt(decimals);
    }
    if (BigNumber.isHexObject(this._value)) {
      return BigInt(this._value.hex);
    }
    return null;
  }
  // Method to set the value from a BigNumberish type
  fromValue(value) {
    this._value = value;
  }
  // Method to get the maximum of two BigNumberish values
  max(other) {
    return BigNumber.max(this._value, other);
  }
  // Method to get the minimum of two BigNumberish values
  min(other) {
    return BigNumber.min(this._value, other);
  }
  // Method to add another BigNumberish value to this value
  add(other) {
    return BigNumber.add(this._value, other);
  }
  // Method to subtract another BigNumberish value from this value
  subtract(other) {
    return BigNumber.subtract(this._value, other);
  }
  // Alias for subtract
  sub(other) {
    return this.subtract(other);
  }
  // Method to divide this value by another BigNumberish value
  div(other) {
    return BigNumber.div(this._value, other);
  }
  // Method to multiply this value by another BigNumberish value
  mul(other) {
    return BigNumber.mul(this._value, other);
  }
  // Method to get the modulo of this value by another BigNumberish value
  mod(other) {
    return BigNumber.mod(this._value, other);
  }
  // Method to convert the value to a string
  toString() {
    if (typeof this._value === "string") {
      return this._value;
    }
    const bigintValue = this.toBigInt();
    if (bigintValue === null) {
      return "";
    }
    return bigintValue.toString();
  }
  // Method to convert the value to a hex string
  toHex(isEthereum = true) {
    if (this._value === null) {
      return "";
    }
    if (typeof this._value === "string") {
      return this._value;
    }
    const bigintValue = this.toBigInt();
    if (bigintValue === null) {
      return "";
    }
    let hexString = bigintValue.toString(16);
    if (isEthereum && hexString.length % 2 !== 0) {
      hexString = "0" + hexString;
    }
    return "0x" + hexString;
  }
  // Static method to create a BigNumber instance
  static from(value) {
    if (BigNumber.isHexObject(value)) {
      return new BigNumber(BigInt(value.hex));
    }
    return new BigNumber(value);
  }
  // Static method to convert a BigNumberish to a number
  static toNumber(value) {
    if (value === null || value === void 0) {
      return null;
    }
    try {
      if (typeof value === "string") {
        const num = Number(value);
        return isFinite(num) ? num : null;
      }
      if (typeof value === "number") {
        return isFinite(value) ? value : null;
      }
      if (typeof value === "bigint") {
        if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
          console.warn("BigInt value exceeds safe integer range:", value);
          return value > 0 ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
        }
        return Number(value);
      }
      if (BigNumber.isBigNumber(value)) {
        return value.toNumber();
      }
      if (BigNumber.isHexObject(value)) {
        return Number(BigInt(value.hex));
      }
    } catch (error) {
      console.error("Error converting to number:", error);
      return null;
    }
    return null;
  }
  // Static method to convert a BigNumberish to a bigint
  static toBigInt(value, decimals = 0) {
    if (value === null) {
      return null;
    }
    try {
      if (typeof value === "string") {
        if (value.includes(".")) {
          if (decimals > 0) {
            const [integerPart, fractionalPart] = value.split(".");
            const factor = BigInt(10 ** decimals);
            return BigInt(integerPart) * factor + BigInt((fractionalPart + "0".repeat(decimals)).slice(0, decimals));
          } else {
            const [integerPart] = value.split(".");
            return BigInt(integerPart || "0");
          }
        }
        return BigInt(value);
      }
      if (typeof value === "number") {
        if (decimals > 0 && !Number.isInteger(value)) {
          const str = value.toString();
          const [integerPart, fractionalPart = ""] = str.split(".");
          const factor = BigInt(10 ** decimals);
          return BigInt(integerPart) * factor + BigInt((fractionalPart + "0".repeat(decimals)).slice(0, decimals));
        }
        return BigInt(Math.floor(value));
      }
      if (typeof value === "bigint") {
        return value;
      }
      if (BigNumber.isBigNumber(value)) {
        return value.toBigInt(decimals);
      }
      if (BigNumber.isHexObject(value)) {
        return BigInt(value.hex);
      }
    } catch (error) {
      console.error("Error converting to BigInt:", error);
      return null;
    }
    return null;
  }
  // Static method to get the maximum of two BigNumberish values
  static max(a2, b) {
    const aBigInt = BigNumber.toBigInt(a2) ?? BigInt(0);
    const bBigInt = BigNumber.toBigInt(b) ?? BigInt(0);
    return new BigNumber(aBigInt > bBigInt ? aBigInt : bBigInt);
  }
  // Static method to get the minimum of two BigNumberish values
  static min(a2, b) {
    const aBigInt = BigNumber.toBigInt(a2) ?? BigInt(0);
    const bBigInt = BigNumber.toBigInt(b) ?? BigInt(0);
    return new BigNumber(aBigInt < bBigInt ? aBigInt : bBigInt);
  }
  // Static method to add two BigNumberish values
  static add(a2, b) {
    const aBigInt = BigNumber.toBigInt(a2) ?? BigInt(0);
    const bBigInt = BigNumber.toBigInt(b) ?? BigInt(0);
    return new BigNumber(aBigInt + bBigInt);
  }
  // Static method to subtract two BigNumberish values
  static subtract(a2, b) {
    const aBigInt = BigNumber.toBigInt(a2) ?? BigInt(0);
    const bBigInt = BigNumber.toBigInt(b) ?? BigInt(0);
    return new BigNumber(aBigInt - bBigInt);
  }
  // Alias for subtract
  static sub(a2, b) {
    return BigNumber.subtract(a2, b);
  }
  // Static method to divide two BigNumberish values
  static div(a2, b) {
    const aBigInt = BigNumber.toBigInt(a2) ?? BigInt(0);
    const bBigInt = BigNumber.toBigInt(b) ?? BigInt(1);
    return new BigNumber(aBigInt / bBigInt);
  }
  // Static method to multiply two BigNumberish values
  static mul(a2, b) {
    const aBigInt = BigNumber.toBigInt(a2) ?? BigInt(0);
    const bBigInt = BigNumber.toBigInt(b) ?? BigInt(0);
    return new BigNumber(aBigInt * bBigInt);
  }
  // Static method to get the modulo of two BigNumberish values
  static mod(a2, b) {
    const aBigInt = BigNumber.toBigInt(a2) ?? BigInt(0);
    const bBigInt = BigNumber.toBigInt(b) ?? BigInt(1);
    return new BigNumber(aBigInt % bBigInt);
  }
  // Static method to check if a value is zero
  static isZero(value) {
    const bigintValue = BigNumber.toBigInt(value);
    return bigintValue === BigInt(0);
  }
  // Static method to check if a value is negative
  static isNegative(value) {
    const bigintValue = BigNumber.toBigInt(value);
    return bigintValue !== null && bigintValue < BigInt(0);
  }
  // Static method to get the absolute value
  static abs(value) {
    const bigintValue = BigNumber.toBigInt(value) ?? BigInt(0);
    return new BigNumber(bigintValue < BigInt(0) ? -bigintValue : bigintValue);
  }
  // Static method to negate a value
  static negate(value) {
    const bigintValue = BigNumber.toBigInt(value) ?? BigInt(0);
    return new BigNumber(-bigintValue);
  }
  // Static method to calculate power
  static pow(base, exponent) {
    if (!Number.isInteger(exponent) || exponent < 0) {
      throw new Error("Exponent must be a non-negative integer");
    }
    const baseBigInt = BigNumber.toBigInt(base) ?? BigInt(0);
    return new BigNumber(baseBigInt ** BigInt(exponent));
  }
  // Ethereum-specific instance methods
  toWei() {
    let ethValue;
    if (typeof this._value === "number" || typeof this._value === "string" && this._value.includes(".")) {
      const valueString = this._value.toString();
      const [integerPart, fractionalPartRaw = ""] = valueString.split(".");
      const fractionalPart = fractionalPartRaw.padEnd(18, "0").slice(0, 18);
      ethValue = BigInt(integerPart + fractionalPart);
    } else {
      ethValue = BigNumber.toBigInt(this._value) ?? BigInt(0);
    }
    return new BigNumber(ethValue);
  }
  toGwei() {
    let ethValue;
    if (typeof this._value === "number" || typeof this._value === "string" && this._value.includes(".")) {
      const valueString = this._value.toString();
      const [integerPart, fractionalPartRaw = ""] = valueString.split(".");
      const fractionalPart = fractionalPartRaw.padEnd(9, "0").slice(0, 9);
      ethValue = BigInt(integerPart + fractionalPart);
    } else {
      ethValue = BigNumber.toBigInt(this._value) ?? BigInt(0);
    }
    return new BigNumber(ethValue);
  }
  toEther() {
    const weiValue = BigNumber.toBigInt(this._value) ?? BigInt(0);
    return new BigNumber(weiValue / BigInt("1000000000000000000"));
  }
  toEtherString() {
    const weiValue = BigNumber.toBigInt(this._value) ?? BigInt(0);
    const etherValue = weiValue / BigInt("1000000000000000000");
    const remainder = weiValue % BigInt("1000000000000000000");
    const fractionalPart = remainder.toString().padStart(18, "0").slice(0, 18);
    const etherString = `${etherValue}.${fractionalPart}`;
    return etherString;
  }
  // Ethereum-specific static methods  
  static fromEther(value) {
    if (value === null || value === void 0) {
      throw new Error("Value cannot be null or undefined");
    }
    let etherString;
    if (typeof value === "number" || typeof value === "string") {
      etherString = value.toString();
    } else if (typeof value === "bigint") {
      etherString = value.toString();
    } else if (value instanceof BigNumber) {
      etherString = value.toString();
    } else if (typeof value === "object" && "_hex" in value && "_isBigNumber" in value) {
      etherString = BigInt(value._hex).toString();
    } else {
      throw new Error("Unsupported type for BigNumberish value");
    }
    if (!etherString.includes(".")) {
      etherString += ".0";
    }
    const [integerPart, fractionalPart] = etherString.split(".");
    const fractionalPartPadded = (fractionalPart + "0".repeat(18)).slice(0, 18);
    const weiValue = BigInt(integerPart + fractionalPartPadded);
    return new BigNumber(weiValue);
  }
  static toWei(value) {
    let ethValue;
    if (typeof value === "number" || typeof value === "string" && value.includes(".")) {
      const valueString = value.toString();
      const [integerPart, fractionalPartRaw = ""] = valueString.split(".");
      const fractionalPart = fractionalPartRaw.padEnd(18, "0").slice(0, 18);
      ethValue = BigInt(integerPart + fractionalPart);
    } else {
      ethValue = BigNumber.toBigInt(value) ?? BigInt(0);
    }
    return new BigNumber(ethValue);
  }
  static toGwei(value) {
    let ethValue;
    if (typeof value === "number" || typeof value === "string" && value.includes(".")) {
      const valueString = value.toString();
      const [integerPart, fractionalPartRaw = ""] = valueString.split(".");
      const fractionalPart = fractionalPartRaw.padEnd(9, "0").slice(0, 9);
      ethValue = BigInt(integerPart + fractionalPart);
    } else {
      ethValue = BigNumber.toBigInt(value) ?? BigInt(0);
    }
    return new BigNumber(ethValue);
  }
  static toEther(value) {
    const weiValue = BigNumber.from(value).toBigInt() ?? BigInt(0);
    return new BigNumber(weiValue / BigInt("1000000000000000000"));
  }
  static fromGwei(value) {
    const gweiString = value.toString();
    const [integerPart, fractionalPart = ""] = gweiString.split(".");
    const fractionalPadded = fractionalPart.padEnd(9, "0").slice(0, 9);
    const weiValue = BigInt(integerPart + fractionalPadded);
    return new BigNumber(weiValue);
  }
  static toEtherString(value) {
    const weiValue = BigNumber.from(value).toBigInt() ?? BigInt(0);
    const etherValue = weiValue / BigInt("1000000000000000000");
    const remainder = weiValue % BigInt("1000000000000000000");
    const fractionalPart = remainder.toString().padStart(18, "0").slice(0, 18);
    const etherString = `${etherValue}.${fractionalPart}`;
    return etherString;
  }
  // Static method to create a BigNumber from a hex string
  static fromHex(hex) {
    if (typeof hex !== "string" || !/^0x[0-9a-fA-F]+$/.test(hex)) {
      throw new Error("Invalid hex string");
    }
    return new BigNumber(BigInt(hex));
  }
  // Instance method to convert the current value to fiat
  toFiat(price) {
    const etherValue = parseFloat(this.toEtherString());
    if (isNaN(etherValue)) {
      throw new Error("Invalid BigNumberish value");
    }
    return etherValue * price;
  }
  // Static toFiat method for compatibility  
  static toFiat(value, price) {
    const etherString = BigNumber.toEtherString(value);
    const etherValue = parseFloat(etherString);
    const priceNumber = typeof price === "number" ? price : Number(price?.toString() ?? 0);
    return etherValue * priceNumber;
  }
  // Static toFormattedFiat for compatibility
  static toFormattedFiat(value, price, currencyCode, locale = "en-US", decimalPlaces = 2) {
    const fiatValue = BigNumber.toFiat(value, price);
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    });
    return formatter.format(fiatValue);
  }
  // Instance method to convert the current value to formatted fiat
  toFormattedFiat(price, currencyCode, locale = "") {
    const fiatValue = this.toFiat(price);
    const formatter = new Intl.NumberFormat(locale || void 0, {
      style: "currency",
      currency: currencyCode
    });
    return formatter.format(fiatValue);
  }
  // Helper method to multiply a value (in ETH or token units) by price to get USD value
  // This handles decimal string values properly
  mulByPrice(price, decimals = 18) {
    const priceBN = BigNumber.from(price);
    const valueInSmallestUnit = this.toBigInt(decimals);
    if (valueInSmallestUnit === null) {
      throw new Error("Cannot convert value to bigint");
    }
    const priceInSmallestUnit = priceBN.toBigInt(decimals);
    if (priceInSmallestUnit === null) {
      throw new Error("Cannot convert price to bigint");
    }
    const result = valueInSmallestUnit * priceInSmallestUnit;
    const divisor = BigInt("1" + "0".repeat(decimals));
    const scaledResult = result / divisor;
    return new BigNumber(scaledResult);
  }
  // Convert from smallest unit (wei) to decimal string (ETH)
  static fromWei(weiValue, decimals = 18) {
    const wei = BigNumber.toBigInt(weiValue, 0);
    if (wei === null) return "0";
    const divisor = BigInt("1" + "0".repeat(decimals));
    const wholePart = wei / divisor;
    const fractionalPart = wei % divisor;
    const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
    const trimmedFractional = fractionalStr.replace(/0+$/, "");
    if (trimmedFractional === "") {
      return wholePart.toString();
    } else {
      return `${wholePart}.${trimmedFractional}`;
    }
  }
  // Convert current value from smallest unit to decimal string
  toDecimalString(decimals = 18) {
    const bigintValue = this.toBigInt(0);
    if (bigintValue === null) return "0";
    return BigNumber.fromWei(bigintValue, decimals);
  }
}
/*!
 *  decimal.js v10.6.0
 *  An arbitrary-precision Decimal type for JavaScript.
 *  https://github.com/MikeMcl/decimal.js
 *  Copyright (c) 2025 Michael Mclaughlin <M8ch88l@gmail.com>
 *  MIT Licence
 */
var EXP_LIMIT = 9e15, MAX_DIGITS = 1e9, NUMERALS = "0123456789abcdef", LN10 = "2.3025850929940456840179914546843642076011014886287729760333279009675726096773524802359972050895982983419677840422862486334095254650828067566662873690987816894829072083255546808437998948262331985283935053089653777326288461633662222876982198867465436674744042432743651550489343149393914796194044002221051017141748003688084012647080685567743216228355220114804663715659121373450747856947683463616792101806445070648000277502684916746550586856935673420670581136429224554405758925724208241314695689016758940256776311356919292033376587141660230105703089634572075440370847469940168269282808481184289314848524948644871927809676271275775397027668605952496716674183485704422507197965004714951050492214776567636938662976979522110718264549734772662425709429322582798502585509785265383207606726317164309505995087807523710333101197857547331541421808427543863591778117054309827482385045648019095610299291824318237525357709750539565187697510374970888692180205189339507238539205144634197265287286965110862571492198849978748873771345686209167058", PI = "3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095505822317253594081284811174502841027019385211055596446229489549303819644288109756659334461284756482337867831652712019091456485669234603486104543266482133936072602491412737245870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330572703657595919530921861173819326117931051185480744623799627495673518857527248912279381830119491298336733624406566430860213949463952247371907021798609437027705392171762931767523846748184676694051320005681271452635608277857713427577896091736371787214684409012249534301465495853710507922796892589235420199561121290219608640344181598136297747713099605187072113499999983729780499510597317328160963185950244594553469083026425223082533446850352619311881710100031378387528865875332083814206171776691473035982534904287554687311595628638823537875937519577818577805321712268066130019278766111959092164201989380952572010654858632789", DEFAULTS = {
  // These values must be integers within the stated ranges (inclusive).
  // Most of these values can be changed at run-time using the `Decimal.config` method.
  // The maximum number of significant digits of the result of a calculation or base conversion.
  // E.g. `Decimal.config({ precision: 20 });`
  precision: 20,
  // 1 to MAX_DIGITS
  // The rounding mode used when rounding to `precision`.
  //
  // ROUND_UP         0 Away from zero.
  // ROUND_DOWN       1 Towards zero.
  // ROUND_CEIL       2 Towards +Infinity.
  // ROUND_FLOOR      3 Towards -Infinity.
  // ROUND_HALF_UP    4 Towards nearest neighbour. If equidistant, up.
  // ROUND_HALF_DOWN  5 Towards nearest neighbour. If equidistant, down.
  // ROUND_HALF_EVEN  6 Towards nearest neighbour. If equidistant, towards even neighbour.
  // ROUND_HALF_CEIL  7 Towards nearest neighbour. If equidistant, towards +Infinity.
  // ROUND_HALF_FLOOR 8 Towards nearest neighbour. If equidistant, towards -Infinity.
  //
  // E.g.
  // `Decimal.rounding = 4;`
  // `Decimal.rounding = Decimal.ROUND_HALF_UP;`
  rounding: 4,
  // 0 to 8
  // The modulo mode used when calculating the modulus: a mod n.
  // The quotient (q = a / n) is calculated according to the corresponding rounding mode.
  // The remainder (r) is calculated as: r = a - n * q.
  //
  // UP         0 The remainder is positive if the dividend is negative, else is negative.
  // DOWN       1 The remainder has the same sign as the dividend (JavaScript %).
  // FLOOR      3 The remainder has the same sign as the divisor (Python %).
  // HALF_EVEN  6 The IEEE 754 remainder function.
  // EUCLID     9 Euclidian division. q = sign(n) * floor(a / abs(n)). Always positive.
  //
  // Truncated division (1), floored division (3), the IEEE 754 remainder (6), and Euclidian
  // division (9) are commonly used for the modulus operation. The other rounding modes can also
  // be used, but they may not give useful results.
  modulo: 1,
  // 0 to 9
  // The exponent value at and beneath which `toString` returns exponential notation.
  // JavaScript numbers: -7
  toExpNeg: -7,
  // 0 to -EXP_LIMIT
  // The exponent value at and above which `toString` returns exponential notation.
  // JavaScript numbers: 21
  toExpPos: 21,
  // 0 to EXP_LIMIT
  // The minimum exponent value, beneath which underflow to zero occurs.
  // JavaScript numbers: -324  (5e-324)
  minE: -EXP_LIMIT,
  // -1 to -EXP_LIMIT
  // The maximum exponent value, above which overflow to Infinity occurs.
  // JavaScript numbers: 308  (1.7976931348623157e+308)
  maxE: EXP_LIMIT,
  // 1 to EXP_LIMIT
  // Whether to use cryptographically-secure random number generation, if available.
  crypto: false
  // true/false
}, inexact, quadrant, external = true, decimalError = "[DecimalError] ", invalidArgument = decimalError + "Invalid argument: ", precisionLimitExceeded = decimalError + "Precision limit exceeded", cryptoUnavailable = decimalError + "crypto unavailable", tag = "[object Decimal]", mathfloor = Math.floor, mathpow = Math.pow, isBinary = /^0b([01]+(\.[01]*)?|\.[01]+)(p[+-]?\d+)?$/i, isHex = /^0x([0-9a-f]+(\.[0-9a-f]*)?|\.[0-9a-f]+)(p[+-]?\d+)?$/i, isOctal = /^0o([0-7]+(\.[0-7]*)?|\.[0-7]+)(p[+-]?\d+)?$/i, isDecimal = /^(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i, BASE = 1e7, LOG_BASE = 7, MAX_SAFE_INTEGER = 9007199254740991, LN10_PRECISION = LN10.length - 1, PI_PRECISION = PI.length - 1, P = { toStringTag: tag };
P.absoluteValue = P.abs = function() {
  var x = new this.constructor(this);
  if (x.s < 0) x.s = 1;
  return finalise(x);
};
P.ceil = function() {
  return finalise(new this.constructor(this), this.e + 1, 2);
};
P.clampedTo = P.clamp = function(min2, max2) {
  var k, x = this, Ctor = x.constructor;
  min2 = new Ctor(min2);
  max2 = new Ctor(max2);
  if (!min2.s || !max2.s) return new Ctor(NaN);
  if (min2.gt(max2)) throw Error(invalidArgument + max2);
  k = x.cmp(min2);
  return k < 0 ? min2 : x.cmp(max2) > 0 ? max2 : new Ctor(x);
};
P.comparedTo = P.cmp = function(y) {
  var i, j, xdL, ydL, x = this, xd = x.d, yd = (y = new x.constructor(y)).d, xs = x.s, ys = y.s;
  if (!xd || !yd) {
    return !xs || !ys ? NaN : xs !== ys ? xs : xd === yd ? 0 : !xd ^ xs < 0 ? 1 : -1;
  }
  if (!xd[0] || !yd[0]) return xd[0] ? xs : yd[0] ? -ys : 0;
  if (xs !== ys) return xs;
  if (x.e !== y.e) return x.e > y.e ^ xs < 0 ? 1 : -1;
  xdL = xd.length;
  ydL = yd.length;
  for (i = 0, j = xdL < ydL ? xdL : ydL; i < j; ++i) {
    if (xd[i] !== yd[i]) return xd[i] > yd[i] ^ xs < 0 ? 1 : -1;
  }
  return xdL === ydL ? 0 : xdL > ydL ^ xs < 0 ? 1 : -1;
};
P.cosine = P.cos = function() {
  var pr, rm, x = this, Ctor = x.constructor;
  if (!x.d) return new Ctor(NaN);
  if (!x.d[0]) return new Ctor(1);
  pr = Ctor.precision;
  rm = Ctor.rounding;
  Ctor.precision = pr + Math.max(x.e, x.sd()) + LOG_BASE;
  Ctor.rounding = 1;
  x = cosine(Ctor, toLessThanHalfPi(Ctor, x));
  Ctor.precision = pr;
  Ctor.rounding = rm;
  return finalise(quadrant == 2 || quadrant == 3 ? x.neg() : x, pr, rm, true);
};
P.cubeRoot = P.cbrt = function() {
  var e, m, n, r, rep, s, sd, t, t3, t3plusx, x = this, Ctor = x.constructor;
  if (!x.isFinite() || x.isZero()) return new Ctor(x);
  external = false;
  s = x.s * mathpow(x.s * x, 1 / 3);
  if (!s || Math.abs(s) == 1 / 0) {
    n = digitsToString(x.d);
    e = x.e;
    if (s = (e - n.length + 1) % 3) n += s == 1 || s == -2 ? "0" : "00";
    s = mathpow(n, 1 / 3);
    e = mathfloor((e + 1) / 3) - (e % 3 == (e < 0 ? -1 : 2));
    if (s == 1 / 0) {
      n = "5e" + e;
    } else {
      n = s.toExponential();
      n = n.slice(0, n.indexOf("e") + 1) + e;
    }
    r = new Ctor(n);
    r.s = x.s;
  } else {
    r = new Ctor(s.toString());
  }
  sd = (e = Ctor.precision) + 3;
  for (; ; ) {
    t = r;
    t3 = t.times(t).times(t);
    t3plusx = t3.plus(x);
    r = divide(t3plusx.plus(x).times(t), t3plusx.plus(t3), sd + 2, 1);
    if (digitsToString(t.d).slice(0, sd) === (n = digitsToString(r.d)).slice(0, sd)) {
      n = n.slice(sd - 3, sd + 1);
      if (n == "9999" || !rep && n == "4999") {
        if (!rep) {
          finalise(t, e + 1, 0);
          if (t.times(t).times(t).eq(x)) {
            r = t;
            break;
          }
        }
        sd += 4;
        rep = 1;
      } else {
        if (!+n || !+n.slice(1) && n.charAt(0) == "5") {
          finalise(r, e + 1, 1);
          m = !r.times(r).times(r).eq(x);
        }
        break;
      }
    }
  }
  external = true;
  return finalise(r, e, Ctor.rounding, m);
};
P.decimalPlaces = P.dp = function() {
  var w, d = this.d, n = NaN;
  if (d) {
    w = d.length - 1;
    n = (w - mathfloor(this.e / LOG_BASE)) * LOG_BASE;
    w = d[w];
    if (w) for (; w % 10 == 0; w /= 10) n--;
    if (n < 0) n = 0;
  }
  return n;
};
P.dividedBy = P.div = function(y) {
  return divide(this, new this.constructor(y));
};
P.dividedToIntegerBy = P.divToInt = function(y) {
  var x = this, Ctor = x.constructor;
  return finalise(divide(x, new Ctor(y), 0, 1, 1), Ctor.precision, Ctor.rounding);
};
P.equals = P.eq = function(y) {
  return this.cmp(y) === 0;
};
P.floor = function() {
  return finalise(new this.constructor(this), this.e + 1, 3);
};
P.greaterThan = P.gt = function(y) {
  return this.cmp(y) > 0;
};
P.greaterThanOrEqualTo = P.gte = function(y) {
  var k = this.cmp(y);
  return k == 1 || k === 0;
};
P.hyperbolicCosine = P.cosh = function() {
  var k, n, pr, rm, len, x = this, Ctor = x.constructor, one = new Ctor(1);
  if (!x.isFinite()) return new Ctor(x.s ? 1 / 0 : NaN);
  if (x.isZero()) return one;
  pr = Ctor.precision;
  rm = Ctor.rounding;
  Ctor.precision = pr + Math.max(x.e, x.sd()) + 4;
  Ctor.rounding = 1;
  len = x.d.length;
  if (len < 32) {
    k = Math.ceil(len / 3);
    n = (1 / tinyPow(4, k)).toString();
  } else {
    k = 16;
    n = "2.3283064365386962890625e-10";
  }
  x = taylorSeries(Ctor, 1, x.times(n), new Ctor(1), true);
  var cosh2_x, i = k, d8 = new Ctor(8);
  for (; i--; ) {
    cosh2_x = x.times(x);
    x = one.minus(cosh2_x.times(d8.minus(cosh2_x.times(d8))));
  }
  return finalise(x, Ctor.precision = pr, Ctor.rounding = rm, true);
};
P.hyperbolicSine = P.sinh = function() {
  var k, pr, rm, len, x = this, Ctor = x.constructor;
  if (!x.isFinite() || x.isZero()) return new Ctor(x);
  pr = Ctor.precision;
  rm = Ctor.rounding;
  Ctor.precision = pr + Math.max(x.e, x.sd()) + 4;
  Ctor.rounding = 1;
  len = x.d.length;
  if (len < 3) {
    x = taylorSeries(Ctor, 2, x, x, true);
  } else {
    k = 1.4 * Math.sqrt(len);
    k = k > 16 ? 16 : k | 0;
    x = x.times(1 / tinyPow(5, k));
    x = taylorSeries(Ctor, 2, x, x, true);
    var sinh2_x, d5 = new Ctor(5), d16 = new Ctor(16), d20 = new Ctor(20);
    for (; k--; ) {
      sinh2_x = x.times(x);
      x = x.times(d5.plus(sinh2_x.times(d16.times(sinh2_x).plus(d20))));
    }
  }
  Ctor.precision = pr;
  Ctor.rounding = rm;
  return finalise(x, pr, rm, true);
};
P.hyperbolicTangent = P.tanh = function() {
  var pr, rm, x = this, Ctor = x.constructor;
  if (!x.isFinite()) return new Ctor(x.s);
  if (x.isZero()) return new Ctor(x);
  pr = Ctor.precision;
  rm = Ctor.rounding;
  Ctor.precision = pr + 7;
  Ctor.rounding = 1;
  return divide(x.sinh(), x.cosh(), Ctor.precision = pr, Ctor.rounding = rm);
};
P.inverseCosine = P.acos = function() {
  var x = this, Ctor = x.constructor, k = x.abs().cmp(1), pr = Ctor.precision, rm = Ctor.rounding;
  if (k !== -1) {
    return k === 0 ? x.isNeg() ? getPi(Ctor, pr, rm) : new Ctor(0) : new Ctor(NaN);
  }
  if (x.isZero()) return getPi(Ctor, pr + 4, rm).times(0.5);
  Ctor.precision = pr + 6;
  Ctor.rounding = 1;
  x = new Ctor(1).minus(x).div(x.plus(1)).sqrt().atan();
  Ctor.precision = pr;
  Ctor.rounding = rm;
  return x.times(2);
};
P.inverseHyperbolicCosine = P.acosh = function() {
  var pr, rm, x = this, Ctor = x.constructor;
  if (x.lte(1)) return new Ctor(x.eq(1) ? 0 : NaN);
  if (!x.isFinite()) return new Ctor(x);
  pr = Ctor.precision;
  rm = Ctor.rounding;
  Ctor.precision = pr + Math.max(Math.abs(x.e), x.sd()) + 4;
  Ctor.rounding = 1;
  external = false;
  x = x.times(x).minus(1).sqrt().plus(x);
  external = true;
  Ctor.precision = pr;
  Ctor.rounding = rm;
  return x.ln();
};
P.inverseHyperbolicSine = P.asinh = function() {
  var pr, rm, x = this, Ctor = x.constructor;
  if (!x.isFinite() || x.isZero()) return new Ctor(x);
  pr = Ctor.precision;
  rm = Ctor.rounding;
  Ctor.precision = pr + 2 * Math.max(Math.abs(x.e), x.sd()) + 6;
  Ctor.rounding = 1;
  external = false;
  x = x.times(x).plus(1).sqrt().plus(x);
  external = true;
  Ctor.precision = pr;
  Ctor.rounding = rm;
  return x.ln();
};
P.inverseHyperbolicTangent = P.atanh = function() {
  var pr, rm, wpr, xsd, x = this, Ctor = x.constructor;
  if (!x.isFinite()) return new Ctor(NaN);
  if (x.e >= 0) return new Ctor(x.abs().eq(1) ? x.s / 0 : x.isZero() ? x : NaN);
  pr = Ctor.precision;
  rm = Ctor.rounding;
  xsd = x.sd();
  if (Math.max(xsd, pr) < 2 * -x.e - 1) return finalise(new Ctor(x), pr, rm, true);
  Ctor.precision = wpr = xsd - x.e;
  x = divide(x.plus(1), new Ctor(1).minus(x), wpr + pr, 1);
  Ctor.precision = pr + 4;
  Ctor.rounding = 1;
  x = x.ln();
  Ctor.precision = pr;
  Ctor.rounding = rm;
  return x.times(0.5);
};
P.inverseSine = P.asin = function() {
  var halfPi, k, pr, rm, x = this, Ctor = x.constructor;
  if (x.isZero()) return new Ctor(x);
  k = x.abs().cmp(1);
  pr = Ctor.precision;
  rm = Ctor.rounding;
  if (k !== -1) {
    if (k === 0) {
      halfPi = getPi(Ctor, pr + 4, rm).times(0.5);
      halfPi.s = x.s;
      return halfPi;
    }
    return new Ctor(NaN);
  }
  Ctor.precision = pr + 6;
  Ctor.rounding = 1;
  x = x.div(new Ctor(1).minus(x.times(x)).sqrt().plus(1)).atan();
  Ctor.precision = pr;
  Ctor.rounding = rm;
  return x.times(2);
};
P.inverseTangent = P.atan = function() {
  var i, j, k, n, px, t, r, wpr, x2, x = this, Ctor = x.constructor, pr = Ctor.precision, rm = Ctor.rounding;
  if (!x.isFinite()) {
    if (!x.s) return new Ctor(NaN);
    if (pr + 4 <= PI_PRECISION) {
      r = getPi(Ctor, pr + 4, rm).times(0.5);
      r.s = x.s;
      return r;
    }
  } else if (x.isZero()) {
    return new Ctor(x);
  } else if (x.abs().eq(1) && pr + 4 <= PI_PRECISION) {
    r = getPi(Ctor, pr + 4, rm).times(0.25);
    r.s = x.s;
    return r;
  }
  Ctor.precision = wpr = pr + 10;
  Ctor.rounding = 1;
  k = Math.min(28, wpr / LOG_BASE + 2 | 0);
  for (i = k; i; --i) x = x.div(x.times(x).plus(1).sqrt().plus(1));
  external = false;
  j = Math.ceil(wpr / LOG_BASE);
  n = 1;
  x2 = x.times(x);
  r = new Ctor(x);
  px = x;
  for (; i !== -1; ) {
    px = px.times(x2);
    t = r.minus(px.div(n += 2));
    px = px.times(x2);
    r = t.plus(px.div(n += 2));
    if (r.d[j] !== void 0) for (i = j; r.d[i] === t.d[i] && i--; ) ;
  }
  if (k) r = r.times(2 << k - 1);
  external = true;
  return finalise(r, Ctor.precision = pr, Ctor.rounding = rm, true);
};
P.isFinite = function() {
  return !!this.d;
};
P.isInteger = P.isInt = function() {
  return !!this.d && mathfloor(this.e / LOG_BASE) > this.d.length - 2;
};
P.isNaN = function() {
  return !this.s;
};
P.isNegative = P.isNeg = function() {
  return this.s < 0;
};
P.isPositive = P.isPos = function() {
  return this.s > 0;
};
P.isZero = function() {
  return !!this.d && this.d[0] === 0;
};
P.lessThan = P.lt = function(y) {
  return this.cmp(y) < 0;
};
P.lessThanOrEqualTo = P.lte = function(y) {
  return this.cmp(y) < 1;
};
P.logarithm = P.log = function(base) {
  var isBase10, d, denominator, k, inf, num, sd, r, arg = this, Ctor = arg.constructor, pr = Ctor.precision, rm = Ctor.rounding, guard = 5;
  if (base == null) {
    base = new Ctor(10);
    isBase10 = true;
  } else {
    base = new Ctor(base);
    d = base.d;
    if (base.s < 0 || !d || !d[0] || base.eq(1)) return new Ctor(NaN);
    isBase10 = base.eq(10);
  }
  d = arg.d;
  if (arg.s < 0 || !d || !d[0] || arg.eq(1)) {
    return new Ctor(d && !d[0] ? -1 / 0 : arg.s != 1 ? NaN : d ? 0 : 1 / 0);
  }
  if (isBase10) {
    if (d.length > 1) {
      inf = true;
    } else {
      for (k = d[0]; k % 10 === 0; ) k /= 10;
      inf = k !== 1;
    }
  }
  external = false;
  sd = pr + guard;
  num = naturalLogarithm(arg, sd);
  denominator = isBase10 ? getLn10(Ctor, sd + 10) : naturalLogarithm(base, sd);
  r = divide(num, denominator, sd, 1);
  if (checkRoundingDigits(r.d, k = pr, rm)) {
    do {
      sd += 10;
      num = naturalLogarithm(arg, sd);
      denominator = isBase10 ? getLn10(Ctor, sd + 10) : naturalLogarithm(base, sd);
      r = divide(num, denominator, sd, 1);
      if (!inf) {
        if (+digitsToString(r.d).slice(k + 1, k + 15) + 1 == 1e14) {
          r = finalise(r, pr + 1, 0);
        }
        break;
      }
    } while (checkRoundingDigits(r.d, k += 10, rm));
  }
  external = true;
  return finalise(r, pr, rm);
};
P.minus = P.sub = function(y) {
  var d, e, i, j, k, len, pr, rm, xd, xe, xLTy, yd, x = this, Ctor = x.constructor;
  y = new Ctor(y);
  if (!x.d || !y.d) {
    if (!x.s || !y.s) y = new Ctor(NaN);
    else if (x.d) y.s = -y.s;
    else y = new Ctor(y.d || x.s !== y.s ? x : NaN);
    return y;
  }
  if (x.s != y.s) {
    y.s = -y.s;
    return x.plus(y);
  }
  xd = x.d;
  yd = y.d;
  pr = Ctor.precision;
  rm = Ctor.rounding;
  if (!xd[0] || !yd[0]) {
    if (yd[0]) y.s = -y.s;
    else if (xd[0]) y = new Ctor(x);
    else return new Ctor(rm === 3 ? -0 : 0);
    return external ? finalise(y, pr, rm) : y;
  }
  e = mathfloor(y.e / LOG_BASE);
  xe = mathfloor(x.e / LOG_BASE);
  xd = xd.slice();
  k = xe - e;
  if (k) {
    xLTy = k < 0;
    if (xLTy) {
      d = xd;
      k = -k;
      len = yd.length;
    } else {
      d = yd;
      e = xe;
      len = xd.length;
    }
    i = Math.max(Math.ceil(pr / LOG_BASE), len) + 2;
    if (k > i) {
      k = i;
      d.length = 1;
    }
    d.reverse();
    for (i = k; i--; ) d.push(0);
    d.reverse();
  } else {
    i = xd.length;
    len = yd.length;
    xLTy = i < len;
    if (xLTy) len = i;
    for (i = 0; i < len; i++) {
      if (xd[i] != yd[i]) {
        xLTy = xd[i] < yd[i];
        break;
      }
    }
    k = 0;
  }
  if (xLTy) {
    d = xd;
    xd = yd;
    yd = d;
    y.s = -y.s;
  }
  len = xd.length;
  for (i = yd.length - len; i > 0; --i) xd[len++] = 0;
  for (i = yd.length; i > k; ) {
    if (xd[--i] < yd[i]) {
      for (j = i; j && xd[--j] === 0; ) xd[j] = BASE - 1;
      --xd[j];
      xd[i] += BASE;
    }
    xd[i] -= yd[i];
  }
  for (; xd[--len] === 0; ) xd.pop();
  for (; xd[0] === 0; xd.shift()) --e;
  if (!xd[0]) return new Ctor(rm === 3 ? -0 : 0);
  y.d = xd;
  y.e = getBase10Exponent(xd, e);
  return external ? finalise(y, pr, rm) : y;
};
P.modulo = P.mod = function(y) {
  var q, x = this, Ctor = x.constructor;
  y = new Ctor(y);
  if (!x.d || !y.s || y.d && !y.d[0]) return new Ctor(NaN);
  if (!y.d || x.d && !x.d[0]) {
    return finalise(new Ctor(x), Ctor.precision, Ctor.rounding);
  }
  external = false;
  if (Ctor.modulo == 9) {
    q = divide(x, y.abs(), 0, 3, 1);
    q.s *= y.s;
  } else {
    q = divide(x, y, 0, Ctor.modulo, 1);
  }
  q = q.times(y);
  external = true;
  return x.minus(q);
};
P.naturalExponential = P.exp = function() {
  return naturalExponential(this);
};
P.naturalLogarithm = P.ln = function() {
  return naturalLogarithm(this);
};
P.negated = P.neg = function() {
  var x = new this.constructor(this);
  x.s = -x.s;
  return finalise(x);
};
P.plus = P.add = function(y) {
  var carry, d, e, i, k, len, pr, rm, xd, yd, x = this, Ctor = x.constructor;
  y = new Ctor(y);
  if (!x.d || !y.d) {
    if (!x.s || !y.s) y = new Ctor(NaN);
    else if (!x.d) y = new Ctor(y.d || x.s === y.s ? x : NaN);
    return y;
  }
  if (x.s != y.s) {
    y.s = -y.s;
    return x.minus(y);
  }
  xd = x.d;
  yd = y.d;
  pr = Ctor.precision;
  rm = Ctor.rounding;
  if (!xd[0] || !yd[0]) {
    if (!yd[0]) y = new Ctor(x);
    return external ? finalise(y, pr, rm) : y;
  }
  k = mathfloor(x.e / LOG_BASE);
  e = mathfloor(y.e / LOG_BASE);
  xd = xd.slice();
  i = k - e;
  if (i) {
    if (i < 0) {
      d = xd;
      i = -i;
      len = yd.length;
    } else {
      d = yd;
      e = k;
      len = xd.length;
    }
    k = Math.ceil(pr / LOG_BASE);
    len = k > len ? k + 1 : len + 1;
    if (i > len) {
      i = len;
      d.length = 1;
    }
    d.reverse();
    for (; i--; ) d.push(0);
    d.reverse();
  }
  len = xd.length;
  i = yd.length;
  if (len - i < 0) {
    i = len;
    d = yd;
    yd = xd;
    xd = d;
  }
  for (carry = 0; i; ) {
    carry = (xd[--i] = xd[i] + yd[i] + carry) / BASE | 0;
    xd[i] %= BASE;
  }
  if (carry) {
    xd.unshift(carry);
    ++e;
  }
  for (len = xd.length; xd[--len] == 0; ) xd.pop();
  y.d = xd;
  y.e = getBase10Exponent(xd, e);
  return external ? finalise(y, pr, rm) : y;
};
P.precision = P.sd = function(z) {
  var k, x = this;
  if (z !== void 0 && z !== !!z && z !== 1 && z !== 0) throw Error(invalidArgument + z);
  if (x.d) {
    k = getPrecision(x.d);
    if (z && x.e + 1 > k) k = x.e + 1;
  } else {
    k = NaN;
  }
  return k;
};
P.round = function() {
  var x = this, Ctor = x.constructor;
  return finalise(new Ctor(x), x.e + 1, Ctor.rounding);
};
P.sine = P.sin = function() {
  var pr, rm, x = this, Ctor = x.constructor;
  if (!x.isFinite()) return new Ctor(NaN);
  if (x.isZero()) return new Ctor(x);
  pr = Ctor.precision;
  rm = Ctor.rounding;
  Ctor.precision = pr + Math.max(x.e, x.sd()) + LOG_BASE;
  Ctor.rounding = 1;
  x = sine(Ctor, toLessThanHalfPi(Ctor, x));
  Ctor.precision = pr;
  Ctor.rounding = rm;
  return finalise(quadrant > 2 ? x.neg() : x, pr, rm, true);
};
P.squareRoot = P.sqrt = function() {
  var m, n, sd, r, rep, t, x = this, d = x.d, e = x.e, s = x.s, Ctor = x.constructor;
  if (s !== 1 || !d || !d[0]) {
    return new Ctor(!s || s < 0 && (!d || d[0]) ? NaN : d ? x : 1 / 0);
  }
  external = false;
  s = Math.sqrt(+x);
  if (s == 0 || s == 1 / 0) {
    n = digitsToString(d);
    if ((n.length + e) % 2 == 0) n += "0";
    s = Math.sqrt(n);
    e = mathfloor((e + 1) / 2) - (e < 0 || e % 2);
    if (s == 1 / 0) {
      n = "5e" + e;
    } else {
      n = s.toExponential();
      n = n.slice(0, n.indexOf("e") + 1) + e;
    }
    r = new Ctor(n);
  } else {
    r = new Ctor(s.toString());
  }
  sd = (e = Ctor.precision) + 3;
  for (; ; ) {
    t = r;
    r = t.plus(divide(x, t, sd + 2, 1)).times(0.5);
    if (digitsToString(t.d).slice(0, sd) === (n = digitsToString(r.d)).slice(0, sd)) {
      n = n.slice(sd - 3, sd + 1);
      if (n == "9999" || !rep && n == "4999") {
        if (!rep) {
          finalise(t, e + 1, 0);
          if (t.times(t).eq(x)) {
            r = t;
            break;
          }
        }
        sd += 4;
        rep = 1;
      } else {
        if (!+n || !+n.slice(1) && n.charAt(0) == "5") {
          finalise(r, e + 1, 1);
          m = !r.times(r).eq(x);
        }
        break;
      }
    }
  }
  external = true;
  return finalise(r, e, Ctor.rounding, m);
};
P.tangent = P.tan = function() {
  var pr, rm, x = this, Ctor = x.constructor;
  if (!x.isFinite()) return new Ctor(NaN);
  if (x.isZero()) return new Ctor(x);
  pr = Ctor.precision;
  rm = Ctor.rounding;
  Ctor.precision = pr + 10;
  Ctor.rounding = 1;
  x = x.sin();
  x.s = 1;
  x = divide(x, new Ctor(1).minus(x.times(x)).sqrt(), pr + 10, 0);
  Ctor.precision = pr;
  Ctor.rounding = rm;
  return finalise(quadrant == 2 || quadrant == 4 ? x.neg() : x, pr, rm, true);
};
P.times = P.mul = function(y) {
  var carry, e, i, k, r, rL, t, xdL, ydL, x = this, Ctor = x.constructor, xd = x.d, yd = (y = new Ctor(y)).d;
  y.s *= x.s;
  if (!xd || !xd[0] || !yd || !yd[0]) {
    return new Ctor(!y.s || xd && !xd[0] && !yd || yd && !yd[0] && !xd ? NaN : !xd || !yd ? y.s / 0 : y.s * 0);
  }
  e = mathfloor(x.e / LOG_BASE) + mathfloor(y.e / LOG_BASE);
  xdL = xd.length;
  ydL = yd.length;
  if (xdL < ydL) {
    r = xd;
    xd = yd;
    yd = r;
    rL = xdL;
    xdL = ydL;
    ydL = rL;
  }
  r = [];
  rL = xdL + ydL;
  for (i = rL; i--; ) r.push(0);
  for (i = ydL; --i >= 0; ) {
    carry = 0;
    for (k = xdL + i; k > i; ) {
      t = r[k] + yd[i] * xd[k - i - 1] + carry;
      r[k--] = t % BASE | 0;
      carry = t / BASE | 0;
    }
    r[k] = (r[k] + carry) % BASE | 0;
  }
  for (; !r[--rL]; ) r.pop();
  if (carry) ++e;
  else r.shift();
  y.d = r;
  y.e = getBase10Exponent(r, e);
  return external ? finalise(y, Ctor.precision, Ctor.rounding) : y;
};
P.toBinary = function(sd, rm) {
  return toStringBinary(this, 2, sd, rm);
};
P.toDecimalPlaces = P.toDP = function(dp, rm) {
  var x = this, Ctor = x.constructor;
  x = new Ctor(x);
  if (dp === void 0) return x;
  checkInt32(dp, 0, MAX_DIGITS);
  if (rm === void 0) rm = Ctor.rounding;
  else checkInt32(rm, 0, 8);
  return finalise(x, dp + x.e + 1, rm);
};
P.toExponential = function(dp, rm) {
  var str, x = this, Ctor = x.constructor;
  if (dp === void 0) {
    str = finiteToString(x, true);
  } else {
    checkInt32(dp, 0, MAX_DIGITS);
    if (rm === void 0) rm = Ctor.rounding;
    else checkInt32(rm, 0, 8);
    x = finalise(new Ctor(x), dp + 1, rm);
    str = finiteToString(x, true, dp + 1);
  }
  return x.isNeg() && !x.isZero() ? "-" + str : str;
};
P.toFixed = function(dp, rm) {
  var str, y, x = this, Ctor = x.constructor;
  if (dp === void 0) {
    str = finiteToString(x);
  } else {
    checkInt32(dp, 0, MAX_DIGITS);
    if (rm === void 0) rm = Ctor.rounding;
    else checkInt32(rm, 0, 8);
    y = finalise(new Ctor(x), dp + x.e + 1, rm);
    str = finiteToString(y, false, dp + y.e + 1);
  }
  return x.isNeg() && !x.isZero() ? "-" + str : str;
};
P.toFraction = function(maxD) {
  var d, d0, d1, d2, e, k, n, n0, n1, pr, q, r, x = this, xd = x.d, Ctor = x.constructor;
  if (!xd) return new Ctor(x);
  n1 = d0 = new Ctor(1);
  d1 = n0 = new Ctor(0);
  d = new Ctor(d1);
  e = d.e = getPrecision(xd) - x.e - 1;
  k = e % LOG_BASE;
  d.d[0] = mathpow(10, k < 0 ? LOG_BASE + k : k);
  if (maxD == null) {
    maxD = e > 0 ? d : n1;
  } else {
    n = new Ctor(maxD);
    if (!n.isInt() || n.lt(n1)) throw Error(invalidArgument + n);
    maxD = n.gt(d) ? e > 0 ? d : n1 : n;
  }
  external = false;
  n = new Ctor(digitsToString(xd));
  pr = Ctor.precision;
  Ctor.precision = e = xd.length * LOG_BASE * 2;
  for (; ; ) {
    q = divide(n, d, 0, 1, 1);
    d2 = d0.plus(q.times(d1));
    if (d2.cmp(maxD) == 1) break;
    d0 = d1;
    d1 = d2;
    d2 = n1;
    n1 = n0.plus(q.times(d2));
    n0 = d2;
    d2 = d;
    d = n.minus(q.times(d2));
    n = d2;
  }
  d2 = divide(maxD.minus(d0), d1, 0, 1, 1);
  n0 = n0.plus(d2.times(n1));
  d0 = d0.plus(d2.times(d1));
  n0.s = n1.s = x.s;
  r = divide(n1, d1, e, 1).minus(x).abs().cmp(divide(n0, d0, e, 1).minus(x).abs()) < 1 ? [n1, d1] : [n0, d0];
  Ctor.precision = pr;
  external = true;
  return r;
};
P.toHexadecimal = P.toHex = function(sd, rm) {
  return toStringBinary(this, 16, sd, rm);
};
P.toNearest = function(y, rm) {
  var x = this, Ctor = x.constructor;
  x = new Ctor(x);
  if (y == null) {
    if (!x.d) return x;
    y = new Ctor(1);
    rm = Ctor.rounding;
  } else {
    y = new Ctor(y);
    if (rm === void 0) {
      rm = Ctor.rounding;
    } else {
      checkInt32(rm, 0, 8);
    }
    if (!x.d) return y.s ? x : y;
    if (!y.d) {
      if (y.s) y.s = x.s;
      return y;
    }
  }
  if (y.d[0]) {
    external = false;
    x = divide(x, y, 0, rm, 1).times(y);
    external = true;
    finalise(x);
  } else {
    y.s = x.s;
    x = y;
  }
  return x;
};
P.toNumber = function() {
  return +this;
};
P.toOctal = function(sd, rm) {
  return toStringBinary(this, 8, sd, rm);
};
P.toPower = P.pow = function(y) {
  var e, k, pr, r, rm, s, x = this, Ctor = x.constructor, yn = +(y = new Ctor(y));
  if (!x.d || !y.d || !x.d[0] || !y.d[0]) return new Ctor(mathpow(+x, yn));
  x = new Ctor(x);
  if (x.eq(1)) return x;
  pr = Ctor.precision;
  rm = Ctor.rounding;
  if (y.eq(1)) return finalise(x, pr, rm);
  e = mathfloor(y.e / LOG_BASE);
  if (e >= y.d.length - 1 && (k = yn < 0 ? -yn : yn) <= MAX_SAFE_INTEGER) {
    r = intPow(Ctor, x, k, pr);
    return y.s < 0 ? new Ctor(1).div(r) : finalise(r, pr, rm);
  }
  s = x.s;
  if (s < 0) {
    if (e < y.d.length - 1) return new Ctor(NaN);
    if ((y.d[e] & 1) == 0) s = 1;
    if (x.e == 0 && x.d[0] == 1 && x.d.length == 1) {
      x.s = s;
      return x;
    }
  }
  k = mathpow(+x, yn);
  e = k == 0 || !isFinite(k) ? mathfloor(yn * (Math.log("0." + digitsToString(x.d)) / Math.LN10 + x.e + 1)) : new Ctor(k + "").e;
  if (e > Ctor.maxE + 1 || e < Ctor.minE - 1) return new Ctor(e > 0 ? s / 0 : 0);
  external = false;
  Ctor.rounding = x.s = 1;
  k = Math.min(12, (e + "").length);
  r = naturalExponential(y.times(naturalLogarithm(x, pr + k)), pr);
  if (r.d) {
    r = finalise(r, pr + 5, 1);
    if (checkRoundingDigits(r.d, pr, rm)) {
      e = pr + 10;
      r = finalise(naturalExponential(y.times(naturalLogarithm(x, e + k)), e), e + 5, 1);
      if (+digitsToString(r.d).slice(pr + 1, pr + 15) + 1 == 1e14) {
        r = finalise(r, pr + 1, 0);
      }
    }
  }
  r.s = s;
  external = true;
  Ctor.rounding = rm;
  return finalise(r, pr, rm);
};
P.toPrecision = function(sd, rm) {
  var str, x = this, Ctor = x.constructor;
  if (sd === void 0) {
    str = finiteToString(x, x.e <= Ctor.toExpNeg || x.e >= Ctor.toExpPos);
  } else {
    checkInt32(sd, 1, MAX_DIGITS);
    if (rm === void 0) rm = Ctor.rounding;
    else checkInt32(rm, 0, 8);
    x = finalise(new Ctor(x), sd, rm);
    str = finiteToString(x, sd <= x.e || x.e <= Ctor.toExpNeg, sd);
  }
  return x.isNeg() && !x.isZero() ? "-" + str : str;
};
P.toSignificantDigits = P.toSD = function(sd, rm) {
  var x = this, Ctor = x.constructor;
  if (sd === void 0) {
    sd = Ctor.precision;
    rm = Ctor.rounding;
  } else {
    checkInt32(sd, 1, MAX_DIGITS);
    if (rm === void 0) rm = Ctor.rounding;
    else checkInt32(rm, 0, 8);
  }
  return finalise(new Ctor(x), sd, rm);
};
P.toString = function() {
  var x = this, Ctor = x.constructor, str = finiteToString(x, x.e <= Ctor.toExpNeg || x.e >= Ctor.toExpPos);
  return x.isNeg() && !x.isZero() ? "-" + str : str;
};
P.truncated = P.trunc = function() {
  return finalise(new this.constructor(this), this.e + 1, 1);
};
P.valueOf = P.toJSON = function() {
  var x = this, Ctor = x.constructor, str = finiteToString(x, x.e <= Ctor.toExpNeg || x.e >= Ctor.toExpPos);
  return x.isNeg() ? "-" + str : str;
};
function digitsToString(d) {
  var i, k, ws, indexOfLastWord = d.length - 1, str = "", w = d[0];
  if (indexOfLastWord > 0) {
    str += w;
    for (i = 1; i < indexOfLastWord; i++) {
      ws = d[i] + "";
      k = LOG_BASE - ws.length;
      if (k) str += getZeroString(k);
      str += ws;
    }
    w = d[i];
    ws = w + "";
    k = LOG_BASE - ws.length;
    if (k) str += getZeroString(k);
  } else if (w === 0) {
    return "0";
  }
  for (; w % 10 === 0; ) w /= 10;
  return str + w;
}
function checkInt32(i, min2, max2) {
  if (i !== ~~i || i < min2 || i > max2) {
    throw Error(invalidArgument + i);
  }
}
function checkRoundingDigits(d, i, rm, repeating) {
  var di, k, r, rd;
  for (k = d[0]; k >= 10; k /= 10) --i;
  if (--i < 0) {
    i += LOG_BASE;
    di = 0;
  } else {
    di = Math.ceil((i + 1) / LOG_BASE);
    i %= LOG_BASE;
  }
  k = mathpow(10, LOG_BASE - i);
  rd = d[di] % k | 0;
  if (repeating == null) {
    if (i < 3) {
      if (i == 0) rd = rd / 100 | 0;
      else if (i == 1) rd = rd / 10 | 0;
      r = rm < 4 && rd == 99999 || rm > 3 && rd == 49999 || rd == 5e4 || rd == 0;
    } else {
      r = (rm < 4 && rd + 1 == k || rm > 3 && rd + 1 == k / 2) && (d[di + 1] / k / 100 | 0) == mathpow(10, i - 2) - 1 || (rd == k / 2 || rd == 0) && (d[di + 1] / k / 100 | 0) == 0;
    }
  } else {
    if (i < 4) {
      if (i == 0) rd = rd / 1e3 | 0;
      else if (i == 1) rd = rd / 100 | 0;
      else if (i == 2) rd = rd / 10 | 0;
      r = (repeating || rm < 4) && rd == 9999 || !repeating && rm > 3 && rd == 4999;
    } else {
      r = ((repeating || rm < 4) && rd + 1 == k || !repeating && rm > 3 && rd + 1 == k / 2) && (d[di + 1] / k / 1e3 | 0) == mathpow(10, i - 3) - 1;
    }
  }
  return r;
}
function convertBase(str, baseIn, baseOut) {
  var j, arr = [0], arrL, i = 0, strL = str.length;
  for (; i < strL; ) {
    for (arrL = arr.length; arrL--; ) arr[arrL] *= baseIn;
    arr[0] += NUMERALS.indexOf(str.charAt(i++));
    for (j = 0; j < arr.length; j++) {
      if (arr[j] > baseOut - 1) {
        if (arr[j + 1] === void 0) arr[j + 1] = 0;
        arr[j + 1] += arr[j] / baseOut | 0;
        arr[j] %= baseOut;
      }
    }
  }
  return arr.reverse();
}
function cosine(Ctor, x) {
  var k, len, y;
  if (x.isZero()) return x;
  len = x.d.length;
  if (len < 32) {
    k = Math.ceil(len / 3);
    y = (1 / tinyPow(4, k)).toString();
  } else {
    k = 16;
    y = "2.3283064365386962890625e-10";
  }
  Ctor.precision += k;
  x = taylorSeries(Ctor, 1, x.times(y), new Ctor(1));
  for (var i = k; i--; ) {
    var cos2x = x.times(x);
    x = cos2x.times(cos2x).minus(cos2x).times(8).plus(1);
  }
  Ctor.precision -= k;
  return x;
}
var divide = /* @__PURE__ */ function() {
  function multiplyInteger(x, k, base) {
    var temp, carry = 0, i = x.length;
    for (x = x.slice(); i--; ) {
      temp = x[i] * k + carry;
      x[i] = temp % base | 0;
      carry = temp / base | 0;
    }
    if (carry) x.unshift(carry);
    return x;
  }
  function compare(a2, b, aL, bL) {
    var i, r;
    if (aL != bL) {
      r = aL > bL ? 1 : -1;
    } else {
      for (i = r = 0; i < aL; i++) {
        if (a2[i] != b[i]) {
          r = a2[i] > b[i] ? 1 : -1;
          break;
        }
      }
    }
    return r;
  }
  function subtract(a2, b, aL, base) {
    var i = 0;
    for (; aL--; ) {
      a2[aL] -= i;
      i = a2[aL] < b[aL] ? 1 : 0;
      a2[aL] = i * base + a2[aL] - b[aL];
    }
    for (; !a2[0] && a2.length > 1; ) a2.shift();
  }
  return function(x, y, pr, rm, dp, base) {
    var cmp, e, i, k, logBase, more, prod, prodL, q, qd, rem, remL, rem0, sd, t, xi, xL, yd0, yL, yz, Ctor = x.constructor, sign2 = x.s == y.s ? 1 : -1, xd = x.d, yd = y.d;
    if (!xd || !xd[0] || !yd || !yd[0]) {
      return new Ctor(
        // Return NaN if either NaN, or both Infinity or 0.
        !x.s || !y.s || (xd ? yd && xd[0] == yd[0] : !yd) ? NaN : (
          // Return ±0 if x is 0 or y is ±Infinity, or return ±Infinity as y is 0.
          xd && xd[0] == 0 || !yd ? sign2 * 0 : sign2 / 0
        )
      );
    }
    if (base) {
      logBase = 1;
      e = x.e - y.e;
    } else {
      base = BASE;
      logBase = LOG_BASE;
      e = mathfloor(x.e / logBase) - mathfloor(y.e / logBase);
    }
    yL = yd.length;
    xL = xd.length;
    q = new Ctor(sign2);
    qd = q.d = [];
    for (i = 0; yd[i] == (xd[i] || 0); i++) ;
    if (yd[i] > (xd[i] || 0)) e--;
    if (pr == null) {
      sd = pr = Ctor.precision;
      rm = Ctor.rounding;
    } else if (dp) {
      sd = pr + (x.e - y.e) + 1;
    } else {
      sd = pr;
    }
    if (sd < 0) {
      qd.push(1);
      more = true;
    } else {
      sd = sd / logBase + 2 | 0;
      i = 0;
      if (yL == 1) {
        k = 0;
        yd = yd[0];
        sd++;
        for (; (i < xL || k) && sd--; i++) {
          t = k * base + (xd[i] || 0);
          qd[i] = t / yd | 0;
          k = t % yd | 0;
        }
        more = k || i < xL;
      } else {
        k = base / (yd[0] + 1) | 0;
        if (k > 1) {
          yd = multiplyInteger(yd, k, base);
          xd = multiplyInteger(xd, k, base);
          yL = yd.length;
          xL = xd.length;
        }
        xi = yL;
        rem = xd.slice(0, yL);
        remL = rem.length;
        for (; remL < yL; ) rem[remL++] = 0;
        yz = yd.slice();
        yz.unshift(0);
        yd0 = yd[0];
        if (yd[1] >= base / 2) ++yd0;
        do {
          k = 0;
          cmp = compare(yd, rem, yL, remL);
          if (cmp < 0) {
            rem0 = rem[0];
            if (yL != remL) rem0 = rem0 * base + (rem[1] || 0);
            k = rem0 / yd0 | 0;
            if (k > 1) {
              if (k >= base) k = base - 1;
              prod = multiplyInteger(yd, k, base);
              prodL = prod.length;
              remL = rem.length;
              cmp = compare(prod, rem, prodL, remL);
              if (cmp == 1) {
                k--;
                subtract(prod, yL < prodL ? yz : yd, prodL, base);
              }
            } else {
              if (k == 0) cmp = k = 1;
              prod = yd.slice();
            }
            prodL = prod.length;
            if (prodL < remL) prod.unshift(0);
            subtract(rem, prod, remL, base);
            if (cmp == -1) {
              remL = rem.length;
              cmp = compare(yd, rem, yL, remL);
              if (cmp < 1) {
                k++;
                subtract(rem, yL < remL ? yz : yd, remL, base);
              }
            }
            remL = rem.length;
          } else if (cmp === 0) {
            k++;
            rem = [0];
          }
          qd[i++] = k;
          if (cmp && rem[0]) {
            rem[remL++] = xd[xi] || 0;
          } else {
            rem = [xd[xi]];
            remL = 1;
          }
        } while ((xi++ < xL || rem[0] !== void 0) && sd--);
        more = rem[0] !== void 0;
      }
      if (!qd[0]) qd.shift();
    }
    if (logBase == 1) {
      q.e = e;
      inexact = more;
    } else {
      for (i = 1, k = qd[0]; k >= 10; k /= 10) i++;
      q.e = i + e * logBase - 1;
      finalise(q, dp ? pr + q.e + 1 : pr, rm, more);
    }
    return q;
  };
}();
function finalise(x, sd, rm, isTruncated) {
  var digits, i, j, k, rd, roundUp, w, xd, xdi, Ctor = x.constructor;
  out: if (sd != null) {
    xd = x.d;
    if (!xd) return x;
    for (digits = 1, k = xd[0]; k >= 10; k /= 10) digits++;
    i = sd - digits;
    if (i < 0) {
      i += LOG_BASE;
      j = sd;
      w = xd[xdi = 0];
      rd = w / mathpow(10, digits - j - 1) % 10 | 0;
    } else {
      xdi = Math.ceil((i + 1) / LOG_BASE);
      k = xd.length;
      if (xdi >= k) {
        if (isTruncated) {
          for (; k++ <= xdi; ) xd.push(0);
          w = rd = 0;
          digits = 1;
          i %= LOG_BASE;
          j = i - LOG_BASE + 1;
        } else {
          break out;
        }
      } else {
        w = k = xd[xdi];
        for (digits = 1; k >= 10; k /= 10) digits++;
        i %= LOG_BASE;
        j = i - LOG_BASE + digits;
        rd = j < 0 ? 0 : w / mathpow(10, digits - j - 1) % 10 | 0;
      }
    }
    isTruncated = isTruncated || sd < 0 || xd[xdi + 1] !== void 0 || (j < 0 ? w : w % mathpow(10, digits - j - 1));
    roundUp = rm < 4 ? (rd || isTruncated) && (rm == 0 || rm == (x.s < 0 ? 3 : 2)) : rd > 5 || rd == 5 && (rm == 4 || isTruncated || rm == 6 && // Check whether the digit to the left of the rounding digit is odd.
    (i > 0 ? j > 0 ? w / mathpow(10, digits - j) : 0 : xd[xdi - 1]) % 10 & 1 || rm == (x.s < 0 ? 8 : 7));
    if (sd < 1 || !xd[0]) {
      xd.length = 0;
      if (roundUp) {
        sd -= x.e + 1;
        xd[0] = mathpow(10, (LOG_BASE - sd % LOG_BASE) % LOG_BASE);
        x.e = -sd || 0;
      } else {
        xd[0] = x.e = 0;
      }
      return x;
    }
    if (i == 0) {
      xd.length = xdi;
      k = 1;
      xdi--;
    } else {
      xd.length = xdi + 1;
      k = mathpow(10, LOG_BASE - i);
      xd[xdi] = j > 0 ? (w / mathpow(10, digits - j) % mathpow(10, j) | 0) * k : 0;
    }
    if (roundUp) {
      for (; ; ) {
        if (xdi == 0) {
          for (i = 1, j = xd[0]; j >= 10; j /= 10) i++;
          j = xd[0] += k;
          for (k = 1; j >= 10; j /= 10) k++;
          if (i != k) {
            x.e++;
            if (xd[0] == BASE) xd[0] = 1;
          }
          break;
        } else {
          xd[xdi] += k;
          if (xd[xdi] != BASE) break;
          xd[xdi--] = 0;
          k = 1;
        }
      }
    }
    for (i = xd.length; xd[--i] === 0; ) xd.pop();
  }
  if (external) {
    if (x.e > Ctor.maxE) {
      x.d = null;
      x.e = NaN;
    } else if (x.e < Ctor.minE) {
      x.e = 0;
      x.d = [0];
    }
  }
  return x;
}
function finiteToString(x, isExp, sd) {
  if (!x.isFinite()) return nonFiniteToString(x);
  var k, e = x.e, str = digitsToString(x.d), len = str.length;
  if (isExp) {
    if (sd && (k = sd - len) > 0) {
      str = str.charAt(0) + "." + str.slice(1) + getZeroString(k);
    } else if (len > 1) {
      str = str.charAt(0) + "." + str.slice(1);
    }
    str = str + (x.e < 0 ? "e" : "e+") + x.e;
  } else if (e < 0) {
    str = "0." + getZeroString(-e - 1) + str;
    if (sd && (k = sd - len) > 0) str += getZeroString(k);
  } else if (e >= len) {
    str += getZeroString(e + 1 - len);
    if (sd && (k = sd - e - 1) > 0) str = str + "." + getZeroString(k);
  } else {
    if ((k = e + 1) < len) str = str.slice(0, k) + "." + str.slice(k);
    if (sd && (k = sd - len) > 0) {
      if (e + 1 === len) str += ".";
      str += getZeroString(k);
    }
  }
  return str;
}
function getBase10Exponent(digits, e) {
  var w = digits[0];
  for (e *= LOG_BASE; w >= 10; w /= 10) e++;
  return e;
}
function getLn10(Ctor, sd, pr) {
  if (sd > LN10_PRECISION) {
    external = true;
    if (pr) Ctor.precision = pr;
    throw Error(precisionLimitExceeded);
  }
  return finalise(new Ctor(LN10), sd, 1, true);
}
function getPi(Ctor, sd, rm) {
  if (sd > PI_PRECISION) throw Error(precisionLimitExceeded);
  return finalise(new Ctor(PI), sd, rm, true);
}
function getPrecision(digits) {
  var w = digits.length - 1, len = w * LOG_BASE + 1;
  w = digits[w];
  if (w) {
    for (; w % 10 == 0; w /= 10) len--;
    for (w = digits[0]; w >= 10; w /= 10) len++;
  }
  return len;
}
function getZeroString(k) {
  var zs = "";
  for (; k--; ) zs += "0";
  return zs;
}
function intPow(Ctor, x, n, pr) {
  var isTruncated, r = new Ctor(1), k = Math.ceil(pr / LOG_BASE + 4);
  external = false;
  for (; ; ) {
    if (n % 2) {
      r = r.times(x);
      if (truncate(r.d, k)) isTruncated = true;
    }
    n = mathfloor(n / 2);
    if (n === 0) {
      n = r.d.length - 1;
      if (isTruncated && r.d[n] === 0) ++r.d[n];
      break;
    }
    x = x.times(x);
    truncate(x.d, k);
  }
  external = true;
  return r;
}
function isOdd(n) {
  return n.d[n.d.length - 1] & 1;
}
function maxOrMin(Ctor, args, n) {
  var k, y, x = new Ctor(args[0]), i = 0;
  for (; ++i < args.length; ) {
    y = new Ctor(args[i]);
    if (!y.s) {
      x = y;
      break;
    }
    k = x.cmp(y);
    if (k === n || k === 0 && x.s === n) {
      x = y;
    }
  }
  return x;
}
function naturalExponential(x, sd) {
  var denominator, guard, j, pow2, sum2, t, wpr, rep = 0, i = 0, k = 0, Ctor = x.constructor, rm = Ctor.rounding, pr = Ctor.precision;
  if (!x.d || !x.d[0] || x.e > 17) {
    return new Ctor(x.d ? !x.d[0] ? 1 : x.s < 0 ? 0 : 1 / 0 : x.s ? x.s < 0 ? 0 : x : 0 / 0);
  }
  if (sd == null) {
    external = false;
    wpr = pr;
  } else {
    wpr = sd;
  }
  t = new Ctor(0.03125);
  while (x.e > -2) {
    x = x.times(t);
    k += 5;
  }
  guard = Math.log(mathpow(2, k)) / Math.LN10 * 2 + 5 | 0;
  wpr += guard;
  denominator = pow2 = sum2 = new Ctor(1);
  Ctor.precision = wpr;
  for (; ; ) {
    pow2 = finalise(pow2.times(x), wpr, 1);
    denominator = denominator.times(++i);
    t = sum2.plus(divide(pow2, denominator, wpr, 1));
    if (digitsToString(t.d).slice(0, wpr) === digitsToString(sum2.d).slice(0, wpr)) {
      j = k;
      while (j--) sum2 = finalise(sum2.times(sum2), wpr, 1);
      if (sd == null) {
        if (rep < 3 && checkRoundingDigits(sum2.d, wpr - guard, rm, rep)) {
          Ctor.precision = wpr += 10;
          denominator = pow2 = t = new Ctor(1);
          i = 0;
          rep++;
        } else {
          return finalise(sum2, Ctor.precision = pr, rm, external = true);
        }
      } else {
        Ctor.precision = pr;
        return sum2;
      }
    }
    sum2 = t;
  }
}
function naturalLogarithm(y, sd) {
  var c, c0, denominator, e, numerator, rep, sum2, t, wpr, x1, x2, n = 1, guard = 10, x = y, xd = x.d, Ctor = x.constructor, rm = Ctor.rounding, pr = Ctor.precision;
  if (x.s < 0 || !xd || !xd[0] || !x.e && xd[0] == 1 && xd.length == 1) {
    return new Ctor(xd && !xd[0] ? -1 / 0 : x.s != 1 ? NaN : xd ? 0 : x);
  }
  if (sd == null) {
    external = false;
    wpr = pr;
  } else {
    wpr = sd;
  }
  Ctor.precision = wpr += guard;
  c = digitsToString(xd);
  c0 = c.charAt(0);
  if (Math.abs(e = x.e) < 15e14) {
    while (c0 < 7 && c0 != 1 || c0 == 1 && c.charAt(1) > 3) {
      x = x.times(y);
      c = digitsToString(x.d);
      c0 = c.charAt(0);
      n++;
    }
    e = x.e;
    if (c0 > 1) {
      x = new Ctor("0." + c);
      e++;
    } else {
      x = new Ctor(c0 + "." + c.slice(1));
    }
  } else {
    t = getLn10(Ctor, wpr + 2, pr).times(e + "");
    x = naturalLogarithm(new Ctor(c0 + "." + c.slice(1)), wpr - guard).plus(t);
    Ctor.precision = pr;
    return sd == null ? finalise(x, pr, rm, external = true) : x;
  }
  x1 = x;
  sum2 = numerator = x = divide(x.minus(1), x.plus(1), wpr, 1);
  x2 = finalise(x.times(x), wpr, 1);
  denominator = 3;
  for (; ; ) {
    numerator = finalise(numerator.times(x2), wpr, 1);
    t = sum2.plus(divide(numerator, new Ctor(denominator), wpr, 1));
    if (digitsToString(t.d).slice(0, wpr) === digitsToString(sum2.d).slice(0, wpr)) {
      sum2 = sum2.times(2);
      if (e !== 0) sum2 = sum2.plus(getLn10(Ctor, wpr + 2, pr).times(e + ""));
      sum2 = divide(sum2, new Ctor(n), wpr, 1);
      if (sd == null) {
        if (checkRoundingDigits(sum2.d, wpr - guard, rm, rep)) {
          Ctor.precision = wpr += guard;
          t = numerator = x = divide(x1.minus(1), x1.plus(1), wpr, 1);
          x2 = finalise(x.times(x), wpr, 1);
          denominator = rep = 1;
        } else {
          return finalise(sum2, Ctor.precision = pr, rm, external = true);
        }
      } else {
        Ctor.precision = pr;
        return sum2;
      }
    }
    sum2 = t;
    denominator += 2;
  }
}
function nonFiniteToString(x) {
  return String(x.s * x.s / 0);
}
function parseDecimal(x, str) {
  var e, i, len;
  if ((e = str.indexOf(".")) > -1) str = str.replace(".", "");
  if ((i = str.search(/e/i)) > 0) {
    if (e < 0) e = i;
    e += +str.slice(i + 1);
    str = str.substring(0, i);
  } else if (e < 0) {
    e = str.length;
  }
  for (i = 0; str.charCodeAt(i) === 48; i++) ;
  for (len = str.length; str.charCodeAt(len - 1) === 48; --len) ;
  str = str.slice(i, len);
  if (str) {
    len -= i;
    x.e = e = e - i - 1;
    x.d = [];
    i = (e + 1) % LOG_BASE;
    if (e < 0) i += LOG_BASE;
    if (i < len) {
      if (i) x.d.push(+str.slice(0, i));
      for (len -= LOG_BASE; i < len; ) x.d.push(+str.slice(i, i += LOG_BASE));
      str = str.slice(i);
      i = LOG_BASE - str.length;
    } else {
      i -= len;
    }
    for (; i--; ) str += "0";
    x.d.push(+str);
    if (external) {
      if (x.e > x.constructor.maxE) {
        x.d = null;
        x.e = NaN;
      } else if (x.e < x.constructor.minE) {
        x.e = 0;
        x.d = [0];
      }
    }
  } else {
    x.e = 0;
    x.d = [0];
  }
  return x;
}
function parseOther(x, str) {
  var base, Ctor, divisor, i, isFloat, len, p, xd, xe;
  if (str.indexOf("_") > -1) {
    str = str.replace(/(\d)_(?=\d)/g, "$1");
    if (isDecimal.test(str)) return parseDecimal(x, str);
  } else if (str === "Infinity" || str === "NaN") {
    if (!+str) x.s = NaN;
    x.e = NaN;
    x.d = null;
    return x;
  }
  if (isHex.test(str)) {
    base = 16;
    str = str.toLowerCase();
  } else if (isBinary.test(str)) {
    base = 2;
  } else if (isOctal.test(str)) {
    base = 8;
  } else {
    throw Error(invalidArgument + str);
  }
  i = str.search(/p/i);
  if (i > 0) {
    p = +str.slice(i + 1);
    str = str.substring(2, i);
  } else {
    str = str.slice(2);
  }
  i = str.indexOf(".");
  isFloat = i >= 0;
  Ctor = x.constructor;
  if (isFloat) {
    str = str.replace(".", "");
    len = str.length;
    i = len - i;
    divisor = intPow(Ctor, new Ctor(base), i, i * 2);
  }
  xd = convertBase(str, base, BASE);
  xe = xd.length - 1;
  for (i = xe; xd[i] === 0; --i) xd.pop();
  if (i < 0) return new Ctor(x.s * 0);
  x.e = getBase10Exponent(xd, xe);
  x.d = xd;
  external = false;
  if (isFloat) x = divide(x, divisor, len * 4);
  if (p) x = x.times(Math.abs(p) < 54 ? mathpow(2, p) : Decimal.pow(2, p));
  external = true;
  return x;
}
function sine(Ctor, x) {
  var k, len = x.d.length;
  if (len < 3) {
    return x.isZero() ? x : taylorSeries(Ctor, 2, x, x);
  }
  k = 1.4 * Math.sqrt(len);
  k = k > 16 ? 16 : k | 0;
  x = x.times(1 / tinyPow(5, k));
  x = taylorSeries(Ctor, 2, x, x);
  var sin2_x, d5 = new Ctor(5), d16 = new Ctor(16), d20 = new Ctor(20);
  for (; k--; ) {
    sin2_x = x.times(x);
    x = x.times(d5.plus(sin2_x.times(d16.times(sin2_x).minus(d20))));
  }
  return x;
}
function taylorSeries(Ctor, n, x, y, isHyperbolic) {
  var j, t, u, x2, pr = Ctor.precision, k = Math.ceil(pr / LOG_BASE);
  external = false;
  x2 = x.times(x);
  u = new Ctor(y);
  for (; ; ) {
    t = divide(u.times(x2), new Ctor(n++ * n++), pr, 1);
    u = isHyperbolic ? y.plus(t) : y.minus(t);
    y = divide(t.times(x2), new Ctor(n++ * n++), pr, 1);
    t = u.plus(y);
    if (t.d[k] !== void 0) {
      for (j = k; t.d[j] === u.d[j] && j--; ) ;
      if (j == -1) break;
    }
    j = u;
    u = y;
    y = t;
    t = j;
  }
  external = true;
  t.d.length = k + 1;
  return t;
}
function tinyPow(b, e) {
  var n = b;
  while (--e) n *= b;
  return n;
}
function toLessThanHalfPi(Ctor, x) {
  var t, isNeg = x.s < 0, pi = getPi(Ctor, Ctor.precision, 1), halfPi = pi.times(0.5);
  x = x.abs();
  if (x.lte(halfPi)) {
    quadrant = isNeg ? 4 : 1;
    return x;
  }
  t = x.divToInt(pi);
  if (t.isZero()) {
    quadrant = isNeg ? 3 : 2;
  } else {
    x = x.minus(t.times(pi));
    if (x.lte(halfPi)) {
      quadrant = isOdd(t) ? isNeg ? 2 : 3 : isNeg ? 4 : 1;
      return x;
    }
    quadrant = isOdd(t) ? isNeg ? 1 : 4 : isNeg ? 3 : 2;
  }
  return x.minus(pi).abs();
}
function toStringBinary(x, baseOut, sd, rm) {
  var base, e, i, k, len, roundUp, str, xd, y, Ctor = x.constructor, isExp = sd !== void 0;
  if (isExp) {
    checkInt32(sd, 1, MAX_DIGITS);
    if (rm === void 0) rm = Ctor.rounding;
    else checkInt32(rm, 0, 8);
  } else {
    sd = Ctor.precision;
    rm = Ctor.rounding;
  }
  if (!x.isFinite()) {
    str = nonFiniteToString(x);
  } else {
    str = finiteToString(x);
    i = str.indexOf(".");
    if (isExp) {
      base = 2;
      if (baseOut == 16) {
        sd = sd * 4 - 3;
      } else if (baseOut == 8) {
        sd = sd * 3 - 2;
      }
    } else {
      base = baseOut;
    }
    if (i >= 0) {
      str = str.replace(".", "");
      y = new Ctor(1);
      y.e = str.length - i;
      y.d = convertBase(finiteToString(y), 10, base);
      y.e = y.d.length;
    }
    xd = convertBase(str, 10, base);
    e = len = xd.length;
    for (; xd[--len] == 0; ) xd.pop();
    if (!xd[0]) {
      str = isExp ? "0p+0" : "0";
    } else {
      if (i < 0) {
        e--;
      } else {
        x = new Ctor(x);
        x.d = xd;
        x.e = e;
        x = divide(x, y, sd, rm, 0, base);
        xd = x.d;
        e = x.e;
        roundUp = inexact;
      }
      i = xd[sd];
      k = base / 2;
      roundUp = roundUp || xd[sd + 1] !== void 0;
      roundUp = rm < 4 ? (i !== void 0 || roundUp) && (rm === 0 || rm === (x.s < 0 ? 3 : 2)) : i > k || i === k && (rm === 4 || roundUp || rm === 6 && xd[sd - 1] & 1 || rm === (x.s < 0 ? 8 : 7));
      xd.length = sd;
      if (roundUp) {
        for (; ++xd[--sd] > base - 1; ) {
          xd[sd] = 0;
          if (!sd) {
            ++e;
            xd.unshift(1);
          }
        }
      }
      for (len = xd.length; !xd[len - 1]; --len) ;
      for (i = 0, str = ""; i < len; i++) str += NUMERALS.charAt(xd[i]);
      if (isExp) {
        if (len > 1) {
          if (baseOut == 16 || baseOut == 8) {
            i = baseOut == 16 ? 4 : 3;
            for (--len; len % i; len++) str += "0";
            xd = convertBase(str, base, baseOut);
            for (len = xd.length; !xd[len - 1]; --len) ;
            for (i = 1, str = "1."; i < len; i++) str += NUMERALS.charAt(xd[i]);
          } else {
            str = str.charAt(0) + "." + str.slice(1);
          }
        }
        str = str + (e < 0 ? "p" : "p+") + e;
      } else if (e < 0) {
        for (; ++e; ) str = "0" + str;
        str = "0." + str;
      } else {
        if (++e > len) for (e -= len; e--; ) str += "0";
        else if (e < len) str = str.slice(0, e) + "." + str.slice(e);
      }
    }
    str = (baseOut == 16 ? "0x" : baseOut == 2 ? "0b" : baseOut == 8 ? "0o" : "") + str;
  }
  return x.s < 0 ? "-" + str : str;
}
function truncate(arr, len) {
  if (arr.length > len) {
    arr.length = len;
    return true;
  }
}
function abs(x) {
  return new this(x).abs();
}
function acos(x) {
  return new this(x).acos();
}
function acosh(x) {
  return new this(x).acosh();
}
function add(x, y) {
  return new this(x).plus(y);
}
function asin(x) {
  return new this(x).asin();
}
function asinh(x) {
  return new this(x).asinh();
}
function atan(x) {
  return new this(x).atan();
}
function atanh(x) {
  return new this(x).atanh();
}
function atan2(y, x) {
  y = new this(y);
  x = new this(x);
  var r, pr = this.precision, rm = this.rounding, wpr = pr + 4;
  if (!y.s || !x.s) {
    r = new this(NaN);
  } else if (!y.d && !x.d) {
    r = getPi(this, wpr, 1).times(x.s > 0 ? 0.25 : 0.75);
    r.s = y.s;
  } else if (!x.d || y.isZero()) {
    r = x.s < 0 ? getPi(this, pr, rm) : new this(0);
    r.s = y.s;
  } else if (!y.d || x.isZero()) {
    r = getPi(this, wpr, 1).times(0.5);
    r.s = y.s;
  } else if (x.s < 0) {
    this.precision = wpr;
    this.rounding = 1;
    r = this.atan(divide(y, x, wpr, 1));
    x = getPi(this, wpr, 1);
    this.precision = pr;
    this.rounding = rm;
    r = y.s < 0 ? r.minus(x) : r.plus(x);
  } else {
    r = this.atan(divide(y, x, wpr, 1));
  }
  return r;
}
function cbrt(x) {
  return new this(x).cbrt();
}
function ceil(x) {
  return finalise(x = new this(x), x.e + 1, 2);
}
function clamp(x, min2, max2) {
  return new this(x).clamp(min2, max2);
}
function config(obj) {
  if (!obj || typeof obj !== "object") throw Error(decimalError + "Object expected");
  var i, p, v, useDefaults = obj.defaults === true, ps = [
    "precision",
    1,
    MAX_DIGITS,
    "rounding",
    0,
    8,
    "toExpNeg",
    -EXP_LIMIT,
    0,
    "toExpPos",
    0,
    EXP_LIMIT,
    "maxE",
    0,
    EXP_LIMIT,
    "minE",
    -EXP_LIMIT,
    0,
    "modulo",
    0,
    9
  ];
  for (i = 0; i < ps.length; i += 3) {
    if (p = ps[i], useDefaults) this[p] = DEFAULTS[p];
    if ((v = obj[p]) !== void 0) {
      if (mathfloor(v) === v && v >= ps[i + 1] && v <= ps[i + 2]) this[p] = v;
      else throw Error(invalidArgument + p + ": " + v);
    }
  }
  if (p = "crypto", useDefaults) this[p] = DEFAULTS[p];
  if ((v = obj[p]) !== void 0) {
    if (v === true || v === false || v === 0 || v === 1) {
      if (v) {
        if (typeof crypto != "undefined" && crypto && (crypto.getRandomValues || crypto.randomBytes)) {
          this[p] = true;
        } else {
          throw Error(cryptoUnavailable);
        }
      } else {
        this[p] = false;
      }
    } else {
      throw Error(invalidArgument + p + ": " + v);
    }
  }
  return this;
}
function cos(x) {
  return new this(x).cos();
}
function cosh(x) {
  return new this(x).cosh();
}
function clone(obj) {
  var i, p, ps;
  function Decimal2(v) {
    var e, i2, t, x = this;
    if (!(x instanceof Decimal2)) return new Decimal2(v);
    x.constructor = Decimal2;
    if (isDecimalInstance(v)) {
      x.s = v.s;
      if (external) {
        if (!v.d || v.e > Decimal2.maxE) {
          x.e = NaN;
          x.d = null;
        } else if (v.e < Decimal2.minE) {
          x.e = 0;
          x.d = [0];
        } else {
          x.e = v.e;
          x.d = v.d.slice();
        }
      } else {
        x.e = v.e;
        x.d = v.d ? v.d.slice() : v.d;
      }
      return;
    }
    t = typeof v;
    if (t === "number") {
      if (v === 0) {
        x.s = 1 / v < 0 ? -1 : 1;
        x.e = 0;
        x.d = [0];
        return;
      }
      if (v < 0) {
        v = -v;
        x.s = -1;
      } else {
        x.s = 1;
      }
      if (v === ~~v && v < 1e7) {
        for (e = 0, i2 = v; i2 >= 10; i2 /= 10) e++;
        if (external) {
          if (e > Decimal2.maxE) {
            x.e = NaN;
            x.d = null;
          } else if (e < Decimal2.minE) {
            x.e = 0;
            x.d = [0];
          } else {
            x.e = e;
            x.d = [v];
          }
        } else {
          x.e = e;
          x.d = [v];
        }
        return;
      }
      if (v * 0 !== 0) {
        if (!v) x.s = NaN;
        x.e = NaN;
        x.d = null;
        return;
      }
      return parseDecimal(x, v.toString());
    }
    if (t === "string") {
      if ((i2 = v.charCodeAt(0)) === 45) {
        v = v.slice(1);
        x.s = -1;
      } else {
        if (i2 === 43) v = v.slice(1);
        x.s = 1;
      }
      return isDecimal.test(v) ? parseDecimal(x, v) : parseOther(x, v);
    }
    if (t === "bigint") {
      if (v < 0) {
        v = -v;
        x.s = -1;
      } else {
        x.s = 1;
      }
      return parseDecimal(x, v.toString());
    }
    throw Error(invalidArgument + v);
  }
  Decimal2.prototype = P;
  Decimal2.ROUND_UP = 0;
  Decimal2.ROUND_DOWN = 1;
  Decimal2.ROUND_CEIL = 2;
  Decimal2.ROUND_FLOOR = 3;
  Decimal2.ROUND_HALF_UP = 4;
  Decimal2.ROUND_HALF_DOWN = 5;
  Decimal2.ROUND_HALF_EVEN = 6;
  Decimal2.ROUND_HALF_CEIL = 7;
  Decimal2.ROUND_HALF_FLOOR = 8;
  Decimal2.EUCLID = 9;
  Decimal2.config = Decimal2.set = config;
  Decimal2.clone = clone;
  Decimal2.isDecimal = isDecimalInstance;
  Decimal2.abs = abs;
  Decimal2.acos = acos;
  Decimal2.acosh = acosh;
  Decimal2.add = add;
  Decimal2.asin = asin;
  Decimal2.asinh = asinh;
  Decimal2.atan = atan;
  Decimal2.atanh = atanh;
  Decimal2.atan2 = atan2;
  Decimal2.cbrt = cbrt;
  Decimal2.ceil = ceil;
  Decimal2.clamp = clamp;
  Decimal2.cos = cos;
  Decimal2.cosh = cosh;
  Decimal2.div = div;
  Decimal2.exp = exp;
  Decimal2.floor = floor;
  Decimal2.hypot = hypot;
  Decimal2.ln = ln;
  Decimal2.log = log;
  Decimal2.log10 = log10;
  Decimal2.log2 = log2;
  Decimal2.max = max;
  Decimal2.min = min;
  Decimal2.mod = mod;
  Decimal2.mul = mul;
  Decimal2.pow = pow;
  Decimal2.random = random;
  Decimal2.round = round;
  Decimal2.sign = sign;
  Decimal2.sin = sin;
  Decimal2.sinh = sinh;
  Decimal2.sqrt = sqrt;
  Decimal2.sub = sub;
  Decimal2.sum = sum;
  Decimal2.tan = tan;
  Decimal2.tanh = tanh;
  Decimal2.trunc = trunc;
  if (obj === void 0) obj = {};
  if (obj) {
    if (obj.defaults !== true) {
      ps = ["precision", "rounding", "toExpNeg", "toExpPos", "maxE", "minE", "modulo", "crypto"];
      for (i = 0; i < ps.length; ) if (!obj.hasOwnProperty(p = ps[i++])) obj[p] = this[p];
    }
  }
  Decimal2.config(obj);
  return Decimal2;
}
function div(x, y) {
  return new this(x).div(y);
}
function exp(x) {
  return new this(x).exp();
}
function floor(x) {
  return finalise(x = new this(x), x.e + 1, 3);
}
function hypot() {
  var i, n, t = new this(0);
  external = false;
  for (i = 0; i < arguments.length; ) {
    n = new this(arguments[i++]);
    if (!n.d) {
      if (n.s) {
        external = true;
        return new this(1 / 0);
      }
      t = n;
    } else if (t.d) {
      t = t.plus(n.times(n));
    }
  }
  external = true;
  return t.sqrt();
}
function isDecimalInstance(obj) {
  return obj instanceof Decimal || obj && obj.toStringTag === tag || false;
}
function ln(x) {
  return new this(x).ln();
}
function log(x, y) {
  return new this(x).log(y);
}
function log2(x) {
  return new this(x).log(2);
}
function log10(x) {
  return new this(x).log(10);
}
function max() {
  return maxOrMin(this, arguments, -1);
}
function min() {
  return maxOrMin(this, arguments, 1);
}
function mod(x, y) {
  return new this(x).mod(y);
}
function mul(x, y) {
  return new this(x).mul(y);
}
function pow(x, y) {
  return new this(x).pow(y);
}
function random(sd) {
  var d, e, k, n, i = 0, r = new this(1), rd = [];
  if (sd === void 0) sd = this.precision;
  else checkInt32(sd, 1, MAX_DIGITS);
  k = Math.ceil(sd / LOG_BASE);
  if (!this.crypto) {
    for (; i < k; ) rd[i++] = Math.random() * 1e7 | 0;
  } else if (crypto.getRandomValues) {
    d = crypto.getRandomValues(new Uint32Array(k));
    for (; i < k; ) {
      n = d[i];
      if (n >= 429e7) {
        d[i] = crypto.getRandomValues(new Uint32Array(1))[0];
      } else {
        rd[i++] = n % 1e7;
      }
    }
  } else if (crypto.randomBytes) {
    d = crypto.randomBytes(k *= 4);
    for (; i < k; ) {
      n = d[i] + (d[i + 1] << 8) + (d[i + 2] << 16) + ((d[i + 3] & 127) << 24);
      if (n >= 214e7) {
        crypto.randomBytes(4).copy(d, i);
      } else {
        rd.push(n % 1e7);
        i += 4;
      }
    }
    i = k / 4;
  } else {
    throw Error(cryptoUnavailable);
  }
  k = rd[--i];
  sd %= LOG_BASE;
  if (k && sd) {
    n = mathpow(10, LOG_BASE - sd);
    rd[i] = (k / n | 0) * n;
  }
  for (; rd[i] === 0; i--) rd.pop();
  if (i < 0) {
    e = 0;
    rd = [0];
  } else {
    e = -1;
    for (; rd[0] === 0; e -= LOG_BASE) rd.shift();
    for (k = 1, n = rd[0]; n >= 10; n /= 10) k++;
    if (k < LOG_BASE) e -= LOG_BASE - k;
  }
  r.e = e;
  r.d = rd;
  return r;
}
function round(x) {
  return finalise(x = new this(x), x.e + 1, this.rounding);
}
function sign(x) {
  x = new this(x);
  return x.d ? x.d[0] ? x.s : 0 * x.s : x.s || NaN;
}
function sin(x) {
  return new this(x).sin();
}
function sinh(x) {
  return new this(x).sinh();
}
function sqrt(x) {
  return new this(x).sqrt();
}
function sub(x, y) {
  return new this(x).sub(y);
}
function sum() {
  var i = 0, args = arguments, x = new this(args[i]);
  external = false;
  for (; x.s && ++i < args.length; ) x = x.plus(args[i]);
  external = true;
  return finalise(x, this.precision, this.rounding);
}
function tan(x) {
  return new this(x).tan();
}
function tanh(x) {
  return new this(x).tanh();
}
function trunc(x) {
  return finalise(x = new this(x), x.e + 1, 1);
}
P[Symbol.for("nodejs.util.inspect.custom")] = P.toString;
P[Symbol.toStringTag] = "Decimal";
var Decimal = P.constructor = clone(DEFAULTS);
LN10 = new Decimal(LN10);
PI = new Decimal(PI);
var BigNumberishUtils;
((BigNumberishUtils2) => {
  function toString(value) {
    return value?.toString() || "0";
  }
  BigNumberishUtils2.toString = toString;
  function toBigInt(value) {
    const bigint = BigNumber.toBigInt(value);
    if (bigint === null) throw new Error("Invalid BigNumberish");
    return bigint;
  }
  BigNumberishUtils2.toBigInt = toBigInt;
  function toNumber(value) {
    if (value === null || value === void 0) {
      throw new Error("Invalid BigNumberish: null or undefined");
    }
    const num = BigNumber.toNumber(value);
    if (num === null) {
      throw new Error(`Invalid BigNumberish: could not convert ${value} (type: ${typeof value})`);
    }
    if (!isFinite(num) || isNaN(num)) {
      throw new Error(`Invalid BigNumberish: result is not a finite number: ${num}`);
    }
    return num;
  }
  BigNumberishUtils2.toNumber = toNumber;
  function toNumberSafe(value) {
    if (value === null || value === void 0) {
      return 0;
    }
    try {
      if (typeof value === "bigint") {
        if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
          return Number.MAX_SAFE_INTEGER;
        }
        if (value < BigInt(Number.MIN_SAFE_INTEGER)) {
          return Number.MIN_SAFE_INTEGER;
        }
        return Number(value);
      }
      if (typeof value === "string" && value.endsWith("n")) {
        const bigintValue = BigInt(value.slice(0, -1));
        if (bigintValue > BigInt(Number.MAX_SAFE_INTEGER)) {
          return Number.MAX_SAFE_INTEGER;
        }
        if (bigintValue < BigInt(Number.MIN_SAFE_INTEGER)) {
          return Number.MIN_SAFE_INTEGER;
        }
        return Number(bigintValue);
      }
      const num = BigNumber.toNumber(value);
      if (num === null || !isFinite(num) || isNaN(num)) {
        return 0;
      }
      return num;
    } catch (error) {
      console.warn("toNumberSafe: Failed to convert value, returning 0", value, error);
      return 0;
    }
  }
  BigNumberishUtils2.toNumberSafe = toNumberSafe;
  function add2(a2, b) {
    return toBigInt(a2) + toBigInt(b);
  }
  BigNumberishUtils2.add = add2;
  function subtract(a2, b) {
    return toBigInt(a2) - toBigInt(b);
  }
  BigNumberishUtils2.subtract = subtract;
  function multiply(a2, b) {
    return toBigInt(a2) * toBigInt(b);
  }
  BigNumberishUtils2.multiply = multiply;
  function divide2(a2, b) {
    const bBigInt = toBigInt(b);
    if (bBigInt === 0n) {
      throw new Error("Division by zero");
    }
    return toBigInt(a2) / bBigInt;
  }
  BigNumberishUtils2.divide = divide2;
  function mod2(a2, b) {
    const bBigInt = toBigInt(b);
    if (bBigInt === 0n) {
      throw new Error("Modulo by zero");
    }
    return toBigInt(a2) % bBigInt;
  }
  BigNumberishUtils2.mod = mod2;
  function pow2(base, exponent) {
    return toBigInt(base) ** exponent;
  }
  BigNumberishUtils2.pow = pow2;
  function abs2(value) {
    const bigIntValue = toBigInt(value);
    return bigIntValue < 0n ? -bigIntValue : bigIntValue;
  }
  BigNumberishUtils2.abs = abs2;
  function min2(a2, b) {
    const aBigInt = toBigInt(a2);
    const bBigInt = toBigInt(b);
    return aBigInt < bBigInt ? aBigInt : bBigInt;
  }
  BigNumberishUtils2.min = min2;
  function max2(a2, b) {
    const aBigInt = toBigInt(a2);
    const bBigInt = toBigInt(b);
    return aBigInt > bBigInt ? aBigInt : bBigInt;
  }
  BigNumberishUtils2.max = max2;
  function isZero(value) {
    try {
      return toBigInt(value) === 0n;
    } catch {
      return true;
    }
  }
  BigNumberishUtils2.isZero = isZero;
  function isNegative(value) {
    try {
      return toBigInt(value) < 0n;
    } catch {
      return false;
    }
  }
  BigNumberishUtils2.isNegative = isNegative;
  function isPositive(value) {
    try {
      return toBigInt(value) > 0n;
    } catch {
      return false;
    }
  }
  BigNumberishUtils2.isPositive = isPositive;
  function compare(a2, b) {
    const aBigInt = toBigInt(a2);
    const bBigInt = toBigInt(b);
    if (aBigInt < bBigInt) return -1;
    if (aBigInt > bBigInt) return 1;
    return 0;
  }
  BigNumberishUtils2.compare = compare;
  function compareSafe(a2, b) {
    try {
      if (a2 === void 0 || a2 === null) {
        if (b === void 0 || b === null) return 0;
        return -1;
      }
      if (b === void 0 || b === null) {
        return 1;
      }
      return compare(a2, b);
    } catch {
      return 0;
    }
  }
  BigNumberishUtils2.compareSafe = compareSafe;
  function equals(a2, b) {
    try {
      return toBigInt(a2) === toBigInt(b);
    } catch {
      return false;
    }
  }
  BigNumberishUtils2.equals = equals;
  function lt(a2, b) {
    return toBigInt(a2) < toBigInt(b);
  }
  BigNumberishUtils2.lt = lt;
  function lte(a2, b) {
    return toBigInt(a2) <= toBigInt(b);
  }
  BigNumberishUtils2.lte = lte;
  function gt(a2, b) {
    return toBigInt(a2) > toBigInt(b);
  }
  BigNumberishUtils2.gt = gt;
  function gte(a2, b) {
    return toBigInt(a2) >= toBigInt(b);
  }
  BigNumberishUtils2.gte = gte;
  function format(value, decimals = 18) {
    const bigIntValue = toBigInt(value);
    const divisor = 10n ** BigInt(decimals);
    const wholePart = bigIntValue / divisor;
    const fractionalPart = bigIntValue % divisor;
    if (fractionalPart === 0n) {
      return wholePart.toString();
    }
    const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
    const trimmed = fractionalStr.replace(/0+$/, "");
    if (trimmed.length === 0) {
      return wholePart.toString();
    }
    return `${wholePart}.${trimmed}`;
  }
  BigNumberishUtils2.format = format;
  function fromWeiToNumber(value, decimals = 18) {
    const bigIntValue = toBigInt(value);
    const divisor = 10n ** BigInt(decimals);
    const wholePart = bigIntValue / divisor;
    const fractionalPart = bigIntValue % divisor;
    const wholeNumber = Number(wholePart);
    const fractionalNumber = Number(fractionalPart) / Number(divisor);
    return wholeNumber + fractionalNumber;
  }
  BigNumberishUtils2.fromWeiToNumber = fromWeiToNumber;
  function isRawBalance(value, decimals = 18) {
    try {
      const str = toString(value);
      return str.length > decimals - 2 && !str.includes(".");
    } catch {
      return false;
    }
  }
  BigNumberishUtils2.isRawBalance = isRawBalance;
  function standardizeBalance(value, decimals = 18) {
    try {
      if (isRawBalance(value, decimals)) {
        return format(value, decimals);
      }
      return toString(value);
    } catch {
      return "0";
    }
  }
  BigNumberishUtils2.standardizeBalance = standardizeBalance;
  function toDecimal(value, decimals = 18) {
    return format(value, decimals);
  }
  BigNumberishUtils2.toDecimal = toDecimal;
  function parseUnits(value, decimals = 18) {
    value = value.trim();
    if (value.includes("e") || value.includes("E")) {
      const decimal = new Decimal(value);
      const multiplier = new Decimal(10).pow(decimals);
      const result = decimal.mul(multiplier);
      return BigInt(result.toFixed(0));
    }
    const parts = value.split(".");
    if (parts.length > 2) {
      throw new Error("Invalid decimal value");
    }
    const wholePart = parts[0] || "0";
    const fractionalPart = parts[1] || "";
    if (fractionalPart.length > decimals) {
      throw new Error(`Too many decimal places (max ${decimals})`);
    }
    const paddedFractional = fractionalPart.padEnd(decimals, "0");
    const combined = wholePart + paddedFractional;
    return BigInt(combined);
  }
  BigNumberishUtils2.parseUnits = parseUnits;
})(BigNumberishUtils || (BigNumberishUtils = {}));
function getSafeUUID() {
  if (typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}
class BigNumberishMath {
  constructor(value) {
    const bigint = BigNumber.toBigInt(value);
    if (bigint === null) throw new Error("Invalid BigNumberish");
    this.value = bigint;
  }
  static of(value) {
    return new BigNumberishMath(value);
  }
  add(other) {
    this.value += BigNumberishMath.of(other).toBigInt();
    return this;
  }
  sub(other) {
    this.value -= BigNumberishMath.of(other).toBigInt();
    return this;
  }
  mul(other) {
    const multiplier = BigNumberishMath.of(other).toBigInt();
    this.value *= multiplier;
    return this;
  }
  div(other) {
    const divisor = BigNumberishMath.of(other).toBigInt();
    if (divisor === BigInt(0)) throw new Error("Divide by zero");
    this.value /= divisor;
    return this;
  }
  mod(other) {
    const mod2 = BigNumberishMath.of(other).toBigInt();
    if (mod2 === BigInt(0)) throw new Error("Mod by zero");
    this.value %= mod2;
    return this;
  }
  compare(other) {
    const otherValue = BigNumberishMath.of(other).toBigInt();
    if (this.value < otherValue) return -1;
    if (this.value > otherValue) return 1;
    return 0;
  }
  gt(other) {
    return this.compare(other) > 0;
  }
  gte(other) {
    return this.compare(other) >= 0;
  }
  lt(other) {
    return this.compare(other) < 0;
  }
  lte(other) {
    return this.compare(other) <= 0;
  }
  eq(other) {
    return this.compare(other) === 0;
  }
  toBigInt() {
    return this.value;
  }
  toNumber() {
    return Number(this.value);
  }
  toDecimal(decimals = 18) {
    return new Decimal(this.value.toString()).div(`1e${decimals}`);
  }
  toString() {
    return this.value.toString();
  }
}
class DecimalMath {
  constructor(val) {
    this.value = new Decimal(val);
  }
  static of(val) {
    return new DecimalMath(val);
  }
  add(val) {
    this.value = this.value.plus(val);
    return this;
  }
  sub(val) {
    this.value = this.value.minus(val);
    return this;
  }
  mul(val) {
    this.value = this.value.times(val);
    return this;
  }
  div(val) {
    this.value = this.value.div(val);
    return this;
  }
  pct(percent) {
    return this.mul(percent / 100);
  }
  round(decimals = 2) {
    this.value = this.value.toDecimalPlaces(decimals);
    return this;
  }
  gt(val) {
    return this.value.gt(val);
  }
  lt(val) {
    return this.value.lt(val);
  }
  toDecimal() {
    return this.value;
  }
  toFixed(decimals = 2) {
    return this.value.toFixed(decimals);
  }
  toNumber() {
    return this.value.toNumber();
  }
  toString() {
    return this.value.toString();
  }
}
function convertBasisPointsToDecimal(basisPoints) {
  if (basisPoints < 1) {
    return basisPoints;
  }
  return basisPoints / 1e4;
}
function ensureHexFormat(value) {
  if (typeof value === "string") {
    if (value.startsWith("0x")) {
      return value;
    }
    if (/^\d+$/.test(value)) {
      return `0x${parseInt(value, 10).toString(16)}`;
    }
    if (/^[0-9a-fA-F]+$/.test(value)) {
      return `0x${value}`;
    }
  }
  if (typeof value === "number") {
    return `0x${value.toString(16)}`;
  }
  const stringValue = String(value);
  if (/^\d+$/.test(stringValue)) {
    return `0x${parseInt(stringValue, 10).toString(16)}`;
  }
  return String(value);
}
function safeConvertToBigInt(value) {
  try {
    if (value === null || value === void 0) {
      return void 0;
    }
    switch (typeof value) {
      case "bigint":
        return value;
      case "number":
        if (!Number.isInteger(value)) {
          return void 0;
        }
        return BigInt(value);
      case "string":
        if (value === "") {
          return void 0;
        }
        if (value.startsWith("0x")) {
          return BigInt(value);
        }
        if (/^\d+$/.test(value)) {
          return BigInt(value);
        }
        return void 0;
      default:
        return void 0;
    }
  } catch {
    return void 0;
  }
}
function validateObject(data, rules) {
  const validateValue = (value, rule) => {
    if (value === void 0 || value === null) {
      return !rule.required;
    }
    let bigIntValue;
    if (rule.type) {
      switch (rule.type) {
        case "number":
          if (typeof value !== "number" || isNaN(value)) return false;
          break;
        case "bigint":
        case "bignumberish":
          bigIntValue = safeConvertToBigInt(value);
          if (bigIntValue === void 0) return false;
          value = bigIntValue;
          break;
        case "string":
          if (typeof value !== "string") return false;
          break;
        case "boolean":
          if (typeof value !== "boolean") return false;
          break;
        case "array":
          if (!Array.isArray(value)) return false;
          break;
        case "object":
          if (typeof value !== "object" || value === null) return false;
          break;
      }
    }
    if (rule.min !== void 0) {
      if (typeof rule.min === "number" && value < rule.min) return false;
      if (rule.type === "bigint" || rule.type === "bignumberish") {
        const minBigInt = safeConvertToBigInt(rule.min);
        const valueBigInt = safeConvertToBigInt(value);
        if (minBigInt === void 0 || valueBigInt === void 0) return false;
        if (valueBigInt < minBigInt) return false;
      }
    }
    if (rule.max !== void 0) {
      if (typeof rule.max === "number" && value > rule.max) return false;
      if (rule.type === "bigint" || rule.type === "bignumberish") {
        const maxBigInt = safeConvertToBigInt(rule.max);
        const valueBigInt = safeConvertToBigInt(value);
        if (maxBigInt === void 0 || valueBigInt === void 0) return false;
        if (valueBigInt > maxBigInt) return false;
      }
    }
    if (rule.equals !== void 0 && value !== rule.equals) return false;
    if (rule.notEquals !== void 0 && value === rule.notEquals) return false;
    if (rule.oneOf !== void 0 && !rule.oneOf.includes(value)) return false;
    if (rule.notOneOf !== void 0 && rule.notOneOf.includes(value)) return false;
    if (rule.customValidation && !rule.customValidation(value)) return false;
    return true;
  };
  for (const [key, rule] of Object.entries(rules)) {
    const value = data[key];
    if (!validateValue(value, rule)) {
      let errorMessage = `Invalid ${key}: `;
      if (value === void 0 || value === null) {
        errorMessage += rule.required ? "is required" : "is missing but not required";
      } else {
        const currentRule = rule;
        if (currentRule.min !== void 0) errorMessage += `must be at least ${currentRule.min}`;
        if (currentRule.max !== void 0) errorMessage += `must be at most ${currentRule.max}`;
        if (currentRule.equals !== void 0) errorMessage += `must equal ${currentRule.equals}`;
        if (currentRule.notEquals !== void 0)
          errorMessage += `cannot equal ${currentRule.notEquals}`;
        if (currentRule.oneOf !== void 0)
          errorMessage += `must be one of ${currentRule.oneOf.join(", ")}`;
        if (currentRule.notOneOf !== void 0)
          errorMessage += `cannot be one of ${currentRule.notOneOf.join(", ")}`;
      }
      return {
        isValid: false,
        error: errorMessage
      };
    }
  }
  return {
    isValid: true,
    error: ""
  };
}
function isValidAddress(address) {
  if (!address || typeof address !== "string") {
    return false;
  }
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
function isValidTransactionHash(hash) {
  if (!hash || typeof hash !== "string") {
    return false;
  }
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}
function isInRange(value, min2, max2) {
  return value >= min2 && value <= max2;
}
function isNotEmpty(value) {
  return value !== null && value !== void 0 && value.trim().length > 0;
}
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
function dateString() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function getTime() {
  return (/* @__PURE__ */ new Date()).getTime();
}
function formatDate(date) {
  return date.toLocaleString();
}
function formatTimestamp(timestamp, {
  placeholder = "------",
  locale = "en-US",
  options = { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
} = {}) {
  try {
    if (timestamp === void 0 || typeof timestamp === "number" && Number.isNaN(timestamp)) {
      return placeholder;
    }
    let date;
    if (typeof timestamp === "string" || typeof timestamp === "number") {
      date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return placeholder;
      }
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return placeholder;
    }
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch (e) {
    console.error("Error formatting timestamp:", e);
    return placeholder;
  }
}
function getRelativeTime(date, locale = "en-US") {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const d = typeof date === "object" ? date : new Date(date);
  const diff = (d.getTime() - Date.now()) / 1e3;
  const units = [
    { unit: "year", seconds: 31536e3 },
    { unit: "month", seconds: 2592e3 },
    { unit: "week", seconds: 604800 },
    { unit: "day", seconds: 86400 },
    { unit: "hour", seconds: 3600 },
    { unit: "minute", seconds: 60 },
    { unit: "second", seconds: 1 }
  ];
  for (const { unit, seconds } of units) {
    const interval = Math.floor(Math.abs(diff) / seconds);
    if (interval >= 1) {
      return rtf.format(diff < 0 ? -interval : interval, unit);
    }
  }
  return rtf.format(0, "second");
}
function isToday(date) {
  const d = typeof date === "object" ? date : new Date(date);
  const today = /* @__PURE__ */ new Date();
  return d.toDateString() === today.toDateString();
}
function isYesterday(date) {
  const d = typeof date === "object" ? date : new Date(date);
  const yesterday = /* @__PURE__ */ new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.toDateString() === yesterday.toDateString();
}
function addDays(date, days) {
  const d = typeof date === "object" ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function startOfDay(date) {
  const d = typeof date === "object" ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDay(date) {
  const d = typeof date === "object" ? new Date(date) : new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
class RateLimiter {
  constructor(config2) {
    this.config = config2;
    this.limits = /* @__PURE__ */ new Map();
  }
  /**
   * Check if an operation is allowed under the rate limit
   * @param key - Unique identifier for the operation
   * @returns true if allowed, false if rate limited
   */
  isAllowed(key) {
    const now = Date.now();
    const entry = this.limits.get(key);
    if (!entry) {
      this.limits.set(key, {
        count: 1,
        windowStart: now
      });
      return true;
    }
    if (now - entry.windowStart > this.config.windowMs) {
      this.limits.set(key, {
        count: 1,
        windowStart: now
      });
      return true;
    }
    if (entry.count >= this.config.maxRequests) {
      return false;
    }
    entry.count++;
    return true;
  }
  /**
   * Check if an operation is allowed and get detailed info
   * @param key - Unique identifier for the operation
   * @returns Result object with allowed status and metadata
   */
  check(key) {
    const now = Date.now();
    const entry = this.limits.get(key);
    if (!entry) {
      this.limits.set(key, {
        count: 1,
        windowStart: now
      });
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs
      };
    }
    if (now - entry.windowStart > this.config.windowMs) {
      this.limits.set(key, {
        count: 1,
        windowStart: now
      });
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs
      };
    }
    const allowed = entry.count < this.config.maxRequests;
    if (allowed) {
      entry.count++;
    }
    return {
      allowed,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.windowStart + this.config.windowMs
    };
  }
  /**
   * Get remaining time until rate limit resets
   * @param key - Unique identifier for the operation
   * @returns milliseconds until reset, or 0 if not rate limited
   */
  getResetTime(key) {
    const entry = this.limits.get(key);
    if (!entry) return 0;
    const now = Date.now();
    const windowEnd = entry.windowStart + this.config.windowMs;
    if (now >= windowEnd) return 0;
    return windowEnd - now;
  }
  /**
   * Get the number of remaining requests for a key
   * @param key - Unique identifier for the operation
   * @returns Number of remaining requests in current window
   */
  getRemaining(key) {
    const entry = this.limits.get(key);
    if (!entry) return this.config.maxRequests;
    const now = Date.now();
    if (now - entry.windowStart > this.config.windowMs) {
      return this.config.maxRequests;
    }
    return Math.max(0, this.config.maxRequests - entry.count);
  }
  /**
   * Reset rate limit for a specific key
   * @param key - Unique identifier for the operation
   */
  resetKey(key) {
    this.limits.delete(key);
  }
  /**
   * Clear all rate limit entries
   */
  reset() {
    this.limits.clear();
  }
  /**
   * Clean up expired entries (call periodically to prevent memory leaks)
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now - entry.windowStart > this.config.windowMs) {
        this.limits.delete(key);
      }
    }
  }
  /**
   * Get the current configuration
   * @returns Current rate limit configuration
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * Update the configuration
   * @param config - New configuration
   */
  updateConfig(config2) {
    this.config = { ...this.config, ...config2 };
  }
}
function createRateLimiter(maxRequests, windowMs) {
  return new RateLimiter({ maxRequests, windowMs });
}
const RateLimitPresets = {
  /** Strict: 1 request per second */
  STRICT: { maxRequests: 1, windowMs: 1e3 },
  /** API: 10 requests per second */
  API: { maxRequests: 10, windowMs: 1e3 },
  /** Network: 5 requests per minute */
  NETWORK: { maxRequests: 5, windowMs: 6e4 },
  /** Search: 30 requests per minute */
  SEARCH: { maxRequests: 30, windowMs: 6e4 },
  /** Health Check: 10 requests per minute */
  HEALTH_CHECK: { maxRequests: 10, windowMs: 6e4 },
  /** Bulk Operations: 100 requests per minute */
  BULK: { maxRequests: 100, windowMs: 6e4 }
};
function createAutoCleanupRateLimiter(config2, cleanupIntervalMs = 5 * 60 * 1e3) {
  const limiter = new RateLimiter(config2);
  let intervalId;
  if (typeof globalThis !== "undefined" && (typeof window !== "undefined" || typeof globalThis !== "undefined")) {
    intervalId = setInterval(() => limiter.cleanup(), cleanupIntervalMs);
  }
  return Object.assign(limiter, {
    destroy: () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    }
  });
}
async function createWallet(config2 = {}) {
  const defaultConfig = {
    name: "YAKKL Wallet",
    version: "1.0.0",
    embedded: false,
    restrictions: [],
    modDiscovery: true,
    enableMods: true,
    enableDiscovery: true,
    storagePrefix: "yakkl",
    logLevel: "info",
    ...config2
  };
  const engine = new WalletEngine(defaultConfig);
  await engine.initialize();
  return engine;
}
function validateMod(mod2) {
  try {
    if (!mod2.manifest) {
      throw new Error("Mod missing manifest");
    }
    if (!mod2.manifest.id || !mod2.manifest.name || !mod2.manifest.version) {
      throw new Error("Mod manifest missing required fields");
    }
    const requiredMethods = ["initialize", "destroy", "isLoaded", "isActive"];
    for (const method of requiredMethods) {
      if (typeof mod2[method] !== "function") {
        throw new Error(`Mod missing required method: ${method}`);
      }
    }
    return true;
  } catch (error) {
    console.error("Mod validation failed:", error);
    return false;
  }
}
class BaseProvider extends EventEmitter {
  constructor(chainInfo, config2) {
    super();
    this._isConnected = false;
    this._chainInfo = chainInfo;
    this.config = config2 || {};
    this.rpcUrl = config2?.rpcUrl || chainInfo.rpcUrls[0];
  }
  get chainInfo() {
    return this._chainInfo;
  }
  get isConnected() {
    return this._isConnected;
  }
  /**
   * Connect to the blockchain
   */
  async connect() {
    try {
      await this.getBlockNumber();
      this._isConnected = true;
      this.emit("connect", this._chainInfo.chainId);
    } catch (error) {
      this._isConnected = false;
      throw new Error(`Failed to connect to ${this._chainInfo.name}: ${error}`);
    }
  }
  /**
   * Disconnect from the blockchain
   */
  async disconnect() {
    this._isConnected = false;
    this.emit("disconnect");
  }
  /**
   * Make an RPC request
   */
  async rpcRequest(method, params = []) {
    const requestBody = {
      jsonrpc: "2.0",
      method,
      params,
      id: Date.now()
    };
    const headers = {
      "Content-Type": "application/json",
      ...this.config.headers
    };
    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }
    try {
      const response = await fetch(this.rpcUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message || "RPC request failed");
      }
      return data.result;
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }
  /**
   * Retry an RPC request with exponential backoff
   */
  async retryRpcRequest(method, params = []) {
    const maxRetries = this.config.retryCount || 3;
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.rpcRequest(method, params);
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1e3));
        }
      }
    }
    throw lastError;
  }
}
class ProviderError extends Error {
  constructor(message, code, data) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.data = data;
  }
}
var RpcErrorCode = /* @__PURE__ */ ((RpcErrorCode2) => {
  RpcErrorCode2[RpcErrorCode2["INVALID_REQUEST"] = -32600] = "INVALID_REQUEST";
  RpcErrorCode2[RpcErrorCode2["METHOD_NOT_FOUND"] = -32601] = "METHOD_NOT_FOUND";
  RpcErrorCode2[RpcErrorCode2["INVALID_PARAMS"] = -32602] = "INVALID_PARAMS";
  RpcErrorCode2[RpcErrorCode2["INTERNAL_ERROR"] = -32603] = "INTERNAL_ERROR";
  RpcErrorCode2[RpcErrorCode2["PARSE_ERROR"] = -32700] = "PARSE_ERROR";
  RpcErrorCode2[RpcErrorCode2["USER_REJECTED"] = 4001] = "USER_REJECTED";
  RpcErrorCode2[RpcErrorCode2["UNAUTHORIZED"] = 4100] = "UNAUTHORIZED";
  RpcErrorCode2[RpcErrorCode2["UNSUPPORTED_METHOD"] = 4200] = "UNSUPPORTED_METHOD";
  RpcErrorCode2[RpcErrorCode2["DISCONNECTED"] = 4900] = "DISCONNECTED";
  RpcErrorCode2[RpcErrorCode2["CHAIN_DISCONNECTED"] = 4901] = "CHAIN_DISCONNECTED";
  return RpcErrorCode2;
})(RpcErrorCode || {});
class EVMProvider extends BaseProvider {
  constructor(chainInfo, config2) {
    super(chainInfo, config2);
    this.accounts = [];
  }
  /**
   * Switch to a different chain
   */
  async switchChain(chainId) {
    try {
      if (this.config.customProvider) {
        await this.config.customProvider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${Number(chainId).toString(16)}` }]
        });
        return;
      }
      throw new ProviderError(
        "Chain switching not supported for RPC providers",
        RpcErrorCode.UNSUPPORTED_METHOD
      );
    } catch (error) {
      if (error.code === 4902) {
        throw new ProviderError(
          "Chain not added to wallet",
          RpcErrorCode.CHAIN_DISCONNECTED
        );
      }
      throw error;
    }
  }
  /**
   * Get accounts
   */
  async getAccounts() {
    if (this.config.customProvider) {
      const accounts = await this.config.customProvider.request({
        method: "eth_accounts",
        params: []
      });
      return accounts;
    }
    return this.accounts;
  }
  /**
   * Request accounts (triggers wallet connection)
   */
  async requestAccounts() {
    if (this.config.customProvider) {
      const accounts = await this.config.customProvider.request({
        method: "eth_requestAccounts",
        params: []
      });
      this.accounts = accounts;
      this.emit("accountsChanged", this.accounts);
      return this.accounts;
    }
    throw new ProviderError(
      "No wallet connected",
      RpcErrorCode.UNAUTHORIZED
    );
  }
  /**
   * Get balance
   */
  async getBalance(address, tokenAddress) {
    if (tokenAddress) {
      const data = this.encodeERC20Call("balanceOf", [address]);
      const result = await this.call({
        from: address,
        to: tokenAddress,
        data
      });
      return this.decodeUint256(result);
    }
    const balance = await this.rpcRequest("eth_getBalance", [address, "latest"]);
    return balance;
  }
  /**
   * Send transaction
   */
  async sendTransaction(tx) {
    const params = this.formatTransaction(tx);
    if (this.config.customProvider) {
      return await this.config.customProvider.request({
        method: "eth_sendTransaction",
        params: [params]
      });
    }
    return await this.rpcRequest("eth_sendTransaction", [params]);
  }
  /**
   * Sign transaction
   */
  async signTransaction(tx) {
    const params = this.formatTransaction(tx);
    if (this.config.customProvider) {
      return await this.config.customProvider.request({
        method: "eth_signTransaction",
        params: [params]
      });
    }
    throw new ProviderError(
      "Transaction signing requires a connected wallet",
      RpcErrorCode.UNAUTHORIZED
    );
  }
  /**
   * Get transaction
   */
  async getTransaction(hash) {
    const [tx, receipt] = await Promise.all([
      this.rpcRequest("eth_getTransactionByHash", [hash]),
      this.rpcRequest("eth_getTransactionReceipt", [hash])
    ]);
    if (!tx) {
      throw new ProviderError("Transaction not found", RpcErrorCode.INVALID_REQUEST);
    }
    const currentBlock = await this.getBlockNumber();
    const confirmations = receipt ? currentBlock - parseInt(receipt.blockNumber, 16) : 0;
    return {
      hash,
      status: receipt ? receipt.status === "0x1" ? "confirmed" : "failed" : "pending",
      confirmations,
      blockNumber: receipt ? parseInt(receipt.blockNumber, 16) : void 0,
      timestamp: Date.now(),
      // Would need to fetch block for actual timestamp
      gasUsed: receipt ? receipt.gasUsed : void 0,
      effectiveGasPrice: receipt ? receipt.effectiveGasPrice : void 0,
      error: receipt && receipt.status === "0x0" ? "Transaction failed" : void 0
    };
  }
  /**
   * Estimate gas
   */
  async estimateGas(tx) {
    const params = this.formatTransaction(tx);
    return await this.rpcRequest("eth_estimateGas", [params]);
  }
  /**
   * Get gas price
   */
  async getGasPrice() {
    return await this.rpcRequest("eth_gasPrice", []);
  }
  /**
   * Sign message
   */
  async signMessage(request) {
    let signature;
    if (this.config.customProvider) {
      signature = await this.config.customProvider.request({
        method: "personal_sign",
        params: [request.data, request.from]
      });
    } else {
      throw new ProviderError(
        "Message signing requires a connected wallet",
        RpcErrorCode.UNAUTHORIZED
      );
    }
    return {
      signature,
      signatureType: "personal_sign",
      address: request.from,
      timestamp: Date.now()
    };
  }
  /**
   * Sign typed data
   */
  async signTypedData(request) {
    let signature;
    if (this.config.customProvider) {
      signature = await this.config.customProvider.request({
        method: request.type || "eth_signTypedData_v4",
        params: [request.from, request.data]
      });
    } else {
      throw new ProviderError(
        "Typed data signing requires a connected wallet",
        RpcErrorCode.UNAUTHORIZED
      );
    }
    return {
      signature,
      signatureType: request.type || "eth_signTypedData_v4",
      address: request.from,
      timestamp: Date.now()
    };
  }
  /**
   * Get block number
   */
  async getBlockNumber() {
    const blockNumber = await this.rpcRequest("eth_blockNumber", []);
    return parseInt(blockNumber, 16);
  }
  /**
   * Get block
   */
  async getBlock(blockHashOrNumber) {
    const block = await this.rpcRequest("eth_getBlockByNumber", [
      typeof blockHashOrNumber === "number" ? `0x${blockHashOrNumber.toString(16)}` : blockHashOrNumber,
      false
      // Don't include full transactions
    ]);
    if (!block) {
      throw new ProviderError("Block not found", RpcErrorCode.INVALID_REQUEST);
    }
    return {
      number: parseInt(block.number, 16),
      hash: block.hash,
      parentHash: block.parentHash,
      timestamp: parseInt(block.timestamp, 16),
      transactions: block.transactions,
      gasLimit: block.gasLimit,
      gasUsed: block.gasUsed,
      baseFeePerGas: block.baseFeePerGas
    };
  }
  /**
   * Get transaction count (nonce)
   */
  async getTransactionCount(address) {
    const count = await this.rpcRequest("eth_getTransactionCount", [address, "latest"]);
    return parseInt(count, 16);
  }
  /**
   * Call contract method
   */
  async call(tx) {
    const params = this.formatTransaction(tx);
    return await this.rpcRequest("eth_call", [params, "latest"]);
  }
  // EVM-specific methods
  /**
   * Get max priority fee per gas
   */
  async getMaxPriorityFeePerGas() {
    return await this.rpcRequest("eth_maxPriorityFeePerGas", []);
  }
  /**
   * Get fee history
   */
  async getFeeHistory(blockCount, newestBlock, rewardPercentiles) {
    return await this.rpcRequest("eth_feeHistory", [
      `0x${blockCount.toString(16)}`,
      typeof newestBlock === "number" ? `0x${newestBlock.toString(16)}` : newestBlock,
      rewardPercentiles
    ]);
  }
  /**
   * Resolve ENS name
   */
  async resolveName(ensName) {
    try {
      const address = await this.rpcRequest("eth_call", [
        {
          to: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
          // ENS Registry
          data: this.encodeENSResolve(ensName)
        },
        "latest"
      ]);
      return address === "0x" ? null : address;
    } catch {
      return null;
    }
  }
  /**
   * Lookup address (reverse ENS)
   */
  async lookupAddress(address) {
    return null;
  }
  /**
   * Get code at address
   */
  async getCode(address) {
    return await this.rpcRequest("eth_getCode", [address, "latest"]);
  }
  /**
   * Get storage at position
   */
  async getStorageAt(address, position) {
    return await this.rpcRequest("eth_getStorageAt", [address, position, "latest"]);
  }
  /**
   * Get logs
   */
  async getLogs(filter) {
    const params = {
      ...filter,
      fromBlock: filter.fromBlock ? typeof filter.fromBlock === "number" ? `0x${filter.fromBlock.toString(16)}` : filter.fromBlock : "latest",
      toBlock: filter.toBlock ? typeof filter.toBlock === "number" ? `0x${filter.toBlock.toString(16)}` : filter.toBlock : "latest"
    };
    return await this.rpcRequest("eth_getLogs", [params]);
  }
  /**
   * EIP-1193 request method
   */
  async request(args) {
    if (this.config.customProvider) {
      return await this.config.customProvider.request(args);
    }
    return await this.rpcRequest(args.method, args.params || []);
  }
  // Helper methods
  formatTransaction(tx) {
    const formatted = {
      from: tx.from,
      to: tx.to,
      value: tx.value ? `0x${BigInt(tx.value).toString(16)}` : void 0,
      data: tx.data,
      nonce: tx.nonce ? `0x${tx.nonce.toString(16)}` : void 0
    };
    if (tx.gas) {
      formatted.gas = `0x${BigInt(tx.gas).toString(16)}`;
    }
    if (tx.gasPrice) {
      formatted.gasPrice = `0x${BigInt(tx.gasPrice).toString(16)}`;
    }
    if (tx.maxFeePerGas) {
      formatted.maxFeePerGas = `0x${BigInt(tx.maxFeePerGas).toString(16)}`;
    }
    if (tx.maxPriorityFeePerGas) {
      formatted.maxPriorityFeePerGas = `0x${BigInt(tx.maxPriorityFeePerGas).toString(16)}`;
    }
    return formatted;
  }
  encodeERC20Call(method, params) {
    const methodId = {
      "balanceOf": "0x70a08231",
      "transfer": "0xa9059cbb",
      "approve": "0x095ea7b3"
    }[method];
    if (!methodId) {
      throw new Error(`Unknown ERC20 method: ${method}`);
    }
    return methodId + params.map((p) => p.slice(2).padStart(64, "0")).join("");
  }
  decodeUint256(hex) {
    return BigInt(hex).toString();
  }
  encodeENSResolve(name) {
    return "0x" + name;
  }
}
class ProviderFactory {
  constructor() {
    this.providers = /* @__PURE__ */ new Map();
    this.supportedChains = /* @__PURE__ */ new Map();
  }
  /**
   * Register a provider type
   */
  registerProvider(chainType, constructor) {
    this.providers.set(chainType, constructor);
  }
  /**
   * Register a supported chain
   */
  registerChain(chainInfo) {
    this.supportedChains.set(chainInfo.chainId, chainInfo);
  }
  /**
   * Create a provider instance
   */
  createProvider(chainInfo, config2) {
    const ProviderClass = this.providers.get(chainInfo.type);
    if (!ProviderClass) {
      throw new Error(`No provider registered for chain type: ${chainInfo.type}`);
    }
    return new ProviderClass(chainInfo, config2);
  }
  /**
   * Get all supported chains
   */
  getSupportedChains() {
    return Array.from(this.supportedChains.values());
  }
  /**
   * Check if a chain is supported
   */
  isChainSupported(chainId) {
    return this.supportedChains.has(chainId);
  }
  /**
   * Get chain info by ID
   */
  getChainInfo(chainId) {
    return this.supportedChains.get(chainId);
  }
  /**
   * Clear all registrations
   */
  clear() {
    this.providers.clear();
    this.supportedChains.clear();
  }
}
const providerFactory = new ProviderFactory();
const DEFAULT_CHAINS = [
  {
    chainId: 1,
    name: "Ethereum Mainnet",
    type: ChainType.EVM,
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrls: ["https://eth.llamarpc.com"],
    blockExplorerUrls: ["https://etherscan.io"],
    isTestnet: false,
    chainReference: "ethereum"
  },
  {
    chainId: 137,
    name: "Polygon",
    type: ChainType.EVM,
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18
    },
    rpcUrls: ["https://polygon-rpc.com"],
    blockExplorerUrls: ["https://polygonscan.com"],
    isTestnet: false,
    chainReference: "polygon"
  },
  {
    chainId: 56,
    name: "BNB Smart Chain",
    type: ChainType.EVM,
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18
    },
    rpcUrls: ["https://bsc-dataseed.binance.org"],
    blockExplorerUrls: ["https://bscscan.com"],
    isTestnet: false,
    chainReference: "bsc"
  },
  {
    chainId: 43114,
    name: "Avalanche C-Chain",
    type: ChainType.EVM,
    nativeCurrency: {
      name: "AVAX",
      symbol: "AVAX",
      decimals: 18
    },
    rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"],
    blockExplorerUrls: ["https://snowtrace.io"],
    isTestnet: false,
    chainReference: "avalanche"
  },
  {
    chainId: 42161,
    name: "Arbitrum One",
    type: ChainType.EVM,
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrls: ["https://arb1.arbitrum.io/rpc"],
    blockExplorerUrls: ["https://arbiscan.io"],
    isTestnet: false,
    chainReference: "arbitrum"
  },
  {
    chainId: 10,
    name: "Optimism",
    type: ChainType.EVM,
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrls: ["https://mainnet.optimism.io"],
    blockExplorerUrls: ["https://optimistic.etherscan.io"],
    isTestnet: false,
    chainReference: "optimism"
  },
  // Testnets
  {
    chainId: 11155111,
    name: "Sepolia",
    type: ChainType.EVM,
    nativeCurrency: {
      name: "Sepolia Ether",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrls: ["https://rpc.sepolia.org"],
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
    isTestnet: true,
    chainReference: "sepolia"
  },
  {
    chainId: 80001,
    name: "Mumbai",
    type: ChainType.EVM,
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18
    },
    rpcUrls: ["https://rpc-mumbai.maticvigil.com"],
    blockExplorerUrls: ["https://mumbai.polygonscan.com"],
    isTestnet: true,
    chainReference: "mumbai"
  }
];
function initializeDefaultChains() {
  DEFAULT_CHAINS.forEach((chain) => {
    providerFactory.registerChain(chain);
  });
}
function initializeDefaultProviders() {
  providerFactory.registerProvider(ChainType.EVM, EVMProvider);
  initializeDefaultChains();
}
class EVMTransactionBuilder {
  constructor() {
    this.tx = {};
  }
  /**
   * Reset the builder
   */
  reset() {
    this.tx = {};
  }
  /**
   * Set from address
   */
  setFrom(address) {
    this.tx.from = address;
    return this;
  }
  /**
   * Set to address
   */
  setTo(address) {
    this.tx.to = address;
    return this;
  }
  /**
   * Set value
   */
  setValue(value) {
    this.tx.value = value;
    return this;
  }
  /**
   * Set data
   */
  setData(data) {
    this.tx.data = data;
    return this;
  }
  /**
   * Set nonce
   */
  setNonce(nonce) {
    this.tx.nonce = nonce;
    return this;
  }
  /**
   * Set gas limit
   */
  setGas(gas) {
    this.tx.gas = gas;
    return this;
  }
  /**
   * Set gas price (legacy)
   */
  setGasPrice(gasPrice) {
    this.tx.gasPrice = gasPrice;
    this.tx.type = 0;
    return this;
  }
  /**
   * Set max fee per gas (EIP-1559)
   */
  setMaxFeePerGas(maxFee) {
    this.tx.maxFeePerGas = maxFee;
    this.tx.type = 2;
    return this;
  }
  /**
   * Set max priority fee per gas (EIP-1559)
   */
  setMaxPriorityFeePerGas(maxPriorityFee) {
    this.tx.maxPriorityFeePerGas = maxPriorityFee;
    this.tx.type = 2;
    return this;
  }
  /**
   * Set transaction type
   */
  setType(type) {
    this.tx.type = type;
    return this;
  }
  /**
   * Set access list (EIP-2930)
   */
  setAccessList(accessList) {
    this.tx.accessList = accessList;
    if (this.tx.type === 0) {
      this.tx.type = 1;
    }
    return this;
  }
  /**
   * Set chain ID
   */
  setChainId(chainId) {
    this.tx.chainId = chainId;
    return this;
  }
  /**
   * Build the transaction
   */
  build() {
    const validation = this.validate();
    if (!validation.valid) {
      throw new Error(`Invalid transaction: ${validation.errors?.join(", ")}`);
    }
    const tx = {
      from: this.tx.from,
      to: this.tx.to,
      value: this.tx.value || "0",
      data: this.tx.data,
      nonce: this.tx.nonce,
      chainId: this.tx.chainId,
      gas: this.tx.gas,
      type: this.tx.type || 0,
      accessList: this.tx.accessList
    };
    if (this.tx.type === 2) {
      tx.maxFeePerGas = this.tx.maxFeePerGas;
      tx.maxPriorityFeePerGas = this.tx.maxPriorityFeePerGas;
    } else {
      tx.gasPrice = this.tx.gasPrice;
    }
    return tx;
  }
  /**
   * Validate the transaction
   */
  validate() {
    const errors = [];
    const warnings = [];
    if (!this.tx.from) {
      errors.push("From address is required");
    }
    if (this.tx.from && !this.isValidAddress(this.tx.from)) {
      errors.push("Invalid from address");
    }
    if (this.tx.to && !this.isValidAddress(this.tx.to)) {
      errors.push("Invalid to address");
    }
    if (this.tx.value) {
      try {
        const valueBigInt = BigInt(this.tx.value);
        if (valueBigInt < 0n) {
          errors.push("Value cannot be negative");
        }
      } catch {
        errors.push("Invalid value format");
      }
    }
    if (this.tx.gas) {
      try {
        const gasBigInt = BigInt(this.tx.gas);
        if (gasBigInt <= 0n) {
          errors.push("Gas must be positive");
        }
        if (gasBigInt < 21000n) {
          warnings.push("Gas limit may be too low");
        }
      } catch {
        errors.push("Invalid gas format");
      }
    }
    if (this.tx.type === 2) {
      if (!this.tx.maxFeePerGas) {
        errors.push("Max fee per gas is required for EIP-1559 transactions");
      }
      if (!this.tx.maxPriorityFeePerGas) {
        errors.push("Max priority fee per gas is required for EIP-1559 transactions");
      }
      if (this.tx.maxFeePerGas && this.tx.maxPriorityFeePerGas) {
        try {
          const maxFee = BigInt(this.tx.maxFeePerGas);
          const maxPriority = BigInt(this.tx.maxPriorityFeePerGas);
          if (maxPriority > maxFee) {
            errors.push("Max priority fee cannot exceed max fee");
          }
        } catch {
          errors.push("Invalid gas fee format");
        }
      }
    } else {
      if (!this.tx.gasPrice && !this.tx.to) {
        warnings.push("Gas price not set for contract deployment");
      }
    }
    if (this.tx.data && !this.isValidHexString(this.tx.data)) {
      errors.push("Invalid data format");
    }
    if (!this.tx.to && !this.tx.data) {
      errors.push("Contract creation requires data");
    }
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : void 0,
      warnings: warnings.length > 0 ? warnings : void 0
    };
  }
  /**
   * Check if address is valid
   */
  isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
  /**
   * Check if hex string is valid
   */
  isValidHexString(hex) {
    return /^0x[a-fA-F0-9]*$/.test(hex);
  }
}
class Container {
  constructor() {
    this.services = /* @__PURE__ */ new Map();
    this.resolving = /* @__PURE__ */ new Set();
  }
  /**
   * Register a service
   */
  register(token, factory, options) {
    this.services.set(token, {
      token,
      factory,
      singleton: options?.singleton ?? true,
      dependencies: options?.dependencies
    });
  }
  /**
   * Register a singleton value
   */
  registerValue(token, value) {
    this.services.set(token, {
      token,
      factory: () => value,
      singleton: true,
      instance: value
    });
  }
  /**
   * Register a class
   */
  registerClass(token, constructor, options) {
    this.register(
      token,
      () => {
        const deps = options?.dependencies || [];
        const args = deps.map((dep) => this.get(dep));
        return new constructor(...args);
      },
      options
    );
  }
  /**
   * Register a factory function
   */
  registerFactory(token, factory, options) {
    this.register(
      token,
      () => factory(this),
      options
    );
  }
  /**
   * Get a service
   */
  get(token) {
    const descriptor = this.services.get(token);
    if (!descriptor) {
      throw new Error(`Service not registered: ${String(token)}`);
    }
    if (this.resolving.has(token)) {
      throw new Error(`Circular dependency detected: ${String(token)}`);
    }
    if (descriptor.singleton && descriptor.instance) {
      return descriptor.instance;
    }
    try {
      this.resolving.add(token);
      if (descriptor.dependencies) {
        for (const dep of descriptor.dependencies) {
          if (!this.has(dep)) {
            throw new Error(`Missing dependency: ${String(dep)} for ${String(token)}`);
          }
        }
      }
      const instance = descriptor.factory();
      if (descriptor.singleton) {
        descriptor.instance = instance;
      }
      return instance;
    } finally {
      this.resolving.delete(token);
    }
  }
  /**
   * Check if a service is registered
   */
  has(token) {
    return this.services.has(token);
  }
  /**
   * Try to get a service
   */
  tryGet(token) {
    try {
      return this.get(token);
    } catch {
      return void 0;
    }
  }
  /**
   * Get all services of a type
   */
  getAll(tokens) {
    return tokens.filter((token) => this.has(token)).map((token) => this.get(token));
  }
  /**
   * Clear all registrations
   */
  clear() {
    this.services.clear();
    this.resolving.clear();
  }
  /**
   * Remove a service
   */
  unregister(token) {
    return this.services.delete(token);
  }
  /**
   * Create a child container
   */
  createScope() {
    const child = new Container();
    for (const [token, descriptor] of this.services) {
      child.services.set(token, {
        ...descriptor,
        instance: void 0
        // Don't copy singleton instances
      });
    }
    return child;
  }
  /**
   * Get service metadata
   */
  getMetadata(token) {
    return this.services.get(token);
  }
  /**
   * List all registered tokens
   */
  listTokens() {
    return Array.from(this.services.keys());
  }
}
const defaultContainer = new Container();
function Service(token) {
  return function(target) {
    const actualToken = token || target.name;
    defaultContainer.registerClass(actualToken, target);
    return target;
  };
}
function Injectable(options) {
  return function(target) {
    const token = options?.token || target.name;
    defaultContainer.registerClass(token, target, {
      singleton: options?.singleton ?? true
    });
    return target;
  };
}
function Inject(token) {
  return function(target, propertyKey) {
    Object.defineProperty(target, propertyKey, {
      get: () => defaultContainer.get(token),
      enumerable: true,
      configurable: true
    });
  };
}
class ServiceLocator {
  constructor(container = defaultContainer) {
    this.container = container;
  }
  get(token) {
    return this.container.get(token);
  }
  has(token) {
    return this.container.has(token);
  }
  tryGet(token) {
    return this.container.tryGet(token);
  }
}
const InjectionTokens = {
  LOGGER: Symbol("Logger"),
  CACHE: Symbol("Cache"),
  STORAGE: Symbol("Storage"),
  HTTP_CLIENT: Symbol("HttpClient"),
  EVENT_BUS: Symbol("EventBus"),
  CONFIG: Symbol("Config"),
  CRYPTO: Symbol("Crypto"),
  PROVIDER: Symbol("Provider"),
  WALLET: Symbol("Wallet"),
  TRANSACTION_MANAGER: Symbol("TransactionManager")
};
class ServiceFactory {
  constructor(config2) {
    this.services = /* @__PURE__ */ new Map();
    this.eventEmitter = new EventEmitter();
    this.config = config2 || {};
    this.container = config2?.container || new Container();
    if (config2?.healthCheckInterval) {
      this.startHealthCheck(config2.healthCheckInterval);
    }
  }
  /**
   * Register a service
   */
  register(service) {
    if (this.services.has(service.name)) {
      throw new Error(`Service already registered: ${service.name}`);
    }
    this.services.set(service.name, service);
    this.container.registerValue(service.name, service);
    this.eventEmitter.emit("service:registered", service);
    if (this.config.autoStart) {
      this.startService(service);
    }
  }
  /**
   * Register a service class
   */
  registerClass(ServiceClass, dependencies) {
    const service = new ServiceClass(...dependencies || []);
    this.register(service);
  }
  /**
   * Register a service factory
   */
  registerFactory(name, factory) {
    this.container.registerFactory(name, () => {
      const service = factory();
      this.services.set(service.name, service);
      return service;
    });
  }
  /**
   * Unregister a service
   */
  unregister(serviceName) {
    const service = this.services.get(serviceName);
    if (service) {
      if (service.isRunning()) {
        service.stop();
      }
      this.services.delete(serviceName);
      this.container.unregister(serviceName);
      this.eventEmitter.emit("service:unregistered", serviceName);
    }
  }
  /**
   * Get a service
   */
  get(serviceName) {
    return this.services.get(serviceName);
  }
  /**
   * Get a service (type-safe)
   */
  getService(serviceName) {
    return this.services.get(serviceName);
  }
  /**
   * Get all services
   */
  getAll() {
    return Array.from(this.services.values());
  }
  /**
   * Start a service
   */
  async startService(service) {
    try {
      if (!service.isRunning()) {
        await service.initialize();
      }
      if (this.isLifecycleService(service)) {
        await service.beforeStart?.();
      }
      await service.start();
      if (this.isLifecycleService(service)) {
        await service.afterStart?.();
      }
      this.eventEmitter.emit("service:started", service.name);
    } catch (error) {
      this.eventEmitter.emit("service:error", { service: service.name, error });
      if (this.isLifecycleService(service)) {
        service.onError?.(error);
      }
      throw error;
    }
  }
  /**
   * Stop a service
   */
  async stopService(service) {
    try {
      if (this.isLifecycleService(service)) {
        await service.beforeStop?.();
      }
      await service.stop();
      if (this.isLifecycleService(service)) {
        await service.afterStop?.();
      }
      this.eventEmitter.emit("service:stopped", service.name);
    } catch (error) {
      this.eventEmitter.emit("service:error", { service: service.name, error });
      if (this.isLifecycleService(service)) {
        service.onError?.(error);
      }
      throw error;
    }
  }
  /**
   * Start all services
   */
  async startAll() {
    const startPromises = Array.from(this.services.values()).filter((service) => !service.isRunning()).map((service) => this.startService(service));
    await Promise.all(startPromises);
  }
  /**
   * Stop all services
   */
  async stopAll() {
    const stopPromises = Array.from(this.services.values()).filter((service) => service.isRunning()).map((service) => this.stopService(service));
    await Promise.all(stopPromises);
  }
  /**
   * Get health status of all services
   */
  getHealth() {
    return Array.from(this.services.values()).map((service) => ({
      service: service.name,
      status: this.getServiceStatus(service),
      lastCheck: Date.now(),
      uptime: service.isRunning() ? this.getServiceUptime(service) : void 0,
      errors: 0
      // Would need to track this
    }));
  }
  /**
   * Get service status
   */
  getServiceStatus(service) {
    if (!service.isRunning()) {
      return "unhealthy";
    }
    return "healthy";
  }
  /**
   * Get service uptime
   */
  getServiceUptime(service) {
    return Date.now();
  }
  /**
   * Check if service is lifecycle service
   */
  isLifecycleService(service) {
    return "beforeStart" in service || "afterStart" in service;
  }
  /**
   * Start health check timer
   */
  startHealthCheck(interval) {
    this.healthCheckTimer = setInterval(() => {
      const health = this.getHealth();
      this.eventEmitter.emit("health:check", health);
      const unhealthy = health.filter((h) => h.status === "unhealthy");
      if (unhealthy.length > 0) {
        this.eventEmitter.emit("health:unhealthy", unhealthy);
      }
    }, interval);
  }
  /**
   * Stop health check timer
   */
  stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = void 0;
    }
  }
  /**
   * Destroy the factory
   */
  async destroy() {
    this.stopHealthCheck();
    await this.stopAll();
    this.services.clear();
    this.container.clear();
    this.eventEmitter.removeAllListeners();
  }
  /**
   * Subscribe to events
   */
  on(event, handler) {
    this.eventEmitter.on(event, handler);
  }
  /**
   * Unsubscribe from events
   */
  off(event, handler) {
    this.eventEmitter.off(event, handler);
  }
  /**
   * Get the DI container
   */
  getContainer() {
    return this.container;
  }
}
function createServiceFactory(config2) {
  const factory = new ServiceFactory(config2);
  const container = factory.getContainer();
  container.registerFactory(InjectionTokens.CACHE, (provider) => {
    return {};
  });
  return factory;
}
const globalServiceFactory = createServiceFactory({
  autoStart: false,
  healthCheckInterval: 6e4
  // 1 minute
});
class MessageRouter {
  constructor() {
    this.routes = /* @__PURE__ */ new Map();
    this.middlewares = [];
  }
  /**
   * Route a message to appropriate handler
   */
  async route(message) {
    try {
      await this.runMiddleware("before", message);
      const handler = this.findHandler(message.channel);
      if (!handler) {
        if (this.defaultHandler) {
          await this.defaultHandler(message);
        } else {
          throw new Error(`No handler found for channel: ${message.channel}`);
        }
        return;
      }
      const response = await handler(message);
      await this.runAfterMiddleware(message, response);
      return response;
    } catch (error) {
      await this.runErrorMiddleware(error, message);
      throw error;
    }
  }
  /**
   * Register a route handler
   */
  registerRoute(pattern, handler) {
    this.routes.set(pattern, handler);
  }
  /**
   * Unregister a route
   */
  unregisterRoute(pattern) {
    this.routes.delete(pattern);
  }
  /**
   * Set default handler for unmatched routes
   */
  setDefaultHandler(handler) {
    this.defaultHandler = handler;
  }
  /**
   * Add middleware
   */
  use(middleware) {
    this.middlewares.push(middleware);
  }
  /**
   * Get all registered routes
   */
  getRoutes() {
    return new Map(this.routes);
  }
  /**
   * Find handler for channel
   */
  findHandler(channel) {
    if (this.routes.has(channel)) {
      return this.routes.get(channel);
    }
    for (const [pattern, handler] of this.routes) {
      if (pattern instanceof RegExp && pattern.test(channel)) {
        return handler;
      }
      if (typeof pattern === "string" && this.matchPattern(pattern, channel)) {
        return handler;
      }
    }
    return void 0;
  }
  /**
   * Match wildcard pattern
   */
  matchPattern(pattern, channel) {
    const regex = new RegExp(
      "^" + pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
    );
    return regex.test(channel);
  }
  /**
   * Run before middleware
   */
  async runMiddleware(phase, message) {
    for (const middleware of this.middlewares) {
      if (middleware.before) {
        await new Promise((resolve, reject) => {
          middleware.before(message, async () => {
            resolve();
          }).catch(reject);
        });
      }
    }
  }
  /**
   * Run after middleware
   */
  async runAfterMiddleware(message, response) {
    for (const middleware of this.middlewares) {
      if (middleware.after) {
        await new Promise((resolve, reject) => {
          middleware.after(message, response, async () => {
            resolve();
          }).catch(reject);
        });
      }
    }
  }
  /**
   * Run error middleware
   */
  async runErrorMiddleware(error, message) {
    for (const middleware of this.middlewares) {
      if (middleware.error) {
        await new Promise((resolve, reject) => {
          middleware.error(error, message, async () => {
            resolve();
          }).catch(reject);
        });
      }
    }
  }
  /**
   * Clear all routes and middleware
   */
  clear() {
    this.routes.clear();
    this.middlewares = [];
    this.defaultHandler = void 0;
  }
}
function createMessageRouter() {
  return new MessageRouter();
}
const loggingMiddleware = {
  name: "logging",
  before: async (message, next) => {
    console.log(`[MessageRouter] Routing message:`, {
      channel: message.channel,
      type: message.type,
      id: message.id
    });
    await next();
  },
  after: async (message, response, next) => {
    console.log(`[MessageRouter] Message handled:`, {
      channel: message.channel,
      hasResponse: response !== void 0
    });
    await next();
  },
  error: async (error, message, next) => {
    console.error(`[MessageRouter] Error handling message:`, {
      channel: message.channel,
      error: error.message
    });
    await next();
  }
};
function createValidationMiddleware(validator) {
  return {
    name: "validation",
    before: async (message, next) => {
      if (!validator(message)) {
        throw new Error(`Message validation failed for channel: ${message.channel}`);
      }
      await next();
    }
  };
}
function createRateLimitMiddleware(maxRequests, windowMs) {
  const requests = /* @__PURE__ */ new Map();
  return {
    name: "rate-limit",
    before: async (message, next) => {
      const key = message.sender?.id || "anonymous";
      const now = Date.now();
      const windowStart = now - windowMs;
      let timestamps = requests.get(key) || [];
      timestamps = timestamps.filter((t) => t > windowStart);
      if (timestamps.length >= maxRequests) {
        throw new Error(`Rate limit exceeded for ${key}`);
      }
      timestamps.push(now);
      requests.set(key, timestamps);
      await next();
    }
  };
}
function createRetryMiddleware(maxRetries = 3, retryDelay = 1e3) {
  return {
    name: "retry",
    error: async (error, message, next) => {
      const retryCount = message.retryCount || 0;
      if (retryCount < maxRetries) {
        console.log(`[Retry] Retrying message (${retryCount + 1}/${maxRetries}):`, message.channel);
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (retryCount + 1)));
        message.retryCount = retryCount + 1;
        throw error;
      }
      await next();
    }
  };
}
class MessageChannel {
  constructor(id, bus) {
    this.id = id;
    this.bus = bus;
    this._isOpen = true;
  }
  async send(data) {
    if (!this._isOpen) {
      throw new Error(`Channel ${this.id} is closed`);
    }
    await this.bus.send(this.id, data);
  }
  onMessage(handler) {
    return this.bus.onMessage(this.id, handler);
  }
  close() {
    this._isOpen = false;
    this.bus.closeChannel(this.id);
  }
  isOpen() {
    return this._isOpen;
  }
}
class MessageStream {
  constructor(id, bus) {
    this.id = id;
    this.bus = bus;
    this.observers = /* @__PURE__ */ new Set();
    this.state = StreamState.IDLE;
    this.buffer = [];
  }
  async write(data) {
    if (this.state !== StreamState.ACTIVE && this.state !== StreamState.IDLE) {
      throw new Error(`Stream ${this.id} is not active`);
    }
    this.state = StreamState.ACTIVE;
    this.buffer.push(data);
    for (const observer of this.observers) {
      try {
        observer.next(data);
      } catch (error) {
        console.error("Stream observer error:", error);
      }
    }
    await this.bus.send(`stream:${this.id}`, {
      type: "data",
      data
    });
  }
  async end() {
    if (this.state === StreamState.COMPLETED || this.state === StreamState.ABORTED) {
      return;
    }
    this.state = StreamState.COMPLETED;
    for (const observer of this.observers) {
      try {
        observer.complete?.();
      } catch (error) {
        console.error("Stream observer error:", error);
      }
    }
    await this.bus.send(`stream:${this.id}`, {
      type: "end"
    });
  }
  abort(error) {
    if (this.state === StreamState.COMPLETED || this.state === StreamState.ABORTED) {
      return;
    }
    this.state = StreamState.ABORTED;
    this.error = error;
    for (const observer of this.observers) {
      try {
        observer.error?.(error || new Error("Stream aborted"));
      } catch (err) {
        console.error("Stream observer error:", err);
      }
    }
    this.bus.send(`stream:${this.id}`, {
      type: "error",
      error: error?.message
    });
  }
  subscribe(observer) {
    this.observers.add(observer);
    for (const data of this.buffer) {
      try {
        observer.next(data);
      } catch (error) {
        console.error("Stream observer error:", error);
      }
    }
    if (this.state === StreamState.COMPLETED) {
      observer.complete?.();
    } else if (this.state === StreamState.ABORTED) {
      observer.error?.(this.error || new Error("Stream aborted"));
    }
    return () => {
      this.observers.delete(observer);
    };
  }
  getState() {
    return this.state;
  }
}
class MessageBus extends EventEmitter {
  constructor() {
    super();
    this.channels = /* @__PURE__ */ new Map();
    this.streams = /* @__PURE__ */ new Map();
    this.metrics = {
      messagesSent: 0,
      messagesReceived: 0,
      messagesDropped: 0,
      averageLatency: 0,
      activeChannels: 0,
      activeStreams: 0,
      errors: 0,
      lastActivity: Date.now()
    };
    this.messageHandlers = /* @__PURE__ */ new Map();
    this.messageIdCounter = 0;
    this.pendingRequests = /* @__PURE__ */ new Map();
    this.router = new MessageRouter();
    this.setupDefaultRoutes();
  }
  /**
   * Get or create a message channel
   */
  channel(id) {
    if (!this.channels.has(id)) {
      const channel = new MessageChannel(id, this);
      this.channels.set(id, channel);
      this.metrics.activeChannels++;
    }
    return this.channels.get(id);
  }
  /**
   * Create a message stream
   */
  createStream(id) {
    const streamId = id || `stream-${Date.now()}-${Math.random()}`;
    const stream = new MessageStream(streamId, this);
    this.streams.set(streamId, stream);
    this.metrics.activeStreams++;
    return stream;
  }
  /**
   * Get existing stream
   */
  getStream(id) {
    return this.streams.get(id);
  }
  /**
   * Request-response with timeout
   */
  async request(channel, data, timeout = 5e3) {
    const messageId = this.generateMessageId();
    const correlationId = `req-${messageId}`;
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        reject(new Error(`Request timeout for channel: ${channel}`));
      }, timeout);
      this.pendingRequests.set(correlationId, {
        resolve,
        reject,
        timeout: timeoutHandle
      });
      const message = {
        id: messageId,
        channel,
        data,
        type: MessageType.REQUEST,
        correlationId,
        replyTo: `response:${correlationId}`,
        timestamp: Date.now()
      };
      this.send(channel, data, message).catch(reject);
    });
  }
  /**
   * Send a message
   */
  async send(channel, data, envelope) {
    const message = {
      id: envelope?.id || this.generateMessageId(),
      channel,
      data,
      type: envelope?.type || MessageType.EVENT,
      timestamp: Date.now(),
      ...envelope
    };
    this.metrics.messagesSent++;
    this.metrics.lastActivity = Date.now();
    if (this.validator) {
      const validation = this.validator.validate(message);
      if (!validation.valid) {
        this.metrics.messagesDropped++;
        throw new Error(`Message validation failed: ${validation.errors?.map((e) => e.message).join(", ")}`);
      }
    }
    try {
      await this.router.route(message);
      this.emitLocal(channel, message);
      if (message.correlationId && this.pendingRequests.has(message.correlationId)) {
        const pending = this.pendingRequests.get(message.correlationId);
        if (pending) {
          clearTimeout(pending.timeout);
          pending.resolve(data);
          this.pendingRequests.delete(message.correlationId);
        }
      }
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }
  /**
   * Subscribe to messages (renamed to avoid EventEmitter conflict)
   */
  onMessage(event, handler) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, /* @__PURE__ */ new Set());
    }
    const handlers = this.messageHandlers.get(event);
    handlers.add(handler);
    this.router.registerRoute(event, handler);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.messageHandlers.delete(event);
        this.router.unregisterRoute(event);
      }
    };
  }
  /**
   * Emit a message (renamed to avoid EventEmitter conflict)
   */
  emitMessage(event, data) {
    this.send(event, data, { type: MessageType.EVENT });
  }
  /**
   * Get message router
   */
  getRouter() {
    return this.router;
  }
  /**
   * Get message validator
   */
  getValidator() {
    if (!this.validator) {
      throw new Error("No validator configured");
    }
    return this.validator;
  }
  /**
   * Set message validator
   */
  setValidator(validator) {
    this.validator = validator;
  }
  /**
   * Add global middleware
   */
  use(middleware) {
    this.router.use(middleware);
  }
  /**
   * Get metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }
  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      messagesSent: 0,
      messagesReceived: 0,
      messagesDropped: 0,
      averageLatency: 0,
      activeChannels: this.channels.size,
      activeStreams: this.streams.size,
      errors: 0,
      lastActivity: Date.now()
    };
  }
  /**
   * Close a channel
   */
  closeChannel(id) {
    if (this.channels.has(id)) {
      this.channels.delete(id);
      this.metrics.activeChannels--;
    }
  }
  /**
   * Emit to local listeners
   */
  emitLocal(channel, message) {
    const handlers = this.messageHandlers.get(channel);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(message);
        } catch (error) {
          console.error("Handler error:", error);
        }
      }
    }
  }
  /**
   * Generate message ID
   */
  generateMessageId() {
    return `msg-${Date.now()}-${++this.messageIdCounter}`;
  }
  /**
   * Setup default routes
   */
  setupDefaultRoutes() {
    this.router.registerRoute("ping", async (message) => {
      const envelope = message;
      await this.send("pong", { timestamp: Date.now() }, {
        correlationId: envelope.correlationId,
        type: MessageType.PONG
      });
    });
    this.router.registerRoute(/^stream:.*/, async (message) => {
      const streamId = message.channel.replace("stream:", "");
      const stream = this.streams.get(streamId);
      if (stream && message.data) {
        const { type, data } = message.data;
        if (type === "data") {
          this.metrics.messagesReceived++;
        } else if (type === "end") {
          this.streams.delete(streamId);
          this.metrics.activeStreams--;
        } else if (type === "error") {
          this.streams.delete(streamId);
          this.metrics.activeStreams--;
          this.metrics.errors++;
        }
      }
    });
  }
  /**
   * Destroy the message bus
   */
  destroy() {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Message bus destroyed"));
    }
    this.pendingRequests.clear();
    for (const channel of this.channels.values()) {
      channel.close();
    }
    this.channels.clear();
    for (const stream of this.streams.values()) {
      stream.abort(new Error("Message bus destroyed"));
    }
    this.streams.clear();
    this.messageHandlers.clear();
    this.router.clear();
    this.removeAllListeners();
  }
}
function createMessageBus() {
  return new MessageBus();
}
const globalMessageBus = createMessageBus();
class BaseStorageProvider {
  constructor() {
    this.watchers = /* @__PURE__ */ new Map();
    this.metadata = /* @__PURE__ */ new Map();
  }
  async getMultiple(keys) {
    const result = {};
    await Promise.all(
      keys.map(async (key) => {
        result[key] = await this.get(key);
      })
    );
    return result;
  }
  async setMultiple(items) {
    await Promise.all(
      Object.entries(items).map(([key, value]) => this.set(key, value))
    );
  }
  async removeMultiple(keys) {
    await Promise.all(keys.map((key) => this.remove(key)));
  }
  async has(key) {
    const value = await this.get(key);
    return value !== null;
  }
  async getWithMetadata(key) {
    const value = await this.get(key);
    if (value === null) return null;
    const metadata = this.metadata.get(key) || this.createDefaultMetadata();
    return { key, value, metadata };
  }
  async setWithMetadata(key, value, metadata) {
    const now = Date.now();
    const existingMetadata = this.metadata.get(key);
    const newMetadata = {
      created: existingMetadata?.created || now,
      updated: now,
      accessed: now,
      ...metadata
    };
    this.metadata.set(key, newMetadata);
    await this.set(key, value);
    this.notifyWatchers(key, {
      key,
      newValue: value,
      type: "set"
    });
  }
  async updateMetadata(key, metadata) {
    const existing = this.metadata.get(key);
    if (!existing) {
      throw new Error(`No metadata found for key: ${key}`);
    }
    this.metadata.set(key, {
      ...existing,
      ...metadata,
      updated: Date.now()
    });
  }
  async getByTag(tag2) {
    const keys = await this.getKeys();
    const results = [];
    for (const key of keys) {
      const metadata = this.metadata.get(key);
      if (metadata?.tags?.includes(tag2)) {
        const value = await this.get(key);
        if (value !== null) {
          results.push({ key, value, metadata });
        }
      }
    }
    return results;
  }
  async query(filter) {
    const keys = await this.getKeys();
    const results = [];
    for (const key of keys) {
      if (filter.keyPattern) {
        const pattern = filter.keyPattern instanceof RegExp ? filter.keyPattern : new RegExp(filter.keyPattern);
        if (!pattern.test(key)) continue;
      }
      const metadata = this.metadata.get(key);
      if (!this.matchesFilter(metadata, filter)) continue;
      const value = await this.get(key);
      if (value !== null) {
        results.push({ key, value, metadata });
      }
    }
    const start = filter.offset || 0;
    const end = filter.limit ? start + filter.limit : results.length;
    return results.slice(start, end);
  }
  watch(key, callback) {
    const keys = Array.isArray(key) ? key : [key];
    keys.forEach((k) => {
      if (!this.watchers.has(k)) {
        this.watchers.set(k, /* @__PURE__ */ new Set());
      }
      this.watchers.get(k).add(callback);
    });
    return () => {
      keys.forEach((k) => {
        this.watchers.get(k)?.delete(callback);
      });
    };
  }
  async transaction(operations) {
    try {
      return await operations();
    } catch (error) {
      throw new Error(`Transaction failed: ${error}`);
    }
  }
  createDefaultMetadata() {
    const now = Date.now();
    return {
      created: now,
      updated: now,
      accessed: now
    };
  }
  matchesFilter(metadata, filter) {
    if (!metadata) return false;
    if (filter.tags && filter.tags.length > 0) {
      if (!metadata.tags || !filter.tags.every((tag2) => metadata.tags.includes(tag2))) {
        return false;
      }
    }
    if (filter.createdAfter && metadata.created < filter.createdAfter) return false;
    if (filter.createdBefore && metadata.created > filter.createdBefore) return false;
    if (filter.updatedAfter && metadata.updated < filter.updatedAfter) return false;
    if (filter.updatedBefore && metadata.updated > filter.updatedBefore) return false;
    if (filter.expired !== void 0) {
      const isExpired = metadata.expires ? metadata.expires < Date.now() : false;
      if (filter.expired !== isExpired) return false;
    }
    return true;
  }
  notifyWatchers(key, change) {
    const callbacks = this.watchers.get(key);
    if (callbacks) {
      callbacks.forEach((callback) => callback([change]));
    }
  }
}
class LocalStorageProvider extends BaseStorageProvider {
  constructor(options) {
    super();
    this.namespace = options?.namespace || "yakkl";
  }
  getKey(key) {
    return `${this.namespace}:${key}`;
  }
  isOurKey(key) {
    return key.startsWith(`${this.namespace}:`);
  }
  extractKey(namespacedKey) {
    return namespacedKey.substring(this.namespace.length + 1);
  }
  async get(key) {
    try {
      const item = localStorage.getItem(this.getKey(key));
      if (item === null) return null;
      const data = JSON.parse(item);
      const metadata = this.metadata.get(key);
      if (metadata) {
        metadata.accessed = Date.now();
      }
      if (data.expires && data.expires < Date.now()) {
        await this.remove(key);
        return null;
      }
      return data.value;
    } catch (error) {
      console.error(`Failed to get item from localStorage: ${error}`);
      return null;
    }
  }
  async set(key, value) {
    try {
      const metadata = this.metadata.get(key);
      const data = {
        value,
        expires: metadata?.expires
      };
      localStorage.setItem(this.getKey(key), JSON.stringify(data));
    } catch (error) {
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        throw new Error("Storage quota exceeded");
      }
      throw error;
    }
  }
  async remove(key) {
    localStorage.removeItem(this.getKey(key));
    this.metadata.delete(key);
    this.notifyWatchers(key, {
      key,
      oldValue: await this.get(key),
      type: "remove"
    });
  }
  async clear() {
    const keys = await this.getKeys();
    keys.forEach((key) => {
      localStorage.removeItem(this.getKey(key));
    });
    this.metadata.clear();
    this.watchers.clear();
  }
  async getKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && this.isOurKey(key)) {
        keys.push(this.extractKey(key));
      }
    }
    return keys;
  }
  async getInfo() {
    try {
      let bytesInUse = 0;
      const keys = await this.getKeys();
      for (const key of keys) {
        const item = localStorage.getItem(this.getKey(key));
        if (item) {
          bytesInUse += item.length * 2;
        }
      }
      if ("navigator" in globalThis && "storage" in navigator && "estimate" in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          bytesInUse,
          quota: estimate.quota,
          usage: estimate.usage
        };
      }
      return { bytesInUse };
    } catch (error) {
      return {};
    }
  }
}
class LocalStorageProviderFactory {
  constructor() {
    this.type = StorageType.LOCAL;
  }
  createStorage(options) {
    return new LocalStorageProvider(options);
  }
  isAvailable() {
    try {
      const testKey = "__yakkl_test__";
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
  getCapabilities() {
    return {
      persistent: false,
      synchronizable: false,
      searchable: true,
      transactional: false,
      versionable: true,
      encryptable: true,
      maxSize: 5 * 1024 * 1024,
      // 5MB typical limit
      maxKeys: void 0
    };
  }
}
class IndexedDBProvider extends BaseStorageProvider {
  constructor(options) {
    super();
    this.db = null;
    this.dbName = options?.namespace || "yakkl_wallet";
    this.storeName = "storage";
    this.version = options?.version || 1;
  }
  async ensureDB() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: "key" });
          store.createIndex("tags", "metadata.tags", { multiEntry: true });
          store.createIndex("created", "metadata.created");
          store.createIndex("updated", "metadata.updated");
          store.createIndex("expires", "metadata.expires");
        }
      };
    });
  }
  async get(key) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }
        if (result.metadata.expires && result.metadata.expires < Date.now()) {
          this.remove(key).then(() => resolve(null));
          return;
        }
        this.metadata.set(key, {
          ...result.metadata,
          accessed: Date.now()
        });
        resolve(result.value);
      };
    });
  }
  async set(key, value) {
    const db = await this.ensureDB();
    const metadata = this.metadata.get(key) || this.createDefaultMetadata();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const item = {
        key,
        value,
        metadata
      };
      const request = store.put(item);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.notifyWatchers(key, {
          key,
          newValue: value,
          type: "set"
        });
        resolve();
      };
    });
  }
  async remove(key) {
    const db = await this.ensureDB();
    const oldValue = await this.get(key);
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.metadata.delete(key);
        this.notifyWatchers(key, {
          key,
          oldValue,
          type: "remove"
        });
        resolve();
      };
    });
  }
  async clear() {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.metadata.clear();
        this.watchers.clear();
        resolve();
      };
    });
  }
  async getKeys() {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
  async transaction(operations) {
    await this.ensureDB();
    return new Promise(async (resolve, reject) => {
      try {
        const result = await operations();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }
  async getInfo() {
    try {
      if ("navigator" in globalThis && "storage" in navigator && "estimate" in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota,
          usage: estimate.usage,
          bytesInUse: estimate.usage
        };
      }
      return {};
    } catch {
      return {};
    }
  }
  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
class IndexedDBProviderFactory {
  constructor() {
    this.type = StorageType.INDEXED_DB;
  }
  createStorage(options) {
    return new IndexedDBProvider(options);
  }
  isAvailable() {
    return typeof indexedDB !== "undefined";
  }
  getCapabilities() {
    return {
      persistent: true,
      synchronizable: false,
      searchable: true,
      transactional: true,
      versionable: true,
      encryptable: true,
      maxSize: 1024 * 1024 * 1024,
      // 1GB+ typically available
      maxKeys: void 0
    };
  }
}
class ChromeStorageProvider extends BaseStorageProvider {
  constructor(options) {
    super();
    this.namespace = options?.namespace || "yakkl";
    this.isSync = options?.sync || false;
    if (typeof globalThis !== "undefined" && "browser" in globalThis) {
      const browser = globalThis.browser;
      this.storage = this.isSync ? browser.storage.sync : browser.storage.local;
    } else if (typeof globalThis !== "undefined" && "chrome" in globalThis) {
      const chrome = globalThis.chrome;
      this.storage = this.isSync ? chrome.storage.sync : chrome.storage.local;
    } else {
      throw new Error("Chrome storage API not available");
    }
  }
  getKey(key) {
    return `${this.namespace}:${key}`;
  }
  isOurKey(key) {
    return key.startsWith(`${this.namespace}:`);
  }
  extractKey(namespacedKey) {
    return namespacedKey.substring(this.namespace.length + 1);
  }
  async get(key) {
    try {
      const namespacedKey = this.getKey(key);
      const result = await this.storage.get(namespacedKey);
      if (!(namespacedKey in result)) {
        return null;
      }
      const data = result[namespacedKey];
      if (data.expires && data.expires < Date.now()) {
        await this.remove(key);
        return null;
      }
      const metadata = this.metadata.get(key);
      if (metadata) {
        metadata.accessed = Date.now();
      }
      return data.value;
    } catch (error) {
      console.error(`Failed to get item from Chrome storage: ${error}`);
      return null;
    }
  }
  async set(key, value) {
    try {
      const metadata = this.metadata.get(key) || this.createDefaultMetadata();
      const data = {
        value,
        expires: metadata.expires
      };
      await this.storage.set({ [this.getKey(key)]: data });
      this.notifyWatchers(key, {
        key,
        newValue: value,
        type: "set"
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("QUOTA_BYTES")) {
        throw new Error("Storage quota exceeded");
      }
      throw error;
    }
  }
  async remove(key) {
    const oldValue = await this.get(key);
    await this.storage.remove(this.getKey(key));
    this.metadata.delete(key);
    this.notifyWatchers(key, {
      key,
      oldValue,
      type: "remove"
    });
  }
  async clear() {
    const keys = await this.getKeys();
    const namespacedKeys = keys.map((key) => this.getKey(key));
    if (namespacedKeys.length > 0) {
      await this.storage.remove(namespacedKeys);
    }
    this.metadata.clear();
    this.watchers.clear();
  }
  async getKeys() {
    const allItems = await this.storage.get(null);
    const keys = [];
    for (const key in allItems) {
      if (this.isOurKey(key)) {
        keys.push(this.extractKey(key));
      }
    }
    return keys;
  }
  async getInfo() {
    try {
      const keys = await this.getKeys();
      const namespacedKeys = keys.map((key) => this.getKey(key));
      const bytesInUse = await this.storage.getBytesInUse(namespacedKeys);
      const quota = this.isSync ? 102400 : 10485760;
      return {
        bytesInUse,
        quota,
        usage: bytesInUse
      };
    } catch {
      return {};
    }
  }
}
class ChromeLocalStorageProviderFactory {
  constructor() {
    this.type = StorageType.CHROME_LOCAL;
  }
  createStorage(options) {
    return new ChromeStorageProvider({ ...options, sync: false });
  }
  isAvailable() {
    return typeof globalThis !== "undefined" && ("browser" in globalThis || "chrome" in globalThis) && (globalThis.browser?.storage || globalThis.chrome?.storage);
  }
  getCapabilities() {
    return {
      persistent: true,
      synchronizable: false,
      searchable: true,
      transactional: false,
      versionable: true,
      encryptable: true,
      maxSize: 10 * 1024 * 1024,
      // 10MB default, unlimited with permission
      maxKeys: void 0
    };
  }
}
class ChromeSyncStorageProviderFactory {
  constructor() {
    this.type = StorageType.CHROME_SYNC;
  }
  createStorage(options) {
    return new ChromeStorageProvider({ ...options, sync: true });
  }
  isAvailable() {
    return typeof globalThis !== "undefined" && ("browser" in globalThis || "chrome" in globalThis) && (globalThis.browser?.storage?.sync || globalThis.chrome?.storage?.sync);
  }
  getCapabilities() {
    return {
      persistent: true,
      synchronizable: true,
      searchable: true,
      transactional: false,
      versionable: true,
      encryptable: true,
      maxSize: 100 * 1024,
      // 100KB for sync storage
      maxKeys: 512
      // Chrome sync storage limit
    };
  }
}
class MemoryStorageProvider extends BaseStorageProvider {
  constructor(options) {
    super();
    this.store = /* @__PURE__ */ new Map();
    this.namespace = options?.namespace || "yakkl";
  }
  getKey(key) {
    return `${this.namespace}:${key}`;
  }
  async get(key) {
    const namespacedKey = this.getKey(key);
    if (!this.store.has(namespacedKey)) {
      return null;
    }
    const data = this.store.get(namespacedKey);
    if (data.expires && data.expires < Date.now()) {
      await this.remove(key);
      return null;
    }
    const metadata = this.metadata.get(key);
    if (metadata) {
      metadata.accessed = Date.now();
    }
    return data.value;
  }
  async set(key, value) {
    const metadata = this.metadata.get(key) || this.createDefaultMetadata();
    const data = {
      value,
      expires: metadata.expires
    };
    this.store.set(this.getKey(key), data);
    this.notifyWatchers(key, {
      key,
      newValue: value,
      type: "set"
    });
  }
  async remove(key) {
    const oldValue = await this.get(key);
    this.store.delete(this.getKey(key));
    this.metadata.delete(key);
    this.notifyWatchers(key, {
      key,
      oldValue,
      type: "remove"
    });
  }
  async clear() {
    const keys = await this.getKeys();
    keys.forEach((key) => {
      this.store.delete(this.getKey(key));
    });
    this.metadata.clear();
    this.watchers.clear();
  }
  async getKeys() {
    const keys = [];
    const prefix = `${this.namespace}:`;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        keys.push(key.substring(prefix.length));
      }
    }
    return keys;
  }
  async getInfo() {
    let bytesInUse = 0;
    for (const [key, value] of this.store.entries()) {
      bytesInUse += key.length * 2;
      bytesInUse += JSON.stringify(value).length * 2;
    }
    return { bytesInUse };
  }
}
class MemoryStorageProviderFactory {
  constructor() {
    this.type = StorageType.MEMORY;
  }
  createStorage(options) {
    return new MemoryStorageProvider(options);
  }
  isAvailable() {
    return true;
  }
  getCapabilities() {
    return {
      persistent: false,
      synchronizable: false,
      searchable: true,
      transactional: false,
      versionable: true,
      encryptable: true,
      maxSize: void 0,
      // Limited by available memory
      maxKeys: void 0
    };
  }
}
class EncryptedStorageWrapper {
  constructor(storage) {
    this.encryptionKey = null;
    this.textEncoder = new TextEncoder();
    this.textDecoder = new TextDecoder();
    this.storage = storage;
  }
  async setEncryptionKey(key) {
    if (typeof key === "string") {
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        this.textEncoder.encode(key),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
      );
      this.encryptionKey = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: this.textEncoder.encode("yakkl-wallet-salt"),
          iterations: 1e5,
          hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
    } else {
      this.encryptionKey = key;
    }
  }
  async rotateEncryptionKey(newKey) {
    if (!this.encryptionKey) {
      throw new Error("No encryption key set");
    }
    const keys = await this.storage.getKeys();
    const decryptedData = {};
    for (const key of keys) {
      const encryptedValue = await this.storage.get(key);
      if (encryptedValue) {
        try {
          decryptedData[key] = await this.decrypt(encryptedValue);
        } catch {
        }
      }
    }
    await this.setEncryptionKey(newKey);
    for (const [key, value] of Object.entries(decryptedData)) {
      const encrypted = await this.encrypt(value);
      await this.storage.set(key, encrypted);
    }
  }
  isEncrypted() {
    return this.encryptionKey !== null;
  }
  async encrypt(value) {
    if (!this.encryptionKey) {
      throw new Error("No encryption key set");
    }
    const data = JSON.stringify(value);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      this.encryptionKey,
      this.textEncoder.encode(data)
    );
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
  }
  async decrypt(encryptedValue) {
    if (!this.encryptionKey) {
      throw new Error("No encryption key set");
    }
    const combined = Uint8Array.from(atob(encryptedValue), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      this.encryptionKey,
      encrypted
    );
    const data = this.textDecoder.decode(decrypted);
    return JSON.parse(data);
  }
  // IStorage implementation with encryption
  async get(key) {
    if (!this.isEncrypted()) {
      return this.storage.get(key);
    }
    const encryptedValue = await this.storage.get(key);
    if (encryptedValue === null) return null;
    try {
      return await this.decrypt(encryptedValue);
    } catch (error) {
      console.error("Decryption failed:", error);
      return null;
    }
  }
  async set(key, value) {
    if (!this.isEncrypted()) {
      return this.storage.set(key, value);
    }
    const encrypted = await this.encrypt(value);
    return this.storage.set(key, encrypted);
  }
  async getMultiple(keys) {
    const result = {};
    await Promise.all(
      keys.map(async (key) => {
        result[key] = await this.get(key);
      })
    );
    return result;
  }
  async setMultiple(items) {
    await Promise.all(
      Object.entries(items).map(([key, value]) => this.set(key, value))
    );
  }
  // Delegate non-encrypted methods to base storage
  async remove(key) {
    return this.storage.remove(key);
  }
  async removeMultiple(keys) {
    return this.storage.removeMultiple(keys);
  }
  async clear() {
    return this.storage.clear();
  }
  async getKeys() {
    return this.storage.getKeys();
  }
  async has(key) {
    return this.storage.has(key);
  }
  async getInfo() {
    return this.storage.getInfo?.() || {};
  }
  // IEnhancedStorage implementation
  async getWithMetadata(key) {
    const value = await this.get(key);
    if (value === null) return null;
    if ("getWithMetadata" in this.storage) {
      const entry = await this.storage.getWithMetadata(key);
      if (entry) {
        return { ...entry, value };
      }
    }
    return { key, value };
  }
  async setWithMetadata(key, value, metadata) {
    if (this.isEncrypted()) {
      const encrypted = await this.encrypt(value);
      if ("setWithMetadata" in this.storage) {
        return this.storage.setWithMetadata(key, encrypted, {
          ...metadata,
          encrypted: true
        });
      }
      return this.storage.set(key, encrypted);
    }
    if ("setWithMetadata" in this.storage) {
      return this.storage.setWithMetadata(key, value, metadata);
    }
    return this.storage.set(key, value);
  }
  async updateMetadata(key, metadata) {
    if ("updateMetadata" in this.storage) {
      return this.storage.updateMetadata(key, metadata);
    }
    throw new Error("Base storage does not support metadata");
  }
  async getByTag(tag2) {
    if ("getByTag" in this.storage) {
      const entries = await this.storage.getByTag(tag2);
      if (this.isEncrypted()) {
        return Promise.all(
          entries.map(async (entry) => ({
            ...entry,
            value: await this.decrypt(entry.value)
          }))
        );
      }
      return entries;
    }
    return [];
  }
  async query(filter) {
    if ("query" in this.storage) {
      const entries = await this.storage.query(filter);
      if (this.isEncrypted()) {
        return Promise.all(
          entries.map(async (entry) => ({
            ...entry,
            value: await this.decrypt(entry.value)
          }))
        );
      }
      return entries;
    }
    return [];
  }
  watch(key, callback) {
    if ("watch" in this.storage) {
      const wrappedCallback = async (changes) => {
        if (this.isEncrypted()) {
          const decryptedChanges = await Promise.all(
            changes.map(async (change) => ({
              ...change,
              oldValue: change.oldValue ? await this.decrypt(change.oldValue) : void 0,
              newValue: change.newValue ? await this.decrypt(change.newValue) : void 0
            }))
          );
          callback(decryptedChanges);
        } else {
          callback(changes);
        }
      };
      return this.storage.watch(key, wrappedCallback);
    }
    return () => {
    };
  }
  async transaction(operations) {
    if ("transaction" in this.storage) {
      return this.storage.transaction(operations);
    }
    return operations();
  }
}
class VersionedStorageWrapper {
  constructor(storage, maxVersions = 10) {
    this.versionPrefix = "__version__";
    this.storage = storage;
    this.maxVersions = maxVersions;
  }
  getVersionKey(key, version) {
    return `${this.versionPrefix}:${key}:${version}`;
  }
  getVersionListKey(key) {
    return `${this.versionPrefix}:list:${key}`;
  }
  generateVersion() {
    return `v${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  async getHistory(key, limit) {
    const versionListKey = this.getVersionListKey(key);
    const versionList = await this.storage.get(versionListKey) || [];
    const effectiveLimit = limit || this.maxVersions;
    const versionsToFetch = versionList.slice(-effectiveLimit);
    const versions = [];
    for (const version of versionsToFetch) {
      const versionKey = this.getVersionKey(key, version);
      const versionData = await this.storage.get(versionKey);
      if (versionData) {
        versions.push(versionData);
      }
    }
    return versions.sort((a2, b) => b.timestamp - a2.timestamp);
  }
  async getVersion(key, version) {
    const versionKey = this.getVersionKey(key, version);
    const versionData = await this.storage.get(versionKey);
    return versionData ? versionData.value : null;
  }
  async restoreVersion(key, version) {
    const value = await this.getVersion(key, version);
    if (value === null) {
      throw new Error(`Version ${version} not found for key ${key}`);
    }
    await this.set(key, value);
  }
  async pruneVersions(key, keepCount) {
    const versionListKey = this.getVersionListKey(key);
    const versionList = await this.storage.get(versionListKey) || [];
    if (versionList.length <= keepCount) {
      return;
    }
    const versionsToRemove = versionList.slice(0, versionList.length - keepCount);
    for (const version of versionsToRemove) {
      const versionKey = this.getVersionKey(key, version);
      await this.storage.remove(versionKey);
    }
    const newVersionList = versionList.slice(-keepCount);
    await this.storage.set(versionListKey, newVersionList);
  }
  // IStorage implementation with versioning
  async get(key) {
    return this.storage.get(key);
  }
  async set(key, value) {
    const currentValue = await this.storage.get(key);
    if (currentValue !== null) {
      const version = this.generateVersion();
      const versionData = {
        version,
        value: currentValue,
        timestamp: Date.now()
      };
      const versionKey = this.getVersionKey(key, version);
      await this.storage.set(versionKey, versionData);
      const versionListKey = this.getVersionListKey(key);
      const versionList = await this.storage.get(versionListKey) || [];
      versionList.push(version);
      if (versionList.length > this.maxVersions) {
        const versionsToRemove = versionList.slice(0, versionList.length - this.maxVersions);
        for (const oldVersion of versionsToRemove) {
          const oldVersionKey = this.getVersionKey(key, oldVersion);
          await this.storage.remove(oldVersionKey);
        }
        versionList.splice(0, versionsToRemove.length);
      }
      await this.storage.set(versionListKey, versionList);
    }
    await this.storage.set(key, value);
  }
  async getMultiple(keys) {
    return this.storage.getMultiple(keys);
  }
  async setMultiple(items) {
    for (const [key, value] of Object.entries(items)) {
      await this.set(key, value);
    }
  }
  async remove(key) {
    const versionListKey = this.getVersionListKey(key);
    const versionList = await this.storage.get(versionListKey) || [];
    for (const version of versionList) {
      const versionKey = this.getVersionKey(key, version);
      await this.storage.remove(versionKey);
    }
    await this.storage.remove(versionListKey);
    await this.storage.remove(key);
  }
  async removeMultiple(keys) {
    for (const key of keys) {
      await this.remove(key);
    }
  }
  async clear() {
    await this.storage.clear();
  }
  async getKeys() {
    const allKeys = await this.storage.getKeys();
    return allKeys.filter((key) => !key.startsWith(this.versionPrefix));
  }
  async has(key) {
    return this.storage.has(key);
  }
  async getInfo() {
    return this.storage.getInfo?.() || {};
  }
  // IEnhancedStorage implementation
  async getWithMetadata(key) {
    if ("getWithMetadata" in this.storage) {
      return this.storage.getWithMetadata(key);
    }
    const value = await this.get(key);
    return value !== null ? { key, value } : null;
  }
  async setWithMetadata(key, value, metadata) {
    await this.set(key, value);
    if ("setWithMetadata" in this.storage) {
      const updatedMetadata = {
        ...metadata,
        version: this.generateVersion()
      };
      return this.storage.setWithMetadata(key, value, updatedMetadata);
    }
  }
  async updateMetadata(key, metadata) {
    if ("updateMetadata" in this.storage) {
      return this.storage.updateMetadata(key, metadata);
    }
    throw new Error("Base storage does not support metadata");
  }
  async getByTag(tag2) {
    if ("getByTag" in this.storage) {
      const entries = await this.storage.getByTag(tag2);
      return entries.filter((entry) => !entry.key.startsWith(this.versionPrefix));
    }
    return [];
  }
  async query(filter) {
    if ("query" in this.storage) {
      const entries = await this.storage.query(filter);
      return entries.filter((entry) => !entry.key.startsWith(this.versionPrefix));
    }
    return [];
  }
  watch(key, callback) {
    if ("watch" in this.storage) {
      const wrappedCallback = (changes) => {
        const filteredChanges = changes.filter(
          (change) => !change.key.startsWith(this.versionPrefix)
        );
        if (filteredChanges.length > 0) {
          callback(filteredChanges);
        }
      };
      return this.storage.watch(key, wrappedCallback);
    }
    return () => {
    };
  }
  async transaction(operations) {
    if ("transaction" in this.storage) {
      return this.storage.transaction(operations);
    }
    return operations();
  }
}
class StorageMigrator {
  constructor(storage, migrations) {
    this.migrations = /* @__PURE__ */ new Map();
    this.migrationOrder = [];
    this.versionKey = "__migration_version__";
    this.historyKey = "__migration_history__";
    this.storage = storage;
    const sorted = migrations.sort(
      (a2, b) => this.compareVersions(a2.version, b.version)
    );
    for (const migration of sorted) {
      this.migrations.set(migration.version, migration);
      this.migrationOrder.push(migration.version);
    }
  }
  registerMigration(migration) {
    this.migrations.set(migration.version, migration);
    this.migrationOrder = Array.from(this.migrations.keys()).sort(
      (a2, b) => this.compareVersions(a2, b)
    );
  }
  async getCurrentVersion() {
    const version = await this.storage.get(this.versionKey);
    return version || "0.0.0";
  }
  async getHistory() {
    const history = await this.storage.get(this.historyKey);
    return history || [];
  }
  async migrate(targetVersion) {
    const currentVersion = await this.getCurrentVersion();
    const target = targetVersion || this.getLatestVersion();
    if (this.compareVersions(currentVersion, target) >= 0) {
      console.log(`Already at version ${currentVersion}, no migration needed`);
      return;
    }
    const migrationsToRun = this.getMigrationsBetween(currentVersion, target, "up");
    for (const version of migrationsToRun) {
      const migration = this.migrations.get(version);
      if (!migration) continue;
      console.log(`Running migration ${version}: ${migration.description || "No description"}`);
      const startTime = Date.now();
      let success = true;
      let error;
      try {
        await migration.up(this.storage);
        await this.storage.set(this.versionKey, version);
      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : String(err);
        console.error(`Migration ${version} failed:`, err);
        throw err;
      } finally {
        await this.addToHistory({
          version,
          executedAt: startTime,
          direction: "up",
          success,
          error
        });
      }
      console.log(`Migration ${version} completed successfully`);
    }
  }
  async rollback(targetVersion) {
    const currentVersion = await this.getCurrentVersion();
    if (this.compareVersions(currentVersion, targetVersion) <= 0) {
      console.log(`Already at version ${currentVersion}, no rollback needed`);
      return;
    }
    const migrationsToRun = this.getMigrationsBetween(targetVersion, currentVersion, "down");
    for (const version of migrationsToRun.reverse()) {
      const migration = this.migrations.get(version);
      if (!migration || !migration.down) {
        throw new Error(`Cannot rollback migration ${version}: No down migration defined`);
      }
      console.log(`Rolling back migration ${version}: ${migration.description || "No description"}`);
      const startTime = Date.now();
      let success = true;
      let error;
      try {
        await migration.down(this.storage);
        const versionIndex = this.migrationOrder.indexOf(version);
        const previousVersion = versionIndex > 0 ? this.migrationOrder[versionIndex - 1] : "0.0.0";
        await this.storage.set(this.versionKey, previousVersion);
      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : String(err);
        console.error(`Rollback ${version} failed:`, err);
        throw err;
      } finally {
        await this.addToHistory({
          version,
          executedAt: startTime,
          direction: "down",
          success,
          error
        });
      }
      console.log(`Rollback ${version} completed successfully`);
    }
  }
  async addToHistory(entry) {
    const history = await this.getHistory();
    history.push(entry);
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    await this.storage.set(this.historyKey, history);
  }
  getMigrationsBetween(fromVersion, toVersion, direction) {
    const migrations = [];
    for (const version of this.migrationOrder) {
      const comparison = this.compareVersions(version, fromVersion);
      const targetComparison = this.compareVersions(version, toVersion);
      if (direction === "up") {
        if (comparison > 0 && targetComparison <= 0) {
          migrations.push(version);
        }
      } else {
        if (comparison <= 0 && targetComparison > 0) {
          migrations.push(version);
        }
      }
    }
    return migrations;
  }
  getLatestVersion() {
    if (this.migrationOrder.length === 0) {
      return "0.0.0";
    }
    return this.migrationOrder[this.migrationOrder.length - 1];
  }
  compareVersions(a2, b) {
    const aParts = a2.split(".").map(Number);
    const bParts = b.split(".").map(Number);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      if (aPart > bPart) return 1;
      if (aPart < bPart) return -1;
    }
    return 0;
  }
  /**
   * Create a migration that transforms data structure
   */
  static createDataMigration(version, description, transform) {
    return {
      version,
      description,
      up: async (storage) => {
        const keys = await storage.getKeys();
        for (const key of keys) {
          const value = await storage.get(key);
          const transformed = transform(key, value);
          if (transformed === null) {
            await storage.remove(key);
          } else if (transformed !== value) {
            await storage.set(key, transformed);
          }
        }
      },
      down: async (storage) => {
        throw new Error(`Rollback not supported for data migration ${version}`);
      }
    };
  }
  /**
   * Create a migration that renames keys
   */
  static createRenameMigration(version, description, renames) {
    return {
      version,
      description,
      up: async (storage) => {
        for (const [oldKey, newKey] of Object.entries(renames)) {
          const value = await storage.get(oldKey);
          if (value !== null) {
            await storage.set(newKey, value);
            await storage.remove(oldKey);
          }
        }
      },
      down: async (storage) => {
        for (const [oldKey, newKey] of Object.entries(renames)) {
          const value = await storage.get(newKey);
          if (value !== null) {
            await storage.set(oldKey, value);
            await storage.remove(newKey);
          }
        }
      }
    };
  }
}
class StorageManager {
  constructor() {
    this.providers = /* @__PURE__ */ new Map();
    this.storageInstances = /* @__PURE__ */ new Map();
    this.registerDefaultProviders();
  }
  registerDefaultProviders() {
    this.registerProvider(new LocalStorageProviderFactory());
    this.registerProvider(new IndexedDBProviderFactory());
    this.registerProvider(new ChromeLocalStorageProviderFactory());
    this.registerProvider(new ChromeSyncStorageProviderFactory());
    this.registerProvider(new MemoryStorageProviderFactory());
  }
  registerProvider(provider) {
    this.providers.set(provider.type, provider);
  }
  getStorage(type, options) {
    const cacheKey = `${type}:${options?.namespace || "default"}`;
    if (this.storageInstances.has(cacheKey)) {
      return this.storageInstances.get(cacheKey);
    }
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`Storage provider not found for type: ${type}`);
    }
    if (!provider.isAvailable()) {
      throw new Error(`Storage provider not available: ${type}`);
    }
    const storage = provider.createStorage(options);
    this.storageInstances.set(cacheKey, storage);
    return storage;
  }
  getEncryptedStorage(type, options) {
    const baseStorage = this.getStorage(type, options);
    return new EncryptedStorageWrapper(baseStorage);
  }
  getVersionedStorage(type, options) {
    const baseStorage = this.getStorage(type, options);
    return new VersionedStorageWrapper(baseStorage);
  }
  createMigrator(storage, migrations) {
    return new StorageMigrator(storage, migrations);
  }
  async sync(source, target, options) {
    const startTime = Date.now();
    const result = {
      itemsSynced: 0,
      itemsSkipped: 0,
      conflicts: [],
      errors: [],
      duration: 0
    };
    try {
      const sourceKeys = await source.getKeys();
      const targetKeys = await target.getKeys();
      const allKeys = /* @__PURE__ */ new Set([...sourceKeys, ...targetKeys]);
      const batchSize = options?.batchSize || 100;
      const keysArray = Array.from(allKeys);
      for (let i = 0; i < keysArray.length; i += batchSize) {
        const batch = keysArray.slice(i, i + batchSize);
        await Promise.all(batch.map(async (key) => {
          try {
            const sourceValue = await source.get(key);
            const targetValue = await target.get(key);
            if (options?.filter) {
              const entry = { key, value: sourceValue };
              if (!options.filter(entry)) {
                result.itemsSkipped++;
                return;
              }
            }
            if (options?.direction === "push") {
              if (sourceValue !== null) {
                await target.set(key, sourceValue);
                result.itemsSynced++;
              }
            } else if (options?.direction === "pull") {
              if (targetValue !== null) {
                await source.set(key, targetValue);
                result.itemsSynced++;
              }
            } else {
              if (sourceValue !== null && targetValue !== null && JSON.stringify(sourceValue) !== JSON.stringify(targetValue)) {
                const conflict = {
                  key,
                  sourceValue,
                  targetValue
                };
                switch (options?.conflictResolution) {
                  case "source":
                    await target.set(key, sourceValue);
                    conflict.resolution = "source";
                    break;
                  case "target":
                    await source.set(key, targetValue);
                    conflict.resolution = "target";
                    break;
                  case "newest":
                    await target.set(key, sourceValue);
                    conflict.resolution = "source";
                    break;
                  default:
                    result.conflicts.push(conflict);
                    result.itemsSkipped++;
                    return;
                }
                result.conflicts.push(conflict);
                result.itemsSynced++;
              } else if (sourceValue !== null) {
                await target.set(key, sourceValue);
                result.itemsSynced++;
              } else if (targetValue !== null) {
                await source.set(key, targetValue);
                result.itemsSynced++;
              }
            }
          } catch (error) {
            result.errors.push(error);
          }
        }));
      }
    } catch (error) {
      result.errors.push(error);
    }
    result.duration = Date.now() - startTime;
    return result;
  }
  /**
   * Get the best available storage provider for the current environment
   */
  getBestAvailableStorage(options) {
    const priorityOrder = [
      StorageType.INDEXED_DB,
      // Best for large data
      StorageType.CHROME_LOCAL,
      // Best for extensions
      StorageType.LOCAL,
      // Fallback for web
      StorageType.SESSION,
      // Temporary storage
      StorageType.MEMORY
      // Last resort
    ];
    for (const type of priorityOrder) {
      const provider = this.providers.get(type);
      if (provider && provider.isAvailable()) {
        try {
          return this.getStorage(type, options);
        } catch {
        }
      }
    }
    return this.getStorage(StorageType.MEMORY, options);
  }
  /**
   * Clear all storage instances
   */
  async clearAll() {
    const promises = [];
    for (const storage of this.storageInstances.values()) {
      promises.push(storage.clear());
    }
    await Promise.all(promises);
    this.storageInstances.clear();
  }
}
class Observable {
  constructor(initial) {
    this.subscribers = /* @__PURE__ */ new Set();
    this.isDestroyed = false;
    this.value = initial;
  }
  /**
   * Get current value
   */
  get() {
    this.checkDestroyed();
    return this.value;
  }
  /**
   * Set new value and notify subscribers
   */
  set(value) {
    this.checkDestroyed();
    if (this.equals(this.value, value)) {
      return;
    }
    const oldValue = this.value;
    this.value = value;
    this.notify(oldValue, value);
  }
  /**
   * Subscribe to value changes
   */
  subscribe(subscriber) {
    this.checkDestroyed();
    this.subscribers.add(subscriber);
    subscriber(this.value);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }
  /**
   * Notify all subscribers
   */
  notify(oldValue, newValue) {
    this.subscribers.forEach((subscriber) => {
      try {
        subscriber(newValue);
      } catch (error) {
        console.error("Error in state subscriber:", error);
      }
    });
  }
  /**
   * Check equality (can be overridden)
   */
  equals(a2, b) {
    return Object.is(a2, b);
  }
  /**
   * Check if destroyed
   */
  checkDestroyed() {
    if (this.isDestroyed) {
      throw new Error("Observable has been destroyed");
    }
  }
  /**
   * Get subscriber count
   */
  getSubscriberCount() {
    return this.subscribers.size;
  }
  /**
   * Clear all subscribers
   */
  clearSubscribers() {
    this.subscribers.clear();
  }
  /**
   * Destroy the observable
   */
  destroy() {
    this.clearSubscribers();
    this.isDestroyed = true;
  }
}
class ComputedObservable extends Observable {
  constructor(dependencies, compute, initial) {
    const deps = Array.isArray(dependencies) ? dependencies : [dependencies];
    const initialValue = initial !== void 0 ? initial : compute(...deps.map((d) => d.get()));
    super(initialValue);
    this.unsubscribers = [];
    this.dependencies = deps;
    this.compute = compute;
    this.subscribeToDependencies();
  }
  /**
   * Subscribe to all dependencies
   */
  subscribeToDependencies() {
    this.dependencies.forEach((dep, index) => {
      const unsubscribe = dep.subscribe(() => {
        this.recompute();
      });
      this.unsubscribers.push(unsubscribe);
    });
  }
  /**
   * Recompute value when dependencies change
   */
  recompute() {
    const values = this.dependencies.map((d) => d.get());
    const newValue = this.compute(...values);
    super.set(newValue);
  }
  /**
   * Override set to make it read-only
   */
  set(value) {
    throw new Error("Cannot set value on computed observable");
  }
  /**
   * Destroy and cleanup
   */
  destroy() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    super.destroy();
  }
}
class BatchedObservable extends Observable {
  constructor() {
    super(...arguments);
    this.isBatching = false;
  }
  /**
   * Start batching updates
   */
  startBatch() {
    this.isBatching = true;
  }
  /**
   * End batch and apply pending updates
   */
  endBatch() {
    this.isBatching = false;
    if (this.pendingValue !== void 0) {
      const value = this.pendingValue;
      this.pendingValue = void 0;
      super.set(value);
    }
  }
  /**
   * Set value (batched if in batch mode)
   */
  set(value) {
    if (this.isBatching) {
      this.pendingValue = value;
    } else {
      super.set(value);
    }
  }
  /**
   * Execute function with batched updates
   */
  batch(fn) {
    this.startBatch();
    try {
      fn();
    } finally {
      this.endBatch();
    }
  }
}
class HistoryObservable extends Observable {
  constructor(initial, maxHistory = 100) {
    super(initial);
    this.past = [];
    this.future = [];
    this.maxHistory = maxHistory;
  }
  /**
   * Set value and record in history
   */
  set(value) {
    const current = this.get();
    this.past.push(current);
    if (this.past.length > this.maxHistory) {
      this.past.shift();
    }
    this.future = [];
    super.set(value);
  }
  /**
   * Undo to previous value
   */
  undo() {
    if (this.past.length === 0) {
      return false;
    }
    const current = this.get();
    const previous = this.past.pop();
    this.future.unshift(current);
    super.set(previous);
    return true;
  }
  /**
   * Redo to next value
   */
  redo() {
    if (this.future.length === 0) {
      return false;
    }
    const current = this.get();
    const next = this.future.shift();
    this.past.push(current);
    super.set(next);
    return true;
  }
  /**
   * Check if can undo
   */
  canUndo() {
    return this.past.length > 0;
  }
  /**
   * Check if can redo
   */
  canRedo() {
    return this.future.length > 0;
  }
  /**
   * Clear history
   */
  clearHistory() {
    this.past = [];
    this.future = [];
  }
  /**
   * Get history info
   */
  getHistoryInfo() {
    return {
      past: this.past.length,
      future: this.future.length
    };
  }
}
class State {
  constructor(initial, options = {}) {
    this.options = options;
    const value = options.transformer ? options.transformer(initial) : initial;
    this.observable = new Observable(value);
    if (options.equals) {
      this.observable.equals = options.equals;
    }
  }
  /**
   * Get current value
   */
  get() {
    return this.observable.get();
  }
  /**
   * Set new value
   */
  set(value) {
    const newValue = typeof value === "function" ? value(this.get()) : value;
    if (this.options.validator && !this.options.validator(newValue)) {
      console.warn("State validation failed for value:", newValue);
      return;
    }
    const transformedValue = this.options.transformer ? this.options.transformer(newValue) : newValue;
    this.observable.set(transformedValue);
  }
  /**
   * Update value using updater function
   */
  update(updater) {
    this.set(updater);
  }
  /**
   * Subscribe to changes
   */
  subscribe(subscriber) {
    return this.observable.subscribe(subscriber);
  }
  /**
   * Destroy the state
   */
  destroy() {
    this.observable.destroy();
  }
}
class ReadableState {
  constructor(initial, options = {}) {
    const value = options.transformer ? options.transformer(initial) : initial;
    this.observable = new Observable(value);
    if (options.equals) {
      this.observable.equals = options.equals;
    }
  }
  /**
   * Get current value
   */
  get() {
    return this.observable.get();
  }
  /**
   * Subscribe to changes
   */
  subscribe(subscriber) {
    return this.observable.subscribe(subscriber);
  }
  /**
   * Destroy the state
   */
  destroy() {
    this.observable.destroy();
  }
}
class WritableState extends State {
  constructor(initial, options = {}) {
    super(initial, options);
    this.initialValue = initial;
  }
  /**
   * Reset to initial value
   */
  reset() {
    this.set(this.initialValue);
  }
}
class DerivedState {
  constructor(dependencies, fn, initial) {
    const deps = Array.isArray(dependencies) ? dependencies : [dependencies];
    this.dependencies = deps;
    const observables = deps.map((dep) => {
      return dep.observable || new Observable(dep.get());
    });
    this.computedObservable = new ComputedObservable(
      observables,
      fn,
      initial
    );
  }
  /**
   * Get current value
   */
  get() {
    return this.computedObservable.get();
  }
  /**
   * Subscribe to changes
   */
  subscribe(subscriber) {
    return this.computedObservable.subscribe(subscriber);
  }
  /**
   * Destroy the state
   */
  destroy() {
    this.computedObservable.destroy();
  }
}
function writable(initial, options) {
  return new WritableState(initial, options);
}
function readable(initial, options) {
  return new ReadableState(initial, options);
}
function derived(dependencies, fn, initial) {
  return new DerivedState(dependencies, fn, initial);
}
function get(state) {
  if (state && typeof state === "object" && "get" in state) {
    return state.get();
  }
  return state;
}
class StateStore {
  constructor(initial, options = {}) {
    this.states = /* @__PURE__ */ new Map();
    this.initialState = { ...initial };
    this.options = options;
    this.storeObservable = new BatchedObservable(initial);
    this.initializeStates(initial);
  }
  /**
   * Initialize states for each key
   */
  initializeStates(initial) {
    Object.keys(initial).forEach((key) => {
      const state = new WritableState(initial[key], {
        ...this.options,
        persistKey: this.options.persistKey ? `${this.options.persistKey}.${key}` : void 0
      });
      state.subscribe((value) => {
        this.handleStateChange(key, value);
      });
      this.states.set(key, state);
    });
  }
  /**
   * Handle individual state change
   */
  handleStateChange(key, value) {
    const currentState = this.storeObservable.get();
    const newState = { ...currentState, [key]: value };
    this.storeObservable.batch(() => {
      this.storeObservable.set(newState);
    });
  }
  /**
   * Get state slice
   */
  get(key) {
    const state = this.states.get(key);
    if (!state) {
      throw new Error(`State key "${String(key)}" not found`);
    }
    return state.get();
  }
  /**
   * Set state slice
   */
  set(key, value) {
    const state = this.states.get(key);
    if (!state) {
      const newState = new WritableState(value, {
        ...this.options,
        persistKey: this.options.persistKey ? `${this.options.persistKey}.${String(key)}` : void 0
      });
      newState.subscribe((val) => {
        this.handleStateChange(key, val);
      });
      this.states.set(key, newState);
    } else {
      state.set(value);
    }
  }
  /**
   * Update state slice
   */
  update(key, updater) {
    const currentValue = this.get(key);
    const newValue = updater(currentValue);
    this.set(key, newValue);
  }
  /**
   * Subscribe to specific key
   */
  subscribe(key, subscriber) {
    const state = this.states.get(key);
    if (!state) {
      throw new Error(`State key "${String(key)}" not found`);
    }
    return state.subscribe(subscriber);
  }
  /**
   * Subscribe to entire store
   */
  subscribeAll(subscriber) {
    return this.storeObservable.subscribe(subscriber);
  }
  /**
   * Get entire state
   */
  getState() {
    return this.storeObservable.get();
  }
  /**
   * Set entire state
   */
  setState(state) {
    this.storeObservable.batch(() => {
      Object.entries(state).forEach(([key, value]) => {
        this.set(key, value);
      });
    });
  }
  /**
   * Reset store to initial state
   */
  reset() {
    this.storeObservable.batch(() => {
      this.states.forEach((state, key) => {
        state.reset();
      });
    });
  }
  /**
   * Select a value from the store
   */
  select(selector) {
    return selector(this.getState());
  }
  /**
   * Subscribe to selected value
   */
  subscribeSelect(selector, subscriber) {
    let previousValue = selector(this.getState());
    return this.subscribeAll((state) => {
      const newValue = selector(state);
      if (!Object.is(previousValue, newValue)) {
        previousValue = newValue;
        subscriber(newValue);
      }
    });
  }
  /**
   * Destroy the store
   */
  destroy() {
    this.states.forEach((state) => state.destroy());
    this.states.clear();
    this.storeObservable.destroy();
  }
}
function createStore(initial, options) {
  return new StateStore(initial, options);
}
function combineStores(stores) {
  const initial = {};
  Object.keys(stores).forEach((key) => {
    initial[key] = stores[key].getState();
  });
  const combinedStore = new StateStore(initial);
  Object.keys(stores).forEach((key) => {
    stores[key].subscribeAll((state) => {
      combinedStore.set(key, state);
    });
  });
  return combinedStore;
}
class StatePersistence {
  constructor(storage, prefix = "state") {
    this.storage = storage || new StorageManager().getBestAvailableStorage();
    this.prefix = prefix;
  }
  /**
   * Get storage key with prefix
   */
  getKey(key) {
    return `${this.prefix}:${key}`;
  }
  /**
   * Load state from storage
   */
  async load(key) {
    try {
      const storageKey = this.getKey(key);
      const value = await this.storage.get(storageKey);
      return value;
    } catch (error) {
      console.error(`Failed to load state for key "${key}":`, error);
      return null;
    }
  }
  /**
   * Save state to storage
   */
  async save(key, value) {
    try {
      const storageKey = this.getKey(key);
      await this.storage.set(storageKey, value);
    } catch (error) {
      console.error(`Failed to save state for key "${key}":`, error);
      throw error;
    }
  }
  /**
   * Remove state from storage
   */
  async remove(key) {
    try {
      const storageKey = this.getKey(key);
      await this.storage.remove(storageKey);
    } catch (error) {
      console.error(`Failed to remove state for key "${key}":`, error);
      throw error;
    }
  }
  /**
   * Clear all persisted state
   */
  async clear() {
    try {
      const keys = await this.storage.getKeys();
      const stateKeys = keys.filter((key) => key.startsWith(this.prefix));
      await this.storage.removeMultiple(stateKeys);
    } catch (error) {
      console.error("Failed to clear persisted state:", error);
      throw error;
    }
  }
}
class PersistedState {
  constructor(state, key, persistence, saveDebounceMs = 500) {
    this.state = state;
    this.key = key;
    this.persistence = persistence || new StatePersistence();
    this.saveDebounceMs = saveDebounceMs;
    this.loadFromStorage();
    this.state.subscribe((value) => {
      this.saveToStorage(value);
    });
  }
  /**
   * Load value from storage
   */
  async loadFromStorage() {
    const value = await this.persistence.load(this.key);
    if (value !== null) {
      this.state.set(value);
    }
  }
  /**
   * Save value to storage (debounced)
   */
  saveToStorage(value) {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = setTimeout(async () => {
      try {
        await this.persistence.save(this.key, value);
      } catch (error) {
        console.error("Failed to persist state:", error);
      }
    }, this.saveDebounceMs);
  }
  /**
   * Get current value
   */
  get() {
    return this.state.get();
  }
  /**
   * Set new value
   */
  set(value) {
    this.state.set(value);
  }
  /**
   * Update value
   */
  update(updater) {
    this.state.update(updater);
  }
  /**
   * Subscribe to changes
   */
  subscribe(subscriber) {
    return this.state.subscribe(subscriber);
  }
  /**
   * Force save to storage immediately
   */
  async flush() {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = void 0;
    }
    await this.persistence.save(this.key, this.get());
  }
  /**
   * Clear persisted value
   */
  async clearPersisted() {
    await this.persistence.remove(this.key);
  }
}
function persisted(initial, key, options) {
  const { storage, storageType, prefix, debounceMs } = options || {};
  let storageInstance = storage;
  if (!storageInstance && storageType) {
    const manager = new StorageManager();
    storageInstance = manager.getStorage(storageType);
  }
  const persistence = new StatePersistence(storageInstance, prefix);
  const state = new WritableState(initial);
  return new PersistedState(state, key, persistence, debounceMs);
}
function sessionPersisted(initial, key, options) {
  const manager = new StorageManager();
  const storage = manager.getStorage(StorageType.SESSION);
  return persisted(initial, key, {
    storage,
    ...options
  });
}
function localPersisted(initial, key, options) {
  const manager = new StorageManager();
  const storage = manager.getStorage(StorageType.LOCAL);
  return persisted(initial, key, {
    storage,
    ...options
  });
}
class BroadcastStateSync {
  constructor() {
    this.channels = /* @__PURE__ */ new Map();
    this.sourceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  /**
   * Get or create broadcast channel
   */
  getChannel(name) {
    if (!this.channels.has(name)) {
      const channel = new BroadcastChannel(name);
      this.channels.set(name, channel);
    }
    return this.channels.get(name);
  }
  /**
   * Sync state across contexts
   */
  sync(state, channel) {
    const broadcastChannel = this.getChannel(channel);
    const localUnsub = state.subscribe((value) => {
      this.broadcast(channel, value);
    });
    const messageHandler = (event) => {
      const message = event.data;
      if (message.source === this.sourceId) {
        return;
      }
      if (message.type === "state-sync" && message.channel === channel) {
        state.set(message.value);
      }
    };
    broadcastChannel.addEventListener("message", messageHandler);
    return () => {
      localUnsub();
      broadcastChannel.removeEventListener("message", messageHandler);
    };
  }
  /**
   * Broadcast state change
   */
  broadcast(channel, value) {
    const broadcastChannel = this.getChannel(channel);
    const message = {
      type: "state-sync",
      channel,
      value,
      timestamp: Date.now(),
      source: this.sourceId
    };
    broadcastChannel.postMessage(message);
  }
  /**
   * Listen for state changes
   */
  listen(channel, callback) {
    const broadcastChannel = this.getChannel(channel);
    const messageHandler = (event) => {
      const message = event.data;
      if (message.type === "state-sync" && message.channel === channel) {
        callback(message.value);
      }
    };
    broadcastChannel.addEventListener("message", messageHandler);
    return () => {
      broadcastChannel.removeEventListener("message", messageHandler);
    };
  }
  /**
   * Close all channels
   */
  close() {
    this.channels.forEach((channel) => channel.close());
    this.channels.clear();
  }
}
class StorageStateSync {
  constructor() {
    this.listeners = /* @__PURE__ */ new Map();
    this.prefix = "__state_sync__";
    this.sourceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  /**
   * Get storage key
   */
  getKey(channel) {
    return `${this.prefix}${channel}`;
  }
  /**
   * Sync state across contexts
   */
  sync(state, channel) {
    const key = this.getKey(channel);
    const localUnsub = state.subscribe((value) => {
      try {
        const message = {
          type: "state-sync",
          channel,
          value,
          timestamp: Date.now(),
          source: this.sourceId
        };
        localStorage.setItem(key, JSON.stringify(message));
      } catch (error) {
        console.error("Failed to sync state to storage:", error);
      }
    });
    const storageHandler = (event) => {
      if (event.key !== key || !event.newValue) {
        return;
      }
      try {
        const message = JSON.parse(event.newValue);
        if (message.source === this.sourceId) {
          return;
        }
        state.set(message.value);
      } catch (error) {
        console.error("Failed to parse storage sync message:", error);
      }
    };
    window.addEventListener("storage", storageHandler);
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, /* @__PURE__ */ new Set());
    }
    this.listeners.get(channel).add(storageHandler);
    return () => {
      localUnsub();
      window.removeEventListener("storage", storageHandler);
      this.listeners.get(channel)?.delete(storageHandler);
    };
  }
  /**
   * Broadcast state change
   */
  broadcast(channel, value) {
    const key = this.getKey(channel);
    try {
      const message = {
        type: "state-sync",
        channel,
        value,
        timestamp: Date.now(),
        source: this.sourceId
      };
      localStorage.setItem(key, JSON.stringify(message));
    } catch (error) {
      console.error("Failed to broadcast state:", error);
    }
  }
  /**
   * Listen for state changes
   */
  listen(channel, callback) {
    const key = this.getKey(channel);
    const storageHandler = (event) => {
      if (event.key !== key || !event.newValue) {
        return;
      }
      try {
        const message = JSON.parse(event.newValue);
        callback(message.value);
      } catch (error) {
        console.error("Failed to parse storage sync message:", error);
      }
    };
    window.addEventListener("storage", storageHandler);
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, /* @__PURE__ */ new Set());
    }
    this.listeners.get(channel).add(storageHandler);
    return () => {
      window.removeEventListener("storage", storageHandler);
      this.listeners.get(channel)?.delete(storageHandler);
    };
  }
  /**
   * Clean up
   */
  close() {
    this.listeners.forEach((handlers, channel) => {
      handlers.forEach((handler) => {
        window.removeEventListener("storage", handler);
      });
    });
    this.listeners.clear();
  }
}
function createStateSync() {
  if (typeof BroadcastChannel !== "undefined") {
    return new BroadcastStateSync();
  }
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    return new StorageStateSync();
  }
  return {
    sync: () => () => {
    },
    broadcast: () => {
    },
    listen: () => () => {
    }
  };
}
class SynchronizedState {
  constructor(state, channel, sync) {
    this.state = state;
    this.sync = sync || createStateSync();
    this.unsubscribe = this.sync.sync(state, channel);
  }
  get() {
    return this.state.get();
  }
  set(value) {
    this.state.set(value);
  }
  update(updater) {
    this.state.update(updater);
  }
  subscribe(subscriber) {
    return this.state.subscribe(subscriber);
  }
  /**
   * Stop syncing
   */
  disconnect() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = void 0;
    }
  }
}
function synchronized(initial, channel, options) {
  const state = new WritableState(initial);
  return new SynchronizedState(state, channel, options?.sync);
}
class StateManager {
  constructor(plugins) {
    this.states = /* @__PURE__ */ new Map();
    this.plugins = /* @__PURE__ */ new Map();
    this.stateCounter = 0;
    if (plugins) {
      plugins.forEach((plugin) => this.registerPlugin(plugin));
    }
  }
  /**
   * Create writable state
   */
  writable(initial, options) {
    const state = new WritableState(initial, options);
    let enhancedState = state;
    this.plugins.forEach((plugin) => {
      if (plugin.enhance) {
        enhancedState = plugin.enhance(enhancedState);
      }
    });
    const stateId = `state_${++this.stateCounter}`;
    this.states.set(stateId, enhancedState);
    return enhancedState;
  }
  /**
   * Create readable state
   */
  readable(initial, options) {
    const state = new ReadableState(initial, options);
    const stateId = `readonly_${++this.stateCounter}`;
    this.states.set(stateId, state);
    return state;
  }
  /**
   * Create derived state
   */
  derived(dependencies, fn, initial) {
    const state = new DerivedState(dependencies, fn, initial);
    const stateId = `derived_${++this.stateCounter}`;
    this.states.set(stateId, state);
    return state;
  }
  /**
   * Create state store
   */
  store(initial, options) {
    return new StateStore(initial, options);
  }
  /**
   * Get all states
   */
  getAllStates() {
    return new Map(this.states);
  }
  /**
   * Clear all states
   */
  clearAll() {
    this.states.forEach((state) => {
      if ("destroy" in state) {
        state.destroy();
      }
    });
    this.states.clear();
    this.plugins.forEach((plugin) => {
      if (plugin.destroy) {
        plugin.destroy();
      }
    });
  }
  /**
   * Register a plugin
   */
  registerPlugin(plugin) {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin "${plugin.name}" is already registered`);
      return;
    }
    this.plugins.set(plugin.name, plugin);
    plugin.init(this);
  }
  /**
   * Unregister a plugin
   */
  unregisterPlugin(name) {
    const plugin = this.plugins.get(name);
    if (plugin) {
      if (plugin.destroy) {
        plugin.destroy();
      }
      this.plugins.delete(name);
    }
  }
  /**
   * Get plugin by name
   */
  getPlugin(name) {
    return this.plugins.get(name);
  }
}
let globalStateManager = null;
function getStateManager() {
  if (!globalStateManager) {
    globalStateManager = new StateManager();
  }
  return globalStateManager;
}
function resetStateManager() {
  if (globalStateManager) {
    globalStateManager.clearAll();
    globalStateManager = null;
  }
}
function createStateManager(plugins) {
  return new StateManager(plugins);
}
export {
  A as AccountManager,
  AccountType,
  AccountTypeCategory,
  AccountTypeStatus,
  BASIS_POINTS_DIVISOR,
  BaseProvider,
  BaseStorageProvider,
  BatchedObservable,
  BigNumber,
  BigNumberishMath,
  BigNumberishUtils,
  BroadcastStateSync,
  CACHE_TTL,
  CORE_VERSION,
  CacheEvictionPolicy,
  ChainId,
  ChainType,
  ChromeLocalStorageProviderFactory,
  ChromeStorageProvider,
  ChromeSyncStorageProviderFactory,
  ComputedObservable,
  Container,
  CurrencyCode,
  DAY,
  DEFAULT_BACKOFF_MULTIPLIER,
  DEFAULT_BASE_DELAY,
  DEFAULT_CHAINS,
  DEFAULT_DERIVED_PATH_ETH,
  DEFAULT_HTTP_TIMEOUT,
  DEFAULT_MAX_RETRIES,
  DEFAULT_PAGE_SIZE,
  DEFAULT_RPC_TIMEOUT,
  DecimalMath,
  DerivedState,
  D as DiscoveryProtocol,
  ETH_BASE_EOA_GAS_UNITS,
  ETH_BASE_FORCANCEL_GAS_UNITS,
  ETH_BASE_SCA_GAS_UNITS,
  ETH_BASE_SWAP_GAS_UNITS,
  EVMDenominations,
  EVMProvider,
  EVMTransactionBuilder,
  E as EmbeddedAPI,
  EncryptedStorageWrapper,
  GAS_PER_BLOB,
  HOUR,
  HistoryObservable,
  IndexedDBProvider,
  IndexedDBProviderFactory,
  Inject,
  Injectable,
  InjectionTokens,
  I as IntegrationAPI,
  LocalStorageProvider,
  LocalStorageProviderFactory,
  LogLevel,
  L as Logger,
  MAX_PAGE_SIZE,
  MAX_PASSWORD_LENGTH,
  MIME_TYPES,
  MINUTE,
  MIN_PASSWORD_LENGTH,
  MemoryStorageProvider,
  MemoryStorageProviderFactory,
  MessageBus,
  MessageRouter,
  MessageType,
  a as ModLoader,
  M as ModRegistry,
  NATIVE_TOKEN_SYMBOLS,
  NETWORK_NAMES,
  N as NetworkManager,
  Observable,
  PATTERNS,
  PBKDF2_ITERATIONS,
  PersistedState,
  ProviderError,
  ProviderFactory,
  RPCErrorCode,
  RateLimitPresets,
  RateLimiter,
  ReadableState,
  RegisteredType,
  R as RemoteAPI,
  RpcErrorCode,
  SALT_ROUNDS,
  SCRYPT_N,
  SCRYPT_P,
  SCRYPT_R,
  SECOND,
  STORAGE_VERSION,
  Service,
  ServiceFactory,
  ServiceLocator,
  SortDirection,
  State,
  StateManager,
  StatePersistence,
  StateStore,
  Status,
  StorageManager,
  StorageMigrator,
  StorageStateSync,
  StorageType,
  StreamState,
  SynchronizedState,
  SystemTheme,
  TokenStandard,
  TransactionCategory,
  T as TransactionManager,
  TransactionStatus,
  TransactionType,
  VersionedStorageWrapper,
  WEEK,
  WETH_ADDRESS_MAINNET,
  WalletEngine,
  WritableState,
  ZERO_ADDRESS,
  addDays,
  combineStores,
  convertBasisPointsToDecimal,
  createAutoCleanupRateLimiter,
  createMessageBus,
  createMessageRouter,
  createRateLimitMiddleware,
  createRateLimiter,
  createRetryMiddleware,
  createServiceFactory,
  createStateManager,
  createStateSync,
  createStore,
  createValidationMiddleware,
  createWallet,
  dateString,
  defaultContainer,
  derived,
  endOfDay,
  ensureHexFormat,
  formatDate,
  formatTimestamp,
  get,
  getRelativeTime,
  getSafeUUID,
  getStateManager,
  getTime,
  globalMessageBus,
  globalServiceFactory,
  initializeDefaultChains,
  initializeDefaultProviders,
  isAddress,
  isHexString,
  isInRange,
  isNotEmpty,
  isToday,
  isTransactionHash,
  isValidAddress,
  isValidEmail,
  isValidTransactionHash,
  isYesterday,
  localPersisted,
  loggingMiddleware,
  persisted,
  providerFactory,
  readable,
  resetStateManager,
  safeConvertToBigInt,
  sessionPersisted,
  startOfDay,
  synchronized,
  validateMod,
  validateObject,
  writable
};
//# sourceMappingURL=index.mjs.map
