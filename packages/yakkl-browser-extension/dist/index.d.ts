/**
 * YAKKL Browser Extension Utilities
 *
 * Provides abstractions and utilities for building browser extensions
 * with support for Manifest V3 and cross-browser compatibility
 */
export * from './messaging';
export * from './storage';
export * from './manifest';
export * from './context';
export type { Runtime, Storage, Tabs, Windows } from 'webextension-polyfill';
/**
 * Browser API detection
 */
export declare function getBrowserAPI(): any;
/**
 * Check if running in extension context
 */
export declare function isExtensionContext(): boolean;
/**
 * Get extension ID
 */
export declare function getExtensionId(): string | null;
/**
 * Get extension version
 */
export declare function getExtensionVersion(): string | null;
