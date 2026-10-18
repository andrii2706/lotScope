export function wfpConfig() {
  const merchantAccount = process.env.WAYFORPAY_MERCHANT_ACCOUNT || "";
  const secretKey = process.env.WAYFORPAY_SECRET_KEY || "";
  const appUrl = (process.env.APP_URL || "").replace(/\/+$/, "");
  if (!merchantAccount || !secretKey || !appUrl) return null;
  return {
    merchantAccount,
    secretKey,
    appUrl,
    domain: process.env.WAYFORPAY_MERCHANT_DOMAIN || new URL(appUrl).hostname,
    merchantPassword: process.env.WAYFORPAY_MERCHANT_PASSWORD || "",
  };
}
