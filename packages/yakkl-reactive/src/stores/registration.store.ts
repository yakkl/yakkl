/**
 * Registration Store
 * 
 * Manages user registration flow and state
 */

import { writable, derived } from '../store';
import type { Writable, Readable } from '../types';

/**
 * Registration step enum
 */
export enum RegistrationStep {
  CHOOSE_METHOD = 'choose_method',
  CREATE_ACCOUNT = 'create_account',
  IMPORT_WALLET = 'import_wallet',
  RESTORE_BACKUP = 'restore_backup',
  SET_PASSWORD = 'set_password',
  CONFIRM_PASSWORD = 'confirm_password',
  GENERATE_KEYS = 'generate_keys',
  BACKUP_KEYS = 'backup_keys',
  VERIFY_BACKUP = 'verify_backup',
  COMPLETE = 'complete'
}

/**
 * Registration method
 */
export enum RegistrationMethod {
  CREATE_NEW = 'create_new',
  IMPORT_EXISTING = 'import_existing',
  RESTORE_BACKUP = 'restore_backup'
}

/**
 * Registration state interface
 */
export interface RegistrationState {
  currentStep: RegistrationStep;
  method: RegistrationMethod | null;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  seedPhrase: string[];
  privateKey: string;
  publicKey: string;
  backupCreated: boolean;
  termsAccepted: boolean;
  isProcessing: boolean;
  error: string | null;
  validationErrors: Record<string, string>;
}

/**
 * Registration progress
 */
export interface RegistrationProgress {
  currentStep: number;
  totalSteps: number;
  percentage: number;
  canProceed: boolean;
  canGoBack: boolean;
}

/**
 * Default registration state
 */
const defaultRegistrationState: RegistrationState = {
  currentStep: RegistrationStep.CHOOSE_METHOD,
  method: null,
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  seedPhrase: [],
  privateKey: '',
  publicKey: '',
  backupCreated: false,
  termsAccepted: false,
  isProcessing: false,
  error: null,
  validationErrors: {}
};

/**
 * Get steps for registration method
 */
function getStepsForMethod(method: RegistrationMethod | null): RegistrationStep[] {
  switch (method) {
    case RegistrationMethod.CREATE_NEW:
      return [
        RegistrationStep.CHOOSE_METHOD,
        RegistrationStep.CREATE_ACCOUNT,
        RegistrationStep.SET_PASSWORD,
        RegistrationStep.CONFIRM_PASSWORD,
        RegistrationStep.GENERATE_KEYS,
        RegistrationStep.BACKUP_KEYS,
        RegistrationStep.VERIFY_BACKUP,
        RegistrationStep.COMPLETE
      ];
    
    case RegistrationMethod.IMPORT_EXISTING:
      return [
        RegistrationStep.CHOOSE_METHOD,
        RegistrationStep.IMPORT_WALLET,
        RegistrationStep.SET_PASSWORD,
        RegistrationStep.CONFIRM_PASSWORD,
        RegistrationStep.COMPLETE
      ];
    
    case RegistrationMethod.RESTORE_BACKUP:
      return [
        RegistrationStep.CHOOSE_METHOD,
        RegistrationStep.RESTORE_BACKUP,
        RegistrationStep.SET_PASSWORD,
        RegistrationStep.CONFIRM_PASSWORD,
        RegistrationStep.COMPLETE
      ];
    
    default:
      return [RegistrationStep.CHOOSE_METHOD];
  }
}

/**
 * Create registration stores
 */
