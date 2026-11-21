"use client";

import { useEffect, useState } from "react";
import { Notice, PageHeader, Segmented } from "@/components/ui";
import { api } from "@/lib/client/api";
import { userMessage } from "@/lib/shared/errors";
import type { AdminOverview } from "@/types/admin";
import { CreateCompany } from "@/components/admin/CreateCompany";
import { CompanyTable } from "@/components/admin/CompanyTable";
import { AdminLog } from "@/components/admin/AdminLog";
import { t } from "@/lib/shared/i18n";

type Tab = "teams" | "personal" | "log";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("teams");
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);
  const kind = tab === "personal" ? "personal" : "team";

  useEffect(() => {
    let alive = true;
    api<AdminOverview>(`/api/admin?kind=${kind}`)
      .then((d) => alive && setData(d))
      .catch((e: unknown) => alive && setError(userMessage(e)));
    return () => {
      alive = false;
    };
  }, [version, kind]);

  async function post(body: Record<string, unknown>) {
    setError("");
    try {
      const r = await api<Record<string, unknown>>("/api/admin", { body });
      reload();
      return r;
    } catch (e) {
      setError(userMessage(e, t("Не вдалося.")));
      return null;
    }
  }

  if (error && !data) {
    return (
      <Notice tone="bad" title={t("Немає доступу")}>
        {error}
      </Notice>
    );
  }
  if (!data) return <p className="text-sm text-muted">{t("Завантажую…")}</p>;
  const item = data.totals;

  return (
    <div>
      <PageHeader title={t("Консоль супер адміна")} description={t("Створюйте й видаляйте компанії та профілі. Журнал показує всі дії в сервісі.")} />
      {error && (
        <div className="mb-5">
          <Notice tone="bad" title={t("Помилка")}>
            {error}
          </Notice>
        </div>
      )}

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [t("Компаній"), item.teams],
          [t("Користувачів"), item.users],
          [t("Аналізів за місяць"), item.analyses],
          [t("Особистих акаунтів"), item.personal],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-[13px] font-medium text-muted">{label}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <Segmented
        className="mb-5 max-w-2xl"
        label={t("Розділ")}
        value={tab}
        onChange={setTab}
        options={[
          { value: "teams", label: t("Компанії") },
          { value: "personal", label: t("Особисті") },
          { value: "log", label: t("Журнал") },
        ]}
      />

      {tab === "teams" && <CreateCompany onCreate={post} />}
      {(tab === "teams" || tab === "personal") && <CompanyTable companies={data.companies} kind={tab} />}
      {tab === "log" && <AdminLog />}
    </div>
  );
}

