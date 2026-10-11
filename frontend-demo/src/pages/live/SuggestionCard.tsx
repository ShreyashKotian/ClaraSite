/**
 * The AI suggestion area: source chips the moment retrieval finishes, the
 * streaming answer, a confidence badge derived from real match scores, an
 * unverified-figures warning when the grounding check failed, "Use this
 * response" (copies + records the adoption signal), and a pinned history so
 * a suggestion the rep is reading never vanishes.
 */

import { useEffect, useState } from "react";
import type { RealtimeView } from "../../realtime";
import type { AnswerDoneMessage, SourceItem } from "../../types";
import styles from "./LiveCalls.module.css";

type Confidence = { label: string; tone: "high" | "mid" | "low" };

function confidenceFrom(sources: SourceItem[] | undefined): Confidence | null {
  const best = Math.max(0, ...(sources ?? []).map((s) => s.vector_score ?? 0));
  if (best <= 0) return null;
  if (best >= 0.8) return { label: "High confidence", tone: "high" };
  if (best >= 0.55) return { label: "Medium confidence", tone: "mid" };
  return { label: "Low confidence", tone: "low" };
}

function ConfidencePill({ confidence }: { confidence: Confidence }) {
  return (
    <span className={styles.confidencePill}>
      {confidence.label}
      <span className={styles.signalBars} data-tone={confidence.tone} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
    </span>
  );
}

function SourceChips({ sources }: { sources: SourceItem[] }) {
  if (!sources.length) return null;
  return (
    <div className={styles.chipRow}>
      {sources.slice(0, 3).map((s, i) => (
        <span key={s.id ?? i} className={styles.sourceChip} title={s.excerpt}>
          📄 {(s.excerpt ?? "source").slice(0, 42)}
        </span>
      ))}
    </div>
  );
}

function UseButton({
  answer,
  onUse,
}: {
  answer: AnswerDoneMessage;
  onUse: (a: AnswerDoneMessage) => void;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      type="button"
      className={styles.useButton}
      onClick={() => {
        onUse(answer);
        setCopied(true);
      }}
    >
      {copied ? "Copied ✓" : "Use this response ➤"}
    </button>
  );
}

export function SuggestionCard({
  view,
  onUse,
}: {
  view: RealtimeView;
  onUse: (a: AnswerDoneMessage) => void;
}) {
  const { liveAnswer, liveRetrieval, completedAnswers } = view;
  const latest = completedAnswers.at(-1) ?? null;
  const history = completedAnswers.slice(0, -1).reverse();
  const [showHistory, setShowHistory] = useState(false);

  const streaming = liveAnswer !== null;
  const card = streaming ? null : latest;
  const confidence = confidenceFrom(card?.sources ?? liveRetrieval?.sources);

  return (
    <div className={styles.suggestionArea}>
      <div className={styles.suggestionCard}>
        <div className={styles.suggestionHead}>
          <span className={styles.suggestionLabel}>✦ AI suggested response</span>
        </div>

        {streaming ? (
          <>
            <SourceChips sources={liveRetrieval?.sources ?? []} />
            <p className={styles.suggestionText}>
              {liveAnswer.text || <span className={styles.thinking}>Finding the answer…</span>}
              <span className={styles.caret} aria-hidden="true" />
            </p>
            {confidence && (
              <div className={styles.suggestionFoot}>
                <ConfidencePill confidence={confidence} />
              </div>
            )}
          </>
        ) : card ? (
          <>
            <SourceChips sources={card.sources ?? []} />
            <p className={styles.suggestionText}>{card.text}</p>
            {card.grounded === false && (
              <p className={styles.ungroundedWarning}>
                ⚠ Couldn't verify: {card.ungrounded_figures?.join(", ")} — double-check
                before quoting.
              </p>
            )}
            <div className={styles.suggestionFoot}>
              <div className={styles.suggestionFootLeft}>
                {confidence && <ConfidencePill confidence={confidence} />}
                {history.length > 0 && (
                  <button
                    type="button"
                    className={styles.historyToggle}
                    onClick={() => setShowHistory((v) => !v)}
                  >
                    {showHistory ? "Hide previous" : `Previous (${history.length})`}
                  </button>
                )}
              </div>
              {/* An error notice is not a line the rep should speak or track. */}
              {!card.error && <UseButton answer={card} onUse={onUse} />}
            </div>
          </>
        ) : (
          <p className={styles.suggestionIdle}>
            Suggestions appear the moment the customer asks something.
          </p>
        )}
      </div>

      {showHistory && !streaming && (
        <div className={styles.historyList}>
          {history.map((a) => (
            <div key={a.generation_id} className={styles.historyItem}>
              <p className={styles.historyQuery}>{a.query}</p>
              <p className={styles.historyText}>{a.text}</p>
              <UseButton answer={a} onUse={onUse} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
