"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect } from "react";

export function Lightbox({
  images,
  index,
  onClose,
  onIndex,
}: {
  images: string[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const count = images.length;
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onIndex((index + 1) % count);
      else if (e.key === "ArrowLeft") onIndex((index - 1 + count) % count);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [index, count, onClose, onIndex]);

  if (!images[index]) return null;
  const nav = "absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-scrim text-white backdrop-blur transition hover:bg-black/80";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Перегляд фото"
      className="no-print fixed inset-0 z-50 grid place-items-center bg-black/90 p-4"
      onClick={onClose}
    >
      <img
        src={images[index]}
        alt={`Фото ${index + 1}`}
        referrerPolicy="no-referrer"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] max-w-full rounded-lg object-contain"
      />
      <button type="button" aria-label="Закрити" onClick={onClose} className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-scrim text-white backdrop-blur hover:bg-black/80">
        <X className="size-5" />
      </button>
      {count > 1 && (
        <>
          <button type="button" aria-label="Попереднє фото" onClick={(e) => { e.stopPropagation(); onIndex((index - 1 + count) % count); }} className={`${nav} left-3`}>
            <ChevronLeft className="size-6" />
          </button>
          <button type="button" aria-label="Наступне фото" onClick={(e) => { e.stopPropagation(); onIndex((index + 1) % count); }} className={`${nav} right-3`}>
            <ChevronRight className="size-6" />
          </button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-scrim px-3 py-1 text-sm font-bold text-white backdrop-blur">
            {index + 1} / {count}
          </span>
        </>
      )}
    </div>
  );
}
