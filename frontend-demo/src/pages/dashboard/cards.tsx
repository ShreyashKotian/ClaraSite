/**
 * The dashboard's sections. Each takes the slice of the summary it renders and
 * nothing more, so the page reads as a running order rather than a wall of
 * markup, and a section can be moved without untangling it from its neighbours.
 */

import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  formatDuration,
  formatTimestamp,
  type AnalyticsCallRow,
  type AnalyticsSummary,
  type SignalTheme,
} from "../../api/conversations";
import {
  activeCallFilter,
  countByFilter,
  emptyCallMessage,
  searchCalls,
  CallFilterChips,
  CallSearch,
} from "../../components/CallFilters";
import { OUTCOME_LABELS, type CallFilterId } from "../../outcomes";
import { scoreTone } from "../callReview/metrics";
import { LeadDonut } from "./LeadDonut";
import {
  delta,
  habitAdvice,
  habitHeadline,
  signalVerdict,
  volumeBreakdown,
  SIGNAL_THEMES_SHOWN,
  type Delta,
  type Habit,
  type HabitId,
  type LeadMix,
  type LeadSlice,
} from "./metrics";
import {
  AlertIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  BulbIcon,
  CheckIcon,
  ClockIcon,
  HeadphonesIcon,
  LeadIcon,
  MessageIcon,
  PhoneIcon,
  PlayIcon,
  TargetIcon,
  ThumbUpIcon,
  TrendIcon,
  UserIcon,
} from "../../components/icons";
import styles from "./Dashboard.module.css";

/* ─── KPI row ───────────────────────────────────────────────────────────── */

export function KpiRow({
  summary,
  filter,
  onSelectOutcome,
}: {
  summary: AnalyticsSummary;
  /** Which outcome the call list is showing, so the matching card can say so. */
  filter: CallFilterId;
  onSelectOutcome: (outcome: CallFilterId) => void;
}) {
  const now = summary.pipeline_outlook;
  const before = summary.previous_period;

  return (
    <div className={styles.kpiRow}>
      <Kpi
        icon={<PhoneIcon size={19} />}
        label="Total calls"
        value={summary.total_conversations}
        change={delta(summary.total_conversations, before.total_conversations)}
        filter="all"
        activeFilter={filter}
        onSelect={onSelectOutcome}
      />
      <Kpi
        icon={<LeadIcon size={19} />}
        label="Good leads"
        value={now.qualified_calls}
        change={delta(now.qualified_calls, before.qualified_calls)}
        filter="qualified"
        activeFilter={filter}
        onSelect={onSelectOutcome}
      />
      <Kpi
        icon={<ClockIcon size={19} />}
        tone="amber"
        label="Needs follow-up"
        value={now.follow_up_calls}
        // Fewer of these is an improvement, so a drop shows green.
        change={delta(now.follow_up_calls, before.follow_up_calls, true)}
        filter="follow_up"
        activeFilter={filter}
        onSelect={onSelectOutcome}
      />
      <Kpi
        icon={<AlertIcon size={19} />}
        tone="red"
        label="Needs attention"
        value={now.at_risk_calls}
        change={delta(now.at_risk_calls, before.at_risk_calls, true)}
        filter="at_risk"
        activeFilter={filter}
        onSelect={onSelectOutcome}
      />
      {/* No filter: an average is not a group of calls, so there is nothing for
          the list below to narrow to. Stays a plain card rather than a button
          that would do nothing when pressed. */}
      <Kpi
        icon={<TargetIcon size={19} />}
        tone="violet"
        label="Avg close chance"
        value={`${summary.avg_conversion_pct}%`}
        change={delta(summary.avg_conversion_pct, before.avg_conversion_pct)}
      />
    </div>
  );
}

