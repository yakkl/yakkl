/**
 * Passkey/WebAuthn Authentication Provider
 * Modern passwordless authentication using biometrics or security keys
 */

import type { AuthProvider, AuthCredentials, AuthResult } from '../types';

export interface PasskeyConfig {
  rpName: string;  // Relying Party name (your app name)
  rpId?: string;   // Relying Party ID (domain)
  origin: string;  // Expected origin
  userVerification?: 'required' | 'preferred' | 'discouraged';
  timeout?: number;
  attestation?: 'none' | 'indirect' | 'direct';
}

export interface PasskeyCredential {
  id: string;
  publicKey: string;
  algorithm: number;
  transports?: string[];
  attestationObject?: ArrayBuffer;
  clientDataJSON?: ArrayBuffer;
}

export class PasskeyProvider implements AuthProvider {
  name = 'passkey';
  type = 'passkey' as const;
  private config: PasskeyConfig;
  private credentials: Map<string, PasskeyCredential> = new Map();

  constructor(config: PasskeyConfig) {
    this.config = {
      userVerification: 'preferred',
      timeout: 60000,
      attestation: 'none',
      ...config
    };
  }

  /**
   * Start passkey registration
   */
  async startRegistration(user: { id: string; name: string; displayName: string }): Promise<PublicKeyCredentialCreationOptions> {
    // Generate challenge
    const challenge = this.generateChallenge();
    
    // Store challenge for verification
    this.storeChallenge(user.id, challenge);
    
    return {
      challenge,
      rp: {
        name: this.config.rpName,
        id: this.config.rpId
      },
      user: {
        id: this.stringToBuffer(user.id),
        name: user.name,
        displayName: user.displayName
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' }, // RS256
        { alg: -8, type: 'public-key' }    // EdDSA
      ],
      authenticatorSelection: {
        userVerification: this.config.userVerification,
        residentKey: 'preferred',
        requireResidentKey: false
      },
      timeout: this.config.timeout,
      attestation: this.config.attestation
    };
  }

  /**
   * Complete passkey registration
   */
  async completeRegistration(
    userId: string,
    credential: PublicKeyCredential
  ): Promise<{ success: boolean; credentialId: string }> {
    try {
      // Verify the credential
      const verified = await this.verifyRegistration(userId, credential);
      
      if (!verified) {
        return { success: false, credentialId: '' };
      }

      // Store credential
      const credentialId = this.bufferToBase64(credential.rawId);
      const response = credential.response as AuthenticatorAttestationResponse;
      
      const publicKeyBuffer = response.getPublicKey?.();
      if (!publicKeyBuffer) {
        throw new Error('Failed to extract public key from credential');
      }
      
      const passkeyCredential: PasskeyCredential = {
        id: credentialId,
        publicKey: this.extractPublicKey(publicKeyBuffer),
        algorithm: -7, // ES256
        transports: (response as any).getTransports?.() || [],
        attestationObject: response.attestationObject,
        clientDataJSON: response.clientDataJSON
      };

      this.credentials.set(credentialId, passkeyCredential);
      
      // In production, store in database
      await this.storeCredential(userId, passkeyCredential);
      
      return {
        success: true,
        credentialId
      };
    } catch (error: any) {
      console.error('[PasskeyProvider] Registration failed:', error);
      return { success: false, credentialId: '' };
    }
  }

  /**
   * Start passkey authentication
   */
  async startAuthentication(userId?: string): Promise<PublicKeyCredentialRequestOptions> {
    const challenge = this.generateChallenge();
    
    // Store challenge for verification
    this.storeChallenge(userId || 'anonymous', challenge);
    
    const options: PublicKeyCredentialRequestOptions = {
      challenge,
      timeout: this.config.timeout,
      userVerification: this.config.userVerification,
      rpId: this.config.rpId
    };

    // If userId provided, specify allowed credentials
    if (userId) {
      const userCredentials = await this.getUserCredentials(userId);
      if (userCredentials.length > 0) {
        options.allowCredentials = userCredentials.map(cred => ({
          id: this.base64ToBuffer(cred.id),
          type: 'public-key',
          transports: cred.transports as any || ['internal', 'hybrid']
        }));
      }
    }

    return options;
  }

  /**
   * Complete passkey authentication
   */
  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      if (!credentials.assertion) {
        return {
          success: false,
          error: 'Passkey assertion required'
        };
      }

      const assertion = credentials.assertion as PublicKeyCredential;
      const response = assertion.response as AuthenticatorAssertionResponse;
      
      // Verify the assertion
      const verified = await this.verifyAssertion(
        assertion.id,
        response,
        credentials.userId
      );

