"use client";

import { AUCTIONS } from "@/lib/shared/auctions";
import { useCostSettings } from "@/lib/client/rates";
import { ArrowLeft, Camera, CarFront, ChevronDown, CircleCheck, Crosshair, FileSearch, ListChecks, Download, LoaderCircle, Maximize2, Pencil, Printer, ShieldCheck, ThumbsUp, TriangleAlert, Wind } from "lucide-react";
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
import { calculate, currencySign, money, moneyRange, usd } from "@/lib/shared/calc";
import { useCan, useMe } from "@/lib/client/me";
import { ACTION, AIRBAG, CONFIDENCE, LEVEL, LEVEL_TONE, LIKELIHOOD, TONE_BG, TONE_TEXT, VERDICT, lotTitle } from "@/lib/shared/labels";
import { RUN_TEXT, damageText, damagesText, engineText, lotDescription, mileageShort, mileageText, titleInfo } from "@/lib/shared/lotText";
import { updateReport, useHydrated, useReports } from "@/lib/client/store";
import { downloadReportPdf, pdfFileName } from "@/lib/client/pdf";
import type { CostOverrides } from "@/types/report";
import type { Tone } from "@/types/ui";
import { VERDICT_ICON, ACTION_STYLE, LEVEL_DOTS } from "@/components/report/reportStyles";
import { sameOverrides } from "@/lib/shared/overrides";
import { Block, Kpi, Fact, ListBlock, EditField } from "@/components/report/ReportBlocks";
import { t, localeOf, fmtNum } from "@/lib/shared/i18n";

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
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");

  const report = reports.find((r) => r.id === id);

  if (!hydrated) return <p className="text-sm text-muted">{t("Завантажую звіт…")}</p>;
  if (!report) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <span className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-panel2 text-muted">
          <FileSearch className="size-6" />
        </span>
        <h1 className="text-xl font-semibold">{t("Звіт не знайдено")}</h1>
        <p className="mt-2 text-sm text-muted">
          {t("Незбережені звіти зникають після оновлення сторінки. Також звіт могли видалити, або він належить іншому користувачу.")}
        </p>
        <Link
          href="/history"
          className="mt-5 inline-block text-sm font-bold text-accent-text hover:underline"
        >
          {t("Перейти до історії")}
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

  const reportEvent = () => {
    if (report.saved) void fetch(`/api/reports/${report.id}/event`, { method: "POST" }).catch(() => null);
  };
  const printReport = () => {
    reportEvent();
    window.print();
  };
  const savePdf = async () => {
    const article = document.querySelector<HTMLElement>("article.sheet");
    if (!article || pdfBusy) return;
    setPdfBusy(true);
    setPdfError("");
    try {
      await downloadReportPdf(article, pdfFileName([lotTitle(report.lot), report.lot.lotNumber && `lot ${report.lot.lotNumber}`]));
      reportEvent();
    } catch (error) {
      console.error("[LotScope] pdf", error);
      setPdfError(t("Не вдалося створити файл. Скористайтесь кнопкою «Друкувати» і виберіть «Зберегти як PDF»."));
    } finally {
      setPdfBusy(false);
    }
  };

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

  const auction = [
    lot.auction === "Other" ? "" : AUCTIONS[lot.auction]?.label ?? lot.auction,
    lot.lotNumber && t("лот {v0}", { v0: lot.lotNumber }),
  ]
    .filter(Boolean)
    .join(" · ");

  const title = titleInfo(lot.titleType);
  const titleValue = title ? [title.label, title.region].filter(Boolean).join(", ") : "";
  const damage = damagesText(lot);
  const description = lotDescription(lot);

  const facts = [
    [t("Пробіг"), mileageText(lot)],
    [t("Двигун"), engineText(lot)],
    [t("Аукціон"), auction],
    [t("Пошкодження"), damage],
    [t("Документ"), title ? [titleValue, title.note].filter(Boolean).join(" — ") : ""],
    [t("Стан"), RUN_TEXT[lot.runStatus]],
    ["VIN", lot.vin],
    [t("VIN на фото"), analysis.vinOnPhoto ?? ""],
    [t("Пробіг на фото"), analysis.odometerOnPhoto ?? ""],
  ].filter(([, value]) => value);
  const DESCRIBED = [t("Пробіг"), t("Двигун"), t("Пошкодження"), t("Документ"), t("Стан")];
  const extraFacts = description.length > 0 ? facts.filter(([label]) => !DESCRIBED.includes(label)) : facts;

  const photoReadings = [
    analysis.vinOnPhoto ? `VIN ${analysis.vinOnPhoto}` : "",
    analysis.odometerOnPhoto ? t("пробіг {v0}", { v0: analysis.odometerOnPhoto }) : "",
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
  const chips = [mileageShort(lot), title?.label ?? "", damageText(lot.primaryDamage)].filter(Boolean);
  const turnkey = moneyRange(cost.totalMinUsd, cost.totalMaxUsd, cost);
  const sign = currencySign(cost);
  const pl = cost.currency === "PLN";

  return (
    <>
      <div className="no-print">
        <Link href="/history" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
          <ArrowLeft className="size-4" /> {t("Усі звіти")}
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
              {lot.lotNumber && <span className="rounded-md bg-panel2 px-2 py-0.5 font-mono text-xs text-ink">{t("Лот")} {lot.lotNumber}</span>}
              {lot.vin && <span className="rounded-md bg-panel2 px-2 py-0.5 font-mono text-xs text-ink">{lot.vin}</span>}
              {chips.map((c) => (
                <span key={c} className="rounded-md border border-line px-2 py-0.5">
                  {c}
                </span>
              ))}
              {!Number.isNaN(created.getTime()) && <span>{created.toLocaleDateString(localeOf())}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEditAmounts && (
              <Button
                variant="secondary"
                onClick={startEditing}
                disabled={editing}
                title={editing ? t("Спершу збережіть або скасуйте поточні зміни нижче") : t("Змінити суми в розрахунку")}
              >
                <Pencil className="size-4" /> {t("Змінити суми")}
              </Button>
            )}
            {canPdf && (
              <>
                <Button variant="secondary" onClick={printReport}>
                  <Printer className="size-4" /> {t("Друкувати")}
                </Button>
                <Button onClick={() => void savePdf()} disabled={pdfBusy}>
                  {pdfBusy ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
                  {pdfBusy ? t("Готую PDF…") : t("Завантажити PDF")}
                </Button>
              </>
            )}
          </div>
          {pdfError && <p role="alert" className="w-full text-sm text-bad">{pdfError}</p>}
        </header>

        {report.saved === false && (
          <div className="mb-5">
            <Notice tone="warn" title={t("Звіт не збережено")}>
              {canSave
                ? t("Не вдалося зберегти звіт. Він зникне після оновлення сторінки, тож за потреби завантажте PDF.")
                : t("Ваша роль не дозволяє зберігати звіти. Після оновлення сторінки він зникне.")}
            </Notice>
          </div>
        )}

        {report.demo && (
          <div className="mb-5">
            <Notice tone="warn" title={t("Демо-звіт: це не аналіз ваших фото")}>
              {t("Аналіз фото на момент створення не був підключений, тому опис пошкоджень і вилка ремонту нижче — заздалегідь підготовлений приклад. Розрахунок розмитнення та ціни під ключ зроблено за введеними даними лота.")}
            </Notice>
          </div>
        )}

        {zoom && <Lightbox images={report.photos} index={activePhoto} onClose={() => setZoom(false)} onIndex={setPhoto} />}

        <section className="rise grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="card flex min-w-0 flex-col gap-3 p-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-panel2 lg:aspect-auto lg:min-h-80 lg:flex-1">
              {report.photos.length > 0 ? (
                <img src={report.photos[activePhoto]} alt={t("Фото {v0}", { v0: activePhoto + 1 })} className="absolute inset-0 size-full object-cover" />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-faint">
                  <CarFront className="size-20" strokeWidth={1.2} />
                </div>
              )}
              {report.photos.length > 0 && (
                <button
                  type="button"
                  aria-label={t("Збільшити фото")}
                  title={t("Збільшити фото")}
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
                        aria-label={more ? t("Усі фото ({v0})", { v0: report.photos.length }) : t("Показати фото {v0}", { v0: i + 1 })}
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
              <p className="text-[13px] font-medium text-muted">{t("Ціна під ключ")}</p>
              <p className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.02em] sm:text-[34px]">{turnkey}</p>
              <p className="mt-1 text-[13px] text-muted">
                {bid > 0 ? t("при ставці {v0} · з розмитненням і ремонтом", { v0: usd(bid) }) : t("ставку не вказано, сума без вартості авто")}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2.5">
              <Kpi
                label={t("Макс. ставка")}
                value={hasMarket ? (cost.maxBidUsd ? usd(cost.maxBidUsd) : t("Недосяжно")) : "—"}
                note={hasMarket ? t("вигода {v0} %", { v0: settings.targetSavingsPct }) : t("немає ринку")}
                action={!hasMarket && !editing && canEditAmounts ? startEditing : undefined}
              />
              <Kpi
                label={hasMarket && cost.savingsUsd < 0 ? t("Переплата") : t("Вигода")}
                value={hasMarket ? money(Math.abs(cost.savingsUsd), cost) : "—"}
                note={hasMarket ? t("{v0} % від ринку", { v0: Math.abs(cost.savingsPct).toFixed(0) }) : t("немає з чим порівняти")}
                tone={hasMarket ? savingsTone : undefined}
              />
              <Kpi
                label={t("Ринок в Україні")}
                value={hasMarket ? money(cost.marketPriceUsd, cost) : "—"}
                note={hasMarket ? (lot.marketSource && live.marketPriceUsd === undefined ? "AUTO.RIA" : t("вручну")) : t("не вказано")}
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
            label={t("Зона удару")}
            value={analysis.impactZone || t("не визначено")}
          />
          <Fact
            icon={<ShieldCheck className="size-4" />}
            label={t("Ризик для силової структури")}
            value={LEVEL[analysis.structuralRisk]}
            tone={LEVEL_TONE[analysis.structuralRisk]}
            note={analysis.structuralRiskNote}
          />
          <Fact
            icon={<Wind className="size-4" />}
            label={t("Подушки за фото")}
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

        {(description.length > 0 || extraFacts.length > 0) && (
          <Block title={t("Про авто")}>
            <div className="card p-5 sm:p-6">
              {description.length > 0 && (
                <div className="max-w-4xl space-y-1.5 text-[15px] leading-relaxed text-ink/90">
                  {description.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              )}
              {extraFacts.length > 0 && (
                <dl className={`grid gap-x-6 gap-y-3.5 text-sm sm:grid-cols-2 lg:grid-cols-3 ${description.length > 0 ? "mt-5 border-t border-line pt-5" : ""}`}>
                  {extraFacts.map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-xs font-medium text-muted">{label}</dt>
                      <dd className={`mt-0.5 break-words font-semibold text-ink ${label.startsWith("VIN") ? "font-mono text-[13px]" : ""}`}>{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </Block>
        )}

        <Block title={t("Коротко")}>
          <div className="card p-5 sm:p-6">
            <p className="max-w-4xl text-[15px] leading-relaxed text-ink/90">
              {analysis.summary}
            </p>
            {photoReadings.length > 0 && (
              <p className="mt-3 text-sm text-muted">
                {t("Прочитано з фото:")} <span className="font-semibold text-ink">{photoReadings.join(", ")}</span>
              </p>
            )}
            {analysis.photoNotes.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
                {analysis.photoNotes.map((note, i) => (
                  <li key={i} className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setPhoto(note.photo - 1)}
                      aria-label={t("Показати фото {v0}", { v0: note.photo })}
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
            <Block title={t("Пошкоджені деталі")}>
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
                        title={t("Впевненість оцінки")}
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
                        {moneyRange(part.costMinUsd, part.costMaxUsd, cost)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-faint">
                {t("Крапки показують впевненість оцінки за фото.")}
              </p>
            </Block>
          )}

          {analysis.scenarios.length > 0 && (
            <Block title={t("Сценарії ремонту")}>
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
                          {moneyRange(s.repairMinUsd, s.repairMaxUsd, cost)}
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

        <Block id="cost-summary" title={t("З чого складається ціна")}>
          <div className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-muted">{t("Разом під ключ")}</span>
              <span className="whitespace-nowrap text-xl font-bold tracking-tight">
                {turnkey}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 lg:grid-cols-4">
              {cost.groups.map((g) => (
                <div key={g.title} className="rounded-xl bg-panel2 px-3.5 py-3">
                  <dt className="text-xs font-medium text-muted">{g.title}</dt>
                  <dd className="mt-0.5 text-base font-semibold">{money(g.subtotal, cost)}</dd>
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
                {showTable ? t("Згорнути розрахунок") : t("Показати всі статті")}
                <ChevronDown className={`size-4 transition ${showTable ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>
        </Block>

        {savedNote && (
          <div role="status" className="no-print mt-4 flex items-center gap-2 rounded-xl border border-good/30 bg-good-bg px-4 py-3 text-sm font-bold text-good">
            <CircleCheck className="size-4.5" /> {t("Зміни збережено. Розрахунок і PDF оновлено.")}
          </div>
        )}

        {showTable && (
          <section ref={editing ? editRef : tableRef} className="rise mt-5 scroll-mt-24">
            {editing && (
              <div className="mb-4 rounded-xl border border-accent-text/30 bg-accent-text/[0.06] p-4">
                <p className="mb-1 flex items-center gap-2 text-sm font-semibold">
                  <Pencil className="size-4 text-accent-text" /> {t("Редагування сум")}
                </p>
                <p className="mb-3 text-xs text-muted">
                  {t("Змініть значення нижче: підсумок угорі перераховується одразу, але в звіт зміни потраплять лише після кнопки «Зберегти зміни». Суми в таблиці теж можна виправити.")}
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <EditField label={`${t("Ремонт від")}, ${sign}`} value={Math.round(cost.repairMinUsd * cost.rate)} onChange={(v) => setOverride("repairMinUsd", v / cost.rate)} />
                  <EditField label={`${t("Ремонт до")}, ${sign}`} value={Math.round(cost.repairMaxUsd * cost.rate)} onChange={(v) => setOverride("repairMaxUsd", v / cost.rate)} />
                  <EditField label={`${t("Ринок в Україні")}, ${sign}`} value={Math.round(cost.marketPriceUsd * cost.rate)} onChange={(v) => (pl ? setOverride("marketPricePln", v) : setOverride("marketPriceUsd", v))} />
                </div>
              </div>
            )}
            <div className="rounded-xl bg-surface">
              <CostTable cost={cost} editing={editing} overrides={live} onOverride={setOverride} />
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-faint">
              {pl
                ? `Wartość celna ${money(cost.customsValueUsd, cost)}. Kurs${settings.autoRates ? " NBP" : ""}: 1 $ = ${fmtNum(settings.usdPln)} zł, 1 € = ${fmtNum(settings.eurPln)} zł. Opłaty aukcji i logistyka — według stawek firmy. Stawki cła i akcyzy: wg przepisów z 2026 r., sprawdź przed licytacją.`
                : <>{t("Митна вартість")} {usd(cost.customsValueUsd)}{t(". Курси")}{settings.autoRates ? t(" НБУ") : ""}: 1 € = {settings.eurUsd} $, 1 $ = {settings.usdUah} {t("грн. Збір аукціону та логістика — оцінка за тарифами компанії.")}</>}
              {lot.marketSource && live.marketPriceUsd === undefined ? t(" Ринкова ціна: {v0}.", { v0: lot.marketSource }) : ""}
            </p>
            {editing && (
              <div className="no-print sticky bottom-3 z-20 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-line2 bg-surface/95 p-3 shadow-[var(--shadow-card)] backdrop-blur">
                <span className={`mr-auto text-sm font-bold ${dirty ? "text-warn" : "text-muted"}`}>
                  {dirty ? t("Є незбережені зміни") : t("Змін поки немає")}
                </span>
                <Button variant="secondary" onClick={cancelEditing}>
                  {t("Скасувати")}
                </Button>
                <Button onClick={saveEditing} disabled={!dirty}>
                  <CircleCheck className="size-4.5" /> {t("Зберегти зміни")}
                </Button>
              </div>
            )}
          </section>
        )}

        <Block title={t("Історія та ринок")}>
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
            title={t("Ризики")}
            items={analysis.redFlags}
            tone="bad"
            empty={t("Явних ризиків на фото не видно.")}
          />
          <ListBlock
            icon={<ThumbsUp className="size-4" />}
            title={t("Що на користь лота")}
            items={analysis.positives}
            tone="good"
            empty={t("Не виявлено.")}
          />
          <ListBlock
            icon={<Camera className="size-4" />}
            title={t("Яких фото бракує")}
            items={analysis.missingViews}
            tone="warn"
            empty={t("Фото достатньо.")}
          />
          <ListBlock
            icon={<ListChecks className="size-4" />}
            title={t("Перевірити перед ставкою")}
            items={analysis.inspectionChecklist}
            empty="—"
          />
        </div>

        <p className="mt-8 max-w-4xl text-xs leading-relaxed text-faint">
          {t("Оцінку пошкоджень зроблено штучним інтелектом за фото з аукціону. Вона не замінює огляд авто на майданчику та перевірку історії за VIN: приховані пошкодження на фото не видно. Суми є попередніми і можуть змінитися після торгів та фактичного ремонту.")}
          {!report.demo && <span> {t("Модель:")} {report.model}.</span>}
        </p>
      </div>

      <PrintReport
        report={report}
        settings={settings}
        cost={cost}
        facts={extraFacts}
        description={description}
      />
    </>
  );
}

