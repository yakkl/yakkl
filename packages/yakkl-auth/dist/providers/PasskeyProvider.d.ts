/**
 * Passkey/WebAuthn Authentication Provider
 * Modern passwordless authentication using biometrics or security keys
 */
import type { AuthProvider, AuthCredentials, AuthResult } from '../types';
export interface PasskeyConfig {
    rpName: string;
    rpId?: string;
    origin: string;
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
export declare class PasskeyProvider implements AuthProvider {
    name: string;
    type: "passkey";
    private config;
    private credentials;
    constructor(config: PasskeyConfig);
    /**
     * Start passkey registration
     */
    startRegistration(user: {
        id: string;
        name: string;
        displayName: string;
    }): Promise<PublicKeyCredentialCreationOptions>;
    /**
     * Complete passkey registration
     */
    completeRegistration(userId: string, credential: PublicKeyCredential): Promise<{
        success: boolean;
        credentialId: string;
    }>;
    /**
     * Start passkey authentication
     */
    startAuthentication(userId?: string): Promise<PublicKeyCredentialRequestOptions>;
    /**
     * Complete passkey authentication
     */
    authenticate(credentials: AuthCredentials): Promise<AuthResult>;
    /**
     * Verify passkey (for subsequent requests)
     */
    verify(token: string): Promise<boolean>;
    /**
     * Check if passkeys are supported
     */
    static isSupported(): boolean;
    /**
     * Check if conditional UI is available
     */
    static isConditionalUIAvailable(): Promise<boolean>;
    private verifyRegistration;
    private verifyAssertion;
    private generateChallenge;
    private storeChallenge;
    private getChallenge;
    private storeCredential;
    private getUserCredentials;
    private getUserFromCredential;
    private extractPublicKey;
    private generateToken;
    private parseToken;
    private generateSessionId;
    private stringToBuffer;
    private bufferToBase64;
    private base64ToBuffer;
}
