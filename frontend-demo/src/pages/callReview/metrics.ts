/**
 * View model for the Call Review page.
 *
 * The server is the single source of truth: every number here is either
 * MEASURED by the backend from transcript timestamps (talk ratio, reply gaps,
 * question counts) or AI-ASSESSED with cited evidence (interest, blocker,
 * phase sentiment). This file only reads and clamps — it never re-derives
 * or invents values. Missing data renders as missing, not as a guess.
 */

import type { TranscriptionGap } from "../../api/conversations";
import { asArray, asNumber, asRecord, asString } from "./json";

/** The three phases the backend scores every call against. */
const PHASE_KEYS = ["opening", "middle", "closing"] as const;
const PHASE_LABELS = ["Start of call", "Middle of call", "End of call"] as const;

/** Enough of each to explain the score at a glance without becoming a wall. */
const MAX_CHECKLIST_SIGNALS = 4;
const MAX_CHECKLIST_CONCERNS = 2;

/** The hero headline is one sentence; a rambling one gets cut rather than
 *  pushing the checklist out of view. */
const MAX_SUMMARY_CHARS = 220;

/** Sentiment reads as a mood, not a grade — same bands, plainer words. */
const SENTIMENT_WORDS = { high: "Positive", mid: "Neutral", low: "Strained" } as const;

/** A movement smaller than this is noise, not a change of mood. */
const SHIFT_THRESHOLD = 5;

/**
 * Used only when the server sent no goal with the report — an older cached
 * response, or an analysis that failed before one was attached. The server's
 * value wins whenever it is there, so the two can never disagree about a call.
 */
const FALLBACK_RESPONSE_GOAL_SEC = 5;

