"use client";

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const MARGIN_MM = 12;
const CONTENT_W_PX = 703;
const SCALE = 2;
const ATOMIC = ".avoid-break, tr, li, p, img, h1, h2, h3, dt, dd, header, footer, table thead";

function waitImages(root: HTMLElement): Promise<unknown> {
  return Promise.all(
    [...root.querySelectorAll("img")].map((img) =>
      img.complete && img.naturalWidth > 0 ? Promise.resolve() : img.decode().catch(() => undefined),
    ),
  );
}

export function pageBreaks(spans: { top: number; bottom: number; heading: boolean }[], total: number, pageH: number): number[] {
  const inner = spans.filter((s) => s.bottom - s.top < pageH);
  const candidates = [...new Set(inner.flatMap((s) => [s.top, s.bottom]))].sort((a, b) => a - b);
  const cuts: number[] = [];
  let start = 0;
  while (total - start > pageH) {
    const limit = start + pageH;
    let cut = 0;
    for (const y of candidates) {
      if (y <= start || y > limit) continue;
      if (inner.some((s) => s.top < y && s.bottom > y)) continue;
      if (inner.some((s) => s.heading && y >= s.bottom - 1 && y - s.bottom < 48)) continue;
      cut = y;
    }
    if (cut <= start + pageH * 0.3) cut = limit;
    cuts.push(cut);
    start = cut;
  }
  return cuts;
}

export async function downloadReportPdf(article: HTMLElement, fileName: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  const host = article.closest<HTMLElement>(".app-bg") ?? document.body;
  const frame = document.createElement("div");
  frame.className = "pdf-capture";
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, { position: "fixed", left: "-20000px", top: "0", width: `${CONTENT_W_PX}px`, background: "#ffffff", pointerEvents: "none" });
  const clone = article.cloneNode(true) as HTMLElement;
  clone.classList.remove("print-only");
  clone.style.display = "block";
  for (const el of clone.querySelectorAll<HTMLElement>('[class*="first-letter:uppercase"]')) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node && !node.textContent?.trim()) node = walker.nextNode();
    if (node?.textContent) {
      const text = node.textContent;
      const i = text.search(/\S/);
      node.textContent = text.slice(0, i) + text.charAt(i).toUpperCase() + text.slice(i + 1);
    }
    el.classList.remove("first-letter:uppercase");
  }
  frame.appendChild(clone);
  host.appendChild(frame);
  try {
    await document.fonts.ready.catch(() => undefined);
    await waitImages(clone);
    const origin = clone.getBoundingClientRect().top;
    const spans = [...clone.querySelectorAll<HTMLElement>(ATOMIC)].map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top - origin, bottom: r.bottom - origin, heading: /^H[1-3]$/.test(el.tagName) };
    });
    const total = clone.scrollHeight;
    const pageH = (CONTENT_W_PX * (PAGE_H_MM - 2 * MARGIN_MM)) / (PAGE_W_MM - 2 * MARGIN_MM);
    const cuts = pageBreaks(spans, total, pageH);
    const canvas = await html2canvas(clone, { scale: SCALE, backgroundColor: "#ffffff", useCORS: true, logging: false });
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    const mmPerPx = (PAGE_W_MM - 2 * MARGIN_MM) / CONTENT_W_PX;
    const bounds = [0, ...cuts, total];
    for (let i = 0; i < bounds.length - 1; i++) {
      const from = Math.round(bounds[i] * SCALE);
      const to = Math.min(canvas.height, Math.round(bounds[i + 1] * SCALE));
      if (to <= from) continue;
      const page = document.createElement("canvas");
      page.width = canvas.width;
      page.height = to - from;
      const ctx = page.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, page.width, page.height);
      ctx.drawImage(canvas, 0, from, canvas.width, to - from, 0, 0, canvas.width, to - from);
      if (i > 0) pdf.addPage();
      pdf.addImage(page.toDataURL("image/jpeg", 0.9), "JPEG", MARGIN_MM, MARGIN_MM, PAGE_W_MM - 2 * MARGIN_MM, ((to - from) / SCALE) * mmPerPx, undefined, "FAST");
    }
    const href = URL.createObjectURL(pdf.output("blob"));
    const link = document.createElement("a");
    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
  } finally {
    frame.remove();
  }
}

export function pdfFileName(parts: (string | number | undefined)[]): string {
  const base = parts
    .filter((p) => p !== undefined && p !== "")
    .join(" ")
    .replace(/[^A-Za-z0-9 ._()-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return `${base || "LotScope report"}.pdf`;
}
