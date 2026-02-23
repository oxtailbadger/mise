import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getWeekStart,
  addWeeks,
  toISODate,
  fromISODate,
  formatWeekRange,
  getDayDate,
  formatDayDate,
  isCurrentWeek,
} from "@/lib/week-utils";

// ── getWeekStart ──────────────────────────────────────────────────────────────

describe("getWeekStart", () => {
  it("returns the Monday of the current week for a Monday input", () => {
    const monday = new Date("2026-02-23T12:00:00Z"); // a Monday
    const ws = getWeekStart(monday);
    expect(toISODate(ws)).toBe("2026-02-23");
  });

  it("returns the preceding Monday for a Wednesday input", () => {
    const wednesday = new Date("2026-02-25T12:00:00Z");
    const ws = getWeekStart(wednesday);
    expect(toISODate(ws)).toBe("2026-02-23");
  });

  it("returns the preceding Monday for a Sunday input", () => {
    const sunday = new Date("2026-03-01T12:00:00Z"); // Sunday
    const ws = getWeekStart(sunday);
    expect(toISODate(ws)).toBe("2026-02-23");
  });

  it("sets time to midnight UTC", () => {
    const date = new Date("2026-02-26T18:30:00Z");
    const ws = getWeekStart(date);
    expect(ws.getUTCHours()).toBe(0);
    expect(ws.getUTCMinutes()).toBe(0);
    expect(ws.getUTCSeconds()).toBe(0);
    expect(ws.getUTCMilliseconds()).toBe(0);
  });

  it("handles Saturday correctly", () => {
    const saturday = new Date("2026-02-28T00:00:00Z");
    const ws = getWeekStart(saturday);
    expect(toISODate(ws)).toBe("2026-02-23");
  });
});

// ── addWeeks ──────────────────────────────────────────────────────────────────

describe("addWeeks", () => {
  const base = new Date("2026-02-23T00:00:00Z"); // Monday

  it("adds a positive number of weeks", () => {
    expect(toISODate(addWeeks(base, 1))).toBe("2026-03-02");
  });

  it("adds multiple weeks", () => {
    expect(toISODate(addWeeks(base, 4))).toBe("2026-03-23");
  });

  it("subtracts weeks with a negative value", () => {
    expect(toISODate(addWeeks(base, -1))).toBe("2026-02-16");
  });

  it("does not mutate the original date", () => {
    const original = new Date("2026-02-23T00:00:00Z");
    addWeeks(original, 2);
    expect(toISODate(original)).toBe("2026-02-23");
  });

  it("handles zero correctly", () => {
    expect(toISODate(addWeeks(base, 0))).toBe("2026-02-23");
  });
});

// ── toISODate / fromISODate ───────────────────────────────────────────────────

describe("toISODate", () => {
  it("formats a UTC midnight date as YYYY-MM-DD", () => {
    expect(toISODate(new Date("2026-02-23T00:00:00Z"))).toBe("2026-02-23");
  });

  it("uses UTC — not local time", () => {
    // A date that is still Feb 22 UTC even though local might differ
    const d = new Date("2026-02-23T00:00:00Z");
    expect(toISODate(d)).toBe("2026-02-23");
  });
});

describe("fromISODate", () => {
  it("parses a YYYY-MM-DD string to UTC midnight", () => {
    const d = fromISODate("2026-03-15");
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(2); // 0-indexed → March
    expect(d.getUTCDate()).toBe(15);
    expect(d.getUTCHours()).toBe(0);
  });

  it("roundtrips with toISODate", () => {
    const iso = "2026-12-07";
    expect(toISODate(fromISODate(iso))).toBe(iso);
  });
});

// ── formatWeekRange ───────────────────────────────────────────────────────────

describe("formatWeekRange", () => {
  it("shows single month when week is within one month", () => {
    const ws = new Date("2026-02-23T00:00:00Z"); // Feb 23–Mar 1
    // Spans Feb to Mar, so expect cross-month format
    const result = formatWeekRange(ws);
    expect(result).toContain("Feb");
    expect(result).toContain("23");
  });

  it("shows both months when week spans a month boundary", () => {
    const ws = new Date("2026-02-23T00:00:00Z"); // Feb 23 – Mar 1
    const result = formatWeekRange(ws);
    expect(result).toContain("Feb");
    expect(result).toContain("Mar");
  });

  it("stays within a single month when the week doesn't cross a boundary", () => {
    const ws = new Date("2026-03-02T00:00:00Z"); // Mar 2–8
    const result = formatWeekRange(ws);
    expect(result).toBe("Mar 2–8");
  });
});

// ── getDayDate ────────────────────────────────────────────────────────────────

describe("getDayDate", () => {
  const ws = new Date("2026-02-23T00:00:00Z"); // Monday

  it("returns Monday for dayOfWeek 0", () => {
    expect(toISODate(getDayDate(ws, 0))).toBe("2026-02-23");
  });

  it("returns Tuesday for dayOfWeek 1", () => {
    expect(toISODate(getDayDate(ws, 1))).toBe("2026-02-24");
  });

  it("returns Sunday for dayOfWeek 6", () => {
    expect(toISODate(getDayDate(ws, 6))).toBe("2026-03-01");
  });
});

// ── isCurrentWeek ─────────────────────────────────────────────────────────────

describe("isCurrentWeek", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true when weekStart matches the current week's Monday", () => {
    // Freeze time to a known Wednesday
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-25T10:00:00Z")); // Wednesday Feb 25
    const ws = new Date("2026-02-23T00:00:00Z"); // Monday of same week
    expect(isCurrentWeek(ws)).toBe(true);
  });

  it("returns false for a past week", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-25T10:00:00Z"));
    const pastWeek = new Date("2026-02-16T00:00:00Z");
    expect(isCurrentWeek(pastWeek)).toBe(false);
  });

  it("returns false for a future week", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-25T10:00:00Z"));
    const futureWeek = new Date("2026-03-02T00:00:00Z");
    expect(isCurrentWeek(futureWeek)).toBe(false);
  });
});
