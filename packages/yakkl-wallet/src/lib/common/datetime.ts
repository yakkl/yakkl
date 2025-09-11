/**
 * Re-export datetime utilities from @yakkl/core
 * This file is maintained for backward compatibility
 */

export {
  dateString,
  getTime,
  formatDate,
  formatTimestamp,
  getRelativeTime,
  isToday,
  isYesterday,
  addDays,
  startOfDay,
  endOfDay,
  type DateTimestamp as Timestamp,
  type FormatTimestampOptions
} from '@yakkl/core';

// Example usage
// console.log(formatTimestamp('2023-07-12T14:30:00Z')); // Default formatting
// console.log(formatTimestamp(1689160200000)); // Default formatting with timestamp
// console.log(formatTimestamp(undefined)); // Default placeholder
// console.log(formatTimestamp('invalid date')); // Default placeholder with invalid date
// console.log(formatTimestamp(new Date(), { placeholder: '', locale: 'en-GB', options: { year: 'numeric', month: 'long', day: 'numeric' } })); // Custom formatting
