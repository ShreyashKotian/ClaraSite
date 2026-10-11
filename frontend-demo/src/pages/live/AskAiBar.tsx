/** "Ask AI anything" — a manual grounded question mid-call, answered inline (demo mode). */

import { useState } from "react";
import styles from "./LiveCalls.module.css";

export function AskAiBar() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    const q = question.trim().toLowerCase();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);

    // Simulate short AI inference delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      if (q.includes("price") || q.includes("bhk") || q.includes("cost")) {
        setAnswer(
          "Based on the project price sheet: 2 BHK smart homes start at ₹1.45 Cr (640 sq.ft carpet) and premium 3 BHK deck units start at ₹2.10 Cr (980 sq.ft carpet) in Tower B."
        );
      } else if (q.includes("amenit") || q.includes("pool") || q.includes("club")) {
        setAnswer(
          "The property features 50+ world-class amenities: Olympic-sized lap pool, 2 indoor squash courts, rooftop sky lounge, 1.5-acre central landscape park, and EV charging infrastructure."
        );
      } else if (q.includes("possession") || q.includes("date") || q.includes("when")) {
        setAnswer(
          "Possession for Phase 1 (Towers A & B) is scheduled for Q4 2026. Sample residence is currently open on-site for customer inspections."
        );
      } else if (q.includes("maintenance") || q.includes("fee") || q.includes("charge")) {
        setAnswer(
          "Estimated maintenance fee is ₹12 per sq.ft / month, including clubhouse access, landscape maintenance, and 24/7 security."
        );
      } else {
        setAnswer(
          "Grounded AI Answer: The residences feature modern layouts and high connectivity to central business districts and major highways."
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.askBar}>
      <span className={styles.askTitle}>Ask AI anything</span>
      <div className={styles.askRow}>
        <input
          className={styles.askInput}
          placeholder="e.g. What is the price range for 3 BHK?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
        />
        <button type="button" className={styles.askButton} onClick={ask} disabled={loading}>
          {loading ? "Thinking…" : "✦ Get AI answer"}
        </button>
      </div>
      {error && <p className={styles.askError}>{error}</p>}
      {answer && (
        <div className={styles.askAnswer}>
          <p>{answer}</p>
          <button type="button" className={styles.askDismiss} onClick={() => setAnswer(null)}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
