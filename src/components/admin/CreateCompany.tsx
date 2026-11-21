"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button, Segmented } from "@/components/ui";
import { InviteResultBox } from "@/components/team/InviteResultBox";
import type { InviteResult } from "@/types/team";
import { t } from "@/lib/shared/i18n";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CreateCompany({ onCreate }: { onCreate: (b: Record<string, unknown>) => Promise<Record<string, unknown> | null> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [market, setMarket] = useState<"ua" | "pl">("ua");
  const [result, setResult] = useState<InviteResult | null>(null);
  const [problem, setProblem] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setProblem(t("Вкажіть назву компанії."));
    if (!EMAIL_RE.test(email.trim())) return setProblem(t("Вкажіть пошту адміністратора компанії."));
    setProblem("");
    const r = await onCreate({ action: "createCompany", name, email: email.trim(), market });
    if (r && typeof r.url === "string") {
      setName("");
      setEmail("");
      setResult(r as unknown as InviteResult);
    }
  }

  return (
    <section className="card mb-5 p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{t("Нова компанія")}</h2>
      <form onSubmit={submit} noValidate className="mt-3 flex flex-wrap items-end gap-3">
        <label className="min-w-56 flex-1">
          <span className="mb-1.5 block text-[13px] font-medium text-ink">{t("Назва")}</span>
          <input className="control" required aria-invalid={problem.includes(t("назву"))} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="min-w-56 flex-1">
          <span className="mb-1.5 block text-[13px] font-medium text-ink">{t("Пошта адміністратора")}</span>
          <input className="control" type="email" autoComplete="off" required aria-invalid={problem.includes(t("пошту"))} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <Segmented
          className="min-w-56"
          label={t("Ринок і мова")}
          value={market}
          onChange={setMarket}
          options={[
            { value: "ua", label: t("Україна") },
            { value: "pl", label: t("Польща") },
          ]}
        />
        <Button type="submit">
          <Plus className="size-4" /> {t("Створити і надіслати запрошення")}
        </Button>
      </form>
      {problem && <p role="alert" className="mt-2 text-sm font-bold text-bad">{problem}</p>}
      {result && <InviteResultBox result={result} note={t("Адміністратор сам створить команди й запросить керівників і менеджерів.")} />}
    </section>
  );
}
