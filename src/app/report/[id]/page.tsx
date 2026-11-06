"use client";

import { AUCTIONS } from "@/lib/shared/auctions";
import { useCostSettings } from "@/lib/client/rates";
import { ArrowLeft, Camera, CarFront, ChevronDown, CircleCheck, Crosshair, FileSearch, ListChecks, Maximize2, Pencil, Printer, ShieldCheck, ThumbsUp, TriangleAlert, Wind } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Lightbox } from "@/components/ui/Lightbox";
import { PartsPrices } from "@/components/report/PartsPrices";
import { useRef, useState } from "react";
import { CostBar, CostTable } from "@/components/report/CostTable";
import { ExpertReviewCard } from "@/components/report/ExpertReviewCard";
import { HistoryMarket } from "@/components/report/HistoryMarket";
import { PrintReport } from "@/components/report/PrintReport";
import { ScoreRing } from "@/components/report/ScoreRing";
import { Button, Notice } from "@/components/ui";
import { calculate, usd } from "@/lib/shared/calc";
import { useCan, useMe } from "@/lib/client/me";
import { ACTION, AIRBAG, CONFIDENCE, FUEL, LEVEL, LEVEL_TONE, LIKELIHOOD, RUN, TONE_BG, TONE_TEXT, VERDICT, lotTitle, mileageText } from "@/lib/shared/labels";
import { updateReport, useHydrated, useReports } from "@/lib/client/store";
import type { CostOverrides } from "@/types/report";
import type { Tone } from "@/types/ui";
import { VERDICT_ICON, ACTION_STYLE, LEVEL_DOTS } from "@/components/report/reportStyles";
import { sameOverrides } from "@/lib/shared/overrides";
import { Block, Kpi, Fact, ListBlock, EditField } from "@/components/report/ReportBlocks";

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const hydrated = useHydrated();
  const reports = useReports();
  const settings = useCostSettings();
  const me = useMe();
  const canPdf = useCan("pdf");
  const canSave = useCan("save");
  const canExpert = useCan("expert");
  const canAnalyze = useCan("analyze");
  const [draft, setDraft] = useState<CostOverrides | null>(null);
  const [savedNote, setSavedNote] = useState(false);
  const editRef = useRef<HTMLElement>(null);
  const tableRef = useRef<HTMLElement>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [photo, setPhoto] = useState(0);
  const [zoom, setZoom] = useState(false);

  const report = reports.find((r) => r.id === id);

  if (!hydrated) return <p className="text-sm text-muted">Завантажую звіт…</p>;
  if (!report) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <span className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-panel2 text-muted">
          <FileSearch className="size-6" />
        </span>
        <h1 className="text-xl font-semibold">Звіт не знайдено</h1>
        <p className="mt-2 text-sm text-muted">
          Незбережені звіти зникають після оновлення сторінки.
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
    lot.auction === "Other" ? "" : AUCTIONS[lot.auction]?.label ?? lot.auction,
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

  const auctionMeta = lot.auction === "Other" ? null : AUCTIONS[lot.auction];
  const created = new Date(report.createdAt);
  const chips = [mileageText(lot), lot.titleType, ...damages].filter(Boolean);
  const turnkey = `${Math.round(cost.totalMinUsd).toLocaleString("uk-UA")} – ${usd(cost.totalMaxUsd)}`;

  return (
    <>
      <div className="no-print">
        <Link href="/history" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
          <ArrowLeft className="size-4" /> Усі звіти
        </Link>
        <header className="mb-6 mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight tracking-[-0.02em] sm:text-[28px]">{lotTitle(lot)}</h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[13px] text-muted">
              {auctionMeta && (
                <span className="rounded-md px-2 py-0.5 text-xs font-semibold text-white" style={{ background: auctionMeta.color }}>
                  {auctionMeta.short}
                </span>
              )}
              {lot.lotNumber && <span className="rounded-md bg-panel2 px-2 py-0.5 font-mono text-xs text-ink">Лот {lot.lotNumber}</span>}
              {lot.vin && <span className="rounded-md bg-panel2 px-2 py-0.5 font-mono text-xs text-ink">{lot.vin}</span>}
              {chips.map((c) => (
                <span key={c} className="rounded-md border border-line px-2 py-0.5">
                  {c}
                </span>
              ))}
              {!Number.isNaN(created.getTime()) && <span>{created.toLocaleDateString("uk-UA")}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
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
            {canPdf && (
              <Button
                onClick={() => {
                  if (report.saved) void fetch(`/api/reports/${report.id}/event`, { method: "POST" });
                  window.print();
                }}
              >
                <Printer className="size-4" /> Завантажити PDF
              </Button>
            )}
          </div>
        </header>

        {report.saved === false && (
          <div className="mb-5">
            <Notice tone="warn" title="Звіт не збережено">
              {canSave
                ? "Не вдалося зберегти звіт. Він зникне після оновлення сторінки, тож за потреби завантажте PDF."
                : "Ваша роль не дозволяє зберігати звіти. Після оновлення сторінки він зникне."}
            </Notice>
          </div>
        )}

        {report.demo && (
          <div className="mb-5">
            <Notice tone="warn" title="Демо-звіт: це не аналіз ваших фото">
              Аналіз фото на момент створення не був підключений, тому опис пошкоджень і вилка ремонту
              нижче — заздалегідь підготовлений приклад. Розрахунок розмитнення
              та ціни під ключ зроблено за введеними даними лота.
            </Notice>
          </div>
        )}

        {zoom && <Lightbox images={report.photos} index={activePhoto} onClose={() => setZoom(false)} onIndex={setPhoto} />}

        <section className="rise grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="card flex min-w-0 flex-col gap-3 p-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-panel2 lg:aspect-auto lg:min-h-80 lg:flex-1">
              {report.photos.length > 0 ? (
                <img src={report.photos[activePhoto]} alt={`Фото ${activePhoto + 1}`} className="absolute inset-0 size-full object-cover" />
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
                  className="absolute bottom-3 right-3 z-10 grid size-9 place-items-center rounded-lg bg-scrim text-white backdrop-blur transition hover:bg-black/80"
                >
                  <Maximize2 className="size-4" />
                </button>
              )}
              {report.photos.length > 1 && (
                <span className="absolute left-3 top-3 rounded-md bg-scrim px-2 py-1 text-xs font-medium text-white backdrop-blur">
                  {activePhoto + 1} / {report.photos.length}
                </span>
              )}
            </div>
            {report.photos.length > 1 && (
              <ul className="grid grid-cols-6 gap-2">
                {report.photos.slice(0, 6).map((src, i) => {
                  const more = i === 5 && report.photos.length > 6;
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => (more ? (setPhoto(5), setZoom(true)) : setPhoto(i))}
                        aria-label={more ? `Усі фото (${report.photos.length})` : `Показати фото ${i + 1}`}
                        aria-pressed={i === activePhoto}
                        className={`relative block aspect-[4/3] w-full overflow-hidden rounded-lg ring-2 transition ${
                          i === activePhoto ? "ring-accent-text" : "ring-transparent hover:opacity-90"
                        }`}
                      >
                        <img src={src} alt="" className="size-full object-cover" />
                        {more && (
                          <span className="absolute inset-0 grid place-items-center bg-scrim text-sm font-semibold text-white">
                            +{report.photos.length - 5}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="card flex min-w-0 flex-col p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <ScoreRing score={analysis.conditionScore} tone={verdict.tone} size={76} />
              <div className="min-w-0">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold ${TONE_BG[verdict.tone]} ${TONE_TEXT[verdict.tone]}`}>
                  <VerdictIcon className="size-4" strokeWidth={2.4} />
                  {verdict.label}
                </span>
                <p className="mt-1.5 text-sm leading-snug text-muted">{verdict.text}</p>
              </div>
            </div>

            <div className="mt-5 border-t border-line pt-5">
              <p className="text-[13px] font-medium text-muted">Ціна під ключ</p>
              <p className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.02em] sm:text-[34px]">{turnkey}</p>
              <p className="mt-1 text-[13px] text-muted">
                {bid > 0 ? `при ставці ${usd(bid)} · з розмитненням і ремонтом` : "ставку не вказано, сума без вартості авто"}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2.5">
              <Kpi
                label="Макс. ставка"
                value={hasMarket ? (cost.maxBidUsd ? usd(cost.maxBidUsd) : "Недосяжно") : "—"}
                note={hasMarket ? `вигода ${settings.targetSavingsPct} %` : "немає ринку"}
                action={!hasMarket && !editing && canEditAmounts ? startEditing : undefined}
              />
              <Kpi
                label={hasMarket && cost.savingsUsd < 0 ? "Переплата" : "Вигода"}
                value={hasMarket ? usd(Math.abs(cost.savingsUsd)) : "—"}
                note={hasMarket ? `${Math.abs(cost.savingsPct).toFixed(0)} % від ринку` : "немає з чим порівняти"}
                tone={hasMarket ? savingsTone : undefined}
              />
              <Kpi
                label="Ринок в Україні"
                value={hasMarket ? usd(cost.marketPriceUsd) : "—"}
                note={hasMarket ? (lot.marketSource && live.marketPriceUsd === undefined ? "AUTO.RIA" : "вручну") : "не вказано"}
              />
            </div>

            <div className="mt-5 border-t border-line pt-5">
              <CostBar cost={cost} compact />
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
                      className="mt-px grid h-6 min-w-6 shrink-0 place-items-center rounded-md bg-panel2 px-1.5 text-[11px] font-semibold ring-1 ring-line2 transition hover:bg-accent hover:text-accent-ink"
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

        <div className="grid items-start gap-x-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
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
                        className={`justify-self-start rounded-full px-2.5 py-1 text-xs font-semibold ${ACTION_STYLE[part.action]}`}
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
                      <span className="ml-auto whitespace-nowrap text-right text-[15px] font-semibold sm:ml-0">
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

          {analysis.scenarios.length > 0 && (
            <Block title="Сценарії ремонту">
              <ul className="card divide-y divide-line">
                {analysis.scenarios.map((s, i) => {
                  const top = s.likelihood === "high";
                  return (
                    <li key={i} className="p-4 sm:px-5">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold leading-snug">{s.name}</p>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${top ? "bg-accent text-accent-ink" : "bg-panel2 text-muted"}`}>
                          {LIKELIHOOD[s.likelihood]}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] leading-relaxed text-muted">{s.description}</p>
                      <div className="mt-2.5 flex items-center gap-3">
                        <div aria-hidden className="relative h-1.5 flex-1 rounded-full bg-line">
                          <span
                            className="absolute inset-y-0 rounded-full bg-accent"
                            style={{
                              left: `${(s.repairMinUsd / scenarioMax) * 100}%`,
                              width: `${Math.max(4, ((s.repairMaxUsd - s.repairMinUsd) / scenarioMax) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="whitespace-nowrap text-sm font-semibold">
                          {Math.round(s.repairMinUsd).toLocaleString("uk-UA")} – {usd(s.repairMaxUsd)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Block>
          )}
        </div>

        <PartsPrices
          report={report}
          settings={settings}
          canRun={canAnalyze}
          canApply={canEditAmounts}
          onApply={(minUsd, maxUsd) => {
            setSavedNote(false);
            setDraft({ ...overrides, repairMinUsd: minUsd, repairMaxUsd: maxUsd });
            scrollTo(editRef, true);
          }}
        />

        <Block id="cost-summary" title="З чого складається ціна">
          <div className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-muted">Разом під ключ</span>
              <span className="whitespace-nowrap text-xl font-bold tracking-tight">
                {Math.round(cost.totalMinUsd).toLocaleString("uk-UA")} – {usd(cost.totalMaxUsd)}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 lg:grid-cols-4">
              {cost.groups.map((g) => (
                <div key={g.title} className="rounded-xl bg-panel2 px-3.5 py-3">
                  <dt className="text-xs font-medium text-muted">{g.title}</dt>
                  <dd className="mt-0.5 text-base font-semibold">{usd(g.subtotal)}</dd>
                </div>
              ))}
            </dl>
            {!editing && (
              <button
                type="button"
                onClick={toggleTable}
                aria-expanded={showTable}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-line2 py-2.5 text-sm font-semibold transition hover:bg-panel2"
              >
                {showTable ? "Згорнути розрахунок" : "Показати всі статті"}
                <ChevronDown className={`size-4 transition ${showTable ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>
        </Block>

        {savedNote && (
          <div role="status" className="no-print mt-4 flex items-center gap-2 rounded-xl border border-good/30 bg-good-bg px-4 py-3 text-sm font-bold text-good">
            <CircleCheck className="size-4.5" /> Зміни збережено. Розрахунок і PDF оновлено.
          </div>
        )}

        {showTable && (
          <section ref={editing ? editRef : tableRef} className="rise mt-5 scroll-mt-24">
            {editing && (
              <div className="mb-4 rounded-xl border border-accent-text/30 bg-accent-text/[0.06] p-4">
                <p className="mb-1 flex items-center gap-2 text-sm font-semibold">
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
            <div className="rounded-xl bg-surface">
              <CostTable cost={cost} editing={editing} overrides={live} onOverride={setOverride} />
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-faint">
              Митна вартість {usd(cost.customsValueUsd)}. Курси{settings.autoRates ? " НБУ" : ""}: 1 € = {settings.eurUsd} $, 1 $ = {settings.usdUah} грн.
              Збір аукціону та логістика — оцінка за тарифами компанії.
              {lot.marketSource && live.marketPriceUsd === undefined ? ` Ринкова ціна: ${lot.marketSource}.` : ""}
            </p>
            {editing && (
              <div className="no-print sticky bottom-3 z-20 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-line2 bg-surface/95 p-3 shadow-[var(--shadow-card)] backdrop-blur">
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

        <Block title="Історія та ринок">
          <HistoryMarket
            analysis={analysis}
            comparables={report.comparables}
            historyFiles={report.historyFiles}
            historyDocs={report.historyDocs}
            vinHistory={report.vinHistory}
            vin={report.lot.vin}
          />
        </Block>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
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

