/**
 * Dashboard — the rep's sales performance for a chosen window, and how it
 * compares with the window before it.
 *
 * Every figure comes from `analytics/summary`, which computes both windows
 * server-side; this page picks the range, arranges the sections, and says what
 * the numbers mean in plain language.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildRangeKey,
  daysAgoIso,
  formatServerRange,
  todayIso,
  type RangeMode,
} from "../dateRange";
import {
  getAnalyticsSummary,
  type AnalyticsCallRow,
  type AnalyticsSummary,
} from "../api/conversations";
import { CallPeekModal } from "./dashboard/CallPeekModal";
import { RangeControls } from "../components/RangeControls";
import type { CallFilterId } from "../outcomes";
import {
  CallsOverTimeCard,
  HabitsCard,
  KpiRow,
  LeadMixCard,
  RecentCalls,
  SignalsCard,
} from "./dashboard/cards";
import { busiestBucket, leadMix, leadVerdict, talkHabits } from "./dashboard/metrics";
import { AlertIcon, SparkIcon } from "../components/icons";
import styles from "./dashboard/Dashboard.module.css";

/** Rows shown at once. Search and the outcome filters run over the whole
 *  period, not this slice, so a lead from three weeks ago is still findable. */
const RECENT_CALLS = 8;

/** The range the page opens on, and what a custom range is prefilled with. */
const DEFAULT_RANGE: RangeMode = "30d";
const DEFAULT_CUSTOM_DAYS = 30;

export function DashboardPage() {
  const [rangeMode, setRangeMode] = useState<RangeMode>(DEFAULT_RANGE);
  const [customFrom, setCustomFrom] = useState(daysAgoIso(DEFAULT_CUSTOM_DAYS));
  const [customTo, setCustomTo] = useState(todayIso());
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // The call being previewed, and whether its play button opened it.
  const [peek, setPeek] = useState<{ call: AnalyticsCallRow; autoPlay: boolean } | null>(null);
  // Which outcome the recent-calls list is showing. Lives here because the
  // lead-mix ring selects it too, and both must read the same value.
  const [callFilter, setCallFilter] = useState<CallFilterId>("all");
  const recentCallsRef = useRef<HTMLDivElement>(null);

  // The ring and the KPI cards both filter the call list. The ring sits below
  // it and the cards above, so scrolling unconditionally would fix one and
  // break the other: pressing a card would push the cards off the top. Only
  // move when the list is not already on screen.
  const showOutcome = useCallback((outcome: CallFilterId) => {
    setCallFilter(outcome);
    const list = recentCallsRef.current;
    if (!list) return;
    const workspace = list.closest('[class*="workspace"]') as HTMLElement | null;
    if (workspace) {
      const box = list.getBoundingClientRect();
      const wsBox = workspace.getBoundingClientRect();
      const onScreen = box.top >= wsBox.top && box.bottom <= wsBox.bottom;
      if (!onScreen) {
        const relTop = box.top - wsBox.top + workspace.scrollTop;
        workspace.scrollTo({ top: relTop - workspace.clientHeight / 2 + box.height / 2, behavior: "smooth" });
      }
    }
  }, []);

  // Null while a custom range is half-filled or backwards — we keep showing the
  // previous data rather than asking the server for something nonsensical.
  const rangeKey = buildRangeKey(rangeMode, customFrom, customTo);

  useEffect(() => {
    if (rangeKey === null) return;
    let cancelled = false;
    setLoading(true);
    getAnalyticsSummary(rangeKey)
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load your dashboard.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rangeKey]);

  const mix = useMemo(() => (summary ? leadMix(summary) : null), [summary]);
  const habits = useMemo(() => (summary ? talkHabits(summary) : []), [summary]);

  if (!summary || !mix) {
    return error ? (
      <StatusPanel title="Dashboard could not be loaded" body={error} />
    ) : (
      <StatusPanel title="Loading your dashboard…" body="Gathering calls for this period." />
    );
  }

  return (
    <div className={styles.page}>
      {/* A refresh that failed leaves the previous period's numbers on screen;
          say so rather than letting them pass for the range now selected. */}
      {error && (
        <div className={styles.staleBanner}>
          <AlertIcon size={16} />
          Showing the last figures that loaded — {error}
        </div>
      )}

      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSub}>
            Your sales performance at a glance.
            {/* Changing the range refetches; without this the page looks frozen
                on the old numbers until the new ones arrive. */}
            {loading && <span className={styles.refreshing}>Updating…</span>}
          </p>
        </div>
        <RangeControls
          mode={rangeMode}
          onModeChange={setRangeMode}
          from={customFrom}
          to={customTo}
          onCustomChange={(from, to) => {
            setCustomFrom(from);
            setCustomTo(to);
          }}
          chartedDates={formatServerRange(summary.range_start, summary.range_end)}
        />
      </header>

      <KpiRow summary={summary} filter={callFilter} onSelectOutcome={showOutcome} />

      <div ref={recentCallsRef}>
        <RecentCalls
          calls={summary.calls}
          limit={RECENT_CALLS}
          filter={callFilter}
          onFilterChange={setCallFilter}
          onOpen={(call, autoPlay) => setPeek({ call, autoPlay })}
        />
      </div>

      <LeadMixCard
        summary={summary}
        mix={mix}
        verdict={leadVerdict(mix.slices, mix.total)}
        onSelectOutcome={showOutcome}
      />

      <div className={styles.twoUp}>
        <SignalsCard summary={summary} />
        <CallsOverTimeCard summary={summary} busiest={busiestBucket(summary)} />
      </div>

      <HabitsCard habits={habits} />

      <footer className={styles.pageFooter}>
        <SparkIcon size={14} />
        Clara analyzes every call to help you sell smarter and close more.
      </footer>

      {peek && (
        <CallPeekModal
          key={peek.call.id}
          call={peek.call}
          autoPlay={peek.autoPlay}
          onClose={() => setPeek(null)}
        />
      )}
    </div>
  );
}

function StatusPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className={styles.page}>
      <div className={styles.statusPanel}>
        <h2 className={styles.statusTitle}>{title}</h2>
        <p className={styles.statusBody}>{body}</p>
      </div>
    </div>
  );
}
