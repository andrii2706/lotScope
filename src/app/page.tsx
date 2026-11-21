"use client";

import { AUCTIONS, AUCTION_NAMES, isEuPlant, regionOf } from "@/lib/shared/auctions";
import { Combobox } from "@/components/ui/Combobox";
import { MAKES, modelsFor } from "@/lib/shared/cars";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HistoryUploader } from "@/components/analysis/HistoryUploader";
import { LotFinder } from "@/components/analysis/LotFinder";
import { MarketPrice } from "@/components/analysis/MarketPrice";
import { VinDecodeButton } from "@/components/analysis/VinDecodeButton";
import { PhotoUploader } from "@/components/analysis/PhotoUploader";
import { VinHistoryPanel } from "@/components/analysis/VinHistoryPanel";
import { useVinHistory } from "@/lib/client/useVinHistory";
import { Button, Field, Notice, NumberInput, PageHeader, Segmented, Select, StepCard } from "@/components/ui";
import { EMPTY_LOT, MAX_PHOTOS } from "@/lib/shared/defaults";
import { pricingSettings, usBuiltVin } from "@/lib/shared/calcPl";
import { fitPhotosForAnalysis, preparePhoto } from "@/lib/client/images";
import { useLessons } from "@/lib/client/lessons";
import { refreshMe, useMe } from "@/lib/client/me";
import { can } from "@/lib/shared/roles";
import { attachHistoryDocs, getSettings, localHistoryDocs, saveReport } from "@/lib/client/store";
import { userMessage, responseMessage } from "@/lib/shared/errors";
import type { Comparables, LotLookupResponse } from "@/types/auction";
import type { AnalyzeRequest, AnalyzeResponse, HistoryFile, LotInput, Report, AnalyzeStatus } from "@/types/report";
import type { PreparedPhoto } from "@/types/system";
import { FEATURES } from "@/config/features";
import { STORED_PHOTOS, DAMAGE_OPTIONS, TITLE_OPTIONS, LOADING_STAGES, OUTCOMES, MAX_REQUEST_CHARS } from "@/config/analysis";
import { t } from "@/lib/shared/i18n";

