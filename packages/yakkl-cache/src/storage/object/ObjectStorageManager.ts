/**
 * ObjectStorageManager - Unified interface for object/blob storage operations
 * Supports multiple cloud storage providers with consistent API
 */

import { Buffer } from "buffer";

export interface ObjectStorageConfig {
  provider: 's3' | 'gcs' | 'azure' | 'cloudflare-r2' | 'backblaze-b2' | 'minio';
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  bucket?: string;
  projectId?: string; // For GCS
  accountName?: string; // For Azure
  accountKey?: string; // For Azure
  connectionString?: string; // For Azure
  apiKey?: string; // For Backblaze B2
  applicationKeyId?: string; // For Backblaze B2
  applicationKey?: string; // For Backblaze B2
  maxRetries?: number;
  timeout?: number;
  useSSL?: boolean;
}

export interface ObjectMetadata {
  contentType?: string;
  contentLength?: number;
  contentEncoding?: string;
  contentLanguage?: string;
  cacheControl?: string;
  contentDisposition?: string;
  lastModified?: Date;
  etag?: string;
  customMetadata?: Record<string, string>;
  storageClass?: string;
  encryption?: string;
  versionId?: string;
}

export interface ListObjectsOptions {
  prefix?: string;
  delimiter?: string;
  maxKeys?: number;
  continuationToken?: string;
  startAfter?: string;
  includeVersions?: boolean;
}

export interface ListObjectsResult {
  objects: Array<{
    key: string;
    size: number;
    lastModified: Date;
    etag?: string;
    storageClass?: string;
    owner?: { id: string; displayName: string };
  }>;
  commonPrefixes?: string[];
  isTruncated: boolean;
  continuationToken?: string;
  keyCount: number;
}

export interface UploadOptions {
  metadata?: ObjectMetadata;
  partSize?: number; // For multipart upload
  concurrency?: number; // Parallel parts for multipart
  progress?: (loaded: number, total: number) => void;
  abortSignal?: AbortSignal;
}

export interface DownloadOptions {
  range?: { start: number; end: number };
  versionId?: string;
  progress?: (loaded: number, total: number) => void;
  abortSignal?: AbortSignal;
}

export interface SignedUrlOptions {
  expires?: number; // Seconds
  method?: 'GET' | 'PUT' | 'DELETE';
  contentType?: string;
  contentDisposition?: string;
  customHeaders?: Record<string, string>;
}

export interface CopyOptions {
  metadata?: ObjectMetadata;
  metadataDirective?: 'COPY' | 'REPLACE';
  tagging?: Record<string, string>;
  storageClass?: string;
}

export interface ObjectStorageProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // Bucket operations
  createBucket(name: string, options?: { region?: string; acl?: string }): Promise<void>;
  deleteBucket(name: string): Promise<void>;
  listBuckets(): Promise<Array<{ name: string; creationDate: Date }>>;
  bucketExists(name: string): Promise<boolean>;
  
  // Object operations
  putObject(
    bucket: string, 
    key: string, 
    data: Buffer | Uint8Array | ReadableStream | string,
    options?: UploadOptions
  ): Promise<{ etag?: string; versionId?: string }>;
  
  getObject(
    bucket: string, 
    key: string,
    options?: DownloadOptions
  ): Promise<{ data: Buffer; metadata: ObjectMetadata }>;
  
  deleteObject(
    bucket: string, 
    key: string,
    versionId?: string
  ): Promise<void>;
  
  deleteObjects(
    bucket: string,
    keys: Array<{ key: string; versionId?: string }>
  ): Promise<Array<{ key: string; error?: string }>>;
  
  copyObject(
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string,
    options?: CopyOptions
  ): Promise<{ etag?: string }>;
  
  headObject(
    bucket: string,
    key: string,
    versionId?: string
  ): Promise<ObjectMetadata>;
  
  objectExists(
    bucket: string,
    key: string
  ): Promise<boolean>;
  
  listObjects(
    bucket: string,
    options?: ListObjectsOptions
  ): Promise<ListObjectsResult>;
  
  // Signed URLs
  getSignedUrl(
    bucket: string,
    key: string,
    options?: SignedUrlOptions
  ): Promise<string>;
  
  // Multipart upload
  createMultipartUpload(
    bucket: string,
    key: string,
    metadata?: ObjectMetadata
  ): Promise<string>; // uploadId
  
  uploadPart(
    bucket: string,
    key: string,
    uploadId: string,
    partNumber: number,
    data: Buffer | Uint8Array
  ): Promise<{ etag: string }>;
  
  completeMultipartUpload(
    bucket: string,
    key: string,
    uploadId: string,
    parts: Array<{ partNumber: number; etag: string }>
  ): Promise<{ etag?: string; location?: string }>;
  
  abortMultipartUpload(
    bucket: string,
    key: string,
    uploadId: string
  ): Promise<void>;
  
  // Utility
  getStats(): Promise<{
    totalObjects?: number;
    totalSize?: number;
    bandwidthUsed?: number;
  }>;
}

