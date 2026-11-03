"use client";

import { Download, GraduationCap, Plus, Trash2, Wrench } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, Field, PageHeader, Select } from "@/components/ui";
import { lotTitle } from "@/lib/shared/labels";
import { LESSON_TAGS, MAX_PROMPT_LESSONS } from "@/lib/shared/lessons";
import { removeLesson, saveLesson, setLessonActive, useLessons } from "@/lib/client/lessons";
import { useHydrated, useReports, useSettings } from "@/lib/client/store";
import { userMessage } from "@/lib/shared/errors";
import { expertStats, pct } from "@/lib/shared/expertStats";

export default function ExpertPage() {
  const hydrated = useHydrated();
  const lessons = useLessons();
  const reports = useReports();
  const settings = useSettings();
  const [tag, setTag] = useState("Усі");
  const [adding, setAdding] = useState(false);
  const [rule, setRule] = useState("");
  const [newTag, setNewTag] = useState(LESSON_TAGS[0]);
  const [error, setError] = useState("");

  if (!hydrated) return <p className="text-sm text-muted">Завантажую…</p>;

  const s = expertStats(reports);
  const active = lessons.filter((l) => l.active).length;
  const visible = (tag === "Усі" ? lessons : lessons.filter((l) => l.tag === tag)).toSorted((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  async function addLesson() {
    const text = rule.trim();
    if (!text) return;
    setError("");
    try {
      await saveLesson({ rule: text, tag: newTag, expert: settings.expertName, active: true });
      setRule("");
      setAdding(false);
    } catch (e) {
      setError(userMessage(e, "Не вдалося зберегти урок."));
    }
  }

  function exportJson() {
    const data = {
      exportedAt: new Date().toISOString(),
      lessons,
      reviews: reports
        .filter((r) => r.expert)
        .map((r) => ({
          reportId: r.id,
          lot: r.lot,
          ai: {
            verdict: r.analysis.verdict,
            repairMinUsd: r.analysis.repairMinUsd,
            repairMaxUsd: r.analysis.repairMaxUsd,
            damagedParts: r.analysis.damagedParts,
          },
          expert: r.expert,
        })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `lotscope-expert-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tiles = [
    { label: "Перевірено звітів", value: String(s.reviewed) },
    { label: "Згода по деталях", value: pct(s.agreement) },
    { label: "Ремонт ШІ vs експерт", value: pct(s.deviation, true) },
    { label: "Висновок збігся", value: pct(s.verdictMatch) },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <GraduationCap className="size-3.5" /> Навчання моделі
          </>
        }
        title="Уроки експерта СТО"
        description="Кожна перевірка звіту може стати правилом. Активні уроки додаються до інструкції моделі в кожному новому аналізі, тож вона не повторює ту саму помилку."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportJson} disabled={lessons.length === 0 && s.reviewed === 0}>
              <Download className="size-4" /> Експорт JSON
            </Button>
            <Button onClick={() => setAdding(true)}>
              <Plus className="size-4" /> Додати урок
            </Button>
          </div>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card p-4 sm:p-5">
            <p className="text-[13px] font-medium text-muted">{t.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{t.value}</p>
          </div>
        ))}
      </section>
      <p className="mt-2 text-xs text-faint">
        «Ремонт ШІ vs експерт»: на скільки середина вилки ШІ відрізняється від вилки експерта. Плюс означає, що ШІ завищує.
        Активних уроків: {active}; у кожен аналіз іде до {MAX_PROMPT_LESSONS} найсвіжіших.
      </p>

      {error && <p className="mt-4 rounded-xl bg-bad-bg px-4 py-3 text-sm font-semibold text-bad">{error}</p>}

      {adding && (
        <section className="card mt-5 p-5 sm:p-6">
          <Field label="Новий урок" hint="Одне загальне правило з причиною. Модель застосує його, коли ситуація збігається.">
            <textarea className="control min-h-24" value={rule} onChange={(e) => setRule(e.target.value)} />
          </Field>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-bold">
              <span className="text-muted">Тема</span>
              <Select size="sm" className="w-52" value={newTag} onChange={setNewTag} options={LESSON_TAGS.map((t) => ({ value: t, label: t }))} />
            </label>
            <Button variant="ghost" className="ml-auto" onClick={() => setAdding(false)}>
              Скасувати
            </Button>
            <Button disabled={!rule.trim()} onClick={addLesson}>
              Зберегти урок
            </Button>
          </div>
        </section>
      )}

      <section className="card mt-5 overflow-hidden">
        <div className="flex flex-wrap gap-1.5 border-b border-line p-4">
          {["Усі", ...LESSON_TAGS].map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tag === t}
              onClick={() => setTag(t)}
              className={`rounded-full px-3 py-1.5 text-[13px] font-bold ${tag === t ? "bg-panel2 text-ink ring-1 ring-line2" : "text-muted hover:text-ink"}`}
            >
              {t}
            </button>
          ))}
        </div>
        {visible.length === 0 ? (
          <div className="p-8 text-center">
            <span className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-panel2 text-muted">
              <Wrench className="size-6" />
            </span>
            <p className="font-bold">Уроків ще немає</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted">
              Відкрийте звіт, натисніть «Перевірити звіт» під фото і заповніть поле «Урок для моделі». Або додайте урок вручну.
            </p>
          </div>
        ) : (
          <ul>
            {visible.map((l) => (
              <li key={l.id} className="grid gap-3 border-b border-line p-4 last:border-b-0 sm:p-5 md:grid-cols-[minmax(0,1fr)_12rem_auto] md:items-center">
                <div className="min-w-0">
                  <p className={`leading-relaxed ${l.active ? "font-semibold" : "text-muted line-through decoration-1"}`}>{l.rule}</p>
                  <p className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                    <span className="rounded-full bg-panel2 px-2.5 py-0.5 font-bold">{l.tag}</span>
                    {l.reportId && (
                      <Link href={`/report/${l.reportId}`} className="px-1 py-0.5 font-bold text-accent-text hover:underline">
                        зі звіту {l.reportTitle}
                      </Link>
                    )}
                  </p>
                </div>
                <p className="text-sm text-muted">
                  <span className="block font-bold text-ink">{l.expert}</span>
                  {new Date(l.createdAt).toLocaleDateString("uk-UA")}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-pressed={l.active}
                    onClick={() => setLessonActive(l.id, !l.active).catch((e: unknown) => setError(userMessage(e)))}
                    className={`h-9 rounded-full border px-3.5 text-xs font-semibold ${
                      l.active ? "border-good bg-good-bg text-good" : "border-line2 text-muted"
                    }`}
                  >
                    {l.active ? "Активний" : "Вимкнено"}
                  </button>
                  <button
                    type="button"
                    aria-label="Видалити урок"
                    onClick={() => removeLesson({ id: l.id }).catch((e: unknown) => setError(userMessage(e)))}
                    className="grid size-9 place-items-center rounded-full text-muted hover:bg-bad-bg hover:text-bad"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {s.pending.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-3 text-base font-semibold">Звіти без перевірки</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {s.pending.slice(0, 9).map((r) => (
              <li key={r.id}>
                <Link href={`/report/${r.id}#expert`} className="card flex items-center justify-between gap-3 p-4 transition hover:border-line2">
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{lotTitle(r.lot)}</span>
                    <span className="text-xs text-muted">{new Date(r.createdAt).toLocaleDateString("uk-UA")}</span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-accent-text">Перевірити →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
