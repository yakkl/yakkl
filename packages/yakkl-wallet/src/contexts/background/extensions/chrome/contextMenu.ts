import browser from 'webextension-polyfill';
import type {
  EnhancedBookmark,
  DragDropPayload,
  ContentType
} from '$lib/types/bookmark.types';
import { log } from '$lib/common/logger-wrapper';

const MENU_ID_PREFIX = 'yakkl_bookmark_';

interface ContextMenuIds {
  MAIN: string;
  QUICK_SAVE: string;
  SAVE_WITH_NOTE: string;
  SAVE_SELECTION: string;
  SAVE_IMAGE: string;
  SAVE_LINK: string;
}

const MENU_IDS: ContextMenuIds & { SEPARATOR: string } = {
  MAIN: `${MENU_ID_PREFIX}main`,
  QUICK_SAVE: `${MENU_ID_PREFIX}quick_save`,
  SAVE_WITH_NOTE: `${MENU_ID_PREFIX}save_with_note`,
  SAVE_SELECTION: `${MENU_ID_PREFIX}save_selection`,
  SAVE_IMAGE: `${MENU_ID_PREFIX}save_image`,
  SAVE_LINK: `${MENU_ID_PREFIX}save_link`,
  SEPARATOR: `${MENU_ID_PREFIX}separator`
};

