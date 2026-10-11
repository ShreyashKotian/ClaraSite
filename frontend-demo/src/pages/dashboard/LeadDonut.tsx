import { useState } from "react";
import type { LeadSlice } from "./metrics";
import styles from "./Dashboard.module.css";

/** Names listed in full before the tooltip starts counting the rest. */
const NAMES_SHOWN = 5;

/**
 * The outcome mix as a ring, with the share of strong leads in the middle.
 *
 * Drawn with dash offsets rather than arc paths: each slice is a segment of the
 * same circle, so they can never leave a seam between them. Hovering a segment
 * names the leads inside it; choosing one asks the page to show just those
 * calls, so the ring is a way into the list rather than a picture of it.
 */
export function LeadDonut({
  slices,
  total,
  onSelect,
  size = 168,
}: {
  slices: LeadSlice[];
  total: number;
  onSelect?: (slice: LeadSlice) => void;
  size?: number;
}) {
  const [hovered, setHovered] = useState<LeadSlice["id"] | null>(null);
  const stroke = 26;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strongPct = total > 0 ? Math.round(((slices[0]?.count ?? 0) / total) * 100) : 0;

  const drawn = slices.filter((slice) => slice.count > 0 && total > 0);
  // Each segment starts where the previous one ended, so the offsets have to be
  // accumulated in order rather than derived from the slice alone.
  let travelled = 0;
  const placed = drawn.map((slice) => {
    const length = (slice.count / total) * circumference;
    const start = travelled;
    travelled += length;
    return { slice, length, offset: -start };
  });

  const active = placed.find((item) => item.slice.id === hovered);

  return (
    <div className={styles.donut} style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={stroke}
        />
        {placed.map(({ slice, length, offset }) => (
          <circle
            key={slice.id}
            className={styles.donutSlice}
            data-dim={hovered !== null && hovered !== slice.id}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={slice.color}
            strokeWidth={stroke}
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            onMouseEnter={() => setHovered(slice.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onSelect?.(slice)}
          />
        ))}
      </svg>

      <div className={styles.donutCentre}>{strongPct}%</div>

      {active && <DonutTooltip slice={active.slice} total={total} />}
    </div>
  );
}

/**
 * Sits above the ring, aligned to its left edge — the workspace clips
 * horizontally, so a tooltip that chased each segment's angle would run off
 * the page on the left-hand slices. Pointer events stay off it: the mouse is
 * still over the segment underneath, and stealing that would flicker the hover.
 */
function DonutTooltip({ slice, total }: { slice: LeadSlice; total: number }) {
  const shown = slice.leads.slice(0, NAMES_SHOWN);
  // Counted against the names there are, not the calls: a call saved without a
  // caller has no name to list, and "+8 more" promised eight of them.
  const rest = slice.leads.length - shown.length;

  return (
    <div className={styles.donutTip}>
      <span className={styles.donutTipHead}>
        <span className={styles.legendDot} style={{ background: slice.color }} />
        {slice.label}
      </span>
      <span className={styles.donutTipCount}>
        {slice.count} of {total} ({slice.pct}%)
      </span>
      {shown.length > 0 && (
        <span className={styles.donutTipNames}>
          {shown.join(" · ")}
          {rest > 0 && ` · +${rest} more`}
        </span>
      )}
      <span className={styles.donutTipHint}>Click to show these calls</span>
    </div>
  );
}
