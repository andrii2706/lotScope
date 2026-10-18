import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { apiRequestBody } from "@/lib/liqpay";
import { lpConfig } from "@/lib/lpConfig";
import { fail } from "@/lib/server";

export async function POST() {
  const user = await requireUser("billing");
  if (user instanceof Response) return user;
  const cfg = lpConfig();
  const rows = await query<{ recurring_ref: string | null }>("select recurring_ref from companies where id = $1", [user.companyId]);
  const ref = rows[0]?.recurring_ref;
  if (!user.recurringActive || !ref) return fail(400, "Активного автосписання немає.");
  if (!cfg) return fail(503, "Скасування автосписання не налаштоване. Напишіть нам, і ми скасуємо вручну.");
  const res = await fetch(cfg.apiUrl, {
    method: "POST",
    body: apiRequestBody({ action: "unsubscribe", order_id: ref }, cfg.publicKey, cfg.privateKey, cfg.algo),
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  const data = (await res?.json().catch(() => null)) as { result?: string; status?: string } | null;
  if (!data || (data.result !== "ok" && data.status !== "unsubscribed")) {
    return fail(502, "Платіжна система не підтвердила скасування. Спробуйте пізніше.");
  }
  await query("update companies set recurring_active = false where id = $1", [user.companyId]);
  return Response.json({ ok: true });
}
