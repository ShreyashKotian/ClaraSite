/**
 * View model for the Dashboard.
 *
 * Everything here comes from `analytics/summary`. The only arithmetic is
 * comparing this period against the one before it — the server computes both
 * windows, so a delta is two real numbers subtracted, never an estimate.
 */

import { OUTCOME_COLORS, OUTCOME_GROUP_LABELS, type CallOutcome } from "../../outcomes";

/** A call the page did not receive. Reads as unreviewed, which is all a rep
 *  can truthfully be told about it from here. */
const UNKNOWN_OUTCOME = "pending" as const;
import type { AnalyticsSummary } from "../../api/conversations";

type DeltaDirection = "better" | "worse" | "flat";

export type Delta = {
  pct: number;
  direction: DeltaDirection;
  /** False when the previous period had nothing to compare against. */
  comparable: boolean;
};

/**
 * Percentage change against the previous period.
 *
 * `lowerIsBetter` matters: fewer at-risk calls is an improvement, and colouring
 * that drop red would tell the rep off for doing well.
 */
export function delta(current: number, previous: number, lowerIsBetter = false): Delta {
  if (previous <= 0) {
    return { pct: 0, direction: "flat", comparable: false };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { pct, direction: "flat", comparable: true };
  const rose = pct > 0;
  return { pct, direction: rose !== lowerIsBetter ? "better" : "worse", comparable: true };
}

export type LeadSlice = {
  id: "qualified" | "follow_up" | "at_risk" | "nurture";
  label: string;
  count: number;
  pct: number;
  color: string;
  /** Who is in this slice, newest call first — the donut names them on hover. */
  leads: string[];
};

export type LeadMix = { slices: LeadSlice[]; total: number };

/** The outcome mix behind the donut, in the order the legend reads. */
export function leadMix(summary: AnalyticsSummary): LeadMix {
  const counts: Record<LeadSlice["id"], number> = {
    qualified: 0,
    follow_up: 0,
    at_risk: 0,
    nurture: 0,
  };
  const leads: Record<LeadSlice["id"], string[]> = {
    qualified: [],
    follow_up: [],
    at_risk: [],
    nurture: [],
  };
  for (const call of summary.calls) {
    if (!(call.outcome in counts)) continue;
    const id = call.outcome as LeadSlice["id"];
    counts[id] += 1;
    // An unnamed call still counts; it just has nothing to show in the list.
    if (call.caller_name) leads[id].push(call.caller_name);
  }

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const shape: LeadSlice["id"][] = ["qualified", "follow_up", "at_risk", "nurture"];

  return {
    total,
    slices: shape.map((id) => ({
      id,
      label: OUTCOME_GROUP_LABELS[id],
      color: OUTCOME_COLORS[id],
      count: counts[id],
      pct: total > 0 ? Math.round((counts[id] / total) * 100) : 0,
      leads: leads[id],
    })),
  };
}

/** More than half the reviewed calls looking strong is a good period. */
const STRONG_LEAD_SHARE_PCT = 50;

/** Headline for the lead mix — what the numbers mean, in one line. */
export function leadVerdict(slices: LeadSlice[], total: number) {
  const strong = slices.find((s) => s.id === "qualified")?.count ?? 0;
  const followUp = slices.find((s) => s.id === "follow_up")?.count ?? 0;
  const atRisk = slices.find((s) => s.id === "at_risk")?.count ?? 0;
  const strongPct = total > 0 ? Math.round((strong / total) * 100) : 0;

  if (total === 0) {
    return { tone: "mid" as const, headline: "No calls yet", detail: "Analysed calls appear here." };
  }
  if (strongPct >= STRONG_LEAD_SHARE_PCT) {
    return {
      tone: "high" as const,
      headline: "Your leads are strong",
      detail: followUp
        ? `Most customers showed high interest. Focus on ${followUp} follow-up${followUp === 1 ? "" : "s"} to convert more leads.`
        : "Most customers showed high interest.",
    };
  }
  if (atRisk > strong) {
    return {
      tone: "low" as const,
      headline: "Too many calls are slipping",
      detail: `${atRisk} of ${total} need attention. Work the objections before the next call.`,
    };
  }
  return {
    tone: "mid" as const,
    headline: "Leads need working",
    detail: `${strong} of ${total} look strong. The rest need a clear next step.`,
  };
}

export type HabitId = "talk" | "listening" | "questions" | "response";

export type Habit = {
  id: HabitId;
  label: string;
  /** What the number means, shown on the label's info affordance. */
  hint: string;
  value: string;
  /** Rendered smaller beside the value, e.g. "/ call". */
  unit?: string;
  goal: string;
  /** How full the bar is, 0–1. */
  fill: number;
  met: boolean;
  /** Where this sits against the goal, in the rep's words. */
  status: string;
  /** Change against the previous period; null when there is nothing to compare. */
  change: { text: string; better: boolean } | null;
};

/** The questions bar is full at half again the goal, so beating the target
 *  still leaves headroom rather than pinning the bar at 100%. */
const QUESTIONS_BAR_HEADROOM = 1.5;
/** Same idea for response time: the bar fills as the wait approaches twice
 *  the goal, so a good number leaves visible room. */
const RESPONSE_BAR_HEADROOM = 2;

/**
 * A change is only worth showing if it is a real one — a hundredth of a
 * second is noise, and "±0" reads as a measurement rather than a move.
 */
/**
 * The movement since the last period, and whether it was in the right
 * direction.
 *
 * `band` is for a goal that is a range rather than a ceiling or a floor: talk
 * share has a healthy window, so moving down is only an improvement while the
 * rep is above it. Judged on distance from the band, a rep at 30% dropping to
 * 25% reads as worse, which is what it is.
 */
function change(
  now: number,
  before: number,
  { lowerIsBetter = false, band, unit = "", decimals = 0 }: ChangeOptions = {},
): Habit["change"] {
  if (!before) return null;
  const diff = Number((now - before).toFixed(decimals));
  if (diff === 0) return null;
  const sign = diff > 0 ? "+" : "−";
  const better = band
    ? distanceFromBand(now, band) < distanceFromBand(before, band)
    : lowerIsBetter
      ? diff < 0
      : diff > 0;
  return { text: `${sign}${Math.abs(diff).toFixed(decimals)}${unit}`, better };
}

type ChangeOptions = {
  lowerIsBetter?: boolean;
  /** Inclusive low and high ends of a goal that is a range. */
  band?: [number, number];
  unit?: string;
  decimals?: number;
};

/** How far outside the healthy window a value sits; zero when inside it. */
function distanceFromBand(value: number, [low, high]: [number, number]): number {
  if (value < low) return low - value;
  if (value > high) return value - high;
  return 0;
}

/** The four talk metrics, against the goals the server is configured with. */
export function talkHabits(summary: AnalyticsSummary): Habit[] {
  const goals = summary.talk_goals;
  const previous = summary.previous_period;
  const talk = summary.avg_rep_talk_pct;
  const listening = summary.coaching_snapshot.listening_index;
  const questions = summary.coaching_snapshot.avg_rep_questions;
  const response = summary.coaching_snapshot.avg_response_sec;

  const talkMet = talk >= goals.rep_talk_min_pct && talk <= goals.rep_talk_max_pct;
  const responseMet = response !== null && response <= goals.response_sec_max;

  return [
    {
      id: "talk",
      label: "Talk-to-listen ratio",
      hint: `Share of the call you spoke. Healthy is ${goals.rep_talk_min_pct}–${goals.rep_talk_max_pct}%.`,
      value: `${talk}%`,
      goal: `Goal: ${goals.rep_talk_min_pct}–${goals.rep_talk_max_pct}%`,
      fill: Math.min(1, talk / 100),
      met: talkMet,
      status: talkMet ? "On target" : talk > goals.rep_talk_max_pct ? "Slightly high" : "Slightly low",
      change: change(talk, previous.avg_rep_talk_pct, {
        band: [goals.rep_talk_min_pct, goals.rep_talk_max_pct],
        unit: "%",
      }),
    },
    {
      id: "listening",
      label: "Listening score",
      hint: `How much room you leave the customer, scored out of 100. Aim for ${goals.listening_min}+.`,
      value: `${listening}/100`,
      goal: `Goal: ${goals.listening_min}+`,
      fill: Math.min(1, listening / 100),
      met: listening >= goals.listening_min,
      status: listening >= goals.listening_min ? "Good" : "Needs improvement",
      change: change(listening, previous.listening_index),
    },
    {
      id: "questions",
      label: "Discovery questions",
      unit: "/ call",
      hint: `Questions you asked per call. Top calls ask ${goals.questions_per_call}+.`,
      value: `${questions}`,
      goal: `Goal: ${goals.questions_per_call}+`,
      fill: Math.min(1, questions / (goals.questions_per_call * QUESTIONS_BAR_HEADROOM)),
      met: questions >= goals.questions_per_call,
      status: questions >= goals.questions_per_call ? "Good" : "Below target",
      change: change(questions, previous.avg_rep_questions, { decimals: 1 }),
    },
    {
      id: "response",
      label: "Avg. response time",
      hint: `Dead air between the customer finishing and you starting to answer. Keep it under ${goals.response_sec_max}s.`,
      // Null when no call in the period had an answered turn to time.
      value: response === null ? "—" : `${response} sec`,
      goal: `Goal: under ${goals.response_sec_max} sec`,
      fill: response === null ? 0 : Math.min(1, response / (goals.response_sec_max * RESPONSE_BAR_HEADROOM)),
      met: responseMet,
      status: response === null ? "Not measured" : responseMet ? "Good" : "Slower than ideal",
      change:
        response === null || previous.avg_response_sec === null
          ? null
          : change(response, previous.avg_response_sec, {
              lowerIsBetter: true,
              unit: "s",
              decimals: 1,
            }),
    },
  ];
}

/** Keyed by id, not by the label on screen — renaming a habit should not
 *  silently detach its advice. The headline map below is keyed the same. */
const HABIT_ADVICE: Record<HabitId, string> = {
  talk: "Leave more room for the customer — pause after each answer and let them fill it.",
  listening: "Let the customer finish before responding. The best calls are the ones they lead.",
  questions: "Ask more discovery questions to understand customer needs better.",
  response: "Answer sooner after the customer stops — a long pause reads as hesitation on a call.",
};

/** The coaching line beside the habits — names the first habit off target. */
export function habitAdvice(habits: Habit[]): string {
  const missed = habits.find((habit) => !habit.met);
  return missed
    ? HABIT_ADVICE[missed.id]
    : "You're hitting every goal. Keep the same rhythm on the next calls.";
}

/** Four words for the pill in the header; the full line rides along as its
 *  tooltip, so the advice is a glance rather than a paragraph. */
const HABIT_HEADLINE: Record<HabitId, string> = {
  talk: "Talk less, listen more",
  listening: "Let them lead",
  questions: "Ask more questions",
  response: "Answer sooner",
};

export function habitHeadline(habits: Habit[]): string {
  const missed = habits.find((habit) => !habit.met);
  return missed ? HABIT_HEADLINE[missed.id] : "On track";
}

/** Themes shown in the signals tooltip before the rest are pooled. */
export const SIGNAL_THEMES_SHOWN = 4;

export type VolumeBreakdown = {
  label: string;
  count: number;
  /** Outcome tallies for the calls in this bucket, legend order. */
  rows: { label: string; color: string; count: number }[];
};

/**
 * What each bar of the volume chart is made of.
 *
 * A bar counts every call in its window, while outcomes are only known for
 * the ones reviewed — so anything the summary did not carry an outcome for is
 * tallied as "not reviewed" rather than quietly dropped, and the rows always
 * add up to the bar's own number.
 */
export function volumeBreakdown(summary: AnalyticsSummary, bucketLabel: string): VolumeBreakdown | null {
  const bucket = summary.weekly_volume.find((item) => item.label === bucketLabel);
  if (!bucket) return null;

  const outcomeById = new Map(summary.calls.map((call) => [call.id, call.outcome]));
  const tally: Partial<Record<CallOutcome, number>> = {};
  for (const id of bucket.call_ids) {
    // A bucket names every call in the period, while the rows above are a page
    // of the most recent ones — an older call is simply one this page cannot
    // say anything about.
    const outcome = outcomeById.get(id) ?? UNKNOWN_OUTCOME;
    tally[outcome] = (tally[outcome] ?? 0) + 1;
  }

  // A call this page never received counts as unreviewed the same way a
  // pending one does, so both ids feed the single row a rep reads.
  const shape: [CallOutcome[], CallOutcome][] = [
    [["qualified"], "qualified"],
    [["follow_up"], "follow_up"],
    [["at_risk"], "at_risk"],
    [["nurture"], "nurture"],
    [["pending", UNKNOWN_OUTCOME], "pending"],
  ];

  const rows = shape
    .map(([ids, naming]) => ({
      label: OUTCOME_GROUP_LABELS[naming],
      color: OUTCOME_COLORS[naming],
      count: ids.reduce((sum, id) => sum + (tally[id] ?? 0), 0),
    }))
    .filter((row) => row.count > 0);

  return { label: bucket.label, count: bucket.count, rows };
}

/** The line under the positive/concern bars — which way the balance fell. */
export function signalVerdict(summary: AnalyticsSummary): string {
  const { buying_signals_total: positives, objections_total: concerns } = summary.signal_balance;
  if (positives === 0 && concerns === 0) {
    return "No signals were picked up yet — they appear once calls are reviewed.";
  }
  return concerns > positives
    ? "Customers raised more concerns than positives. Address them early to increase close chances."
    : "Positives outweighed concerns. Keep naming the next step while interest is high.";
}

/** The busiest bucket in the volume chart, for the caption under it. */
export function busiestBucket(summary: AnalyticsSummary): string {
  const busiest = summary.weekly_volume.reduce(
    (best, bucket) => (bucket.count > (best?.count ?? 0) ? bucket : best),
    summary.weekly_volume[0],
  );
  if (!busiest || busiest.count === 0) return "";
  return `Most calls happened during ${busiest.label}`;
}
