// Browser compatibility shim
if (typeof globalThis === 'undefined') {
  window.globalThis = window;
}

// src/storage/vector/providers/CloudflareVectorProvider.ts
var CloudflareVectorProvider = class {
  constructor(config) {
    this.vectorize = null;
    this.config = config;
    this.accountId = config.environment || "";
    this.apiToken = config.apiKey || "";
    this.indexName = config.indexName || "default";
  }
  async connect() {
    if (typeof globalThis !== "undefined" && globalThis.VECTORIZE) {
      this.vectorize = globalThis.VECTORIZE;
    } else {
      this.vectorize = this.createRESTClient();
    }
  }
  async disconnect() {
    this.vectorize = null;
  }
  async createIndex(name, dimension, metric) {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/vectorize/indexes`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          config: {
            dimensions: dimension,
            metric: metric || "cosine"
          }
        })
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to create index: ${response.statusText}`);
    }
  }
  async deleteIndex(name) {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/vectorize/indexes/${name}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${this.apiToken}`
        }
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to delete index: ${response.statusText}`);
    }
  }
  async listIndexes() {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/vectorize/indexes`,
      {
        headers: {
          "Authorization": `Bearer ${this.apiToken}`
        }
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to list indexes: ${response.statusText}`);
    }
    const data = await response.json();
    return data.result.map((index) => index.name);
  }
  async upsert(documents) {
    if (!this.vectorize) {
      throw new Error("Not connected to Cloudflare Vectorize");
    }
    const vectors = documents.map((doc) => ({
      id: doc.id,
      values: doc.vector,
      metadata: {
        ...doc.metadata,
        text: doc.text
      }
    }));
    await this.vectorize.insert(vectors);
  }
  async delete(ids) {
    if (!this.vectorize) {
      throw new Error("Not connected to Cloudflare Vectorize");
    }
    await this.vectorize.delete(ids);
  }
  async fetch(ids) {
    if (!this.vectorize) {
      throw new Error("Not connected to Cloudflare Vectorize");
    }
    const results = await this.vectorize.get(ids);
    return results.vectors.map((vec) => ({
      id: vec.id,
      vector: vec.values,
      metadata: vec.metadata,
      text: vec.metadata?.text
    }));
  }
  async search(vector, topK = 10, filter) {
    if (!this.vectorize) {
      throw new Error("Not connected to Cloudflare Vectorize");
    }
    const results = await this.vectorize.query(vector, {
      topK,
      filter
    });
    return results.matches.map((match) => ({
      id: match.id,
      score: match.score,
      vector: match.values,
      metadata: match.metadata,
      text: match.metadata?.text
    }));
  }
  async searchByText(text, topK = 10, filter) {
    throw new Error("Text search requires embedding generation. Use search() with pre-computed vectors.");
  }
  async getStats() {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/vectorize/indexes/${this.indexName}/info`,
      {
        headers: {
          "Authorization": `Bearer ${this.apiToken}`
        }
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to get stats: ${response.statusText}`);
    }
    const data = await response.json();
    return {
      documentCount: data.result.vectorsCount || 0,
      indexSize: data.result.dimensions || 0
    };
  }
  createRESTClient() {
    const baseURL = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/vectorize/indexes/${this.indexName}`;
    return {
      insert: async (vectors) => {
        const response = await fetch(`${baseURL}/insert`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.apiToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ vectors })
        });
        if (!response.ok) {
          throw new Error(`Insert failed: ${response.statusText}`);
        }
        return response.json();
      },
      query: async (vector, options) => {
        const response = await fetch(`${baseURL}/query`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.apiToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            vector,
            topK: options?.topK,
            filter: options?.filter
          })
        });
        if (!response.ok) {
          throw new Error(`Query failed: ${response.statusText}`);
        }
        return response.json();
      },
      get: async (ids) => {
        const response = await fetch(`${baseURL}/get`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.apiToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ ids })
        });
        if (!response.ok) {
          throw new Error(`Get failed: ${response.statusText}`);
        }
        return response.json();
      },
      delete: async (ids) => {
        const response = await fetch(`${baseURL}/delete`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.apiToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ ids })
        });
        if (!response.ok) {
          throw new Error(`Delete failed: ${response.statusText}`);
        }
        return response.json();
      }
    };
  }
};
export {
  CloudflareVectorProvider
};
//# sourceMappingURL=CloudflareVectorProvider-VO3EOD7S.js.map