export class ObjectStorageManager {
  private provider: ObjectStorageProvider | null = null;
  private config: ObjectStorageConfig;
  private isConnected: boolean = false;
  private defaultBucket: string | null = null;

  constructor(config: ObjectStorageConfig) {
    this.config = config;
    this.defaultBucket = config.bucket || null;
  }

  async initialize(): Promise<void> {
    // Dynamically import the appropriate provider
    switch (this.config.provider) {
      case 's3':
        const { S3Provider } = await import('./providers/S3Provider');
        this.provider = new S3Provider(this.config);
        break;
        
      case 'gcs':
        const { GCSProvider } = await import('./providers/GCSProvider');
        this.provider = new GCSProvider(this.config);
        break;
        
      case 'azure':
        const { AzureBlobProvider } = await import('./providers/AzureBlobProvider');
        this.provider = new AzureBlobProvider(this.config);
        break;
        
      case 'cloudflare-r2':
        const { CloudflareR2Provider } = await import('./providers/CloudflareR2Provider');
        this.provider = new CloudflareR2Provider(this.config);
        break;
        
      case 'backblaze-b2':
        const { BackblazeB2Provider } = await import('./providers/BackblazeB2Provider');
        this.provider = new BackblazeB2Provider(this.config);
        break;
        
      case 'minio':
        const { MinioProvider } = await import('./providers/MinioProvider');
        this.provider = new MinioProvider(this.config);
        break;
        
      default:
        throw new Error(`Unsupported object storage provider: ${this.config.provider}`);
    }

    await this.connect();
  }

  async connect(): Promise<void> {
    if (!this.provider) {
      throw new Error('Provider not initialized. Call initialize() first.');
    }
    
    await this.provider.connect();
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    if (this.provider && this.isConnected) {
      await this.provider.disconnect();
      this.isConnected = false;
    }
  }

  /**
   * Upload an object to storage
   */
  async upload(
    key: string,
    data: Buffer | Uint8Array | ReadableStream | string,
    options?: UploadOptions & { bucket?: string }
  ): Promise<{ etag?: string; versionId?: string; url?: string }> {
    this.ensureConnected();
    
    const bucket = options?.bucket || this.defaultBucket;
    if (!bucket) {
      throw new Error('No bucket specified');
    }
    
    const result = await this.provider!.putObject(bucket, key, data, options);
    
    // Generate URL if possible
    const url = await this.getUrl(key, { bucket });
    
    return { ...result, url };
  }

  /**
   * Download an object from storage
   */
  async download(
    key: string,
    options?: DownloadOptions & { bucket?: string }
  ): Promise<{ data: Buffer; metadata: ObjectMetadata }> {
    this.ensureConnected();
    
    const bucket = options?.bucket || this.defaultBucket;
    if (!bucket) {
      throw new Error('No bucket specified');
    }
    
    return this.provider!.getObject(bucket, key, options);
  }

  /**
   * Delete an object
   */
  async delete(
    key: string,
    options?: { bucket?: string; versionId?: string }
  ): Promise<void> {
    this.ensureConnected();
    
    const bucket = options?.bucket || this.defaultBucket;
    if (!bucket) {
      throw new Error('No bucket specified');
    }
    
    await this.provider!.deleteObject(bucket, key, options?.versionId);
  }

  /**
   * Delete multiple objects
   */
  async deleteMany(
    keys: Array<{ key: string; versionId?: string }>,
    options?: { bucket?: string }
  ): Promise<Array<{ key: string; error?: string }>> {
    this.ensureConnected();
    
    const bucket = options?.bucket || this.defaultBucket;
    if (!bucket) {
      throw new Error('No bucket specified');
    }
    
    return this.provider!.deleteObjects(bucket, keys);
  }

  /**
   * Copy an object
   */
  async copy(
    sourceKey: string,
    destKey: string,
    options?: CopyOptions & { 
      sourceBucket?: string; 
      destBucket?: string 
    }
  ): Promise<{ etag?: string }> {
    this.ensureConnected();
    
    const sourceBucket = options?.sourceBucket || this.defaultBucket;
    const destBucket = options?.destBucket || this.defaultBucket;
    
    if (!sourceBucket || !destBucket) {
      throw new Error('No bucket specified');
    }
    
    return this.provider!.copyObject(
      sourceBucket,
      sourceKey,
      destBucket,
      destKey,
      options
    );
  }

  /**
   * Get object metadata without downloading
   */
  async getMetadata(
    key: string,
    options?: { bucket?: string; versionId?: string }
  ): Promise<ObjectMetadata> {
    this.ensureConnected();
    
    const bucket = options?.bucket || this.defaultBucket;
    if (!bucket) {
      throw new Error('No bucket specified');
    }
    
    return this.provider!.headObject(bucket, key, options?.versionId);
  }

