"use client";

import { FileText, ImageIcon, LoaderCircle, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { preparePhoto } from "@/lib/images";
import type { HistoryFile } from "@/lib/types";

export const MAX_HISTORY_FILES = 4;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      resolve(url.slice(url.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error(`Не вдалося прочитати ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function HistoryUploader({
  files,
  onChange,
  disabled,
}: {
  files: HistoryFile[];
  onChange: (files: HistoryFile[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add(list: FileList | null) {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list);
    const room = MAX_HISTORY_FILES - files.length;
    setError(incoming.length > room ? `Можна додати не більше ${MAX_HISTORY_FILES} файлів.` : "");
    setBusy(true);
    const added: HistoryFile[] = [];
    for (const file of incoming.slice(0, Math.max(0, room))) {
      try {
        if (file.type === "application/pdf") {
          if (file.size > MAX_PDF_BYTES) {
            setError(`${file.name}: PDF більший за 10 МБ.`);
            continue;
          }
          added.push({ name: file.name, mediaType: "application/pdf", data: await readBase64(file) });
        } else if (file.type.startsWith("image/")) {
          const photo = await preparePhoto(file);
          added.push({ name: file.name, mediaType: "image/jpeg", data: photo.data });
        } else {
          setError(`${file.name}: підтримуються PDF і зображення.`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не вдалося обробити файл.");
      }
    }
    onChange([...files, ...added]);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        disabled={disabled || busy || files.length >= MAX_HISTORY_FILES}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-line2 bg-paper px-4 py-5 text-sm font-bold text-muted transition hover:border-accent-text/60 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <LoaderCircle className="size-5 animate-spin" /> : <Upload className="size-5" />}
        {busy ? "Обробляю…" : "Додати Carfax чи AutoCheck: PDF або скриншоти"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        multiple
        hidden
        onChange={(e) => add(e.target.files)}
      />

      {error && <p className="text-sm font-semibold text-bad">{error}</p>}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-panel2 text-accent-text">
                {f.mediaType === "application/pdf" ? <FileText className="size-4" /> : <ImageIcon className="size-4" />}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{f.name}</span>
              <button
                type="button"
                aria-label={`Прибрати ${f.name}`}
                disabled={disabled}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="grid size-8 place-items-center rounded-lg text-muted hover:bg-panel2 hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
