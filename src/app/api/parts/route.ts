import Anthropic from "@anthropic-ai/sdk";
import { audit } from "@/lib/server/audit";
import { requireUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { canonicalUrl, parsePartsJson } from "@/lib/shared/partsPricing";
import { can } from "@/lib/shared/roles";
import { fail, readJson } from "@/lib/server/http";
import { route } from "@/lib/server/route";
import type { PartsSearch } from "@/types/pricing";

export const maxDuration = 300;

const MODEL = process.env.ANTHROPIC_PARTS_MODEL || process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const MAX_PARTS = 6;

const PREFERENCE: Record<string, string> = {
  used: "used original parts from dismantlers (Polish: używane, oryginał; Ukrainian: б/у, оригінал)",
  aftermarket: "new aftermarket parts (Polish: nowe, zamiennik; Ukrainian: нові, аналог)",
  oem: "new original OEM parts (Polish: nowe, oryginał; Ukrainian: нові, оригінал)",
};

const SYSTEM = `You help a Ukrainian car-import company price replacement body parts for a car bought at a US auction.
For every part in the list, use the web_search tool to find current listings on allegro.pl (search in Polish, e.g. "zderzak przedni BMW 3 GT F34 używany") and on olx.ua (search in Ukrainian or Russian). Use the exact generation or chassis code when you know it, and remember that US-market parts sometimes differ from European ones (lights, bumpers with sensors).
Report only listings you actually saw in the search results: copy the listing URL exactly as it appears in the results and the price exactly as shown, with its currency (PLN for allegro.pl and olx.pl, UAH for olx.ua). Never invent a listing, a URL or a price. If you found nothing reliable for a part, return an empty offers list for it and say so in note.
Up to 4 offers per part, preferring the listings that match the requested part type and condition.
For each part also estimate body-shop labor hours to fit it (laborHoursMin, laborHoursMax) and whether it needs painting after fitting (paint: true/false).
Write title and note in Ukrainian.
Your final message must be only a JSON object, no prose before or after:
{"parts":[{"part":"<exact part name from the list>","offers":[{"source":"Allegro"|"OLX","title":"...","price":123,"currency":"PLN"|"UAH"|"EUR"|"USD","url":"https://...","condition":"used"|"new"|"unknown"}],"laborHoursMin":1,"laborHoursMax":2,"paint":true,"note":"..."}]}`;

interface Body {
  reportId?: unknown;
  lot?: { make?: unknown; model?: unknown; year?: unknown; vin?: unknown };
  parts?: unknown;
  partsPreference?: unknown;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function handleGET() {
  return Response.json({ configured: Boolean(process.env.ANTHROPIC_API_KEY) });
}

async function handlePOST(request: Request) {
  const user = await requireUser("analyze");
  if (user instanceof Response) return user;
  if (!process.env.ANTHROPIC_API_KEY) return fail(503, "Пошук цін запчастин зараз недоступний.", "ANTHROPIC_API_KEY не задано");

  const body = await readJson<Body>(request);
  const make = str(body?.lot?.make, 60);
  const model = str(body?.lot?.model, 80);
  const year = typeof body?.lot?.year === "number" ? Math.round(body.lot.year) : 0;
  const vin = str(body?.lot?.vin, 20);
  const parts = (Array.isArray(body?.parts) ? body.parts : []).map((p) => str(p, 120)).filter(Boolean).slice(0, MAX_PARTS);
  if (!make || !model || !year) return fail(400, "Немає марки, моделі чи року авто.");
  if (!parts.length) return fail(400, "У звіті немає деталей під заміну.");
  const preference = PREFERENCE[str(body?.partsPreference, 20)] ?? PREFERENCE.used;

  const reportId = str(body?.reportId, 40);
  let persist = false;
  if (reportId && !reportId.startsWith("tmp-")) {
    const rows = await query<{ user_id: string | null }>("select user_id from reports where id = $1 and company_id = $2", [reportId, user.companyId]);
    if (!rows[0]) return fail(404, "Звіт не знайдено.");
    persist = rows[0].user_id === user.id || can(user, "expert");
  }

  const prompt = [
    `Car: ${year} ${make} ${model}${vin ? `, VIN ${vin}` : ""}.`,
    `Preferred part type: ${preference}.`,
    "Parts to price:",
    ...parts.map((p, i) => `${i + 1}. ${p}`),
  ].join("\n");

  try {
    const client = new Anthropic();
    const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
    const seen = new Set<string>();
    let finalText = "";
    for (let turn = 0; turn < 4; turn++) {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 8000,
        system: SYSTEM,
        messages,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: Math.min(14, parts.length * 2 + 2),
            allowed_domains: ["allegro.pl", "olx.ua", "olx.pl"],
          },
        ],
      });
      for (const block of message.content) {
        if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
          for (const r of block.content) {
            const canon = canonicalUrl(r.url);
            if (canon) seen.add(canon);
          }
        }
        if (block.type === "text") {
          finalText += block.text;
          for (const c of block.citations ?? []) {
            if (c.type === "web_search_result_location") {
              const canon = canonicalUrl(c.url);
              if (canon) seen.add(canon);
            }
          }
        }
      }
      if (message.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: message.content });
      finalText = "";
    }

    const priced = parsePartsJson(finalText, seen, parts);
    if (!priced.length) return fail(502, "Не вдалося знайти ціни запчастин. Спробуйте ще раз.", `Parts JSON not parsed: ${finalText.slice(0, 300)}`);
    const result: PartsSearch = { checkedAt: new Date().toISOString(), model: MODEL, parts: priced };
    if (persist) {
      await query("update reports set body = jsonb_set(body, '{partsSearch}', $2::jsonb) where id = $1", [reportId, JSON.stringify(result)]);
    }
    await audit(user, "parts_search", `${year} ${make} ${model}`, `${priced.reduce((n, p) => n + p.offers.length, 0)} оголошень`);
    return Response.json({ partsSearch: result, persisted: persist });
  } catch (error) {
    const status = error instanceof Anthropic.APIError ? error.status : 0;
    const hint = status === 400 ? " (ймовірно, Web search вимкнено для організації в Claude Console)" : "";
    return fail(503, "Пошук цін запчастин зараз недоступний. Спробуйте пізніше.", `Parts search failed${hint}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const GET = route(handleGET);
export const POST = route(handlePOST);
