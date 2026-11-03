"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthForm, AuthLink, goTo } from "@/components/auth/AuthForm";
import { Notice } from "@/components/ui";
import { NETWORK_MESSAGE, responseMessage } from "@/lib/shared/errors";

type State = { status: "checking" } | { status: "ok"; token: string; email: string } | { status: "bad"; message: string };

export default function ResetPasswordPage() {
  const [state, setState] = useState<State>({ status: "checking" });

  useEffect(() => {
    let alive = true;
    const token = new URLSearchParams(window.location.search).get("token") || "";
    const check = token
      ? fetch(`/api/auth/reset?token=${encodeURIComponent(token)}`).then(async (r) => {
          const data = (await r.json().catch(() => null)) as { email?: string; error?: string } | null;
          return r.ok && data?.email
            ? ({ status: "ok", token, email: data.email } as const)
            : ({ status: "bad", message: r.status >= 500 ? responseMessage("/api/auth/reset", r.status, data) : data?.error || "Посилання недійсне або прострочене." } as const);
        })
      : Promise.resolve({ status: "bad", message: "У посиланні немає коду скидання. Відкрийте посилання з листа повністю." } as const);
    void check
      .catch(() => ({ status: "bad", message: NETWORK_MESSAGE }) as const)
      .then((next) => {
        if (!alive) return;
        if (next.status === "ok") window.history.replaceState(null, "", window.location.pathname);
        setState(next);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (state.status === "checking") {
    return (
      <p className="mx-auto flex max-w-md items-center gap-2 pt-10 text-sm text-muted">
        <LoaderCircle className="size-4 animate-spin" /> Перевіряю посилання…
      </p>
    );
  }

  if (state.status === "bad") {
    return (
      <div className="mx-auto w-full max-w-md pt-4 sm:pt-10">
        <Notice tone="bad" title="Не вдалося відкрити посилання">
          {state.message}
        </Notice>
        <p className="mt-5 text-center text-sm">
          <AuthLink href="/forgot-password">Надіслати новий лист</AuthLink>
        </p>
      </div>
    );
  }

  return (
    <AuthForm
      title="Новий пароль"
      description={`Задайте новий пароль для ${state.email}. Після збереження вас буде виведено з усіх пристроїв.`}
      endpoint="/api/auth/reset"
      submitLabel="Зберегти пароль"
      extra={{ token: state.token }}
      fields={[
        { name: "password", label: "Новий пароль", type: "password", autoComplete: "new-password", hint: "Щонайменше 10 символів." },
        { name: "passwordConfirm", label: "Повторіть пароль", type: "password", autoComplete: "new-password" },
      ]}
      onDone={() => goTo("/login?reset=1")}
      footer={
        <>
          <AuthLink href="/login">Повернутися до входу</AuthLink>
        </>
      }
    />
  );
}
