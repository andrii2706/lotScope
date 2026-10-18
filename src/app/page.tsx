"use client";

import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleDollarSign,
  FileText,
  Gavel,
  ScanSearch,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HistoryUploader } from "@/components/HistoryUploader";
import { LotFinder } from "@/components/LotFinder";
import { PhotoUploader } from "@/components/PhotoUploader";
import { VinHistoryPanel } from "@/components/VinHistoryPanel";
import { useVinHistory } from "@/lib/useVinHistory";
import { Button, Field, Notice, NumberInput, PageHeader, Segmented, StepCard } from "@/components/ui";
import type { Comparables, LotLookupResponse } from "@/lib/auction";
import { EMPTY_LOT, MAX_PHOTOS } from "@/lib/defaults";
import { preparePhoto, type PreparedPhoto } from "@/lib/images";
import { useLessons } from "@/lib/lessonsClient";
import { refreshMe, useMe } from "@/lib/me";
import Link from "next/link";
import { can } from "@/lib/roles";
import { getSettings, saveReport } from "@/lib/store";
import type { AnalyzeRequest, AnalyzeResponse, HistoryFile, LotInput, Report } from "@/lib/types";

interface ServerStatus {
  configured: boolean;
}

const STORED_PHOTOS = 8;

const DAMAGE_OPTIONS = [
  "Front End",
  "Rear End",
  "Left Side",
  "Right Side",
  "Left Front",
  "Right Front",
  "Left Rear",
  "Right Rear",
  "All Over",
  "Rollover",
  "Undercarriage",
  "Mechanical",
  "Water/Flood",
  "Hail",
  "Vandalism",
  "Minor Dent/Scratches",
];
const TITLE_OPTIONS = ["Salvage", "Clean", "Rebuilt", "Certificate of Destruction", "Parts Only"];

const LOADING_STAGES = [
  "Розглядаю фото лота…",
  "Шукаю пошкодження та ризики…",
  "Оцінюю вартість ремонту…",
  "Рахую розмитнення та ціну під ключ…",
];

const OUTCOMES = [
  { icon: ScanSearch, text: "Пошкодження та ризики за фото" },
  { icon: Wrench, text: "Вилка вартості ремонту" },
  { icon: CircleDollarSign, text: "Ціна під ключ з розмитненням" },
  { icon: Gavel, text: "Максимальна ставка" },
  { icon: FileText, text: "PDF-звіт з вашим логотипом" },
];

const MAX_REQUEST_CHARS = 4_300_000;

