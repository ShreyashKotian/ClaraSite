/**
 * The search box and outcome chips that sit above a list of calls.
 *
 * Shared by the dashboard and the analytics page so the two never drift into
 * different names, different orders, or different ideas of what "at risk"
 * means — a rep moving between them is looking at the same list of calls.
 */

import type { ReactNode } from "react";
import type { AnalyticsCallRow } from "../api/conversations";
import { OUTCOME_GROUP_LABELS, OUTCOME_LABELS, type CallFilterId } from "../outcomes";
import { AlertIcon, CheckIcon, ClockIcon, GridIcon, SearchIcon, SlashCircleIcon } from "./icons";
import styles from "./CallFilters.module.css";

export type CallFilter = {
  id: CallFilterId;
  label: string;
  icon: ReactNode;
  match: (call: AnalyticsCallRow) => boolean;
};

const CALL_FILTERS: CallFilter[] = [
  { id: "all", label: "All", icon: <GridIcon size={14} />, match: () => true },
  { id: "qualified", label: OUTCOME_GROUP_LABELS.qualified, icon: <CheckIcon size={14} />, match: (c) => c.outcome === "qualified" },
  { id: "follow_up", label: OUTCOME_GROUP_LABELS.follow_up, icon: <ClockIcon size={14} />, match: (c) => c.outcome === "follow_up" },
  { id: "at_risk", label: OUTCOME_GROUP_LABELS.at_risk, icon: <AlertIcon size={14} />, match: (c) => c.outcome === "at_risk" },
  { id: "nurture", label: OUTCOME_GROUP_LABELS.nurture, icon: <SlashCircleIcon size={14} />, match: (c) => c.outcome === "nurture" },
];

/** What the search box looks through — the words a rep would remember. */
function callHaystack(call: AnalyticsCallRow): string {
  return [
    call.caller_name,
    call.rep_label,
    OUTCOME_LABELS[call.outcome],
    call.outcome_reason,
    ...call.interest_examples,
    ...call.concern_examples,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function activeCallFilter(id: CallFilterId): CallFilter {
  return CALL_FILTERS.find((item) => item.id === id) ?? CALL_FILTERS[0];
}

/** Calls matching the typed words, before the outcome chip narrows them. */
export function searchCalls(calls: AnalyticsCallRow[], query: string): AnalyticsCallRow[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return calls;
  return calls.filter((call) => callHaystack(call).includes(needle));
}

/** How many calls each chip would leave, counted after the search. */
export function countByFilter(searched: AnalyticsCallRow[]): Record<CallFilterId, number> {
  const counts = {} as Record<CallFilterId, number>;
  for (const item of CALL_FILTERS) counts[item.id] = searched.filter(item.match).length;
  return counts;
}

export function CallSearch({
  value,
  onChange,
  placeholder = "Search by lead name or keyword…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className={styles.search}>
      <SearchIcon size={15} />
      <input
        type="search"
        className={styles.searchInput}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Search calls"
      />
    </label>
  );
}

export function CallFilterChips({
  filter,
  counts,
  onChange,
}: {
  filter: CallFilterId;
  counts: Record<CallFilterId, number>;
  onChange: (id: CallFilterId) => void;
}) {
  return (
    <div className={styles.filterRow} role="group" aria-label="Filter calls by outcome">
      {CALL_FILTERS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={styles.filterChip}
          data-filter={item.id}
          data-active={item.id === filter}
          onClick={() => onChange(item.id)}
          aria-pressed={item.id === filter}
        >
          {item.icon}
          {item.label} ({counts[item.id]})
        </button>
      ))}
    </div>
  );
}

/** The line shown when a search or a chip leaves nothing to list. */
export function emptyCallMessage(query: string, filter: CallFilterId): string {
  const active = activeCallFilter(filter);
  const typed = query.trim();
  if (typed) {
    return `No calls match “${typed}”${filter === "all" ? "" : ` in ${active.label.toLowerCase()}`}.`;
  }
  return `No calls in ${active.label.toLowerCase()} for this period.`;
}
