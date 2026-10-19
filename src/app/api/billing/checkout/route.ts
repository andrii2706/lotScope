import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { CHECKOUT_URL, checkoutFields } from "@/lib/liqpay";
import { lpConfig } from "@/lib/lpConfig";
import { PLANS, isPlanId, plansFor } from "@/lib/plans";
import { fail, readJson } from "@/lib/server";

export async function POST(request: Request) {
  const user = await requireUser("billing");
  if (user instanceof Response) return user;
  const cfg = lpConfig();
  if (!cfg) return fail(503, "Оплата карткою ще не налаштована. Скористайтесь оплатою за рахунком.");
  const body = await readJson<{ plan?: string }>(request);
  if (!isPlanId(body?.plan) || !plansFor(user.companyKind).some((p) => p.id === body.plan)) return fail(400, "Оберіть тариф.");
  const plan = PLANS[body.plan];
  if (plan.recurring && user.recurringActive) {
    return fail(409, "У вас уже є активне автосписання. Спершу скасуйте його, щоб змінити тариф.");
  }
  const orderId = `LS-${user.companyId}-${plan.id}-${Date.now()}`;
  await query(
    "insert into payments (order_reference, company_id, plan, amount, method, status) values ($1, $2, $3, $4, 'card', 'pending')",
    [orderId, user.companyId, plan.id, plan.priceUah],
  );
  const fields = checkoutFields({
    publicKey: cfg.publicKey,
    privateKey: cfg.privateKey,
    algo: cfg.algo,
    orderId,
    amount: plan.priceUah,
    currency: "UAH",
    description: `LotScope: ${plan.name} (${plan.description})`,
    resultUrl: `${cfg.appUrl}/api/billing/return`,
    serverUrl: `${cfg.appUrl}/api/billing/webhook`,
    recurring: plan.recurring,
    sandbox: cfg.sandbox,
  });
  return Response.json({ action: CHECKOUT_URL, fields });
}
