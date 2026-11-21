"use client";

import { AuthForm, AuthLink, goTo } from "@/components/auth/AuthForm";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Notice } from "@/components/ui";
import { useEffect, useState } from "react";
import { useMe } from "@/lib/client/me";
import { GOOGLE_ERRORS } from "@/config/auth";
import { safeNext } from "@/lib/client/navigation";
import { t } from "@/lib/shared/i18n";

export default function LoginPage() {
  const me = useMe();
  const [code, setCode] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setCode(new URLSearchParams(window.location.search).get("error") || ""), 0);
    return () => clearTimeout(timer);
  }, []);
  const googleError = GOOGLE_ERRORS[code];
  const [reset, setReset] = useState(false);
  const [contact, setContact] = useState("");
  useEffect(() => {
    let alive = true;
    void fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((d: { salesContact?: string }) => alive && setContact(d.salesContact || ""))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => setReset(new URLSearchParams(window.location.search).get("reset") === "1"), 0);
    return () => clearTimeout(timer);
  }, []);
  return (
    <>
      {reset && (
        <div className="mx-auto max-w-md">
          <Notice tone="good" title={t("Пароль змінено")}>
            {t("Увійдіть з новим паролем.")}
          </Notice>
        </div>
      )}
      {googleError && (
        <div className="mx-auto max-w-md">
          <Notice tone="bad" title={t("Вхід не виконано")}>
            {googleError}
          </Notice>
        </div>
      )}
      {me.status === "ready" && me.dbError && (
        <div className="mx-auto max-w-md">
          <Notice tone="bad" title={t("Вхід тимчасово недоступний")}>
            {me.dbError}
          </Notice>
        </div>
      )}
      <AuthForm
        title={t("Вхід")}
        description={t("Увійдіть у кабінет вашої компанії.")}
        endpoint="/api/auth/login"
        submitLabel={t("Увійти")}
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: t("Пароль"), type: "password", autoComplete: "current-password" },
        ]}
        social={<GoogleButton next={safeNext()} label={t("Увійти через Google")} />}
        onDone={() => goTo(safeNext())}
        footer={
          <>
            <AuthLink href="/forgot-password">{t("Забули пароль?")}</AuthLink>
            <span className="mt-2 block">
              {t("Доступ до LotScope видається компаніям за запрошенням.")}
              {contact ? <> {t("Щоб підключити компанію, напишіть:")} <span className="font-bold text-ink">{contact}</span></> : t(" Попросіть адміністратора вашої компанії надіслати запрошення.")}
            </span>
          </>
        }
      />
    </>
  );
}
