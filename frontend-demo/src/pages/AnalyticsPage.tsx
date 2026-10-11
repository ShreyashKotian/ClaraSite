/**
 * Call insights — the same window the dashboard summarises, opened up.
 *
 * Where the dashboard answers "how am I doing?", this page answers "which
 * calls?": every chart is a filter, and clicking one lists the calls behind
 * that number.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  formatDuration,
  formatTimestamp,
  getAnalyticsSummary,
  type AnalyticsCallRow,
  type AnalyticsSummary,
} from "../api/conversations";
import { downloadTranscriptTxt } from "../utils/downloadTranscript";
import { RangeControls } from "../components/RangeControls";
import {
  activeCallFilter,
  countByFilter,
  emptyCallMessage,
  searchCalls,
  CallFilterChips,
  CallSearch,
} from "../components/CallFilters";
import { AlertIcon, BulbIcon, FileIcon, TrendIcon } from "../components/icons";
import {
  buildRangeKey,
  daysAgoIso,
  formatServerRange,
  todayIso,
  type RangeMode,
} from "../dateRange";
import { scoreTone } from "./callReview/metrics";
import { TALK_LABELS } from "./analytics/constants";
import { OUTCOME_LABELS, type CallFilterId } from "../outcomes";
import { DrilldownModal } from "./analytics/DrilldownModal";
import type { Drilldown } from "./analytics/drilldown";
import {
  buildSignalBars,
  buildVolumeBars,
  buildWinBands,
  describeCoaching,
  describeSignalBalance,
  formatScore,
} from "./analytics/metrics";
import styles from "./analytics/Analytics.module.css";

/** Rows in the call table — enough to scan a period without paging. */
const RECENT_CALL_LIMIT = 20;

const DEFAULT_RANGE: RangeMode = "30d";
const DEFAULT_CUSTOM_DAYS = 30;

