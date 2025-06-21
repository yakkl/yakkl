import { getSettings } from '$lib/common/stores';
import type { Settings } from '$lib/common/interfaces';

export interface RegistrationStatus {
  isRegistered: boolean;
  hasAgreedToTerms: boolean;
  isInitialized: boolean;
  requiresAction: 'terms' | 'register' | 'login' | null;
}

export async function checkRegistrationStatus(): Promise<RegistrationStatus> {
  try {
    const settings = await getSettings();
    
    const hasAgreedToTerms = settings?.legal?.termsAgreed ?? false;
    const isInitialized = settings?.init ?? false;
    
    let requiresAction: RegistrationStatus['requiresAction'] = null;
    
    if (!hasAgreedToTerms) {
      requiresAction = 'terms';
    } else if (!isInitialized) {
      requiresAction = 'register';
    } else {
      requiresAction = 'login';
    }
    
    return {
      isRegistered: hasAgreedToTerms && isInitialized,
      hasAgreedToTerms,
      isInitialized,
      requiresAction
    };
  } catch (error) {
    console.error('Error checking registration status:', error);
    return {
      isRegistered: false,
      hasAgreedToTerms: false,
      isInitialized: false,
      requiresAction: 'terms'
    };
  }
}

export function isUserLoggedIn(miscStore: string | null): boolean {
  return !!miscStore && miscStore.length > 0;
}