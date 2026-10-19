import type { Report } from "./types";

export const MAX_STORED_PHOTOS = 8;
export const MAX_PHOTO_CHARS = 900_000;
export const MAX_REPORT_REQUEST = 4_000_000;

export interface ReportRow {
  id: string;
  user_id: string | null;
  author: string | null;
  body: Record<string, unknown>;
  created_at: Date;
  photos: number;
}

export function rowToReport(r: ReportRow): Report {
  return {
    ...(r.body as unknown as Report),
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
