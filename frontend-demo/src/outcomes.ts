/**
 * What each call outcome is called, everywhere it is named.
 *
 * Lives at the root rather than under a page because the dashboard, the
 * analytics page and the shared call filters all name the same five outcomes.
 * Four separate lists had already drifted: a chip reading "Not interested"
 * filtered a table whose pills read "Stay in touch", and the ring beside them
 * called the same calls "Still deciding".
 */

import type { AnalyticsCallRow } from "./api/conversations";

export type CallOutcome = AnalyticsCallRow["outcome"];

/** Every outcome a chip may select, plus the "everything" option. */
export type CallFilterId = CallOutcome | "all";

/** One call's result, on the pill in its row. */
export const OUTCOME_LABELS: Record<CallOutcome, string> = {
  qualified: "Good lead",
  follow_up: "Needs follow-up",
  at_risk: "Needs attention",
  nurture: "Not interested",
  pending: "Not reviewed",
};

/** A group of calls, on a filter chip, a ring segment or a chart tooltip. */
export const OUTCOME_GROUP_LABELS: Record<CallOutcome, string> = {
  qualified: "Good leads",
  follow_up: "Needs follow-up",
  at_risk: "Needs attention",
  nurture: "Not interested",
  pending: "Not reviewed",
};

/** The colour each outcome carries on every chart that shows the mix. */
export const OUTCOME_COLORS: Record<CallOutcome, string> = {
  qualified: "var(--green)",
  follow_up: "var(--amber)",
  at_risk: "var(--red)",
  nurture: "var(--text-faint)",
  pending: "var(--text-faint)",
};
