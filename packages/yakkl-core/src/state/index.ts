/**
 * State Management Module Exports
 */

// Observable patterns
export { 
  Observable, 
  ComputedObservable, 
  BatchedObservable, 
  HistoryObservable 
} from './Observable';

// State implementations
export { 
  State,
  ReadableState,
  WritableState,
  DerivedState,
  writable,
  readable,
  derived,
  get
} from './State';

// State store
export { 
  StateStore,
  createStore,
  combineStores
} from './StateStore';

// State persistence
export { 
  StatePersistence,
  PersistedState,
  persisted,
  sessionPersisted,
  localPersisted
} from './StatePersistence';

// State synchronization
export { 
  BroadcastStateSync,
  StorageStateSync,
  SynchronizedState,
  createStateSync,
  synchronized
} from './StateSync';

// State manager
export { 
  StateManager,
  getStateManager,
  resetStateManager,
  createStateManager
} from './StateManager';

// Re-export types from interfaces
export type {
  StateValue,
  StateUpdater,
  StateSetter,
  StateSubscriber,
  StateUnsubscriber,
  StateOptions,
  IState,
  IReadableState,
  IWritableState,
  IDerivedState,
  IStateStore,
  IStateManager,
  IStatePersistence,
  IStateSync,
  IStateMiddleware,
  IStateHistory,
  StateSelector,
  IStateAction,
  StateReducer,
  StateEnhancer,
  IStatePlugin
} from '../interfaces/state.interface';