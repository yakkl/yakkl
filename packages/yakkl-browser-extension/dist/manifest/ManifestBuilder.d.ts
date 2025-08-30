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
    icons?: {
        16?: string;
        32?: string;
        48?: string;
        64?: string;
        128?: string;
    };
    action?: {
        default_popup?: string;
        default_title?: string;
        default_icon?: string | Record<string, string>;
    };
    background?: {
        service_worker: string;
        type?: 'module';
    };
    content_scripts?: ContentScript[];
    permissions?: Permission[];
    host_permissions?: string[];
    optional_permissions?: Permission[];
    optional_host_permissions?: string[];
    web_accessible_resources?: WebAccessibleResource[];
    options_page?: string;
    options_ui?: {
        page: string;
        open_in_tab?: boolean;
    };
    content_security_policy?: {
        extension_pages?: string;
        sandbox?: string;
    };
    key?: string;
    short_name?: string;
    update_url?: string;
    version_name?: string;
    minimum_chrome_version?: string;
    commands?: Record<string, Command>;
    omnibox?: {
        keyword: string;
    };
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
export type Permission = 'activeTab' | 'alarms' | 'background' | 'bookmarks' | 'browsingData' | 'clipboardRead' | 'clipboardWrite' | 'contentSettings' | 'contextMenus' | 'cookies' | 'debugger' | 'declarativeContent' | 'declarativeNetRequest' | 'declarativeNetRequestWithHostAccess' | 'declarativeNetRequestFeedback' | 'downloads' | 'fontSettings' | 'gcm' | 'geolocation' | 'history' | 'identity' | 'idle' | 'management' | 'nativeMessaging' | 'notifications' | 'offscreen' | 'pageCapture' | 'power' | 'printerProvider' | 'privacy' | 'proxy' | 'scripting' | 'search' | 'sessions' | 'sidePanel' | 'storage' | 'system.cpu' | 'system.display' | 'system.memory' | 'system.storage' | 'tabCapture' | 'tabGroups' | 'tabs' | 'topSites' | 'tts' | 'ttsEngine' | 'unlimitedStorage' | 'vpnProvider' | 'wallpaper' | 'webNavigation' | 'webRequest' | 'webRequestBlocking';
/**
 * Fluent builder for Manifest V3
 */
export declare class ManifestBuilder {
    private manifest;
    constructor(name: string, version: string);
    /**
     * Set basic metadata
     */
    setDescription(description: string): this;
    setAuthor(author: string): this;
    setHomepage(url: string): this;
    /**
     * Set icons
     */
    setIcons(icons: ManifestV3['icons']): this;
    /**
     * Configure browser action
     */
    setAction(action: ManifestV3['action']): this;
    /**
     * Set background service worker
     */
    setBackground(scriptPath: string, type?: 'module'): this;
    /**
     * Add content script
     */
    addContentScript(script: ContentScript): this;
    /**
     * Set permissions
     */
    setPermissions(permissions: Permission[]): this;
    addPermission(permission: Permission): this;
    /**
     * Set host permissions
     */
    setHostPermissions(patterns: string[]): this;
    /**
     * Add web accessible resources
     */
    addWebAccessibleResource(resource: WebAccessibleResource): this;
    /**
     * Set options page
     */
    setOptionsPage(page: string, openInTab?: boolean): this;
    /**
     * Set content security policy
     */
    setContentSecurityPolicy(policy: ManifestV3['content_security_policy']): this;
    /**
     * Add command
     */
    addCommand(name: string, command: Command): this;
    /**
     * Set side panel
     */
    setSidePanel(path: string): this;
    /**
     * Build the manifest
     */
    build(): ManifestV3;
    /**
     * Export as JSON string
     */
    toJSON(): string;
}
/**
 * Create a basic wallet extension manifest
 */
export declare function createWalletManifest(name: string, version: string, description: string): ManifestV3;
