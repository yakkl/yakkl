/**
 * Security context interface
 * 
 * Defines security features available to wallet components
 */

export interface AuthState {
  isAuthenticated: boolean;
  isRegistered: boolean;
  userId?: string;
  username?: string;
  lastActivity: number;
  sessionTimeout: number;
  sessionTimeRemaining?: number;
  showSessionWarning?: boolean;
}

export interface SessionState {
  token: string | null;
  expiresAt: number;
  isValid: boolean;
  userId?: string;
}

export interface SecurityContext {
  // Authentication
  auth: {
    login: (password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    register: (username: string, password: string) => Promise<boolean>;
    verifyPassword: (password: string) => Promise<boolean>;
    changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
    getAuthState: () => AuthState;
    subscribeToAuthState: (callback: (state: AuthState) => void) => () => void;
  };
  
  // Session management
  session: {
    getSession: () => SessionState | null;
    extendSession: () => Promise<void>;
    validateSession: () => Promise<boolean>;
    clearSession: () => Promise<void>;
    subscribeToSession: (callback: (state: SessionState | null) => void) => () => void;
  };
  
  // Encryption
  encryption: {
    encrypt: (data: any, password?: string) => Promise<string>;
    decrypt: (encryptedData: string, password?: string) => Promise<any>;
    hashPassword: (password: string) => Promise<string>;
    generateSalt: () => string;
  };
  
  // Emergency kit
  emergencyKit: {
    generate: (password: string) => Promise<string>;
    restore: (kit: string, newPassword: string) => Promise<boolean>;
    validate: (kit: string) => boolean;
  };
  
  // JWT operations
  jwt: {
    generateToken: (userId: string, expiresIn?: string) => Promise<string>;
    validateToken: (token: string) => Promise<boolean>;
    decodeToken: (token: string) => any;
    refreshToken: (token: string) => Promise<string>;
  };
}

/**
 * Security event types
 */
export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  SESSION_EXPIRED = 'session_expired',
  SESSION_EXTENDED = 'session_extended',
  PASSWORD_CHANGED = 'password_changed',
  REGISTRATION_SUCCESS = 'registration_success',
  REGISTRATION_FAILED = 'registration_failed',
  EMERGENCY_KIT_GENERATED = 'emergency_kit_generated',
  EMERGENCY_KIT_RESTORED = 'emergency_kit_restored'
}

/**
 * Security event
 */
export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: number;
  userId?: string;
  data?: any;
  error?: string;
}