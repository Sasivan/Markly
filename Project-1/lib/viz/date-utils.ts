/**
 * Pure TypeScript timezone-aware date formatting and bucketing utilities for Markly Viz Engine.
 */

export interface ZonedDateParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  weekday: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
}

/**
 * Extracts year, month, day and weekday in target IANA timezone.
 */
export function getZonedDateParts(timestampMs: number, timeZone: string): ZonedDateParts {
  const date = new Date(timestampMs);
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "narrow",
    });
    const parts = formatter.formatToParts(date);
    let year = 1970;
    let month = 1;
    let day = 1;

    for (const p of parts) {
      if (p.type === "year") year = parseInt(p.value, 10);
      if (p.type === "month") month = parseInt(p.value, 10);
      if (p.type === "day") day = parseInt(p.value, 10);
    }

    // Determine day of week in target timezone (UTC calendar date offset)
    const utcDate = new Date(Date.UTC(year, month - 1, day));
    const weekday = utcDate.getUTCDay(); // 0 = Sun, 1 = Mon ...

    return { year, month, day, weekday };
  } catch {
    // Fallback to UTC if timezone is invalid
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    const d = date.getUTCDate();
    const w = date.getUTCDay();
    return { year: y, month: m, day: d, weekday: w };
  }
}

function pad(n: number, len = 2): string {
  return String(n).padStart(len, "0");
}

/**
 * Formats day as YYYY-MM-DD
 */
export function formatZonedDay(timestampMs: number, timeZone: string): string {
  const { year, month, day } = getZonedDateParts(timestampMs, timeZone);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * Formats month as YYYY-MM
 */
export function formatZonedMonth(timestampMs: number, timeZone: string): string {
  const { year, month } = getZonedDateParts(timestampMs, timeZone);
  return `${year}-${pad(month)}`;
}

/**
 * Formats year as YYYY
 */
export function formatZonedYear(timestampMs: number, timeZone: string): string {
  const { year } = getZonedDateParts(timestampMs, timeZone);
  return `${year}`;
}

/**
 * Calculates start of the week and formats as YYYY-Www (or week start date).
 * Respects weekStart ("monday" or "sunday") and target timezone.
 */
export function formatZonedWeek(
  timestampMs: number,
  timeZone: string,
  weekStart: "monday" | "sunday" = "monday"
): string {
  const { year, month, day, weekday } = getZonedDateParts(timestampMs, timeZone);

  // Compute days from the start of the week
  let diffDays = 0;
  if (weekStart === "monday") {
    diffDays = (weekday + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
  } else {
    diffDays = weekday; // Sun=0, Mon=1, ..., Sat=6
  }

  // Create date in UTC representing the start day of this week
  const startDate = new Date(Date.UTC(year, month - 1, day));
  startDate.setUTCDate(startDate.getUTCDate() - diffDays);

  const startYear = startDate.getUTCFullYear();
  const startMonth = startDate.getUTCMonth() + 1;
  const startDay = startDate.getUTCDate();

  // Return formatted week boundary: e.g. "2026-W46" or "2026-11-16 (W)"
  // Compute ISO-like week number
  const jan4 = new Date(Date.UTC(startYear, 0, 4));
  const dayOfYear = Math.floor((startDate.getTime() - new Date(Date.UTC(startYear, 0, 1)).getTime()) / 86400000) + 1;
  const weekNum = Math.max(1, Math.min(53, Math.ceil((dayOfYear + ((jan4.getUTCDay() + 6) % 7)) / 7)));

  return `${startYear}-W${pad(weekNum)}`;
}

/**
 * Computes recency bucket based on timestamp difference from now.
 */
export function formatRecencyBucket(
  timestampMs: number | null | undefined,
  nowMs: number
): string {
  if (!timestampMs || timestampMs <= 0) {
    return "Never opened";
  }

  const diffMs = Math.max(0, nowMs - timestampMs);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) {
    return "< 24h";
  }
  if (diffDays < 7) {
    return "Past 7 days";
  }
  if (diffDays < 30) {
    return "Past 30 days";
  }
  if (diffDays < 90) {
    return "Past 90 days";
  }
  return "90+ days dormant";
}

/**
 * Categorizes a numeric visit count into discrete buckets.
 */
export function formatVisitCountBucket(visitCount: number | null | undefined): string {
  const count = visitCount || 0;
  if (count <= 0) return "0 visits";
  if (count <= 5) return "1 - 5 visits";
  if (count <= 20) return "6 - 20 visits";
  if (count <= 50) return "21 - 50 visits";
  return "50+ visits";
}

