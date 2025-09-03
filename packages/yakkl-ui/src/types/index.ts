/**
 * UI Component Types
 */

export interface ComponentProps {
  className?: string;
  children?: any;
}

export interface ThemedComponent extends ComponentProps {
  theme?: 'light' | 'dark' | 'auto';
}

export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type Variant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'link' | 'error' | 'warning' | 'success' | 'info';
export type Position = 'top' | 'right' | 'bottom' | 'left';
export type Align = 'start' | 'center' | 'end';

export interface ToastOptions {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  position?: Position;
}