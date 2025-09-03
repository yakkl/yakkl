/**
 * Web3 Authentication Provider
 * Handles wallet-based authentication (MetaMask, WalletConnect, etc.)
 */
import type { AuthProvider, AuthCredentials, AuthResult, Web3AuthConfig } from '../types';
export declare class Web3Provider implements AuthProvider {
    name: string;
    type: "web3";
    private config;
    constructor(config: Web3AuthConfig);
    authenticate(credentials: AuthCredentials): Promise<AuthResult>;
    verify(token: string): Promise<boolean>;
    private verifySignature;
    private generateWeb3Token;
    private generateSessionId;
}
