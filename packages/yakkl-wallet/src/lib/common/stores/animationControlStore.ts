import { writable, derived, get, type Readable, type Writable } from 'svelte/store';

export interface AnimationControlState {
  globalEnabled: boolean;
  performanceMode: 'auto' | 'force-on' | 'force-off';
  maxActiveAnimations: number;
  respectMotionPreference: boolean;
  disabledComponents: Set<string>; // Component IDs to disable
}

export type CanAnimateFunction = (componentId?: string) => boolean;

// Default state
const defaultState: AnimationControlState = {
  globalEnabled: true,
  performanceMode: 'auto',
  maxActiveAnimations: 5, // Reduced from 20 to improve performance
  respectMotionPreference: true,
  disabledComponents: new Set()
};

// Create the store
function createAnimationControlStore() {
  const state = writable<AnimationControlState>(defaultState);
  const { subscribe, set, update } = state;
  
  // Track active animations
  const activeAnimations = writable<number>(0);
  
  // Create derived store properly with explicit typing
  const canAnimateStore: Readable<CanAnimateFunction> = derived(
    [state, activeAnimations],
    ([$state, $active]): CanAnimateFunction => {
      return (componentId?: string): boolean => {
        // Check global enabled
        if (!$state.globalEnabled) return false;
        
        // Check component-specific disable
        if (componentId && $state.disabledComponents.has(componentId)) return false;
        
        // Check performance mode
        if ($state.performanceMode === 'force-off') return false;
        if ($state.performanceMode === 'force-on') return true;
        
        // Auto mode: check active count
        if ($state.performanceMode === 'auto' && $active >= $state.maxActiveAnimations) {
          return false;
        }
        
        // Check motion preference if enabled
        if ($state.respectMotionPreference && typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          return false;
        }
        
        return true;
      };
    }
  );
  
  return {
    subscribe,
    
    // Global control
    enableAll: () => update(state => ({ ...state, globalEnabled: true })),
    disableAll: () => update(state => ({ ...state, globalEnabled: false })),
    
    // Component-specific control
    disableComponent: (componentId: string) => update(state => {
      const newDisabled = new Set(state.disabledComponents);
      newDisabled.add(componentId);
      return { ...state, disabledComponents: newDisabled };
    }),
    
    enableComponent: (componentId: string) => update(state => {
      const newDisabled = new Set(state.disabledComponents);
      newDisabled.delete(componentId);
      return { ...state, disabledComponents: newDisabled };
    }),
    
    // Performance control
    setPerformanceMode: (mode: AnimationControlState['performanceMode']) => 
      update(state => ({ ...state, performanceMode: mode })),
    
    setMaxAnimations: (max: number) => 
      update(state => ({ ...state, maxActiveAnimations: max })),
    
    // Active animation tracking
    incrementActive: () => activeAnimations.update(n => n + 1),
    decrementActive: () => activeAnimations.update(n => Math.max(0, n - 1)),
    
    // Expose the derived store
    canAnimate: canAnimateStore,
    
    // Get current state
    getState: () => get(state)
  };
}

// Export singleton instance
export const animationControlStore = createAnimationControlStore();

// Export helper to check if animations should run
export function shouldAnimate(componentId?: string): boolean {
  const canAnimateFn = get(animationControlStore.canAnimate) as CanAnimateFunction;
  return canAnimateFn(componentId);
}