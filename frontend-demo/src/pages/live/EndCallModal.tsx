/**
 * Post-hangup form: capture the customer's details against the call that
 * just ended. Saving is optional — skipping never blocks the rep.
 */

import { useEffect, useRef, useState } from "react";
import { updateCallerDetails } from "../../api/conversations";
import styles from "./LiveCalls.module.css";

export function EndCallModal({
  conversationId,
  onClose,
}: {
  conversationId: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [project, setProject] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Escape dismisses, and Tab is kept inside the panel — without this the
  // focus ring walks off into the page behind the overlay.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        "input, textarea, button, [href]"
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function save() {
    if (!name.trim()) {
      setError("Customer name is required to save.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateCallerDetails(conversationId, {
        caller_name: name.trim(),
        ...(project.trim() ? { project: project.trim() } : {}),
        ...(phone.trim() ? { caller_phone: phone.trim() } : {}),
        ...(address.trim() ? { caller_address: address.trim() } : {}),
        ...(notes.trim() ? { call_notes: notes.trim() } : {}),
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.modalOverlay}>
      <div
        className={styles.modal}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-call-title"
      >
        <h2 className={styles.modalTitle} id="end-call-title">
          Call ended
        </h2>
        <p className={styles.modalSub}>
          Add the customer's details while they're fresh — the AI review is
          already running.
        </p>

        <div className={styles.modalGrid}>
          <label className={styles.modalField}>
            <span className={styles.fieldLabel}>Customer name *</span>
            <input
              className={styles.input}
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className={styles.modalField}>
            <span className={styles.fieldLabel}>Project</span>
            <input
              className={styles.input}
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="Which property this call was about"
            />
          </label>

          <label className={styles.modalField}>
            <span className={styles.fieldLabel}>Phone</span>
            <input
              className={styles.input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          <label className={styles.modalField}>
            <span className={styles.fieldLabel}>Address</span>
            <input
              className={styles.input}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>

          <label className={`${styles.modalField} ${styles.modalFieldWide}`}>
            <span className={styles.fieldLabel}>Notes</span>
            <textarea
              className={styles.textarea}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>

        {error && <p className={styles.askError}>{error}</p>}

        <div className={styles.modalActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Skip
          </button>
          <button
            type="button"
            className={styles.startButton}
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save details"}
          </button>
        </div>
      </div>
    </div>
  );
}
