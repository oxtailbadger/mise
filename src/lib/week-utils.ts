/**
 * Week utilities for the Meal Planner.
 * All "weekStart" Date objects are UTC midnight on the Monday of that week.
 * Local time is used only to determine which calendar day "today" falls on.
 */

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const DAY_NAMES_LONG = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
] as const;

/**
 * Returns UTC midnight on the Monday of the week containing `date`.
 * Uses local time to determine the correct calendar day (so Sunday evening
 * local time still belongs to the current week, not the next).
 */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const dow = (d.getDay() + 6) % 7; // local: 0=Mon, 6=Sun
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0); // local midnight — used only to read local date parts
  // Return UTC midnight of the local Monday's calendar date
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/**
 * Add `weeks` weeks to a weekStart Date. Uses UTC arithmetic.
 * Positive = forward, negative = back.
 */
export function addWeeks(weekStart: Date, weeks: number): Date {
  const d = new Date(weekStart);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d;
}

/**
 * Format a weekStart as "YYYY-MM-DD" for use in API params and state.
 * Uses UTC since all weekStart Dates are UTC midnight.
 */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Parse a "YYYY-MM-DD" string to a UTC midnight Date (for API/DB consistency).
 */
export function fromISODate(str: string): Date {
  return new Date(`${str}T00:00:00.000Z`);
}

/**
 * Format the week range for display, e.g. "Feb 17–23" or "Feb 28 – Mar 6".
 * Uses UTC to avoid timezone shifts on UTC midnight dates.
 */
export function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

  const startMonth = weekStart.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const endMonth   = weekEnd.toLocaleDateString("en-US",   { month: "short", timeZone: "UTC" });
  const startDay   = weekStart.getUTCDate();
  const endDay     = weekEnd.getUTCDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
}

/**
 * Returns the UTC midnight Date for a given dayOfWeek (0=Mon … 6=Sun) in the week.
 */
export function getDayDate(weekStart: Date, dayOfWeek: number): Date {
  const d = new Date(weekStart);
  d.setUTCDate(d.getUTCDate() + dayOfWeek);
  return d;
}

/**
 * Format a day date for display, e.g. "Feb 17".
 * Uses UTC to avoid timezone shifts on UTC midnight dates.
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
