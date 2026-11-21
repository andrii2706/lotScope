"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthForm, AuthLink, goTo } from "@/components/auth/AuthForm";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Notice } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/client/me";
import { userMessage } from "@/lib/shared/errors";
import type { Role } from "@/types/auth";
import { langOf, t } from "@/lib/shared/i18n";
import { rememberLang } from "@/lib/client/lang";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const [invite, setInvite] = useState<{ companyName: string; role: Role; email: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/auth/accept?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (d.market) rememberLang(langOf(d.market));
        setInvite(d);
      })
      .catch((e: unknown) => setError(userMessage(e, t("Запрошення недійсне."))));
  }, [token]);

  if (error) {
    return (
      <div className="mx-auto max-w-md pt-10">
        <Notice tone="bad" title={t("Не вдалося відкрити запрошення")}>
          {error} {t("Попросіть адміністратора надіслати нове.")} <AuthLink href="/login">{t("Увійти")}</AuthLink>
        </Notice>
      </div>
    );
  }
  if (!invite) return <p className="pt-10 text-center text-sm text-muted">{t("Перевіряю запрошення…")}</p>;

  return (
    <AuthForm
      title={t("Приєднатися до «{v0}»", { v0: invite.companyName })}
      description={<>{t("Вас запрошено як")} {ROLE_LABEL[invite.role].toLowerCase()}{t(". Створіть свій акаунт.")}</>}
      endpoint="/api/auth/accept"
      extra={{ token }}
      submitLabel={t("Приєднатися")}
      social={<GoogleButton invite={token} label={t("Приєднатися через Google")} />}
      fields={[
        { name: "name", label: t("Ваше ім'я"), autoComplete: "name" },
        invite.email
          ? { name: "email", label: "Email", type: "email", autoComplete: "email", defaultValue: invite.email, readOnly: true, hint: t("Запрошення надіслано на цю пошту. Через Google входьте з цією ж поштою.") }
          : { name: "email", label: "Email", type: "email", autoComplete: "email" },
        { name: "password", label: t("Пароль"), type: "password", autoComplete: "new-password", hint: t("Щонайменше 10 символів.") },
      ]}
      onDone={() => goTo("/")}
    />
  );
}
