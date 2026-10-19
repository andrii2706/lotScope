import { approvePayment, declinePayment, stopRecurring } from "@/lib/billing";
import { query } from "@/lib/db";
import { decodeData, parseCallback, paymentReference, verifySignature } from "@/lib/liqpay";
import { lpConfig } from "@/lib/lpConfig";

export async function POST(request: Request) {
  const cfg = lpConfig();
  if (!cfg) return new Response("not configured", { status: 503 });
  const form = new URLSearchParams(await request.text());
  const data = form.get("data") || "";
  const signature = form.get("signature") || "";
  if (!data || !signature || !verifySignature(data, signature, cfg.privateKey)) {
    return new Response("bad signature", { status: 400 });
  }
  const decoded = decodeData(data);
  if (!decoded) return new Response("bad data", { status: 400 });
  const cb = parseCallback(decoded);
  if (!cb.orderId || cb.publicKey !== cfg.publicKey) return new Response("bad merchant", { status: 400 });

  const { reference, base } = paymentReference(cb);
  const expected = await query<{ amount: string; currency: string }>("select amount, currency from payments where order_reference = $1", [base]);
  if (!expected[0]) {
    console.error("LiqPay callback for unknown order", cb.orderId);
    return new Response("ok");
  }

  if (cfg.successStatuses.includes(cb.status)) {
    if (Math.abs(cb.amount - Number(expected[0].amount)) > 0.01 || cb.currency !== expected[0].currency) {
      console.error("LiqPay amount mismatch", cb.orderId, cb.amount, expected[0].amount);
      return new Response("ok");
    }
    await approvePayment({ orderReference: reference, baseReference: base, amount: cb.amount, raw: decoded });
  } else if (cb.status === "failure" || cb.status === "error") {
    await declinePayment(reference, decoded);
  } else if (cb.status === "unsubscribed") {
    await stopRecurring(base);
  }
  return new Response("ok");
}