export class BookmarkContextMenuService {
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.createContextMenus();
      this.setupListeners();
      this.isInitialized = true;
    } catch (error) {
      log.error('Failed to initialize context menu service:', false, error);
    }
  }

  private async createContextMenus() {
    await browser.contextMenus.removeAll();

    browser.contextMenus.create({
      id: MENU_IDS.MAIN,
      title: 'YAKKL Bookmark',
      contexts: ['page', 'selection', 'image', 'link', 'video', 'audio']
    });

    browser.contextMenus.create({
      id: MENU_IDS.QUICK_SAVE,
      parentId: MENU_IDS.MAIN,
      title: 'Quick Save',
      contexts: ['page', 'selection', 'image', 'link', 'video', 'audio']
    });

    browser.contextMenus.create({
      id: MENU_IDS.SAVE_WITH_NOTE,
      parentId: MENU_IDS.MAIN,
      title: 'Save with Note',
      contexts: ['page', 'selection', 'image', 'link', 'video', 'audio']
    });

    browser.contextMenus.create({
      id: MENU_IDS.SEPARATOR,
      type: 'separator',
      parentId: MENU_IDS.MAIN,
      contexts: ['page', 'selection', 'image', 'link', 'video', 'audio']
    });

    browser.contextMenus.create({
      id: MENU_IDS.SAVE_SELECTION,
      parentId: MENU_IDS.MAIN,
      title: 'Save Selected Text',
      contexts: ['selection']
    });

    browser.contextMenus.create({
      id: MENU_IDS.SAVE_IMAGE,
      parentId: MENU_IDS.MAIN,
      title: 'Save Image',
      contexts: ['image']
    });

    browser.contextMenus.create({
      id: MENU_IDS.SAVE_LINK,
      parentId: MENU_IDS.MAIN,
      title: 'Save Link',
      contexts: ['link']
    });
  }

  private setupListeners() {
    browser.contextMenus.onClicked.addListener(async (info, tab) => {
      if (!tab?.id || !tab.url) return;

      try {
        const bookmarkData = await this.extractBookmarkData(info, tab);

        switch (info.menuItemId) {
          case MENU_IDS.QUICK_SAVE:
            await this.quickSaveBookmark(bookmarkData);
            break;
          case MENU_IDS.SAVE_WITH_NOTE:
            await this.saveBookmarkWithNote(bookmarkData);
            break;
          case MENU_IDS.SAVE_SELECTION:
            await this.saveSelectedText(bookmarkData, info.selectionText || '');
            break;
          case MENU_IDS.SAVE_IMAGE:
            await this.saveImage(bookmarkData, info.srcUrl || '');
            break;
          case MENU_IDS.SAVE_LINK:
            await this.saveLink(bookmarkData, info.linkUrl || '');
            break;
        }

        await this.showNotification('Bookmark saved successfully!');
        await this.playSound('save');

      } catch (error) {
        log.error('Failed to save bookmark:', false, error);
        await this.showNotification('Failed to save bookmark', 'error');
      }
    });
  }

  private async extractBookmarkData(
    info: any,
    tab: any
  ): Promise<Partial<EnhancedBookmark>> {
    const contentType = this.detectContentType(tab.url || '', info);

    const [pageData] = await browser.tabs.executeScript(tab.id!, {
      code: `
        (() => {
          const getMetaContent = (name) => {
            const meta = document.querySelector(\`meta[name="\${name}"], meta[property="\${name}"]\`);
            return meta ? meta.content : '';
          };

          const getFirstImage = () => {
            const ogImage = getMetaContent('og:image');
            if (ogImage) return ogImage;

            const twitterImage = getMetaContent('twitter:image');
            if (twitterImage) return twitterImage;

            const firstImg = document.querySelector('img');
            return firstImg ? firstImg.src : '';
          };

          return {
            title: document.title || '',
            description: getMetaContent('description') || getMetaContent('og:description') || '',
            keywords: getMetaContent('keywords').split(',').map(k => k.trim()).filter(Boolean),
            author: getMetaContent('author') || '',
            imageUrl: getFirstImage(),
            faviconUrl: document.querySelector('link[rel="icon"]')?.href ||
                       document.querySelector('link[rel="shortcut icon"]')?.href || '',
            selectedText: window.getSelection().toString()
          };
        })();
      `
    }) as any[];

    return {
      url: tab.url || '',
      title: pageData?.title || tab.title || 'Untitled',
      description: pageData?.description || '',
      imageUrl: pageData?.imageUrl || tab.favIconUrl || '',
      faviconUrl: pageData?.faviconUrl || tab.favIconUrl || '',
      source: new URL(tab.url || '').hostname,
      contentType,
      keywords: pageData?.keywords || [],
      tags: [],
      date: new Date().toISOString()
    };
  }

  private detectContentType(url: string, info?: any): ContentType {
    if (info?.mediaType === 'image') return 'image';
    if (info?.mediaType === 'video') return 'video';
    if (info?.mediaType === 'audio') return 'podcast';

    const urlLower = url.toLowerCase();
    if (urlLower.endsWith('.pdf')) return 'pdf';
    if (urlLower.match(/\.(mp4|webm|ogg|mov)/)) return 'video';
    if (urlLower.match(/\.(mp3|wav|m4a|aac)/)) return 'audio';
    if (urlLower.match(/\.(jpg|jpeg|png|gif|webp|svg)/)) return 'image';
    if (urlLower.includes('youtube.com') || urlLower.includes('vimeo.com')) return 'video';

    return 'webpage';
  }

  private async quickSaveBookmark(bookmarkData: Partial<EnhancedBookmark>) {
    await this.sendToSidePanel({
      type: 'ADD_BOOKMARK',
      data: bookmarkData
    });
  }

  private async saveBookmarkWithNote(bookmarkData: Partial<EnhancedBookmark>) {
    await this.sendToSidePanel({
      type: 'ADD_BOOKMARK_WITH_NOTE',
      data: bookmarkData
    });
  }

  private async saveSelectedText(
    bookmarkData: Partial<EnhancedBookmark>,
    selectedText: string
  ) {
    await this.sendToSidePanel({
      type: 'ADD_BOOKMARK',
      data: {
        ...bookmarkData,
        description: selectedText,
        notes: [{
          id: this.generateId(),
          createdAt: new Date().toISOString(),
          type: 'text' as const,
          content: selectedText,
          isSticky: false
        }]
      }
    });
  }

  private async saveImage(
    bookmarkData: Partial<EnhancedBookmark>,
    imageUrl: string
  ) {
    await this.sendToSidePanel({
      type: 'ADD_BOOKMARK',
      data: {
        ...bookmarkData,
        contentType: 'image' as ContentType,
        imageUrl,
        mediaUrl: imageUrl
      }
    });
  }

  private async saveLink(
    bookmarkData: Partial<EnhancedBookmark>,
    linkUrl: string
  ) {
    const linkContentType = this.detectContentType(linkUrl);

    await this.sendToSidePanel({
      type: 'ADD_BOOKMARK',
      data: {
        ...bookmarkData,
        url: linkUrl,
        contentType: linkContentType
      }
    });
  }

  private async sendToSidePanel(message: any) {
    try {
      const [sidePanelWindow] = await browser.windows.getAll({
        windowTypes: ['popup', 'normal']
      });

      if (sidePanelWindow) {
        await browser.runtime.sendMessage({
          target: 'sidepanel',
          ...message
        });
      } else {
        // Use Chrome API directly for sidePanel as it's not in webextension-polyfill
        if (typeof chrome !== 'undefined' && (chrome as any).sidePanel) {
          await (chrome as any).sidePanel.open({ windowId: (chrome as any).windows?.WINDOW_ID_CURRENT });
        }

        setTimeout(async () => {
          await browser.runtime.sendMessage({
            target: 'sidepanel',
            ...message
          });
        }, 500);
      }
    } catch (error) {
      log.error('Failed to send message to side panel:', false, error);
      throw error;
    }
  }

  private async showNotification(message: string, type: 'success' | 'error' = 'success') {
    const iconUrl = type === 'success'
      ? '/images/logoBullLock48x48.png'
      : '/images/logoBullLock48x48.png';

    await browser.notifications.create({
      type: 'basic',
      iconUrl,
      title: 'YAKKL Bookmark',
      message,
      priority: 1
    });

    setTimeout(() => {
      browser.notifications.clear('bookmark-notification');
    }, 3000);
  }

  private async playSound(type: 'save' | 'error' = 'save') {
    try {
      await browser.runtime.sendMessage({
        type: 'PLAY_SOUND',
        sound: type
      });
    } catch (error) {
      log.error('Sound playback not available', false, error);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async cleanup() {
    if (this.isInitialized) {
      await browser.contextMenus.removeAll();
      this.isInitialized = false;
    }
  }
}

export const bookmarkContextMenu = new BookmarkContextMenuService();