export function createRegistrationStores() {
  // Main registration store
  const registrationStore: Writable<RegistrationState> = writable(defaultRegistrationState);
  
  // Derived store for progress
  const progress: Readable<RegistrationProgress> = derived(
    registrationStore,
    ($registration) => {
      const steps = getStepsForMethod($registration.method);
      const currentIndex = steps.indexOf($registration.currentStep);
      const totalSteps = steps.length;
      
      return {
        currentStep: currentIndex + 1,
        totalSteps,
        percentage: ((currentIndex + 1) / totalSteps) * 100,
        canProceed: !$registration.isProcessing && 
                   Object.keys($registration.validationErrors).length === 0,
        canGoBack: currentIndex > 0 && !$registration.isProcessing
      };
    }
  );
  
  // Derived store for validation status
  const isValid: Readable<boolean> = derived(
    registrationStore,
    ($registration) => {
      // Check required fields based on current step
      switch ($registration.currentStep) {
        case RegistrationStep.CREATE_ACCOUNT:
          return $registration.username.length > 0 && 
                 $registration.termsAccepted;
        
        case RegistrationStep.SET_PASSWORD:
          return $registration.password.length >= 8;
        
        case RegistrationStep.CONFIRM_PASSWORD:
          return $registration.password === $registration.confirmPassword;
        
        case RegistrationStep.IMPORT_WALLET:
          return $registration.seedPhrase.length === 12 || 
                 $registration.seedPhrase.length === 24 ||
                 $registration.privateKey.length > 0;
        
        case RegistrationStep.VERIFY_BACKUP:
          return $registration.backupCreated;
        
        default:
          return true;
      }
    }
  );
  
  return {
    registrationStore,
    progress,
    isValid,
    
    // Helper methods
    setMethod: (method: RegistrationMethod) => {
      registrationStore.update(state => ({
        ...state,
        method,
        currentStep: getStepsForMethod(method)[1] // Move to first real step
      }));
    },
    
    nextStep: () => {
      registrationStore.update(state => {
        const steps = getStepsForMethod(state.method);
        const currentIndex = steps.indexOf(state.currentStep);
        
        if (currentIndex < steps.length - 1) {
          return {
            ...state,
            currentStep: steps[currentIndex + 1],
            error: null
          };
        }
        
        return state;
      });
    },
    
    previousStep: () => {
      registrationStore.update(state => {
        const steps = getStepsForMethod(state.method);
        const currentIndex = steps.indexOf(state.currentStep);
        
        if (currentIndex > 0) {
          return {
            ...state,
            currentStep: steps[currentIndex - 1],
            error: null
          };
        }
        
        return state;
      });
    },
    
    updateField: (field: keyof RegistrationState, value: any) => {
      registrationStore.update(state => ({
        ...state,
        [field]: value,
        error: null,
        validationErrors: {
          ...state.validationErrors,
          [field]: '' // Clear validation error for this field
        }
      }));
    },
    
    setValidationError: (field: string, error: string) => {
      registrationStore.update(state => ({
        ...state,
        validationErrors: {
          ...state.validationErrors,
          [field]: error
        }
      }));
    },
    
    clearValidationErrors: () => {
      registrationStore.update(state => ({
        ...state,
        validationErrors: {}
      }));
    },
    
    setProcessing: (isProcessing: boolean) => {
      registrationStore.update(state => ({
        ...state,
        isProcessing
      }));
    },
    
    setError: (error: string | null) => {
      registrationStore.update(state => ({
        ...state,
        error,
        isProcessing: false
      }));
    },
    
    setSeedPhrase: (seedPhrase: string[]) => {
      registrationStore.update(state => ({
        ...state,
        seedPhrase
      }));
    },
    
    setKeys: (privateKey: string, publicKey: string) => {
      registrationStore.update(state => ({
        ...state,
        privateKey,
        publicKey
      }));
    },
    
    markBackupCreated: () => {
      registrationStore.update(state => ({
        ...state,
        backupCreated: true
      }));
    },
    
    reset: () => {
      registrationStore.set(defaultRegistrationState);
    },
    
    complete: () => {
      registrationStore.update(state => ({
        ...state,
        currentStep: RegistrationStep.COMPLETE,
        isProcessing: false,
        error: null
      }));
    }
  };
}

/**
 * Global registration store instances (singleton)
 */
export const globalRegistrationStores = createRegistrationStores();

// Export individual stores and methods for convenience
export const registrationStore = globalRegistrationStores.registrationStore;
export const registrationProgress = globalRegistrationStores.progress;
export const registrationValid = globalRegistrationStores.isValid;