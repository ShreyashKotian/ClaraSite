/**
 * The raw material behind the report — questions, objections, the mood
 * timeline, the transcript and the recording. Overview indexes the lot; each
 * row opens its own tab.
 */

import { useState, type ComponentType } from "react";
import {
  formatDuration,
  type ConversationSummary,
  type SavedSuggestion,
  type TranscriptSegment,
} from "../../api/conversations";
import type { CallReviewView } from "./metrics";
import type { RecordingPlayer } from "./useRecordingPlayer";
import { CallPhaseList } from "./charts";
import { Transcript } from "./Transcript";
import { RecordingControls } from "./RecordingControls";
import { asRecord, asString } from "./json";
import {
  AlertIcon,
  ChevronIcon,
  ClockIcon,
  FileIcon,
  GridIcon,
  HeadphonesIcon,
  MessageIcon,
  PlayIcon,
  TrendIcon,
} from "../../components/icons";
import styles from "./AnalysisView.module.css";

export type SectionKey =
  | "overview"
  | "questions"
  | "objections"
  | "timeline"
  | "transcript"
  | "recording";

type Tab = {
  key: SectionKey;
  icon: ComponentType<{ size?: number }>;
  label: string;
  rowLabel: string;
  count?: number;
  subtitle: string;
};

export function DetailSections({
  vm,
  segments,
  suggestions,
  conversation,
  player,
  activeTab,
  onSelect,
}: {
  vm: CallReviewView;
  segments: TranscriptSegment[];
  suggestions: SavedSuggestion[];
  conversation: ConversationSummary | null;
  player: RecordingPlayer | null;
  activeTab: SectionKey;
  onSelect: (key: SectionKey) => void;
}) {
  const [transcriptQuery, setTranscriptQuery] = useState("");

  const tabs: Tab[] = [
    {
      key: "questions",
      icon: MessageIcon,
      label: "Questions",
      rowLabel: "Questions asked",
      count: vm.prospectExchanges.length,
      subtitle:
        "Every customer question, paired with what you said back and how quickly you answered",
    },
    {
      key: "objections",
      icon: AlertIcon,
      label: "Objections",
      rowLabel: "Objections raised",
      count: vm.objections.length,
      subtitle: "Concerns the customer voiced, and the evidence behind each",
    },
    {
      key: "timeline",
      icon: TrendIcon,
      label: "Timeline",
      rowLabel: "Conversation timeline",
      subtitle: "How the customer's mood moved through the phases of the call",
    },
    {
      key: "transcript",
      icon: FileIcon,
      label: "Transcript",
      rowLabel: "Full transcript",
      count: segments.length,
      subtitle: "The whole conversation with speaker labels, searchable",
    },
  ];
  if (player) {
    tabs.push({
      key: "recording",
      icon: HeadphonesIcon,
      label: "Recording",
      rowLabel: "Call recording",
      subtitle: "Listen back — both voices in both ears, or isolate one side",
    });
  }

  const overview: Tab = {
    key: "overview",
    icon: GridIcon,
    label: "Overview",
    rowLabel: "Overview",
    subtitle: "Everything behind this report, in one place",
  };
  const allTabs = [overview, ...tabs];

  // A tab can disappear (a call with no recording), so never leave a dead one selected.
  const active = allTabs.find((tab) => tab.key === activeTab) ?? overview;

  return (
    <div className={styles.tabsCard}>
      <div className={styles.tabBar} role="tablist">
        {allTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={tab.key === active.key}
            className={tab.key === active.key ? styles.tabOn : styles.tab}
            onClick={() => onSelect(tab.key)}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.count !== undefined && <span className={styles.tabCount}>{tab.count}</span>}
          </button>
        ))}
      </div>

      <div className={styles.tabPanel} role="tabpanel">
        {active.key === "overview" && (
          <div className={styles.overviewList}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={styles.overviewRow}
                onClick={() => onSelect(tab.key)}
              >
                <span className={styles.overviewIcon}>
                  <tab.icon size={18} />
                </span>
                <span className={styles.overviewText}>
                  <span className={styles.overviewTitle}>
                    {tab.rowLabel}
                    {tab.count !== undefined && (
                      <span className={styles.overviewCount}> ({tab.count})</span>
                    )}
                  </span>
                  <span className={styles.overviewSub}>{tab.subtitle}</span>
                </span>
                {tab.key === "recording" ? (
                  <span className={styles.overviewPlay}>
                    <PlayIcon size={13} />
                    {formatDuration(conversation?.duration_sec)}
                  </span>
                ) : (
                  <span className={styles.overviewChevron}>
                    <ChevronIcon size={18} />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {active.key !== "overview" && <p className={styles.tabSubtitle}>{active.subtitle}</p>}

        {active.key === "questions" &&
          (vm.prospectExchanges.length === 0 ? (
            <p className={styles.panelEmpty}>The customer asked no direct questions.</p>
          ) : (
            vm.prospectExchanges.map((exchange, i) => (
              <div key={i} className={styles.exchange}>
                <span className={styles.exchangeIndex}>{i + 1}</span>
                <div className={styles.exchangeBody}>
                  <p className={styles.exchangeQuestion}>“{exchange.question}”</p>
                  <p className={styles.exchangeAnswer}>
                    {exchange.answer || <em>No direct reply captured.</em>}
                  </p>
                </div>
                {exchange.responseSec != null && (
                  <span
                    className={styles.exchangeTiming}
                    data-slow={exchange.responseSec > vm.responseGoalSec}
                    title={`You started answering ${exchange.responseSec}s after they finished`}
                  >
                    <ClockIcon size={13} />
                    {exchange.responseSec}s
                  </span>
                )}
              </div>
            ))
          ))}

        {active.key === "objections" &&
          (vm.objections.length === 0 ? (
            <p className={styles.panelEmpty}>No objections came up on this call.</p>
          ) : (
            vm.objections.map((raw, i) => {
              const item = asRecord(raw);
              const severity = asString(item.severity, "medium");
              const quote = asString(item.evidence_quote);
              return (
                <div key={i} className={styles.objection}>
                  <div className={styles.objectionTop}>
                    <span className={styles.objectionText}>{asString(item.objection)}</span>
                    <span className={styles.severity} data-severity={severity}>
                      {severity}
                    </span>
                  </div>
                  {quote && <p className={styles.objectionQuote}>“{quote}”</p>}
                </div>
              );
            })
          ))}

        {active.key === "timeline" && <CallPhaseList phases={vm.sentimentPhases} />}

        {active.key === "transcript" && (
          <Transcript
            segments={segments}
            suggestions={suggestions}
            conversation={conversation}
            query={transcriptQuery}
            onQueryChange={setTranscriptQuery}
          />
        )}

        {active.key === "recording" && player && <RecordingControls player={player} />}
      </div>
    </div>
  );
}
