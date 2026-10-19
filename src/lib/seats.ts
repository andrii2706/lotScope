import type pg from "pg";
import { query } from "./db";

export interface SeatUsage {
  total: number;
  active: number;
  pending: number;
  free: number;
}

type Runner = Pick<pg.PoolClient, "query">;

export async function seatUsage(companyId: string, runner?: Runner): Promise<SeatUsage> {
  const sql = `select c.seats as total,
      (select count(*) from users u where u.company_id = c.id and u.active)::int as active,
      (select count(*) from invites i where i.company_id = c.id and i.used_at is null and i.expires_at > now())::int as pending
    from companies c where c.id = $1`;
  const rows = runner ? (await runner.query<{ total: number; active: number; pending: number }>(sql, [companyId])).rows : await query<{ total: number; active: number; pending: number }>(sql, [companyId]);
  const r = rows[0] ?? { total: 0, active: 0, pending: 0 };
  return { ...r, free: Math.max(0, r.total - r.active - r.pending) };
}

export const SEATS_FULL_MESSAGE = "Усі робочі місця за вашим тарифом зайняті. Вимкніть доступ комусь із команди або перейдіть на більший тариф.";
