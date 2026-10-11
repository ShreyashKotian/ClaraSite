import styles from "./AnalysisView.module.css";
import { SparkIcon } from "../../components/icons";
import type { ScoreTone, SentimentPhase } from "./metrics";

/** The hero gauge: a lead verdict, the score, and what the score measures —
 *  all inside the ring, as in the design. */
export function ScoreRing({
  value,
  badge,
  caption,
  size = 168,
  tone,
}: {
  value: number;
  badge: string;
  caption: string;
  size?: number;
  tone: ScoreTone;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className={styles.ring} style={{ width: size, height: size }} data-tone={tone}>
      <svg width={size} height={size} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={styles.ringTrack}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={styles.ringFill}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (clamped / 100) * circumference}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className={styles.ringCenter}>
        <span className={styles.ringBadge}>
          <SparkIcon size={11} />
          {badge}
        </span>
        <span className={styles.ringValue}>
          {Math.round(clamped)}
          <small>%</small>
        </span>
        <span className={styles.ringCaption}>{caption}</span>
      </div>
    </div>
  );
}

/** The mouth is the only part that changes — drawn rather than typed, so the
 *  face matches the gauge colour instead of being a stock emoji. */
const MOUTHS: Record<ScoreTone, string> = {
  high: "M27 45 Q38 54 49 45",
  mid: "M29 47 H47",
  low: "M27 50 Q38 41 49 50",
};

/** Sentiment across the whole call, as a small dial with a face inside it. */
export function SentimentGauge({ score, tone }: { score: number; tone: ScoreTone }) {
  const size = 76;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, score));

  return (
    <svg
      className={styles.gauge}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      data-tone={tone}
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className={styles.gaugeTrack}
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className={styles.gaugeFill}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference - (clamped / 100) * circumference}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <g className={styles.gaugeFace}>
        <circle cx="30" cy="33" r="2.7" />
        <circle cx="46" cy="33" r="2.7" />
      </g>
      <path
        d={MOUTHS[tone]}
        className={styles.gaugeMouth}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The three measured numbers from the call, each shown against the range it
 * ought to fall in. The numbers come from the backend; the healthy ranges are
 * ordinary sales-coaching convention, not something the AI judged.
 */
const HEALTHY_TALK = [40, 60] as const;
const STRONG_DISCOVERY = 4;

export function PerformanceStats({
  repPct,
  responseSec,
  responseGoalSec,
  questions,
}: {
  repPct: number;
  /** Null when no customer question on this call got an answer to time. */
  responseSec: number | null;
  responseGoalSec: number;
  questions: number;
}) {
  const balanced = repPct >= HEALTHY_TALK[0] && repPct <= HEALTHY_TALK[1];
  const quick = responseSec != null && responseSec <= responseGoalSec;
  const curious = questions >= STRONG_DISCOVERY;

  const pills = [
    {
      value: `${Math.round(repPct)}%`,
      label: "you talked",
      good: balanced,
      why: balanced
        ? `Balanced — ${HEALTHY_TALK[0]}–${HEALTHY_TALK[1]}% is the healthy range`
        : repPct > HEALTHY_TALK[1]
          ? `You led most of the talking — ${HEALTHY_TALK[0]}–${HEALTHY_TALK[1]}% is the healthy range`
          : `The customer led the talking — ${HEALTHY_TALK[0]}–${HEALTHY_TALK[1]}% is the healthy range`,
    },
    {
      value: responseSec != null ? `${responseSec}s` : "—",
      label: "to reply",
      good: quick,
      why:
        responseSec == null
          ? "No question on this call had a reply to time"
          : quick
            ? `Answered without hesitating — under ${responseGoalSec}s reads as confident`
            : `A long pause before answering — under ${responseGoalSec}s reads as confident`,
    },
    {
      value: `${questions}`,
      label: questions === 1 ? "question" : "questions",
      good: curious,
      why: curious
        ? "Strong discovery"
        : `Room for more discovery — ${STRONG_DISCOVERY}+ questions is a good target`,
    },
  ];

  return (
    <div className={styles.statPills}>
      {pills.map((pill) => (
        <span
          key={pill.label}
          className={styles.statPill}
          data-tone={pill.good ? "good" : "warn"}
          title={pill.why}
        >
          <span className={styles.statDot} />
          <strong>{pill.value}</strong>
          {pill.label}
        </span>
      ))}
    </div>
  );
}

export function CallPhaseList({ phases }: { phases: SentimentPhase[] }) {
  return (
    <div className={styles.callPhaseList}>
      {phases.map((phase) => (
        <article key={phase.label} className={styles.callPhaseCard}>
          <div className={styles.callPhaseHead}>
            <span className={styles.callPhaseLabel}>{phase.label}</span>
            <strong className={styles.callPhaseScore}>
              {phase.judged ? `${phase.score}/100` : "Not judged"}
            </strong>
          </div>
          {phase.judged && (
            <div className={styles.callPhaseTrack}>
              <div className={styles.callPhaseFill} style={{ width: `${phase.score}%` }} />
            </div>
          )}
          {phase.note && <p className={styles.callPhaseNote}>{phase.note}</p>}
          {phase.quote && (
            <p className={styles.callPhaseNote}>
              <em>“{phase.quote}”</em>
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
