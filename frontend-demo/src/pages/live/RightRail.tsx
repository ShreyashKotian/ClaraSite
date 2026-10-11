/**
 * Right rail: current call, live sentiment (model-judged moods, aggregated),
 * measured session stats, and a strategy note driven by the latest classified
 * intent. Every number here is real — the sentiment widget says "listening"
 * until the model has actually judged a turn.
 */

import type { RealtimeView } from "../../realtime";
import { PreCallSetup, type StartConfig } from "./PreCallSetup";
import { computeLiveSentiment } from "./sentiment";
import styles from "./LiveCalls.module.css";

function strategyNote(view: RealtimeView, suggestionsCount: number, live: boolean): string {
  if (!live) {
    return "Run the mic check and start a session — live coaching cues appear here during the call.";
  }
  const latest = view.completedAnswers.at(-1);
  if (!latest || suggestionsCount === 0) {
    return "Let the customer finish a full thought — suggestions appear after their first question.";
  }
  switch (latest.intent) {
    case "objection":
      return "The customer raised a concern — acknowledge it, then offer one concrete next step (site visit, brochure, loan pre-check).";
    case "closing":
      return "The call is wrapping up — confirm the next step and the follow-up channel before goodbye.";
    case "opener":
      return "Build rapport first — invite their needs before quoting numbers.";
    default:
      return "Answer, then move the sale forward: budget, timeline, configuration, or a site visit.";
  }
}

export function RightRail({
  view,
  live,
  sessionId,
  elapsed,
  speakers,
  repTalkPct,
  cacheHits,
  eventsCount,
  onStart,
  starting,
  onEnd,
}: {
  view: RealtimeView;
  live: boolean;
  sessionId: string | null;
  elapsed: string;
  speakers: number[];
  repTalkPct: number | null;
  cacheHits: number;
  eventsCount: number;
  onStart: (config: StartConfig) => void;
  starting: boolean;
  onEnd: () => void;
}) {
  const suggestions = view.completedAnswers.length;
  const sentiment = computeLiveSentiment(view.completedAnswers);

  return (
    <aside className={styles.rightRail} aria-label="Call insights">
      {!live && <PreCallSetup onStart={onStart} starting={starting} />}

      {live && (
        <>
          <div className={styles.railCard}>
            <div className={styles.railHead}>
              <span className={styles.railTitle}>Current call</span>
              <span className={styles.railHeadRight}>
                <span className={styles.liveTextRed}>● Live · {elapsed}</span>
                <button
                  type="button"
                  className={styles.endRoundButton}
                  onClick={onEnd}
                  title="End session"
                  aria-label="End session"
                >
                  <PhoneDownIcon />
                </button>
              </span>
            </div>
            <div className={styles.leadRow}>
              <span className={styles.leadAvatar} aria-hidden="true">
                L
              </span>
              <div>
                <p className={styles.leadName}>Lead contact</p>
                <p className={styles.leadSession}>
                  {sessionId ? sessionId.slice(0, 8).toUpperCase() : "—"}
                </p>
              </div>
            </div>
            <button
              type="button"
              className={styles.viewDetailsButton}
              disabled
              title="Call review opens here after the session ends"
            >
              View details ↗
            </button>
          </div>
        </>
      )}

      <SentimentCard sentiment={sentiment} live={live} />

      {live && (
        <>
          <div className={styles.railCard}>
            <span className={styles.railTitle}>Account insights</span>
            <div className={styles.insightRow}>
              <span className={styles.insightIcon} aria-hidden="true">
                ⚡
              </span>
              <div>
                <p className={styles.insightName}>Session momentum</p>
                <p className={styles.insightSub}>
                  {suggestions} coaching cue{suggestions === 1 ? "" : "s"} this call
                  {cacheHits > 0 ? ` · ${cacheHits} instant` : ""}
                </p>
              </div>
            </div>
            <div className={styles.insightRow}>
              <span className={styles.insightIcon} aria-hidden="true">
                👥
              </span>
              <div>
                <p className={styles.insightName}>Key stakeholders</p>
                <p className={styles.insightSub}>
                  {speakers.length} voice{speakers.length === 1 ? "" : "s"} detected
                  {repTalkPct !== null ? ` · you're talking ${repTalkPct}%` : ""}
                </p>
              </div>
            </div>
            <div className={styles.insightRow}>
              <span className={styles.insightIcon} aria-hidden="true">
                📈
              </span>
              <div>
                <p className={styles.insightName}>Engagement footprint</p>
                <p className={styles.insightSub}>
                  {elapsed} on the line · {eventsCount} event{eventsCount === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      <div className={styles.strategyCard}>
        <div className={styles.strategyHead}>
          <span className={styles.strategyIcon} aria-hidden="true">
            💡
          </span>
          <span className={styles.strategyTitle}>AI strategy note</span>
        </div>
        <p className={styles.strategyText}>{strategyNote(view, suggestions, live)}</p>
      </div>
    </aside>
  );
}

function SentimentCard({
  sentiment,
  live,
}: {
  sentiment: ReturnType<typeof computeLiveSentiment>;
  live: boolean;
}) {
  if (!sentiment) {
    return (
      <div className={styles.railCard}>
        <span className={styles.railTitle}>Sentiment analysis</span>
        <div className={styles.sentimentRow}>
          <span className={styles.sentimentEmoji} data-tone="idle">
            {live ? "…" : "—"}
          </span>
          <span className={styles.sentimentScore} data-idle="true">
            —
          </span>
          <span className={styles.sentimentLabel} data-idle="true">
            {live ? "Listening" : "Not started"}
          </span>
        </div>
        <div className={styles.sentimentTrack} aria-hidden="true" />
        <p className={styles.railFaint}>
          {live
            ? "Updates after the customer speaks."
            : "Live customer mood appears here once the session starts."}
        </p>
      </div>
    );
  }

  const face =
    sentiment.label === "Positive" ? "🙂" : sentiment.label === "Neutral" ? "😐" : "🙁";
  const read =
    sentiment.label === "Positive"
      ? "The customer sentiment is positive. The conversation is progressing well."
      : sentiment.label === "Neutral"
        ? "The customer sounds neutral so far — keep drawing out their priorities."
        : "The customer sounds hesitant — acknowledge concerns before pitching.";

  return (
    <div className={styles.railCard}>
      <span className={styles.railTitle}>Sentiment analysis</span>
      <div className={styles.sentimentRow}>
        <span className={styles.sentimentEmoji} data-tone={sentiment.label}>
          {face}
        </span>
        <span className={styles.sentimentScore}>{sentiment.score}%</span>
        <span className={styles.sentimentLabel}>{sentiment.label}</span>
      </div>
      <div className={styles.sentimentTrack} aria-hidden="true">
        <div className={styles.sentimentFill} style={{ width: `${sentiment.score}%` }} />
      </div>
      <p className={styles.railFaint}>
        {read} ({sentiment.turns} judged turn{sentiment.turns === 1 ? "" : "s"})
      </p>
    </div>
  );
}

function PhoneDownIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.5 13.5c5-4.7 12-4.7 17 0l-2.3 2.6c-.5.5-1.3.6-1.9.2l-2-1.4a1.6 1.6 0 0 0-1.8 0l-2 1.4c-.6.4-1.4.3-1.9-.2L3.5 13.5z"
        fill="currentColor"
      />
    </svg>
  );
}
