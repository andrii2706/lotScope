import { cookies, headers } from "next/headers";
import { OAUTH_COOKIE, challengeFor, googleConfig, randomUrlToken, redirectUri, safeNext, type OAuthContext } from "@/lib/google";

export async function GET(request: Request) {
  const cfg = googleConfig();
  const url = new URL(request.url);
  if (!cfg) return Response.redirect(new URL("/login?error=google_off", url.origin), 303);
  const context: OAuthContext = {
    state: randomUrlToken(24),
    verifier: randomUrlToken(48),
    invite: (url.searchParams.get("invite") || "").slice(0, 200),
    next: safeNext(url.searchParams.get("next")),
  };
  const h = await headers();
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim() || (process.env.APP_URL?.startsWith("https://") ? "https" : url.protocol.replace(":", ""));
  (await cookies()).set(OAUTH_COOKIE, JSON.stringify(context), {
    httpOnly: true,
    sameSite: "lax",
    secure: proto === "https",
    path: "/api/auth/google",
    maxAge: 600,
  });
  const auth = new URL(cfg.authUrl);
  auth.search = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri(request),
    response_type: "code",
    scope: "openid email profile",
    state: context.state,
    code_challenge: challengeFor(context.verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return new Response(null, { status: 303, headers: { location: auth.toString() } });
}
