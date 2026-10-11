/**
 * Date-range selection shared by the Dashboard and Analytics pages.
 *
 * The backend takes one string: "7d" / "30d" / "90d" for the presets, or
 * "custom:2026-01-01:2026-01-31" for a hand-picked span (both days included).
 */

type RangePreset = "7d" | "30d" | "90d";
export type RangeMode = RangePreset | "custom";

export const RANGE_PRESETS: { id: RangePreset; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
];

/** Today as YYYY-MM-DD, for capping the date inputs so nobody picks the future. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** YYYY-MM-DD for N days ago — used to prefill a sensible custom range. */
export function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

/**
 * The value to send to the API. A custom range is only usable once both dates
 * are filled in and in the right order, so until then we keep showing the
 * previous preset's data rather than requesting something nonsensical.
 */
export function buildRangeKey(mode: RangeMode, from: string, to: string): string | null {
  if (mode !== "custom") return mode;
  if (!from || !to || from > to) return null;
  return `custom:${from}:${to}`;
}

/**
 * "1 Aug – 6 Aug 2026" for the dates the server actually charted — real dates
 * rather than the name of the preset that produced them, so the caption can
 * never disagree with what's plotted.
 *
 * `rangeEnd` is exclusive (the instant the window closes), so the last day
 * shown is the one just before it — otherwise a range ending at midnight
 * would appear to include the following day.
 */
export function formatServerRange(rangeStart?: string, rangeEnd?: string): string {
  if (!rangeStart || !rangeEnd) return "";
  const start = new Date(rangeStart);
  const end = new Date(rangeEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";

  const lastDay = new Date(end.getTime() - 1);
  const sameYear = start.getFullYear() === lastDay.getFullYear();
  const startText = start.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const endText = lastDay.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return startText === endText ? endText : `${startText} – ${endText}`;
}
