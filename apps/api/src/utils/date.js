/**
 * Calculates the next billing date given a start date and billing interval.
 * Supported intervals: DAILY, WEEKLY, MONTHLY, YEARLY.
 * Correctly preserves month-end boundaries and leap year handling.
 */
export function calculateNextBillingDate(fromDate, interval) {
  const date = new Date(fromDate);
  const normalizedInterval = (interval || 'MONTHLY').toUpperCase();

  switch (normalizedInterval) {
    case 'DAILY':
      date.setDate(date.getDate() + 1);
      break;

    case 'WEEKLY':
      date.setDate(date.getDate() + 7);
      break;

    case 'MONTHLY': {
      const currentDay = date.getDate();
      date.setMonth(date.getMonth() + 1);
      // Handle month overflow (e.g. Jan 31 -> Feb 28/29)
      if (date.getDate() < currentDay) {
        date.setDate(0); // Move to last day of previous month
      }
      break;
    }

    case 'YEARLY': {
      const isLeapDay = date.getMonth() === 1 && date.getDate() === 29;
      date.setFullYear(date.getFullYear() + 1);
      if (isLeapDay && date.getMonth() !== 1) {
        // Feb 29 in non-leap year becomes Feb 28
        date.setMonth(1, 28);
      }
      break;
    }

    default:
      date.setMonth(date.getMonth() + 1);
  }

  return date;
}

/**
 * Returns formatted ISO date string for billing periods
 */
export function formatBillingPeriod(startDate, endDate) {
  return `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`;
}
