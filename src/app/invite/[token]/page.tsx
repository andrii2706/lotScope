"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthForm, AuthLink, goTo } from "@/components/auth/AuthForm";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Notice } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/client/me";
import { userMessage } from "@/lib/shared/errors";
import type { Role } from "@/types/auth";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const [invite, setInvite] = useState<{ companyName: string; role: Role; email: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/auth/accept?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setInvite(d);
      })
      .catch((e: unknown) => setError(userMessage(e, "Запрошення недійсне.")));
  }, [token]);

  if (error) {
    return (
      <div className="mx-auto max-w-md pt-10">
        <Notice tone="bad" title="Не вдалося відкрити запрошення">
          {error} Попросіть адміністратора надіслати нове. <AuthLink href="/login">Увійти</AuthLink>
        </Notice>
      </div>
    );
  }
  if (!invite) return <p className="pt-10 text-center text-sm text-muted">Перевіряю запрошення…</p>;

  return (
    <AuthForm
      title={`Приєднатися до «${invite.companyName}»`}
      description={<>Вас запрошено як {ROLE_LABEL[invite.role].toLowerCase()}. Створіть свій акаунт.</>}
      endpoint="/api/auth/accept"
      extra={{ token }}
      submitLabel="Приєднатися"
      social={<GoogleButton invite={token} label="Приєднатися через Google" />}
      fields={[
        { name: "name", label: "Ваше ім'я", autoComplete: "name" },
        invite.email
          ? { name: "email", label: "Email", type: "email", autoComplete: "email", defaultValue: invite.email, readOnly: true, hint: "Запрошення надіслано на цю пошту. Через Google входьте з цією ж поштою." }
          : { name: "email", label: "Email", type: "email", autoComplete: "email" },
        { name: "password", label: "Пароль", type: "password", autoComplete: "new-password", hint: "Щонайменше 10 символів." },
      ]}
      onDone={() => goTo("/")}
    />
  );
}
