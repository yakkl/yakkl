/**
 * Security Store
 * 
 * Manages security-related state including encryption keys,
 * security settings, and audit logs.
 */

import { writable, derived } from '../store';
import type { Writable, Readable } from '../types';

/**
 * Security level enum
 */
export enum SecurityLevel {
  STANDARD = 'standard',
  MEDIUM = 'medium',
  HIGH = 'high',
  MAXIMUM = 'maximum'
}

/**
 * Security state interface
 */
export interface SecurityState {
  securityLevel: SecurityLevel;
  biometricsEnabled: boolean;
  twoFactorEnabled: boolean;
  emergencyKitGenerated: boolean;
  lastSecurityCheck: number;
  encryptionEnabled: boolean;
  autoLockTimeout: number; // minutes
  failedAttempts: number;
  lockedUntil: number | null;
  securityScore: number; // 0-100
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  timestamp: number;
  event: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  details?: any;
}

/**
 * Rate limiting state
 */
export interface RateLimitState {
  attempts: number;
  windowStart: number;
  isLimited: boolean;
  retryAfter: number | null;
}

/**
 * Default security state
 */
const defaultSecurityState: SecurityState = {
  securityLevel: SecurityLevel.STANDARD,
  biometricsEnabled: false,
  twoFactorEnabled: false,
  emergencyKitGenerated: false,
  lastSecurityCheck: Date.now(),
  encryptionEnabled: true,
  autoLockTimeout: 15,
  failedAttempts: 0,
  lockedUntil: null,
  securityScore: 50
};

/**
 * Default rate limit state
 */
const defaultRateLimitState: RateLimitState = {
  attempts: 0,
  windowStart: Date.now(),
  isLimited: false,
  retryAfter: null
};

/**
 * Create security stores
 */
export function createSecurityStores() {
  // Main security store
  const securityStore: Writable<SecurityState> = writable(defaultSecurityState);
  
  // Audit log store
  const auditLogStore: Writable<AuditLogEntry[]> = writable([]);
  
  // Rate limiting store
  const rateLimitStore: Writable<RateLimitState> = writable(defaultRateLimitState);
  
  // Derived store for lock status
  const isLocked: Readable<boolean> = derived(
    securityStore,
    ($security) => {
      if ($security.lockedUntil === null) return false;
      return $security.lockedUntil > Date.now();
    }
  );
  
  // Derived store for security recommendations
  const recommendations: Readable<string[]> = derived(
    securityStore,
    ($security) => {
      const recs: string[] = [];
      
      if (!$security.biometricsEnabled) {
        recs.push('Enable biometric authentication for added security');
      }
      
      if (!$security.twoFactorEnabled) {
        recs.push('Enable two-factor authentication');
      }
      
      if (!$security.emergencyKitGenerated) {
        recs.push('Generate an emergency recovery kit');
      }
      
      if ($security.securityLevel === SecurityLevel.STANDARD) {
        recs.push('Consider increasing security level for better protection');
      }
      
      if ($security.autoLockTimeout > 30) {
        recs.push('Reduce auto-lock timeout for better security');
      }
      
      return recs;
    }
  );
  
  return {
    securityStore,
    auditLogStore,
    rateLimitStore,
    isLocked,
    recommendations,
    
    // Helper methods
    updateSecurity: (updates: Partial<SecurityState>) => {
      securityStore.update(state => ({ ...state, ...updates }));
    },
    
    setSecurityLevel: (level: SecurityLevel) => {
      securityStore.update(state => ({
        ...state,
        securityLevel: level,
        // Adjust settings based on level
        autoLockTimeout: level === SecurityLevel.MAXIMUM ? 5 :
                        level === SecurityLevel.HIGH ? 10 :
                        level === SecurityLevel.MEDIUM ? 15 : 30
      }));
    },
    
    addAuditLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
      const logEntry: AuditLogEntry = {
        ...entry,
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        timestamp: Date.now()
      };
      
      auditLogStore.update(logs => {
        const updated = [...logs, logEntry];
        // Keep only last 1000 entries
        if (updated.length > 1000) {
          return updated.slice(-1000);
        }
        return updated;
      });
    },
    
    clearAuditLog: () => {
      auditLogStore.set([]);
    },
    
    recordFailedAttempt: () => {
      securityStore.update(state => {
        const attempts = state.failedAttempts + 1;
        const shouldLock = attempts >= 5;
        
        return {
          ...state,
          failedAttempts: attempts,
          lockedUntil: shouldLock ? Date.now() + 5 * 60 * 1000 : state.lockedUntil
        };
      });
    },
    
    resetFailedAttempts: () => {
      securityStore.update(state => ({
        ...state,
        failedAttempts: 0,
        lockedUntil: null
      }));
    },
    
    updateRateLimit: (attempts: number) => {
      const now = Date.now();
      const windowDuration = 15 * 60 * 1000; // 15 minutes
      
      rateLimitStore.update(state => {
        // Reset if window expired
        if (now - state.windowStart > windowDuration) {
          return {
            attempts: 1,
            windowStart: now,
            isLimited: false,
            retryAfter: null
          };
        }
        
        const totalAttempts = state.attempts + attempts;
        const isLimited = totalAttempts > 5;
        
        return {
          attempts: totalAttempts,
          windowStart: state.windowStart,
          isLimited,
          retryAfter: isLimited ? state.windowStart + windowDuration : null
        };
      });
    },
    
    resetRateLimit: () => {
      rateLimitStore.set(defaultRateLimitState);
    },
    
    calculateSecurityScore: () => {
      securityStore.update(state => {
        let score = 25; // Base score
        
        if (state.biometricsEnabled) score += 15;
        if (state.twoFactorEnabled) score += 20;
        if (state.emergencyKitGenerated) score += 15;
        
        switch (state.securityLevel) {
          case SecurityLevel.MAXIMUM: score += 25; break;
          case SecurityLevel.HIGH: score += 20; break;
          case SecurityLevel.MEDIUM: score += 15; break;
          case SecurityLevel.STANDARD: score += 10; break;
        }
        
        return {
          ...state,
          securityScore: Math.min(100, score)
        };
      });
    }
  };
}

/**
 * Global security store instances (singleton)
 */
export const globalSecurityStores = createSecurityStores();

// Export individual stores for convenience
export const securityStore = globalSecurityStores.securityStore;
export const auditLogStore = globalSecurityStores.auditLogStore;
export const rateLimitStore = globalSecurityStores.rateLimitStore;
export const isLocked = globalSecurityStores.isLocked;
export const securityRecommendations = globalSecurityStores.recommendations;