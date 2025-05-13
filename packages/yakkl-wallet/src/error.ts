import { isExtensionContextValid } from '$lib/common/utils';

export function handleError({ error, event }: { error: any, event: any }) {
  if (error.message?.includes('Extension context invalidated')) {
    // Don't crash the app, just log and maybe show user-friendly message
    console.warn('Extension context lost, some features may not work');
    return {
      message: 'Extension needs reload'
    };
  }

  // Handle other errors normally
  throw error;
}
