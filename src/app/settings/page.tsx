"use client";

import { CircleCheck, Landmark, Palette, RotateCcw, Truck, Upload, Wrench } from "lucide-react";
import { useRef, useState, type CSSProperties } from "react";
import { Button, Card, Field, NumberInput, PageHeader, Segmented } from "@/components/ui";
import { accentInk, accentText } from "@/lib/color";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { fileToLogo } from "@/lib/images";
import { saveSettings, useHydrated, useSettings } from "@/lib/store";
import { useResolvedTheme } from "@/lib/theme";
import type { Settings } from "@/lib/types";

type NumericKey = {
  [K in keyof Settings]: Settings[K] extends number ? K : never;
}[keyof Settings];

const SECTIONS = [
  { id: "brand", label: "Бренд у звіті", icon: Palette },
  { id: "logistics", label: "Логістика та послуги", icon: Truck },
  { id: "repair", label: "Ремонт", icon: Wrench },
  { id: "customs", label: "Курси та розмитнення", icon: Landmark },
];

const ACCENTS = ["#c8f542", "#ffd60a", "#ff8a1f", "#ff5a4d", "#ff5fa2", "#8f7bff", "#38bdf8", "#34d399"];

export default function SettingsPage() {
  const hydrated = useHydrated();
  const settings = useSettings();
  const theme = useResolvedTheme(settings.theme);
  const logoInput = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState("");

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    saveSettings({ ...settings, [key]: value });

  const money = (key: NumericKey, label: string, suffix = "$", hint?: string) => (
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
          <ul className="sticky top-24 space-y-1">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
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
              className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-line2 bg-paper p-4"
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
                  <span className="grid size-11 place-items-center rounded-xl bg-accent text-lg font-extrabold text-accent-ink">
                    {(settings.companyName.trim().charAt(0) || "L").toUpperCase()}
                  </span>
                )}
                <div>
                  <p className="text-base font-extrabold leading-tight">
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
                <span className="mb-1.5 block text-[13px] font-bold text-ink/80">Логотип</span>
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
                <span className="mb-1.5 block text-[13px] font-bold text-ink/80">Колір бренду</span>
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
                    className="relative grid size-7 cursor-pointer place-items-center rounded-full border border-dashed border-line2 text-xs font-extrabold text-muted hover:border-ink/60"
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
            hint="Стартові суми — приклади. Замініть їх своїми; у кожному звіті їх можна виправити окремо."
          >
            <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
              {money("auctionFeePct", "Збір аукціону, частка", "%", "від ставки")}
              {money("auctionFeeFixedUsd", "Збір аукціону, фікс.", "$", "додається до частки")}
              {money("inlandUsUsd", "Доставка до порту в США")}
              {money("oceanUsd", "Морська доставка")}
              {money("portUaUsd", "Порт і експедирування")}
              {money("customsBrokerUsd", "Митний брокер")}
              {money("deliveryUaUsd", "Доставка по Україні")}
              {money("certificationUsd", "Сертифікація та реєстрація")}
              {money("companyFeeUsd", "Послуги компанії")}
              {money("firstServiceUsd", "Перше ТО")}
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
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              {money("eurUsd", "Курс євро", "$", "для акцизу")}
              {money("usdUah", "Курс долара", "грн", "для пенсійного збору")}
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
            onClick={() => {
              if (window.confirm("Повернути всі налаштування до стартових? Бренд і тарифи буде скинуто.")) {
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
