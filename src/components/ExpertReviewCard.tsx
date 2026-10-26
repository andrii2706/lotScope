"use client";

import { Check, GraduationCap, Pencil, Wrench, X } from "lucide-react";
import { useState } from "react";
import { usd } from "@/lib/calc";
import { ACTION, VERDICT, lotTitle } from "@/lib/labels";
import { LESSON_TAGS } from "@/lib/lessons";
import { removeLesson, saveLesson } from "@/lib/lessonsClient";
import { useMe } from "@/lib/me";
import { getSettings, saveSettings, updateReport } from "@/lib/store";
import type { ExpertPartReview, ExpertReview, Report, Verdict } from "@/lib/types";
import { Button, Field, NumberInput } from "./ui";

const VERDICTS: { value: Verdict; label: string; cls: string }[] = [
  { value: "buy", label: "Купувати", cls: "border-good bg-good-bg text-good" },
  { value: "caution", label: "Обережно", cls: "border-warn bg-warn-bg text-warn" },
  { value: "avoid", label: "Не брати", cls: "border-bad bg-bad-bg text-bad" },
];

function blank(report: Report): ExpertReview {
  return {
    expert: getSettings().expertName,
    verdict: "",
    repairMinUsd: 0,
    repairMaxUsd: 0,
    parts: report.analysis.damagedParts.map(() => ({ agree: null, costMinUsd: 0, costMaxUsd: 0, note: "" })),
    missedParts: "",
    comment: "",
    lesson: "",
    lessonTag: LESSON_TAGS[0],
    useLesson: true,
    reviewedAt: "",
  };
}

