import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getAnalysis,
  getConversation,
  getTranscript,
  refreshCallMetrics,
  reanalyzeConversation,
  type CallAnalysis,
  type ConversationSummary,
  type SavedSuggestion,
  type TranscriptSegment,
} from "../../api/conversations";
import { asArray, asRecord } from "./json";
import { buildCallReviewView } from "./metrics";

const POLL_MS = 4000;

export function useCallReview(conversationId: string | undefined) {
  const [conversation, setConversation] = useState<ConversationSummary | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [suggestions, setSuggestions] = useState<SavedSuggestion[]>([]);
  const [analysis, setAnalysis] = useState<CallAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const metricsRefreshed = useRef(false);
  // The call this page is currently showing. A response that arrives after the
  // user has opened a different call belongs to nobody and is dropped.
  const activeId = useRef(conversationId);

  // Opening another call from this same page must not leave the previous
  // call's report on screen while the new one loads.
  useEffect(() => {
    activeId.current = conversationId;
    setConversation(null);
    setSegments([]);
    setSuggestions([]);
    setAnalysis(null);
    setError(null);
    setLoading(Boolean(conversationId));
    metricsRefreshed.current = false;
  }, [conversationId]);

  const load = useCallback(async () => {
    if (!conversationId) return;
    try {
      const [conv, transcript, report] = await Promise.all([
        getConversation(conversationId),
        getTranscript(conversationId),
        getAnalysis(conversationId),
      ]);
      if (activeId.current !== conversationId) return;
      setError(null);
      setConversation(conv);
      setSegments(transcript.segments ?? []);
      setSuggestions(transcript.suggestions ?? []);
      setAnalysis(report);
    } catch (e) {
      if (activeId.current !== conversationId) return;
      setError(e instanceof Error ? e.message : "Failed to load this call.");
    } finally {
      if (activeId.current === conversationId) setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reports saved before the metrics pass existed have no timeline or glance
  // block; rebuild it once so the page isn't missing measured numbers.
  useEffect(() => {
    if (!conversationId || loading || metricsRefreshed.current) return;
    const m = asRecord(analysis?.metrics);
    const hasTimeline = asArray(asRecord(m.call_timeline).buckets).length > 0;
    // Likewise for reports saved before each question was timed. The test is
    // whether the field exists at all, not whether it holds a number — a
    // question the rep never answered is legitimately untimed.
    const exchanges = asArray(m.prospect_exchanges);
    const timed = exchanges.length === 0 || "response_ms" in asRecord(exchanges[0]);
    if (hasTimeline && m.call_glance && timed) return;
    if (Object.keys(asRecord(analysis?.analysis)).length === 0) return;
    // Set before the request and never cleared: a call whose metrics cannot be
    // rebuilt would otherwise be asked again on every poll tick, four seconds
    // apart, for as long as the page stays open.
    metricsRefreshed.current = true;
    void refreshCallMetrics(conversationId)
      .then(() => load())
      .catch(() => {});
  }, [conversationId, loading, analysis, load]);

  useEffect(() => {
    if (!conversationId || !analysis) return;
    const busy =
      analysis.status === "analyzing" ||
      analysis.status === "running" ||
      conversation?.status === "analyzing";
    if (!busy) return;
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [conversationId, analysis, conversation?.status, load]);

  const handleReanalyze = useCallback(async () => {
    if (!conversationId || reanalyzing) return;
    setReanalyzing(true);
    try {
      await reanalyzeConversation(conversationId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Re-analyze failed");
    } finally {
      setReanalyzing(false);
    }
  }, [conversationId, reanalyzing, load]);

  const vm = useMemo(
    () =>
      buildCallReviewView(
        asRecord(analysis?.analysis),
        asRecord(analysis?.metrics),
        asRecord(analysis?.talk_goals),
      ),
    [analysis?.analysis, analysis?.metrics, analysis?.talk_goals],
  );

  return {
    conversation,
    segments,
    suggestions,
    analysis,
    error,
    loading,
    reanalyzing,
    vm,
    load,
    handleReanalyze,
  };
}
