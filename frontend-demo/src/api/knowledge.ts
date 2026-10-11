/**
 * Standalone mock client for Knowledge Base management.
 * In-memory operations with zero backend dependencies.
 */

import { MOCK_KNOWLEDGE_SOURCES } from "./mockData";

export type KnowledgeSource = {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: "processing" | "ready" | "failed";
  chunk_count: number;
  error: string | null;
  created_at: string | null;
  synced_at: string | null;
};

type KnowledgeList = {
  items: KnowledgeSource[];
  total_bytes: number;
};

let inMemorySources: KnowledgeSource[] = [...MOCK_KNOWLEDGE_SOURCES];

export const listKnowledgeSources = async (): Promise<KnowledgeList> => {
  const total = inMemorySources.reduce((sum, s) => sum + s.file_size, 0);
  return { items: [...inMemorySources], total_bytes: total };
};

export const uploadKnowledgeFile = async (file: File): Promise<KnowledgeSource> => {
  const newSource: KnowledgeSource = {
    id: `kb-${Date.now()}`,
    filename: file.name,
    file_type: file.name.split(".").pop() || "txt",
    file_size: file.size,
    status: "ready",
    chunk_count: Math.max(12, Math.round(file.size / 25000)),
    error: null,
    created_at: new Date().toISOString(),
    synced_at: new Date().toISOString(),
  };
  inMemorySources = [newSource, ...inMemorySources];
  return newSource;
};

export const syncKnowledgeSource = async (id: string): Promise<KnowledgeSource> => {
  const source = inMemorySources.find((s) => s.id === id);
  if (source) {
    source.status = "ready";
    source.synced_at = new Date().toISOString();
    return { ...source };
  }
  throw new Error("Source not found");
};

export const syncAllKnowledge = async (): Promise<{ queued: number }> => {
  inMemorySources.forEach((s) => {
    s.status = "ready";
    s.synced_at = new Date().toISOString();
  });
  return { queued: inMemorySources.length };
};

export const deleteKnowledgeSource = async (id: string): Promise<void> => {
  inMemorySources = inMemorySources.filter((s) => s.id !== id);
};
