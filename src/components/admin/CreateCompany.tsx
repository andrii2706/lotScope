"use client";

import { Copy, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";

export function CreateCompany({ onCreate }: { onCreate: (b: Record<string, unknown>) => Promise<Record<string, unknown> | null> }) {
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [problem, setProblem] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setProblem("Вкажіть назву компанії.");
    setProblem("");
    const r = await onCreate({ action: "createCompany", name });
    if (r) {
      setName("");
      setCopied(false);
      setLink(typeof r.inviteUrl === "string" ? r.inviteUrl : "");
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
        <Button type="submit">
          <Plus className="size-4" /> Створити
        </Button>
      </form>
      {problem && <p role="alert" className="mt-2 text-sm font-bold text-bad">{problem}</p>}
      {link && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-line2 bg-paper p-3">
          <code className="min-w-0 flex-1 truncate text-sm">{link}</code>
          <Button
            variant="secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopied(true);
            }}
          >
            <Copy className="size-4" /> {copied ? "Скопійовано" : "Копіювати"}
          </Button>
          <p className="w-full text-xs text-muted">Посилання для адміністратора компанії: одноразове, діє 7 днів. Адміністратор сам створить команди й запросить керівників і менеджерів.</p>
        </div>
      )}
    </section>
  );
}