export default function NewAnalysisPage() {
  const router = useRouter();
  const [lot, setLot] = useState<LotInput>(EMPTY_LOT);
  const [photos, setPhotos] = useState<PreparedPhoto[]>([]);
  const [status, setStatus] = useState<AnalyzeStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState("");
  const [cardOpen, setCardOpen] = useState(false);
  const [history, setHistory] = useState<HistoryFile[]>([]);
  const [comparables, setComparables] = useState<Comparables | null>(null);
  const vinState = useVinHistory(lot.vin);
  const activeLessons = useLessons().filter((l) => l.active).length;
  const me = useMe();
  const pl = (me.status === "ready" && me.user?.market) === "pl";
  const vinHistory = vinState.status === "done" ? vinState.response.history : null;
  const historyDone = history.length > 0 || Boolean(vinHistory);

  useEffect(() => {
    let active = true;
    fetch("/api/analyze")
      .then((r) => r.json())
      .then((s: AnalyzeStatus) => active && setStatus(s))
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
    const urls = (result.photos ?? []).slice(0, MAX_PHOTOS);
    const loaded: (PreparedPhoto | null)[] = new Array(urls.length).fill(null);
    let next = 0;
    const worker = async () => {
      while (next < urls.length) {
        const i = next++;
        try {
          const res = await fetch(urls[i]);
          if (!res.ok) continue;
          const blob = await res.blob();
          loaded[i] = await preparePhoto(new File([blob], `lot-${i + 1}.jpg`, { type: blob.type }));
        } catch {}
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, urls.length) }, worker));
    const prepared = loaded.filter((p): p is PreparedPhoto => p !== null);
    if (prepared.length > 0) setPhotos((prev) => [...prev, ...prepared].slice(0, MAX_PHOTOS));
  }

  const photosDone = photos.length > 0;
  const carDone = Boolean(lot.make.trim() && lot.model.trim() && lot.year);
  const pricesDone = lot.bidUsd > 0 && (pl ? (lot.marketPricePln ?? 0) > 0 : lot.marketPriceUsd > 0);
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
    { label: t("Фото лота"), done: photosDone, required: true, href: "#step-photos", note: photosDone ? t("{v0} фото", { v0: photos.length }) : t("додайте хоча б одне") },
    { label: t("Авто"), done: carDone, required: true, href: "#step-car", note: carDone ? `${lot.year} ${lot.make} ${lot.model}` : t("марка, модель, рік") },
    { label: t("Ціни"), done: pricesDone, required: false, href: "#step-prices", note: pricesDone ? t("ставка та ринок") : t("для максимальної ставки") },
    { label: t("Картка лота"), done: cardFilled > 0, required: false, href: "#step-card", note: cardFilled > 0 ? t("заповнено полів: {v0}", { v0: cardFilled }) : t("уточнює аналіз") },
    {
      label: FEATURES.vinHistoryAuto ? t("Історія за VIN") : t("Звіт Carfax"),
      done: historyDone,
      required: false,
      href: "#step-history",
      note: vinState.status === "loading"
        ? t("шукаю за VIN…")
        : [vinHistory ? t("автоматично") : "", history.length ? `Carfax: ${history.length}` : ""].filter(Boolean).join(" + ") || (FEATURES.vinHistoryAuto ? t("з'явиться після VIN") : t("за бажанням")),
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
        laborRateUsd: pricingSettings(settings).laborRateUsd,
        paintPerPanelUsd: pricingSettings(settings).paintPerPanelUsd,
        partsPreference: settings.partsPreference,
      },
    };
    try {
      const rest = JSON.stringify({ ...payload, images: [] }).length + photos.length * 64;
      const fitted = await fitPhotosForAnalysis(photos.map((p) => p.data), MAX_REQUEST_CHARS - rest);
      payload.images = fitted.map((data) => ({ mediaType: "image/jpeg", data }));
      const body = JSON.stringify(payload);
      if (body.length > MAX_REQUEST_CHARS) {
        throw new Error(t("Фото та файли історії разом завеликі для одного запиту. Приберіть кілька фото або великий PDF і спробуйте ще раз."));
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
        throw new Error(responseMessage("/api/analyze", res.status, data, t("Не вдалося виконати аналіз. Спробуйте ще раз.")));
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
      const local = { ...report, historyDocs: localHistoryDocs(history) };
      if (can(me.status === "ready" ? me.user : null, "save")) {
        try {
          saved = await saveReport(report, true);
          if (history.length) saved = { ...saved, historyDocs: await attachHistoryDocs(saved.id, history) };
        } catch {
          saved = await saveReport(local, false);
          notSaved = true;
        }
      } else {
        saved = await saveReport(local, false);
      }
      void refreshMe();
      router.push(`/report/${saved.id}${notSaved ? "?unsaved=1" : ""}`);
    } catch (e) {
      setError(
        userMessage(e, t("Аналіз не вдався. Спробуйте ще раз.")),
      );
      setLoading(false);
    }
  }

  const hint = !photosDone && !carDone
    ? t("Почніть з фото лота")
    : !photosDone
      ? t("Залишилось додати фото")
      : !carDone
        ? t("Залишилось вказати марку, модель і рік")
        : t("Усе готово до аналізу");

  return (
    <div className="pb-24 lg:pb-0">
      <PageHeader
        title={t("Новий аналіз")}
        description={t("Знайдіть лот або додайте фото й дані вручну. Отримаєте розбір пошкоджень, вилку ремонту, ціну під ключ і максимальну ставку.")}
      />

      {status && !status.configured && (
        <div className="mb-6">
          <Notice tone="warn" title={t("Демо-режим")}>
            {t("Аналіз фото зараз не підключений, тому звіт покаже заздалегідь підготовлений приклад замість розбору ваших фото. Розрахунок розмитнення та ціни під ключ працює повністю.")}
          </Notice>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21.5rem]">
        <div className="space-y-5">
          <LotFinder onFound={applyFound} disabled={loading} />

          <StepCard
            id="step-photos"
            step={1}
            title={t("Фото лота")}
            hint={t("Що більше ракурсів, то точніша оцінка.")}
            done={photosDone}
            badge="required"
          >
            <PhotoUploader photos={photos} onChange={setPhotos} disabled={loading} />
          </StepCard>

          <StepCard
            id="step-car"
            step={2}
            title={t("Авто")}
            hint={t("Рік і двигун потрібні для розрахунку акцизу.")}
            done={carDone}
            badge="required"
          >
            <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-6">
              <Field label={t("Марка")} required className="sm:col-span-2">
                <Combobox options={MAKES} placeholder="BMW" value={lot.make} onChange={(v) => set("make", v)} />
              </Field>
              <Field label={t("Модель")} required className="sm:col-span-3">
                <Combobox options={modelsFor(lot.make)} placeholder="330i Gran Turismo xDrive" value={lot.model} onChange={(v) => set("model", v)} />
              </Field>
              <Field label={t("Рік")} required className="col-span-2 sm:col-span-1">
                <NumberInput value={lot.year} onChange={(v) => set("year", Math.round(v))} min={1980} />
              </Field>

              <Segmented
                className="col-span-2 sm:col-span-4"
                label={t("Двигун")}
                value={lot.fuel}
                onChange={(v) => set("fuel", v)}
                options={[
                  { value: "petrol", label: t("Бензин") },
                  { value: "diesel", label: t("Дизель") },
                  { value: "hybrid", label: t("Гібрид") },
                  { value: "electric", label: t("Електро") },
                ]}
              />
              {lot.fuel === "electric" ? (
                <Field label={t("Батарея")} className="col-span-2">
                  <NumberInput value={lot.batteryKwh} onChange={(v) => set("batteryKwh", v)} suffix={t("кВт·г")} />
                </Field>
              ) : (
                <Field label={t("Об'єм двигуна")} className="col-span-2">
                  <NumberInput value={lot.engineCc} onChange={(v) => set("engineCc", v)} suffix={t("см³")} />
                </Field>
              )}

              <Field label={t("Пробіг")} className="sm:col-span-3">
                <NumberInput
                  value={lot.mileage}
                  onChange={(v) => set("mileage", v)}
                  suffix={lot.mileageUnit === "mi" ? t("миль") : t("км")}
                />
              </Field>
              <Segmented
                className="sm:col-span-3"
                label={t("Одиниці пробігу")}
                value={lot.mileageUnit}
                onChange={(v) => set("mileageUnit", v)}
                options={[
                  { value: "mi", label: t("Милі") },
                  { value: "km", label: t("Кілометри") },
                ]}
              />
            </div>
          </StepCard>

          <StepCard
            id="step-prices"
            step={3}
            title={t("Ціни")}
            hint={t("З ними звіт покаже вигоду для клієнта й максимальну ставку. Можна змінити пізніше.")}
            done={pricesDone}
            badge="recommended"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("Очікувана ставка на аукціоні")}>
                <NumberInput large value={lot.bidUsd} onChange={(v) => set("bidUsd", v)} suffix="$" />
              </Field>
              {pl ? (
                <Field label="Cena takiego auta w Polsce" hint="Mediana podobnych ogłoszeń, np. na Otomoto. Wpisz ręcznie.">
                  <NumberInput large value={lot.marketPricePln ?? 0} onChange={(v) => setLot((prev) => ({ ...prev, marketPricePln: v, marketSource: "" }))} suffix="zł" />
                </Field>
              ) : (
                <Field label={t("Ціна такого авто в Україні")} hint={lot.marketSource ? t("з AUTO.RIA") : undefined}>
                  <NumberInput
                    large
                    value={lot.marketPriceUsd}
                    onChange={(v) => setLot((prev) => ({ ...prev, marketPriceUsd: v, marketSource: "" }))}
                    suffix="$"
                  />
                </Field>
              )}
              {pl && regionOf(lot.auction) !== "eu" && (
                <label className="flex items-start gap-3 rounded-xl border border-line2 p-3.5 sm:col-span-2">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4.5 accent-[var(--accent)]"
                    checked={lot.usOrigin === true}
                    onChange={(e) => set("usOrigin", e.target.checked)}
                  />
                  <span className="text-sm">
                    <span className="block font-bold">Auto wyprodukowane w USA — cło 0 %</span>
                    <span className="block text-xs text-muted">
                      Od lipca 2026 r. auta pochodzenia amerykańskiego wjeżdżają do UE bez cła, ale agencja celna potrzebuje dowodu pochodzenia i nie zawsze go uzna. Bez dowodu liczymy 10 %.
                      {lot.vin.length >= 3 ? (usBuiltVin(lot.vin) ? " VIN zaczyna się od 1, 4 lub 5 — auto zbudowane w USA." : " VIN wskazuje, że auto nie zostało zbudowane w USA.") : ""}
                    </span>
                  </span>
                </label>
              )}
              {FEATURES.marketPriceAuto && !pl && (
                <MarketPrice lot={lot} onPrice={(v, source) => setLot((prev) => ({ ...prev, marketPriceUsd: v, marketSource: source }))} />
              )}
              {!pl && regionOf(lot.auction) === "eu" && (
                <label className="flex items-start gap-3 rounded-xl border border-line2 p-3.5 sm:col-span-2">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4.5 accent-[var(--accent)]"
                    checked={lot.eur1 === true}
                    onChange={(e) => set("eur1", e.target.checked)}
                  />
                  <span className="text-sm">
                    <span className="block font-bold">{t("Авто виготовлене в ЄС, продавець дасть EUR.1")}</span>
                    <span className="block text-xs text-muted">
                      {t("Тоді мито 0 % замість 10 %. Важлива країна заводу, а не країна аукціону: японська чи американська збірка преференції не має.")}{lot.plantCountry ? t(" Завод за VIN: {v0}{v1}.", { v0: lot.plantCountry, v1: isEuPlant(lot.plantCountry) ? " (ЄС)" : " (не ЄС)" }) : ""}
                    </span>
                  </span>
                </label>
              )}
            </div>
          </StepCard>

          <StepCard
            id="step-card"
            step={4}
            title={t("Картка лота")}
            hint={t("Дані зі сторінки аукціону. Допомагають ШІ помітити розбіжності з фото.")}
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
                  {cardFilled > 0 ? t("Заповнено полів: {v0}. Показати", { v0: cardFilled }) : t("Заповнити дані з картки лота")}
                </span>
                <ChevronDown className="size-4.5 text-muted" />
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-6">
                <Field label={t("Аукціон")} className="col-span-2 sm:col-span-3">
                  <Select<LotInput["auction"]> value={lot.auction} onChange={(v) => set("auction", v)} options={AUCTION_NAMES.map((a) => ({ value: a, label: AUCTIONS[a].label }))} />
                </Field>
                <Field label={t("Номер лота")} className="col-span-2 sm:col-span-3">
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
                  <VinDecodeButton
                    vin={lot.vin}
                    onDecoded={(d) =>
                      setLot((prev) => ({
                        ...prev,
                        make: prev.make || d.make,
                        model: prev.model || d.model,
                        year: d.year || prev.year,
                        engineCc: d.engineCc || prev.engineCc,
                        fuel: d.fuel ?? prev.fuel,
                        plantCountry: d.plantCountry || prev.plantCountry,
                      }))
                    }
                  />
                </Field>
                <Field label={t("Документ")} className="col-span-2 sm:col-span-3">
                  <Combobox minChars={0} options={TITLE_OPTIONS} placeholder={t("наприклад, Salvage")} value={lot.titleType} onChange={(v) => set("titleType", v)} />
                </Field>

                <Field label={t("Основне пошкодження (Primary Damage)")} className="col-span-2 sm:col-span-3">
                  <Combobox minChars={0} options={DAMAGE_OPTIONS} placeholder={t("наприклад, Left Side")} value={lot.primaryDamage} onChange={(v) => set("primaryDamage", v)} />
                </Field>
                <Field label={t("Додаткове пошкодження (Secondary Damage)")} className="col-span-2 sm:col-span-3">
                  <Combobox minChars={0} options={DAMAGE_OPTIONS} placeholder={t("якщо вказано")} value={lot.secondaryDamage} onChange={(v) => set("secondaryDamage", v)} />
                </Field>

                <Segmented
                  className="col-span-2 sm:col-span-6"
                  label={t("Подушки безпеки")}
                  value={lot.airbags}
                  onChange={(v) => set("airbags", v)}
                  options={[
                    { value: "not_deployed", label: t("Цілі") },
                    { value: "deployed", label: t("Спрацювали") },
                    { value: "unknown", label: t("Невідомо") },
                  ]}
                />
                <Segmented
                  className="col-span-2 sm:col-span-6"
                  label={t("Стан")}
                  value={lot.runStatus}
                  onChange={(v) => set("runStatus", v)}
                  options={[
                    { value: "run_drive", label: t("Заводиться і їде") },
                    { value: "starts", label: t("Заводиться") },
                    { value: "no_start", label: t("Не заводиться") },
                    { value: "unknown", label: t("Невідомо") },
                  ]}
                />

                <Field label={t("Нотатки для аналізу")} className="col-span-2 sm:col-span-6">
                  <textarea
                    className="control min-h-24"
                    placeholder={t("Усе, що відомо понад картку лота: слова брокера, огляд на місці тощо.")}
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
            title={FEATURES.vinHistoryAuto ? t("Історія за VIN") : t("Звіт Carfax чи AutoCheck")}
            hint={
              FEATURES.vinHistoryAuto
                ? t("Підтягується автоматично за VIN: попередні аукціони, титули й статуси. Звіт Carfax можна додати поверх.")
                : t("Додайте PDF або скриншоти звіту. ШІ врахує історію в аналізі, а файл збережеться у звіті.")
            }
            done={historyDone}
            badge="optional"
          >
            {FEATURES.vinHistoryAuto ? (
              <>
                <VinHistoryPanel state={vinState} />
                <div className="mt-5 border-t border-line pt-5">
                  <p className="mb-3 text-sm font-semibold">{t("Звіт Carfax чи AutoCheck")}</p>
                  <HistoryUploader files={history} onChange={setHistory} disabled={loading} />
                </div>
              </>
            ) : (
              <HistoryUploader files={history} onChange={setHistory} disabled={loading} />
            )}
          </StepCard>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <div className="card rise p-5">
            <p className="text-[13px] font-medium text-muted">{t("Готовність")}</p>
            <p className="mt-1 text-base font-semibold leading-tight">{hint}</p>
            <div aria-hidden className="mt-3 h-1.5 overflow-hidden rounded-full bg-panel2">
              <span
                className="block h-full rounded-full bg-good transition-all"
                style={{ width: `${(checklist.filter((c) => c.done).length / Math.max(1, checklist.length)) * 100}%` }}
              />
            </div>

            <ul className="mt-4 space-y-1">
              {checklist.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-panel2"
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
                      <span className="block text-sm font-medium leading-tight">
                        {item.label}
                        {!item.required && !item.done && (
                          <span className="ml-1.5 text-xs font-semibold text-faint">{t("за бажанням")}</span>
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
                <Notice tone="bad" title={t("Аналіз не виконано")}>
                  {error}
                </Notice>
              </div>
            )}

            <Button size="lg" className="mt-4 hidden w-full lg:inline-flex" disabled={!ready || loading} onClick={submit}>
              {t("Проаналізувати лот")} <ArrowRight className="size-5" />
            </Button>
            {activeLessons > 0 && (
              <p className="mt-2.5 text-center text-xs text-muted">{t("Модель врахує уроків експерта СТО:")} {activeLessons}</p>
            )}
          </div>

          <div className="rounded-2xl border border-line p-5">
            <p className="text-[13px] font-medium text-muted">{t("Що буде у звіті")}</p>
            <ul className="mt-3 space-y-2.5">
              {OUTCOMES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-sm font-medium">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-panel2 text-muted">
                    <Icon className="size-4" strokeWidth={2.2} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Button size="lg" className="w-full" disabled={!ready || loading} onClick={submit}>
          {ready ? t("Проаналізувати лот") : hint} {ready && <ArrowRight className="size-5" />}
        </Button>
      </div>

      {loading && (
        <div
          role="alertdialog"
          aria-live="assertive"
          aria-label={t("Триває аналіз")}
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div className="rise w-full max-w-sm rounded-2xl border border-line2 bg-surface p-7 text-center shadow-pop">
            <div className="relative mx-auto mb-5 aspect-[4/3] w-40 overflow-hidden rounded-xl border border-line2 bg-paper">
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
            <p className="text-lg font-semibold tracking-tight">{t("Аналізую лот")}</p>
            <p className="mt-1 min-h-5 text-sm font-semibold text-accent-text">{t(LOADING_STAGES[stage])}</p>
            <p className="mt-3 text-xs text-muted">{t("Зазвичай це триває до хвилини. Не закривайте сторінку.")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
