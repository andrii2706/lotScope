import { t } from "@/lib/shared/i18n";
export function RunBadge({ status }: { status: string }) {
  if (!status) return null;
  const s = status.toLowerCase();
  const runs = /run/.test(s) && !/not|no /.test(s);
  const starts = !runs && /start/.test(s) && !/not|no /.test(s);
  const cls = runs ? "bg-good-bg text-good" : starts ? "bg-warn-bg text-warn" : "bg-bad-bg text-bad";
  const label = runs ? t("Заводиться і їде") : starts ? t("Заводиться") : /stationary|not|no /.test(s) ? t("Не заводиться") : status;
  return (
    <span title={status} className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
