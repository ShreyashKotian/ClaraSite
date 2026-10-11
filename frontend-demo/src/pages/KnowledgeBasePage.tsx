/**
 * Knowledge base — the documents Clara answers from.
 *
 * Upload, watch each file index, and remove what's out of date. Everything on
 * screen reflects the server's own view of each source; nothing is assumed
 * ready until the backend says so.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { formatTimestamp } from "../api/conversations";
import {
  deleteKnowledgeSource,
  listKnowledgeSources,
  syncAllKnowledge,
  syncKnowledgeSource,
  uploadKnowledgeFile,
  type KnowledgeSource,
} from "../api/knowledge";
import {
  AlertIcon,
  CheckIcon,
  CloudUploadIcon,
  DatabaseIcon,
  FileIcon,
  RefreshIcon,
  TrashIcon,
} from "../components/icons";
import styles from "./knowledge/Knowledge.module.css";

/** Matches the server's per-file ceiling. */
const STORAGE_LIMIT = 15 * 1024 * 1024;

/** How often to re-check while something is still indexing. */
const INDEXING_POLL_MS = 3000;

const STATUS_LABEL = { ready: "Ready", processing: "Indexing…", failed: "Failed" } as const;

const ACCEPTED_FILES =
  ".pdf,.docx,.txt,.csv,.json,text/plain,text/csv,application/pdf,application/json," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function KnowledgeBasePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<{ text: string; bad: boolean } | null>(null);

  const refresh = useCallback(async () => {
    const data = await listKnowledgeSources();
    setSources(data.items);
    setTotalBytes(data.total_bytes);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh().catch(() => setLoading(false));
  }, [refresh]);

  // Indexing happens in the background, so poll only while something is mid-flight.
  useEffect(() => {
    if (!sources.some((source) => source.status === "processing")) return;
    const timer = window.setInterval(() => void refresh().catch(() => undefined), INDEXING_POLL_MS);
    return () => window.clearInterval(timer);
  }, [sources, refresh]);

  const run = useCallback(
    async (action: () => Promise<unknown>, fallback: string) => {
      setNotice(null);
      try {
        await action();
        await refresh();
      } catch (err) {
        setNotice({ text: err instanceof Error ? err.message : fallback, bad: true });
      }
    },
    [refresh],
  );

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      setUploading(true);
      setNotice(null);
      try {
        for (const file of list) await uploadKnowledgeFile(file);
        setNotice({
          text: `Uploaded ${list.length} file${list.length > 1 ? "s" : ""}. Indexing in the background.`,
          bad: false,
        });
        await refresh();
      } catch (err) {
        setNotice({ text: err instanceof Error ? err.message : "Upload failed", bad: true });
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [refresh],
  );

  const ready = sources.filter((source) => source.status === "ready");
  const indexing = sources.some((source) => source.status === "processing");
  const chunks = ready.reduce((sum, source) => sum + source.chunk_count, 0);
  const storagePct = Math.min(100, Math.round((totalBytes / STORAGE_LIMIT) * 100));

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <div className={styles.titleRow}>
            <h1 className={styles.pageTitle}>Knowledge base</h1>
            <span className={styles.statusPill} data-active={ready.length > 0}>
              <span className={styles.statusDot} />
              {ready.length > 0
                ? indexing
                  ? "Active · indexing"
                  : "Active"
                : "No documents yet"}
            </span>
          </div>
          <p className={styles.pageSub}>
            Pricing sheets, FAQs and brochures. Live coaching and Ask AI answer from these.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={syncing || sources.length === 0}
            onClick={() => {
              setSyncing(true);
              void run(async () => {
                const result = await syncAllKnowledge();
                setNotice({
                  text: result.queued
                    ? `Re-indexing ${result.queued} document${result.queued > 1 ? "s" : ""}.`
                    : "Everything is already up to date.",
                  bad: false,
                });
              }, "Sync failed").finally(() => setSyncing(false));
            }}
          >
            <RefreshIcon size={15} />
            {syncing ? "Queueing…" : "Re-index all"}
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <CloudUploadIcon size={16} />
            {uploading ? "Uploading…" : "Upload files"}
          </button>
        </div>
      </header>

      <div className={styles.statRow}>
        <Stat icon={<FileIcon size={17} />} label="Documents" value={sources.length}>
          {indexing ? "some still indexing" : "in your knowledge base"}
        </Stat>
        <Stat icon={<CheckIcon size={17} />} tone="green" label="Ready to answer" value={ready.length}>
          {chunks > 0 ? `${chunks} searchable passages` : "nothing indexed yet"}
        </Stat>
        <Stat
          icon={<DatabaseIcon size={17} />}
          tone="violet"
          label="Storage used"
          value={`${storagePct}%`}
          track={storagePct}
        >
          {formatBytes(totalBytes)} of {formatBytes(STORAGE_LIMIT)}
        </Stat>
      </div>

      {notice && (
        <div className={styles.notice} data-tone={notice.bad ? "bad" : "good"}>
          {notice.bad ? <AlertIcon size={16} /> : <CheckIcon size={16} />}
          {notice.text}
        </div>
      )}

      <section
        className={styles.dropzone}
        data-dragging={dragging}
        aria-label="Add documents"
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!uploading) void uploadFiles(event.dataTransfer.files);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          className={styles.fileInput}
          accept={ACCEPTED_FILES}
          multiple
          onChange={(event) => {
            if (event.target.files) void uploadFiles(event.target.files);
          }}
        />
        <span className={styles.dropIcon}>
          <CloudUploadIcon size={26} />
        </span>
        <h2 className={styles.dropTitle}>Drop files to add them</h2>
        <p className={styles.dropHint}>
          PDF, Word, TXT, CSV or JSON — up to {formatBytes(STORAGE_LIMIT)} each. Each file is
          indexed in the background and becomes answerable as soon as it is ready.
        </p>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading…" : "Choose files"}
        </button>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Document library</h2>
          <span className={styles.cardMeta}>
            {loading
              ? "Loading…"
              : `${sources.length} source${sources.length === 1 ? "" : "s"}`}
          </span>
        </div>
        {sources.length === 0 ? (
          <p className={styles.empty}>
            {loading ? "Loading your documents…" : "Nothing here yet — upload a file to begin."}
          </p>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Passages</th>
                  <th>Last indexed</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr key={source.id}>
                    <td>
                      <span className={styles.fileCell}>
                        <span className={styles.fileIcon}>
                          <FileIcon size={16} />
                        </span>
                        <span>
                          <span className={styles.fileName} title={source.filename}>
                            {source.filename}
                          </span>
                          <span className={styles.fileSize}>{formatBytes(source.file_size)}</span>
                        </span>
                      </span>
                    </td>
                    <td>{source.file_type.toUpperCase()}</td>
                    <td>{source.status === "ready" ? source.chunk_count : "—"}</td>
                    <td>{formatTimestamp(source.synced_at || source.created_at)}</td>
                    <td>
                      <span
                        className={styles.badge}
                        data-status={source.status}
                        // The server's reason for a failure is the only useful
                        // thing to say about it, so surface it rather than a
                        // generic "something went wrong".
                        title={source.error || undefined}
                      >
                        {STATUS_LABEL[source.status]}
                      </span>
                    </td>
                    <td>
                      <span className={styles.rowActions}>
                        {source.status === "failed" && (
                          <button
                            type="button"
                            className={styles.iconButton}
                            title="Try indexing again"
                            aria-label={`Retry ${source.filename}`}
                            onClick={() =>
                              void run(() => syncKnowledgeSource(source.id), "Sync failed")
                            }
                          >
                            <RefreshIcon size={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          className={styles.iconButton}
                          data-danger="true"
                          title="Remove this document"
                          aria-label={`Remove ${source.filename}`}
                          onClick={() =>
                            void run(() => deleteKnowledgeSource(source.id), "Delete failed")
                          }
                        >
                          <TrashIcon size={15} />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  icon,
  tone = "accent",
  label,
  value,
  track,
  children,
}: {
  icon: React.ReactNode;
  tone?: "accent" | "green" | "violet";
  label: string;
  value: number | string;
  /** Percentage full, when the stat is a capacity rather than a count. */
  track?: number;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.stat}>
      <div className={styles.statTop}>
        <span className={styles.statIcon} data-tone={tone}>
          {icon}
        </span>
        <span className={styles.statLabel}>{label}</span>
      </div>
      <div className={styles.statBottom}>
        <strong className={styles.statValue}>{value}</strong>
        <span className={styles.statNote}>{children}</span>
      </div>
      {track !== undefined && (
        <div className={styles.statTrack}>
          <span className={styles.statFill} data-full={track >= 90} style={{ width: `${track}%` }} />
        </div>
      )}
    </div>
  );
}
