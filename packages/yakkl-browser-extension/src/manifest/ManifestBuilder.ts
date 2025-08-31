/**
 * Manifest Builder for Browser Extensions
 * Generates Manifest V3 configuration
 */

export interface ManifestV3 {
  manifest_version: 3;
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage_url?: string;
  
  // Icons
  icons?: {
    16?: string;
    32?: string;
    48?: string;
    64?: string;
    128?: string;
  };
  
  // Extension UI
  action?: {
    default_popup?: string;
    default_title?: string;
    default_icon?: string | Record<string, string>;
  };
  
  // Background
  background?: {
    service_worker: string;
    type?: 'module';
  };
  
  // Content Scripts
  content_scripts?: ContentScript[];
  
  // Permissions
  permissions?: Permission[];
  host_permissions?: string[];
  optional_permissions?: Permission[];
  optional_host_permissions?: string[];
  
  // Web Accessible Resources
  web_accessible_resources?: WebAccessibleResource[];
  
  // Options
  options_page?: string;
  options_ui?: {
    page: string;
    open_in_tab?: boolean;
  };
  
  // Other
  content_security_policy?: {
    extension_pages?: string;
    sandbox?: string;
  };
  
  key?: string;
  short_name?: string;
  update_url?: string;
  version_name?: string;
  minimum_chrome_version?: string;
  
  // Commands
  commands?: Record<string, Command>;
  
  // Omnibox
  omnibox?: {
    keyword: string;
  };
  
  // Side Panel
  side_panel?: {
    default_path: string;
  };
}

export interface ContentScript {
  matches: string[];
  js?: string[];
  css?: string[];
  run_at?: 'document_start' | 'document_end' | 'document_idle';
  all_frames?: boolean;
  match_about_blank?: boolean;
  exclude_matches?: string[];
  include_globs?: string[];
  exclude_globs?: string[];
  world?: 'ISOLATED' | 'MAIN';
}

export interface WebAccessibleResource {
  resources: string[];
  matches?: string[];
  extension_ids?: string[];
  use_dynamic_url?: boolean;
}

export interface Command {
  suggested_key?: {
    default?: string;
    windows?: string;
    mac?: string;
    chromeos?: string;
    linux?: string;
  };
  description: string;
  global?: boolean;
}

export type Permission = 
  // API Permissions
  | 'activeTab'
  | 'alarms'
  | 'background'
  | 'bookmarks'
  | 'browsingData'
  | 'clipboardRead'
  | 'clipboardWrite'
  | 'contentSettings'
  | 'contextMenus'
  | 'cookies'
  | 'debugger'
  | 'declarativeContent'
  | 'declarativeNetRequest'
  | 'declarativeNetRequestWithHostAccess'
  | 'declarativeNetRequestFeedback'
  | 'downloads'
  | 'fontSettings'
  | 'gcm'
  | 'geolocation'
  | 'history'
  | 'identity'
  | 'idle'
  | 'management'
  | 'nativeMessaging'
  | 'notifications'
  | 'offscreen'
  | 'pageCapture'
  | 'power'
  | 'printerProvider'
  | 'privacy'
  | 'proxy'
  | 'scripting'
  | 'search'
  | 'sessions'
  | 'sidePanel'
  | 'storage'
  | 'system.cpu'
  | 'system.display'
  | 'system.memory'
  | 'system.storage'
  | 'tabCapture'
  | 'tabGroups'
  | 'tabs'
  | 'topSites'
  | 'tts'
  | 'ttsEngine'
  | 'unlimitedStorage'
  | 'vpnProvider'
  | 'wallpaper'
  | 'webNavigation'
  | 'webRequest'
  | 'webRequestBlocking';

/**
 * Fluent builder for Manifest V3
 */
export class ManifestBuilder {
  private manifest: Partial<ManifestV3> = {
    manifest_version: 3
  };

  constructor(name: string, version: string) {
    this.manifest.name = name;
    this.manifest.version = version;
  }

  /**
   * Set basic metadata
   */
  setDescription(description: string): this {
    this.manifest.description = description;
    return this;
  }

  setAuthor(author: string): this {
    this.manifest.author = author;
    return this;
  }

  setHomepage(url: string): this {
    this.manifest.homepage_url = url;
    return this;
  }

  /**
   * Set icons
   */
  setIcons(icons: ManifestV3['icons']): this {
    this.manifest.icons = icons;
    return this;
  }

  /**
   * Configure browser action
   */
  setAction(action: ManifestV3['action']): this {
    this.manifest.action = action;
    return this;
  }

  /**
   * Set background service worker
   */
  setBackground(scriptPath: string, type?: 'module'): this {
    this.manifest.background = {
      service_worker: scriptPath,
      ...(type && { type })
    };
    return this;
  }

  /**
   * Add content script
   */
  addContentScript(script: ContentScript): this {
    if (!this.manifest.content_scripts) {
      this.manifest.content_scripts = [];
    }
    this.manifest.content_scripts.push(script);
    return this;
  }

  /**
   * Set permissions
   */
  setPermissions(permissions: Permission[]): this {
    this.manifest.permissions = permissions;
    return this;
  }

  addPermission(permission: Permission): this {
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
  setHostPermissions(patterns: string[]): this {
    this.manifest.host_permissions = patterns;
    return this;
  }

  /**
   * Add web accessible resources
   */
  addWebAccessibleResource(resource: WebAccessibleResource): this {
    if (!this.manifest.web_accessible_resources) {
      this.manifest.web_accessible_resources = [];
    }
    this.manifest.web_accessible_resources.push(resource);
    return this;
  }

  /**
   * Set options page
   */
  setOptionsPage(page: string, openInTab = true): this {
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
  setContentSecurityPolicy(policy: ManifestV3['content_security_policy']): this {
    this.manifest.content_security_policy = policy;
    return this;
  }

  /**
   * Add command
   */
  addCommand(name: string, command: Command): this {
    if (!this.manifest.commands) {
      this.manifest.commands = {};
    }
    this.manifest.commands[name] = command;
    return this;
  }

  /**
   * Set side panel
   */
  setSidePanel(path: string): this {
    this.manifest.side_panel = {
      default_path: path
    };
    return this;
  }

  /**
   * Build the manifest
   */
  build(): ManifestV3 {
    if (!this.manifest.name || !this.manifest.version) {
      throw new Error('Manifest requires name and version');
    }
    
    return this.manifest as ManifestV3;
  }

  /**
   * Export as JSON string
   */
  toJSON(): string {
    return JSON.stringify(this.build(), null, 2);
  }
}

/**
 * Create a basic wallet extension manifest
 */
export function createWalletManifest(
  name: string,
  version: string,
  description: string
): ManifestV3 {
  return new ManifestBuilder(name, version)
    .setDescription(description)
    .setIcons({
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png'
    })
    .setAction({
      default_popup: 'popup.html',
      default_title: name,
      default_icon: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png'
      }
    })
    .setBackground('background.js', 'module')
    .setPermissions([
      'storage',
      'alarms',
      'notifications',
      'tabs',
      'activeTab',
      'scripting',
      'sidePanel'
    ])
    .setHostPermissions([
      'http://*/*',
      'https://*/*'
    ])
    .addContentScript({
      matches: ['<all_urls>'],
      js: ['content-script.js'],
      run_at: 'document_start',
      all_frames: true
    })
    .addWebAccessibleResource({
      resources: ['inpage.js'],
      matches: ['<all_urls>']
    })
    .setOptionsPage('options.html')
    .setContentSecurityPolicy({
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'none';"
    })
    .build();
}