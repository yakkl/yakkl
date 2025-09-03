/**
 * Web3 Authentication Provider
 * Handles wallet-based authentication (MetaMask, WalletConnect, etc.)
 */

import type { AuthProvider, AuthCredentials, AuthResult, Web3AuthConfig } from '../types';

export class Web3Provider implements AuthProvider {
  name = 'web3';
  type = 'web3' as const;
  private config: Web3AuthConfig;

  constructor(config: Web3AuthConfig) {
    this.config = {
      message: 'Sign this message to authenticate with YAKKL',
      verifySignature: true,
      ...config
    };
  }

  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      // Expect signature and address in credentials
      const { address, signature, message, nonce } = credentials;
      
      if (!address || !signature) {
        return {
          success: false,
          error: 'Wallet address and signature required'
        };
      }

      // Verify signature
      if (this.config.verifySignature) {
        const isValid = await this.verifySignature(address, signature, message || this.config.message);
        
        if (!isValid) {
          return {
            success: false,
            error: 'Invalid signature'
          };
        }
      }

      // Create session
      const sessionId = this.generateSessionId();
      const token = await this.generateWeb3Token(address, nonce);

      return {
        success: true,
        user: {
          id: address.toLowerCase(),
          username: address,
          displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
          metadata: {
            chainId: this.config.chainId,
            walletType: credentials.walletType || 'unknown'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        session: {
          id: sessionId,
          userId: address.toLowerCase(),
          token,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          createdAt: new Date(),
          metadata: {
            chainId: this.config.chainId
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Web3 authentication failed'
      };
    }
  }

  async verify(token: string): Promise<boolean> {
    try {
      // Parse token and verify format
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      const payload = JSON.parse(atob(parts[1]));
      
      // Check expiry
      if (payload.exp && payload.exp < Date.now() / 1000) {
        return false;
      }
      
      // In production, verify against blockchain or stored sessions
      return true;
    } catch {
      return false;
    }
  }

  private async verifySignature(address: string, signature: string, message: string): Promise<boolean> {
    try {
      // In production, use ethers or web3.js to verify
      // For now, basic validation
      if (!signature.startsWith('0x')) return false;
      if (signature.length !== 132) return false; // 65 bytes * 2 + 0x
      
      // Would use ethers.verifyMessage(message, signature) === address
      return true;
    } catch {
      return false;
    }
  }

  private async generateWeb3Token(address: string, nonce?: string): Promise<string> {
    // Create a simple JWT-like token for Web3 auth
    const header = {
      alg: 'ES256K',
      typ: 'JWT'
    };
    
    const payload = {
      sub: address.toLowerCase(),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
      chainId: this.config.chainId,
      nonce
    };
    
    // In production, sign with server key
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = 'mock-signature'; // Would be real signature
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private generateSessionId(): string {
    return `web3_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}