export default function NewAnalysisPage() {
  const router = useRouter();
  const [lot, setLot] = useState<LotInput>(EMPTY_LOT);
  const [photos, setPhotos] = useState<PreparedPhoto[]>([]);
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState("");
  const [cardOpen, setCardOpen] = useState(false);
  const [history, setHistory] = useState<HistoryFile[]>([]);
  const [comparables, setComparables] = useState<Comparables | null>(null);
  const [vinState, unlockVin] = useVinHistory(lot.vin);
  const activeLessons = useLessons().filter((l) => l.active).length;
  const me = useMe();
  const credits = me.status === "ready" && me.user ? me.user.credits : null;
  const outOfCredits = Boolean(status?.configured) && credits === 0;
  const vinHistory = vinState.status === "done" ? vinState.response.history : null;
  const historyDone = history.length > 0 || Boolean(vinHistory);

  useEffect(() => {
    let active = true;
    fetch("/api/analyze")
      .then((r) => r.json())
      .then((s: ServerStatus) => active && setStatus(s))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => setStage((s) => (s + 1) % LOADING_STAGES.length), 3500);
    return () => clearInterval(timer);
  }, [loading]);

  const set = <K extends keyof LotInput>(key: K, value: LotInput[K]) =>
    setLot((prev) => ({ ...prev, [key]: value }));

  async function applyFound(result: LotLookupResponse) {
    if (result.lot) {
      setLot((prev) => ({ ...prev, ...result.lot }));
      setCardOpen(true);
    }
    setComparables(result.comparables ?? null);
    const prepared: PreparedPhoto[] = [];
    for (const [i, url] of (result.photos ?? []).entries()) {
      try {
        const blob = await (await fetch(url)).blob();
        prepared.push(await preparePhoto(new File([blob], `lot-${i + 1}.jpg`, { type: blob.type })));
      } catch {}
    }
    if (prepared.length > 0) setPhotos((prev) => [...prev, ...prepared].slice(0, MAX_PHOTOS));
  }

  const photosDone = photos.length > 0;
  const carDone = Boolean(lot.make.trim() && lot.model.trim() && lot.year);
  const pricesDone = lot.bidUsd > 0 && lot.marketPriceUsd > 0;
  const cardFilled = [
    lot.lotNumber,
    lot.vin,
    lot.primaryDamage,
    lot.secondaryDamage,
    lot.titleType,
    lot.notes,
    lot.airbags !== "unknown" ? "x" : "",
    lot.runStatus !== "unknown" ? "x" : "",
  ].filter(Boolean).length;
  const ready = photosDone && carDone;

  const checklist = [
    { label: "Фото лота", done: photosDone, required: true, href: "#step-photos", note: photosDone ? `${photos.length} фото` : "додайте хоча б одне" },
    { label: "Авто", done: carDone, required: true, href: "#step-car", note: carDone ? `${lot.year} ${lot.make} ${lot.model}` : "марка, модель, рік" },
    { label: "Ціни", done: pricesDone, required: false, href: "#step-prices", note: pricesDone ? "ставка та ринок" : "для максимальної ставки" },
    { label: "Картка лота", done: cardFilled > 0, required: false, href: "#step-card", note: cardFilled > 0 ? `заповнено полів: ${cardFilled}` : "уточнює аналіз" },
    {
      label: "Історія за VIN",
      done: historyDone,
      required: false,
      href: "#step-history",
      note: vinState.status === "loading"
        ? "шукаю за VIN…"
        : [vinHistory ? "автоматично" : "", history.length ? `Carfax: ${history.length}` : ""].filter(Boolean).join(" + ") || "з'явиться після VIN",
    },
  ];

  async function submit() {
    if (!ready || loading) return;
    setLoading(true);
    setStage(0);
    setError("");
    const settings = getSettings();
    const payload: AnalyzeRequest = {
      lot,
      images: photos.map((p) => ({ mediaType: "image/jpeg", data: p.data })),
      history,
      vinHistory,
      pricing: {
        laborRateUsd: settings.laborRateUsd,
        paintPerPanelUsd: settings.paintPerPanelUsd,
        partsPreference: settings.partsPreference,
      },
    };
    try {
      const body = JSON.stringify(payload);
      if (body.length > MAX_REQUEST_CHARS) {
        throw new Error("Фото та файли історії разом завеликі для одного запиту. Приберіть кілька фото або великий PDF і спробуйте ще раз.");
      }
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
      const data = (await res.json().catch(() => null)) as
        | (AnalyzeResponse & { error?: string })
        | null;
      if (!res.ok || !data || data.error) {
        throw new Error(data?.error || "Не вдалося виконати аналіз. Спробуйте ще раз.");
      }
      const report: Report = {
        id: `tmp-${crypto.randomUUID().slice(0, 8)}`,
        createdAt: new Date().toISOString(),
        lot,
        photos: photos.slice(0, STORED_PHOTOS).map((p, i) => (i === 0 ? p.cover : p.thumb)),
        analysis: data.analysis,
        overrides: {},
        demo: data.demo,
        model: data.model,
        comparables,
        historyFiles: history.map((h) => h.name),
        vinHistory,
      };
      let saved = report;
      let notSaved = false;
      if (can(me.status === "ready" ? me.user : null, "save")) {
        try {
          saved = await saveReport(report, true);
        } catch {
          saved = await saveReport(report, false);
          notSaved = true;
        }
      } else {
        saved = await saveReport(report, false);
      }
      void refreshMe();
      router.push(`/report/${saved.id}${notSaved ? "?unsaved=1" : ""}`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Сталася помилка.",
      );
      setLoading(false);
    }
  }

  const hint = !photosDone && !carDone
    ? "Почніть з фото лота"
    : !photosDone
      ? "Залишилось додати фото"
      : !carDone
        ? "Залишилось вказати марку, модель і рік"
        : "Усе готово до аналізу";

  return (
    <div className="pb-24 lg:pb-0">
      <PageHeader
        eyebrow={
          <>
            <Sparkles className="size-3.5" /> ШІ-оцінка лотів IAAI та Copart
          </>
        }
        title={
          <>
            Оцініть лот <span className="text-accent-text">за хвилину</span>
          </>
        }
        description="Додайте фото з аукціону та кілька даних про авто. Отримаєте розбір пошкоджень, вилку ремонту, ціну під ключ і максимальну ставку."
      />

      {status && !status.configured && (
        <div className="mb-6">
          <Notice tone="warn" title="Демо-режим">
            Ключ API не налаштовано, тому замість аналізу ваших фото звіт покаже заздалегідь
            підготовлений приклад. Розрахунок розмитнення та ціни під ключ працює повністю. Щоб
            увімкнути аналіз, додайте ANTHROPIC_API_KEY у файл .env.local.
          </Notice>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21.5rem]">
        <div className="space-y-5">
          <LotFinder onFound={applyFound} disabled={loading} />

          <StepCard
            id="step-photos"
            step={1}
            title="Фото лота"
            hint="Що більше ракурсів, то точніша оцінка."
            done={photosDone}
            badge="required"
          >
            <PhotoUploader photos={photos} onChange={setPhotos} disabled={loading} />
          </StepCard>

          <StepCard
            id="step-car"
            step={2}
            title="Авто"
            hint="Рік і двигун потрібні для розрахунку акцизу."
            done={carDone}
            badge="required"
          >
            <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-6">
              <Field label="Марка" required className="sm:col-span-2">
                <input
                  className="control"
                  placeholder="BMW"
                  value={lot.make}
                  onChange={(e) => set("make", e.target.value)}
                />
              </Field>
              <Field label="Модель" required className="sm:col-span-3">
                <input
                  className="control"
                  placeholder="330i Gran Turismo xDrive"
                  value={lot.model}
                  onChange={(e) => set("model", e.target.value)}
                />
              </Field>
              <Field label="Рік" required className="col-span-2 sm:col-span-1">
                <NumberInput value={lot.year} onChange={(v) => set("year", Math.round(v))} min={1980} />
              </Field>

              <Segmented
                className="col-span-2 sm:col-span-4"
                label="Двигун"
                value={lot.fuel}
                onChange={(v) => set("fuel", v)}
                options={[
                  { value: "petrol", label: "Бензин" },
                  { value: "diesel", label: "Дизель" },
                  { value: "hybrid", label: "Гібрид" },
                  { value: "electric", label: "Електро" },
                ]}
              />
              {lot.fuel === "electric" ? (
                <Field label="Батарея" className="col-span-2">
                  <NumberInput value={lot.batteryKwh} onChange={(v) => set("batteryKwh", v)} suffix="кВт·г" />
                </Field>
              ) : (
                <Field label="Об'єм двигуна" className="col-span-2">
                  <NumberInput value={lot.engineCc} onChange={(v) => set("engineCc", v)} suffix="см³" />
                </Field>
              )}

              <Field label="Пробіг" className="sm:col-span-3">
                <NumberInput
                  value={lot.mileage}
                  onChange={(v) => set("mileage", v)}
                  suffix={lot.mileageUnit === "mi" ? "миль" : "км"}
                />
              </Field>
              <Segmented
                className="sm:col-span-3"
                label="Одиниці пробігу"
                value={lot.mileageUnit}
                onChange={(v) => set("mileageUnit", v)}
                options={[
                  { value: "mi", label: "Милі" },
                  { value: "km", label: "Кілометри" },
                ]}
              />
            </div>
          </StepCard>

          <StepCard
            id="step-prices"
            step={3}
            title="Ціни"
            hint="З ними звіт покаже вигоду для клієнта й максимальну ставку. Можна змінити пізніше."
            done={pricesDone}
            badge="recommended"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Очікувана ставка на аукціоні">
                <NumberInput large value={lot.bidUsd} onChange={(v) => set("bidUsd", v)} suffix="$" />
              </Field>
              <Field label="Ціна такого авто в Україні">
                <NumberInput large value={lot.marketPriceUsd} onChange={(v) => set("marketPriceUsd", v)} suffix="$" />
              </Field>
            </div>
          </StepCard>

          <StepCard
            id="step-card"
            step={4}
            title="Картка лота"
            hint="Дані зі сторінки аукціону. Допомагають ШІ помітити розбіжності з фото."
            done={cardFilled > 0}
            badge="optional"
          >
            {!cardOpen ? (
              <button
                type="button"
                onClick={() => setCardOpen(true)}
                aria-expanded={false}
                className="flex w-full items-center justify-between rounded-xl border border-line2 bg-paper px-4 py-3 text-sm font-bold transition hover:border-accent-text/60"
              >
                <span>
                  {cardFilled > 0 ? `Заповнено полів: ${cardFilled}. Показати` : "Заповнити дані з картки лота"}
                </span>
                <ChevronDown className="size-4.5 text-muted" />
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-6">
                <Segmented
                  className="col-span-2 sm:col-span-3"
                  label="Аукціон"
                  value={lot.auction}
                  onChange={(v) => set("auction", v)}
                  options={[
                    { value: "IAAI", label: "IAAI" },
                    { value: "Copart", label: "Copart" },
                    { value: "Other", label: "Інший" },
                  ]}
                />
                <Field label="Номер лота" className="col-span-2 sm:col-span-3">
                  <input
                    className="control"
                    value={lot.lotNumber}
                    onChange={(e) => set("lotNumber", e.target.value)}
                  />
                </Field>

                <Field label="VIN" className="col-span-2 sm:col-span-3">
                  <input
                    className="control uppercase"
                    maxLength={17}
                    value={lot.vin}
                    onChange={(e) => set("vin", e.target.value.toUpperCase())}
                  />
                </Field>
                <Field label="Документ" className="col-span-2 sm:col-span-3">
                  <input
                    className="control"
                    list="title-options"
                    placeholder="наприклад, Salvage"
                    value={lot.titleType}
                    onChange={(e) => set("titleType", e.target.value)}
                  />
                  <datalist id="title-options">
                    {TITLE_OPTIONS.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </Field>

                <Field label="Primary Damage" className="col-span-2 sm:col-span-3">
                  <input
                    className="control"
                    list="damage-options"
                    placeholder="наприклад, Left Side"
                    value={lot.primaryDamage}
                    onChange={(e) => set("primaryDamage", e.target.value)}
                  />
                </Field>
                <Field label="Secondary Damage" className="col-span-2 sm:col-span-3">
                  <input
                    className="control"
                    list="damage-options"
                    placeholder="якщо вказано"
                    value={lot.secondaryDamage}
                    onChange={(e) => set("secondaryDamage", e.target.value)}
                  />
                </Field>
                <datalist id="damage-options">
                  {DAMAGE_OPTIONS.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>

                <Segmented
                  className="col-span-2 sm:col-span-6"
                  label="Подушки безпеки"
                  value={lot.airbags}
                  onChange={(v) => set("airbags", v)}
                  options={[
                    { value: "not_deployed", label: "Цілі" },
                    { value: "deployed", label: "Спрацювали" },
                    { value: "unknown", label: "Невідомо" },
                  ]}
                />
                <Segmented
                  className="col-span-2 sm:col-span-6"
                  label="Стан"
                  value={lot.runStatus}
                  onChange={(v) => set("runStatus", v)}
                  options={[
                    { value: "run_drive", label: "Run & Drive" },
                    { value: "starts", label: "Starts" },
                    { value: "no_start", label: "Не заводиться" },
                    { value: "unknown", label: "Невідомо" },
                  ]}
                />

                <Field label="Нотатки для аналізу" className="col-span-2 sm:col-span-6">
                  <textarea
                    className="control min-h-24"
                    placeholder="Усе, що відомо понад картку лота: слова брокера, огляд на місці тощо."
                    value={lot.notes}
                    onChange={(e) => set("notes", e.target.value)}
                  />
                </Field>
              </div>
            )}
          </StepCard>

          <StepCard
            id="step-history"
            step={5}
            title="Історія за VIN"
            hint="Підтягується автоматично за VIN: попередні аукціони, титули й статуси. Звіт Carfax можна додати поверх."
            done={historyDone}
            badge="optional"
          >
            <VinHistoryPanel state={vinState} onUnlock={unlockVin} />
            <div className="mt-5 border-t border-line pt-5">
              <p className="mb-3 text-sm font-extrabold">Звіт Carfax чи AutoCheck</p>
              <HistoryUploader files={history} onChange={setHistory} disabled={loading} />
            </div>
          </StepCard>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card rise p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Готовність</p>
            <p className="mt-1 text-lg font-extrabold leading-tight tracking-tight">{hint}</p>

            <ul className="mt-4 space-y-1">
              {checklist.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-panel2"
                  >
                    <span
                      aria-hidden
                      className={`grid size-6 shrink-0 place-items-center rounded-full ${
                        item.done
                          ? "bg-good text-on-ink"
                          : item.required
                            ? "border-2 border-ink/25"
                            : "border-2 border-dashed border-ink/20"
                      }`}
                    >
                      {item.done && <Check className="size-3.5" strokeWidth={3.5} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold leading-tight">
                        {item.label}
                        {!item.required && !item.done && (
                          <span className="ml-1.5 text-xs font-semibold text-faint">за бажанням</span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-muted">{item.note}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>

            {error && (
              <div className="mt-4">
                <Notice tone="bad" title="Аналіз не виконано">
                  {error}
                </Notice>
              </div>
            )}

            <Button size="lg" className="mt-4 hidden w-full lg:inline-flex" disabled={!ready || loading || outOfCredits} onClick={submit}>
              Проаналізувати лот <ArrowRight className="size-5" />
            </Button>
            {credits !== null && status?.configured && (
              <p className={`mt-2.5 text-center text-xs ${outOfCredits ? "font-bold text-bad" : "text-muted"}`}>
                {outOfCredits ? (
                  <>
                    Аналізи закінчились. <Link href="/billing" className="underline">Поповнити</Link>
                  </>
                ) : (
                  <>Залишок аналізів: {credits}</>
                )}
              </p>
            )}
            {activeLessons > 0 && (
              <p className="mt-2.5 text-center text-xs text-muted">Модель врахує уроків експерта СТО: {activeLessons}</p>
            )}
          </div>

          <div className="rounded-[1.25rem] border border-line p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Що буде у звіті</p>
            <ul className="mt-3 space-y-2.5">
              {OUTCOMES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-sm font-semibold">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-panel2 text-accent-text ring-1 ring-line2">
                    <Icon className="size-4" strokeWidth={2.2} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Button size="lg" className="w-full" disabled={!ready || loading || outOfCredits} onClick={submit}>
          {ready ? "Проаналізувати лот" : hint} {ready && <ArrowRight className="size-5" />}
        </Button>
      </div>

      {loading && (
        <div
          role="alertdialog"
          aria-live="assertive"
          aria-label="Триває аналіз"
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div className="rise w-full max-w-sm rounded-3xl border border-line2 bg-surface p-7 text-center shadow-pop">
            <div className="relative mx-auto mb-5 aspect-[4/3] w-40 overflow-hidden rounded-2xl border border-line2 bg-paper">
              {photos[0] && (
                <img src={photos[0].thumb} alt="" className="size-full object-cover" />
              )}
              <span
                aria-hidden
                className="absolute inset-0"
                style={{ animation: "scan 1.8s ease-in-out infinite alternate" }}
              >
                <span className="block h-1 w-full bg-accent shadow-[0_0_18px_4px_var(--accent)]" />
              </span>
            </div>
            <p className="text-lg font-extrabold tracking-tight">Аналізую лот</p>
            <p className="mt-1 min-h-5 text-sm font-semibold text-accent-text">{LOADING_STAGES[stage]}</p>
            <p className="mt-3 text-xs text-muted">Зазвичай це триває до хвилини. Не закривайте сторінку.</p>
          </div>
        </div>
      )}
    </div>
  );
}
