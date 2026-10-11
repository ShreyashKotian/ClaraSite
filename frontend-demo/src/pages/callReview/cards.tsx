/**
 * The summary cards below the hero: how the customer felt, what stands in the
 * way, what to do next, the moments that mattered, and how the rep did.
 *
 * Each renders only what the analysis actually returned — where a value is
 * missing the card says so rather than filling the gap with a plausible one.
 */

import { useState } from "react";
import { formatMs } from "../../api/conversations";
import { PerformanceStats, SentimentGauge } from "./charts";
import { asNumber, asRecord, asString } from "./json";
import type { CallReviewView } from "./metrics";
import { AlertIcon, CalendarIcon, CheckIcon, StarIcon, TargetIcon } from "../../components/icons";
import styles from "./AnalysisView.module.css";

/** At most this many per column — the rest are in the report, not the summary. */
const MAX_COACHING_POINTS = 3;

const SHIFT_LABELS = {
  up: "became more positive during the call",
  down: "became less positive during the call",
  steady: "felt much the same throughout",
} as const;

const SHIFT_ARROWS = { up: " ↑", down: " ↓", steady: "" } as const;

export function SentimentCard({
  sentiment,
  onViewDetails,
}: {
  sentiment: CallReviewView["sentiment"];
  onViewDetails: () => void;
}) {
  return (
    <section className={styles.card}>
      <span className={styles.cardTitle}>Client sentiment</span>
      {sentiment ? (
        <>
          <div className={styles.sentimentTop}>
            <SentimentGauge score={sentiment.score} tone={sentiment.tone} />
            <div>
              <span className={styles.sentimentWord} data-tone={sentiment.tone}>
                {sentiment.word}
              </span>
              <strong className={styles.sentimentScore}>
                {sentiment.score}
                <small>/100</small>
              </strong>
              <span className={styles.sentimentWhen}>across the whole call</span>
            </div>
          </div>
          {sentiment.shift && (
            <>
              <p className={styles.cardText}>
                The customer {SHIFT_LABELS[sentiment.shift.direction]}.
              </p>
              <div className={styles.shiftRow}>
                <span className={styles.shiftItem}>
                  <span className={styles.shiftLabel}>Started</span>
                  {sentiment.shift.from}
                </span>
                <span className={styles.shiftItem}>
                  <span className={styles.shiftLabel}>Ended</span>
                  {sentiment.shift.to}
                </span>
                <span className={styles.shiftItem} data-direction={sentiment.shift.direction}>
                  <span className={styles.shiftLabel}>Change</span>
                  {sentiment.shift.delta > 0 ? "+" : ""}
                  {sentiment.shift.delta}
                  {SHIFT_ARROWS[sentiment.shift.direction]}
                </span>
              </div>
            </>
          )}
          {sentiment.note && <p className={styles.cardText}>{sentiment.note}</p>}
          <button type="button" className={styles.cardLink} onClick={onViewDetails}>
            View sentiment details →
          </button>
        </>
      ) : (
        <p className={styles.cardText}>No phase of this call was scored for sentiment.</p>
      )}
    </section>
  );
}

/** Always amber, blocker or not: a colour that changed with the outcome would
 *  read as a different card each time. */
export function BlockerCard({ blocker }: { blocker: CallReviewView["mainBlocker"] }) {
  return (
    <section className={styles.card} data-accent="warn">
      <span className={styles.cardTitle}>
        {blocker ? <AlertIcon size={14} /> : <CheckIcon size={14} />}
        Main blocker
      </span>
      {blocker ? (
        <>
          <strong className={styles.cardHeadline}>{blocker.label}</strong>
          <p className={styles.cardText}>{blocker.detail}</p>
          {blocker.quote && <p className={styles.cardQuote}>“{blocker.quote}”</p>}
          <span className={styles.cardFoot}>Focus here to move the deal forward</span>
        </>
      ) : (
        <>
          <strong className={styles.cardHeadline}>Nothing blocking this deal</strong>
          <p className={styles.cardText}>
            No objection went unresolved — the path to the next step is clear.
          </p>
          <span className={styles.cardFoot}>Keep the momentum on the agreed next step</span>
        </>
      )}
    </section>
  );
}