function Kpi({
  icon,
  tone = "green",
  label,
  value,
  change,
  filter,
  activeFilter,
  onSelect,
}: {
  icon: ReactNode;
  tone?: "green" | "amber" | "red" | "violet";
  label: string;
  value: number | string;
  change: Delta;
  /** The outcome this card stands for. Absent on cards that name no group. */
  filter?: CallFilterId;
  activeFilter?: CallFilterId;
  onSelect?: (outcome: CallFilterId) => void;
}) {
  const body = (
    <>
      <span className={styles.kpiTop}>
        <span className={styles.kpiIcon} data-tone={tone}>
          {icon}
        </span>
        <span className={styles.kpiLabel}>{label}</span>
      </span>
      <span className={styles.kpiBottom}>
        <strong className={styles.kpiValue}>{value}</strong>
        {!change.comparable ? (
          <span className={styles.kpiAgainst}>no prior data</span>
        ) : change.pct === 0 ? (
          <span className={styles.kpiAgainst}>no change</span>
        ) : (
          <span className={styles.kpiDelta} data-direction={change.direction}>
            {change.pct > 0 ? <ArrowUpIcon size={12} /> : <ArrowDownIcon size={12} />}
            {Math.abs(change.pct)}%
            <span className={styles.kpiAgainst}>vs last period</span>
          </span>
        )}
      </span>
    </>
  );

  if (!filter || !onSelect) {
    return <div className={styles.kpi}>{body}</div>;
  }

  return (
    <button
      type="button"
      className={styles.kpi}
      data-clickable="true"
      data-active={filter === activeFilter}
      onClick={() => onSelect(filter)}
      aria-pressed={filter === activeFilter}
      aria-label={`Show ${label.toLowerCase()} in the call list`}
    >
      {body}
    </button>
  );
}

/* ─── Recent calls ──────────────────────────────────────────────────────── */

/**
 * The outcome filters, in the order a rep triages them: everything, then the
 * ones worth time, then the ones at risk, then the ones that are over.
 * "nurture" and "pending" have no chip of their own — they are reachable
 * through All, and a chip each would push the row to seven.
 */
export function RecentCalls({
  calls,
  limit,
  filter,
  onFilterChange,
  onOpen,
}: {
  calls: AnalyticsCallRow[];
  limit: number;
  /** Controlled, because the lead-mix ring selects filters here too. */
  filter: CallFilterId;
  onFilterChange: (filter: CallFilterId) => void;
  onOpen: (call: AnalyticsCallRow, autoPlay: boolean) => void;
}) {
  const [query, setQuery] = useState("");

  // Counts come from the search results, not the whole period, so a chip never
  // promises rows that the current search has already excluded.
  const searched = useMemo(() => searchCalls(calls, query), [calls, query]);
  const counts = useMemo(() => countByFilter(searched), [searched]);

  const matched = searched.filter(activeCallFilter(filter).match);
  const shown = matched.slice(0, limit);

  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <h2 className={styles.cardTitle}>Recent calls</h2>
          <p className={styles.cardSub}>Explore and analyse your sales conversations.</p>
        </div>
        <div className={styles.headRight}>
          <CallSearch value={query} onChange={setQuery} />
          <Link to="/analytics" className={styles.cardLink}>
            View all calls <ArrowRightIcon size={14} />
          </Link>
        </div>
      </div>

      <CallFilterChips filter={filter} counts={counts} onChange={onFilterChange} />

      {calls.length === 0 ? (
        <p className={styles.empty}>No calls in this period yet.</p>
      ) : shown.length === 0 ? (
        <p className={styles.empty}>{emptyCallMessage(query, filter)}</p>
      ) : (
        <>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Call</th>
                  <th>Lead</th>
                  <th>Result</th>
                  <th>Interest</th>
                  <th>What they said</th>
                  <th>Length</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((call) => (
                  <CallRow key={call.id} call={call} onOpen={onOpen} />
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.tableFoot}>
            Showing {shown.length} of {matched.length} call{matched.length === 1 ? "" : "s"}
          </p>
        </>
      )}
    </section>
  );
}

