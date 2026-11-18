"use client";

import { CircleCheck, Copy, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import type { InviteResult } from "@/types/team";

export function InviteResultBox({ result, note }: { result: InviteResult; note?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-line2 bg-paper p-3.5">
      {result.emailed ? (
        <p className="flex items-start gap-2 text-sm font-semibold text-good">
          <CircleCheck className="mt-0.5 size-4 shrink-0" />
          Запрошення надіслано на {result.email}. Посилання діє {result.days} днів.
        </p>
      ) : (
        <p className="flex items-start gap-2 text-sm font-semibold text-warn">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          Лист на {result.email} надіслати не вдалося. Скопіюйте посилання і передайте його людині самостійно.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate text-sm">{result.url}</code>
        <Button
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(result.url);
            setCopied(true);
          }}
        >
          <Copy className="size-4" /> {copied ? "Скопійовано" : "Копіювати"}
        </Button>
      </div>
      <p className="text-xs text-muted">
        Посилання одноразове. Увійти по ньому можна лише з пошти {result.email}: паролем або через Google.{note ? ` ${note}` : ""}
      </p>
    </div>
  );
}

export function PendingInvites({ invites, roleLabel, teamLabel, onCancel }: {
  invites: { role: string; email: string | null; team_id?: string | null; expires_at: string }[];
  roleLabel: (role: string) => string;
  teamLabel?: (id: string | null | undefined) => string;
  onCancel: () => void;
}) {
  if (!invites.length) return null;
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
        <span>Очікують прийняття: {invites.length}</span>
        <button type="button" onClick={onCancel} className="font-semibold text-bad hover:underline">
          Скасувати всі
        </button>
      </div>
      <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
        {invites.map((i, n) => (
          <li key={`${i.email}-${n}`} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3.5 py-2.5 text-sm">
            <span className="min-w-0 flex-1 truncate font-medium">{i.email || "без пошти (посилання)"}</span>
            <span className="text-muted">
              {roleLabel(i.role)}
              {teamLabel && i.team_id ? ` · ${teamLabel(i.team_id)}` : ""}
            </span>
            <span className="text-xs text-faint">до {new Date(i.expires_at).toLocaleDateString("uk-UA")}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-faint">Щоб надіслати лист ще раз, створіть запрошення на ту саму пошту: попереднє посилання перестане діяти.</p>
    </div>
  );
}
