/**
 * Live sentiment from the model's per-turn MOOD tags — real model output
 * aggregated with a light EMA so one grumpy turn doesn't whipsaw the widget.
 * No moods yet -> null; the widget shows a listening state, never a made-up %.
 */

import type { AnswerDoneMessage } from "../../types";

const MOOD_SCORE: Record<string, number> = { positive: 85, neutral: 55, negative: 25 };
const EMA_ALPHA = 0.4;

export interface LiveSentiment {
  score: number; // 0–100
  label: "Positive" | "Neutral" | "Needs care";
  turns: number; // how many judged turns back this number
}

export function computeLiveSentiment(answers: AnswerDoneMessage[]): LiveSentiment | null {
  let ema: number | null = null;
  let turns = 0;
  for (const a of answers) {
    const score = a.mood ? MOOD_SCORE[a.mood] : undefined;
    if (score === undefined) continue;
    ema = ema === null ? score : EMA_ALPHA * score + (1 - EMA_ALPHA) * ema;
    turns += 1;
  }
  if (ema === null) return null;
  const score = Math.round(ema);
  const label = score >= 68 ? "Positive" : score >= 45 ? "Neutral" : "Needs care";
  return { score, label, turns };
}
