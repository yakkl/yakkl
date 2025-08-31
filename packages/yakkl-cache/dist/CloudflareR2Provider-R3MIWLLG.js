// Browser compatibility shim
if (typeof globalThis === 'undefined') {
  window.globalThis = window;
}

// src/storage/object/providers/CloudflareR2Provider.ts
import { Buffer } from "buffer";
var CloudflareR2Provider = class {
  constructor(config) {
    this.config = config;
    this.accountId = config.accountName || "";
    this.accessKeyId = config.accessKeyId || "";
    this.secretAccessKey = config.secretAccessKey || "";
  }
  async connect() {
    const endpoint = this.config.endpoint || `https://${this.accountId}.r2.cloudflarestorage.com`;
    this.client = {
      endpoint,
      region: "auto",
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey
      }
    };
  }
  async disconnect() {
    this.client = null;
  }
  async createBucket(name, options) {
    const params = {
      Bucket: name,
      ACL: options?.acl || "private"
    };
    console.log("Creating R2 bucket:", name);
  }
  async deleteBucket(name) {
    console.log("Deleting R2 bucket:", name);
  }
  async listBuckets() {
    return [];
  }
  async bucketExists(name) {
    try {
      return true;
    } catch {
      return false;
    }
  }
  async putObject(bucket, key, data, options) {
    const body = typeof data === "string" ? Buffer.from(data) : data;
    const params = {
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: options?.metadata?.contentType,
      ContentEncoding: options?.metadata?.contentEncoding,
      ContentLanguage: options?.metadata?.contentLanguage,
      CacheControl: options?.metadata?.cacheControl,
      ContentDisposition: options?.metadata?.contentDisposition,
      Metadata: options?.metadata?.customMetadata
    };
    if (options?.progress && Buffer.isBuffer(body)) {
      options.progress(body.length, body.length);
    }
    return {
      etag: "mock-etag",
      versionId: void 0
      // R2 doesn't support versioning yet
    };
  }
  async getObject(bucket, key, options) {
    const params = {
      Bucket: bucket,
      Key: key,
      VersionId: options?.versionId
    };
    if (options?.range) {
      params.Range = `bytes=${options.range.start}-${options.range.end}`;
    }
    const metadata = {
      contentType: "application/octet-stream",
      contentLength: 0,
      lastModified: /* @__PURE__ */ new Date(),
      etag: "mock-etag"
    };
    return {
      data: Buffer.from("mock-data"),
      metadata
    };
  }
  async deleteObject(bucket, key, versionId) {
    const params = {
      Bucket: bucket,
      Key: key,
      VersionId: versionId
    };
    console.log("Deleting R2 object:", key);
  }
  async deleteObjects(bucket, keys) {
    const params = {
      Bucket: bucket,
      Delete: {
        Objects: keys.map((k) => ({
          Key: k.key,
          VersionId: k.versionId
        }))
      }
    };
    return keys.map((k) => ({ key: k.key }));
  }
  async copyObject(sourceBucket, sourceKey, destBucket, destKey, options) {
    const params = {
      Bucket: destBucket,
      Key: destKey,
      CopySource: `${sourceBucket}/${sourceKey}`,
      MetadataDirective: options?.metadataDirective,
      ContentType: options?.metadata?.contentType,
      CacheControl: options?.metadata?.cacheControl,
      ContentDisposition: options?.metadata?.contentDisposition,
      ContentEncoding: options?.metadata?.contentEncoding,
      ContentLanguage: options?.metadata?.contentLanguage,
      Metadata: options?.metadata?.customMetadata,
      StorageClass: options?.storageClass
    };
    return { etag: "mock-etag" };
  }
  async headObject(bucket, key, versionId) {
    const params = {
      Bucket: bucket,
      Key: key,
      VersionId: versionId
    };
    return {
      contentType: "application/octet-stream",
      contentLength: 0,
      lastModified: /* @__PURE__ */ new Date(),
      etag: "mock-etag",
      storageClass: "STANDARD"
    };
  }
  async objectExists(bucket, key) {
    try {
      await this.headObject(bucket, key);
      return true;
    } catch {
      return false;
    }
  }
  async listObjects(bucket, options) {
    const params = {
      Bucket: bucket,
      Prefix: options?.prefix,
      Delimiter: options?.delimiter,
      MaxKeys: options?.maxKeys || 1e3,
      ContinuationToken: options?.continuationToken,
      StartAfter: options?.startAfter
    };
    return {
      objects: [],
      commonPrefixes: [],
      isTruncated: false,
      continuationToken: void 0,
      keyCount: 0
    };
  }
  async getSignedUrl(bucket, key, options) {
    const command = this.getSignedUrlCommand(bucket, key, options);
    const expires = options?.expires || 3600;
    const method = options?.method || "GET";
    return `https://${this.accountId}.r2.cloudflarestorage.com/${bucket}/${key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=${expires}&X-Amz-Method=${method}`;
  }
  getSignedUrlCommand(bucket, key, options) {
    const method = options?.method || "GET";
    switch (method) {
      case "PUT":
        return {
          Bucket: bucket,
          Key: key,
          ContentType: options?.contentType,
          ContentDisposition: options?.contentDisposition
        };
      case "DELETE":
        return {
          Bucket: bucket,
          Key: key
        };
      default:
        return {
          Bucket: bucket,
          Key: key,
          ResponseContentType: options?.contentType,
          ResponseContentDisposition: options?.contentDisposition
        };
    }
  }
  async createMultipartUpload(bucket, key, metadata) {
    const params = {
      Bucket: bucket,
      Key: key,
      ContentType: metadata?.contentType,
      ContentEncoding: metadata?.contentEncoding,
      ContentLanguage: metadata?.contentLanguage,
      CacheControl: metadata?.cacheControl,
      ContentDisposition: metadata?.contentDisposition,
      Metadata: metadata?.customMetadata,
      StorageClass: metadata?.storageClass
    };
    return "mock-upload-id";
  }
  async uploadPart(bucket, key, uploadId, partNumber, data) {
    const params = {
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
      Body: data
    };
    return { etag: `mock-etag-part-${partNumber}` };
  }
  async completeMultipartUpload(bucket, key, uploadId, parts) {
    const params = {
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map((p) => ({
          PartNumber: p.partNumber,
          ETag: p.etag
        }))
      }
    };
    return {
      etag: "mock-final-etag",
      location: `https://${this.accountId}.r2.cloudflarestorage.com/${bucket}/${key}`
    };
  }
  async abortMultipartUpload(bucket, key, uploadId) {
    const params = {
      Bucket: bucket,
      Key: key,
      UploadId: uploadId
    };
    console.log("Aborting R2 multipart upload:", uploadId);
  }
  async getStats() {
    return {
      totalObjects: 0,
      totalSize: 0,
      bandwidthUsed: 0
    };
  }
};
export {
  CloudflareR2Provider
};
//# sourceMappingURL=CloudflareR2Provider-R3MIWLLG.js.map