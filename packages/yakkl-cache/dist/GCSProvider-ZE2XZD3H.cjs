"use strict";Object.defineProperty(exports, "__esModule", {value: true});// Browser compatibility shim
if (typeof globalThis === 'undefined') {
  window.globalThis = window;
}

// src/storage/object/providers/GCSProvider.ts
var _buffer = require('buffer');
var GCSProvider = class {
  constructor(config) {
  }
  async connect() {
    throw new Error("GCSProvider not yet implemented");
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
    return { data: _buffer.Buffer.from(""), metadata: {} };
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


exports.GCSProvider = GCSProvider;
//# sourceMappingURL=GCSProvider-ZE2XZD3H.cjs.map