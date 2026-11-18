"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { InviteResultBox } from "@/components/team/InviteResultBox";
import type { InviteResult } from "@/types/team";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CreateCompany({ onCreate }: { onCreate: (b: Record<string, unknown>) => Promise<Record<string, unknown> | null> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<InviteResult | null>(null);
  const [problem, setProblem] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setProblem("Вкажіть назву компанії.");
    if (!EMAIL_RE.test(email.trim())) return setProblem("Вкажіть пошту адміністратора компанії.");
    setProblem("");
    const r = await onCreate({ action: "createCompany", name, email: email.trim() });
    if (r && typeof r.url === "string") {
      setName("");
      setEmail("");
      setResult(r as unknown as InviteResult);
    }
  }

  return (
    <section className="card mb-5 p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Нова компанія</h2>
      <form onSubmit={submit} noValidate className="mt-3 flex flex-wrap items-end gap-3">
        <label className="min-w-56 flex-1">
          <span className="mb-1.5 block text-[13px] font-medium text-ink">Назва</span>
          <input className="control" required aria-invalid={problem.includes("назву")} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="min-w-56 flex-1">
          <span className="mb-1.5 block text-[13px] font-medium text-ink">Пошта адміністратора</span>
          <input className="control" type="email" autoComplete="off" required aria-invalid={problem.includes("пошту")} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <Button type="submit">
          <Plus className="size-4" /> Створити і надіслати запрошення
        </Button>
      </form>
      {problem && <p role="alert" className="mt-2 text-sm font-bold text-bad">{problem}</p>}
      {result && <InviteResultBox result={result} note="Адміністратор сам створить команди й запросить керівників і менеджерів." />}
    </section>
  );
}
