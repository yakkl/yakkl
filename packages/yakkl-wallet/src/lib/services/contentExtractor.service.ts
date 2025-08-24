import type { 
  EnhancedBookmark, 
  ContentType,
  MediaMetadata 
} from '$lib/types/bookmark.types';

export class ContentExtractorService {
  private static instance: ContentExtractorService;
  
  private constructor() {}
  
  static getInstance(): ContentExtractorService {
    if (!ContentExtractorService.instance) {
      ContentExtractorService.instance = new ContentExtractorService();
    }
    return ContentExtractorService.instance;
  }
  
  async extractFromUrl(url: string): Promise<Partial<EnhancedBookmark>> {
    try {
      const contentType = this.detectContentTypeFromUrl(url);
      
      if (contentType === 'pdf') {
        return await this.extractPdfMetadata(url);
      }
      
      if (contentType === 'image') {
        return await this.extractImageMetadata(url);
      }
      
      if (contentType === 'video' || contentType === 'audio') {
        return await this.extractMediaMetadata(url, contentType);
      }
      
      return await this.extractWebpageMetadata(url);
      
    } catch (error) {
      console.error('Failed to extract content from URL:', error);
      return {
        url,
        title: new URL(url).hostname,
        contentType: 'webpage'
      };
    }
  }
  
  async extractFromFile(file: File): Promise<Partial<EnhancedBookmark>> {
    const contentType = this.detectContentTypeFromFile(file);
    const url = URL.createObjectURL(file);
    
    const baseData: Partial<EnhancedBookmark> = {
      title: file.name,
      contentType,
      mediaUrl: url,
      mediaMetadata: {
        fileSize: file.size,
        mimeType: file.type
      }
    };
    
    if (contentType === 'pdf') {
      return {
        ...baseData,
        ...(await this.extractPdfFromFile(file))
      };
    }
    
    if (contentType === 'image') {
      return {
        ...baseData,
        ...(await this.extractImageFromFile(file))
      };
    }
    
    if (contentType === 'audio' || contentType === 'video') {
      return {
        ...baseData,
        ...(await this.extractMediaFromFile(file, contentType))
      };
    }
    
    return baseData;
  }
  
