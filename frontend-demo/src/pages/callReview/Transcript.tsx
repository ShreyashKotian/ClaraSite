import { useMemo } from "react";
import {
  formatMs,
  type ConversationSummary,
  type SavedSuggestion,
  type TranscriptSegment,
} from "../../api/conversations";
import styles from "./AnalysisView.module.css";

export function Transcript({
  segments,
  suggestions,
  conversation,
  query,
  onQueryChange,
}: {
  segments: TranscriptSegment[];
  suggestions: SavedSuggestion[];
  conversation: ConversationSummary | null;
  query: string;
  onQueryChange: (query: string) => void;
}) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return segments;
    return segments.filter((seg) => seg.text.toLowerCase().includes(q));
  }, [segments, query]);

  function speakerName(seg: TranscriptSegment): string {
    if (seg.role === "rep") return conversation?.rep_label?.trim() || "Rep";
    if (seg.role === "prospect") return conversation?.caller_name?.trim() || "Customer";
    return seg.role;
  }

  return (
    <section className={styles.transcriptPanel}>
      <input
        type="search"
        className={styles.transcriptSearchInput}
        placeholder="Search transcript"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
      <div className={styles.transcriptFeed}>
        {filtered.length === 0 ? (
          <p className={styles.transcriptEmpty}>
            {query.trim() ? "No lines match your search." : "No transcript for this call."}
          </p>
        ) : (
          filtered.map((seg, i) => {
            const name = speakerName(seg);
            return (
              <article key={`${seg.start_ms ?? i}-${i}`} className={styles.transcriptRow}>
                <div className={styles.transcriptAvatar}>{name.charAt(0).toUpperCase()}</div>
                <div className={styles.transcriptBody}>
                  <div className={styles.transcriptSpeakerLine}>
                    <span className={styles.transcriptSpeaker}>{name}</span>
                    <span className={styles.transcriptTime}>{formatMs(seg.start_ms)}</span>
                  </div>
                  <p className={styles.transcriptText}>{seg.text}</p>
                </div>
              </article>
            );
          })
        )}
      </div>
      {suggestions.length > 0 && (
        <div className={styles.transcriptNotes}>
          <h3 className={styles.transcriptNotesTitle}>Live coaching notes</h3>
          <ul className={styles.transcriptNotesList}>
            {suggestions.map((s, i) => (
              <li key={i} className={styles.transcriptNoteItem}>
                <span className={styles.transcriptNoteTrigger}>{s.trigger_query}</span>
                <p>{s.suggestion_text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
