"use client";

import { useCallback, useEffect, useState } from "react";
import { AuditList } from "@/components/admin/AuditList";
import type { AuditEntry } from "@/types/admin";
import { Button, Select } from "@/components/ui";
import { api } from "@/lib/client/api";
import { ACTION_LABEL } from "@/lib/shared/auditLabels";
import { userMessage } from "@/lib/shared/errors";

export function AdminLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [action, setAction] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(
    (offset: number, replace: boolean) => {
      api<{ entries: AuditEntry[]; next: number | null }>(`/api/admin/log?offset=${offset}${action ? `&action=${action}` : ""}`)
        .then((d) => {
          setEntries((cur) => (replace ? d.entries : [...cur, ...d.entries]));
          setNext(d.next);
        })
        .catch((e: unknown) => setError(userMessage(e)));
    },
    [action],
  );

  useEffect(() => load(0, true), [load]);

  return (
    <div>
      {error && <p className="mb-3 text-sm text-bad">{error}</p>}
      <label className="mb-4 block max-w-xs">
        <span className="mb-1.5 block text-[13px] font-medium text-ink">Тип події</span>
        <Select value={action} onChange={setAction} options={[{ value: "", label: "Усі" }, ...Object.entries(ACTION_LABEL).map(([id, label]) => ({ value: id, label }))]} />
      </label>
      <div className="card overflow-hidden">
        <AuditList entries={entries} showCompany />
      </div>
      {next !== null && (
        <Button variant="secondary" className="mt-4" onClick={() => load(next, false)}>
          Показати ще
        </Button>
      )}
    </div>
  );
}
