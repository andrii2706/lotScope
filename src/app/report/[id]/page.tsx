"use client";

import {
  ArrowLeft,
  Camera,
  CarFront,
  ChevronDown,
  CircleCheck,
  CircleX,
  Crosshair,
  FileSearch,
  ListChecks,
  Maximize2,
  Pencil,
  Printer,
  ShieldCheck,
  ThumbsUp,
  TriangleAlert,
  Wind,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Lightbox } from "@/components/Lightbox";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CostBar, CostTable } from "@/components/CostTable";
import { ExpertReviewCard } from "@/components/ExpertReviewCard";
import { HistoryMarket } from "@/components/HistoryMarket";
import { PrintReport } from "@/components/PrintReport";
import { ScoreRing } from "@/components/ScoreRing";
import { Button, Notice } from "@/components/ui";
import { calculate, usd } from "@/lib/calc";
import { useCan, useMe } from "@/lib/me";
import {
  ACTION,
  AIRBAG,
  CONFIDENCE,
  FUEL,
  LEVEL,
  LEVEL_TONE,
  LIKELIHOOD,
  RUN,
  TONE_BG,
  TONE_TEXT,
  VERDICT,
  lotTitle,
  mileageText,
} from "@/lib/labels";
import {
  updateReport,
  useHydrated,
  useReports,
  useSettings,
} from "@/lib/store";
import type { CostOverrides, Level, PartAction } from "@/lib/types";

type Tone = "good" | "warn" | "bad";

