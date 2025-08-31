"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }// Browser compatibility shim
if (typeof globalThis === 'undefined') {
  window.globalThis = window;
}

// src/storage/object/providers/CloudflareR2Provider.ts
var _buffer = require('buffer');
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
      ACL: _optionalChain([options, 'optionalAccess', _ => _.acl]) || "private"
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
    } catch (e) {
      return false;
    }
  }
  async putObject(bucket, key, data, options) {
    const body = typeof data === "string" ? _buffer.Buffer.from(data) : data;
    const params = {
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: _optionalChain([options, 'optionalAccess', _2 => _2.metadata, 'optionalAccess', _3 => _3.contentType]),
      ContentEncoding: _optionalChain([options, 'optionalAccess', _4 => _4.metadata, 'optionalAccess', _5 => _5.contentEncoding]),
      ContentLanguage: _optionalChain([options, 'optionalAccess', _6 => _6.metadata, 'optionalAccess', _7 => _7.contentLanguage]),
      CacheControl: _optionalChain([options, 'optionalAccess', _8 => _8.metadata, 'optionalAccess', _9 => _9.cacheControl]),
      ContentDisposition: _optionalChain([options, 'optionalAccess', _10 => _10.metadata, 'optionalAccess', _11 => _11.contentDisposition]),
      Metadata: _optionalChain([options, 'optionalAccess', _12 => _12.metadata, 'optionalAccess', _13 => _13.customMetadata])
    };
    if (_optionalChain([options, 'optionalAccess', _14 => _14.progress]) && _buffer.Buffer.isBuffer(body)) {
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
      VersionId: _optionalChain([options, 'optionalAccess', _15 => _15.versionId])
    };
    if (_optionalChain([options, 'optionalAccess', _16 => _16.range])) {
      params.Range = `bytes=${options.range.start}-${options.range.end}`;
    }
    const metadata = {
      contentType: "application/octet-stream",
      contentLength: 0,
      lastModified: /* @__PURE__ */ new Date(),
      etag: "mock-etag"
    };
    return {
      data: _buffer.Buffer.from("mock-data"),
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
      MetadataDirective: _optionalChain([options, 'optionalAccess', _17 => _17.metadataDirective]),
      ContentType: _optionalChain([options, 'optionalAccess', _18 => _18.metadata, 'optionalAccess', _19 => _19.contentType]),
      CacheControl: _optionalChain([options, 'optionalAccess', _20 => _20.metadata, 'optionalAccess', _21 => _21.cacheControl]),
      ContentDisposition: _optionalChain([options, 'optionalAccess', _22 => _22.metadata, 'optionalAccess', _23 => _23.contentDisposition]),
      ContentEncoding: _optionalChain([options, 'optionalAccess', _24 => _24.metadata, 'optionalAccess', _25 => _25.contentEncoding]),
      ContentLanguage: _optionalChain([options, 'optionalAccess', _26 => _26.metadata, 'optionalAccess', _27 => _27.contentLanguage]),
      Metadata: _optionalChain([options, 'optionalAccess', _28 => _28.metadata, 'optionalAccess', _29 => _29.customMetadata]),
      StorageClass: _optionalChain([options, 'optionalAccess', _30 => _30.storageClass])
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
    } catch (e2) {
      return false;
    }
  }
  async listObjects(bucket, options) {
    const params = {
      Bucket: bucket,
      Prefix: _optionalChain([options, 'optionalAccess', _31 => _31.prefix]),
      Delimiter: _optionalChain([options, 'optionalAccess', _32 => _32.delimiter]),
      MaxKeys: _optionalChain([options, 'optionalAccess', _33 => _33.maxKeys]) || 1e3,
      ContinuationToken: _optionalChain([options, 'optionalAccess', _34 => _34.continuationToken]),
      StartAfter: _optionalChain([options, 'optionalAccess', _35 => _35.startAfter])
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
    const expires = _optionalChain([options, 'optionalAccess', _36 => _36.expires]) || 3600;
    const method = _optionalChain([options, 'optionalAccess', _37 => _37.method]) || "GET";
    return `https://${this.accountId}.r2.cloudflarestorage.com/${bucket}/${key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=${expires}&X-Amz-Method=${method}`;
  }
  getSignedUrlCommand(bucket, key, options) {
    const method = _optionalChain([options, 'optionalAccess', _38 => _38.method]) || "GET";
    switch (method) {
      case "PUT":
        return {
          Bucket: bucket,
          Key: key,
          ContentType: _optionalChain([options, 'optionalAccess', _39 => _39.contentType]),
          ContentDisposition: _optionalChain([options, 'optionalAccess', _40 => _40.contentDisposition])
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
          ResponseContentType: _optionalChain([options, 'optionalAccess', _41 => _41.contentType]),
          ResponseContentDisposition: _optionalChain([options, 'optionalAccess', _42 => _42.contentDisposition])
        };
    }
  }
  async createMultipartUpload(bucket, key, metadata) {
    const params = {
      Bucket: bucket,
      Key: key,
      ContentType: _optionalChain([metadata, 'optionalAccess', _43 => _43.contentType]),
      ContentEncoding: _optionalChain([metadata, 'optionalAccess', _44 => _44.contentEncoding]),
      ContentLanguage: _optionalChain([metadata, 'optionalAccess', _45 => _45.contentLanguage]),
      CacheControl: _optionalChain([metadata, 'optionalAccess', _46 => _46.cacheControl]),
      ContentDisposition: _optionalChain([metadata, 'optionalAccess', _47 => _47.contentDisposition]),
      Metadata: _optionalChain([metadata, 'optionalAccess', _48 => _48.customMetadata]),
      StorageClass: _optionalChain([metadata, 'optionalAccess', _49 => _49.storageClass])
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


exports.CloudflareR2Provider = CloudflareR2Provider;
//# sourceMappingURL=CloudflareR2Provider-6Q2CQLGE.cjs.map