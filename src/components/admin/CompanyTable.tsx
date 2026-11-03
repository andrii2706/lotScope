import Link from "next/link";
import { stamp } from "@/lib/shared/labels";
import type { CompanyRow } from "@/types/admin";

export function CompanyTable({ companies, kind }: { companies: CompanyRow[]; kind: "teams" | "personal" }) {
  if (companies.length === 0) return <p className="text-sm text-muted">Поки порожньо.</p>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
            <th className="px-4 py-3">{kind === "teams" ? "Компанія" : "Акаунт"}</th>
            <th className="px-4 py-3">Аналізів / міс.</th>
            <th className="px-4 py-3">Звітів</th>
            <th className="px-4 py-3">Людей</th>
            <th className="px-4 py-3">Остання дія</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c) => (
            <tr key={c.id} className="border-b border-line last:border-b-0">
              <td className="px-4 py-3">
                <Link href={`/admin/company/${c.id}`} className="block font-bold hover:underline">
                  {c.name}
                </Link>
                <span className="text-xs text-muted">з {new Date(c.created_at).toLocaleDateString("uk-UA")}</span>
                {c.suspended && <span className="ml-2 rounded-full bg-bad-bg px-2 py-0.5 text-xs font-bold text-bad">призупинено</span>}
              </td>
              <td className="px-4 py-3 tabular-nums">{c.analyses}</td>
              <td className="px-4 py-3 tabular-nums">{c.reports}</td>
              <td className="px-4 py-3 tabular-nums">
                {c.active_users}/{c.users}
              </td>
              <td className="px-4 py-3 text-xs text-muted">{stamp(c.last_seen)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
