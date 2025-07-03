import { browser_ext } from '$lib/common/environment';
import { log } from '$lib/managers/Logger';

// Deprecated - use messagingService.startActivityTracking instead
/**
 * Simple tracker for UI activity that reports to the background context manager
 */
// export class UIActivityTracker {
//   private static instance: UIActivityTracker | null = null;
//   private contextId: string;
//   private contextType: string;
//   private isTracking: boolean = false;
//   private boundReportActivity: () => void;
//   private events = [
//     'mousemove', 'mousedown', 'keypress', 'DOMMouseScroll',
//     'mousewheel', 'touchmove', 'MSPointerMove', 'keydown', 'focus'
//   ];

//   /**
//    * Private constructor - use initialize() instead
//    */
//   private constructor(contextId: string, contextType: string) {
//     this.contextId = contextId;
//     this.contextType = contextType;
//     this.boundReportActivity = this.reportActivity.bind(this);
//     log.info(`[UIActivityTracker] Created for ${contextType} with ID ${contextId}`);
//   }

//   /**
//    * Initialize the activity tracker for this context
//    */
//   static initialize(contextId: string, contextType: string): UIActivityTracker {
//     if (!UIActivityTracker.instance) {
//       UIActivityTracker.instance = new UIActivityTracker(contextId, contextType);
//     } else {
//       // Update context info if needed
//       UIActivityTracker.instance.contextId = contextId;
//       UIActivityTracker.instance.contextType = contextType;
//     }
//     return UIActivityTracker.instance;
//   }

//   /**
//    * Get the singleton instance
//    */
//   static getInstance(): UIActivityTracker {
//     if (!UIActivityTracker.instance) {
//       throw new Error('UIActivityTracker not initialized');
//     }
//     return UIActivityTracker.instance;
//   }

//   /**
//    * Start tracking user activity in this context
//    */
//   startTracking(): void {
//     if (this.isTracking) return;

//     log.info(`[UIActivityTracker] Starting activity tracking for ${this.contextType}`);

//     // Add event listeners for user activity
//     this.events.forEach(event => {
//       try {
//         window.addEventListener(event, this.boundReportActivity, { passive: true });
//       } catch (error) {
//         log.error(`[UIActivityTracker] Error adding listener for ${event}:`, false, error);
//       }
//     });

//     // Handle visibility changes (user returning to tab)
//     document.addEventListener('visibilitychange', () => {
//       if (!document.hidden) {
//         this.reportActivity();
//       }
//     });

//     // Report initial activity
//     this.reportActivity();

//     this.isTracking = true;
//   }

//   /**
//    * Stop tracking user activity
//    */
//   stopTracking(): void {
//     if (!this.isTracking) return;

//     log.info(`[UIActivityTracker] Stopping activity tracking for ${this.contextType}`);

//     // Remove event listeners
//     this.events.forEach(event => {
//       try {
//         window.removeEventListener(event, this.boundReportActivity);
//       } catch (error) {
//         log.error(`[UIActivityTracker] Error removing listener for ${event}:`, false, error);
//       }
//     });

//     this.isTracking = false;
//   }

//   /**
//    * Report user activity to the background script
//    */
//   private reportActivity(): void {
//     if (!browser_ext) {
//       log.warn('[UIActivityTracker] Browser extension API not available');
//       return;
//     }

//     try {
//       // Use ui_context_activity for compatibility with your existing code
//       browser_ext.runtime.sendMessage({
//         type: 'ui_context_activity',
//         contextId: this.contextId,
//         contextType: this.contextType,
//         timestamp: Date.now()
//       }).catch(error => {
//         log.error('[UIActivityTracker] Error reporting activity:', false, error);
//       });
//     } catch (error) {
//       log.error('[UIActivityTracker] Failed to send activity message:', false, error);
//     }
//   }

//   /**
//    * Force an activity report (for testing)
//    */
//   forceActivityReport(): void {
//     this.reportActivity();
//   }

//   /**
//    * Check if tracking is active
//    */
//   isActive(): boolean {
//     return this.isTracking;
//   }
// }
