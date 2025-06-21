/**
 * API Client for YAKKL Wallet
 * Handles authenticated API calls to Cloudflare Workers with JWT tokens
 */

import { browser } from '$app/environment';
import { authStore } from '$lib/stores/auth-store';
import { jwtManager } from './jwt';
import { backgroundJWTManager } from './jwt-background';
import { log } from '$lib/common/logger-wrapper';

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class APIClient {
  private static instance: APIClient | null = null;
  private baseURL: string;

  private constructor(baseURL: string = 'https://api.yakkl.com') {
    this.baseURL = baseURL;
  }

  static getInstance(baseURL?: string): APIClient {
    if (!APIClient.instance) {
      APIClient.instance = new APIClient(baseURL);
    }
    return APIClient.instance;
  }

  /**
   * Detect if we're in a background context
   */
  private isBackgroundContext(): boolean {
    // Check for service worker context
    try {
      if (typeof self !== 'undefined' && 
          'ServiceWorkerGlobalScope' in globalThis && 
          self instanceof (globalThis as any).ServiceWorkerGlobalScope) {
        return true;
      }
    } catch {
      // ServiceWorkerGlobalScope not available
    }
    
    // Check for extension background context
    if (typeof chrome !== 'undefined' && 
        chrome.storage && 
        chrome.storage.local &&
        !browser) {
      return true;
    }

    return false;
  }

  /**
   * Make an authenticated API request
   */
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    if (!browser) {
      throw new Error('API calls are only available in browser context');
    }

    try {
      // Get current JWT token based on context
      let token: string | null = null;
      
      if (this.isBackgroundContext()) {
        // Use background JWT manager for service workers/background scripts
        token = await backgroundJWTManager.getCurrentToken();
      } else {
        // Use auth store for client contexts
        token = authStore.getCurrentJWTToken();
      }
      
      if (!token) {
        return {
          success: false,
          error: 'No authentication token available'
        };
      }

      // Validate token before use (context-aware)
      let isValid: boolean;
      if (this.isBackgroundContext()) {
        isValid = await backgroundJWTManager.validateToken(token);
      } else {
        const payload = await jwtManager.validateToken(token);
        isValid = payload !== null;
      }
      
      if (!isValid) {
        return {
          success: false,
          error: 'Authentication token is invalid or expired'
        };
      }

      // Prepare headers
      const headers = new Headers(options.headers);
      headers.set('Authorization', `Bearer ${token}`);
      headers.set('Content-Type', 'application/json');

      // Make the request
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers
      });

      // Parse response
      const data = await response.json();

      if (!response.ok) {
        log.warn('API request failed:', false, {
          endpoint,
          status: response.status,
          error: data.error || data.message
        });

        return {
          success: false,
          error: data.error || data.message || `HTTP ${response.status}`
        };
      }

      log.debug('API request successful:', false, { endpoint, status: response.status });

      return {
        success: true,
        data
      };
    } catch (error) {
      log.error('API request error:', false, { endpoint, error });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, data?: any): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, data?: any): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Upload file with JWT authentication
   */
  async upload<T = any>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, string>
  ): Promise<APIResponse<T>> {
    if (!browser) {
      throw new Error('File uploads are only available in browser context');
    }

    try {
      // Get current JWT token based on context
      let token: string | null = null;
      
      if (this.isBackgroundContext()) {
        // Use background JWT manager for service workers/background scripts
        token = await backgroundJWTManager.getCurrentToken();
      } else {
        // Use auth store for client contexts
        token = authStore.getCurrentJWTToken();
      }
      
      if (!token) {
        return {
          success: false,
          error: 'No authentication token available'
        };
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('file', file);

      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      // Make the request
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type for FormData - browser will set it with boundary
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || `HTTP ${response.status}`
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      log.error('File upload error:', false, { endpoint, error });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload error'
      };
    }
  }

  /**
   * Set base URL for API calls
   */
  setBaseURL(url: string): void {
    this.baseURL = url;
  }

  /**
   * Get current base URL
   */
  getBaseURL(): string {
    return this.baseURL;
  }
}

// Export singleton instance
export const apiClient = APIClient.getInstance();

// Example usage functions
export async function getUserProfile(): Promise<APIResponse> {
  return apiClient.get('/user/profile');
}

export async function updateUserSettings(settings: any): Promise<APIResponse> {
  return apiClient.put('/user/settings', settings);
}

export async function getWalletBalance(): Promise<APIResponse> {
  return apiClient.get('/wallet/balance');
}

export async function upgradeUserPlan(planData: any): Promise<APIResponse> {
  return apiClient.post('/user/upgrade', planData);
}