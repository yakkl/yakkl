/**
 * Reactive state utilities
 */

import type { Ref } from '../types';

const RAW_KEY = Symbol('__raw');
const REACTIVE_KEY = Symbol('__reactive');
const REF_KEY = Symbol('__ref');

/**
 * Check if a value is a ref
 */
export function isRef<T = any>(value: any): value is Ref<T> {
  return !!(value && value[REF_KEY] === true);
}

/**
 * Check if an object is reactive
 */
export function isReactive(value: any): boolean {
  return !!(value && value[REACTIVE_KEY] === true);
}

/**
 * Get the raw, non-reactive version of an object
 */
export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as any)[RAW_KEY];
  return raw ? toRaw(raw) : observed;
}

/**
 * Mark an object so it will never be made reactive
 */
export function markRaw<T extends object>(value: T): T {
  Object.defineProperty(value, REACTIVE_KEY, {
    value: false,
    writable: false,
    enumerable: false,
    configurable: false,
  });
  return value;
}

/**
 * Create a ref (reactive reference) to a value
 */
export function ref<T>(value: T): Ref<T> {
  const wrapper = {
    [REF_KEY]: true,
    value,
  };
  
  return new Proxy(wrapper, {
    get(target, prop) {
      if (prop === 'value') {
        return target.value;
      }
      return Reflect.get(target, prop);
    },
    set(target, prop, newValue) {
      if (prop === 'value') {
        target.value = newValue;
        return true;
      }
      return Reflect.set(target, prop, newValue);
    },
  }) as Ref<T>;
}

/**
 * Convert a ref to its raw value
 */
export function unref<T>(maybeRef: T | Ref<T>): T {
  return isRef(maybeRef) ? maybeRef.value : maybeRef;
}