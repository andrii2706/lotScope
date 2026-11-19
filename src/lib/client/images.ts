"use client";
import type { PreparedPhoto } from "@/types/system";

function load(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Не вдалося відкрити ${file.name}`));
    };
    img.src = url;
  });
}

function loadUrl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Не вдалося обробити фото"));
    img.src = src;
  });
}

function render(img: HTMLImageElement, maxSide: number, quality: number): string {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Браузер не підтримує обробку зображень");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const img = await load(file);
  const full = render(img, 1344, 0.78);
  const thumb = render(img, 640, 0.62);
  const cover = render(img, 1200, 0.72);
  return {
    id: crypto.randomUUID(),
    name: file.name,
    data: full.slice(full.indexOf(",") + 1),
    thumb,
    cover,
  };
}

const SHRINK_STEPS: [number, number][] = [
  [1152, 0.74],
  [1024, 0.7],
  [896, 0.66],
  [768, 0.62],
];

export async function fitPhotosForAnalysis(photos: string[], budgetChars: number): Promise<string[]> {
  const total = (list: string[]) => list.reduce((sum, p) => sum + p.length, 0);
  if (total(photos) <= budgetChars) return photos;
  const images = await Promise.all(photos.map((p) => loadUrl(`data:image/jpeg;base64,${p}`)));
  let last = photos;
  for (const [side, quality] of SHRINK_STEPS) {
    last = images.map((img) => {
      const url = render(img, side, quality);
      return url.slice(url.indexOf(",") + 1);
    });
    if (total(last) <= budgetChars) return last;
  }
  return last;
}

export async function fileToLogo(file: File): Promise<string> {
  if (file.type === "image/svg+xml") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Не вдалося прочитати файл"));
      reader.readAsDataURL(file);
    });
  }
  const img = await load(file);
  const scale = Math.min(1, 320 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}
