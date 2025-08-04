import { log } from '$lib/common/logger-wrapper';
import { animationControlStore } from '$lib/common/stores/animationControlStore';

export type AnimationCallback = (time: number, deltaTime: number) => void;

interface RegisteredComponent {
  id: string;
  callback: AnimationCallback;
  priority: number;
  lastUpdate: number;
}

/**
 * Singleton animation scheduler that manages all component animations
 * with a single requestAnimationFrame loop for optimal performance
 */
export class AnimationScheduler {
  private static instance: AnimationScheduler | null = null;
  private components = new Map<string, RegisteredComponent>();
  private rafId: number | null = null;
  private lastFrameTime = 0;
  private frameCount = 0;
  private performanceMonitor = {
    fps: 60,
    frameTime: 0,
    droppedFrames: 0
  };

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): AnimationScheduler {
    if (!AnimationScheduler.instance) {
      AnimationScheduler.instance = new AnimationScheduler();
    }
    return AnimationScheduler.instance;
  }

  /**
   * Register a component for animation updates
   */
  register(id: string, callback: AnimationCallback, priority: number = 0): void {
    // Check if animations are allowed
    if (!animationControlStore.getState().globalEnabled) {
      return;
    }

    this.components.set(id, {
      id,
      callback,
      priority,
      lastUpdate: performance.now()
    });

    animationControlStore.incrementActive();

    // Start animation loop if this is the first component
    if (this.components.size === 1) {
      this.start();
    }
  }

  /**
   * Unregister a component from animation updates
   */
  unregister(id: string): void {
    if (this.components.has(id)) {
      this.components.delete(id);
      animationControlStore.decrementActive();

      // Stop animation loop if no components remain
      if (this.components.size === 0) {
        this.stop();
      }
    }
  }

  /**
   * Update priority for a registered component
   */
  updatePriority(id: string, priority: number): void {
    const component = this.components.get(id);
    if (component) {
      component.priority = priority;
    }
  }

  /**
   * Check if a component is registered
   */
  isRegistered(id: string): boolean {
    return this.components.has(id);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performanceMonitor };
  }

  private start(): void {
    if (this.rafId !== null) return;

    this.lastFrameTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  private stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick = (currentTime: number): void => {
    // Calculate frame metrics
    const deltaTime = currentTime - this.lastFrameTime;
    this.updatePerformanceMetrics(deltaTime);

    // Sort components by priority (higher priority first)
    const sortedComponents = Array.from(this.components.values())
      .sort((a, b) => b.priority - a.priority);

    // Check if we should throttle based on performance
    const shouldThrottle = this.performanceMonitor.fps < 30;

    // Update components
    for (const component of sortedComponents) {
      try {
        // Skip low-priority components if throttling
        if (shouldThrottle && component.priority < 0) {
          continue;
        }

        // Check if this specific component can animate
        if (animationControlStore.getState().disabledComponents.has(component.id)) {
          continue;
        }

        // Calculate component-specific delta time
        const componentDelta = currentTime - component.lastUpdate;

        // Call the animation callback
        component.callback(currentTime, componentDelta);
        component.lastUpdate = currentTime;

      } catch (error) {
        console.error(`Animation error in component ${component.id}:`, error);
        // Remove failing component to prevent further errors
        this.unregister(component.id);
      }
    }

    this.lastFrameTime = currentTime;
    this.frameCount++;

    // Continue the animation loop
    this.rafId = requestAnimationFrame(this.tick);
  };

  private updatePerformanceMetrics(deltaTime: number): void {

    // Update FPS (using exponential moving average)
    const instantFps = 1000 / deltaTime;
    this.performanceMonitor.fps = this.performanceMonitor.fps * 0.9 + instantFps * 0.1;
    this.performanceMonitor.frameTime = deltaTime;

    // Track dropped frames (anything over 20ms is considered dropped for 60fps)
    if (deltaTime > 20) {
      this.performanceMonitor.droppedFrames++;
    }

    // Auto-disable animations if performance is consistently poor
    if (this.frameCount % 60 === 0) { // Check every second
      const state = animationControlStore.getState();
      if (state.performanceMode === 'auto' && this.performanceMonitor.fps < 45) { // Increased threshold from 30 to 45
        log.warn('Poor animation performance detected, consider reducing active animations');
        // Auto-disable some low-priority animations
        const sortedComponents = Array.from(this.components.values())
          .sort((a, b) => a.priority - b.priority);

        // Disable the lowest priority animations
        const toDisable = Math.ceil(sortedComponents.length * 0.3);
        for (let i = 0; i < toDisable && i < sortedComponents.length; i++) {
          animationControlStore.disableComponent(sortedComponents[i].id);
        }
      }
    }
  }

  /**
   * Force a single frame update (useful for testing)
   */
  forceUpdate(): void {
    if (this.rafId !== null) {
      this.tick(performance.now());
    }
  }

  /**
   * Reset the scheduler (clears all components)
   */
  reset(): void {
    this.stop();
    this.components.clear();
    this.frameCount = 0;
    this.performanceMonitor = {
      fps: 60,
      frameTime: 0,
      droppedFrames: 0
    };
  }
}

// Export singleton instance
export const animationScheduler = AnimationScheduler.getInstance();
