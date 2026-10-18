import type { SignAlgo } from "./liqpay";

export function lpConfig() {
  const publicKey = process.env.LIQPAY_PUBLIC_KEY || "";
  const privateKey = process.env.LIQPAY_PRIVATE_KEY || "";
  const appUrl = (process.env.APP_URL || "").replace(/\/+$/, "");
  if (!publicKey || !privateKey || !appUrl) return null;
  const algo: SignAlgo = process.env.LIQPAY_SIGNATURE === "sha3-256" ? "sha3-256" : "sha1";
  const sandbox = process.env.LIQPAY_SANDBOX === "1";
  return {
    publicKey,
    privateKey,
    appUrl,
    algo,
    sandbox,
    successStatuses: sandbox ? ["success", "subscribed", "sandbox"] : ["success", "subscribed"],
    apiUrl: process.env.LIQPAY_API_URL || "https://www.liqpay.ua/api/request",
  };
}
