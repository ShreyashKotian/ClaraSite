/**
 * Date-range picker for the dashboard's custom range.
 *
 * Hand-built rather than two <input type="date"> fields: the browser's own
 * picker can't be themed, so it opened as a bright panel over a dark page and
 * couldn't show a range at all — you had to pick two dates blind.
 *
 * Dates are handled as YYYY-MM-DD strings, the same shape the API takes, and
 * constructed at local noon so a timezone offset can never roll a day over.
 */

import { useEffect, useRef, useState } from "react";
import { CalendarIcon } from "./icons";
import styles from "./RangeControls.module.css";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function toIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromIso(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1, 12);
}

/** Every cell of the month grid, padded with the neighbouring months' days so
 *  the weeks line up. */
function monthGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function dayLabel(iso: string): string {
  return fromIso(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DateRangePicker({
  from,
  to,
  max,
  onChange,
}: {
  from: string;
  to: string;
  /** Latest selectable day — nobody reports on the future. */
  max: string;
  onChange: (from: string, to: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => fromIso(to || max));
  // Set once the user picks a start and is choosing the end.
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(iso: string) {
    if (pendingStart === null) {
      setPendingStart(iso);
      setHovered(null);
      return;
    }
    // Picking backwards is a reasonable thing to do — take it in either order.
    const [start, end] = [pendingStart, iso].sort();
    setPendingStart(null);
    onChange(start, end);
    setOpen(false);
  }

  // While choosing the end, shade the range under the cursor; otherwise show
  // the range that is actually selected.
  const preview = pendingStart !== null ? [pendingStart, hovered ?? pendingStart].sort() : null;
  const [rangeStart, rangeEnd] = preview ?? [from, to];

  return (
    <div className={styles.pickerWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.rangeDates}
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
      >
        <CalendarIcon size={16} />
        {from && to ? `${dayLabel(from)} – ${dayLabel(to)}` : "Pick dates"}
      </button>

      {open && (
        <div className={styles.popover} role="dialog" aria-label="Choose a date range">
          <div className={styles.popHead}>
            <button
              type="button"
              className={styles.popNav}
              onClick={() => setMonth(addMonths(month, -1))}
              aria-label="Previous month"
            >
              ‹
            </button>
            <span className={styles.popMonth}>{monthLabel(month)}</span>
            <button
              type="button"
              className={styles.popNav}
              onClick={() => setMonth(addMonths(month, 1))}
              disabled={toIso(addMonths(month, 1)) > max}
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className={styles.weekRow}>
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className={styles.dayGrid} onMouseLeave={() => setHovered(null)}>
            {monthGrid(month).map((date) => {
              const iso = toIso(date);
              const outside = date.getMonth() !== month.getMonth();
              const disabled = iso > max;
              const isEdge = iso === rangeStart || iso === rangeEnd;
              const inRange = Boolean(rangeStart && rangeEnd && iso > rangeStart && iso < rangeEnd);
              return (
                <button
                  key={iso}
                  type="button"
                  className={styles.day}
                  data-outside={outside}
                  data-edge={isEdge}
                  data-in-range={inRange}
                  disabled={disabled}
                  onClick={() => pick(iso)}
                  onMouseEnter={() => setHovered(iso)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className={styles.popFoot}>
            <span>
              {pendingStart !== null
                ? `From ${dayLabel(pendingStart)} — now pick the end`
                : "Pick a start date"}
            </span>
            {pendingStart !== null && (
              <button
                type="button"
                className={styles.popClear}
                onClick={() => setPendingStart(null)}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