      if (!verified) {
        return {
          success: false,
          error: 'Passkey verification failed'
        };
      }

      // Get user info from credential
      const user = await this.getUserFromCredential(assertion.id);
      
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Create session
      const sessionId = this.generateSessionId();
      
      return {
        success: true,
        user,
        session: {
          id: sessionId,
          userId: user.id,
          token: this.generateToken(user.id),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          createdAt: new Date(),
          metadata: {
            authenticator: 'passkey',
            credentialId: this.bufferToBase64(assertion.rawId)
          }
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Passkey authentication failed'
      };
    }
  }

  /**
   * Verify passkey (for subsequent requests)
   */
  async verify(token: string): Promise<boolean> {
    // In production, verify JWT or session token
    try {
      const payload = this.parseToken(token);
      return !!payload.userId && Date.now() < payload.exp;
    } catch {
      return false;
    }
  }

  /**
   * Check if passkeys are supported
   */
  static isSupported(): boolean {
    return !!(
      window?.PublicKeyCredential &&
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
    );
  }

  /**
   * Check if conditional UI is available
   */
  static async isConditionalUIAvailable(): Promise<boolean> {
    if (!PasskeyProvider.isSupported()) {
      return false;
    }
    
    try {
      return await window.PublicKeyCredential
        .isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  // Private helper methods

  private async verifyRegistration(
    userId: string,
    credential: PublicKeyCredential
  ): Promise<boolean> {
    // In production, verify with server
    // Check challenge, origin, etc.
    const storedChallenge = this.getChallenge(userId);
    const response = credential.response as AuthenticatorAttestationResponse;
    
    if (!storedChallenge) {
      return false;
    }

    // Verify client data
    const clientData = JSON.parse(
      new TextDecoder().decode(response.clientDataJSON)
    );
    
    return (
      clientData.type === 'webauthn.create' &&
      clientData.origin === this.config.origin &&
      this.bufferToBase64(new TextEncoder().encode(clientData.challenge)) === 
      this.bufferToBase64(storedChallenge)
    );
  }

  private async verifyAssertion(
    credentialId: string,
    response: AuthenticatorAssertionResponse,
    userId?: string
  ): Promise<boolean> {
    // In production, verify signature with stored public key
    const storedChallenge = this.getChallenge(userId || 'anonymous');
    
    if (!storedChallenge) {
      return false;
    }

    // Verify client data
    const clientData = JSON.parse(
      new TextDecoder().decode(response.clientDataJSON)
    );
    
    // Basic verification
    return (
      clientData.type === 'webauthn.get' &&
      clientData.origin === this.config.origin
    );
  }

  private generateChallenge(): ArrayBuffer {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return array.buffer;
  }

  private storeChallenge(userId: string, challenge: ArrayBuffer): void {
    // In production, store in Redis or similar with TTL
    const key = `challenge_${userId}`;
    sessionStorage.setItem(key, this.bufferToBase64(challenge));
  }

  private getChallenge(userId: string): ArrayBuffer | null {
    const key = `challenge_${userId}`;
    const stored = sessionStorage.getItem(key);
    
    if (!stored) {
      return null;
    }
    
    sessionStorage.removeItem(key);
    return this.base64ToBuffer(stored);
  }

  private async storeCredential(userId: string, credential: PasskeyCredential): Promise<void> {
    // In production, store in database
    const key = `passkey_${userId}`;
    localStorage.setItem(key, JSON.stringify({
      ...credential,
      attestationObject: undefined,
      clientDataJSON: undefined
    }));
  }

  private async getUserCredentials(userId: string): Promise<PasskeyCredential[]> {
    // In production, fetch from database
    const key = `passkey_${userId}`;
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      return [];
    }
    
    return [JSON.parse(stored)];
  }

  private async getUserFromCredential(credentialId: string): Promise<any> {
    // In production, lookup user by credential ID
    // For now, return mock user
    return {
      id: 'user_' + Date.now(),
      username: 'passkey_user',
      displayName: 'Passkey User',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private extractPublicKey(publicKey: ArrayBuffer | undefined): string {
    if (!publicKey) {
      // For some authenticators, public key is in attestation object
      return 'extracted_public_key';
    }
    return this.bufferToBase64(publicKey);
  }

  private generateToken(userId: string): string {
    // Simple JWT-like token
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400
    };
    
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    
    return `${encodedHeader}.${encodedPayload}.mock_signature`;
  }

  private parseToken(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token');
    }
    
    return JSON.parse(atob(parts[1]));
  }

  private generateSessionId(): string {
    return `passkey_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private stringToBuffer(str: string): ArrayBuffer {
    return new TextEncoder().encode(str).buffer;
  }

  private bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}