/**
 * Week utilities for the Meal Planner.
 * All "weekStart" values are the Monday of that week at midnight UTC.
 */

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const DAY_NAMES_LONG = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
] as const;

/**
 * Returns the Monday of the week containing `date`, as a UTC midnight Date.
 */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  // Convert to UTC day-of-week (0=Sun … 6=Sat), shift so 0=Mon
  const dow = (d.getUTCDay() + 6) % 7; // 0=Mon, 6=Sun
  d.setUTCDate(d.getUTCDate() - dow);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Add `weeks` weeks to a weekStart Date. Positive = forward, negative = back.
 */
export function addWeeks(weekStart: Date, weeks: number): Date {
  const d = new Date(weekStart);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d;
}

/**
 * Format a weekStart as "YYYY-MM-DD" for use in API params.
 */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Parse a "YYYY-MM-DD" string to a UTC midnight Date.
 */
export function fromISODate(str: string): Date {
  return new Date(`${str}T00:00:00.000Z`);
}

/**
 * Format the week range for display, e.g. "Feb 17 – 23" or "Feb 28 – Mar 6"
 */
export function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

  const startMonth = weekStart.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const endMonth = weekEnd.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const startDay = weekStart.getUTCDate();
  const endDay = weekEnd.getUTCDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
}

/**
 * Returns the calendar date for a given dayOfWeek (0=Mon … 6=Sun) in the week.
 */
export function getDayDate(weekStart: Date, dayOfWeek: number): Date {
  const d = new Date(weekStart);
  d.setUTCDate(d.getUTCDate() + dayOfWeek);
  return d;
}

/**
 * Format a day date for display, e.g. "Feb 17"
 */
export function formatDayDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * Returns true if weekStart is the current week.
 */
export function isCurrentWeek(weekStart: Date): boolean {
  return toISODate(weekStart) === toISODate(getWeekStart());
}
