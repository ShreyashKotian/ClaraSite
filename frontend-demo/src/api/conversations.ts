/**
 * Standalone mock client for conversations and analytics.
 * Operates purely in-memory with zero backend dependencies.
 */

import {
  MOCK_ANALYSES,
  MOCK_CALLS,
  MOCK_SUMMARY,
  MOCK_TRANSCRIPTS,
} from "./mockData";

export type ConversationSummary = {
  id: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration_sec: number | null;
  lead_speaker_id: number | null;
  audio_channels: number;
  rep_label?: string | null;
  caller_name?: string | null;
  caller_phone?: string | null;
  caller_address?: string | null;
  call_notes?: string | null;
  project?: string | null;
  has_audio?: boolean;
  transcription_gaps?: TranscriptionGap[];
};

export type TranscriptionGap = {
  start_ms: number;
  end_ms: number;
  speech_ms: number;
};

export type TranscriptSegment = {
  speaker_id: number;
  role: string;
  text: string;
  start_ms: number | null;
  end_ms: number | null;
  word_count: number;
};

export type SavedSuggestion = {
  generation_id: number | null;
  trigger_query: string;
  suggestion_text: string;
  from_cache: boolean;
  sources: unknown[];
  latency_ms: number | null;
  created_at: string | null;
};

export type CallAnalysis = {
  conversation_id: string;
  status: string;
  version?: number;
  model?: string | null;
  metrics: Record<string, unknown>;
  analysis: Record<string, unknown>;
  talk_goals?: Record<string, unknown>;
  error?: string | null;
  created_at?: string | null;
};

export type SignalTheme = { label: string; count: number };

export type AnalyticsSummary = {
  range: string;
  range_start: string;
  range_end: string;
  volume_bucket_unit: "day" | "period";
  total_conversations: number;
  analyzed_conversations: number;
  analysis_coverage_pct: number;
  avg_rep_talk_pct: number;
  avg_duration_sec: number;
  avg_interest_score: number;
  avg_conversion_pct: number;
  suggestion_cache_hit_pct: number;
  pipeline_outlook: {
    qualified_calls: number;
    follow_up_calls: number;
    at_risk_calls: number;
  };
  conversion_bands: { likely: number; possible: number; unlikely: number };
  signal_balance: {
    buying_signals_total: number;
    objections_total: number;
    avg_buying_signals_per_call: number;
    avg_objections_per_call: number;
    net_signal_score: number;
    buying_themes: SignalTheme[];
    objection_themes: SignalTheme[];
  };
  previous_period: {
    total_conversations: number;
    qualified_calls: number;
    follow_up_calls: number;
    at_risk_calls: number;
    avg_conversion_pct: number;
    avg_interest_score: number;
    avg_rep_talk_pct: number;
    avg_rep_questions: number;
    listening_index: number;
    avg_response_sec: number | null;
  };
  talk_goals: {
    rep_talk_min_pct: number;
    rep_talk_max_pct: number;
    listening_min: number;
    questions_per_call: number;
    response_sec_max: number;
  };
  coaching_snapshot: {
    avg_rep_questions: number;
    talk_balance_label: "balanced" | "rep_heavy" | "prospect_heavy";
    listening_index: number;
    avg_response_sec: number | null;
  };
  weekly_volume: { label: string; count: number; call_ids: string[] }[];
  calls_truncated?: boolean;
  calls: AnalyticsCallRow[];
};

export type AnalyticsCallRow = {
  id: string;
  started_at: string | null;
  duration_sec: number | null;
  status: string;
  rep_label: string | null;
  caller_name: string | null;
  has_audio: boolean;
  interest_examples: string[];
  concern_examples: string[];
  interest_score: number | null;
  conversion_pct: number | null;
  buying_signals: number;
  objections: number;
  outcome: "qualified" | "follow_up" | "at_risk" | "nurture" | "pending";
  outcome_reason: string;
  outcome_evidence: string[];
  question_examples: string[];
  listening_examples: string[];
  conversion_band: "likely" | "possible" | "unlikely" | null;
  rep_talk_pct: number | null;
  rep_questions: number;
  avg_response_sec: number | null;
  listening_index: number | null;
};

// Internal mutable in-memory state
const inMemoryCalls: AnalyticsCallRow[] = [...MOCK_CALLS];

