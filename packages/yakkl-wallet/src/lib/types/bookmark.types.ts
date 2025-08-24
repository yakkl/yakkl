import type { RSSItem } from '$lib/managers/ExtensionRSSFeedService';

export type ContentType = 'article' | 'video' | 'podcast' | 'pdf' | 'webpage' | 'image' | 'audio';
export type NotePriority = 'high' | 'medium' | 'low';
export type ReadStatus = 'unread' | 'reading' | 'read';
export type NoteType = 'text' | 'voice';

export interface BookmarkNote {
  id: string;
  createdAt: string;
  updatedAt?: string;
  type: NoteType;
  title?: string;
  content: string;
  duration?: number;
  transcript?: string;
  position?: { x: number; y: number };
  color?: string;
  fontSize?: number;
  isSticky?: boolean;
}

export interface MediaMetadata {
  duration?: number;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  pageCount?: number;
  artist?: string;
  album?: string;
}

export interface EnhancedBookmark extends Omit<RSSItem, 'contentType'> {
  id: string;
  bookmarkedAt: string;
  lastModified: string;
  lastAccessed?: string;
  
  contentType: ContentType;
  mediaUrl?: string;
  documentUrl?: string;
  thumbnailUrl?: string;
  faviconUrl?: string;
  
  notes: BookmarkNote[];
  
  tags: string[];
  category?: string;
  priority?: NotePriority;
  readStatus?: ReadStatus;
  readProgress?: number;
  
  mediaMetadata?: MediaMetadata;
  
  embeddings?: number[];
  extractedText?: string;
  summary?: string;
  keywords?: string[];
  
  isArchived?: boolean;
  isPinned?: boolean;
  isFavorite?: boolean;
  
  syncStatus?: 'local' | 'synced' | 'pending';
  deviceId?: string;
}

export interface BookmarkImportData {
  version: string;
  exportedAt: string;
  bookmarks: EnhancedBookmark[];
  tags?: string[];
  categories?: string[];
}

export interface BookmarkExportOptions {
  format: 'json' | 'html' | 'pdf' | 'csv';
  includeNotes: boolean;
  includeVoiceNotes: boolean;
  includeTags: boolean;
  includeEmbeddings: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  categories?: string[];
  tags?: string[];
}

export interface DragDropPayload {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  contentType?: ContentType;
  selectedText?: string;
  metadata?: Record<string, any>;
}

export interface BookmarkContextMenuItem {
  id: string;
  title: string;
  contexts: string[];
  parentId?: string;
  onclick?: (info: any, tab?: any) => void;
}

export interface BookmarkAudioSettings {
  enabled: boolean;
  volume: number;
  saveSound?: string;
  deleteSound?: string;
  noteSound?: string;
}

export interface BookmarkVisualSettings {
  animations: boolean;
  stickyNoteStyle: 'classic' | 'modern' | 'minimal';
  cardLayout: 'grid' | 'list' | 'masonry';
  showThumbnails: boolean;
  showFavicons: boolean;
}

export interface BookmarkSearchOptions {
  query: string;
  contentTypes?: ContentType[];
  tags?: string[];
  categories?: string[];
  readStatus?: ReadStatus[];
  priority?: NotePriority[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  hasNotes?: boolean;
  hasVoiceNotes?: boolean;
  sortBy?: 'date' | 'title' | 'priority' | 'readStatus';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface BookmarkStats {
  totalBookmarks: number;
  byContentType: Record<ContentType, number>;
  byReadStatus: Record<ReadStatus, number>;
  byPriority: Record<NotePriority, number>;
  totalNotes: number;
  totalVoiceNotes: number;
  totalTags: number;
  storageUsed: number;
  lastSync?: string;
}