  async extractWebpageMetadata(url: string): Promise<Partial<EnhancedBookmark>> {
    try {
      const response = await fetch(url);
      const html = await response.text();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const title = 
        doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
        doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
        doc.querySelector('title')?.textContent ||
        'Untitled';
      
      const description = 
        doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
        doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
        doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content') ||
        '';
      
      const imageUrl = 
        doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
        doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
        '';
      
      const author = 
        doc.querySelector('meta[name="author"]')?.getAttribute('content') ||
        doc.querySelector('meta[property="article:author"]')?.getAttribute('content') ||
        '';
      
      const keywords = doc.querySelector('meta[name="keywords"]')?.getAttribute('content')?.split(',').map(k => k.trim()) || [];
      
      const faviconUrl = 
        doc.querySelector('link[rel="icon"]')?.getAttribute('href') ||
        doc.querySelector('link[rel="shortcut icon"]')?.getAttribute('href') ||
        '';
      
      const textContent = this.extractTextContent(doc);
      
      return {
        url,
        title,
        description,
        imageUrl: this.resolveUrl(imageUrl, url),
        faviconUrl: this.resolveUrl(faviconUrl, url),
        source: new URL(url).hostname,
        contentType: 'webpage',
        author,
        keywords,
        extractedText: textContent,
        date: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Failed to extract webpage metadata:', error);
      throw error;
    }
  }
  
  async extractPdfMetadata(url: string): Promise<Partial<EnhancedBookmark>> {
    return {
      url,
      title: this.getFilenameFromUrl(url),
      contentType: 'pdf',
      documentUrl: url,
      description: 'PDF Document',
      mediaMetadata: {
        mimeType: 'application/pdf'
      }
    };
  }
  
  async extractPdfFromFile(file: File): Promise<Partial<EnhancedBookmark>> {
    return {
      title: file.name.replace('.pdf', ''),
      description: `PDF Document - ${this.formatFileSize(file.size)}`,
      mediaMetadata: {
        fileSize: file.size,
        mimeType: 'application/pdf'
      }
    };
  }
  
  async extractImageMetadata(url: string): Promise<Partial<EnhancedBookmark>> {
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          url,
          title: this.getFilenameFromUrl(url),
          contentType: 'image',
          imageUrl: url,
          mediaUrl: url,
          mediaMetadata: {
            width: img.width,
            height: img.height
          }
        });
      };
      
      img.onerror = () => {
        resolve({
          url,
          title: this.getFilenameFromUrl(url),
          contentType: 'image',
          imageUrl: url,
          mediaUrl: url
        });
      };
      
      img.src = url;
    });
  }
  
  async extractImageFromFile(file: File): Promise<Partial<EnhancedBookmark>> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          resolve({
            imageUrl: e.target?.result as string,
            thumbnailUrl: e.target?.result as string,
            mediaMetadata: {
              width: img.width,
              height: img.height,
              fileSize: file.size,
              mimeType: file.type
            }
          });
        };
        
        img.src = e.target?.result as string;
      };
      
      reader.readAsDataURL(file);
    });
  }
  
  async extractMediaMetadata(url: string, type: 'video' | 'audio'): Promise<Partial<EnhancedBookmark>> {
    return {
      url,
      title: this.getFilenameFromUrl(url),
      contentType: type === 'video' ? 'video' : 'podcast',
      mediaUrl: url
    };
  }
  
  async extractMediaFromFile(file: File, type: 'video' | 'audio'): Promise<Partial<EnhancedBookmark>> {
    return new Promise((resolve) => {
      const mediaElement = type === 'video' 
        ? document.createElement('video')
        : document.createElement('audio');
      
      mediaElement.onloadedmetadata = () => {
        const metadata: MediaMetadata = {
          duration: mediaElement.duration,
          fileSize: file.size,
          mimeType: file.type
        };
        
        if (type === 'video' && mediaElement instanceof HTMLVideoElement) {
          metadata.width = mediaElement.videoWidth;
          metadata.height = mediaElement.videoHeight;
        }
        
        resolve({
          mediaMetadata: metadata
        });
      };
      
      mediaElement.onerror = () => {
        resolve({
          mediaMetadata: {
            fileSize: file.size,
            mimeType: file.type
          }
        });
      };
      
      mediaElement.src = URL.createObjectURL(file);
    });
  }
  
  private extractTextContent(doc: Document): string {
    const article = doc.querySelector('article') || 
                   doc.querySelector('main') || 
                   doc.querySelector('[role="main"]') || 
                   doc.body;
    
    if (!article) return '';
    
    const clone = article.cloneNode(true) as HTMLElement;
    
    clone.querySelectorAll('script, style, noscript, iframe').forEach(el => el.remove());
    
    const text = clone.textContent || '';
    
    return text
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000);
  }
  
  private detectContentTypeFromUrl(url: string): ContentType {
    const urlLower = url.toLowerCase();
    
    if (urlLower.endsWith('.pdf')) return 'pdf';
    if (urlLower.match(/\.(jpg|jpeg|png|gif|webp|svg)/)) return 'image';
    if (urlLower.match(/\.(mp4|webm|ogg|mov)/)) return 'video';
    if (urlLower.match(/\.(mp3|wav|m4a|aac)/)) return 'audio';
    
    if (urlLower.includes('youtube.com') || urlLower.includes('vimeo.com')) return 'video';
    if (urlLower.includes('soundcloud.com') || urlLower.includes('spotify.com')) return 'podcast';
    
    return 'webpage';
  }
  
  private detectContentTypeFromFile(file: File): ContentType {
    const mimeType = file.type.toLowerCase();
    
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';
    
    return 'webpage';
  }
  
  private getFilenameFromUrl(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      const filename = pathname.split('/').pop() || 'Untitled';
      return decodeURIComponent(filename);
    } catch {
      return 'Untitled';
    }
  }
  
  private resolveUrl(url: string, baseUrl: string): string {
    if (!url) return '';
    
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      
      if (url.startsWith('//')) {
        return new URL(url, baseUrl).href;
      }
      
      if (url.startsWith('/')) {
        const base = new URL(baseUrl);
        return `${base.protocol}//${base.host}${url}`;
      }
      
      return new URL(url, baseUrl).href;
      
    } catch {
      return url;
    }
  }
  
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
  
  async generateEmbeddings(text: string): Promise<number[]> {
    console.log('Embeddings generation would happen here for RAG preparation');
    return [];
  }
  
  async generateSummary(text: string): Promise<string> {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.slice(0, 3).join(' ').trim();
  }
}

export const contentExtractor = ContentExtractorService.getInstance();