"use client";

import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { useRef, useState } from "react";
import { Lightbox } from "@/components/Lightbox";
import { MAX_PHOTOS } from "@/lib/defaults";
import { preparePhoto, type PreparedPhoto } from "@/lib/images";

const TIPS = ["Зона удару зблизька", "Салон", "Усі чотири боки", "Днище", "Відчинені двері з боку удару"];

export function PhotoUploader({
  photos,
  onChange,
  disabled,
}: {
  photos: PreparedPhoto[];
  onChange: (photos: PreparedPhoto[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState<number | null>(null);

  async function add(files: FileList | File[]) {
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    const room = MAX_PHOTOS - photos.length;
    setError(images.length > room ? `Можна додати не більше ${MAX_PHOTOS} фото.` : "");
    setBusy(true);
    const prepared: PreparedPhoto[] = [];
    for (const file of images.slice(0, Math.max(0, room))) {
      try {
        prepared.push(await preparePhoto(file));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не вдалося обробити фото.");
      }
    }
    onChange([...photos, ...prepared]);
    setBusy(false);
  }

  const full = photos.length >= MAX_PHOTOS;
  const empty = photos.length === 0;

  return (
    <div
      onPaste={(e) => {
        if (e.clipboardData.files.length > 0) {
          e.preventDefault();
          void add(e.clipboardData.files);
        }
      }}
    >
      <button
        type="button"
        disabled={disabled || full}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void add(e.dataTransfer.files);
        }}
        className={`group flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 text-center transition disabled:cursor-not-allowed disabled:opacity-60 ${
          empty ? "py-10 sm:py-12" : "py-6"
        } ${
          dragging
            ? "border-accent-text bg-accent-text/10"
            : "border-line2 bg-paper hover:border-accent-text/70 hover:bg-accent-text/[0.04]"
        }`}
      >
        <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-accent text-accent-ink transition group-hover:scale-105">
          {busy ? (
            <LoaderCircle className="size-6 animate-spin" />
          ) : (
            <ImagePlus className="size-6" strokeWidth={2} />
          )}
        </span>
        <span className="text-base font-extrabold">
          {busy
            ? "Обробляю фото…"
            : full
              ? "Додано максимум фото"
              : empty
                ? "Перетягніть фото лота сюди"
                : "Додати ще фото"}
        </span>
        <span className="mt-1 max-w-sm text-sm text-muted">
          {empty
            ? `або натисніть, щоб вибрати. Скриншоти з аукціону можна вставити через Ctrl+V. До ${MAX_PHOTOS} фото.`
            : `Додано ${photos.length} з ${MAX_PHOTOS}`}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) void add(e.target.files);
          e.target.value = "";
        }}
      />

      {error && <p className="mt-2 text-sm font-semibold text-bad">{error}</p>}

      {photos.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {photos.map((photo, i) => (
            <li key={photo.id} className="group relative overflow-hidden rounded-xl border border-line2">
              <button type="button" aria-label={`Збільшити фото ${i + 1}`} onClick={() => setZoom(i)} className="block w-full cursor-zoom-in">
                <img src={photo.thumb} alt={`Фото ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
              </button>
              <span className="absolute left-1.5 top-1.5 rounded-md bg-scrim px-1.5 text-[11px] font-bold leading-5 text-white backdrop-blur">
                {i + 1}
              </span>
              <button
                type="button"
                disabled={disabled}
                aria-label={`Прибрати фото ${i + 1}`}
                onClick={() => onChange(photos.filter((p) => p.id !== photo.id))}
                className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-md bg-scrim text-white backdrop-blur transition hover:bg-bad hover:text-on-ink"
              >
                <X className="size-3.5" strokeWidth={3} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {zoom !== null && (
        <Lightbox images={photos.map((p) => `data:image/jpeg;base64,${p.data}`)} index={Math.min(zoom, photos.length - 1)} onClose={() => setZoom(null)} onIndex={setZoom} />
      )}

      <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="mr-1 font-bold text-muted">Найкорисніші кадри:</span>
        {TIPS.map((tip) => (
          <span key={tip} className="rounded-full bg-panel2 px-2.5 py-1 font-semibold text-muted">
            {tip}
          </span>
        ))}
      </div>
    </div>
  );
}
