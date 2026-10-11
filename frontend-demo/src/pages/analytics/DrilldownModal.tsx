import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  formatDuration,
  formatTimestamp,
  type AnalyticsCallRow,
  type AnalyticsSummary,
} from "../../api/conversations";
import { scoreTone } from "../callReview/metrics";
import styles from "./Analytics.module.css";
import { OUTCOME_LABELS } from "../../outcomes";
import { getDrilldownCalls, getDrilldownMeta, type Drilldown } from "./drilldown";

/** One labelled group of words inside a drill-down card. */
type QuoteSection = {
  label: string;
  tone?: "good" | "bad";
  pick: (call: AnalyticsCallRow) => string[];
  empty: string;
};

/** What a card-style drill-down shows: one stat line and the words behind it. */
type QuoteView = {
  stat: (call: AnalyticsCallRow) => string;
  sections: QuoteSection[];
};

function countPhrase(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

const LIKED: QuoteSection = {
  label: "What interested them",
  tone: "good",
  pick: (call) => call.interest_examples,
  empty: "Nothing they warmed to was picked up on this call.",
};

const WORRIED: QuoteSection = {
  label: "What worried them",
  tone: "bad",
  pick: (call) => call.concern_examples,
  empty: "No concerns were raised on this call.",
};

function getQuoteView(drilldown: Drilldown): QuoteView | null {
  if (drilldown.type === "coaching" && drilldown.focus === "questions") {
    return {
      stat: (call) => countPhrase(call.rep_questions || 0, "question", "questions"),
      sections: [
        {
          label: "What you asked",
          pick: (call) => call.question_examples,
          empty: "No questions were picked up on this call.",
        },
      ],
    };
  }
  if (drilldown.type === "coaching" && drilldown.focus === "listening") {
    return {
      stat: (call) => `${call.listening_index ?? "—"} listening score`,
      sections: [
        {
          label: "What they told you",
          pick: (call) => call.listening_examples,
          empty: "Nothing the customer said was captured on this call.",
        },
      ],
    };
  }
  if (drilldown.type === "signals") {
    // Both sides, every time. A card showing only what they liked reads as a
    // won call even when the same conversation raised four objections — the
    // side that was clicked leads, the other follows for context.
    const buying = drilldown.signal === "buying";
    return {
      stat: (call) =>
        `${countPhrase(call.buying_signals, "positive sign", "positive signs")} · ${countPhrase(
          call.objections,
          "concern",
          "concerns",
        )}`,
      sections: buying ? [LIKED, WORRIED] : [WORRIED, LIKED],
    };
  }
  return null;
}

type Props = {
  drilldown: Drilldown | null;
  summary: AnalyticsSummary | null;
  onClose: () => void;
};

export function DrilldownModal({ drilldown, summary, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const calls = useMemo(
    () => (drilldown && summary ? getDrilldownCalls(summary, drilldown) : []),
    [drilldown, summary],
  );
  const meta = useMemo(
    () => (drilldown && summary ? getDrilldownMeta(summary, drilldown, calls) : null),
    [drilldown, summary, calls],
  );

  useEffect(() => {
    if (!drilldown) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      cancelAnimationFrame(frame);
    };
  }, [drilldown, onClose]);

  if (!drilldown || !summary || !meta) return null;

  const showCoaching = drilldown.type === "coaching";
  const showSignals = drilldown.type === "signals";
  // Any view whose point is the words themselves. A count like "4.7
  // questions" says nothing about which questions worked, and sentences do
  // not fit a table column — so these views render as cards instead.
  const quoteView = getQuoteView(drilldown);
  const showConversion = drilldown.type === "win_band" || drilldown.type === "volume";

  return (
    <div className={styles.drillBackdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.drillModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="analytics-drilldown-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.drillHead}>
          <div>
            <p className={styles.drillEyebrow}>Details</p>
            <h2 id="analytics-drilldown-title" className={styles.drillTitle}>
              {meta.title}
            </h2>
            <p className={styles.drillSubtitle}>{meta.subtitle}</p>
          </div>
          <button ref={closeRef} type="button" className={styles.drillClose} onClick={onClose} aria-label="Close details">
            ×
          </button>
        </header>

        <div className={styles.drillStats}>
          {meta.stats.map((stat) => (
            <div key={stat.label} className={styles.drillStat}>
              <span className={styles.drillStatValue}>{stat.value}</span>
              <span className={styles.drillStatLabel}>{stat.label}</span>
            </div>
          ))}
        </div>

        <div className={styles.drillBody}>
          {calls.length && quoteView ? (
            <ul className={styles.quoteCards}>
              {calls.map((call) => (
                <li key={call.id} className={styles.quoteCard}>
                  <div className={styles.quoteCardHead}>
                    <div>
                      <p className={styles.quoteCardWhen}>{formatTimestamp(call.started_at)}</p>
                      <p className={styles.quoteCardWho}>
                        {[call.rep_label?.trim(), call.caller_name?.trim()]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                    <span className={styles.outcomePill} data-outcome={call.outcome}>
                      {OUTCOME_LABELS[call.outcome]}
                    </span>
                  </div>

                  <div className={styles.quoteCardStats}>
                    <span>{formatDuration(call.duration_sec)} long</span>
                    <span>
                      {call.rep_talk_pct != null ? `${call.rep_talk_pct}% you talked` : "— you talked"}
                    </span>
                    <span>{quoteView.stat(call)}</span>
                  </div>

                  {quoteView.sections.map((section) => (
                    <div key={section.label}>
                      <p className={styles.quoteCardLabel} data-tone={section.tone}>
                        {section.label}
                      </p>
                      <CoachingQuotes quotes={section.pick(call)} section={section} />
                    </div>
                  ))}

                  <Link
                    className={styles.quoteCardLink}
                    to={`/conversations/${call.id}`}
                    onClick={onClose}
                  >
                    Open full review
                  </Link>
                </li>
              ))}
            </ul>
          ) : calls.length ? (
            <table className={styles.drillTable}>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Rep</th>
                  <th scope="col">Client</th>
                  <th scope="col">Length</th>
                  {showConversion ? <th scope="col">Close chance</th> : null}
                  {showSignals ? <th scope="col">Interest</th> : null}
                  {showCoaching ? <th scope="col">You talked</th> : null}
                  {showCoaching ? <th scope="col">Questions</th> : null}
                  {showCoaching && drilldown.focus === "response" ? <th scope="col">Response</th> : null}
                  {showCoaching && drilldown.focus === "listening" ? <th scope="col">Listening</th> : null}
                  <th scope="col">Result</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => (
                  <tr key={call.id}>
                    <td>{formatTimestamp(call.started_at)}</td>
                    <td>{call.rep_label?.trim() || "—"}</td>
                    <td>{call.caller_name?.trim() || "—"}</td>
                    <td>{formatDuration(call.duration_sec)}</td>
                    {showConversion ? (
                      <td>
                        {call.conversion_pct != null ? (
                          <span className={styles.scorePill} data-tone={scoreTone(call.conversion_pct)}>
                            {call.conversion_pct}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    ) : null}
                    {showSignals ? (
                      <td>
                        {call.outcome === "pending" ? "—" : `+${call.buying_signals} / -${call.objections}`}
                      </td>
                    ) : null}
                    {showCoaching ? <td>{call.rep_talk_pct != null ? `${call.rep_talk_pct}%` : "—"}</td> : null}
                    {showCoaching ? <td>{call.rep_questions || "—"}</td> : null}
                    {showCoaching && drilldown.focus === "response" ? (
                      <td>{call.avg_response_sec != null ? `${call.avg_response_sec}s` : "—"}</td>
                    ) : null}
                    {showCoaching && drilldown.focus === "listening" ? <td>{call.listening_index ?? "—"}</td> : null}
                    <td>
                      <span className={styles.outcomePill} data-outcome={call.outcome}>
                        {OUTCOME_LABELS[call.outcome]}
                      </span>
                    </td>
                    <td>
                      <Link className={styles.drillReviewLink} to={`/conversations/${call.id}`} onClick={onClose}>
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.drillEmpty}>No calls match this selection in the current range.</p>
          )}
        </div>

        <footer className={styles.drillFoot}>Press Esc to close</footer>
      </div>
    </div>
  );
}

function CoachingQuotes({ quotes, section }: { quotes: string[]; section: QuoteSection }) {
  if (!quotes.length) {
    return <p className={styles.quoteCardEmpty}>{section.empty}</p>;
  }
  return (
    <ul className={styles.quoteCardList} data-tone={section.tone}>
      {quotes.map((quote, index) => (
        <li key={index}>{quote}</li>
      ))}
    </ul>
  );
}