/**
 * The one action worth doing next. Ticking it off is a per-viewer reminder
 * kept in this browser — there is no shared task list behind it yet, so the
 * card must be mounted per conversation (see the key on its call site).
 */
export function NextActionCard({
  action,
  conversationId,
}: {
  action: CallReviewView["nextBestAction"];
  conversationId: string;
}) {
  const storageKey = `next-action-done:${conversationId}`;
  const [done, setDone] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });

  function markDone() {
    setDone(true);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* a reminder that doesn't survive reload is still worth showing */
    }
  }

  return (
    <section className={styles.card} data-accent="action">
      <span className={styles.cardTitle}>
        <TargetIcon size={14} />
        Next action
      </span>
      {action ? (
        <>
          <strong className={done ? styles.cardHeadlineDone : styles.cardHeadline}>
            {action.action}
          </strong>
          {action.why && <p className={styles.cardText}>{action.why}</p>}
          <div className={styles.actionFooter}>
            {action.dueHint ? (
              <span className={styles.dueChip}>
                <CalendarIcon size={13} />
                Due: {action.dueHint}
              </span>
            ) : (
              <span />
            )}
            {done ? (
              <span className={styles.doneChip}>
                <CheckIcon size={13} />
                Done
              </span>
            ) : (
              <button type="button" className={styles.secondaryButton} onClick={markDone}>
                Mark as done
              </button>
            )}
          </div>
        </>
      ) : (
        <p className={styles.cardText}>Nothing urgent — keep the follow-up cadence.</p>
      )}
    </section>
  );
}

export function KeyMomentsCard({
  moments,
  onViewTimeline,
}: {
  moments: CallReviewView["pivotal"];
  onViewTimeline: () => void;
}) {
  return (
    <section className={styles.card}>
      <span className={styles.cardTitle}>Key moments</span>
      {moments.length > 0 ? (
        <ul className={styles.momentList}>
          {moments.map((raw, i) => {
            const moment = asRecord(raw);
            const quote = asString(moment.quote);
            return (
              <li key={i} className={styles.moment}>
                <span className={styles.momentDot} aria-hidden="true" />
                <div className={styles.momentBody}>
                  <p className={styles.momentLabel}>
                    <span className={styles.momentTime}>
                      {formatMs(asNumber(moment.start_ms))}
                    </span>
                    {asString(moment.label)}
                  </p>
                  {quote && <p className={styles.momentQuote}>“{quote}”</p>}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.cardText}>
          No single moment turned this call — it moved at a steady pace throughout.
        </p>
      )}
      <button type="button" className={styles.cardLink} onClick={onViewTimeline}>
        View full timeline →
      </button>
    </section>
  );
}

export function PerformanceCard({ vm }: { vm: CallReviewView }) {
  return (
    <section className={styles.card}>
      <div className={styles.performance}>
        <div className={styles.performanceMain}>
          <span className={styles.performanceBadge}>
            <StarIcon size={22} />
          </span>
          <div>
            <span className={styles.performanceTitle}>Your performance</span>
            <p className={styles.performanceText}>
              {asString(vm.repComm.overall_assessment) || "No overall assessment for this call."}
            </p>
            <PerformanceStats
              repPct={vm.repPct}
              responseSec={vm.responseSec}
              responseGoalSec={vm.responseGoalSec}
              questions={vm.questions}
            />
          </div>
        </div>

        <CoachingColumn
          label="Top strengths"
          tone="good"
          items={vm.strengths}
          empty="None highlighted on this call."
        />
        <CoachingColumn
          label="Opportunities"
          tone="warn"
          items={vm.coaching.map((item) => asString(asRecord(item).recommendation))}
          empty="Nothing flagged to improve."
        />
      </div>
    </section>
  );
}

function CoachingColumn({
  label,
  tone,
  items,
  empty,
}: {
  label: string;
  tone: "good" | "warn";
  items: string[];
  empty: string;
}) {
  const shown = items.filter(Boolean).slice(0, MAX_COACHING_POINTS);
  return (
    <div>
      <span className={styles.performanceLabel} data-tone={tone}>
        {label}
      </span>
      <ul className={styles.performanceList}>
        {shown.length > 0 ? (
          shown.map((item, i) => <li key={i}>{item}</li>)
        ) : (
          <li className={styles.performanceEmpty}>{empty}</li>
        )}
      </ul>
    </div>
  );
}
