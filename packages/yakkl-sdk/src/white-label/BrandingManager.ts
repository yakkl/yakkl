/**
 * BrandingManager - Manages white label branding and theming
 */

export interface BrandingConfig {
  name: string;
  logo: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
  fonts?: {
    primary: string;
    secondary: string;
  };
  theme?: 'light' | 'dark' | 'auto';
}

export class BrandingManager {
  private config: BrandingConfig;
  private styleElement: HTMLStyleElement | null = null;
  private applied = false;

  constructor(config: BrandingConfig) {
    this.config = config;
  }

  /**
   * Apply branding to the current page
   */
  async apply(): Promise<void> {
    if (this.applied) return;

    try {
      // Apply CSS custom properties
      this.applyCSSVariables();
      
      // Apply custom fonts if specified
      if (this.config.fonts) {
        await this.loadFonts();
      }
      
      // Update page title and favicon
      this.updatePageMetadata();
      
      this.applied = true;
    } catch (error) {
      console.error('Failed to apply branding:', error);
      throw error;
    }
  }

  /**
   * Update branding configuration
   */
  updateConfig(config: Partial<BrandingConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.applied) {
      // Re-apply with new config
      this.cleanup();
      this.apply();
    }
  }

  /**
   * Get current branding configuration
   */
  getConfig(): BrandingConfig {
    return { ...this.config };
  }

  /**
   * Generate CSS for the branding
   */
  generateCSS(): string {
    const { colors, theme } = this.config;
    
    return `
      :root {
        --yakkl-brand-primary: ${colors.primary};
        --yakkl-brand-secondary: ${colors.secondary};
        --yakkl-brand-accent: ${colors.accent};
        --yakkl-brand-background: ${colors.background};
        --yakkl-brand-surface: ${colors.surface};
        --yakkl-brand-text: ${colors.text};
        --yakkl-brand-theme: ${theme || 'auto'};
      }
      
      .yakkl-branded {
        --primary: var(--yakkl-brand-primary);
        --secondary: var(--yakkl-brand-secondary);
        --accent: var(--yakkl-brand-accent);
        background-color: var(--yakkl-brand-background);
        color: var(--yakkl-brand-text);
      }
      
      .yakkl-branded .btn-primary {
        background-color: var(--yakkl-brand-primary);
        border-color: var(--yakkl-brand-primary);
      }
      
      .yakkl-branded .btn-secondary {
        background-color: var(--yakkl-brand-secondary);
        border-color: var(--yakkl-brand-secondary);
      }
      
      .yakkl-branded .text-primary {
        color: var(--yakkl-brand-primary);
      }
      
      .yakkl-branded .bg-primary {
        background-color: var(--yakkl-brand-primary);
      }
    `;
  }

  /**
   * Create branded component wrapper
   */
  createBrandedWrapper(element: HTMLElement): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'yakkl-branded';
    wrapper.style.cssText = `
      --primary: ${this.config.colors.primary};
      --secondary: ${this.config.colors.secondary};
      --accent: ${this.config.colors.accent};
      background-color: ${this.config.colors.background};
      color: ${this.config.colors.text};
    `;
    
    if (this.config.fonts?.primary) {
      wrapper.style.fontFamily = this.config.fonts.primary;
    }
    
    wrapper.appendChild(element);
    return wrapper;
  }

  /**
   * Get logo URL
   */
  getLogoUrl(): string {
    return this.config.logo;
  }

  /**
   * Get brand name
   */
  getBrandName(): string {
    return this.config.name;
  }

  /**
   * Check if dark theme should be used
   */
  isDarkTheme(): boolean {
    if (this.config.theme === 'dark') return true;
    if (this.config.theme === 'light') return false;
    
    // Auto-detect based on system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  /**
   * Cleanup applied branding
   */
  async cleanup(): Promise<void> {
    if (this.styleElement && this.styleElement.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement);
      this.styleElement = null;
    }
    
    // Remove CSS variables
    const root = document.documentElement;
    root.style.removeProperty('--yakkl-brand-primary');
    root.style.removeProperty('--yakkl-brand-secondary');
    root.style.removeProperty('--yakkl-brand-accent');
    root.style.removeProperty('--yakkl-brand-background');
    root.style.removeProperty('--yakkl-brand-surface');
    root.style.removeProperty('--yakkl-brand-text');
    root.style.removeProperty('--yakkl-brand-theme');
    
    this.applied = false;
  }

  /**
   * Private methods
   */
  private applyCSSVariables(): void {
    const css = this.generateCSS();
    
    this.styleElement = document.createElement('style');
    this.styleElement.textContent = css;
    this.styleElement.setAttribute('data-yakkl-branding', 'true');
    
    document.head.appendChild(this.styleElement);
    
    // Apply CSS custom properties to :root
    const root = document.documentElement;
    Object.entries(this.config.colors).forEach(([key, value]) => {
      root.style.setProperty(`--yakkl-brand-${key}`, value);
    });
  }

  private async loadFonts(): Promise<void> {
    const { fonts } = this.config;
    if (!fonts) return;

    const fontPromises: Promise<void>[] = [];

    if (fonts.primary) {
      fontPromises.push(this.loadFont(fonts.primary));
    }

    if (fonts.secondary) {
      fontPromises.push(this.loadFont(fonts.secondary));
    }

    await Promise.all(fontPromises);
  }

  private async loadFont(fontFamily: string): Promise<void> {
    // Check if font is a web font (contains 'http' or is a Google Font format)
    if (fontFamily.includes('http') || fontFamily.includes('fonts.googleapis.com')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = fontFamily;
      document.head.appendChild(link);
      
      return new Promise((resolve) => {
        link.onload = () => resolve();
        link.onerror = () => resolve(); // Continue even if font fails to load
      });
    }
    
    // For system fonts, just apply directly
    return Promise.resolve();
  }

  private updatePageMetadata(): void {
    // Update title if it's the default YAKKL title
    if (document.title.includes('YAKKL')) {
      document.title = document.title.replace('YAKKL', this.config.name);
    }
    
    // Update favicon if logo is provided and is an icon format
    if (this.config.logo && (this.config.logo.endsWith('.ico') || 
        this.config.logo.endsWith('.png') || this.config.logo.endsWith('.svg'))) {
      let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = this.config.logo;
    }
  }
}