/**
 * Generic datetime utilities with no external dependencies
 * @module @yakkl/core/utils/datetime
 */

export type DateTimestamp = string | number | Date | undefined;

export interface FormatTimestampOptions {
  placeholder?: string;
  locale?: string;
  options?: Intl.DateTimeFormatOptions;
}

/**
 * Get current date as ISO string
 * @returns ISO formatted date string
 */
export function dateString(): string {
  return new Date().toISOString();
}

/**
 * Get current time as milliseconds since epoch
 * @returns Current timestamp in milliseconds
 */
export function getTime(): number {
  return new Date().getTime();
}

/**
 * Format a Date object to locale string
 * @param date Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  return date.toLocaleString();
}

/**
 * Format a timestamp with flexible options
 * @param timestamp The timestamp to format (string, number, Date, or undefined)
 * @param options Formatting options including placeholder, locale, and date format options
 * @returns Formatted timestamp or placeholder if invalid
 */
export function formatTimestamp(
  timestamp: DateTimestamp,
  {
    placeholder = '------',
    locale = 'en-US',
    options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  }: FormatTimestampOptions = {}
): string {
  try {
    if (timestamp === undefined || (typeof timestamp === 'number' && Number.isNaN(timestamp))) {
      return placeholder;
    }

    let date: Date;

    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return placeholder;
      }
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return placeholder;
    }

    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch (e) {
    console.error('Error formatting timestamp:', e);
    return placeholder;
  }
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 * @param date Date to compare to now
 * @param locale Locale for formatting
 * @returns Relative time string
 */
export function getRelativeTime(date: Date | string | number, locale = 'en-US'): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const d = typeof date === 'object' ? date : new Date(date);
  const diff = (d.getTime() - Date.now()) / 1000; // difference in seconds
  
  const units: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
    { unit: 'year', seconds: 31536000 },
    { unit: 'month', seconds: 2592000 },
    { unit: 'week', seconds: 604800 },
    { unit: 'day', seconds: 86400 },
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 },
    { unit: 'second', seconds: 1 }
  ];
  
  for (const { unit, seconds } of units) {
    const interval = Math.floor(Math.abs(diff) / seconds);
    if (interval >= 1) {
      return rtf.format(diff < 0 ? -interval : interval, unit);
    }
  }
  
  return rtf.format(0, 'second');
}

/**
 * Check if a date is today
 * @param date Date to check
 * @returns True if date is today
 */
export function isToday(date: Date | string | number): boolean {
  const d = typeof date === 'object' ? date : new Date(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

/**
 * Check if a date is yesterday
 * @param date Date to check
 * @returns True if date is yesterday
 */
export function isYesterday(date: Date | string | number): boolean {
  const d = typeof date === 'object' ? date : new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.toDateString() === yesterday.toDateString();
}

/**
 * Add days to a date
 * @param date Starting date
 * @param days Number of days to add (can be negative)
 * @returns New date with days added
 */
export function addDays(date: Date | string | number, days: number): Date {
  const d = typeof date === 'object' ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Get start of day for a given date
 * @param date Date to get start of day for
 * @returns Date at 00:00:00.000
 */
export function startOfDay(date: Date | string | number): Date {
  const d = typeof date === 'object' ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day for a given date
 * @param date Date to get end of day for
 * @returns Date at 23:59:59.999
 */
export function endOfDay(date: Date | string | number): Date {
  const d = typeof date === 'object' ? new Date(date) : new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}