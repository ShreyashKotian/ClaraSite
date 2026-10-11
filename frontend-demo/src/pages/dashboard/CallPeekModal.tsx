/**
 * A quick look at one call without leaving the dashboard: the headline facts,
 * the recording, and what the customer actually said on both sides of the
 * ledger. The full report is a click away.
 *
 * Everything shown comes from the row the dashboard already has, so opening
 * this costs no extra request — only the audio is fetched, and only if the
 * call has any.
 */

import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  formatDuration,
  formatTimestamp,
  type AnalyticsCallRow,
} from "../../api/conversations";
import { RecordingControls } from "../callReview/RecordingControls";
import { useRecordingPlayer } from "../callReview/useRecordingPlayer";
import { OUTCOME_LABELS } from "../../outcomes";
import { ArrowRightIcon } from "../../components/icons";
import styles from "./Dashboard.module.css";

export function CallPeekModal({
  call,
  autoPlay,
  onClose,
}: {
  call: AnalyticsCallRow;
  /** True when the row's play button opened this, so it starts playing. */
  autoPlay: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const started = useRef(false);
  const player = useRecordingPlayer(call.id, call.has_audio);

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Start once the token has arrived — the click that opened this counts as
  // the gesture the browser needs before it will play anything.
  useEffect(() => {
    if (!autoPlay || started.current || !player.ready) return;
    started.current = true;
    player.toggle();
  }, [autoPlay, player]);

  return (
    <div className={styles.modalBackdrop} onMouseDown={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Call overview"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHead}>
          <div>
            <h2 className={styles.modalTitle}>{call.caller_name || "Unnamed customer"}</h2>
            <p className={styles.modalMeta}>
              {formatTimestamp(call.started_at)} · {formatDuration(call.duration_sec)} ·{" "}
              {call.rep_label || "—"}
            </p>
          </div>
          <button
            type="button"
            ref={closeRef}
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className={styles.modalStats}>
          <Stat label="Result">
            <span className={styles.outcomePill} data-outcome={call.outcome}>
              {OUTCOME_LABELS[call.outcome]}
            </span>
          </Stat>
          <Stat label="Interest">
            {call.interest_score === null ? "Not reviewed" : `${call.interest_score}/100`}
          </Stat>
          <Stat label="Close chance">
            {call.conversion_pct === null ? "—" : `${call.conversion_pct}%`}
          </Stat>
          <Stat label="Questions asked">{call.rep_questions}</Stat>
        </div>

        {call.has_audio ? (
          <>
            <audio {...player.audioProps} />
            <RecordingControls player={player} />
          </>
        ) : (
          <p className={styles.modalNote}>No recording was saved for this call.</p>
        )}

        {call.outcome_reason && (
          <div className={styles.modalReason}>
            <span className={styles.modalLabel}>Why this result</span>
            <p>{call.outcome_reason}</p>
            {call.outcome_evidence.length > 0 && (
              <ul className={styles.evidenceList}>
                {call.outcome_evidence.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className={styles.modalQuotes}>
          <QuoteColumn
            label="What they liked"
            tone="good"
            total={call.buying_signals}
            quotes={call.interest_examples}
            empty="No positive signals were picked up."
          />
          <QuoteColumn
            label="What worried them"
            tone="bad"
            total={call.objections}
            quotes={call.concern_examples}
            empty="No concerns were raised."
          />
        </div>

        <Link to={`/conversations/${call.id}`} className={styles.modalCta}>
          Open full analysis <ArrowRightIcon size={15} />
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className={styles.modalLabel}>{label}</span>
      <span className={styles.modalStatValue}>{children}</span>
    </div>
  );
}

/**
 * The count is how many the call actually had; the API keeps only the first
 * couple of quotes per call so the dashboard payload stays small. Where those
 * differ, say so — a "(3)" above two quotes reads as a bug.
 */
function QuoteColumn({
  label,
  tone,
  total,
  quotes,
  empty,
}: {
  label: string;
  tone: "good" | "bad";
  total: number;
  quotes: string[];
  empty: string;
}) {
  const hidden = Math.max(0, total - quotes.length);

  return (
    <div>
      <span className={styles.modalLabel} data-tone={tone}>
        {label} ({total})
      </span>
      {quotes.length === 0 ? (
        <p className={styles.modalNote}>
          {total > 0 ? `${total} recorded — open the full analysis to read them.` : empty}
        </p>
      ) : (
        <>
          <ul className={styles.quoteList}>
            {/* Rendered as-is: the server already formats these as
                `signal — “what they said”`, so quoting again would double them. */}
            {quotes.map((quote, i) => (
              <li key={i} data-tone={tone}>
                {quote}
              </li>
            ))}
          </ul>
          {hidden > 0 && (
            <p className={styles.modalNote}>+{hidden} more in the full analysis</p>
          )}
        </>
      )}
    </div>
  );
}