export function ExpertReviewCard({ report }: { report: Report }) {
  const saved = report.expert;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ExpertReview>(() => saved ?? blank(report));
  const [applyRange, setApplyRange] = useState(true);
  const me = useMe();
  const canTeach = me.status === "ready" && (me.user?.role === "expert");

  const set = <K extends keyof ExpertReview>(key: K, value: ExpertReview[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const setPart = (i: number, patch: Partial<ExpertPartReview>) =>
    setDraft((d) => ({ ...d, parts: d.parts.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));

  const parts = report.analysis.damagedParts;
  const reviewed = draft.parts.filter((p) => p.agree !== null).length;
  const disagreed = draft.parts.filter((p) => p.agree === false).length;
  const canSave = Boolean(
    draft.expert.trim() && (draft.verdict || reviewed > 0 || draft.comment.trim() || draft.lesson.trim()),
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    setError("");
    try {
      if (canTeach && draft.lesson.trim()) {
        await saveLesson({
          rule: draft.lesson.trim(),
          tag: draft.lessonTag,
          reportId: report.id,
          reportTitle: lotTitle(report.lot),
          expert: draft.expert.trim(),
          active: draft.useLesson,
        });
      } else if (canTeach && saved?.lesson) {
        await removeLesson({ reportId: report.id });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося зберегти урок.");
      setSaving(false);
      return;
    }
    setSaving(false);
    const review: ExpertReview = {
      ...draft,
      expert: draft.expert.trim(),
      lesson: draft.lesson.trim(),
      reviewedAt: new Date().toISOString(),
    };
    const patch: Partial<Report> = { expert: review };
    if (applyRange && review.repairMaxUsd > 0) {
      patch.overrides = {
        ...report.overrides,
        repairMinUsd: Math.min(review.repairMinUsd, review.repairMaxUsd),
        repairMaxUsd: Math.max(review.repairMinUsd, review.repairMaxUsd),
      };
    }
    updateReport(report.id, patch);
    const settings = getSettings();
    if (settings.expertName !== review.expert) saveSettings({ ...settings, expertName: review.expert });
    setOpen(false);
  }

  const verdictInfo = saved?.verdict ? VERDICT[saved.verdict] : null;

  return (
    <section
      id="expert"
      className="no-print card mt-5 overflow-hidden border-[color-mix(in_oklch,var(--series-1)_45%,var(--line))]"
    >
      <header className="flex flex-wrap items-center gap-3 p-5 sm:px-6">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklch,var(--series-1)_18%,transparent)] text-[var(--series-1)]">
          <Wrench className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-extrabold tracking-tight sm:text-lg">Перевірка експерта СТО</h2>
          {saved ? (
            <p className="text-sm text-muted">
              {saved.expert} · {new Date(saved.reviewedAt).toLocaleDateString("uk-UA")}
              {verdictInfo && (
                <>
                  {" "}
                  · висновок: <span className="font-bold text-ink">{verdictInfo.label}</span>
                </>
              )}
              {saved.repairMaxUsd > 0 && (
                <>
                  {" "}
                  · ремонт {usd(saved.repairMinUsd)}–{usd(saved.repairMaxUsd)}
                </>
              )}
              {saved.parts.some((p) => p.agree !== null) && (
                <>
                  {" "}
                  · незгод по деталях: {saved.parts.filter((p) => p.agree === false).length} з{" "}
                  {saved.parts.filter((p) => p.agree !== null).length}
                </>
              )}
            </p>
          ) : (
            <p className="text-sm text-muted">
              Досвідчений майстер звіряє оцінку ШІ. Його правки стають уроками для наступних аналізів.
            </p>
          )}
        </div>
        {!open && (
          <Button variant={saved ? "secondary" : "primary"} onClick={() => setOpen(true)}>
            {saved ? <Pencil className="size-4" /> : <Wrench className="size-4" />}
            {saved ? "Редагувати перевірку" : "Перевірити звіт"}
          </Button>
        )}
      </header>

      {!open && saved && (saved.comment || saved.lesson) && (
        <div className="grid gap-3 border-t border-line px-5 py-4 text-sm sm:px-6 md:grid-cols-2">
          {saved.comment && <p className="leading-relaxed text-ink/90">{saved.comment}</p>}
          {saved.lesson && (
            <p className="flex gap-2 leading-relaxed text-ink/90">
              <GraduationCap className="mt-0.5 size-4 shrink-0 text-accent-text" />
              <span>
                <span className="font-bold">Урок для моделі{saved.useLesson ? "" : " (вимкнено)"}: </span>
                {saved.lesson}
              </span>
            </p>
          )}
        </div>
      )}

      {open && (
        <div className="space-y-6 border-t border-line p-5 sm:p-6">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
            <Field label="Експерт" required>
              <input
                className="control"
                placeholder="Ім'я, спеціалізація"
                value={draft.expert}
                onChange={(e) => set("expert", e.target.value)}
              />
            </Field>
            <div>
              <span className="mb-1.5 block text-[13px] font-bold text-ink/80">Висновок експерта</span>
              <div role="radiogroup" aria-label="Висновок експерта" className="grid grid-cols-3 gap-1.5">
                {VERDICTS.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    role="radio"
                    aria-checked={draft.verdict === v.value}
                    onClick={() => set("verdict", draft.verdict === v.value ? "" : v.value)}
                    className={`min-h-11 rounded-xl border text-[13px] font-extrabold transition ${
                      draft.verdict === v.value ? v.cls : "border-line2 text-muted hover:text-ink"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Ремонт від">
                <NumberInput value={draft.repairMinUsd} onChange={(v) => set("repairMinUsd", v)} suffix="$" />
              </Field>
              <Field label="Ремонт до">
                <NumberInput value={draft.repairMaxUsd} onChange={(v) => set("repairMaxUsd", v)} suffix="$" />
              </Field>
            </div>
          </div>
          <p className="-mt-3 text-xs text-muted">
            ШІ оцінив ремонт у {usd(report.analysis.repairMinUsd)}–{usd(report.analysis.repairMaxUsd)}.
          </p>

          {parts.length > 0 && (
            <div>
              <p className="mb-2 text-[13px] font-bold text-ink/80">
                Деталі від ШІ{" "}
                <span className="font-semibold text-muted">
                  · перевірено {reviewed} з {parts.length}, незгод {disagreed}
                </span>
              </p>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {parts.map((p, i) => {
                  const r = draft.parts[i] ?? { agree: null, costMinUsd: 0, costMaxUsd: 0, note: "" };
                  return (
                    <li
                      key={`${p.part}-${i}`}
                      className="grid gap-3 p-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    >
                      <div className="min-w-0">
                        <p className="font-bold">{p.part}</p>
                        <p className="text-xs text-muted">
                          {ACTION[p.action]} · {usd(p.costMinUsd)}–{usd(p.costMaxUsd)}
                          {p.note && ` · ${p.note}`}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          aria-pressed={r.agree === true}
                          onClick={() => setPart(i, { agree: r.agree === true ? null : true })}
                          className={`inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-xs font-extrabold ${
                            r.agree === true
                              ? "border-good bg-good-bg text-good"
                              : "border-line2 text-muted hover:text-ink"
                          }`}
                        >
                          <Check className="size-3.5" /> Згоден
                        </button>
                        <button
                          type="button"
                          aria-pressed={r.agree === false}
                          onClick={() => setPart(i, { agree: r.agree === false ? null : false })}
                          className={`inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-xs font-extrabold ${
                            r.agree === false
                              ? "border-[var(--series-1)] bg-[color-mix(in_oklch,var(--series-1)_15%,transparent)] text-[var(--series-1)]"
                              : "border-line2 text-muted hover:text-ink"
                          }`}
                        >
                          <X className="size-3.5" /> Ні
                        </button>
                      </div>
                      {r.agree === false && (
                        <div className="grid gap-2 sm:col-span-2 sm:grid-cols-[8rem_8rem_minmax(0,1fr)]">
                          <NumberInput
                            value={r.costMinUsd}
                            onChange={(v) => setPart(i, { costMinUsd: v })}
                            suffix="$"
                            placeholder="від"
                          />
                          <NumberInput
                            value={r.costMaxUsd}
                            onChange={(v) => setPart(i, { costMaxUsd: v })}
                            suffix="$"
                            placeholder="до"
                          />
                          <input
                            className="control"
                            aria-label={`Що не так з оцінкою: ${p.part}`}
                            placeholder="Що не так: дія, ціна, деталь"
                            value={r.note}
                            onChange={(e) => setPart(i, { note: e.target.value })}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Що ШІ пропустив">
              <textarea
                className="control min-h-24"
                placeholder="Деталі чи ризики, яких немає у звіті"
                value={draft.missedParts}
                onChange={(e) => set("missedParts", e.target.value)}
              />
            </Field>
            <Field label="Коментар експерта">
              <textarea
                className="control min-h-24"
                placeholder="Як би ви оцінили цей лот і чому"
                value={draft.comment}
                onChange={(e) => set("comment", e.target.value)}
              />
            </Field>
          </div>

          {canTeach ? (
            <div className="rounded-2xl border border-line2 bg-paper p-4">
              <Field
                label="Урок для моделі"
                hint="Одне загальне правило, яке допоможе на інших лотах. Наприклад: «Якщо удар у низ задньої дверки з розривом металу, закладай ремонт порога»."
              >
                <textarea
                  className="control min-h-20"
                  value={draft.lesson}
                  onChange={(e) => set("lesson", e.target.value)}
                />
              </Field>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
                <label className="flex items-center gap-2 text-sm font-bold">
                  <span className="text-muted">Тема</span>
                  <select
                    className="control !min-h-9 !w-auto !py-1"
                    value={draft.lessonTag}
                    onChange={(e) => set("lessonTag", e.target.value)}
                  >
                    {LESSON_TAGS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    className="size-4.5 accent-[var(--accent)]"
                    checked={draft.useLesson}
                    onChange={(e) => set("useLesson", e.target.checked)}
                  />
                  Враховувати в наступних аналізах
                </label>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">Уроки для моделі пишуть технічні спеціалісти СТО.</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {draft.repairMaxUsd > 0 && (
              <label className="mr-auto flex items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  className="size-4.5 accent-[var(--accent)]"
                  checked={applyRange}
                  onChange={(e) => setApplyRange(e.target.checked)}
                />
                Використати вилку експерта в ціні під ключ
              </label>
            )}
            <Button
              variant="ghost"
              className="ml-auto"
              onClick={() => {
                setDraft(saved ?? blank(report));
                setOpen(false);
              }}
            >
              Скасувати
            </Button>
            <Button disabled={!canSave || saving} onClick={save}>
              <Check className="size-4" /> Зберегти перевірку
            </Button>
          </div>
          {error && <p className="-mt-3 text-right text-sm font-semibold text-bad">{error}</p>}
          {!canSave && (
            <p className="-mt-3 text-right text-xs text-muted">
              Вкажіть експерта й хоча б висновок, оцінку деталі чи коментар.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
