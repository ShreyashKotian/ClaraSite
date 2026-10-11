import { useRef, type KeyboardEvent, type MouseEvent } from "react";
import { PlayIcon } from "../../components/icons";
import { WAVEFORM_BARS, type ListenMode, type RecordingPlayer } from "./useRecordingPlayer";
import styles from "./AnalysisView.module.css";

const LISTEN_MODES: [ListenMode, string][] = [
  ["both", "Both"],
  ["rep", "You"],
  ["customer", "Customer"],
];

/** Seconds an arrow key moves the playhead. */
const KEYBOARD_STEP = 5;

/** Height of a bar with no sound in it, so silence still reads as a track. */
const SILENT_BAR_PCT = 8;

function clock(seconds: number): string {
  const s = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Transport for the page's recording. Rendered in more than one place; every
 *  instance drives the same audio element through the shared player state. */
export function RecordingControls({ player }: { player: RecordingPlayer }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const { duration, currentTime } = player;
  const progress = duration > 0 ? currentTime / duration : 0;

  // Flat bars until the server's measurement arrives — the track stays seekable.
  const bars = player.peaks ?? Array.from({ length: WAVEFORM_BARS }, () => 0);

  function seekToPointer(event: MouseEvent<HTMLDivElement>) {
    const track = trackRef.current;
    if (!track || !duration) return;
    const { left, width } = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - left) / width));
    player.seek(ratio * duration);
  }

  function seekByKey(event: KeyboardEvent<HTMLDivElement>) {
    if (!duration) return;
    if (event.key === "ArrowRight") {
      player.seek(Math.min(duration, currentTime + KEYBOARD_STEP));
    } else if (event.key === "ArrowLeft") {
      player.seek(Math.max(0, currentTime - KEYBOARD_STEP));
    } else {
      return;
    }
    event.preventDefault();
  }

  if (player.error) {
    return <p className={styles.playerUnavailable}>{player.error}</p>;
  }

  return (
    <div className={styles.player}>
      <button
        type="button"
        className={styles.playButton}
        onClick={player.toggle}
        disabled={!player.ready}
        aria-label={player.playing ? "Pause recording" : "Play recording"}
      >
        {player.playing ? <span className={styles.pauseGlyph} /> : <PlayIcon size={15} />}
      </button>

      <div
        ref={trackRef}
        className={styles.waveform}
        onClick={seekToPointer}
        onKeyDown={seekByKey}
        role="slider"
        tabIndex={0}
        aria-label="Seek recording"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={`${clock(currentTime)} of ${clock(duration)}`}
      >
        {bars.map((peak, i) => (
          <span
            key={i}
            className={styles.waveBar}
            data-played={i / bars.length < progress}
            style={{ height: `${SILENT_BAR_PCT + peak * (100 - SILENT_BAR_PCT)}%` }}
          />
        ))}
      </div>

      <span className={styles.playerTime}>
        {clock(currentTime)} / {duration ? clock(duration) : "--:--"}
      </span>

      <div className={styles.listenModes} role="group" aria-label="Listen to">
        {LISTEN_MODES.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={player.mode === value ? styles.listenModeOn : styles.listenMode}
            onClick={() => player.setMode(value)}
            aria-pressed={player.mode === value}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
