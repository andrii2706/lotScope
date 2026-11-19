import { parseHistoryDoc } from "./reports.ts";
import type { AnalysisUpload, AnalysisUploadKind, HistoryMediaType } from "@/types/report";

export const MAX_UPLOAD_CHARS = 4_200_000;
export const MAX_UPLOAD_REQUEST = MAX_UPLOAD_CHARS + 2000;
export const UPLOAD_TTL_HOURS = 2;
export const MAX_PENDING_UPLOADS = 100;

const KINDS: AnalysisUploadKind[] = ["photo", "history"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type UploadRow = { id: string; kind: AnalysisUploadKind; name: string; media_type: HistoryMediaType; data: string };

export function parseUpload(input: unknown): AnalysisUpload | null {
  if (!input || typeof input !== "object") return null;
  const kind = (input as Record<string, unknown>).kind;
  if (!KINDS.includes(kind as AnalysisUploadKind)) return null;
  const doc = parseHistoryDoc(input);
  if (!doc || doc.data.length > MAX_UPLOAD_CHARS) return null;
  if (kind === "photo" && doc.mediaType === "application/pdf") return null;
  return { kind: kind as AnalysisUploadKind, name: doc.name, mediaType: doc.mediaType, data: doc.data };
}

export function uploadIds(value: unknown, max: number): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > max) return null;
  if (!value.every((v) => typeof v === "string" && UUID.test(v))) return null;
  return new Set(value).size === value.length ? (value as string[]) : null;
}

export function pickUploads(ids: string[], kind: AnalysisUploadKind, rows: UploadRow[]): UploadRow[] | null {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const picked: UploadRow[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (!row || row.kind !== kind) return null;
    picked.push(row);
  }
  return picked;
}
