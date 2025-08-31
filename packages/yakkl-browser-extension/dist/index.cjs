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
const messaging = require("./messaging.cjs");
const manifest = require("./manifest.cjs");
class ExtensionStorage {
  constructor(options = {}) {
    this.prefix = options.prefix || "";
    this.encrypt = options.encrypt || false;
    this.area = this.getStorageArea(options.area || "local");
  }
  /**
   * Get item from storage
   */
  async get(key) {
    const fullKey = this.getFullKey(key);
    const result = await this.area.get(fullKey);
    if (result[fullKey] === void 0) {
      return void 0;
    }
    const value = result[fullKey];
    return this.decrypt ? await this.decryptValue(value) : value;
  }
  /**
   * Get multiple items from storage
   */
  async getMultiple(keys) {
    const fullKeys = keys.map((key) => this.getFullKey(key));
    const results = await this.area.get(fullKeys);
    const items = {};
    for (const key of keys) {
      const fullKey = this.getFullKey(key);
      if (results[fullKey] !== void 0) {
        const value = results[fullKey];
        items[key] = this.encrypt ? await this.decryptValue(value) : value;
      }
    }
    return items;
  }
  /**
   * Get all items from storage
   */
  async getAll() {
    const results = await this.area.get(null);
    const items = {};
    for (const [fullKey, value] of Object.entries(results)) {
      if (this.prefix && !fullKey.startsWith(this.prefix)) {
        continue;
      }
      const key = this.prefix ? fullKey.slice(this.prefix.length) : fullKey;
      items[key] = this.encrypt ? await this.decryptValue(value) : value;
    }
    return items;
  }
  /**
   * Set item in storage
   */
  async set(key, value) {
    const fullKey = this.getFullKey(key);
    const encryptedValue = this.encrypt ? await this.encryptValue(value) : value;
    await this.area.set({
      [fullKey]: encryptedValue
    });
  }
  /**
   * Set multiple items in storage
   */
  async setMultiple(items) {
    const storageItems = {};
    for (const [key, value] of Object.entries(items)) {
      const fullKey = this.getFullKey(key);
      storageItems[fullKey] = this.encrypt ? await this.encryptValue(value) : value;
    }
    await this.area.set(storageItems);
  }
  /**
   * Remove item from storage
   */
  async remove(key) {
    const fullKey = this.getFullKey(key);
    await this.area.remove(fullKey);
  }
  /**
   * Remove multiple items from storage
   */
  async removeMultiple(keys) {
    const fullKeys = keys.map((key) => this.getFullKey(key));
    await this.area.remove(fullKeys);
  }
  /**
   * Clear all items from storage
   */
  async clear() {
    if (this.prefix) {
      const all = await this.area.get(null);
      const keysToRemove = Object.keys(all).filter((key) => key.startsWith(this.prefix));
      if (keysToRemove.length > 0) {
        await this.area.remove(keysToRemove);
      }
    } else {
      await this.area.clear();
    }
  }
  /**
   * Get storage usage
   */
  async getUsage() {
    if ("getBytesInUse" in this.area) {
      return await this.area.getBytesInUse(null);
    }
    return 0;
  }
  /**
   * Watch for storage changes
   */
  watch(keys, handler) {
    const watchKeys = Array.isArray(keys) ? keys : [keys];
    const fullKeys = new Set(watchKeys.map((key) => this.getFullKey(key)));
    const listener = (changes, areaName) => {
      const relevantChanges = {};
      for (const [fullKey, change] of Object.entries(changes)) {
        if (fullKeys.has(fullKey)) {
          const key = this.prefix ? fullKey.slice(this.prefix.length) : fullKey;
          relevantChanges[key] = {
            oldValue: change.oldValue,
            newValue: change.newValue
          };
        }
      }
      if (Object.keys(relevantChanges).length > 0) {
        handler(relevantChanges, areaName);
      }
    };
    this.getBrowser().then((browser2) => {
      browser2.storage.onChanged.addListener(listener);
    });
    return () => {
      this.getBrowser().then((browser2) => {
        browser2.storage.onChanged.removeListener(listener);
      });
    };
  }
  /**
   * Get full storage key with prefix
   */
  getFullKey(key) {
    return this.prefix ? `${this.prefix}${key}` : key;
  }
  /**
   * Get storage area
   */
  getStorageArea(area) {
    const browser2 = globalThis.browser || globalThis.chrome;
    switch (area) {
      case "sync":
        return browser2.storage.sync;
      case "managed":
        return browser2.storage.managed;
      case "session":
        return browser2.storage.session || browser2.storage.local;
      case "local":
      default:
        return browser2.storage.local;
    }
  }
  /**
   * Encrypt value (placeholder - implement with @yakkl/security)
   */
  async encryptValue(value) {
    return value;
  }
  /**
   * Decrypt value (placeholder - implement with @yakkl/security)
   */
  async decryptValue(value) {
    return value;
  }
  /**
   * Get browser API
   */
  async getBrowser() {
    if (typeof browser !== "undefined") {
      return browser;
    }
    return await import("webextension-polyfill");
  }
}
function createExtensionStorage(options) {
  return new ExtensionStorage(options);
}
class ExtensionContextManager {
  constructor() {
    this.contextInfo = null;
    this.detectContext();
  }
  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!ExtensionContextManager.instance) {
      ExtensionContextManager.instance = new ExtensionContextManager();
    }
    return ExtensionContextManager.instance;
  }
  /**
   * Get current context info
   */
  getContext() {
    if (!this.contextInfo) {
      this.detectContext();
    }
    return this.contextInfo;
  }
  /**
   * Check if running in specific context
   */
  isContext(context) {
    return this.getContext().type === context;
  }
  /**
   * Check if running in background
   */
  isBackground() {
    return this.isContext("background");
  }
  /**
   * Check if running in popup
   */
  isPopup() {
    return this.isContext("popup");
  }
  /**
   * Check if running in content script
   */
  isContentScript() {
    return this.isContext("content-script");
  }
  /**
   * Check if running in options page
   */
  isOptions() {
    return this.isContext("options");
  }
  /**
   * Check if running in devtools
   */
  isDevtools() {
    return this.isContext("devtools");
  }
  /**
   * Check if running in sidebar
   */
  isSidebar() {
    return this.isContext("sidebar");
  }
  /**
   * Check if running in offscreen document
   */
  isOffscreen() {
    return this.isContext("offscreen");
  }
  /**
   * Detect current context
   */
  detectContext() {
    var _a, _b, _c, _d, _e, _f;
    const hasChrome = typeof chrome !== "undefined";
    const hasBrowser = typeof browser !== "undefined";
    if (!hasChrome && !hasBrowser) {
      this.contextInfo = { type: "unknown" };
      return;
    }
    const runtime = ((_a = globalThis.chrome) == null ? void 0 : _a.runtime) || ((_b = globalThis.browser) == null ? void 0 : _b.runtime);
    const extension = ((_c = globalThis.chrome) == null ? void 0 : _c.extension) || ((_d = globalThis.browser) == null ? void 0 : _d.extension);
    if (typeof ServiceWorkerGlobalScope !== "undefined" && self instanceof ServiceWorkerGlobalScope) {
      this.contextInfo = { type: "background" };
      return;
    }
    if ((extension == null ? void 0 : extension.getBackgroundPage) && extension.getBackgroundPage() === window) {
      this.contextInfo = { type: "background" };
      return;
    }
    if (typeof document !== "undefined") {
      const url = ((_e = document.location) == null ? void 0 : _e.href) || "";
      if (url.includes("popup.html") || ((_f = document.body) == null ? void 0 : _f.classList.contains("popup"))) {
        this.contextInfo = {
          type: "popup",
          url
        };
        return;
      }
      if (url.includes("options.html") || url.includes("options.html")) {
        this.contextInfo = {
          type: "options",
          url
        };
        return;
      }
      if (url.includes("devtools.html")) {
        this.contextInfo = {
          type: "devtools",
          url
        };
        return;
      }
      if (url.includes("sidebar.html") || url.includes("side_panel.html")) {
        this.contextInfo = {
          type: "sidebar",
          url
        };
        return;
      }
      if (url.includes("offscreen.html")) {
        this.contextInfo = {
          type: "offscreen",
          url
        };
        return;
      }
      if (runtime && !runtime.getBackgroundPage) {
        this.contextInfo = {
          type: "content-script",
          url: window.location.href
        };
        return;
      }
    }
    this.contextInfo = { type: "unknown" };
  }
  /**
   * Get browser API based on context
   */
  async getBrowserAPI() {
    if (typeof browser !== "undefined") {
      return browser;
    }
    if (typeof chrome !== "undefined") {
      return chrome;
    }
    try {
      const webExtPolyfill = await import("webextension-polyfill");
      return webExtPolyfill.default;
    } catch {
      throw new Error("No browser API available");
    }
  }
  /**
   * Check if API is available in current context
   */
  hasAPI(api) {
    try {
      const browserAPI = globalThis.chrome || globalThis.browser;
      const parts = api.split(".");
      let current = browserAPI;
      for (const part of parts) {
        if (!current || typeof current[part] === "undefined") {
          return false;
        }
        current = current[part];
      }
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Execute code in specific context
   */
  async executeInContext(targetContext, code) {
    const currentContext = this.getContext();
    if (currentContext.type === targetContext) {
      return await code();
    }
    throw new Error(`Cannot execute code in ${targetContext} from ${currentContext.type}`);
  }
}
const contextManager = ExtensionContextManager.getInstance();
function RequireContext(context) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function(...args) {
      const manager = ExtensionContextManager.getInstance();
      const currentContext = manager.getContext().type;
      const allowedContexts = Array.isArray(context) ? context : [context];
      if (!allowedContexts.includes(currentContext)) {
        throw new Error(
          `Method ${propertyKey} can only be called from ${allowedContexts.join(" or ")} context, but was called from ${currentContext}`
        );
      }
      return originalMethod.apply(this, args);
    };
    return descriptor;
  };
}
function getBrowserAPI() {
  if (typeof browser !== "undefined") {
    return browser;
  }
  if (typeof chrome !== "undefined") {
    return chrome;
  }
  return null;
}
function isExtensionContext() {
  var _a, _b;
  return !!((_b = (_a = getBrowserAPI()) == null ? void 0 : _a.runtime) == null ? void 0 : _b.id);
}
function getExtensionId() {
  var _a, _b;
  return ((_b = (_a = getBrowserAPI()) == null ? void 0 : _a.runtime) == null ? void 0 : _b.id) || null;
}
function getExtensionVersion() {
  var _a, _b, _c, _d;
  return ((_d = (_c = (_b = (_a = getBrowserAPI()) == null ? void 0 : _a.runtime) == null ? void 0 : _b.getManifest) == null ? void 0 : _c.call(_b)) == null ? void 0 : _d.version) || null;
}
exports.ExtensionMessageHandler = messaging.ExtensionMessageHandler;
exports.createMessageHandler = messaging.createMessageHandler;
exports.ManifestBuilder = manifest.ManifestBuilder;
exports.createWalletManifest = manifest.createWalletManifest;
exports.ExtensionContextManager = ExtensionContextManager;
exports.ExtensionStorage = ExtensionStorage;
exports.RequireContext = RequireContext;
exports.contextManager = contextManager;
exports.createExtensionStorage = createExtensionStorage;
exports.getBrowserAPI = getBrowserAPI;
exports.getExtensionId = getExtensionId;
exports.getExtensionVersion = getExtensionVersion;
exports.isExtensionContext = isExtensionContext;
//# sourceMappingURL=index.cjs.map
