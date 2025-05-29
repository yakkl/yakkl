// rpc/RPCBase.ts
import { log } from '$lib/common/logger-wrapper';

export interface RPCOptions {
  baseURL: string;
  apiKey?: string;
  headers?: Record<string, string>;
  maxRetries?: number;
  timeout?: number; // milliseconds
}

export class RPCBase {
  protected baseURL: string;
  protected apiKey?: string;
  protected headers: Record<string, string>;
  protected maxRetries: number;
  protected timeout: number;

  // NOTE: If you have an API key, you need to provide it in the options either as a string for apiKey, in the baseURL, or in the headers (if in the headers then apiKey must be '' | undefined)
  constructor(options: RPCOptions) {
    this.baseURL = options.baseURL;
    this.apiKey = options.apiKey; // NOTE: This is optional, if not provided, we will use the baseURL directly
    this.headers = options.headers || { 'Content-Type': 'application/json' }; // You need to override all headers if you provide this
    this.maxRetries = options.maxRetries ?? 3;
    this.timeout = options.timeout ?? 5000;
  }

  async fetchWithRetry(
    body: Record<string, any>,
    headers: Record<string, string> = {},
    retries = this.maxRetries,
    backoffMs = 500
  ): Promise<any> {
    const url = this.apiKey ? `${this.baseURL}/${this.apiKey}` : this.baseURL;
    const options: RequestInit = {
      method: 'POST',
      headers: headers || this.headers,
      body: JSON.stringify(body),
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeout);
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text();
          log.error(`[RPCBase] Non-OK HTTP status`, false, { status: response.status, errorText });
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();
        if (json.error) {
          log.error(`[RPCBase] JSON-RPC error`, false, json.error);
          throw new Error(json.error.message || 'Unknown JSON-RPC error');
        }

        return json.result;
      } catch (err) {
        if (attempt === retries) {
          log.error(`[RPCBase] Failed after ${attempt} attempts`, false, err);
          throw err;
        }
        const delay = backoffMs * 2 ** (attempt - 1);
        log.warn(`[RPCBase] Retry ${attempt}/${retries} after error: ${err}. Waiting ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }

  // headers is optional, default is the headers set in the constructor
  public async request(method: string, params: any[] = [], headers: Record<string, string> = {}, retries: number = this.maxRetries, backoffMs: number = 500): Promise<any> {
    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    };

    log.info(`[RPCBase] Sending request:`, false, { method, params });

    return this.fetchWithRetry(payload, headers);
  }
}
