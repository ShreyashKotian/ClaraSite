/**
 * The date-range control shared by the Dashboard and the Analytics page:
 * preset tabs, and either a themed picker (on Custom) or the exact dates the
 * server charted.
 *
 * Both pages ask the same question of the same endpoint, so they ask it with
 * the same control rather than each growing its own.
 */

import { RANGE_PRESETS, todayIso, type RangeMode } from "../dateRange";
import { DateRangePicker } from "./DateRangePicker";
import { CalendarIcon } from "./icons";
import styles from "./RangeControls.module.css";

export function RangeControls({
  mode,
  onModeChange,
  from,
  to,
  onCustomChange,
  /** The window the server actually charted, shown when not picking dates. */
  chartedDates,
}: {
  mode: RangeMode;
  onModeChange: (mode: RangeMode) => void;
  from: string;
  to: string;
  onCustomChange: (from: string, to: string) => void;
  chartedDates: string;
}) {
  return (
    <div className={styles.rangeSide}>
      <div className={styles.rangeTabs}>
        {RANGE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={mode === preset.id ? styles.rangeTabOn : styles.rangeTab}
            onClick={() => onModeChange(preset.id)}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          className={mode === "custom" ? styles.rangeTabOn : styles.rangeTab}
          onClick={() => onModeChange("custom")}
        >
          Custom
        </button>
      </div>
      {mode === "custom" ? (
        <DateRangePicker from={from} to={to} max={todayIso()} onChange={onCustomChange} />
      ) : (
        <div className={styles.rangeDates}>
          <CalendarIcon size={16} />
          {chartedDates || "—"}
        </div>
      )}
    </div>
  );
}