export function AnalyticsPage() {
  const [rangeMode, setRangeMode] = useState<RangeMode>(DEFAULT_RANGE);
  const [customFrom, setCustomFrom] = useState(daysAgoIso(DEFAULT_CUSTOM_DAYS));
  const [customTo, setCustomTo] = useState(todayIso());
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drilldown, setDrilldown] = useState<Drilldown | null>(null);
  const [callQuery, setCallQuery] = useState("");
  const [callFilter, setCallFilter] = useState<CallFilterId>("all");
  // Stable, so the modal's Escape handler is not rebuilt on every render of
  // this page — which would also re-steal focus back to its close button.
  const closeDrilldown = useCallback(() => setDrilldown(null), []);

  // Null while a custom range is half-filled or backwards — we keep showing
  // the last good result instead of asking the server for an impossible span.
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
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load your insights.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rangeKey]);

  const volumeBars = useMemo(() => buildVolumeBars(summary), [summary]);
  const winBands = useMemo(() => buildWinBands(summary), [summary]);
  const signalBars = useMemo(() => buildSignalBars(summary), [summary]);

  if (!summary) {
    return error ? (
      <StatusPanel title="Insights could not be loaded" body={error} />
    ) : (
      <StatusPanel title="Loading your insights…" body="Gathering calls for this period." />
    );
  }

  const searched = searchCalls(summary.calls, callQuery);
  const counts = countByFilter(searched);
  const matched = searched.filter(activeCallFilter(callFilter).match);
  const calls = matched.slice(0, RECENT_CALL_LIMIT);
  const coaching = summary.coaching_snapshot;
  const repTalkPct = summary.avg_rep_talk_pct;
  const prospectTalkPct = Math.max(0, Math.round(100 - repTalkPct));
  const analyzed = summary.analyzed_conversations;
  const reviewedPct = summary.total_conversations
    ? Math.round((analyzed / summary.total_conversations) * 100)
    : 0;
  const peakVolume = Math.max(...volumeBars.map((bar) => bar.count), 1);

  return (
    <div className={styles.page}>
      {error && (
        <div className={styles.staleBanner}>
          <AlertIcon size={16} />
          Showing the last figures that loaded — {error}
        </div>
      )}

      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Call insights</h1>
          <p className={styles.pageSub}>
            Which calls are worth following up, where customers had concerns, and how well you
            listened. Click any chart to see the calls behind it.
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

      <div className={styles.statRow}>
        <Stat label="Saved calls" value={summary.total_conversations} note="in this period" />
        <Stat
          label="Reviewed"
          value={`${reviewedPct}%`}
          note={`${analyzed} of ${summary.total_conversations} analysed`}
        />
        <Stat label="Avg interest" value={formatScore(summary.avg_interest_score)} note="out of 100" />
        <Stat label="Avg close chance" value={`${summary.avg_conversion_pct}%`} note="across reviewed calls" />
        <Stat label="Listening score" value={coaching.listening_index} note={TALK_LABELS[coaching.talk_balance_label]} />
      </div>

      <div className={styles.cardGrid}>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Call volume</h2>
            <p className={styles.cardCaption}>
              {formatServerRange(summary.range_start, summary.range_end)} ·{" "}
              {summary.total_conversations} total
            </p>
          </div>
          {volumeBars.length === 0 ? (
            <p className={styles.empty}>No calls in this period yet.</p>
          ) : (
            <div className={styles.chart}>
              <div className={styles.chartScroll}>
                <div className={styles.chartBars}>
                  {volumeBars.map((bar) => (
                    <button
                      key={bar.label}
                      type="button"
                      className={styles.chartCol}
                      onClick={() => setDrilldown({ type: "volume", period: bar.label })}
                      aria-label={`${bar.label}: ${bar.count} calls`}
                    >
                      <span className={styles.chartCount}>{bar.count}</span>
                      <span
                        className={styles.chartBar}
                        data-empty={bar.count === 0}
                        style={{ height: `${Math.max(2, (bar.count / peakVolume) * 100)}%` }}
                      />
                      <span className={styles.chartLabel}>{bar.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <p className={styles.cardFoot}>
            <TrendIcon size={16} />
            Click a bar to list the calls from that period.
          </p>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Chance to close</h2>
            <p className={styles.cardCaption}>
              How the reviewed calls split by likelihood of closing
            </p>
          </div>
          <div className={styles.barList}>
            {winBands.map((band) => (
              <button
                key={band.id}
                type="button"
                className={styles.barRow}
                onClick={() => setDrilldown({ type: "win_band", band: band.id })}
                aria-label={`${band.label}: ${band.count} calls`}
              >
                <span className={styles.barTop}>
                  <span className={styles.barLabel}>{band.label}</span>
                  <span className={styles.barValue}>
                    {band.count} ({band.pct}%)
                  </span>
                </span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    data-tone={band.id === "likely" ? "good" : band.id === "possible" ? "mid" : "bad"}
                    style={{ width: `${band.pct}%` }}
                  />
                </span>
              </button>
            ))}
          </div>
          <p className={styles.cardFoot}>
            <BulbIcon size={16} />
            Avg close chance {summary.avg_conversion_pct}% · avg interest{" "}
            {formatScore(summary.avg_interest_score)}
          </p>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Customer cues</h2>
            <p className={styles.cardCaption}>Interest against concerns, picked up across calls</p>
          </div>
          {signalBars.length === 0 ? (
            <p className={styles.empty}>Nothing picked up in this period yet.</p>
          ) : (
            <div className={styles.barList}>
              {signalBars.map((bar) => (
                <button
                  key={bar.id}
                  type="button"
                  className={styles.barRow}
                  onClick={() => setDrilldown({ type: "signals", signal: bar.id })}
                  aria-label={`${bar.label}: ${bar.count}`}
                >
                  <span className={styles.barTop}>
                    <span className={styles.barLabel}>{bar.label}</span>
                    <span className={styles.barValue}>
                      {bar.count} ({bar.avg}/call)
                    </span>
                  </span>
                  <span className={styles.barTrack}>
                    <span
                      className={styles.barFill}
                      data-tone={bar.tone === "positive" ? "good" : "bad"}
                      style={{ width: `${bar.pct}%` }}
                    />
                  </span>
                </button>
              ))}
            </div>
          )}
          <p className={styles.cardFoot}>
            <BulbIcon size={16} />
            {describeSignalBalance(summary.signal_balance.net_signal_score, analyzed)}
          </p>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>How you spoke</h2>
            <p className={styles.cardCaption}>
              Talk balance · avg length {formatDuration(summary.avg_duration_sec)}
            </p>
          </div>
          <div className={styles.talkTop}>
            <span
              className={styles.talkPill}
              data-balanced={coaching.talk_balance_label === "balanced"}
            >
              {TALK_LABELS[coaching.talk_balance_label]}
            </span>
            <span className={styles.talkSplit}>
              You {repTalkPct}% · Them {prospectTalkPct}%
            </span>
          </div>
          <div className={styles.splitBar}>
            <span className={styles.splitRep} style={{ width: `${repTalkPct}%` }} />
            <span className={styles.splitProspect} style={{ width: `${prospectTalkPct}%` }} />
          </div>
          <div className={styles.miniGrid}>
            <Mini
              value={coaching.avg_rep_questions}
              label="Questions asked"
              onOpen={() => setDrilldown({ type: "coaching", focus: "questions" })}
            />
            <Mini
              value={coaching.listening_index}
              label="Listening score"
              onOpen={() => setDrilldown({ type: "coaching", focus: "listening" })}
            />
            <Mini
              value={coaching.avg_response_sec != null ? `${coaching.avg_response_sec}s` : "—"}
              label="Avg response time"
              onOpen={() => setDrilldown({ type: "coaching", focus: "response" })}
            />
          </div>
          <p className={styles.cardFoot}>
            <BulbIcon size={16} />
            {describeCoaching(coaching, repTalkPct)}
          </p>
        </section>
      </div>

      <section className={styles.card}>
        <div className={`${styles.cardHead} ${styles.cardHeadRow}`}>
          <div>
            <h2 className={styles.cardTitle}>Calls in this period</h2>
            <p className={styles.cardCaption}>
              {calls.length === matched.length
                ? `${calls.length} call${calls.length === 1 ? "" : "s"}`
                : `Showing ${calls.length} of ${matched.length}`}
            </p>
          </div>
          <CallSearch value={callQuery} onChange={setCallQuery} />
        </div>

        <CallFilterChips filter={callFilter} counts={counts} onChange={setCallFilter} />

        {summary.calls.length === 0 ? (
          <p className={styles.empty}>No calls in this period yet.</p>
        ) : calls.length === 0 ? (
          <p className={styles.empty}>{emptyCallMessage(callQuery, callFilter)}</p>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Call</th>
                  <th>Client</th>
                  <th>Result</th>
                  <th>Interest</th>
                  <th>Close chance</th>
                  <th>Length</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => (
                  <CallRow key={call.id} call={call} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <DrilldownModal
        drilldown={drilldown}
        summary={summary}
        onClose={closeDrilldown}
      />
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: number | string; note: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <strong className={styles.statValue}>{value}</strong>
      <span className={styles.statNote}>{note}</span>
    </div>
  );
}

/** One coaching average, and a way into the calls it was taken over. */
function Mini({
  value,
  label,
  onOpen,
}: {
  value: number | string;
  label: string;
  onOpen: () => void;
}) {
  return (
    <button type="button" className={styles.mini} onClick={onOpen}>
      <strong className={styles.miniValue}>{value}</strong>
      <span className={styles.miniLabel}>{label}</span>
    </button>
  );
}

function CallRow({ call }: { call: AnalyticsCallRow }) {
  return (
    <tr>
      <td className={styles.callName}>{formatTimestamp(call.started_at)}</td>
      <td>{call.caller_name || "—"}</td>
      <td>
        <span className={styles.outcomePill} data-outcome={call.outcome}>
          {OUTCOME_LABELS[call.outcome]}
        </span>
      </td>
      <td className={styles.scoreCell} data-tone={scoreTone(call.interest_score ?? 0)}>
        {formatScore(call.interest_score)}
      </td>
      <td className={styles.scoreCell}>
        {call.conversion_pct === null ? "—" : `${call.conversion_pct}%`}
      </td>
      <td>{formatDuration(call.duration_sec)}</td>
      <td>
        <span className={styles.rowActions}>
          <button
            type="button"
            className={styles.iconButton}
            title="Download the transcript"
            aria-label={`Download the transcript for the call on ${formatTimestamp(call.started_at)}`}
            onClick={() => void downloadTranscriptTxt(call.id)}
          >
            <FileIcon size={15} />
          </button>
          <Link to={`/conversations/${call.id}`} className={styles.reviewBtn}>
            Review
          </Link>
        </span>
      </td>
    </tr>
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