const VERDICT_ICON = {
  buy: CircleCheck,
  caution: TriangleAlert,
  avoid: CircleX,
};
const ACTION_STYLE: Record<PartAction, string> = {
  replace: "bg-bad-bg text-bad",
  repair: "bg-warn-bg text-warn",
  paint: "bg-panel2 text-ink",
  inspect: "bg-panel2 text-muted",
};
const LEVEL_DOTS: Record<Level, number> = { low: 1, medium: 2, high: 3 };
const DOT = { good: "bg-good", warn: "bg-warn", bad: "bg-bad" };

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const hydrated = useHydrated();
  const reports = useReports();
  const settings = useSettings();
  const me = useMe();
  const canPdf = useCan("pdf");
  const canSave = useCan("save");
  const canExpert = useCan("expert");
  const [draft, setDraft] = useState<CostOverrides | null>(null);
  const [savedNote, setSavedNote] = useState(false);
  const editRef = useRef<HTMLElement>(null);
  const tableRef = useRef<HTMLElement>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [photo, setPhoto] = useState(0);
  const [zoom, setZoom] = useState(false);

  const report = reports.find((r) => r.id === id);

  useEffect(() => {
    if (canPdf) return;
    document.body.classList.add("print-locked");
    return () => document.body.classList.remove("print-locked");
  }, [canPdf]);

  if (!hydrated) return <p className="text-sm text-muted">Завантажую звіт…</p>;
  if (!report) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-panel2 text-muted">
          <FileSearch className="size-6" />
        </span>
        <h1 className="text-xl font-extrabold">Звіт не знайдено</h1>
        <p className="mt-2 text-sm text-muted">
          Звіти без підписки не зберігаються й зникають після оновлення сторінки.
          Також звіт могли видалити, або він належить іншому користувачу.
        </p>
        <Link
          href="/history"
          className="mt-5 inline-block text-sm font-bold text-accent-text hover:underline"
        >
          Перейти до історії
        </Link>
      </div>
    );
  }

  const { lot, analysis, overrides } = report;
  const live = draft ?? overrides;
  const cost = calculate(lot, settings, live, {
    min: analysis.repairMinUsd,
    max: analysis.repairMaxUsd,
  });
  const verdict = VERDICT[analysis.verdict];
  const VerdictIcon = VERDICT_ICON[analysis.verdict];
  const bid = live.bidUsd ?? lot.bidUsd;
  const hasMarket = cost.marketPriceUsd > 0;
  const activePhoto = Math.min(photo, Math.max(0, report.photos.length - 1));
  const canEditAmounts = report.id.startsWith("tmp-") || canExpert || (canSave && me.status === "ready" && Boolean(me.user) && report.authorId === me.user?.id);
  const editing = draft !== null && canEditAmounts;
  const showTable = tableOpen || editing;
  const dirty = editing && !sameOverrides(draft, overrides);

  const scrollTo = (ref: { current: HTMLElement | null }, focus = false) =>
    window.setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (focus) ref.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    }, 60);

  const scrollToCost = () =>
    window.setTimeout(() => document.getElementById("cost-summary")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);

  const startEditing = () => {
    setSavedNote(false);
    setDraft({ ...overrides });
    scrollTo(editRef, true);
  };
  const cancelEditing = () => {
    setDraft(null);
    scrollToCost();
  };
  const saveEditing = () => {
    if (draft && dirty) updateReport(report.id, { overrides: draft });
    setDraft(null);
    setSavedNote(Boolean(draft && dirty));
    scrollToCost();
    if (draft && dirty) window.setTimeout(() => setSavedNote(false), 6000);
  };
  const toggleTable = () => {
    const next = !tableOpen;
    setTableOpen(next);
    if (next) scrollTo(tableRef);
  };

  const setOverride = (key: keyof CostOverrides, value: number | undefined) => {
    setDraft((prev) => {
      const next = { ...(prev ?? overrides) };
      if (value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });
  };

  const engine =
    lot.fuel === "electric"
      ? `електро, ${lot.batteryKwh} кВт·год`
      : `${FUEL[lot.fuel]}, ${(lot.engineCc / 1000).toFixed(1)} л`;
  const auction = [
    lot.auction === "Other" ? "" : lot.auction,
    lot.lotNumber && `лот ${lot.lotNumber}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const damages = [...new Set([lot.primaryDamage, lot.secondaryDamage].filter(Boolean))];

  const facts = [
    ["Пробіг", mileageText(lot)],
    ["Двигун", engine],
    ["Аукціон", auction],
    ["Пошкодження", damages.join(" / ")],
    ["Документ", lot.titleType],
    ["Стан", RUN[lot.runStatus]],
    ["VIN", lot.vin],
    ["VIN на фото", analysis.vinOnPhoto ?? ""],
    ["Пробіг на фото", analysis.odometerOnPhoto ?? ""],
  ].filter(([, value]) => value);

  const photoReadings = [
    analysis.vinOnPhoto ? `VIN ${analysis.vinOnPhoto}` : "",
    analysis.odometerOnPhoto ? `пробіг ${analysis.odometerOnPhoto}` : "",
  ].filter(Boolean);

  const tags = [...new Set([auction, ...damages, lot.titleType].filter(Boolean))];
  const heroFacts = [
    ["Пробіг", mileageText(lot)],
    ["Двигун", engine],
    ["Стан", RUN[lot.runStatus]],
    ["VIN", lot.vin],
  ].filter(([, value]) => value);

  const savingsTone: Tone =
    cost.savingsPct >= settings.targetSavingsPct
      ? "good"
      : cost.savingsUsd > 0
        ? "warn"
        : "bad";
  const scenarioMax = Math.max(
    1,
    ...analysis.scenarios.map((s) => s.repairMaxUsd),
  );

  return (
    <>
      <div className="no-print">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Link
            href="/history"
            className="mr-auto inline-flex items-center gap-1.5 rounded-xl py-2 pr-2 text-sm font-bold text-muted transition hover:text-ink"
          >
            <ArrowLeft className="size-4" /> Усі звіти
          </Link>
          {canEditAmounts && (
            <Button
              variant="secondary"
              onClick={startEditing}
              disabled={editing}
              title={editing ? "Спершу збережіть або скасуйте поточні зміни нижче" : "Змінити суми в розрахунку"}
            >
              <Pencil className="size-4" /> Змінити суми
            </Button>
          )}
          {canPdf ? (
            <Button
              onClick={() => {
                if (report.saved) void fetch(`/api/reports/${report.id}/event`, { method: "POST" });
                window.print();
              }}
            >
              <Printer className="size-4" /> Звіт для клієнта (PDF)
            </Button>
          ) : (
            me.status === "ready" &&
            me.user?.role === "user" && (
              <Link href="/billing" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line2 px-4 text-sm font-bold text-muted hover:text-ink">
                <Printer className="size-4" /> PDF і збереження — з підпискою
              </Link>
            )
          )}
        </div>

        {report.saved === false && (
          <div className="mb-5">
            <Notice tone="warn" title="Звіт не збережено">
              {canSave
                ? "Не вдалося зберегти звіт на сервері. Він зникне після оновлення сторінки."
                : "Без активної підписки звіт можна лише переглянути. Після оновлення сторінки він зникне, а PDF недоступний."}{" "}
              {!canSave && me.status === "ready" && me.user?.role === "user" && (
                <Link href="/billing" className="font-bold underline">
                  Оформити підписку
                </Link>
              )}
            </Notice>
          </div>
        )}

        {report.demo && (
          <div className="mb-5">
            <Notice tone="warn" title="Демо-звіт: це не аналіз ваших фото">
              Ключ API не був налаштований, тому опис пошкоджень і вилка ремонту
              нижче — заздалегідь підготовлений приклад. Розрахунок розмитнення
              та ціни під ключ зроблено за введеними даними лота.
            </Notice>
          </div>
        )}

        {zoom && <Lightbox images={report.photos} index={activePhoto} onClose={() => setZoom(false)} onIndex={setPhoto} />}

        <section className="rise grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="relative min-h-[22rem] flex-1 overflow-hidden rounded-3xl border border-line bg-surface sm:min-h-[26rem] lg:min-h-[31rem]">
              {report.photos.length > 0 ? (
                <img
                  src={report.photos[activePhoto]}
                  alt={`Фото ${activePhoto + 1}`}
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-faint">
                  <CarFront className="size-20" strokeWidth={1.2} />
                </div>
              )}
              {report.photos.length > 0 && (
                <button
                  type="button"
                  aria-label="Збільшити фото"
                  title="Збільшити фото"
                  onClick={() => setZoom(true)}
                  className="no-print absolute bottom-4 right-4 z-10 grid size-10 place-items-center rounded-full bg-scrim text-white backdrop-blur transition hover:bg-black/80"
                >
                  <Maximize2 className="size-4.5" />
                </button>
              )}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,15,.6)_0%,rgba(10,12,15,0)_28%,rgba(10,12,15,0)_45%,rgba(10,12,15,.94)_100%)]"
              />
              <div className="absolute inset-x-4 top-4 flex flex-wrap items-center gap-2 sm:inset-x-5 sm:top-5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/15 bg-scrim px-3 py-1.5 text-xs font-bold text-white backdrop-blur"
                  >
                    {tag}
                  </span>
                ))}
                {report.photos.length > 1 && (
                  <span className="ml-auto rounded-full border border-white/15 bg-scrim px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
                    {activePhoto + 1} / {report.photos.length}
                  </span>
                )}
              </div>
              <div className="absolute inset-x-5 bottom-5 sm:inset-x-7 sm:bottom-6">
                <h1 className="max-w-xl font-display text-[26px] font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl">
                  {lotTitle(lot)}
                </h1>
                <dl className="mt-4 flex flex-wrap gap-2">
                  {heroFacts.map(([label, value]) => (
                    <div
                      key={label}
                      className="flex gap-1.5 rounded-xl border border-white/10 bg-scrim px-3 py-1.5 text-[13px] backdrop-blur"
                    >
                      <dt className="font-semibold text-white/60">{label}</dt>
                      <dd className="font-bold text-white">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            {report.photos.length > 1 && (
              <ul className="flex gap-2 overflow-x-auto pb-1">
                {report.photos.map((src, i) => (
                  <li key={i} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setPhoto(i)}
                      aria-label={`Показати фото ${i + 1}`}
                      aria-pressed={i === activePhoto}
                      className={`block overflow-hidden rounded-xl border-2 transition ${
                        i === activePhoto
                          ? "border-accent-text"
                          : "border-line2 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={src}
                        alt=""
                        className="h-14 w-20 object-cover"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid min-w-0 content-start gap-3.5 lg:grid-rows-[auto_1fr_auto]">
            <div className="card flex items-center gap-5 p-5 sm:p-6">
              <ScoreRing
                score={analysis.conditionScore}
                tone={verdict.tone}
                size={92}
              />
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.09em] text-muted">
                  Висновок
                </p>
                <p
                  className={`mt-1 flex items-center gap-2 text-2xl font-extrabold leading-tight ${TONE_TEXT[verdict.tone]}`}
                >
                  <VerdictIcon className="size-6 shrink-0" strokeWidth={2.4} />
                  {verdict.label}
                </p>
                <p className="mt-1 text-sm leading-snug text-muted">
                  {verdict.text}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center rounded-[1.25rem] bg-accent p-6 text-accent-ink">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.09em] opacity-65">
                Ціна під ключ
              </p>
              <p className="mt-2.5 font-display text-[27px] font-semibold leading-[1.1] tracking-tight sm:text-[32px]">
                {Math.round(cost.totalMinUsd).toLocaleString("uk-UA")} –{" "}
                {usd(cost.totalMaxUsd)}
              </p>
              <p className="mt-2 text-sm font-bold opacity-70">
                {bid > 0
                  ? `при ставці ${usd(bid)} · з розмитненням і ремонтом`
                  : "ставку не вказано, сума без вартості авто"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <Kpi
                label="Макс. ставка"
                value={
                  hasMarket
                    ? cost.maxBidUsd
                      ? usd(cost.maxBidUsd)
                      : "Недосяжно"
                    : "—"
                }
                note={
                  hasMarket
                    ? `для вигоди клієнта ${settings.targetSavingsPct} %`
                    : "вкажіть ринкову ціну"
                }
                action={
                  !hasMarket && !editing && canEditAmounts ? startEditing : undefined
                }
              />
              <Kpi
                label={
                  hasMarket && cost.savingsUsd < 0 ? "Переплата" : "Вигода"
                }
                value={hasMarket ? usd(Math.abs(cost.savingsUsd)) : "—"}
                badge={
                  hasMarket
                    ? `${Math.abs(cost.savingsPct).toFixed(0)} %`
                    : undefined
                }
                tone={hasMarket ? savingsTone : undefined}
                note={
                  hasMarket
                    ? `ринок в Україні ${usd(cost.marketPriceUsd)}`
                    : "немає з чим порівняти"
                }
              />
            </div>
          </div>
        </section>

        <ExpertReviewCard key={`${report.id}-${report.expert?.reviewedAt ?? ""}`} report={report} />

        <section className="mt-5 grid gap-3.5 md:grid-cols-3">
          <Fact
            icon={<Crosshair className="size-4" />}
            label="Зона удару"
            value={analysis.impactZone || "не визначено"}
          />
          <Fact
            icon={<ShieldCheck className="size-4" />}
            label="Ризик для силової структури"
            value={LEVEL[analysis.structuralRisk]}
            tone={LEVEL_TONE[analysis.structuralRisk]}
            note={analysis.structuralRiskNote}
          />
          <Fact
            icon={<Wind className="size-4" />}
            label="Подушки за фото"
            value={AIRBAG[analysis.airbagAssessment]}
            tone={
              analysis.airbagAssessment === "deployed"
                ? "bad"
                : analysis.airbagAssessment === "unknown"
                  ? "warn"
                  : "good"
            }
            note={analysis.airbagNote}
          />
        </section>

        <Block title="Коротко">
          <div className="card p-5 sm:p-6">
            <p className="max-w-4xl text-[15px] leading-relaxed text-ink/90">
              {analysis.summary}
            </p>
            {photoReadings.length > 0 && (
              <p className="mt-3 text-sm text-muted">
                Прочитано з фото: <span className="font-semibold text-ink">{photoReadings.join(", ")}</span>
              </p>
            )}
            {analysis.photoNotes.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
                {analysis.photoNotes.map((note, i) => (
                  <li key={i} className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setPhoto(note.photo - 1)}
                      aria-label={`Показати фото ${note.photo}`}
                      className="mt-px grid h-6 min-w-6 shrink-0 place-items-center rounded-md bg-panel2 px-1.5 text-[11px] font-extrabold ring-1 ring-line2 transition hover:bg-accent hover:text-accent-ink"
                    >
                      {note.photo}
                    </button>
                    <span className="leading-relaxed text-ink/85">
                      {note.observation}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Block>

        <Block title="Історія та ринок">
          <HistoryMarket
            analysis={analysis}
            comparables={report.comparables}
            historyFiles={report.historyFiles}
            vinHistory={report.vinHistory}
            vin={report.lot.vin}
          />
        </Block>

        {analysis.scenarios.length > 0 && (
          <Block title="Сценарії ремонту">
            <ul className="grid gap-3.5 md:grid-cols-3">
              {analysis.scenarios.map((s, i) => {
                const top = s.likelihood === "high";
                return (
                  <li
                    key={i}
                    className={`card flex flex-col p-5 ${top ? "!border-accent-text/50" : ""}`}
                  >
                    <span
                      className={`self-start rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                        top
                          ? "bg-accent text-accent-ink"
                          : "bg-panel2 text-muted ring-1 ring-line2"
                      }`}
                    >
                      {LIKELIHOOD[s.likelihood]}
                    </span>
                    <p className="mt-3 text-base font-extrabold leading-snug">
                      {s.name}
                    </p>
                    <p className="mt-1 flex-1 text-sm leading-relaxed text-muted">
                      {s.description}
                    </p>
                    <p className="mt-3 text-[22px] font-extrabold tracking-tight">
                      {Math.round(s.repairMinUsd).toLocaleString("uk-UA")} –{" "}
                      {usd(s.repairMaxUsd)}
                    </p>
                    <div
                      aria-hidden
                      className="relative mt-2.5 h-1.5 rounded-full bg-line"
                    >
                      <span
                        className="absolute inset-y-0 rounded-full bg-accent"
                        style={{
                          left: `${(s.repairMinUsd / scenarioMax) * 100}%`,
                          width: `${Math.max(4, ((s.repairMaxUsd - s.repairMinUsd) / scenarioMax) * 100)}%`,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Block>
        )}

        <div className="grid items-start gap-x-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          {analysis.damagedParts.length > 0 && (
            <Block title="Пошкоджені деталі">
              <ul className="card px-5 py-1.5 sm:px-6">
                {analysis.damagedParts.map((part, i) => (
                  <li
                    key={i}
                    className="grid items-center gap-x-4 gap-y-2 border-b border-line py-3.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_6.5rem_5.5rem_7.5rem]"
                  >
                    <div className="min-w-0">
                      <p className="font-bold leading-snug">{part.part}</p>
                      {part.note && (
                        <p className="mt-0.5 text-[13px] leading-snug text-muted">
                          {part.note}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 sm:contents">
                      <span
                        className={`justify-self-start rounded-full px-2.5 py-1 text-xs font-extrabold ${ACTION_STYLE[part.action]}`}
                      >
                        {ACTION[part.action]}
                      </span>
                      <span
                        className="flex items-center gap-1.5 text-xs font-semibold text-muted"
                        title="Впевненість оцінки"
                      >
                        <span aria-hidden className="flex gap-[3px]">
                          {[1, 2, 3].map((n) => (
                            <span
                              key={n}
                              className={`size-1.5 rounded-full ${n <= LEVEL_DOTS[part.confidence] ? "bg-ink" : "bg-line2"}`}
                            />
                          ))}
                        </span>
                        {CONFIDENCE[part.confidence]}
                      </span>
                      <span className="ml-auto whitespace-nowrap text-right text-[15px] font-extrabold sm:ml-0">
                        {Math.round(part.costMinUsd).toLocaleString("uk-UA")} –{" "}
                        {usd(part.costMaxUsd)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-faint">
                Крапки показують впевненість оцінки за фото.
              </p>
            </Block>
          )}

          <Block id="cost-summary" title="З чого складається ціна">
            <div className="card p-5 sm:p-6">
              <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.09em] text-muted">
                Середня оцінка
              </p>
              <CostBar cost={cost} compact />
              <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-line pt-4">
                <span className="text-sm font-bold text-muted">
                  Разом під ключ
                </span>
                <span className="whitespace-nowrap text-lg font-extrabold">
                  {Math.round(cost.totalMinUsd).toLocaleString("uk-UA")} –{" "}
                  {usd(cost.totalMaxUsd)}
                </span>
              </div>
              {!editing && (
                <button
                  type="button"
                  onClick={toggleTable}
                  aria-expanded={showTable}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-line2 py-2.5 text-sm font-bold transition hover:bg-panel2"
                >
                  {showTable ? "Згорнути розрахунок" : "Показати всі статті"}
                  <ChevronDown
                    className={`size-4 transition ${showTable ? "rotate-180" : ""}`}
                  />
                </button>
              )}
            </div>
          </Block>
        </div>

        {savedNote && (
          <div role="status" className="no-print mt-4 flex items-center gap-2 rounded-2xl border border-good/30 bg-good-bg px-4 py-3 text-sm font-bold text-good">
            <CircleCheck className="size-4.5" /> Зміни збережено. Розрахунок і PDF оновлено.
          </div>
        )}

        {showTable && (
          <section ref={editing ? editRef : tableRef} className="rise mt-5 scroll-mt-24">
            {editing && (
              <div className="mb-4 rounded-2xl border border-accent-text/30 bg-accent-text/[0.06] p-4">
                <p className="mb-1 flex items-center gap-2 text-sm font-extrabold">
                  <Pencil className="size-4 text-accent-text" /> Редагування сум
                </p>
                <p className="mb-3 text-xs text-muted">
                  Змініть значення нижче: підсумок угорі перераховується одразу, але в звіт зміни потраплять
                  лише після кнопки «Зберегти зміни». Суми в таблиці теж можна виправити.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <EditField label="Ремонт від, $" value={cost.repairMinUsd} onChange={(v) => setOverride("repairMinUsd", v)} />
                  <EditField label="Ремонт до, $" value={cost.repairMaxUsd} onChange={(v) => setOverride("repairMaxUsd", v)} />
                  <EditField label="Ринок в Україні, $" value={cost.marketPriceUsd} onChange={(v) => setOverride("marketPriceUsd", v)} />
                </div>
              </div>
            )}
            <div className="rounded-2xl bg-surface">
              <CostTable cost={cost} editing={editing} overrides={live} onOverride={setOverride} />
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-faint">
              Митна вартість {usd(cost.customsValueUsd)}. Курси: 1 € = {settings.eurUsd} $, 1 $ = {settings.usdUah} грн.
              Збір аукціону та логістика — оцінка за тарифами компанії.
            </p>
            {editing && (
              <div className="no-print sticky bottom-3 z-20 mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line2 bg-surface/95 p-3 shadow-[var(--shadow-card)] backdrop-blur">
                <span className={`mr-auto text-sm font-bold ${dirty ? "text-warn" : "text-muted"}`}>
                  {dirty ? "Є незбережені зміни" : "Змін поки немає"}
                </span>
                <Button variant="secondary" onClick={cancelEditing}>
                  Скасувати
                </Button>
                <Button onClick={saveEditing} disabled={!dirty}>
                  <CircleCheck className="size-4.5" /> Зберегти зміни
                </Button>
              </div>
            )}
          </section>
        )}

        <div className="mt-9 grid gap-3.5 md:grid-cols-2">
          <ListBlock
            icon={<TriangleAlert className="size-4" />}
            title="Ризики"
            items={analysis.redFlags}
            tone="bad"
            empty="Явних ризиків на фото не видно."
          />
          <ListBlock
            icon={<ThumbsUp className="size-4" />}
            title="Що на користь лота"
            items={analysis.positives}
            tone="good"
            empty="Не виявлено."
          />
          <ListBlock
            icon={<Camera className="size-4" />}
            title="Яких фото бракує"
            items={analysis.missingViews}
            tone="warn"
            empty="Фото достатньо."
          />
          <ListBlock
            icon={<ListChecks className="size-4" />}
            title="Перевірити перед ставкою"
            items={analysis.inspectionChecklist}
            empty="—"
          />
        </div>

        <p className="mt-8 max-w-4xl text-xs leading-relaxed text-faint">
          Оцінку пошкоджень зроблено штучним інтелектом за фото з аукціону. Вона
          не замінює огляд авто на майданчику та перевірку історії за VIN:
          приховані пошкодження на фото не видно. Суми є попередніми і можуть
          змінитися після торгів та фактичного ремонту.
          {!report.demo && <span> Модель: {report.model}.</span>}
        </p>
      </div>

      <PrintReport
        report={report}
        settings={settings}
        cost={cost}
        facts={facts}
      />
    </>
  );
}

function Block({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="mt-9 min-w-0 scroll-mt-24">
      <h2 className="mb-3.5 text-xl font-extrabold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Kpi({
  label,
  value,
  note,
  badge,
  tone,
  action,
}: {
  label: string;
  value: string;
  note: string;
  badge?: string;
  tone?: Tone;
  action?: () => void;
}) {
  return (
    <div className="card p-5">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.09em] text-muted">
        {label}
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-2xl font-extrabold leading-tight tracking-tight">
        {value}
        {badge && tone && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${TONE_BG[tone]} ${TONE_TEXT[tone]}`}
          >
            {badge}
          </span>
        )}
      </p>
      <p className="mt-1 text-[13px] text-muted">{note}</p>
      {action && (
        <button
          type="button"
          onClick={action}
          className="mt-1 text-sm font-bold text-accent-text hover:underline"
        >
          Вказати
        </button>
      )}
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
  note,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note?: string;
  tone?: Tone;
}) {
  return (
    <div className="card p-5">
      <p className="flex items-center gap-2 text-xs font-bold text-muted">
        {icon} {label}
      </p>
      <p className="mt-2 flex items-center gap-2 text-[17px] font-extrabold leading-snug">
        {tone && (
          <span
            aria-hidden
            className={`size-2.5 shrink-0 rounded-full ${DOT[tone]}`}
          />
        )}
        <span
          className={`first-letter:uppercase ${tone ? TONE_TEXT[tone] : ""}`}
        >
          {value}
        </span>
      </p>
      {note && (
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{note}</p>
      )}
    </div>
  );
}

function ListBlock({
  icon,
  title,
  items,
  tone,
  empty,
}: {
  icon: ReactNode;
  title: string;
  items: string[];
  tone?: Tone;
  empty: string;
}) {
  const badge = tone
    ? {
        good: "bg-good-bg text-good",
        warn: "bg-warn-bg text-warn",
        bad: "bg-bad-bg text-bad",
      }[tone]
    : "bg-panel2 text-ink";
  const dot = tone ? DOT[tone] : "bg-muted";
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-3.5 flex items-center gap-2.5 text-base font-extrabold tracking-tight">
        <span className={`grid size-8 place-items-center rounded-lg ${badge}`}>
          {icon}
        </span>
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="space-y-2 text-sm leading-relaxed text-ink/90">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2.5">
              <span
                aria-hidden
                className={`mt-2 size-1.5 shrink-0 rounded-full ${dot}`}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function sameOverrides(a: CostOverrides, b: CostOverrides): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof CostOverrides>;
  for (const k of keys) if ((a[k] ?? null) !== (b[k] ?? null)) return false;
  return true;
}

function EditField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-ink/80">
        {label}
      </span>
      <input
        type="number"
        min={0}
        className="control"
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          onChange(
            e.target.value === "" || !Number.isFinite(v) ? 0 : Math.max(0, v),
          );
        }}
      />
    </label>
  );
}
