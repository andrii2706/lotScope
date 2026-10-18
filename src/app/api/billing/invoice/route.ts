import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { PLANS, isPlanId, plansFor } from "@/lib/plans";
import { fail, readJson } from "@/lib/server";

export async function POST(request: Request) {
  const user = await requireUser("billing");
  if (user instanceof Response) return user;
  const details = process.env.INVOICE_DETAILS;
  if (!details) return fail(503, "Оплата за рахунком ще не налаштована.");
  const body = await readJson<{ plan?: string }>(request);
  if (!isPlanId(body?.plan) || !plansFor(user.companyKind).some((p) => p.id === body.plan)) return fail(400, "Оберіть тариф.");
  const plan = PLANS[body.plan];
  const orderReference = `INV-${Date.now().toString(36).toUpperCase()}-${user.companyId.slice(0, 4).toUpperCase()}`;
  await query(
    "insert into payments (order_reference, company_id, plan, amount, method, status) values ($1, $2, $3, $4, 'invoice', 'pending')",
    [orderReference, user.companyId, plan.id, plan.priceUah],
  );
  return Response.json({
    orderReference,
    amount: plan.priceUah,
    plan: plan.name,
    details: details.replace(/\\n/g, "\n"),
    purpose: `Оплата за доступ до сервісу LotScope, тариф «${plan.name}», рахунок ${orderReference}, без ПДВ`,
  });
}
