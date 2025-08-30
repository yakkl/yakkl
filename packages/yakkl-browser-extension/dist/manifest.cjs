"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
class ManifestBuilder {
  constructor(name, version) {
    this.manifest = {
      manifest_version: 3
    };
    this.manifest.name = name;
    this.manifest.version = version;
  }
  /**
   * Set basic metadata
   */
  setDescription(description) {
    this.manifest.description = description;
    return this;
  }
  setAuthor(author) {
    this.manifest.author = author;
    return this;
  }
  setHomepage(url) {
    this.manifest.homepage_url = url;
    return this;
  }
  /**
   * Set icons
   */
  setIcons(icons) {
    this.manifest.icons = icons;
    return this;
  }
  /**
   * Configure browser action
   */
  setAction(action) {
    this.manifest.action = action;
    return this;
  }
  /**
   * Set background service worker
   */
  setBackground(scriptPath, type) {
    this.manifest.background = {
      service_worker: scriptPath,
      ...type && { type }
    };
    return this;
  }
  /**
   * Add content script
   */
  addContentScript(script) {
    if (!this.manifest.content_scripts) {
      this.manifest.content_scripts = [];
    }
    this.manifest.content_scripts.push(script);
    return this;
  }
  /**
   * Set permissions
   */
  setPermissions(permissions) {
    this.manifest.permissions = permissions;
    return this;
  }
  addPermission(permission) {
    if (!this.manifest.permissions) {
      this.manifest.permissions = [];
    }
    if (!this.manifest.permissions.includes(permission)) {
      this.manifest.permissions.push(permission);
    }
    return this;
  }
  /**
   * Set host permissions
   */
  setHostPermissions(patterns) {
    this.manifest.host_permissions = patterns;
    return this;
  }
  /**
   * Add web accessible resources
   */
  addWebAccessibleResource(resource) {
    if (!this.manifest.web_accessible_resources) {
      this.manifest.web_accessible_resources = [];
    }
    this.manifest.web_accessible_resources.push(resource);
    return this;
  }
  /**
   * Set options page
   */
  setOptionsPage(page, openInTab = true) {
    if (openInTab) {
      this.manifest.options_page = page;
    } else {
      this.manifest.options_ui = {
        page,
        open_in_tab: false
      };
    }
    return this;
  }
  /**
   * Set content security policy
   */
  setContentSecurityPolicy(policy) {
    this.manifest.content_security_policy = policy;
    return this;
  }
  /**
   * Add command
   */
  addCommand(name, command) {
    if (!this.manifest.commands) {
      this.manifest.commands = {};
    }
    this.manifest.commands[name] = command;
    return this;
  }
  /**
   * Set side panel
   */
  setSidePanel(path) {
    this.manifest.side_panel = {
      default_path: path
    };
    return this;
  }
  /**
   * Build the manifest
   */
  build() {
    if (!this.manifest.name || !this.manifest.version) {
      throw new Error("Manifest requires name and version");
    }
    return this.manifest;
  }
  /**
   * Export as JSON string
   */
  toJSON() {
    return JSON.stringify(this.build(), null, 2);
  }
}
function createWalletManifest(name, version, description) {
  return new ManifestBuilder(name, version).setDescription(description).setIcons({
    16: "icons/icon-16.png",
    32: "icons/icon-32.png",
    48: "icons/icon-48.png",
    128: "icons/icon-128.png"
  }).setAction({
    default_popup: "popup.html",
    default_title: name,
    default_icon: {
      16: "icons/icon-16.png",
      32: "icons/icon-32.png"
    }
  }).setBackground("background.js", "module").setPermissions([
    "storage",
    "alarms",
    "notifications",
    "tabs",
    "activeTab",
    "scripting",
    "sidePanel"
  ]).setHostPermissions([
    "http://*/*",
    "https://*/*"
  ]).addContentScript({
    matches: ["<all_urls>"],
    js: ["content-script.js"],
    run_at: "document_start",
    all_frames: true
  }).addWebAccessibleResource({
    resources: ["inpage.js"],
    matches: ["<all_urls>"]
  }).setOptionsPage("options.html").setContentSecurityPolicy({
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'none';"
  }).build();
}
exports.ManifestBuilder = ManifestBuilder;
exports.createWalletManifest = createWalletManifest;
//# sourceMappingURL=manifest.cjs.map
