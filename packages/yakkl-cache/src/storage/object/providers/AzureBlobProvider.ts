import type { ObjectStorageProvider, ObjectStorageConfig } from '../ObjectStorageManager';
import { Buffer } from "buffer";

export class AzureBlobProvider implements ObjectStorageProvider {
  constructor(config: ObjectStorageConfig) {}
  async connect(): Promise<void> { throw new Error('AzureBlobProvider not yet implemented'); }
  async disconnect(): Promise<void> {}
  async createBucket(): Promise<void> {}
  async deleteBucket(): Promise<void> {}
  async listBuckets(): Promise<any[]> { return []; }
  async bucketExists(): Promise<boolean> { return false; }
  async putObject(): Promise<any> { return {}; }
  async getObject(): Promise<any> { return { data: Buffer.from(''), metadata: {} }; }
  async deleteObject(): Promise<void> {}
  async deleteObjects(): Promise<any[]> { return []; }
  async copyObject(): Promise<any> { return {}; }
  async headObject(): Promise<any> { return {}; }
  async objectExists(): Promise<boolean> { return false; }
  async listObjects(): Promise<any> { return { objects: [], isTruncated: false, keyCount: 0 }; }
  async getSignedUrl(): Promise<string> { return ''; }
  async createMultipartUpload(): Promise<string> { return ''; }
  async uploadPart(): Promise<any> { return { etag: '' }; }
  async completeMultipartUpload(): Promise<any> { return {}; }
  async abortMultipartUpload(): Promise<void> {}
  async getStats(): Promise<any> { return {}; }
}
