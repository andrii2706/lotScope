import { cookies } from "next/headers";
import { audit } from "@/lib/server/audit";
import { SESSION_COOKIE, requireUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { appUrl, fail, text } from "@/lib/server/http";
import { PdfUnavailableError, renderPdf } from "@/lib/server/pdf";
import { route } from "@/lib/server/route";
import { reportScope, reportScopeParams, reportScopeSql } from "@/lib/server/scope";

export const maxDuration = 60;

function fileName(title: string) {
  const base = `LotScope ${title}`.replace(/[\u0000-\u001f"\\/:*?<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  const ascii = base.replace(/[^\x20-\x7e]/g, "").replace(/\s+/g, "-") || "LotScope";
  return `attachment; filename="${ascii}.pdf"; filename*=UTF-8''${encodeURIComponent(base)}.pdf`;
}

async function handleGET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("pdf");
  if (user instanceof Response) return user;
  const id = text((await params).id, 40);
  const rows = await query<{ title: string }>(
    `select r.title from reports r where r.id = $1 and r.company_id = $2 and ${reportScopeSql("r", 3)}`,
    [id, user.companyId, ...reportScopeParams(reportScope(user))],
  );
  const report = rows[0];
  if (!report) return fail(404, "Звіт не знайдено.");
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return fail(401, "Сесія завершилась. Увійдіть у свій акаунт.");

  let pdf: Uint8Array;
  try {
    pdf = await renderPdf(`${appUrl(request)}/report/${encodeURIComponent(id)}`, { name: SESSION_COOKIE, value: token });
  } catch (error) {
    if (error instanceof PdfUnavailableError) return fail(503, error.message);
    return fail(503, "Не вдалося створити PDF. Спробуйте ще раз або скористайтеся кнопкою «Друкувати».", error);
  }
  await audit(user, "report_pdf", report.title || id);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": fileName(report.title || id),
      "cache-control": "private, no-store",
    },
  });
}

export const GET = route(handleGET);
