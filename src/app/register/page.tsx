"use client";

import { useEffect, useState } from "react";
import { AuthForm, AuthLink, goTo } from "@/components/AuthForm";
import { GoogleButton } from "@/components/GoogleButton";
import { TRIAL_CREDITS } from "@/lib/plans";

export default function RegisterPage() {
  const [contact, setContact] = useState("");
  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((d: { salesContact?: string }) => setContact(d.salesContact || ""))
      .catch(() => undefined);
  }, []);
  return (
    <AuthForm
      title="Реєстрація для ознайомлення"
      description={<>Особистий акаунт, щоб подивитися пошук і оцінити ризики лотів: {TRIAL_CREDITS} аналізи безкоштовно, без збереження звітів і PDF. Для роботи команди доступ видає адміністратор сервісу за запрошенням.</>}
      endpoint="/api/auth/register"
      submitLabel="Створити акаунт"
      fields={[
        { name: "name", label: "Ваше ім'я", autoComplete: "name" },
        { name: "email", label: "Email", type: "email", autoComplete: "email" },
        { name: "password", label: "Пароль", type: "password", autoComplete: "new-password", hint: "Щонайменше 10 символів." },
      ]}
      social={<GoogleButton label="Зареєструватися через Google" />}
      onDone={() => goTo("/")}
      footer={
        <>
          Уже є акаунт? <AuthLink href="/login">Увійти</AuthLink>
          {contact && <p className="mt-2">Потрібен доступ для команди компанії? Напишіть: {contact}</p>}
        </>
      }
    />
  );
}