function clampPct(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/**
 * One honest line for a report built on a transcript with holes in it. The
 * count is moments, the seconds are actual voiced speech — not the silence
 * the recogniser's windows happened to include.
 */
export function describeTranscriptionGaps(gaps: TranscriptionGap[] | undefined): string | null {
  if (!gaps || gaps.length === 0) return null;
  const voiced = Math.round(gaps.reduce((sum, gap) => sum + gap.speech_ms, 0) / 1000);
  const moments = gaps.length === 1 ? "one moment" : `${gaps.length} moments`;
  return `The customer spoke for about ${voiced}s across ${moments} that were not transcribed — those exchanges are missing from this report and the transcript.`;
}

/**
 * The model labels a blocker with a machine key ("price_resistance"), which is
 * the right shape to group on and the wrong thing to show a rep mid-call.
 * Done here rather than at write time so reports already in the database read
 * correctly too, without re-running any analysis.
 */
function humanizeLabel(raw: string): string {
  const spaced = raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : "";
}

/** Reports saved before the backend stopped prefixing tips still carry a
 *  "Pro tip:" of their own, and the card already says whose tip it is. */
function stripLegacyTipPrefix(tip: string): string {
  return tip.replace(/^\s*pro tip:\s*/i, "");
}

export type ScoreTone = "high" | "mid" | "low";

/** One banding for every 0–100 score on the page, so an interest of 70 and a
 *  sentiment of 70 are never coloured differently. Analytics reads this too. */
export function scoreTone(score: number): ScoreTone {
  if (score >= 70) return "high";
  if (score >= 45) return "mid";
  return "low";
}

export type SentimentPhase = {
  label: string;
  score: number;
  note: string;
  quote: string;
  /** False when the model never scored this phase — a real 0 is not the same
   *  as an absent judgement, and the two must not render alike. */
  judged: boolean;
};

type CallSentiment = {
  /** The call's sentiment as one number, judged by the analysis. */
  score: number;
  tone: ScoreTone;
  word: string;
  note: string;
  /** Where the customer started and finished. Null when only one phase was
   *  judged, so there is nothing to compare. */
  shift: { from: number; to: number; delta: number; direction: "up" | "down" | "steady" } | null;
};

/**
 * How the customer FELT about the conversation — deliberately separate from
 * how likely they are to buy, which is the interest score.
 *
 * The overall number is the analysis's own judgement across the whole call;
 * start and end come from its phase scores. Nothing here is averaged into a
 * figure the report doesn't contain.
 */
function buildSentiment(phases: SentimentPhase[], overall: number): CallSentiment | null {
  const judged = phases.filter((phase) => phase.judged);
  if (judged.length === 0) return null;

  const first = judged[0];
  const last = judged[judged.length - 1];
  const score = overall > 0 ? overall : last.score;
  const tone = scoreTone(score);
  const delta = last.score - first.score;

  return {
    score,
    tone,
    word: SENTIMENT_WORDS[tone],
    note: last.note,
    shift:
      judged.length > 1
        ? {
            from: first.score,
            to: last.score,
            delta,
            direction:
              delta > SHIFT_THRESHOLD ? "up" : delta < -SHIFT_THRESHOLD ? "down" : "steady",
          }
        : null,
  };
}

export type CallReviewView = ReturnType<typeof buildCallReviewView>;

export type ChecklistItem = {
  text: string;
  tone: "good" | "warn";
  /** The customer's own words behind this line, shown when it is opened. */
  quotes: string[];
  /** How firmly the model held this one, in plain words. Empty when the
   *  analysis recorded no confidence or severity for it. */
  strength: string;
};

/** The model's 0–1 confidence in a buying signal, said in words. */
function describeConfidence(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  if (value >= 0.85) return "Clearly said";
  if (value >= 0.6) return "Fairly clear";
  return "Hinted at";
}

/** An objection's severity as the model graded it. */
function describeSeverity(value: unknown): string {
  const level = asString(value).toLowerCase();
  if (level === "high") return "Serious concern";
  if (level === "medium") return "Worth answering";
  if (level === "low") return "Mentioned in passing";
  return "";
}

/**
 * The hero card's "why this is a lead-score" checklist — buying signals as
 * checks, concerns and unanswered questions as warnings, in one list so the
 * score never reads rosier than the call actually went.
 *
 * Each line carries the quote it was drawn from, so opening it shows what the
 * customer actually said rather than restating the label in longer words.
 */
function buildWhyChecklist(
  buyingSignals: Array<Record<string, unknown>>,
  objections: Array<Record<string, unknown>>,
  openQuestions: unknown,
): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  for (const raw of buyingSignals.slice(0, MAX_CHECKLIST_SIGNALS)) {
    const item = asRecord(raw);
    const text = asString(item.signal);
    if (!text) continue;
    const quote = asString(item.evidence_quote);
    items.push({
      text,
      tone: "good",
      quotes: quote ? [quote] : [],
      strength: describeConfidence(item.confidence),
    });
  }
  for (const raw of objections.slice(0, MAX_CHECKLIST_CONCERNS)) {
    const item = asRecord(raw);
    const text = asString(item.objection);
    if (!text) continue;
    const quote = asString(item.evidence_quote);
    items.push({
      text,
      tone: "warn",
      quotes: quote ? [quote] : [],
      strength: describeSeverity(item.severity),
    });
  }
  const unanswered = asArray<string>(openQuestions).filter(Boolean);
  if (unanswered.length > 0) {
    items.push({
      text: `${unanswered.length} question${unanswered.length === 1 ? "" : "s"} went unanswered`,
      tone: "warn",
      quotes: unanswered,
      strength: "Still open after the call",
    });
  }
  return items;
}

