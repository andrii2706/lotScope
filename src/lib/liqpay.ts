import { createHash, timingSafeEqual } from "node:crypto";

export const CHECKOUT_URL = "https://www.liqpay.ua/api/3/checkout";
export const API_URL = "https://www.liqpay.ua/api/request";
export const API_VERSION = 7;

export type SignAlgo = "sha1" | "sha3-256";
const ALGOS: SignAlgo[] = ["sha1", "sha3-256"];

export const SUCCESS_STATUSES = ["success", "subscribed"];

export function sign(data: string, privateKey: string, algo: SignAlgo = "sha1"): string {
  return createHash(algo).update(privateKey + data + privateKey, "utf8").digest("base64");
}

export function encodeData(params: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(params), "utf8").toString("base64");
}

export function decodeData(data: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(data, "base64").toString("utf8"));
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function verifySignature(data: string, signature: string, privateKey: string): boolean {
  const given = Buffer.from(signature, "utf8");
  return ALGOS.some((algo) => {
    const expected = Buffer.from(sign(data, privateKey, algo), "utf8");
    return expected.length === given.length && timingSafeEqual(expected, given);
  });
}

export function formatUtc(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

export interface CheckoutInput {
  publicKey: string;
  privateKey: string;
  algo?: SignAlgo;
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  resultUrl: string;
  serverUrl: string;
  recurring: boolean;
  sandbox?: boolean;
  now?: Date;
}

export function checkoutFields(input: CheckoutInput): { data: string; signature: string } {
  const params: Record<string, unknown> = {
    public_key: input.publicKey,
    version: API_VERSION,
    action: input.recurring ? "subscribe" : "pay",
    amount: input.amount,
    currency: input.currency,
    description: input.description,
    order_id: input.orderId,
    language: "uk",
    result_url: input.resultUrl,
    server_url: input.serverUrl,
  };
  if (input.recurring) {
    params.subscribe = "1";
    params.subscribe_date_start = formatUtc(input.now ?? new Date());
    params.subscribe_periodicity = "month";
  }
  if (input.sandbox) params.sandbox = 1;
  const data = encodeData(params);
  return { data, signature: sign(data, input.privateKey, input.algo) };
}

export function apiRequestBody(params: Record<string, unknown>, publicKey: string, privateKey: string, algo: SignAlgo = "sha1"): URLSearchParams {
  const data = encodeData({ version: API_VERSION, public_key: publicKey, ...params });
  return new URLSearchParams({ data, signature: sign(data, privateKey, algo) });
}

export interface LiqpayCallback {
  action: string;
  status: string;
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  publicKey: string;
}

const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");

export function parseCallback(decoded: Record<string, unknown>): LiqpayCallback {
  return {
    action: str(decoded.action),
    status: str(decoded.status),
    orderId: str(decoded.order_id),
    paymentId: str(decoded.payment_id),
    amount: Number(decoded.amount),
    currency: str(decoded.currency),
    publicKey: str(decoded.public_key),
  };
}

export function paymentReference(cb: LiqpayCallback): { reference: string; base: string } {
  if (cb.action === "regular" && cb.paymentId) return { reference: `${cb.orderId}:${cb.paymentId}`, base: cb.orderId };
  return { reference: cb.orderId, base: cb.orderId };
}
