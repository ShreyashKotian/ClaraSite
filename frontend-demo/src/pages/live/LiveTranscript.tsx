/**
 * Live transcript with avatars and timestamps. Shows both speakers by
 * default (per the design); the "customer only" toggle restores the
 * distraction-free view. Everything is always captured and saved either way.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { TranscriptFinalMessage, TranscriptPartialMessage, WsMessage } from "../../types";
import styles from "./LiveCalls.module.css";

function formatMs(ms: number | null | undefined): string {
  if (ms == null) return "";
  const sec = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

function speakerName(speaker: number | null | undefined, leadSpeakerId: number | null): string {
  if (speaker != null && speaker === leadSpeakerId) return "Customer";
  return "You";
}

export function LiveTranscript({
  messages,
  leadSpeakerId,
  active,
  pip,
  children,
  autoScrollSignal,
}: {
  messages: WsMessage[];
  leadSpeakerId: number | null;
  /** A session is live/connecting — switches the empty-state copy. */
  active: boolean;
  pip: { supported: boolean; open: boolean; openPip: () => Promise<void> | void };
  /** Rendered inside the feed after the turns — the AI suggestion card lives
   * in the conversation flow, exactly like the design. */
  children?: ReactNode;
  /** Changes whenever streamed content grows, so the feed keeps auto-scrolling. */
  autoScrollSignal?: unknown;
}) {
  const [customerOnly, setCustomerOnly] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const finals = messages.filter((m): m is TranscriptFinalMessage => m.type === "transcript_final");

  // A partial is only "live" while nothing final has superseded it — showing
  // the last partial unconditionally left a ghost duplicate of the sentence
  // that had just been finalized right above it.
  let partial: TranscriptPartialMessage | null = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.type === "transcript_final") break;
    if (m.type === "transcript_partial") {
      partial = m;
      break;
    }
  }

  // The filter needs a known customer channel — before the first
  // session_status resolves it, filtering would blank the whole feed.
  const filterActive = customerOnly && leadSpeakerId != null;
  const shown = filterActive
    ? finals.filter((m) => m.speaker === leadSpeakerId)
    : finals;
  const shownPartial =
    partial && (!filterActive || partial.speaker === leadSpeakerId) ? partial : null;

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [shown.length, shownPartial?.text, autoScrollSignal]);

  return (
    <div className={styles.transcriptPanel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Live transcript</h2>
        <div className={styles.panelControls}>
          <button
            type="button"
            className={`${styles.controlPill} ${customerOnly ? styles.controlPillOn : ""}`}
            onClick={() => setCustomerOnly((v) => !v)}
            aria-pressed={customerOnly}
          >
            Customer only
          </button>
          <button
            type="button"
            className={styles.controlPill}
            onClick={() => {
              if (feedRef.current) {
                feedRef.current.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
              }
            }}
          >
            ⟳ Live scroll
          </button>
          {pip.supported && (
            <button
              type="button"
              className={styles.controlPill}
              onClick={() => void pip.openPip()}
              disabled={pip.open}
            >
              {pip.open ? "Popped out" : "Pop out ↗"}
            </button>
          )}
        </div>
      </div>

      <div ref={feedRef} className={styles.transcriptFeed} role="log" aria-live="polite">
        {shown.length === 0 && !shownPartial && (
          <p className={styles.transcriptEmpty}>
            {active
              ? "Listening — the conversation appears here as it happens."
              : "Start a session from the panel on the right — the live conversation appears here."}
          </p>
        )}
        {shown.map((m, i) => {
          const isCustomer = m.speaker === leadSpeakerId;
          return (
            <div
              key={`${m.speaker}-${m.start_ms ?? i}-${i}`}
              className={isCustomer ? styles.turnCustomer : styles.turnRep}
            >
              <span
                className={isCustomer ? styles.avatarCustomer : styles.avatarRep}
                aria-hidden="true"
              >
                {isCustomer ? "C" : "A"}
              </span>
              <div className={styles.turnBody}>
                <div className={styles.turnMeta}>
                  <strong>{speakerName(m.speaker, leadSpeakerId)}</strong>
                  <span>{formatMs(m.start_ms)}</span>
                </div>
                <p className={styles.turnText}>{m.text}</p>
              </div>
            </div>
          );
        })}
        {shownPartial && (
          <p className={styles.partialText}>
            {speakerName(shownPartial.speaker, leadSpeakerId)}: {shownPartial.text}…
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
