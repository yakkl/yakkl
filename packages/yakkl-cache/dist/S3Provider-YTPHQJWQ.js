// Browser compatibility shim
if (typeof globalThis === 'undefined') {
  window.globalThis = window;
}

// src/storage/object/providers/S3Provider.ts
import { Buffer } from "buffer";
var S3Provider = class {
  constructor(config) {
  }
  async connect() {
    throw new Error("S3Provider not yet implemented");
  }
  async disconnect() {
  }
  async createBucket() {
  }
  async deleteBucket() {
  }
  async listBuckets() {
    return [];
  }
  async bucketExists() {
    return false;
  }
  async putObject() {
    return {};
  }
  async getObject() {
    return { data: Buffer.from(""), metadata: {} };
  }
  async deleteObject() {
  }
  async deleteObjects() {
    return [];
  }
  async copyObject() {
    return {};
  }
  async headObject() {
    return {};
  }
  async objectExists() {
    return false;
  }
  async listObjects() {
    return { objects: [], isTruncated: false, keyCount: 0 };
  }
  async getSignedUrl() {
    return "";
  }
  async createMultipartUpload() {
    return "";
  }
  async uploadPart() {
    return { etag: "" };
  }
  async completeMultipartUpload() {
    return {};
  }
  async abortMultipartUpload() {
  }
  async getStats() {
    return {};
  }
};
export {
  S3Provider
};
//# sourceMappingURL=S3Provider-YTPHQJWQ.js.map