export function buildCallReviewView(
  report: Record<string, unknown>,
  metrics: Record<string, unknown>,
  goals: Record<string, unknown> = {},
) {
  const clientIntent = asRecord(report.client_intent);
  const repComm = asRecord(report.rep_communication);
  const talkRatio = asRecord(repComm.talk_listen_ratio ?? metrics.talk_listen_ratio);
  const trajectory = asRecord(report.sentiment_trajectory);
  const glance = asRecord(metrics.call_glance);

  // AI-assessed score — the backend validates and rescales it; we only clamp.
  const interestScore = clampPct(asNumber(clientIntent.interest_score, 0));

  // AI-assessed phase sentiment, each score backed by a transcript quote.
  const phaseScores = asRecord(metrics.phase_scores);
  const sentimentPhases: SentimentPhase[] = PHASE_LABELS.map((label, i) => {
    const key = PHASE_KEYS[i];
    const raw = phaseScores[key] ?? trajectory[`${key}_score`];
    return {
      label,
      score: clampPct(asNumber(raw, 0)),
      note: asString(trajectory[key]),
      quote: asString(trajectory[`${key}_quote`]),
      judged: raw != null && Number.isFinite(Number(raw)),
    };
  });

  const objections = asArray(clientIntent.objections);
  const executiveSummary = asString(report.executive_summary);
  const firstSentence = executiveSummary.split(/(?<=[.!?])\s+/)[0] ?? executiveSummary;

  const blockerRaw = asRecord(report.main_blocker);
  const nextActionRaw = asRecord(report.next_best_action);
  const attributionRaw = asRecord(metrics.attribution_warning);

  return {
    repComm,
    interestScore,
    repPct: asNumber(glance.rep_talk_pct, asNumber(talkRatio.rep_pct)),
    // Null when the call had no customer question the rep answered — there
    // is no gap to time, which is not the same as an instant reply.
    responseSec:
      typeof metrics.avg_response_sec === "number" ? metrics.avg_response_sec : null,
    questions: asNumber(repComm.questions_asked ?? metrics.rep_questions_asked),
    coachingInsight: stripLegacyTipPrefix(asString(metrics.coaching_insight)),
    // Seconds a customer can wait before the pause reads as hesitation.
    responseGoalSec: asNumber(goals.response_sec_max, FALLBACK_RESPONSE_GOAL_SEC),
    sentimentPhases,
    sentiment: buildSentiment(
      sentimentPhases,
      clampPct(asNumber(phaseScores.overall ?? trajectory.overall_score, 0)),
    ),
    objections,
    // Each customer question paired with the rep's reply, built during the
    // metrics pass so it always matches the question count shown on the card.
    prospectExchanges: asArray(metrics.prospect_exchanges).map((raw) => {
      const item = asRecord(raw);
      return {
        question: asString(item.question),
        answer: asString(item.answer),
        // Null on calls analysed before this was measured, and on questions
        // the rep never answered. Neither is a zero-second reply.
        responseSec:
          typeof item.response_ms === "number"
            ? Math.round(item.response_ms / 100) / 10
            : null,
      };
    }),
    pivotal: asArray(report.pivotal_moments),
    coaching: asArray(repComm.coaching_recommendations),
    strengths: asArray<string>(repComm.strengths),
    whyChecklist: buildWhyChecklist(
      asArray(clientIntent.buying_signals),
      objections,
      clientIntent.open_questions_unresolved,
    ),
    // Null when the model judged the call genuinely blocker-free.
    mainBlocker: asString(blockerRaw.label)
      ? {
          label: humanizeLabel(asString(blockerRaw.label)),
          detail: asString(blockerRaw.detail),
          quote: asString(blockerRaw.evidence_quote),
        }
      : null,
    nextBestAction: asString(nextActionRaw.action)
      ? {
          action: asString(nextActionRaw.action),
          why: asString(nextActionRaw.why),
          // Empty when the analysis gave no timing — the card then shows no
          // due chip rather than inventing a deadline for the rep.
          dueHint: asString(nextActionRaw.due_hint),
        }
      : null,
    attributionWarning: asString(attributionRaw.reason) || null,
    unverifiedQuotes: asNumber(metrics.unverified_quotes, 0),
    // A report exists only when there is actual content. A conversation can be
    // "ready" with NO analysis (e.g. a seconds-long call with no transcript) —
    // that must show the empty state, not a shell of zeros. Every real report
    // has an executive summary (required by the backend schema).
    hasReport: Boolean(executiveSummary),
    shortSummary:
      firstSentence.length > MAX_SUMMARY_CHARS
        ? `${firstSentence.slice(0, MAX_SUMMARY_CHARS - 3)}…`
        : firstSentence,
  };
}
