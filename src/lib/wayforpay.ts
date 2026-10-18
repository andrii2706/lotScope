import { createHmac, timingSafeEqual } from "node:crypto";

export interface PurchaseInput {
  merchantAccount: string;
  merchantDomainName: string;
  secretKey: string;
  orderReference: string;
  orderDate: number;
  amount: number;
  currency: string;
  productName: string;
  serviceUrl: string;
  returnUrl: string;
  recurring?: { dateNext: string; dateEnd: string };
  clientEmail?: string;
}

export const PAY_URL = "https://secure.wayforpay.com/pay";
export const REGULAR_API_URL = "https://api.wayforpay.com/regularApi";

export function hmacMd5(parts: (string | number)[], key: string): string {
  return createHmac("md5", key).update(parts.join(";"), "utf8").digest("hex");
}

export function formatAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

export function ddmmyyyy(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}

export function purchaseFields(input: PurchaseInput): Record<string, string> {
  const amount = formatAmount(input.amount);
  const signature = hmacMd5(
    [
      input.merchantAccount,
      input.merchantDomainName,
      input.orderReference,
      input.orderDate,
      amount,
      input.currency,
      input.productName,
      1,
      amount,
    ],
    input.secretKey,
  );
  const fields: Record<string, string> = {
    merchantAccount: input.merchantAccount,
    merchantDomainName: input.merchantDomainName,
    merchantTransactionSecureType: "AUTO",
    merchantSignature: signature,
    orderReference: input.orderReference,
    orderDate: String(input.orderDate),
    amount,
    currency: input.currency,
    "productName[]": input.productName,
    "productPrice[]": amount,
    "productCount[]": "1",
    serviceUrl: input.serviceUrl,
    returnUrl: input.returnUrl,
    language: "UA",
  };
  if (input.clientEmail) fields.clientEmail = input.clientEmail;
  if (input.recurring) {
    Object.assign(fields, {
      regularMode: "monthly",
      regularOn: "1",
      regularBehavior: "preset",
      regularAmount: amount,
      dateNext: input.recurring.dateNext,
      dateEnd: input.recurring.dateEnd,
    });
  }
  return fields;
}

export interface Callback {
  merchantAccount: string;
  orderReference: string;
  merchantSignature: string;
  amount: number | string;
  currency: string;
  authCode?: string;
  cardPan?: string;
  transactionStatus: string;
  reasonCode?: number | string;
  recToken?: string;
}

const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));

export function verifyCallback(cb: Callback, secretKey: string): boolean {
  const expected = hmacMd5(
    [
      str(cb.merchantAccount),
      str(cb.orderReference),
      str(cb.amount),
      str(cb.currency),
      str(cb.authCode),
      str(cb.cardPan),
      str(cb.transactionStatus),
      str(cb.reasonCode),
    ],
    secretKey,
  );
  const given = str(cb.merchantSignature).toLowerCase();
  if (given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export function callbackAnswer(orderReference: string, secretKey: string, time = Math.floor(Date.now() / 1000)) {
  const status = "accept";
  return { orderReference, status, time, signature: hmacMd5([orderReference, status, time], secretKey) };
}

export function baseReference(orderReference: string): string {
  return orderReference.split(/_WFPREG|_/)[0];
}
