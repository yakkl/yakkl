import type { Component } from 'svelte';

// For compatibility with both old and new component types
export type ComponentType = Component<any> | any;

export type IconType = 
  | string 
  | ComponentType
  | { svg: string }
  | { emoji: string }
  | { component: ComponentType };

export type MenuItemType = 
  | 'item' 
  | 'header' 
  | 'divider'
  | 'custom';

export interface MenuItemBase {
  id?: string;
  type: MenuItemType;
  className?: string;
  disabled?: boolean;
  visible?: boolean;
}

export interface MenuItemStandard extends MenuItemBase {
  type: 'item';
  label: string;
  icon?: IconType;
  action?: () => void | Promise<void>;
  href?: string;
  shortcut?: string;
  badge?: string | number;
  badgeClass?: string;
  children?: MenuItem[];
  closeOnClick?: boolean;
  preventClose?: boolean;
}

export interface MenuItemHeader extends MenuItemBase {
  type: 'header';
  content?: ComponentType | string;
  props?: Record<string, unknown>;
  collapsible?: boolean;
  collapsed?: boolean;
  children?: MenuItem[];
}

export interface MenuItemDivider extends MenuItemBase {
  type: 'divider';
}

export interface MenuItemCustom extends MenuItemBase {
  type: 'custom';
  component: ComponentType;
  props?: Record<string, unknown>;
}

export type MenuItem = 
  | MenuItemStandard 
  | MenuItemHeader 
  | MenuItemDivider 
  | MenuItemCustom;

export interface MenuContext {
  depth: number;
  onClose: () => void;
  closeAll: () => void;
  registerSubmenu: (id: string, closeFunc: () => void) => void;
  unregisterSubmenu: (id: string) => void;
  closeSubmenus: (exceptId?: string) => void;
}

export interface MenuConfig {
  position?: 'left' | 'right' | 'top' | 'bottom' | 'auto';
  hoverDelay?: number;
  leaveDelay?: number;
  maxDepth?: number;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  closeOnItemClick?: boolean;
}

export interface MenuPosition {
  x: number;
  y: number;
  direction: 'left' | 'right' | 'top' | 'bottom';
  maxHeight?: number;
}

export interface ViewportBounds {
  width: number;
  height: number;
  scrollX: number;
  scrollY: number;
}

export interface MenuDimensions {
  width: number;
  height: number;
}

export interface AnchorRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}