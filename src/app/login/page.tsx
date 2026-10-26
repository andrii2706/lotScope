"use client";

import { AuthForm, AuthLink, goTo } from "@/components/AuthForm";
import { GoogleButton } from "@/components/GoogleButton";
import { Notice } from "@/components/ui";
import { useEffect, useState } from "react";
import { useMe } from "@/lib/me";

const GOOGLE_ERRORS: Record<string, string> = {
  google_off: "Вхід через Google не налаштований.",
  google_denied: "Вхід через Google скасовано або сесія застаріла. Спробуйте ще раз.",
  google_failed: "Не вдалося увійти через Google. Спробуйте ще раз.",
  google_unverified: "Пошта Google-акаунта не підтверджена.",
  google_disabled: "Ваш доступ вимкнено адміністратором компанії.",
  session: "Сесія завершилась (вона діє обмежений час). Увійдіть знову.",
  google_invite: "Запрошення недійсне або прострочене. Попросіть адміністратора надіслати нове.",
  google_full: "У компанії немає вільних робочих місць. Зверніться до адміністратора.",
};

function safeNext(): string {
  if (typeof window === "undefined") return "/";
  const next = new URLSearchParams(window.location.search).get("next") || "/";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default function LoginPage() {
  const me = useMe();
  const [code, setCode] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setCode(new URLSearchParams(window.location.search).get("error") || ""), 0);
    return () => clearTimeout(timer);
  }, []);
  const googleError = GOOGLE_ERRORS[code];
  return (
    <>
      {googleError && (
        <div className="mx-auto max-w-md">
          <Notice tone="bad" title="Вхід не виконано">
            {googleError}
          </Notice>
        </div>
      )}
      {me.status === "ready" && me.dbError && (
        <div className="mx-auto max-w-md">
          <Notice tone="bad" title="База даних недоступна">
            {me.dbError}
          </Notice>
        </div>
      )}
      {me.status === "ready" && !me.dbConfigured && (
        <div className="mx-auto max-w-md">
          <Notice tone="warn" title="База даних не налаштована">
            Додайте DATABASE_URL у .env.local і виконайте npm run db:migrate. Інструкція в README.
          </Notice>
        </div>
      )}
      <AuthForm
        title="Вхід"
        description="Увійдіть у кабінет вашої компанії."
        endpoint="/api/auth/login"
        submitLabel="Увійти"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Пароль", type: "password", autoComplete: "current-password" },
        ]}
        social={<GoogleButton next={safeNext()} label="Увійти через Google" />}
        onDone={() => goTo(safeNext())}
        footer={
          <>
            Ще немає акаунта? <AuthLink href="/register">Зареєструватися для ознайомлення</AuthLink>
          </>
        }
      />
    </>
  );
}
