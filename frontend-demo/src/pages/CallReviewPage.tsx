/**
 * Post-call analysis, in reading order: the verdict (score + why + recording)
 * with how the customer felt beside it, then what needs attention (blocker,
 * next action, key moments), then how the rep did, then the raw material
 * behind it all. Every number is either measured by the backend or AI-assessed
 * with a transcript-verified quote — this page only arranges them.
 */

import { useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { formatDuration } from "../api/conversations";
import { ScoreRing } from "./callReview/charts";
import {
  BlockerCard,
  KeyMomentsCard,
  NextActionCard,
  PerformanceCard,
  SentimentCard,
} from "./callReview/cards";
import { RecordingControls } from "./callReview/RecordingControls";
import { DetailSections, type SectionKey } from "./callReview/DetailSections";
import { useRecordingPlayer } from "./callReview/useRecordingPlayer";
import {
  describeTranscriptionGaps,
  scoreTone,
  type CallReviewView,
  type ChecklistItem,
  type ScoreTone,
} from "./callReview/metrics";
import { useCallReview } from "./callReview/useCallReview";
import {
  AlertIcon,
  BuildingIcon,
  CalendarIcon,
  CheckIcon,
  ChevronIcon,
  ClockIcon,
  UserIcon,
} from "../components/icons";
import styles from "./callReview/AnalysisView.module.css";

const LEAD_LABELS: Record<ScoreTone, string> = {
  high: "GOOD LEAD",
  mid: "WARM LEAD",
  low: "AT RISK",
};

function callDate(iso: string | null | undefined): { date: string; time: string } {
  const missing = { date: "—", time: "—" };
  if (!iso) return missing;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return missing;
  return {
    date: at.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
    time: at.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
  };
}

export function CallReviewPage() {
  const { id = "" } = useParams<{ id: string }>();
  const review = useCallReview(id);
  const { conversation, vm } = review;
  // One audio element for the page: the hero and the detail tab are two views
  // of the same playback, so they can never fight over the same recording.
  const hasRecording = Boolean(conversation?.has_audio);
  const transcriptionGapsNote = describeTranscriptionGaps(conversation?.transcription_gaps);
  const player = useRecordingPlayer(id, hasRecording);
  // Held here so the summary cards can jump to the matching detail tab.
  const [activeTab, setActiveTab] = useState<SectionKey>("overview");
  const detailsRef = useRef<HTMLDivElement>(null);

  function openDetail(key: SectionKey) {
    setActiveTab(key);
    const workspace = detailsRef.current?.closest('[class*="workspace"]') as HTMLElement | null;
    if (workspace && detailsRef.current) {
      const elRect = detailsRef.current.getBoundingClientRect();
      const wsRect = workspace.getBoundingClientRect();
      const relTop = elRect.top - wsRect.top + workspace.scrollTop;
      workspace.scrollTo({ top: relTop, behavior: "smooth" });
    }
  }

  if (review.loading) {
    return <StatusPanel title="Loading call…" body="Fetching the saved analysis." />;
  }

  if (review.error) {
    return (
      <StatusPanel title="This call could not be loaded" body={review.error}>
        <button type="button" className={styles.primaryButton} onClick={() => void review.load()}>
          Try again
        </button>
      </StatusPanel>
    );
  }

  const analyzing =
    review.analysis?.status === "analyzing" ||
    review.analysis?.status === "running" ||
    conversation?.status === "analyzing";
  if (analyzing) {
    return (
      <StatusPanel
        title="AI review in progress"
        body="The report appears here automatically the moment it's ready."
      />
    );
  }

  if (!vm.hasReport) {
    return (
      <StatusPanel
        title="No AI review for this call yet"
        body={
          review.analysis?.status === "failed"
            ? "The review didn't finish. Re-analyze to try again."
            : "This call has nothing to review yet — very short calls with no transcript are skipped."
        }
      >
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => void review.handleReanalyze()}
          disabled={review.reanalyzing}
        >
          {review.reanalyzing ? "Starting…" : "Re-analyze"}
        </button>
      </StatusPanel>
    );
  }

  const tone = scoreTone(vm.interestScore);
  const when = callDate(conversation?.started_at);

  return (
    <div className={styles.page}>
      {hasRecording && <audio {...player.audioProps} />}

      <nav className={styles.breadcrumb}>
        <Link to="/">Call history</Link>
        {conversation?.caller_name && (
          <>
            <span>›</span>
            <span>{conversation.caller_name}</span>
          </>
        )}
        <span>›</span>
        <span className={styles.breadcrumbCurrent}>Call analysis</span>
      </nav>

      <header className={styles.pageHeader}>
        <div className={styles.titleRow}>
          <h1 className={styles.pageTitle}>Call analysis</h1>
          <span className={styles.statusPill}>Analysis ready</span>
        </div>
        <div className={styles.headerActions}>
          <Link to="/" className={styles.secondaryButton}>
            All calls
          </Link>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => void review.handleReanalyze()}
            disabled={review.reanalyzing}
          >
            {review.reanalyzing ? "Re-analyzing…" : "Re-analyze"}
          </button>
        </div>
      </header>

      <div className={styles.metaStrip}>
        {conversation?.caller_name && (
          <MetaChip icon={<UserIcon size={16} />} label="Customer">
            {conversation.caller_name}
          </MetaChip>
        )}
        {conversation?.project && (
          <MetaChip icon={<BuildingIcon size={16} />} label="Project">
            {conversation.project}
          </MetaChip>
        )}
        <MetaChip icon={<CalendarIcon size={16} />} label="Date">
          {when.date}
        </MetaChip>
        <MetaChip icon={<ClockIcon size={16} />} label="Time">
          {when.time}
        </MetaChip>
        <MetaChip icon={<ClockIcon size={16} />} label="Duration">
          {formatDuration(conversation?.duration_sec)}
        </MetaChip>
      </div>

      {vm.attributionWarning && (
        <div className={styles.attributionBanner}>
          <AlertIcon size={16} />
          {vm.attributionWarning}
        </div>
      )}
      {transcriptionGapsNote && (
        <div className={styles.attributionBanner}>
          <AlertIcon size={16} />
          {transcriptionGapsNote}
        </div>
      )}

      <div className={styles.heroRow}>
        <HeroCard vm={vm} tone={tone} player={hasRecording ? player : null} />
        <SentimentCard sentiment={vm.sentiment} onViewDetails={() => openDetail("timeline")} />
      </div>

      <div className={styles.cardRow}>
        <BlockerCard blocker={vm.mainBlocker} />
        {/* Keyed per call so one call's checked-off action never carries over. */}
        <NextActionCard key={id} action={vm.nextBestAction} conversationId={id} />
        <KeyMomentsCard moments={vm.pivotal} onViewTimeline={() => openDetail("timeline")} />
      </div>

      <PerformanceCard vm={vm} />

      <div ref={detailsRef}>
        <DetailSections
          vm={vm}
          segments={review.segments}
          suggestions={review.suggestions}
          conversation={conversation}
          player={hasRecording ? player : null}
          activeTab={activeTab}
          onSelect={setActiveTab}
        />
      </div>

      {vm.coachingInsight && (
        <footer className={styles.tipFooter}>
          <span className={styles.tipIcon} aria-hidden="true">
            💡
          </span>
          <div>
            <strong>Clara's tip:</strong> {vm.coachingInsight}
            {vm.unverifiedQuotes > 0 && (
              <span className={styles.tipFootnote}>
                {vm.unverifiedQuotes} quote
                {vm.unverifiedQuotes === 1 ? " was" : "s were"} dropped from this report — the words
                weren't found in the transcript.
              </span>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}

/** The verdict: the score, the one-line summary, what drove it, and the call
 *  itself. Tinted by how good a lead this is. */
function HeroCard({
  vm,
  tone,
  player,
}: {
  vm: CallReviewView;
  tone: ScoreTone;
  player: ReturnType<typeof useRecordingPlayer> | null;
}) {
  return (
    <section className={styles.hero} data-tone={tone}>
      <ScoreRing value={vm.interestScore} badge={LEAD_LABELS[tone]} caption="INTEREST" tone={tone} />
      <div className={styles.heroBody}>
        {player && <RecordingControls player={player} />}
        <h2 className={styles.heroHeadline}>{vm.shortSummary}</h2>
        {vm.whyChecklist.length > 0 && (
          <>
            <p className={styles.heroWhy}>Why Clara scored this call {vm.interestScore}/100</p>
            <ul className={styles.checklist}>
              {vm.whyChecklist.map((item, i) => (
                <ChecklistLine key={i} item={item} />
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

/**
 * One reason behind the score, with the customer's words a hover away.
 *
 * The line itself is a label the model chose; the evidence is what makes it
 * checkable. Keeping the quote out of the list and in a card keeps eight
 * reasons readable at a glance while leaving every one of them provable.
 */
function ChecklistLine({ item }: { item: ChecklistItem }) {
  const [open, setOpen] = useState(false);
  const hasDetail = item.quotes.length > 0 || item.strength !== "";

  return (
    <li
      className={styles.checkItem}
      data-tone={item.tone}
      data-detail={hasDetail}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={hasDetail ? 0 : undefined}
    >
      <span className={styles.checkMark}>
        {item.tone === "good" ? <CheckIcon size={12} /> : <AlertIcon size={12} />}
      </span>
      {item.text}
      {hasDetail && (
        <span className={styles.checkChevron}>
          <ChevronIcon size={13} />
        </span>
      )}

      {open && hasDetail && (
        <div className={styles.checkCard} data-tone={item.tone}>
          <span className={styles.checkCardHead}>
            {item.tone === "good" ? <CheckIcon size={13} /> : <AlertIcon size={13} />}
            {item.text}
          </span>
          {item.quotes.length > 0 && (
            <ul className={styles.checkCardQuotes}>
              {item.quotes.map((quote, index) => (
                <li key={index}>“{quote}”</li>
              ))}
            </ul>
          )}
          {item.strength && <span className={styles.checkCardFoot}>{item.strength}</span>}
        </div>
      )}
    </li>
  );
}

function MetaChip({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: string;
}) {
  return (
    <div className={styles.metaChip}>
      <span className={styles.metaIcon}>{icon}</span>
      <div>
        <span className={styles.metaLabel}>{label}</span>
        <span className={styles.metaValue} title={children}>
          {children}
        </span>
      </div>
    </div>
  );
}

function StatusPanel({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className={styles.page}>
      <div className={styles.statusPanel}>
        <h2 className={styles.statusTitle}>{title}</h2>
        <p className={styles.cardText}>{body}</p>
        {children}
      </div>
    </div>
  );
}
