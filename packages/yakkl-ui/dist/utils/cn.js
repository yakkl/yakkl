/**
 * Class name utility
 * Combines clsx and tailwind-merge for optimal class handling
 */
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
/**
 * Combine and merge Tailwind CSS classes
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
