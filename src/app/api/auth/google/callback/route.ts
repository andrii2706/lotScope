import { cookies } from "next/headers";
import { audit } from "@/lib/audit";
import { createSession, homePath, newId, sha256 } from "@/lib/auth";
import { dbConfigured, query, tx } from "@/lib/db";
import { OAUTH_COOKIE, exchangeCode, googleConfig, redirectUri, safeNext, type GoogleProfile, type OAuthContext } from "@/lib/google";
import { TRIAL_CREDITS } from "@/lib/plans";
import { seatUsage } from "@/lib/seats";

type Outcome = { userId: string; role: string; companyId: string; created: boolean } | { error: string };

async function resolve(profile: GoogleProfile, invite: string): Promise<Outcome> {
  const bySub = await query<{ id: string; role: string; active: boolean; company_id: string }>("select id, role, active, company_id from users where google_sub = $1", [profile.sub]);
  const byEmail = bySub[0] ? bySub : await query<{ id: string; role: string; active: boolean; company_id: string }>("select id, role, active, company_id from users where email = $1", [profile.email]);
  const existing = byEmail[0];
  if (existing) {
    if (!existing.active) return { error: "disabled" };
    if (!bySub[0]) await query("update users set google_sub = $2 where id = $1", [existing.id, profile.sub]);
    return { userId: existing.id, role: existing.role, companyId: existing.company_id, created: false };
  }

  const userId = newId();
  if (invite) {
    return tx<Outcome>(async (c) => {
      const inv = await c.query<{ company_id: string; role: string }>(
        "update invites set used_at = now() where token_hash = $1 and used_at is null and expires_at > now() returning company_id, role",
        [sha256(invite)],
      );
      if (!inv.rows[0]) return { error: "invite" };
      await c.query("select 1 from companies where id = $1 for update", [inv.rows[0].company_id]);
      const usage = await seatUsage(inv.rows[0].company_id, c);
      if (usage.active + usage.pending >= usage.total) throw new Error("full");
      await c.query(
        "insert into users (id, email, name, password_hash, google_sub, company_id, role) values ($1, $2, $3, null, $4, $5, $6)",
        [userId, profile.email, profile.name, profile.sub, inv.rows[0].company_id, inv.rows[0].role],
      );
      return { userId, role: inv.rows[0].role, companyId: inv.rows[0].company_id, created: true };
    }).catch((e: Error) => {
      if (e.message === "full") return { error: "full" };
      throw e;
    });
  }

  const companyId = newId();
  await tx(async (c) => {
    await c.query("insert into companies (id, name, plan, credits, kind, seats) values ($1, $2, 'trial', $3, 'personal', 1)", [companyId, profile.name.slice(0, 120), TRIAL_CREDITS]);
    await c.query(
      "insert into users (id, email, name, password_hash, google_sub, company_id, role) values ($1, $2, $3, null, $4, $5, 'user')",
      [userId, profile.email, profile.name, profile.sub, companyId],
    );
  });
  return { userId, role: "user", companyId, created: true };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const go = (path: string) => new Response(null, { status: 303, headers: { location: new URL(path, (process.env.APP_URL || "").replace(/\/+$/, "") || url.origin).toString() } });
  const cfg = googleConfig();
  if (!cfg || !dbConfigured()) return go("/login?error=google_off");

  const store = await cookies();
  const raw = store.get(OAUTH_COOKIE)?.value;
  store.set(OAUTH_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
  let context: OAuthContext | null = null;
  try {
    context = raw ? (JSON.parse(raw) as OAuthContext) : null;
  } catch {
    context = null;
  }
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (url.searchParams.get("error") || !code || !context || !state || state !== context.state) return go("/login?error=google_denied");

  try {
    const profile = await exchangeCode(cfg, code, context.verifier, redirectUri(request));
    if (!profile) return go("/login?error=google_failed");
    if (!profile.emailVerified) return go("/login?error=google_unverified");
    const outcome = await resolve(profile, context.invite);
    if ("error" in outcome) return go(`/login?error=google_${outcome.error}`);
    await createSession(outcome.userId);
    await audit({ id: outcome.userId, name: profile.name, role: outcome.role, companyId: outcome.companyId }, outcome.created ? (context.invite ? "invite_accept" : "register") : "login", profile.email, "Google");
    const next = safeNext(context.next);
    return go(next === "/" ? homePath(outcome.role) : next);
  } catch (e) {
    console.error("Google sign-in", e instanceof Error ? e.message : e);
    return go("/login?error=google_failed");
  }
}
