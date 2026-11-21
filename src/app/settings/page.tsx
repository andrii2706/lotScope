"use client";

import { confirmDialog, Button, Card, Field, NumberInput, PageHeader, Segmented } from "@/components/ui";
import { CircleCheck, Globe, Landmark, Palette, RotateCcw, Truck, Upload, Wrench } from "lucide-react";
import { useRef, useState, type CSSProperties } from "react";
import { ACCENTS, REGION_ROWS, SETTINGS_SECTIONS } from "@/config/settings";
import { accentInk, accentText } from "@/lib/shared/color";
import { DEFAULT_SETTINGS, PL_DEFAULTS } from "@/lib/shared/defaults";
import { refreshMe } from "@/lib/client/me";
import { fileToLogo } from "@/lib/client/images";
import { useRates } from "@/lib/client/rates";
import { saveSettings, useHydrated, useSettings } from "@/lib/client/store";
import { useResolvedTheme } from "@/lib/client/theme";
import type { NumericSettingKey, Settings } from "@/types/report";
import { fmtNum, t } from "@/lib/shared/i18n";

export default function SettingsPage() {
  const hydrated = useHydrated();
  const settings = useSettings();
  const theme = useResolvedTheme(settings.theme);
  const logoInput = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState("");
  const rates = useRates();

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    void saveSettings({ ...settings, [key]: value });
  const pl = settings.market === "pl";
  const switchMarket = async (market: Settings["market"]) => {
    if (market === settings.market) return;
    await saveSettings(market === "pl" ? { ...settings, ...PL_DEFAULTS, accentColor: settings.accentColor === DEFAULT_SETTINGS.accentColor ? PL_DEFAULTS.accentColor ?? settings.accentColor : settings.accentColor } : { ...settings, market });
    await refreshMe();
  };

  const money = (key: NumericSettingKey, label: string, suffix = "$", hint?: string) => (
    <Field label={label} hint={hint}>
      <NumberInput value={settings[key]} onChange={(v) => set(key, v)} suffix={suffix} step={0.01} />
    </Field>
  );

  if (!hydrated) return <p className="text-sm text-muted">{t("Завантажую…")}</p>;

  return (
    <div>
      <PageHeader
        title={t("Налаштування компанії")}
        description={t("Ваш бренд і тарифи. Застосовуються до всіх звітів, зокрема вже створених.")}
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-good-bg px-3 py-1.5 text-xs font-bold text-good">
            <CircleCheck className="size-4" /> {t("Зміни зберігаються автоматично")}
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label={t("Розділи налаштувань")} className="hidden lg:block">
          <ul className="sticky top-8 space-y-1">
            {SETTINGS_SECTIONS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-muted transition hover:bg-surface hover:text-ink"
                >
                  <Icon className="size-4.5" /> {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="max-w-3xl space-y-5">
          <Card id="market" icon={<Globe className="size-5" />} title={t("Ринок і мова")} hint={t("Від ринку залежать мова інтерфейсу й PDF, валюта, мито та податки в розрахунку.")}>
            <Segmented
              label={t("Ринок")}
              value={settings.market}
              onChange={(v) => void switchMarket(v)}
              options={[
                { value: "ua", label: "Україна · українська · $" },
                { value: "pl", label: "Polska · polski · zł" },
              ]}
            />
          </Card>

          <Card
            id="brand"
            icon={<Palette className="size-5" />}
            title={t("Бренд у звіті")}
            hint={t("Так клієнт побачить вашу компанію в шапці звіту.")}
          >
            <div
              className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-line2 bg-paper p-4"
              style={
                {
                  "--accent": settings.accentColor,
                  "--accent-ink": accentInk(settings.accentColor),
                  "--accent-text": accentText(settings.accentColor, theme),
                } as CSSProperties
              }
              aria-label={t("Попередній вигляд шапки звіту")}
            >
              <div className="flex items-center gap-3">
                {settings.logoDataUrl ? (
                  <img src={settings.logoDataUrl} alt="" className="h-11 w-auto max-w-32 object-contain" />
                ) : (
                  <span className="grid size-11 place-items-center rounded-xl bg-accent text-lg font-semibold text-accent-ink">
                    {(settings.companyName.trim().charAt(0) || "L").toUpperCase()}
                  </span>
                )}
                <div>
                  <p className="text-base font-semibold leading-tight">
                    {settings.companyName || t("Назва вашої компанії")}
                  </p>
                  <p className="text-sm text-muted">{settings.companyContact || t("телефон, сайт")}</p>
                </div>
              </div>
              <span className="hidden rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-ink sm:block">
                {t("Колір кнопок")}
              </span>
            </div>

            <Segmented
              className="mb-5"
              label={t("Тема інтерфейсу")}
              value={settings.theme}
              onChange={(v) => set("theme", v)}
              options={[
                { value: "dark", label: t("Темна") },
                { value: "light", label: t("Світла") },
                { value: "system", label: t("Як у системі") },
              ]}
            />
            <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2">
              <Field label={t("Назва компанії")}>
                <input
                  className="control"
                  value={settings.companyName}
                  onChange={(e) => set("companyName", e.target.value)}
                />
              </Field>
              <Field label={t("Контакти")}>
                <input
                  className="control"
                  placeholder={t("телефон, сайт")}
                  value={settings.companyContact}
                  onChange={(e) => set("companyContact", e.target.value)}
                />
              </Field>
              <div>
                <span className="mb-1.5 block text-[13px] font-medium text-ink">{t("Логотип")}</span>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => logoInput.current?.click()}>
                    <Upload className="size-4" /> {settings.logoDataUrl ? t("Замінити") : t("Завантажити")}
                  </Button>
                  {settings.logoDataUrl && (
                    <Button variant="ghost" onClick={() => set("logoDataUrl", "")}>
                      {t("Прибрати")}
                    </Button>
                  )}
                </div>
                <input
                  ref={logoInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  hidden
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    try {
                      set("logoDataUrl", await fileToLogo(file));
                      setLogoError("");
                    } catch {
                      setLogoError(t("Не вдалося завантажити логотип. Спробуйте PNG або JPG."));
                    }
                  }}
                />
                {logoError && <p className="mt-1.5 text-xs font-semibold text-bad">{logoError}</p>}
              </div>
              <div>
                <span className="mb-1.5 block text-[13px] font-medium text-ink">{t("Колір бренду")}</span>
                <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={t("Колір бренду")}>
                  {ACCENTS.map((color) => {
                    const active = settings.accentColor.toLowerCase() === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={t("Колір {v0}", { v0: color })}
                        onClick={() => set("accentColor", color)}
                        className={`size-7 rounded-full transition ${
                          active ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : "hover:scale-110"
                        }`}
                        style={{ background: color }}
                      />
                    );
                  })}
                  <label
                    className="relative grid size-7 cursor-pointer place-items-center rounded-full border border-dashed border-line2 text-xs font-semibold text-muted hover:border-ink/60"
                    title={t("Свій колір")}
                  >
                    +
                    <input
                      type="color"
                      aria-label={t("Свій колір")}
                      className="absolute inset-0 cursor-pointer opacity-0"
                      value={settings.accentColor}
                      onChange={(e) => set("accentColor", e.target.value)}
                    />
                  </label>
                </div>
              </div>
            </div>
          </Card>

          <Card
            id="logistics"
            icon={<Truck className="size-5" />}
            title={t("Логістика та послуги")}
            hint={pl ? "Kwoty startowe to orientacyjne ceny z 2026 r. dla auta osobowego przez port w UE. Zastąp je stawkami swojego przewoźnika; w każdym raporcie można je poprawić osobno." : t("Стартові суми — орієнтовні ринкові ціни 2026 року для легкового авто через Клайпеду. Замініть їх тарифами вашого логіста; у кожному звіті їх можна виправити окремо.")}
          >
            <Segmented
              className="mb-4"
              label={t("Збір аукціону")}
              value={settings.auctionFeeMode}
              onChange={(v) => set("auctionFeeMode", v)}
              options={[
                { value: "table", label: t("За сіткою Copart / IAAI") },
                { value: "manual", label: t("Свій відсоток") },
              ]}
            />
            {settings.auctionFeeMode === "table" && (
              <p className="mb-4 rounded-xl bg-panel2 px-3.5 py-3 text-xs leading-relaxed text-muted">
                {t("Рахується за ставкою з опублікованої сітки зборів: buyer fee, збір за онлайн-ставку, gate/service, екологічний і титульний збори. Сітки аукціони змінюють, а брокер може додати свою комісію — вкажіть її в «Послугах компанії».")}
              </p>
            )}
            <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
              {settings.auctionFeeMode === "manual" && money("auctionFeePct", t("Збір аукціону, частка"), "%", t("від ставки"))}
              {settings.auctionFeeMode === "manual" && money("auctionFeeFixedUsd", t("Збір аукціону, фікс."), "$", t("додається до частки"))}
              {money("inlandUsUsd", t("Доставка до порту в США"))}
              {pl ? money("oceanUsd", "Fracht morski do portu w UE", "$", "Bremerhaven, Gdańsk lub Rotterdam") : money("oceanUsd", t("Морська доставка"))}
              {pl ? (
                <>
                  {money("plPortPln", "Port i agencja celna", "zł", "rozładunek, odprawa, dokumenty")}
                  {money("plTransportPln", "Transport z portu do Polski", "zł", "laweta do miasta klienta")}
                  {money("plRegistrationPln", "Tłumaczenia, przegląd, rejestracja", "zł")}
                  {money("plCompanyFeePln", "Usługi firmy", "zł")}
                  {money("plFirstServicePln", "Pierwszy serwis", "zł")}
                </>
              ) : (
                <>
                  {money("portUaUsd", t("Порт і експедирування"), "$", t("розвантаження в порту ЄС"))}
                  {money("customsBrokerUsd", t("Митний брокер"))}
                  {money("deliveryUaUsd", t("Доставка в Україну"), "$", t("автовоз з порту до міста"))}
                  {money("certificationUsd", t("Сертифікація та реєстрація"))}
                  {money("companyFeeUsd", t("Послуги компанії"))}
                  {money("firstServiceUsd", t("Перше ТО"))}
                </>
              )}
            </div>
            <p className="mt-6 text-sm font-semibold">{t("Канада, Європа, ОАЕ")}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {pl ? "Dotyczy lotów Copart Canada, Copart Finland i Emirates Auction; opłaty w Polsce są wspólne. Dla Finlandii druga kolumna to laweta do Polski. Kwoty startowe są orientacyjne — zastąp je stawkami swojego przewoźnika." : t("Діють для лотів Copart Canada, Copart Finland та Emirates Auction; брокер, сертифікація, послуги й ТО — спільні. Стартові суми грубі: Канада — за тарифом Meest 3 499 CAD «Торонто/Монреаль → Чорноморськ» (2025), ОАЕ — 1 800–2 500 $ за доставку (2026), для Європи свіжих даних немає. Замініть їх тарифами свого перевізника.")}
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="text-left text-xs font-bold text-muted">
                    <th className="pb-2 pr-3 font-bold">{t("Регіон")}</th>
                    <th className="pb-2 pr-3 font-bold">{t("До порту / майданчика")}</th>
                    <th className="pb-2 pr-3 font-bold">{t("Море / автовоз")}</th>
                    {!pl && <th className="pb-2 pr-3 font-bold">{t("Порт, експорт")}</th>}
                    {!pl && <th className="pb-2 font-bold">{t("Доставка в Україні")}</th>}
                  </tr>
                </thead>
                <tbody>
                  {REGION_ROWS.map((row) => (
                    <tr key={row.label}>
                      <td className="py-1.5 pr-3 font-bold">{row.label}</td>
                      {(pl ? row.keys.slice(0, 2) : row.keys).map((key) => (
                        <td key={key} className="py-1.5 pr-3 last:pr-0">
                          <NumberInput value={settings[key]} onChange={(v) => set(key, v)} suffix="$" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card
            id="repair"
            icon={<Wrench className="size-5" />}
            title={t("Ремонт")}
            hint={t("За цими цінами ШІ оцінює вартість відновлення.")}
          >
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              {pl ? money("plLaborPln", t("Нормо-година кузовних робіт"), "zł") : money("laborRateUsd", t("Нормо-година кузовних робіт"))}
              {pl ? money("plPaintPln", t("Фарбування одного елемента"), "zł") : money("paintPerPanelUsd", t("Фарбування одного елемента"))}
              {!pl && money("partsDeliveryPlUsd", t("Доставка запчастини з Польщі"), "$", t("додається до цін з Allegro"))}
              <Segmented
                className="col-span-2"
                label={t("Запчастини")}
                value={settings.partsPreference}
                onChange={(v) => set("partsPreference", v)}
                options={[
                  { value: "used", label: t("Б/у з розборок") },
                  { value: "aftermarket", label: t("Нові неоригінальні") },
                  { value: "oem", label: t("Нові оригінальні") },
                ]}
              />
            </div>
          </Card>

          {pl ? (
            <Card id="customs" icon={<Landmark className="size-5" />} title="Kursy, cło i podatki">
              <label className="mb-4 flex items-start gap-3 rounded-xl border border-line2 p-3.5">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4.5 accent-[var(--accent)]"
                  checked={settings.autoRates}
                  onChange={(e) => set("autoRates", e.target.checked)}
                />
                <span className="text-sm">
                  <span className="block font-bold">Kursy NBP automatycznie</span>
                  <span className="block text-xs text-muted">
                    {rates?.usdPln && rates.eurPln
                      ? `Na ${rates.plDate ?? ""}: 1 $ = ${fmtNum(rates.usdPln)} zł, 1 € = ${fmtNum(rates.eurPln)} zł (tabela A NBP).`
                      : "Kursy NBP są teraz niedostępne — obowiązują kursy ręczne poniżej."}
                  </span>
                </span>
              </label>
              <Segmented
                className="mb-4"
                label="Gdzie odprawiacie auto"
                value={settings.plClearance}
                onChange={(v) => set("plClearance", v)}
                options={[
                  { value: "pl", label: "Polska · VAT 23 %" },
                  { value: "de", label: "Niemcy · VAT 19 %" },
                  { value: "nl", label: "Holandia · VAT 21 %" },
                ]}
              />
              <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                {!settings.autoRates && money("usdPln", "Kurs dolara", "zł", "1 $ w złotych")}
                {!settings.autoRates && money("eurPln", "Kurs euro", "zł", "1 € w złotych")}
                {money("targetSavingsPct", t("Цільова вигода клієнта"), "%", t("від ринку, для максимальної ставки"))}
              </div>
              <p className="mt-4 rounded-xl bg-panel2 px-3.5 py-3 text-xs leading-relaxed text-muted">
                Cło 10 % wartości celnej (CIF do portu w UE); 0 % dla aut wyprodukowanych w USA z dowodem pochodzenia — zaznacza się to przy locie. Akcyza od wartości celnej z cłem: 3,1 % do 2000 cm³, 18,6 % powyżej; hybrydy 1,55 % / 9,3 % (do 3500 cm³); elektryczne 0 %. VAT przy odprawie w Polsce liczony od wartości celnej, cła i akcyzy; w Niemczech i Holandii od wartości celnej i cła, a akcyzę płaci się w Polsce. Auta z aukcji w UE: bez cła i VAT importowego, akcyza od ceny zakupu. Stawki z 2026 r. — sprawdzaj je przed licytacją.
              </p>
            </Card>
          ) : (
          <Card id="customs" icon={<Landmark className="size-5" />} title={t("Курси та розмитнення")}>
            <label className="mb-4 flex items-start gap-3 rounded-xl border border-line2 p-3.5">
              <input
                type="checkbox"
                className="mt-0.5 size-4.5 accent-[var(--accent)]"
                checked={settings.autoRates}
                onChange={(e) => set("autoRates", e.target.checked)}
              />
              <span className="text-sm">
                <span className="block font-bold">{t("Курси НБУ автоматично")}</span>
                <span className="block text-xs text-muted">
                  {rates
                    ? t("На {v0}: 1 $ = {v1} грн, 1 € = {v2} грн{v3}.", { v0: rates.date, v1: rates.usdUah.toFixed(2), v2: rates.eurUah.toFixed(2), v3: rates.plnUah ? `, 1 zł = ${rates.plnUah.toFixed(2)} грн` : "" })
                    : t("Курси НБУ зараз недоступні — діють ручні курси нижче.")}
                </span>
              </span>
            </label>
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              {!settings.autoRates && money("eurUsd", t("Курс євро"), "$", t("для акцизу"))}
              {!settings.autoRates && money("usdUah", t("Курс долара"), t("грн"), t("для пенсійного збору"))}
              {!settings.autoRates && money("plnUsd", t("Курс злотого"), "$", t("для цін запчастин з Allegro"))}
              {money("subsistenceMinUah", t("Прожитковий мінімум"), t("грн"), t("3328 грн з 01.01.2026"))}
              {money("targetSavingsPct", t("Цільова вигода клієнта"), "%", t("від ринку, для максимальної ставки"))}
            </div>
            <p className="mt-4 rounded-xl bg-panel2 px-3.5 py-3 text-xs leading-relaxed text-muted">
              {t("Ставки мита, акцизу та ПДВ закладені в розрахунок за правилами 2026 року. Якщо закон зміниться, їх треба оновити в коді.")}
            </p>
          </Card>
          )}

          <Button
            variant="danger"
            onClick={async () => {
              if (await confirmDialog({ title: t("Скинути налаштування?"), message: t("Бренд, тарифи, ціни ремонту й курси повернуться до стартових значень."), confirmLabel: t("Скинути"), tone: "danger" })) {
                void saveSettings(pl ? { ...DEFAULT_SETTINGS, ...PL_DEFAULTS } : DEFAULT_SETTINGS);
              }
            }}
          >
            <RotateCcw className="size-4" /> {t("Скинути до стартових")}
          </Button>
        </div>
      </div>
    </div>
  );
}
