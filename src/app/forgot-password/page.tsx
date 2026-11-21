"use client";

import { MailCheck } from "lucide-react";
import { useState } from "react";
import { AuthForm, AuthLink } from "@/components/auth/AuthForm";
import { t } from "@/lib/shared/i18n";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="mx-auto w-full max-w-md pt-4 sm:pt-10">
        <div className="card p-6 text-center">
          <span className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-good-bg text-good">
            <MailCheck className="size-6" />
          </span>
          <h1 className="text-xl font-semibold">{t("Перевірте пошту")}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {t("Якщо акаунт з такою поштою існує, ми надіслали на неї лист із посиланням для скидання пароля. Посилання діє 60 хвилин. Не бачите листа — перевірте «Спам» або спробуйте ще раз за кілька хвилин.")}
          </p>
          <p className="mt-5 text-sm">
            <AuthLink href="/login">{t("Повернутися до входу")}</AuthLink>
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthForm
      title={t("Скидання пароля")}
      description={t("Вкажіть пошту, з якою ви входите. Ми надішлемо посилання, щоб задати новий пароль.")}
      endpoint="/api/auth/forgot"
      submitLabel={t("Надіслати посилання")}
      fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]}
      onDone={() => setSent(true)}
      footer={
        <>
          {t("Згадали пароль?")} <AuthLink href="/login">{t("Увійти")}</AuthLink>
        </>
      }
    />
  );
}
