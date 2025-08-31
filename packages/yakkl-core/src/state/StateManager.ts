/**
 * State Manager
 * Central manager for all state operations
 */

import type {
  IStateManager,
  IReadableState,
  IWritableState,
  IDerivedState,
  IStateStore,
  StateOptions,
  IStatePlugin
} from '../interfaces/state.interface';
import { WritableState, ReadableState, DerivedState } from './State';
import { StateStore } from './StateStore';

/**
 * State manager implementation
 */
export class StateManager implements IStateManager {
  private states: Map<string, IReadableState> = new Map();
  private plugins: Map<string, IStatePlugin> = new Map();
  private stateCounter = 0;

  constructor(plugins?: IStatePlugin[]) {
    // Register plugins
    if (plugins) {
      plugins.forEach(plugin => this.registerPlugin(plugin));
    }
  }

  /**
   * Create writable state
   */
  writable<T>(initial: T, options?: StateOptions<T>): IWritableState<T> {
    const state = new WritableState(initial, options);
    
    // Apply plugin enhancements
    let enhancedState: IWritableState<T> = state;
    this.plugins.forEach(plugin => {
      if (plugin.enhance) {
        enhancedState = plugin.enhance(enhancedState) as IWritableState<T>;
      }
    });

    // Track state
    const stateId = `state_${++this.stateCounter}`;
    this.states.set(stateId, enhancedState);

    return enhancedState;
  }

  /**
   * Create readable state
   */
  readable<T>(initial: T, options?: StateOptions<T>): IReadableState<T> {
    const state = new ReadableState(initial, options);
    
    // Track state
    const stateId = `readonly_${++this.stateCounter}`;
    this.states.set(stateId, state);

    return state;
  }

  /**
   * Create derived state
   */
  derived<T>(
    dependencies: IReadableState | IReadableState[],
    fn: (...values: any[]) => T,
    initial?: T
  ): IDerivedState<T> {
    const state = new DerivedState(dependencies, fn, initial);
    
    // Track state
    const stateId = `derived_${++this.stateCounter}`;
    this.states.set(stateId, state);

    return state;
  }

  /**
   * Create state store
   */
  store<T extends Record<string, any>>(
    initial: T,
    options?: StateOptions<T>
  ): IStateStore<T> {
    return new StateStore(initial, options);
  }

  /**
   * Get all states
   */
  getAllStates(): Map<string, IReadableState> {
    return new Map(this.states);
  }

  /**
   * Clear all states
   */
  clearAll(): void {
    // Destroy all states
    this.states.forEach(state => {
      if ('destroy' in state) {
        (state as any).destroy();
      }
    });
    
    this.states.clear();
    
    // Destroy plugins
    this.plugins.forEach(plugin => {
      if (plugin.destroy) {
        plugin.destroy();
      }
    });
  }

  /**
   * Register a plugin
   */
  registerPlugin(plugin: IStatePlugin): void {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin "${plugin.name}" is already registered`);
      return;
    }

    this.plugins.set(plugin.name, plugin);
    plugin.init(this);
  }

  /**
   * Unregister a plugin
   */
  unregisterPlugin(name: string): void {
    const plugin = this.plugins.get(name);
    if (plugin) {
      if (plugin.destroy) {
        plugin.destroy();
      }
      this.plugins.delete(name);
    }
  }

  /**
   * Get plugin by name
   */
  getPlugin(name: string): IStatePlugin | undefined {
    return this.plugins.get(name);
  }
}

/**
 * Global state manager instance
 */
let globalStateManager: StateManager | null = null;

/**
 * Get or create global state manager
 */
export function getStateManager(): StateManager {
  if (!globalStateManager) {
    globalStateManager = new StateManager();
  }
  return globalStateManager;
}

/**
 * Reset global state manager
 */
export function resetStateManager(): void {
  if (globalStateManager) {
    globalStateManager.clearAll();
    globalStateManager = null;
  }
}

/**
 * Create a new state manager instance
 */
export function createStateManager(plugins?: IStatePlugin[]): StateManager {
  return new StateManager(plugins);
}