import type { ReactNode } from "react";
import { CostBar, CostTable } from "@/components/report/CostTable";
import { ScoreRing } from "@/components/report/ScoreRing";
import { money, moneyRange, usd } from "@/lib/shared/calc";
import { partRange } from "@/lib/shared/partsPricing";
import {
  ACTION,
  AIRBAG,
  CONFIDENCE,
  LEVEL,
  LIKELIHOOD,
  TONE_BG,
  TONE_TEXT,
  VERDICT,
  formatDate,
  lotTitle,
} from "@/lib/shared/labels";
import type { CostResult } from "@/types/pricing";
import type { Report, Settings } from "@/types/report";
import { t, localeOf, fmtNum } from "@/lib/shared/i18n";

export function PrintReport({
  report,
  settings,
  cost,
  facts,
  description,
}: {
  report: Report;
  settings: Settings;
  cost: CostResult;
  facts: string[][];
  description: string[];
}) {
  const { lot, analysis } = report;
  const verdict = VERDICT[analysis.verdict];
  const bid = report.overrides.bidUsd ?? lot.bidUsd;
  const hasMarket = cost.marketPriceUsd > 0;
  const scenarioMax = Math.max(1, ...analysis.scenarios.map((s) => s.repairMaxUsd));
  const photos = report.photos.slice(0, 4);

  return (
    <article className="print-only sheet text-ink">
      <header className="flex items-center justify-between gap-4 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          {settings.logoDataUrl ? (
            <img src={settings.logoDataUrl} alt="" className="h-11 w-auto max-w-40 object-contain" />
          ) : (
            <span className="grid size-11 place-items-center rounded-xl bg-ink text-lg font-extrabold text-on-ink">
              {(settings.companyName.trim().charAt(0) || "L").toUpperCase()}
            </span>
          )}
          <div>
            <p className="text-lg font-extrabold leading-tight">{settings.companyName || t("Звіт про лот")}</p>
            {settings.companyContact && <p className="text-sm text-muted">{settings.companyContact}</p>}
          </div>
        </div>
        <div className="text-right text-sm text-muted">
          <p className="font-extrabold text-ink">{t("Звіт про лот")}</p>
          <p>{formatDate(report.createdAt)}</p>
        </div>
      </header>

      {report.demo && (
        <p className="mt-4 rounded-xl border border-warn/30 bg-warn-bg px-4 py-3 text-sm">
          <b className="text-warn">{t("Демо-звіт: це не аналіз ваших фото.")}</b> {t("Опис пошкоджень і вилка ремонту — заздалегідь підготовлений приклад. Розрахунок розмитнення та ціни під ключ зроблено за введеними даними лота.")}
        </p>
      )}

      <section className="mt-5 grid grid-cols-2 gap-6">
        {photos.length > 0 && (
          <div className="avoid-break">
            <img src={photos[0]} alt="" className="aspect-[4/3] w-full rounded-xl border border-line object-cover" />
            {photos.length > 1 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {photos.slice(1).map((src, i) => (
                  <img key={i} src={src} alt="" className="aspect-[4/3] w-full rounded-lg border border-line object-cover" />
                ))}
              </div>
            )}
          </div>
        )}
        <div className={photos.length === 0 ? "col-span-2" : ""}>
          <h1 className="font-display text-2xl font-semibold leading-[1.15] tracking-tight">{lotTitle(lot)}</h1>
          {description.length > 0 && <p className="mt-2 text-sm leading-relaxed text-ink/85">{description.join(" ")}</p>}
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {facts.map(([label, value]) => (
              <div key={label} className={label.startsWith("VIN") || label === t("Пошкодження") || label === t("Документ") ? "col-span-2" : ""}>
                <dt className="text-xs font-semibold text-muted">{label}</dt>
                <dd className="font-bold">{value}</dd>
              </div>
            ))}
          </dl>
          <div className={`avoid-break mt-4 flex items-center gap-4 rounded-xl p-3.5 ${TONE_BG[verdict.tone]}`}>
            <ScoreRing score={analysis.conditionScore} tone={verdict.tone} size={68} />
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">{t("Висновок")}</p>
              <p className={`text-xl font-extrabold leading-tight ${TONE_TEXT[verdict.tone]}`}>{verdict.label}</p>
              <p className="mt-0.5 text-sm leading-snug text-ink/70">{verdict.text}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-[1.3fr_1fr_1fr] gap-3">
        <div className="avoid-break rounded-xl bg-ink p-4 text-on-ink">
          <p className="text-xs font-bold uppercase tracking-wider opacity-65">{t("Ціна під ключ")}</p>
          <p className="mt-1.5 whitespace-nowrap text-xl font-extrabold leading-tight">
            {moneyRange(cost.totalMinUsd, cost.totalMaxUsd, cost)}
          </p>
          <p className="mt-1 text-sm opacity-65">{bid > 0 ? t("при ставці {v0}", { v0: usd(bid) }) : t("без вартості авто")}</p>
        </div>
        <Tile
          label={t("Максимальна ставка")}
          value={hasMarket ? (cost.maxBidUsd ? usd(cost.maxBidUsd) : t("Недосяжно")) : "—"}
          note={hasMarket ? t("для вигоди {v0} %", { v0: settings.targetSavingsPct }) : t("ринкову ціну не вказано")}
        />
        <Tile
          label={hasMarket && cost.savingsUsd < 0 ? t("Переплата") : t("Вигода для клієнта")}
          value={hasMarket ? `${money(Math.abs(cost.savingsUsd), cost)} (${Math.abs(cost.savingsPct).toFixed(0)} %)` : "—"}
          note={hasMarket ? t("ринок в Україні {v0}", { v0: money(cost.marketPriceUsd, cost) }) : t("порівняння недоступне")}
        />
      </section>

      <Block title={t("Коротко")} flow>
        <p className="text-[15px] leading-relaxed">{analysis.summary}</p>
        <dl className="mt-3 grid grid-cols-3 gap-3">
          <Tile label={t("Зона удару")} value={analysis.impactZone || t("не визначено")} small />
          <Tile label={t("Ризик для силової структури")} value={LEVEL[analysis.structuralRisk]} note={analysis.structuralRiskNote} small />
          <Tile label={t("Подушки за фото")} value={AIRBAG[analysis.airbagAssessment]} note={analysis.airbagNote} small />
        </dl>
      </Block>

      {analysis.damagedParts.length > 0 && (
        <Block title={t("Пошкоджені деталі")} flow>
          <table className="w-full overflow-hidden rounded-xl text-sm">
            <thead className="bg-panel2 text-left text-xs font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">{t("Деталь")}</th>
                <th className="px-3 py-2">{t("Що робити")}</th>
                <th className="px-3 py-2">{t("Впевненість")}</th>
                <th className="px-3 py-2 text-right">{t("Вартість")}</th>
              </tr>
            </thead>
            <tbody>
              {analysis.damagedParts.map((part, i) => (
                <tr key={i} className="avoid-break border-b border-line align-top">
                  <td className="px-3 py-2">
                    <span className="font-bold">{part.part}</span>
                    {part.note && <span className="block text-xs text-muted">{part.note}</span>}
                  </td>
                  <td className="px-3 py-2">{ACTION[part.action]}</td>
                  <td className="px-3 py-2">{CONFIDENCE[part.confidence]}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-bold">
                    {moneyRange(part.costMinUsd, part.costMaxUsd, cost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Block>
      )}

      {analysis.scenarios.length > 0 && (
        <Block title={t("Сценарії ремонту")}>
          <ul className="grid grid-cols-3 gap-3">
            {analysis.scenarios.map((s, i) => (
              <li key={i} className="flex flex-col rounded-xl border border-line p-3.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-muted">
                  {LIKELIHOOD[s.likelihood]}
                </span>
                <p className="mt-1 font-extrabold leading-snug">{s.name}</p>
                <p className="mt-1 flex-1 text-sm leading-snug text-muted">{s.description}</p>
                <p className="mt-2 text-lg font-extrabold">
                  {moneyRange(s.repairMinUsd, s.repairMaxUsd, cost)}
                </p>
                <div className="relative mt-1.5 h-1.5 rounded-full bg-line">
                  <span
                    className="absolute inset-y-0 rounded-full bg-ink"
                    style={{
                      left: `${(s.repairMinUsd / scenarioMax) * 100}%`,
                      width: `${Math.max(4, ((s.repairMaxUsd - s.repairMinUsd) / scenarioMax) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Block>
      )}

      <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-5">
        <List title={t("Ризики")} items={analysis.redFlags} empty={t("Явних ризиків на фото не видно.")} dot="bg-bad" />
        <List title={t("Що на користь лота")} items={analysis.positives} empty={t("Не виявлено.")} dot="bg-good" />
        <List title={t("Яких фото бракує")} items={analysis.missingViews} empty={t("Фото достатньо.")} dot="bg-warn" />
        <List title={t("Перевірити перед ставкою")} items={analysis.inspectionChecklist} empty="—" dot="bg-muted" />
      </div>

      {report.expert && (
        <div className="avoid-break mt-6 rounded-xl border border-line px-4 py-3 text-sm">
          <p className="font-extrabold">
            {t("Перевірено експертом СТО:")} {report.expert.expert}
            {report.expert.verdict && t(" · висновок: {v0}", { v0: VERDICT[report.expert.verdict].label })}
            {report.expert.repairMaxUsd > 0 && t(" · ремонт {v0}", { v0: moneyRange(report.expert.repairMinUsd, report.expert.repairMaxUsd, cost) })}
          </p>
          {report.expert.comment && <p className="mt-1 leading-relaxed text-muted">{report.expert.comment}</p>}
        </div>
      )}

      {(analysis.historyProvided || report.comparables?.stats) && (
        <div className="avoid-break mt-6 grid grid-cols-2 gap-x-8 gap-y-5">
          {analysis.historyProvided && (
            <List
              title={t("Історія за VIN")}
              items={[
                analysis.historySummary,
                ...(analysis.historyFindings ?? []),
                report.historyDocs?.length ? t("Додані звіти історії: {v0}.", { v0: report.historyDocs.map((d) => d.name).join(", ") }) : "",
              ].filter(Boolean)}
              empty="—"
              dot="bg-accent"
            />
          )}
          {report.comparables?.stats && (
            <List
              title={t("Продажі схожих лотів")}
              items={[
                t("Медіана {v0}, середина ринку {v1}–{v2}.", { v0: usd(report.comparables.stats.medianUsd), v1: usd(report.comparables.stats.p25Usd), v2: usd(report.comparables.stats.p75Usd) }),
                t("Продажів: {v0} ({v1}).", { v0: report.comparables.stats.count, v1: report.comparables.query }),
              ]}
              empty="—"
              dot="bg-muted"
            />
          )}
        </div>
      )}

      <Block title={t("З чого складається ціна під ключ")} flow>
        <CostBar cost={cost} />
        <div className="mt-4">
          <CostTable cost={cost} editing={false} overrides={report.overrides} onOverride={() => {}} />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          {cost.currency === "PLN"
            ? `Wartość celna ${money(cost.customsValueUsd, cost)}. Kurs${settings.autoRates ? " NBP" : ""}: 1 $ = ${fmtNum(settings.usdPln)} zł, 1 € = ${fmtNum(settings.eurPln)} zł. Opłaty aukcji i logistyka — według stawek firmy.`
            : <>{t("Митна вартість")} {usd(cost.customsValueUsd)}{t(". Курси")}{settings.autoRates ? t(" НБУ") : ""}: 1 € = {settings.eurUsd} $, 1 $ = {settings.usdUah} {t("грн. Збір аукціону та логістика — оцінка за тарифами компанії.")}</>}
          {report.lot.marketSource && report.overrides.marketPriceUsd === undefined ? t(" Ринкова ціна: {v0}.", { v0: report.lot.marketSource }) : ""}
        </p>
      </Block>

      {report.partsSearch && report.partsSearch.parts.some((p) => p.offers.length > 0) && (
        <Block title={t("Ціни запчастин (Allegro, OLX)")}>
          <table className="w-full text-sm">
            <tbody>
              {report.partsSearch.parts.map((p) => {
                const r = partRange(p, settings);
                const best = p.offers[0];
                return (
                  <tr key={p.part} className="border-b border-line last:border-b-0">
                    <td className="py-1.5 pr-3 font-semibold">{p.part}</td>
                    <td className="py-1.5 pr-3 text-muted">{best ? `${best.source}: ${Math.round(best.price).toLocaleString(localeOf())} ${best.currency}` : t("не знайдено")}</td>
                    <td className="py-1.5 text-right font-bold">{r.found ? moneyRange(r.minUsd, r.maxUsd, cost) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-1.5 text-xs text-muted">
            {t("Ціни з оголошень на")} {new Date(report.partsSearch.checkedAt).toLocaleDateString(localeOf())}{t(", з роботами з установки. Наявність і сумісність уточнюються перед покупкою.")}
          </p>
        </Block>
      )}

      <footer className="avoid-break mt-5 rounded-xl bg-panel2 px-4 py-3 text-xs leading-relaxed text-muted">
        {t("Оцінку пошкоджень зроблено штучним інтелектом за фото з аукціону. Вона не замінює огляд авто на майданчику та перевірку історії за VIN: приховані пошкодження на фото не видно. Суми є попередніми і можуть змінитися після торгів та фактичного ремонту.")}
      </footer>
    </article>
  );
}

function Block({ title, children, flow }: { title: string; children: ReactNode; flow?: boolean }) {
  return (
    <section className={`mt-6 ${flow ? "" : "avoid-break"}`}>
      <h2 className="mb-2.5 text-lg font-extrabold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Tile({ label, value, note, small }: { label: string; value: string; note?: string; small?: boolean }) {
  return (
    <div className="avoid-break rounded-xl border border-line p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-1.5 font-extrabold leading-tight first-letter:uppercase ${small ? "text-base" : "text-xl"}`}>
        {value}
      </p>
      {note && <p className="mt-1 text-xs leading-snug text-muted">{note}</p>}
    </div>
  );
}

function List({ title, items, empty, dot }: { title: string; items: string[]; empty: string; dot: string }) {
  return (
    <section className="avoid-break">
      <h2 className="mb-2 text-lg font-extrabold tracking-tight">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="space-y-1.5 text-sm leading-snug">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2.5">
              <span aria-hidden className={`mt-[7px] size-1.5 shrink-0 rounded-full ${dot}`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
