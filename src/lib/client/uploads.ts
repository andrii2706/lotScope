"use client";

import { api } from "./api.ts";
import type { AnalysisUpload, AnalysisUploadResponse } from "@/types/report";

export const MAX_UPLOAD_CHARS = 4_200_000;
const PARALLEL = 3;

export async function uploadForAnalysis(
  items: AnalysisUpload[],
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  const tooBig = items.find((item) => item.data.length > MAX_UPLOAD_CHARS);
  if (tooBig) {
    throw new Error(`${tooBig.name}: файл завеликий. Збережіть звіт історії скриншотами або PDF до 3 МБ.`);
  }
  const ids: string[] = new Array(items.length);
  let next = 0;
  let done = 0;
  onProgress?.(0, items.length);
  async function worker() {
    while (next < items.length) {
      const i = next++;
      const { id } = await api<AnalysisUploadResponse>("/api/analyze/upload", { body: items[i] });
      ids[i] = id;
      done += 1;
      onProgress?.(done, items.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALLEL, items.length) }, worker));
  return ids;
}
