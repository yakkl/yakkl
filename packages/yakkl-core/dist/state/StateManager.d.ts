/**
 * State Manager
 * Central manager for all state operations
 */
import type { IStateManager, IReadableState, IWritableState, IDerivedState, IStateStore, StateOptions, IStatePlugin } from '../interfaces/state.interface';
/**
 * State manager implementation
 */
export declare class StateManager implements IStateManager {
    private states;
    private plugins;
    private stateCounter;
    constructor(plugins?: IStatePlugin[]);
    /**
     * Create writable state
     */
    writable<T>(initial: T, options?: StateOptions<T>): IWritableState<T>;
    /**
     * Create readable state
     */
    readable<T>(initial: T, options?: StateOptions<T>): IReadableState<T>;
    /**
     * Create derived state
     */
    derived<T>(dependencies: IReadableState | IReadableState[], fn: (...values: any[]) => T, initial?: T): IDerivedState<T>;
    /**
     * Create state store
     */
    store<T extends Record<string, any>>(initial: T, options?: StateOptions<T>): IStateStore<T>;
    /**
     * Get all states
     */
    getAllStates(): Map<string, IReadableState>;
    /**
     * Clear all states
     */
    clearAll(): void;
    /**
     * Register a plugin
     */
    registerPlugin(plugin: IStatePlugin): void;
    /**
     * Unregister a plugin
     */
    unregisterPlugin(name: string): void;
    /**
     * Get plugin by name
     */
    getPlugin(name: string): IStatePlugin | undefined;
}
/**
 * Get or create global state manager
 */
export declare function getStateManager(): StateManager;
/**
 * Reset global state manager
 */
export declare function resetStateManager(): void;
/**
 * Create a new state manager instance
 */
export declare function createStateManager(plugins?: IStatePlugin[]): StateManager;
//# sourceMappingURL=StateManager.d.ts.map