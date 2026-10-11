/**
 * The live call screen. Idle: pre-call setup (mic check, language, tab-share).
 * Live: three columns — transcript, AI suggestion card, insights rail.
 * Ended: caller-details capture. Session state lives in useAssistantWs (owned
 * by AppLayout so a route change never kills a call).
 */

import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { AssistantWsApi } from "../../hooks/useAssistantWs";
import { useTranscriptPictureInPicture } from "../../hooks/useTranscriptPictureInPicture";
import { buildRealtimeView } from "../../realtime";
import type { AnswerDoneMessage } from "../../types";
import { AskAiBar } from "./AskAiBar";
import { EndCallModal } from "./EndCallModal";
import { LiveTranscript } from "./LiveTranscript";
import type { StartConfig } from "./PreCallSetup";
import { RightRail } from "./RightRail";
import { SuggestionCard } from "./SuggestionCard";
import styles from "./LiveCalls.module.css";

function formatElapsed(seconds: number): string {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// Decorative activity bars in the header (fixed heights, animated while live);
// the trailing dots fade out like the mock's waveform tail.
const WAVE_HEIGHTS = [35, 70, 45, 90, 60, 80, 40, 95, 55, 75, 30, 65, 45, 25, 20, 15, 12, 10];

function Waveform() {
  return (
    <span className={styles.waveform} aria-hidden="true">
      {WAVE_HEIGHTS.map((h, i) => (
        <i
          key={i}
          style={{ height: `${h}%`, animationDelay: `${i * 90}ms` }}
          className={i >= WAVE_HEIGHTS.length - 5 ? styles.waveDot : undefined}
        />
      ))}
    </span>
  );
}

export function LiveCallsPage() {
  const assistant = useOutletContext<AssistantWsApi>();
  const {
    status,
    error,
    warning,
    messages,
    elapsedSeconds,
    connect,
    disconnect,
    sessionId,
    lastEndedSessionId,
    speakers,
    leadSpeakerId,
    sendSuggestionUsed,
  } = assistant;

  const [endedSessionId, setEndedSessionId] = useState<string | null>(null);

  const isLive = status === "live";
  const isConnecting = status === "connecting";
  const elapsed = formatElapsed(elapsedSeconds);

  const view = useMemo(() => buildRealtimeView(messages), [messages]);

  const { pipSupported, pipOpen, openPip } = useTranscriptPictureInPicture({
    active: isLive,
    messages,
    elapsedLabel: elapsed,
    leadSpeakerId,
  });

  // Talk balance from final transcripts — measured, not guessed.
  const repTalkPct = useMemo(() => {
    let rep = 0;
    let customer = 0;
    for (const m of messages) {
      if (m.type !== "transcript_final") continue;
      const words = m.text.split(/\s+/).filter(Boolean).length;
      if (leadSpeakerId != null && m.speaker === leadSpeakerId) customer += words;
      else rep += words;
    }
    const total = rep + customer;
    return total === 0 ? null : Math.round((100 * rep) / total);
  }, [messages, leadSpeakerId]);

  const cacheHits = view.completedAnswers.filter((a) => a.from_cache).length;
  const eventsCount =
    messages.filter((m) => m.type === "transcript_final").length +
    view.completedAnswers.length;

  function handleStart(config: StartConfig) {
    void connect("", {
      language: config.language,
      captureTabAudio: config.captureTabAudio,
      micDeviceId: config.micDeviceId,
    });
  }

  function handleEndCall() {
    setEndedSessionId(sessionId ?? lastEndedSessionId);
    disconnect();
  }

  function handleUse(answer: AnswerDoneMessage) {
    void navigator.clipboard?.writeText(answer.text).catch(() => {});
    sendSuggestionUsed(answer.generation_id);
  }

  // One screen for every state: the live-interface layout is always on —
  // idle just swaps the transcript/suggestion area for the setup checklist.
  return (
    <div className={styles.page}>
      {warning && (isLive || isConnecting) && (
        <div className={styles.warningBanner}>{warning}</div>
      )}
      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.liveLayout}>
        <main className={styles.centerColumn}>
          <header className={styles.callHeader}>
            <div className={styles.callHeaderLeft}>
              <span
                className={isLive ? styles.statusDotLive : styles.statusDotIdle}
                aria-hidden="true"
              />
              <div>
                <span className={styles.headerTitle}>Live call interface</span>
                <span className={styles.headerSub}>
                  {sessionId
                    ? `Session ID: ${sessionId.slice(0, 8).toUpperCase()}`
                    : "No active session"}
                </span>
              </div>
            </div>
            <div className={styles.callHeaderRight}>
              {isLive ? (
                <>
                  <span className={styles.livePillBig}>LIVE · {elapsed}</span>
                  <Waveform />
                </>
              ) : (
                <span className={styles.readyPill}>
                  {isConnecting ? "Connecting…" : "Ready"}
                </span>
              )}
            </div>
          </header>

          <LiveTranscript
            messages={messages}
            leadSpeakerId={leadSpeakerId}
            active={isLive || isConnecting}
            pip={{ supported: isLive && pipSupported, open: pipOpen, openPip }}
            autoScrollSignal={`${view.liveAnswer?.text.length ?? 0}:${view.completedAnswers.length}`}
          >
            <SuggestionCard view={view} onUse={handleUse} />
          </LiveTranscript>
          <AskAiBar />
        </main>
        <RightRail
          view={view}
          live={isLive}
          sessionId={sessionId}
          elapsed={elapsed}
          speakers={speakers}
          repTalkPct={repTalkPct}
          cacheHits={cacheHits}
          eventsCount={eventsCount}
          onStart={handleStart}
          starting={isConnecting}
          onEnd={handleEndCall}
        />
      </div>

      {endedSessionId && (
        <EndCallModal
          conversationId={endedSessionId}
          onClose={() => setEndedSessionId(null)}
        />
      )}
    </div>
  );
}
