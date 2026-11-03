export type DbKind = "connect" | "schema" | "conflict" | "missing" | "data" | "timeout" | "other";

export interface DbProblem {
  kind: DbKind;
  status: number;
  message: string;
  code: string;
}

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface ReportRow {
  id: string;
  user_id: string | null;
  author: string | null;
  body: Record<string, unknown>;
  created_at: Date;
  photos: number;
}

export interface PreparedPhoto {
  id: string;
  name: string;
  data: string;
  thumb: string;
  cover: string;
}
