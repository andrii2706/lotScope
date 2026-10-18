"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthForm, AuthLink, goTo } from "@/components/AuthForm";
import { GoogleButton } from "@/components/GoogleButton";
import { Notice } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/me";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const [invite, setInvite] = useState<{ companyName: string; role: "admin" | "manager" | "expert" } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/auth/accept?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setInvite(d);
      })
      .catch((e: Error) => setError(e.message || "Запрошення недійсне."));
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
        { name: "email", label: "Email", type: "email", autoComplete: "email" },
        { name: "password", label: "Пароль", type: "password", autoComplete: "new-password", hint: "Щонайменше 10 символів." },
      ]}
      onDone={() => goTo("/")}
    />
  );
}
