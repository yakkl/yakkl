import { EventEmitter as l } from "eventemitter3";
class a {
  constructor(e, t = 1) {
    this.context = e, this.level = t;
  }
  debug(e, ...t) {
    this.level <= 0 && console.debug(`[${this.context}] ${e}`, ...t);
  }
  info(e, ...t) {
    this.level <= 1 && console.info(`[${this.context}] ${e}`, ...t);
  }
  warn(e, t) {
    this.level <= 2 && (t ? console.warn(`[${this.context}] ${e}`, t) : console.warn(`[${this.context}] ${e}`));
  }
  error(e, t) {
    this.level <= 3 && (t ? console.error(`[${this.context}] ${e}`, t) : console.error(`[${this.context}] ${e}`));
  }
  setLevel(e) {
    this.level = e;
  }
}
class d {
  constructor() {
    this.loadedModules = /* @__PURE__ */ new Map(), this.systemMods = /* @__PURE__ */ new Map(), this.logger = new a("ModLoader"), this.registerSystemMods();
  }
  /**
   * Load a mod by ID
   */
  async load(e) {
    this.logger.info(`Loading mod: ${e}`);
    try {
      if (this.loadedModules.has(e)) {
        const s = this.loadedModules.get(e);
        return this.instantiateMod(s);
      }
      const t = await this.resolveModSources(e);
      for (const s of t)
        try {
          const r = await this.loadFromSource(e, s);
          if (r)
            return this.loadedModules.set(e, r), this.instantiateMod(r);
        } catch (r) {
          this.logger.warn(`Failed to load from ${s.type}: ${s.location}`, r);
          continue;
        }
      throw new Error(`Mod ${e} not found in any source`);
    } catch (t) {
      throw this.logger.error(`Failed to load mod ${e}`, t), t;
    }
  }
  /**
   * Get list of user-installed mods
   */
  async getUserMods() {
    try {
      const e = localStorage.getItem("yakkl:userMods");
      return e ? JSON.parse(e) : [];
    } catch (e) {
      return this.logger.warn("Failed to get user mods", e), [];
    }
  }
  /**
   * Install a mod
   */
  async install(e, t) {
    this.logger.info(`Installing mod: ${e} from ${t.type}`);
    try {
      const s = await this.loadFromSource(e, t);
      if (!s)
        throw new Error("Failed to load mod module");
      await this.validateMod(s);
      const r = await this.getUserMods();
      r.includes(e) || (r.push(e), localStorage.setItem("yakkl:userMods", JSON.stringify(r))), this.loadedModules.set(e, s), this.logger.info(`Mod ${e} installed successfully`);
    } catch (s) {
      throw this.logger.error(`Failed to install mod ${e}`, s), s;
    }
  }
  /**
   * Uninstall a mod
   */
  async uninstall(e) {
    this.logger.info(`Uninstalling mod: ${e}`);
    try {
      const s = (await this.getUserMods()).filter((r) => r !== e);
      localStorage.setItem("yakkl:userMods", JSON.stringify(s)), this.loadedModules.delete(e), await this.cleanupModStorage(e), this.logger.info(`Mod ${e} uninstalled successfully`);
    } catch (t) {
      throw this.logger.error(`Failed to uninstall mod ${e}`, t), t;
    }
  }
  /**
   * Check if a mod is available
   */
  async isAvailable(e) {
    try {
      return (await this.resolveModSources(e)).length > 0;
    } catch {
      return !1;
    }
  }
  /**
   * Get mod manifest without loading the mod
   */
  async getManifest(e) {
    try {
      const t = await this.resolveModSources(e);
      for (const s of t)
        try {
          const r = await this.loadManifestFromSource(e, s);
          if (r)
            return r;
        } catch {
          continue;
        }
      return null;
    } catch {
      return null;
    }
  }
  /**
   * Private methods
   */
  registerSystemMods() {
    this.systemMods.set("basic-portfolio", async () => {
      throw new Error("System mod basic-portfolio not implemented");
    }), this.systemMods.set("account-manager", async () => {
      throw new Error("System mod account-manager not implemented");
    }), this.systemMods.set("network-manager", async () => {
      throw new Error("System mod network-manager not implemented");
    });
  }
  async resolveModSources(e) {
    const t = [];
    return this.systemMods.has(e) && t.push({
      type: "system",
      location: e,
      verified: !0
    }), t.push({
      type: "local",
      location: `/src/routes/preview2/lib/mods/${e}/index.ts`,
      verified: !0
    }), t.push({
      type: "npm",
      location: `@yakkl/mod-${e}`,
      verified: !1
    }), t.push({
      type: "url",
      location: `https://registry.yakkl.com/mods/${e}/latest.js`,
      verified: !0
    }), t;
  }
  async loadFromSource(e, t) {
    switch (t.type) {
      case "system":
        return this.loadSystemMod(e);
      case "local":
        return this.loadLocalMod(t.location);
      case "npm":
        return this.loadNpmMod(t.location);
      case "url":
        return this.loadUrlMod(t.location);
      default:
        throw new Error(`Unknown source type: ${t.type}`);
    }
  }
  async loadSystemMod(e) {
    const t = this.systemMods.get(e);
    if (!t)
      throw new Error(`System mod ${e} not found`);
    try {
      return await t();
    } catch (s) {
      return this.logger.warn(`System mod ${e} not implemented`, s), null;
    }
  }
  async loadLocalMod(e) {
    try {
      return await import(
        /* @vite-ignore */
        e
      );
    } catch (t) {
      throw new Error(`Failed to load local mod: ${t}`);
    }
  }
  async loadNpmMod(e) {
    try {
      return await import(
        /* @vite-ignore */
        e
      );
    } catch (t) {
      throw new Error(`Failed to load NPM mod: ${t}`);
    }
  }
  async loadUrlMod(e) {
    try {
      const t = await fetch(e);
      if (!t.ok)
        throw new Error(`HTTP ${t.status}: ${t.statusText}`);
      const s = await t.text();
      if (!s.includes("export"))
        throw new Error("Invalid mod format - no exports found");
      const r = new Blob([s], { type: "application/javascript" }), o = URL.createObjectURL(r);
      try {
        return await import(
          /* @vite-ignore */
          o
        );
      } finally {
        URL.revokeObjectURL(o);
      }
    } catch (t) {
      throw new Error(`Failed to load remote mod: ${t}`);
    }
  }
  async loadManifestFromSource(e, t) {
    try {
      switch (t.type) {
        case "system":
        case "local":
          const s = t.location.replace("/index.ts", "/manifest.json"), r = await fetch(s);
          return r.ok ? await r.json() : null;
        case "npm":
          return (await this.loadNpmMod(t.location))?.manifest || null;
        case "url":
          const n = t.location.replace("/latest.js", "/manifest.json"), c = await fetch(n);
          return c.ok ? await c.json() : null;
        default:
          return null;
      }
    } catch {
      return null;
    }
  }
  instantiateMod(e) {
    const t = e.default || e.Mod || Object.values(e)[0];
    if (!t || typeof t != "function")
      throw new Error("Invalid mod format - no mod class found");
    return new t();
  }
  async validateMod(e) {
    const t = this.instantiateMod(e);
    if (!t.manifest)
      throw new Error("Mod missing manifest");
    if (!t.manifest.id || !t.manifest.name || !t.manifest.version)
      throw new Error("Mod manifest missing required fields");
    const s = ["initialize", "destroy", "isLoaded", "isActive"];
    for (const r of s)
      if (typeof t[r] != "function")
        throw new Error(`Mod missing required method: ${r}`);
    this.logger.debug(`Mod ${t.manifest.id} validation passed`);
  }
  async cleanupModStorage(e) {
    try {
      const t = `mod:${e}:`;
      Object.keys(localStorage).filter((r) => r.startsWith(t)).forEach((r) => localStorage.removeItem(r)), this.logger.debug(`Cleaned up storage for mod ${e}`);
    } catch (t) {
      this.logger.warn(`Failed to cleanup storage for mod ${e}`, t);
    }
  }
}
class u extends l {
  constructor(e) {
    super(), this.loadedMods = /* @__PURE__ */ new Map(), this.manifests = /* @__PURE__ */ new Map(), this.enhancements = /* @__PURE__ */ new Map(), this.permissions = /* @__PURE__ */ new Map(), this.engine = e, this.loader = new d(), this.logger = new a("ModRegistry");
  }
  /**
   * Initialize the registry
   */
  async initialize() {
    this.logger.info("Initializing mod registry");
    try {
      await this.loadSystemMods(), await this.loadUserMods(), await this.detectEnhancements(), this.logger.info(`Registry initialized with ${this.loadedMods.size} mods`);
    } catch (e) {
      throw this.logger.error("Failed to initialize registry", e), e;
    }
  }
  /**
   * Load a mod by ID
   */
  async load(e) {
    const t = this.loadedMods.get(e);
    if (t)
      return t;
    this.logger.info(`Loading mod: ${e}`);
    try {
      const s = await this.loader.load(e);
      return await this.validatePermissions(s), await s.initialize(this.engine), this.loadedMods.set(e, s), this.manifests.set(e, s.manifest), this.permissions.set(e, s.manifest.permissions), await this.checkEnhancements(s), this.emit("mod:loaded", s), this.logger.info(`Mod loaded successfully: ${e}`), s;
    } catch (s) {
      throw this.logger.error(`Failed to load mod: ${e}`, s), this.emit("mod:error", e, s), s;
    }
  }
  /**
   * Unload a mod
   */
  async unload(e) {
    const t = this.loadedMods.get(e);
    if (t) {
      this.logger.info(`Unloading mod: ${e}`);
      try {
        this.removeEnhancements(e), await t.destroy(), this.loadedMods.delete(e), this.manifests.delete(e), this.permissions.delete(e), this.emit("mod:unloaded", e), this.logger.info(`Mod unloaded: ${e}`);
      } catch (s) {
        throw this.logger.error(`Failed to unload mod: ${e}`, s), s;
      }
    }
  }
  /**
   * Get all loaded mods
   */
  getLoaded() {
    return Array.from(this.loadedMods.values());
  }
  /**
   * Get mod by ID
   */
  get(e) {
    return this.loadedMods.get(e) || null;
  }
  /**
   * Check if mod is loaded
   */
  isLoaded(e) {
    return this.loadedMods.has(e);
  }
  /**
   * Get mod manifest
   */
  getManifest(e) {
    return this.manifests.get(e) || null;
  }
  /**
   * Get all manifests
   */
  getAllManifests() {
    return Array.from(this.manifests.values());
  }
  /**
   * Get mods by category
   */
  getByCategory(e) {
    return Array.from(this.loadedMods.values()).filter((t) => t.manifest.category === e);
  }
  /**
   * Get mods by tier
   */
  getByTier(e) {
    return Array.from(this.loadedMods.values()).filter((t) => t.manifest.tier === e);
  }
  /**
   * Get enhancements for a mod
   */
  getEnhancements(e) {
    return this.enhancements.get(e) || [];
  }
  /**
   * Get all enhancements
   */
  getAllEnhancements() {
    const e = [];
    for (const t of this.enhancements.values())
      e.push(...t);
    return e;
  }
  /**
   * Destroy the registry
   */
  async destroy() {
    this.logger.info("Destroying mod registry");
    const e = Array.from(this.loadedMods.keys());
    await Promise.all(e.map((t) => this.unload(t))), this.loadedMods.clear(), this.manifests.clear(), this.enhancements.clear(), this.permissions.clear(), this.removeAllListeners();
  }
  /**
   * Load system mods (built-in)
   */
  async loadSystemMods() {
    const e = [
      "basic-portfolio",
      "send-receive",
      "network-manager",
      "account-manager"
    ];
    for (const t of e)
      try {
        await this.load(t);
      } catch (s) {
        this.logger.warn(`Failed to load system mod: ${t}`, s);
      }
  }
  /**
   * Load user-installed mods
   */
  async loadUserMods() {
    try {
      const e = await this.loader.getUserMods();
      for (const t of e)
        try {
          await this.load(t);
        } catch (s) {
          this.logger.warn(`Failed to load user mod: ${t}`, s);
        }
    } catch (e) {
      this.logger.warn("Failed to load user mods", e);
    }
  }
  /**
   * Validate mod permissions
   */
  async validatePermissions(e) {
    const t = e.manifest, s = this.engine.getConfig();
    if (s.restrictions.includes("enterprise-only") && t.tier !== "enterprise")
      throw new Error(`Mod ${t.id} not allowed in enterprise-only mode`);
    for (const r of t.permissions)
      if (!this.isPermissionGranted(r, s))
        throw new Error(`Permission ${r} not granted for mod ${t.id}`);
  }
  /**
   * Check if permission is granted
   */
  isPermissionGranted(e, t) {
    return !0;
  }
  /**
   * Detect potential enhancements between mods
   */
  async detectEnhancements() {
    const e = Array.from(this.loadedMods.values());
    for (const t of e)
      await this.checkEnhancements(t);
  }
  /**
   * Check enhancements for a specific mod
   */
  async checkEnhancements(e) {
    const t = e.manifest;
    for (const s of t.enhances) {
      const r = this.loadedMods.get(s);
      if (r && await e.enhance(r)) {
        const n = {
          sourceMod: t.id,
          targetMod: s,
          type: "feature",
          description: `${t.name} enhances ${r.manifest.name}`,
          active: !0
        };
        this.addEnhancement(n);
      }
    }
  }
  /**
   * Add an enhancement
   */
  addEnhancement(e) {
    const t = this.enhancements.get(e.targetMod) || [];
    t.push(e), this.enhancements.set(e.targetMod, t), this.emit("enhancement:added", e), this.logger.info(`Enhancement added: ${e.sourceMod} → ${e.targetMod}`);
  }
  /**
   * Remove enhancements for a mod
   */
  removeEnhancements(e) {
    for (const [t, s] of this.enhancements.entries()) {
      const r = s.filter((o) => o.sourceMod !== e);
      r.length !== s.length && (this.enhancements.set(t, r), s.filter((n) => n.sourceMod === e).forEach((n) => this.emit("enhancement:removed", n)));
    }
    this.enhancements.delete(e);
  }
}
class m extends l {
  constructor(e) {
    super(), this.discoveredMods = /* @__PURE__ */ new Map(), this.discoveredPeers = /* @__PURE__ */ new Map(), this.scanInterval = null, this.running = !1, this.engine = e, this.logger = new a("DiscoveryProtocol");
  }
  /**
   * Start the discovery protocol
   */
  async start() {
    if (!this.running) {
      this.logger.info("Starting mod discovery protocol");
      try {
        await this.scanEnvironment(), this.scanInterval = setInterval(() => {
          this.scanEnvironment().catch((e) => {
            this.logger.warn("Discovery scan failed", e);
          });
        }, 3e4), await this.setupPeerDetection(), this.running = !0;
      } catch (e) {
        throw this.logger.error("Failed to start discovery protocol", e), e;
      }
    }
  }
  /**
   * Stop the discovery protocol
   */
  async stop() {
    this.running && (this.logger.info("Stopping mod discovery protocol"), this.scanInterval && (clearInterval(this.scanInterval), this.scanInterval = null), await this.teardownPeerDetection(), this.discoveredMods.clear(), this.discoveredPeers.clear(), this.running = !1);
  }
  /**
   * Manually scan for mods
   */
  async scan() {
    return this.scanEnvironment();
  }
  /**
   * Get all discovered mods
   */
  getDiscoveredMods() {
    return Array.from(this.discoveredMods.values());
  }
  /**
   * Get all discovered peers
   */
  getDiscoveredPeers() {
    return Array.from(this.discoveredPeers.values());
  }
  /**
   * Check if a specific mod is available in the environment
   */
  isModAvailable(e) {
    return this.discoveredMods.has(e);
  }
  /**
   * Private methods
   */
  async scanEnvironment() {
    const e = [];
    try {
      const t = ["registry", "local", "environment", "peer"];
      for (const r of t)
        try {
          const o = await this.scanSource(r);
          e.push(...o);
        } catch (o) {
          this.logger.debug(`Failed to scan ${r}`, o);
        }
      const s = [];
      for (const r of e)
        this.discoveredMods.has(r.manifest.id) || s.push(r), this.discoveredMods.set(r.manifest.id, r);
      return s.length > 0 && (this.emit("mod:discovered", s), this.logger.info(`Discovered ${s.length} new mods`)), e;
    } catch (t) {
      return this.logger.error("Environment scan failed", t), [];
    }
  }
  async scanSource(e) {
    switch (e) {
      case "registry":
        return this.scanRegistry();
      case "local":
        return this.scanLocal();
      case "environment":
        return this.scanEnvironmentMods();
      case "peer":
        return this.scanPeerMods();
      default:
        return [];
    }
  }
  async scanRegistry() {
    try {
      const e = await fetch("https://registry.yakkl.com/api/mods/featured");
      if (!e.ok)
        throw new Error(`Registry request failed: ${e.status}`);
      return (await e.json()).mods.map((s) => ({
        source: "registry",
        manifest: s,
        verified: !0,
        available: !0,
        installUrl: `https://registry.yakkl.com/mods/${s.id}/install`
      }));
    } catch (e) {
      return this.logger.debug("Registry scan failed", e), [];
    }
  }
  async scanLocal() {
    try {
      const e = [];
      return typeof import.meta < "u", e;
    } catch (e) {
      return this.logger.debug("Local scan failed", e), [];
    }
  }
  async scanEnvironmentMods() {
    try {
      const e = [], t = document.querySelectorAll("[data-yakkl-mod]");
      for (let s = 0; s < t.length; s++) {
        const r = t[s];
        try {
          const o = r.getAttribute("data-yakkl-mod");
          if (o) {
            const n = JSON.parse(o);
            e.push({
              source: "environment",
              manifest: n,
              verified: !1,
              available: !0
            });
          }
        } catch {
        }
      }
      return this.setupPostMessageListener(), e;
    } catch (e) {
      return this.logger.debug("Environment scan failed", e), [];
    }
  }
  async scanPeerMods() {
    const e = [];
    for (const t of this.discoveredPeers.values())
      for (const s of t.mods)
        e.push({
          source: "peer",
          manifest: { id: s, name: s, version: "1.0.0" },
          verified: !1,
          available: !0
        });
    return e;
  }
  async setupPeerDetection() {
    typeof window < "u" && (this.broadcastPresence().catch((e) => {
      this.logger.debug("Failed to broadcast initial presence", e);
    }), window.addEventListener("message", this.handlePeerMessage.bind(this)), setInterval(() => {
      this.broadcastPresence().catch((e) => {
        this.logger.debug("Failed to broadcast periodic presence", e);
      });
    }, 6e4));
  }
  async teardownPeerDetection() {
    typeof window < "u" && window.removeEventListener("message", this.handlePeerMessage.bind(this));
  }
  async broadcastPresence() {
    try {
      const e = {
        type: "yakkl:presence",
        id: this.generatePeerId(),
        version: "2.0.0",
        mods: (await this.engine.getLoadedMods()).map((t) => t.manifest.id),
        capabilities: ["mod-discovery", "cross-enhancement"],
        timestamp: Date.now()
      };
      window.parent !== window && window.parent.postMessage(e, "*");
      for (let t = 0; t < window.frames.length; t++)
        try {
          window.frames[t].postMessage(e, "*");
        } catch {
        }
    } catch (e) {
      this.logger.debug("Failed to broadcast presence", e);
    }
  }
  handlePeerMessage(e) {
    try {
      const t = e.data;
      if (t.type === "yakkl:presence") {
        const s = {
          id: t.id,
          type: "webapp",
          // Assume webapp for now
          version: t.version,
          mods: t.mods || [],
          capabilities: t.capabilities || []
        };
        this.discoveredPeers.set(s.id, s), this.emit("peer:detected", s), this.logger.debug(`Discovered peer: ${s.id} with ${s.mods.length} mods`);
      }
    } catch (t) {
      this.logger.debug("Failed to handle peer message", t);
    }
  }
  setupPostMessageListener() {
    window.addEventListener("message", (e) => {
      try {
        const t = e.data;
        if (t.type === "yakkl:mod-announcement") {
          const s = {
            source: "environment",
            manifest: t.manifest,
            verified: t.verified || !1,
            available: !0
          };
          this.discoveredMods.set(t.manifest.id, s), this.emit("mod:discovered", [s]);
        }
      } catch {
      }
    });
  }
  generatePeerId() {
    if (!localStorage.getItem("yakkl:peerId")) {
      const e = `peer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("yakkl:peerId", e);
    }
    return localStorage.getItem("yakkl:peerId");
  }
}
export {
  m as D,
  a as L,
  u as M,
  d as a
};
//# sourceMappingURL=DiscoveryProtocol-C3idOBxL.mjs.map
