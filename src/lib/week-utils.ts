/**
 * Week utilities for the Meal Planner.
 * All "weekStart" values are the Monday of that week at local midnight.
 */

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const DAY_NAMES_LONG = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
] as const;

/**
 * Returns the Monday of the week containing `date`, at local midnight.
 */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const dow = (d.getDay() + 6) % 7; // local: 0=Mon, 6=Sun
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Add `weeks` weeks to a weekStart Date. Positive = forward, negative = back.
 */
export function addWeeks(weekStart: Date, weeks: number): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

/**
 * Format a weekStart as "YYYY-MM-DD" for use in API params.
 * Uses local date components so the string matches the user's calendar date.
 */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parse a "YYYY-MM-DD" string to a UTC midnight Date (for API/DB consistency).
 */
export function fromISODate(str: string): Date {
  return new Date(`${str}T00:00:00.000Z`);
}

/**
 * Format the week range for display, e.g. "Feb 17 – 23" or "Feb 28 – Mar 6"
 */
export function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const startMonth = weekStart.toLocaleDateString("en-US", { month: "short" });
  const endMonth = weekEnd.toLocaleDateString("en-US", { month: "short" });
  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();

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
  d.setDate(d.getDate() + dayOfWeek);
  return d;
}

/**
 * Format a day date for display, e.g. "Feb 17"
 */
export function formatDayDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Returns true if weekStart is the current week.
 */
export function isCurrentWeek(weekStart: Date): boolean {
  return toISODate(weekStart) === toISODate(getWeekStart());
}
