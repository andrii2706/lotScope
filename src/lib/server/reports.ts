import type { ReportRow } from "@/types/system";
import type { HistoryMediaType, Report, StoredHistoryDoc } from "@/types/report";

export const MAX_STORED_PHOTOS = 8;
export const MAX_PHOTO_CHARS = 900_000;
export const MAX_REPORT_REQUEST = 4_000_000;

export const MAX_HISTORY_DOCS = 4;
export const MAX_HISTORY_DOC_CHARS = 4_200_000;

function docsOf(id: string, body: Record<string, unknown>): Report["historyDocs"] {
  if (!Array.isArray(body.historyDocs)) return undefined;
  return (body.historyDocs as StoredHistoryDoc[]).map((d) => ({ name: d.name, mediaType: d.mediaType, url: `/api/reports/${id}/file/${d.n}` }));
}

export function rowToReport(r: ReportRow): Report {
  return {
    ...(r.body as unknown as Report),
    historyDocs: docsOf(r.id, r.body),
    id: r.id,
    createdAt: r.created_at.toISOString(),
    photos: Array.from({ length: r.photos }, (_, i) => `/api/reports/${r.id}/photo/${i}`),
    authorId: r.user_id ?? undefined,
    authorName: r.author ?? undefined,
    saved: true,
  };
}

export function parseDataUrl(value: string): { type: string; bytes: Buffer } | null {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value);
  return m ? { type: m[1], bytes: Buffer.from(m[2], "base64") } : null;
}

export const isDataUrl = (v: unknown): v is string => typeof v === "string" && v.length <= MAX_PHOTO_CHARS && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v);

const MAGIC: Record<HistoryMediaType, (b: Buffer) => boolean> = {
  "application/pdf": (b) => b.subarray(0, 5).toString("latin1") === "%PDF-",
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b.subarray(0, 4).toString("latin1") === "\x89PNG",
  "image/webp": (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
};

export const isHistoryMediaType = (v: unknown): v is HistoryMediaType => typeof v === "string" && v in MAGIC;

export function parseHistoryDoc(input: unknown): { name: string; mediaType: HistoryMediaType; data: string; bytes: Buffer } | null {
  if (!input || typeof input !== "object") return null;
  const { name, mediaType, data } = input as Record<string, unknown>;
  if (!isHistoryMediaType(mediaType)) return null;
  if (typeof data !== "string" || !data || data.length > MAX_HISTORY_DOC_CHARS || !/^[A-Za-z0-9+/=]+$/.test(data)) return null;
  const bytes = Buffer.from(data, "base64");
  if (bytes.length < 8 || !MAGIC[mediaType](bytes)) return null;
  const clean = (typeof name === "string" ? name : "").replace(/[\u0000-\u001f/\\]/g, "").trim().slice(0, 120);
  return { name: clean || (mediaType === "application/pdf" ? "Звіт історії.pdf" : "Звіт історії.jpg"), mediaType, data, bytes };
}
