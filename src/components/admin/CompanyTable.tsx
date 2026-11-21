import Link from "next/link";
import { stamp } from "@/lib/shared/labels";
import type { CompanyRow } from "@/types/admin";
import { t, localeOf } from "@/lib/shared/i18n";

export function CompanyTable({ companies, kind }: { companies: CompanyRow[]; kind: "teams" | "personal" }) {
  if (companies.length === 0) return <p className="text-sm text-muted">{t("Поки порожньо.")}</p>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
            <th className="px-4 py-3">{kind === "teams" ? t("Компанія") : t("Акаунт")}</th>
            <th className="px-4 py-3">{t("Аналізів / міс.")}</th>
            <th className="px-4 py-3">{t("Звітів")}</th>
            <th className="px-4 py-3">{t("Людей")}</th>
            <th className="px-4 py-3">{t("Остання дія")}</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c) => (
            <tr key={c.id} className="border-b border-line last:border-b-0">
              <td className="px-4 py-3">
                <Link href={`/admin/company/${c.id}`} className="block font-bold hover:underline">
                  {c.name}
                </Link>
                <span className="text-xs text-muted">{t("з")} {new Date(c.created_at).toLocaleDateString(localeOf())}</span>
                {c.suspended && <span className="ml-2 rounded-full bg-bad-bg px-2 py-0.5 text-xs font-bold text-bad">{t("призупинено")}</span>}
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
