import type { AnalyticsSummary } from "../../api/conversations";

export const TALK_LABELS: Record<AnalyticsSummary["coaching_snapshot"]["talk_balance_label"], string> = {
  balanced: "Good balance",
  rep_heavy: "You talked more",
  prospect_heavy: "They talked more",
};

export const WIN_BANDS = [
  { id: "likely" as const, label: "Strong chance (65%+)" },
  { id: "possible" as const, label: "Some chance (45–64%)" },
  { id: "unlikely" as const, label: "Low chance (under 45%)" },
];