  /**
   * Check if object exists
   */
  async exists(
    key: string,
    options?: { bucket?: string }
  ): Promise<boolean> {
    this.ensureConnected();
    
    const bucket = options?.bucket || this.defaultBucket;
    if (!bucket) {
      throw new Error('No bucket specified');
    }
    
    return this.provider!.objectExists(bucket, key);
  }

  /**
   * List objects in bucket
   */
  async list(
    options?: ListObjectsOptions & { bucket?: string }
  ): Promise<ListObjectsResult> {
    this.ensureConnected();
    
    const bucket = options?.bucket || this.defaultBucket;
    if (!bucket) {
      throw new Error('No bucket specified');
    }
    
    return this.provider!.listObjects(bucket, options);
  }

  /**
   * Get a signed/presigned URL for an object
   */
  async getSignedUrl(
    key: string,
    options?: SignedUrlOptions & { bucket?: string }
  ): Promise<string> {
    this.ensureConnected();
    
    const bucket = options?.bucket || this.defaultBucket;
    if (!bucket) {
      throw new Error('No bucket specified');
    }
    
    return this.provider!.getSignedUrl(bucket, key, options);
  }

  /**
   * Get public URL for an object (if publicly accessible)
   */
  async getUrl(
    key: string,
    options?: { bucket?: string }
  ): Promise<string> {
    const bucket = options?.bucket || this.defaultBucket;
    if (!bucket) {
      throw new Error('No bucket specified');
    }
    
    // Build URL based on provider
    switch (this.config.provider) {
      case 's3':
        const region = this.config.region || 'us-east-1';
        return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
        
      case 'gcs':
        return `https://storage.googleapis.com/${bucket}/${key}`;
        
      case 'azure':
        return `https://${this.config.accountName}.blob.core.windows.net/${bucket}/${key}`;
        
      case 'cloudflare-r2':
        return `https://${this.config.accountName}.r2.cloudflarestorage.com/${bucket}/${key}`;
        
      default:
        // Return signed URL as fallback
        return this.getSignedUrl(key, { bucket, expires: 3600 });
    }
  }

  /**
   * Upload large file using multipart upload
   */
  async uploadLarge(
    key: string,
    data: Buffer | ReadableStream,
    options?: UploadOptions & { bucket?: string }
  ): Promise<{ etag?: string; location?: string }> {
    this.ensureConnected();
    
    const bucket = options?.bucket || this.defaultBucket;
    if (!bucket) {
      throw new Error('No bucket specified');
    }
    
    const partSize = options?.partSize || 5 * 1024 * 1024; // 5MB default
    const uploadId = await this.provider!.createMultipartUpload(
      bucket,
      key,
      options?.metadata
    );
    
    try {
      const parts: Array<{ partNumber: number; etag: string }> = [];
      let partNumber = 1;
      
      if (Buffer.isBuffer(data)) {
        // Split buffer into parts
        for (let i = 0; i < data.length; i += partSize) {
          const end = Math.min(i + partSize, data.length);
          const partData = data.slice(i, end);
          
          const { etag } = await this.provider!.uploadPart(
            bucket,
            key,
            uploadId,
            partNumber,
            partData
          );
          
          parts.push({ partNumber, etag });
          partNumber++;
          
          // Report progress
          if (options?.progress) {
            options.progress(end, data.length);
          }
        }
      } else {
        // Handle ReadableStream
        throw new Error('ReadableStream multipart upload not yet implemented');
      }
      
      // Complete multipart upload
      return await this.provider!.completeMultipartUpload(
        bucket,
        key,
        uploadId,
        parts
      );
    } catch (error) {
      // Abort on error
      await this.provider!.abortMultipartUpload(bucket, key, uploadId);
      throw error;
    }
  }

  /**
   * Create a bucket
   */
  async createBucket(
    name: string,
    options?: { region?: string; acl?: string }
  ): Promise<void> {
    this.ensureConnected();
    await this.provider!.createBucket(name, options);
  }

  /**
   * Delete a bucket
   */
  async deleteBucket(name: string): Promise<void> {
    this.ensureConnected();
    await this.provider!.deleteBucket(name);
  }

  /**
   * List all buckets
   */
  async listBuckets(): Promise<Array<{ name: string; creationDate: Date }>> {
    this.ensureConnected();
    return this.provider!.listBuckets();
  }

  /**
   * Check if bucket exists
   */
  async bucketExists(name: string): Promise<boolean> {
    this.ensureConnected();
    return this.provider!.bucketExists(name);
  }

  /**
   * Set default bucket for operations
   */
  setDefaultBucket(bucket: string): void {
    this.defaultBucket = bucket;
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalObjects?: number;
    totalSize?: number;
    bandwidthUsed?: number;
  }> {
    this.ensureConnected();
    return this.provider!.getStats();
  }

  private ensureConnected(): void {
    if (!this.isConnected || !this.provider) {
      throw new Error('Object storage not connected. Call initialize() first.');
    }
  }
}
