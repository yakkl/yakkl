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
export declare function dateString(): string;
/**
 * Get current time as milliseconds since epoch
 * @returns Current timestamp in milliseconds
 */
export declare function getTime(): number;
/**
 * Format a Date object to locale string
 * @param date Date to format
 * @returns Formatted date string
 */
export declare function formatDate(date: Date): string;
/**
 * Format a timestamp with flexible options
 * @param timestamp The timestamp to format (string, number, Date, or undefined)
 * @param options Formatting options including placeholder, locale, and date format options
 * @returns Formatted timestamp or placeholder if invalid
 */
export declare function formatTimestamp(timestamp: DateTimestamp, { placeholder, locale, options }?: FormatTimestampOptions): string;
/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 * @param date Date to compare to now
 * @param locale Locale for formatting
 * @returns Relative time string
 */
export declare function getRelativeTime(date: Date | string | number, locale?: string): string;
/**
 * Check if a date is today
 * @param date Date to check
 * @returns True if date is today
 */
export declare function isToday(date: Date | string | number): boolean;
/**
 * Check if a date is yesterday
 * @param date Date to check
 * @returns True if date is yesterday
 */
export declare function isYesterday(date: Date | string | number): boolean;
/**
 * Add days to a date
 * @param date Starting date
 * @param days Number of days to add (can be negative)
 * @returns New date with days added
 */
export declare function addDays(date: Date | string | number, days: number): Date;
/**
 * Get start of day for a given date
 * @param date Date to get start of day for
 * @returns Date at 00:00:00.000
 */
export declare function startOfDay(date: Date | string | number): Date;
/**
 * Get end of day for a given date
 * @param date Date to get end of day for
 * @returns Date at 23:59:59.999
 */
export declare function endOfDay(date: Date | string | number): Date;
//# sourceMappingURL=datetime.d.ts.map