function CallRow({
  call,
  onOpen,
}: {
  call: AnalyticsCallRow;
  onOpen: (call: AnalyticsCallRow, autoPlay: boolean) => void;
}) {
  const interest = call.interest_score;
  return (
    <tr
      className={styles.callRow}
      onClick={() => onOpen(call, false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(call, false);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Overview of the call on ${formatTimestamp(call.started_at)}`}
    >
      <td>
        <span className={styles.callCell}>
          <button
            type="button"
            className={styles.playDot}
            disabled={!call.has_audio}
            title={call.has_audio ? "Play this recording" : "No recording for this call"}
            aria-label={call.has_audio ? "Play this recording" : "No recording for this call"}
            onClick={(e) => {
              e.stopPropagation();
              onOpen(call, true);
            }}
          >
            <PlayIcon size={11} />
          </button>
          {formatTimestamp(call.started_at)}
        </span>
      </td>
      <td>{call.caller_name || "—"}</td>
      <td>
        <span className={styles.outcomePill} data-outcome={call.outcome}>
          {OUTCOME_LABELS[call.outcome]}
        </span>
      </td>
      <td>
        {/* No bar for an unreviewed call — an empty track next to a dash reads
            as a broken chart rather than as "nothing scored yet". */}
        {interest === null ? (
          <span className={styles.interestNone}>Not scored</span>
        ) : (
          <span className={styles.interestCell} title={`Interest score: ${interest} out of 100`}>
            <span className={styles.interestValue}>{interest}</span>
            <span className={styles.interestTrack}>
              <span
                className={styles.interestFill}
                data-tone={scoreTone(interest)}
                style={{ width: `${interest}%` }}
              />
            </span>
          </span>
        )}
      </td>
      <td>
        <span className={styles.saidCell}>
          <span className={styles.saidItem}>
            <span className={styles.saidDot} />
            {call.buying_signals} positive
          </span>
          <span className={styles.saidItem}>
            <span className={styles.saidDot} data-tone="bad" />
            {call.objections} {call.objections === 1 ? "concern" : "concerns"}
          </span>
        </span>
      </td>
      <td>{formatDuration(call.duration_sec)}</td>
      <td>
        <Link
          to={`/conversations/${call.id}`}
          className={styles.reviewBtn}
          onClick={(e) => e.stopPropagation()}
        >
          Review
        </Link>
      </td>
    </tr>
  );
}

/* ─── Lead mix ──────────────────────────────────────────────────────────── */

export function LeadMixCard({
  summary,
  mix,
  verdict,
  onSelectOutcome,
}: {
  summary: AnalyticsSummary;
  mix: LeadMix;
  verdict: { tone: string; headline: string; detail: string };
  /** Show just this outcome's calls in the list above. */
  onSelectOutcome: (outcome: LeadSlice["id"]) => void;
}) {
  // The donut counts the reviewed calls on this page. Once a period runs past
  // the page the server sends, the rest are simply not here — which is not the
  // same as waiting for review, so the note only speaks for what it can see.
  const unreviewed = summary.analyzed_conversations - mix.total;
  const awaitingReview = summary.calls_truncated
    ? 0
    : summary.total_conversations - summary.analyzed_conversations + Math.max(0, unreviewed);

  return (
    <section className={styles.card}>
      <div className={styles.leadMix}>
        <LeadDonut
          slices={mix.slices}
          total={mix.total}
          onSelect={(slice) => onSelectOutcome(slice.id)}
        />
        <div>
          <h2 className={styles.leadHeadline} data-tone={verdict.tone}>
            {verdict.headline}
          </h2>
          <p className={styles.leadText}>{verdict.detail}</p>
          <ul className={styles.legend}>
            {mix.slices.map((slice) => (
              <li key={slice.id}>
                <button
                  type="button"
                  className={styles.legendRow}
                  disabled={slice.count === 0}
                  onClick={() => onSelectOutcome(slice.id)}
                  title={slice.count > 0 ? `Show the ${slice.count} calls in ${slice.label}` : undefined}
                >
                  <span className={styles.legendDot} style={{ background: slice.color }} />
                  {slice.label}
                  <span className={styles.legendCount}>
                    {slice.count} ({slice.pct}%)
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {awaitingReview > 0 && (
            <p className={styles.legendNote}>
              Based on {mix.total} reviewed {mix.total === 1 ? "call" : "calls"} — {awaitingReview}{" "}
              still awaiting review.
            </p>
          )}
        </div>
        <div className={styles.leadAside}>
          <div>
            <span className={styles.asideLabel}>Calls made</span>
            <strong className={styles.asideValue}>{summary.total_conversations}</strong>
            <span className={styles.asideNote}>{summary.analyzed_conversations} AI reviewed</span>
          </div>
          <div className={styles.asidePair}>
            <div>
              <strong className={styles.asideStat}>
                {formatDuration(summary.avg_duration_sec)}
              </strong>
              <span className={styles.asideNote}>Avg. length</span>
            </div>
            <div>
              <strong className={styles.asideStat}>
                {summary.coaching_snapshot.avg_response_sec != null
                  ? `${summary.coaching_snapshot.avg_response_sec}s`
                  : "—"}
              </strong>
              <span className={styles.asideNote}>Avg. reply</span>
            </div>
          </div>
          <Link to="/analytics" className={styles.cardLink}>
            View full report <ArrowRightIcon size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── What customers told you ───────────────────────────────────────────── */

export function SignalsCard({ summary }: { summary: AnalyticsSummary }) {
  const { buying_signals_total: positives, objections_total: concerns } = summary.signal_balance;
  // Both bars share a scale so their lengths can be compared.
  const scale = Math.max(positives, concerns, 1);
  const { buying_themes: liked, objection_themes: worried } = summary.signal_balance;

  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>What customers told you</h2>
      </div>
      <SignalBar
        icon={<ThumbUpIcon size={19} />}
        label="Positive signs"
        count={positives}
        max={scale}
        themes={liked}
      />
      <SignalBar
        icon={<AlertIcon size={19} />}
        tone="bad"
        label="Concerns raised"
        count={concerns}
        max={scale}
        themes={worried}
      />
      <div className={styles.tipBox}>
        <BulbIcon size={18} />
        <span className={styles.tipText}>{signalVerdict(summary)}</span>
      </div>
    </section>
  );
}

function SignalBar({
  icon,
  tone = "good",
  label,
  count,
  max,
  themes,
}: {
  icon: ReactNode;
  tone?: "good" | "bad";
  label: string;
  count: number;
  max: number;
  /** What the number was about, grouped and counted. */
  themes: SignalTheme[];
}) {
  const [open, setOpen] = useState(false);
  const shown = themes.slice(0, SIGNAL_THEMES_SHOWN);
  // Whatever the themes do not account for: the smaller groups, plus any
  // signal the analysis counted without leaving a phrase behind it.
  const rest = count - shown.reduce((sum, theme) => sum + theme.count, 0);

  return (
    <div
      className={styles.signalRow}
      tabIndex={0}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span className={styles.signalIcon} data-tone={tone}>
        {icon}
      </span>
      <div className={styles.signalBody}>
        <div className={styles.signalTop}>
          <span className={styles.signalName}>{label}</span>
          <span className={styles.signalCount}>{count}</span>
        </div>
        <div className={styles.signalTrack}>
          <div
            className={styles.signalFill}
            data-tone={tone}
            style={{ width: `${Math.round((count / max) * 100)}%` }}
          />
        </div>
      </div>
      {open && shown.length > 0 && (
        <div className={styles.signalTip}>
          {shown.map((theme) => (
            <span key={theme.label} className={styles.signalTheme} data-tone={tone}>
              {theme.label}
              <span className={styles.signalThemeCount}>{theme.count}</span>
            </span>
          ))}
          {rest > 0 && <span className={styles.signalTipMore}>+{rest} more</span>}
        </div>
      )}
    </div>
  );
}

/* ─── Calls over time ───────────────────────────────────────────────────── */

/**
 * Evenly-spaced whole-number gridlines that cover the tallest bar.
 *
 * Dividing the peak into equal parts gives fractional steps that round to
 * uneven labels (0, 2, 3, 5, 6, 8); stepping by 1, 2 or 5 keeps the axis
 * readable and the gridlines honest.
 */
function axisTicks(peak: number): number[] {
  const wanted = 4;
  const rough = Math.max(1, peak / wanted);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? magnitude * 10;
  const top = Math.ceil(peak / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

export function CallsOverTimeCard({
  summary,
  busiest,
}: {
  summary: AnalyticsSummary;
  busiest: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const buckets = summary.weekly_volume;
  const ticks = axisTicks(Math.max(...buckets.map((b) => b.count), 1));
  // Bars are measured against the top gridline, so a bar's height matches the
  // scale beside it rather than always filling the plot.
  const axisMax = ticks[ticks.length - 1];

  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>Calls over time</h2>
        <span className={styles.asideNote}>By {summary.volume_bucket_unit}</span>
      </div>
      {buckets.length === 0 ? (
        <p className={styles.empty}>No calls in this period yet.</p>
      ) : (
        <div className={styles.chart}>
          <div className={styles.chartAxis}>
            {ticks.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>
          {/* A 90-day range has more buckets than fit; they scroll rather than
              spilling out of the card. */}
          <div className={styles.chartScroll}>
            <div className={styles.chartBars}>
              {buckets.map((bucket) => (
                <div
                  key={bucket.label}
                  className={styles.chartCol}
                  tabIndex={0}
                  aria-label={`${bucket.label}: ${bucket.count} calls`}
                  onMouseEnter={() => setHovered(bucket.label)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(bucket.label)}
                  onBlur={() => setHovered(null)}
                >
                  <span className={styles.chartCount}>{bucket.count}</span>
                  <span
                    className={styles.chartBar}
                    data-empty={bucket.count === 0}
                    style={{ height: `${Math.max(2, (bucket.count / axisMax) * 100)}%` }}
                  />
                  <span className={styles.chartLabel}>{bucket.label}</span>
                </div>
              ))}
            </div>
          </div>
          {hovered && <VolumeTooltip summary={summary} bucketLabel={hovered} />}
        </div>
      )}
      <div className={styles.chartFoot}>
        {busiest && (
          <p className={styles.chartNote}>
            <TrendIcon size={16} />
            {busiest}
          </p>
        )}
        <Link to="/analytics" className={styles.chartFootLink}>
          View all calls <ArrowRightIcon size={14} />
        </Link>
      </div>
    </section>
  );
}

/** What one bar is made of, by outcome. */
function VolumeTooltip({
  summary,
  bucketLabel,
}: {
  summary: AnalyticsSummary;
  bucketLabel: string;
}) {
  const breakdown = volumeBreakdown(summary, bucketLabel);
  if (!breakdown || breakdown.count === 0) return null;

  return (
    <div className={styles.volumeTip}>
      <span className={styles.volumeTipHead}>
        {breakdown.count} call{breakdown.count === 1 ? "" : "s"}
      </span>
      <span className={styles.volumeTipRange}>{breakdown.label}</span>
      <ul className={styles.volumeTipList}>
        {breakdown.rows.map((row) => (
          <li key={row.label}>
            <span className={styles.legendDot} style={{ background: row.color }} />
            {row.count} {row.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── How you talk on calls ─────────────────────────────────────────────── */

/** Which icon fronts each metric, so the four read as a set. */
const HABIT_ICONS: Record<HabitId, ReactNode> = {
  talk: <UserIcon size={16} />,
  listening: <HeadphonesIcon size={16} />,
  questions: <MessageIcon size={16} />,
  response: <ClockIcon size={16} />,
};

export function HabitsCard({ habits }: { habits: Habit[] }) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <h2 className={styles.cardTitle}>How you talk on calls</h2>
          <p className={styles.cardSub}>Key conversation metrics from your calls.</p>
        </div>
        <Link to="/analytics" className={styles.habitTip} title={habitAdvice(habits)}>
          <BulbIcon size={14} />
          {habitHeadline(habits)}
          <ArrowRightIcon size={13} />
        </Link>
      </div>
      <div className={styles.habits}>
        <div className={styles.habitGrid}>
          {habits.map((habit) => (
            <div key={habit.id} className={styles.habitCard}>
              <div className={styles.habitTop}>
                <span className={styles.habitIcon} data-habit={habit.id}>
                  {HABIT_ICONS[habit.id]}
                </span>
                <span className={styles.habitName} title={habit.hint}>
                  {habit.label}
                </span>
              </div>
              <div className={styles.habitValueRow}>
                <strong className={styles.habitValue}>{habit.value}</strong>
                {habit.unit && <span className={styles.habitUnit}>{habit.unit}</span>}
                {habit.change && (
                  <span className={styles.habitChange} data-better={habit.change.better}>
                    {habit.change.text}
                  </span>
                )}
              </div>
              <div className={styles.habitTrack}>
                <div
                  className={styles.habitFill}
                  data-met={habit.met}
                  style={{ width: `${Math.round(habit.fill * 100)}%` }}
                />
              </div>
              <span className={styles.habitGoal}>{habit.goal}</span>
              <span className={styles.habitStatus} data-met={habit.met}>
                {habit.met ? <CheckIcon size={12} /> : <AlertIcon size={12} />}
                {habit.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
