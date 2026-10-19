import { createHash, randomBytes } from "node:crypto";

export const OAUTH_COOKIE = "ls_oauth";

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    authUrl: process.env.GOOGLE_AUTH_URL || "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: process.env.GOOGLE_TOKEN_URL || "https://oauth2.googleapis.com/token",
    userInfoUrl: process.env.GOOGLE_USERINFO_URL || "https://openidconnect.googleapis.com/v1/userinfo",
  };
}

export function redirectUri(request: Request): string {
  const base = (process.env.APP_URL || "").replace(/\/+$/, "") || new URL(request.url).origin;
  return `${base}/api/auth/google/callback`;
}

export const randomUrlToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const challengeFor = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");

export interface OAuthContext {
  state: string;
  verifier: string;
  invite: string;
  next: string;
}

export function safeNext(v: string | null): string {
  return v && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : "/";
}

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

export async function exchangeCode(
  cfg: NonNullable<ReturnType<typeof googleConfig>>,
  code: string,
  verifier: string,
  redirect: string,
): Promise<GoogleProfile | null> {
  const tokenRes = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: redirect,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  const token = (await tokenRes?.json().catch(() => null)) as { access_token?: string } | null;
  if (!tokenRes?.ok || !token?.access_token) return null;
  const infoRes = await fetch(cfg.userInfoUrl, {
    headers: { authorization: `Bearer ${token.access_token}` },
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  const info = (await infoRes?.json().catch(() => null)) as { sub?: unknown; email?: unknown; email_verified?: unknown; name?: unknown } | null;
  if (!infoRes?.ok || typeof info?.sub !== "string" || typeof info.email !== "string") return null;
  return {
    sub: info.sub,
    email: info.email.trim().toLowerCase(),
    emailVerified: info.email_verified === true || info.email_verified === "true",
    name: typeof info.name === "string" && info.name.trim() ? info.name.trim().slice(0, 120) : info.email.split("@")[0],
  };
}