export async function apiGet<T>(path: string): Promise<T> {
  if (path.includes("/analytics/summary")) {
    return MOCK_SUMMARY as unknown as T;
  }
  return {} as T;
}

export async function apiPost<T>(_path: string): Promise<T> {
  return {} as T;
}

export async function apiPatch<T>(_path: string, _body: unknown): Promise<T> {
  return {} as T;
}

export async function apiDelete(_path: string): Promise<void> {
  return Promise.resolve();
}

export async function apiFormPost<T>(_path: string, _form: FormData): Promise<T> {
  return {} as T;
}

export function authHeaders(): HeadersInit {
  return { Accept: "application/json" };
}

export async function getConversation(id: string): Promise<ConversationSummary> {
  const found = inMemoryCalls.find((c) => c.id === id) || inMemoryCalls[0];
  return {
    id: found.id,
    status: found.status,
    started_at: found.started_at,
    ended_at: found.started_at,
    duration_sec: found.duration_sec,
    lead_speaker_id: 1,
    audio_channels: 2,
    rep_label: found.rep_label,
    caller_name: found.caller_name,
    caller_phone: "+91 98201 55420",
    caller_address: "Mumbai, Maharashtra",
    call_notes: found.outcome_reason,
    project: "Grandview Residences",
    has_audio: false,
    transcription_gaps: [],
  };
}

export async function getTranscript(id: string): Promise<{
  conversation_id: string;
  segments: TranscriptSegment[];
  suggestions: SavedSuggestion[];
}> {
  return (
    MOCK_TRANSCRIPTS[id] || {
      conversation_id: id,
      segments: MOCK_TRANSCRIPTS["call-001"].segments,
      suggestions: MOCK_TRANSCRIPTS["call-001"].suggestions,
    }
  );
}

export async function getAnalysis(id: string): Promise<CallAnalysis> {
  const found = inMemoryCalls.find((c) => c.id === id) || inMemoryCalls[0];
  const template = MOCK_ANALYSES[id] || MOCK_ANALYSES["call-001"];

  return {
    ...template,
    conversation_id: id,
    metrics: {
      ...template.metrics,
      rep_talk_pct: found.rep_talk_pct ?? 45,
      prospect_talk_pct: 100 - (found.rep_talk_pct ?? 45),
      listening_score: found.listening_index ?? 88,
    },
    analysis: {
      ...template.analysis,
      interest_score: found.interest_score ?? 85,
      conversion_pct: found.conversion_pct ?? 75,
      executive_summary: `${found.caller_name || "Lead"} discussed property criteria. Rep qualified budget and next steps effectively.`,
    },
  };
}

export async function getAudioToken(_id: string): Promise<{ token: string; expires_in: number }> {
  return { token: "demo-token-12345", expires_in: 3600 };
}

export async function getWaveform(_id: string): Promise<{ peaks: number[] }> {
  // Return realistic mock audio amplitude peaks
  const peaks = Array.from({ length: 64 }, (_, i) => {
    const base = Math.sin(i / 4) * 0.4 + 0.5;
    return Math.max(0.1, Math.min(1.0, base + ((i % 5) - 2) * 0.08));
  });
  return { peaks };
}

export function audioStreamUrl(_id: string, _token: string): string {
  return "";
}

export async function reanalyzeConversation(id: string) {
  return { conversation_id: id, status: "completed" };
}

export async function refreshCallMetrics(id: string) {
  return { conversation_id: id, status: "completed" };
}

export async function updateCallerDetails(
  id: string,
  details: {
    caller_name: string;
    caller_phone?: string;
    caller_address?: string;
    call_notes?: string;
    project?: string;
  }
) {
  const found = inMemoryCalls.find((c) => c.id === id);
  if (found) {
    found.caller_name = details.caller_name;
  }
  return { conversation_id: id, caller_name: details.caller_name };
}

export async function getAnalyticsSummary(range: string = "30d"): Promise<AnalyticsSummary> {
  return {
    ...MOCK_SUMMARY,
    range,
    calls: [...inMemoryCalls],
  };
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMs(ms: number | null | undefined): string {
  if (ms == null || ms < 0) return "";
  const sec = Math.floor(ms / 1000);
  return `${Math.floor(sec / 60)
    .toString()
    .padStart(2, "0")}:${(sec % 60).toString().padStart(2, "0")}`;
}
