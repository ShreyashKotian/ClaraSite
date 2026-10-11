import type {
  AnswerCancelledMessage,
  AnswerDeltaMessage,
  AnswerDoneMessage,
  AnswerStartedMessage,
  ErrorMessage,
  RetrievalDoneMessage,
  TranscriptFinalMessage,
  TranscriptPartialMessage,
  WsMessage,
} from "./types";

export interface LiveAnswerState {
  generationId: number;
  query: string;
  text: string;
  fromCache?: boolean;
  cacheHit?: string | boolean;
}

export interface TranscriptTimelineItem {
  kind: "speaker" | "assistant" | "error";
  id: string;
  text: string;
  speaker: number | null;
  query?: string;
  fromCache?: boolean;
  error?: string;
}

export interface RealtimeView {
  transcriptTimeline: TranscriptTimelineItem[];
  livePartial: TranscriptPartialMessage | null;
  liveAnswer: LiveAnswerState | null;
  /** Sources for the answer currently being written — arrives before its first token. */
  liveRetrieval: RetrievalDoneMessage | null;
  completedAnswers: AnswerDoneMessage[];
}

function asSpeakerId(value: number | null | undefined): number | null {
  return typeof value === "number" ? value : null;
}

/** Speaker ids are audio channels: 0 = the rep's mic, 1 = meeting-tab audio. */
export function speakerLabel(speaker: number | null | undefined): string {
  if (speaker === 1) return "Customer";
  if (speaker === 0) return "You";
  return "Caller";
}

export function buildRealtimeView(messages: WsMessage[]): RealtimeView {
  const transcriptTimeline: TranscriptTimelineItem[] = [];
  const completedAnswers: AnswerDoneMessage[] = [];
  let livePartial: TranscriptPartialMessage | null = null;
  let currentAnswer: LiveAnswerState | null = null;
  let liveRetrieval: RetrievalDoneMessage | null = null;
  let activeAnswerMeta: AnswerStartedMessage | null = null;

  for (const message of messages) {
    switch (message.type) {
      case "transcript_partial":
        livePartial = message;
        break;
      case "transcript_final":
        transcriptTimeline.push(speakerTimelineItem(message));
        livePartial = null;
        break;
      case "answer_started":
        activeAnswerMeta = message;
        currentAnswer = {
          generationId: message.generation_id,
          query: message.query,
          text: "",
        };
        break;
      case "retrieval_done":
        liveRetrieval = message;
        break;
      case "answer_delta":
        currentAnswer = mergeAnswerDelta(currentAnswer, activeAnswerMeta, message);
        break;
      case "answer_done":
        completedAnswers.push(message);
        transcriptTimeline.push(assistantTimelineItem(message));
        if (
          currentAnswer &&
          currentAnswer.generationId === message.generation_id
        ) {
          currentAnswer = null;
        }
        if (liveRetrieval && liveRetrieval.generation_id === message.generation_id) {
          liveRetrieval = null;
        }
        if (
          activeAnswerMeta &&
          activeAnswerMeta.generation_id === message.generation_id
        ) {
          activeAnswerMeta = null;
        }
        break;
      case "answer_cancelled":
        currentAnswer = clearCancelledAnswer(currentAnswer, message);
        if (
          activeAnswerMeta &&
          activeAnswerMeta.generation_id === message.generation_id
        ) {
          activeAnswerMeta = null;
        }
        break;
      case "error":
        transcriptTimeline.push(errorTimelineItem(message));
        break;
      default:
        break;
    }
  }

  return {
    transcriptTimeline,
    livePartial,
    liveAnswer: currentAnswer,
    liveRetrieval,
    completedAnswers,
  };
}

/**
 * The live "Transcript" panel is a quick-scan feed for the rep during the
 * call — Customer said this, AI suggests that — not a full two-party
 * dialogue; the rep already knows what they themselves just said, and
 * reading it back only adds noise right when they need the suggested
 * answer to be easy to spot. This trims what's *rendered* there to the
 * customer's own lines plus every AI answer.
 *
 * Nothing is lost: the underlying `messages` (and everything the backend
 * persists — the saved transcript and the call recording) still contain
 * both speakers in full; this only narrows one live view built from them.
 */
export function forCustomerFocusedView(
  view: RealtimeView,
  leadSpeakerId: number | null
): RealtimeView {
  // The lead (customer) channel isn't known yet for the first moment of a
  // call — show everything rather than risk hiding the customer's own first
  // words behind an unresolved filter.
  if (leadSpeakerId == null) return view;
  return {
    ...view,
    transcriptTimeline: view.transcriptTimeline.filter(
      (item) => item.kind !== "speaker" || item.speaker === leadSpeakerId
    ),
    livePartial:
      view.livePartial && view.livePartial.speaker !== leadSpeakerId
        ? null
        : view.livePartial,
  };
}

function speakerTimelineItem(
  message: TranscriptFinalMessage
): TranscriptTimelineItem {
  return {
    kind: "speaker",
    id: `speaker-${message.session_id ?? "session"}-${message.speaker ?? "unknown"}-${message.text}`,
    text: message.text,
    speaker: asSpeakerId(message.speaker),
  };
}

function assistantTimelineItem(
  message: AnswerDoneMessage
): TranscriptTimelineItem {
  return {
    kind: "assistant",
    id: `assistant-${message.generation_id}`,
    text: message.text,
    speaker: null,
    query: message.query,
    fromCache: message.from_cache,
    error: message.error,
  };
}

function errorTimelineItem(message: ErrorMessage): TranscriptTimelineItem {
  return {
    kind: "error",
    id: `error-${message.session_id ?? "session"}-${message.message}`,
    text: message.message,
    speaker: null,
    error: message.message,
  };
}

function mergeAnswerDelta(
  current: LiveAnswerState | null,
  meta: AnswerStartedMessage | null,
  message: AnswerDeltaMessage
): LiveAnswerState {
  const baseQuery = current?.query || meta?.query || message.query || "";
  return {
    generationId: message.generation_id,
    query: baseQuery,
    text: message.text,
    fromCache: message.from_cache,
    cacheHit: message.cache_hit,
  };
}

function clearCancelledAnswer(
  current: LiveAnswerState | null,
  message: AnswerCancelledMessage
): LiveAnswerState | null {
  if (!current) return null;
  if (current.generationId !== message.generation_id) return current;
  return null;
}
