"use client";

import { confirmDialog, Button, Card, Field, NumberInput, PageHeader, Segmented } from "@/components/ui";
import { CircleCheck, Landmark, Palette, RotateCcw, Truck, Upload, Wrench } from "lucide-react";
import { useRef, useState, type CSSProperties } from "react";
import { ACCENTS, REGION_ROWS, SETTINGS_SECTIONS } from "@/config/settings";
import { accentInk, accentText } from "@/lib/shared/color";
import { DEFAULT_SETTINGS } from "@/lib/shared/defaults";
import { fileToLogo } from "@/lib/client/images";
import { useRates } from "@/lib/client/rates";
import { saveSettings, useHydrated, useSettings } from "@/lib/client/store";
import { useResolvedTheme } from "@/lib/client/theme";
import type { NumericSettingKey, Settings } from "@/types/report";

export default function SettingsPage() {
  const hydrated = useHydrated();
  const settings = useSettings();
  const theme = useResolvedTheme(settings.theme);
  const logoInput = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState("");
  const rates = useRates();

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    saveSettings({ ...settings, [key]: value });

  const money = (key: NumericSettingKey, label: string, suffix = "$", hint?: string) => (
    <Field label={label} hint={hint}>
      <NumberInput value={settings[key]} onChange={(v) => set(key, v)} suffix={suffix} step={0.01} />
    </Field>
  );

  if (!hydrated) return <p className="text-sm text-muted">Завантажую…</p>;

  return (
    <div>
      <PageHeader
        title="Налаштування компанії"
        description="Ваш бренд і тарифи. Застосовуються до всіх звітів, зокрема вже створених."
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-good-bg px-3 py-1.5 text-xs font-bold text-good">
            <CircleCheck className="size-4" /> Зміни зберігаються автоматично
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="Розділи налаштувань" className="hidden lg:block">
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
          <Card
            id="brand"
            icon={<Palette className="size-5" />}
            title="Бренд у звіті"
            hint="Так клієнт побачить вашу компанію в шапці звіту."
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
              aria-label="Попередній вигляд шапки звіту"
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
                    {settings.companyName || "Назва вашої компанії"}
                  </p>
                  <p className="text-sm text-muted">{settings.companyContact || "телефон, сайт"}</p>
                </div>
              </div>
              <span className="hidden rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-ink sm:block">
                Колір кнопок
              </span>
            </div>

            <Segmented
              className="mb-5"
              label="Тема інтерфейсу"
              value={settings.theme}
              onChange={(v) => set("theme", v)}
              options={[
                { value: "dark", label: "Темна" },
                { value: "light", label: "Світла" },
                { value: "system", label: "Як у системі" },
              ]}
            />
            <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2">
              <Field label="Назва компанії">
                <input
                  className="control"
                  value={settings.companyName}
                  onChange={(e) => set("companyName", e.target.value)}
                />
              </Field>
              <Field label="Контакти">
                <input
                  className="control"
                  placeholder="телефон, сайт"
                  value={settings.companyContact}
                  onChange={(e) => set("companyContact", e.target.value)}
                />
              </Field>
              <div>
                <span className="mb-1.5 block text-[13px] font-medium text-ink">Логотип</span>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => logoInput.current?.click()}>
                    <Upload className="size-4" /> {settings.logoDataUrl ? "Замінити" : "Завантажити"}
                  </Button>
                  {settings.logoDataUrl && (
                    <Button variant="ghost" onClick={() => set("logoDataUrl", "")}>
                      Прибрати
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
                      setLogoError("Не вдалося завантажити логотип. Спробуйте PNG або JPG.");
                    }
                  }}
                />
                {logoError && <p className="mt-1.5 text-xs font-semibold text-bad">{logoError}</p>}
              </div>
              <div>
                <span className="mb-1.5 block text-[13px] font-medium text-ink">Колір бренду</span>
                <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Колір бренду">
                  {ACCENTS.map((color) => {
                    const active = settings.accentColor.toLowerCase() === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={`Колір ${color}`}
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
                    title="Свій колір"
                  >
                    +
                    <input
                      type="color"
                      aria-label="Свій колір"
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
            title="Логістика та послуги"
            hint="Стартові суми — орієнтовні ринкові ціни 2026 року для легкового авто через Клайпеду. Замініть їх тарифами вашого логіста; у кожному звіті їх можна виправити окремо."
          >
            <Segmented
              className="mb-4"
              label="Збір аукціону"
              value={settings.auctionFeeMode}
              onChange={(v) => set("auctionFeeMode", v)}
              options={[
                { value: "table", label: "За сіткою Copart / IAAI" },
                { value: "manual", label: "Свій відсоток" },
              ]}
            />
            {settings.auctionFeeMode === "table" && (
              <p className="mb-4 rounded-xl bg-panel2 px-3.5 py-3 text-xs leading-relaxed text-muted">
                Рахується за ставкою з опублікованої сітки зборів: buyer fee, збір за онлайн-ставку, gate/service,
                екологічний і титульний збори. Сітки аукціони змінюють, а брокер може додати свою комісію — вкажіть її
                в «Послугах компанії».
              </p>
            )}
            <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
              {settings.auctionFeeMode === "manual" && money("auctionFeePct", "Збір аукціону, частка", "%", "від ставки")}
              {settings.auctionFeeMode === "manual" && money("auctionFeeFixedUsd", "Збір аукціону, фікс.", "$", "додається до частки")}
              {money("inlandUsUsd", "Доставка до порту в США")}
              {money("oceanUsd", "Морська доставка")}
              {money("portUaUsd", "Порт і експедирування", "$", "розвантаження в порту ЄС")}
              {money("customsBrokerUsd", "Митний брокер")}
              {money("deliveryUaUsd", "Доставка в Україну", "$", "автовоз з порту до міста")}
              {money("certificationUsd", "Сертифікація та реєстрація")}
              {money("companyFeeUsd", "Послуги компанії")}
              {money("firstServiceUsd", "Перше ТО")}
            </div>
            <p className="mt-6 text-sm font-semibold">Канада, Європа, ОАЕ</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Діють для лотів Copart Canada, Copart Finland та Emirates Auction; брокер, сертифікація, послуги й ТО — спільні.
              Стартові суми грубі: Канада — за тарифом Meest 3 499 CAD «Торонто/Монреаль → Чорноморськ» (2025), ОАЕ — 1 800–2 500 $
              за доставку (2026), для Європи свіжих даних немає. Замініть їх тарифами свого перевізника.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="text-left text-xs font-bold text-muted">
                    <th className="pb-2 pr-3 font-bold">Регіон</th>
                    <th className="pb-2 pr-3 font-bold">До порту / майданчика</th>
                    <th className="pb-2 pr-3 font-bold">Море / автовоз</th>
                    <th className="pb-2 pr-3 font-bold">Порт, експорт</th>
                    <th className="pb-2 font-bold">Доставка в Україні</th>
                  </tr>
                </thead>
                <tbody>
                  {REGION_ROWS.map((row) => (
                    <tr key={row.label}>
                      <td className="py-1.5 pr-3 font-bold">{row.label}</td>
                      {row.keys.map((key) => (
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
            title="Ремонт"
            hint="За цими цінами ШІ оцінює вартість відновлення."
          >
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              {money("laborRateUsd", "Нормо-година кузовних робіт")}
              {money("paintPerPanelUsd", "Фарбування одного елемента")}
              {money("partsDeliveryPlUsd", "Доставка запчастини з Польщі", "$", "додається до цін з Allegro")}
              <Segmented
                className="col-span-2"
                label="Запчастини"
                value={settings.partsPreference}
                onChange={(v) => set("partsPreference", v)}
                options={[
                  { value: "used", label: "Б/у з розборок" },
                  { value: "aftermarket", label: "Нові неоригінальні" },
                  { value: "oem", label: "Нові оригінальні" },
                ]}
              />
            </div>
          </Card>

          <Card id="customs" icon={<Landmark className="size-5" />} title="Курси та розмитнення">
            <label className="mb-4 flex items-start gap-3 rounded-xl border border-line2 p-3.5">
              <input
                type="checkbox"
                className="mt-0.5 size-4.5 accent-[var(--accent)]"
                checked={settings.autoRates}
                onChange={(e) => set("autoRates", e.target.checked)}
              />
              <span className="text-sm">
                <span className="block font-bold">Курси НБУ автоматично</span>
                <span className="block text-xs text-muted">
                  {rates
                    ? `На ${rates.date}: 1 $ = ${rates.usdUah.toFixed(2)} грн, 1 € = ${rates.eurUah.toFixed(2)} грн${rates.plnUah ? `, 1 zł = ${rates.plnUah.toFixed(2)} грн` : ""}.`
                    : "Курси НБУ зараз недоступні — діють ручні курси нижче."}
                </span>
              </span>
            </label>
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              {!settings.autoRates && money("eurUsd", "Курс євро", "$", "для акцизу")}
              {!settings.autoRates && money("usdUah", "Курс долара", "грн", "для пенсійного збору")}
              {!settings.autoRates && money("plnUsd", "Курс злотого", "$", "для цін запчастин з Allegro")}
              {money("subsistenceMinUah", "Прожитковий мінімум", "грн", "3328 грн з 01.01.2026")}
              {money("targetSavingsPct", "Цільова вигода клієнта", "%", "від ринку, для максимальної ставки")}
            </div>
            <p className="mt-4 rounded-xl bg-panel2 px-3.5 py-3 text-xs leading-relaxed text-muted">
              Ставки мита, акцизу та ПДВ закладені в розрахунок за правилами 2026 року. Якщо закон
              зміниться, їх треба оновити в коді.
            </p>
          </Card>

          <Button
            variant="danger"
            onClick={async () => {
              if (await confirmDialog({ title: "Скинути налаштування?", message: "Бренд, тарифи, ціни ремонту й курси повернуться до стартових значень.", confirmLabel: "Скинути", tone: "danger" })) {
                saveSettings(DEFAULT_SETTINGS);
              }
            }}
          >
            <RotateCcw className="size-4" /> Скинути до стартових
          </Button>
        </div>
      </div>
    </div>
  );
}
