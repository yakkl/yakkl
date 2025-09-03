// Browser compatibility shim
if (typeof globalThis === 'undefined') {
  window.globalThis = window;
}

// src/storage/object/providers/AzureBlobProvider.ts
import { Buffer } from "buffer";
var AzureBlobProvider = class {
  constructor(config) {
  }
  async connect() {
    throw new Error("AzureBlobProvider not yet implemented");
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
  AzureBlobProvider
};
//# sourceMappingURL=AzureBlobProvider-57H3A57Q.js.map