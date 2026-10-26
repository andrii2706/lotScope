import { cleanVin } from "./vin";
import { query, tx } from "./db";

export function lotKeys(lotNumber: string | undefined, vin: string | undefined): string[] {
  const keys: string[] = [];
  const lot = (lotNumber || "").replace(/[^0-9A-Za-z-]/g, "").toUpperCase();
  if (lot) keys.push(`lot:${lot}`);
  const v = cleanVin(vin || "");
  if (/^[A-HJ-NPR-Z0-9]{17}$/.test(v)) keys.push(`vin:${v}`);
  return keys;
}

export async function isUnlocked(companyId: string, keys: string[]): Promise<boolean> {
  if (keys.length === 0) return false;
  const rows = await query("select 1 from lot_unlocks where company_id = $1 and keys && $2::text[] limit 1", [companyId, keys]);
  return rows.length > 0;
}

export async function unlockLot(companyId: string, userId: string, keys: string[], note: string): Promise<boolean> {
  if (keys.length === 0) return false;
  return tx(async (c) => {
    const existing = await c.query("select 1 from lot_unlocks where company_id = $1 and keys && $2::text[] limit 1", [companyId, keys]);
    if (existing.rowCount) {
      await c.query("update lot_unlocks set keys = (select array(select distinct unnest(keys || $2::text[]))) where company_id = $1 and keys && $2::text[]", [companyId, keys]);
      return true;
    }
    const paid = await c.query("update companies set credits = credits - 1 where id = $1 and credits > 0 returning credits", [companyId]);
    if (paid.rowCount === 0) return false;
    await c.query("insert into usage (company_id, user_id, kind, note) values ($1, $2, 'unlock', $3)", [companyId, userId, note]);
    await c.query("insert into lot_unlocks (company_id, keys, user_id) values ($1, $2, $3)", [companyId, keys, userId]);
    return true;
  });
}

export async function takeFreeAnalysis(companyId: string, userId: string, keys: string[], note: string): Promise<boolean> {
  if (keys.length === 0) return false;
  return tx(async (c) => {
    const res = await c.query(
      `update lot_unlocks set analysis_used = true
        where id = (select id from lot_unlocks where company_id = $1 and keys && $2::text[] and not analysis_used order by id limit 1 for update)
        returning id`,
      [companyId, keys],
    );
    if (res.rowCount === 0) return false;
    await c.query("insert into usage (company_id, user_id, kind, note) values ($1, $2, 'analysis_free', $3)", [companyId, userId, note]);
    return true;
  });
}

export async function restoreFreeAnalysis(companyId: string, userId: string, keys: string[]) {
  await tx(async (c) => {
    await c.query(
      `update lot_unlocks set analysis_used = false
        where id = (select id from lot_unlocks where company_id = $1 and keys && $2::text[] and analysis_used order by id desc limit 1 for update)`,
      [companyId, keys],
    );
    await c.query("insert into usage (company_id, user_id, kind, note) values ($1, $2, 'analysis_free_refund', 'повернення')", [companyId, userId]);
  });
}
