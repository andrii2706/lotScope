export function RunBadge({ status }: { status: string }) {
  if (!status) return null;
  const s = status.toLowerCase();
  const cls = s.includes("run") ? "bg-good-bg text-good" : s.includes("start") && !s.includes("not") ? "bg-warn-bg text-warn" : "bg-bad-bg text-bad";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
}
