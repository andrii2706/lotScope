import type { Mail } from "@/types/system";
const RESEND_URL = (process.env.RESEND_API_URL || "https://api.resend.com").replace(/\/+$/, "");

export const mailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

export async function sendMail(mail: Mail): Promise<boolean> {
  if (!mailConfigured()) {
    if (process.env.NODE_ENV !== "production") console.log(`[mail не налаштовано] Лист для ${mail.to}: ${mail.subject}\n${mail.text}`);
    else console.error("RESEND_API_KEY або MAIL_FROM не задано: лист не надіслано.");
    return false;
  }
  try {
    const res = await fetch(`${RESEND_URL}/emails`, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error("Resend відхилив лист", res.status, (await res.text()).slice(0, 500));
      return false;
    }
    return true;
  } catch (error) {
    console.error("Не вдалося надіслати лист", error);
    return false;
  }
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

export function resetEmail(name: string, link: string, minutes: number): Omit<Mail, "to"> {
  const hello = name ? `Вітаємо, ${name}!` : "Вітаємо!";
  const text = [
    hello,
    "",
    "Ви або хтось інший попросили скинути пароль до LotScope.",
    `Щоб задати новий пароль, відкрийте посилання (діє ${minutes} хвилин, один раз):`,
    link,
    "",
    "Якщо ви не просили скинути пароль, просто проігноруйте цей лист: пароль не зміниться.",
  ].join("\n");
  const html = `<!doctype html><html lang="uk"><body style="margin:0;background:#f3f4f7;font-family:Arial,Helvetica,sans-serif;color:#14171c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td style="font-size:20px;font-weight:700;padding-bottom:16px">LotScope</td></tr>
<tr><td style="font-size:15px;line-height:1.6">${escape(hello)}<br><br>Ви або хтось інший попросили скинути пароль до LotScope. Натисніть кнопку, щоб задати новий пароль. Посилання діє ${minutes} хвилин і спрацьовує один раз.</td></tr>
<tr><td style="padding:24px 0"><a href="${escape(link)}" style="display:inline-block;background:#c8f542;color:#0a0c0f;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px">Задати новий пароль</a></td></tr>
<tr><td style="font-size:13px;line-height:1.6;color:#566070">Якщо кнопка не працює, скопіюйте посилання в браузер:<br><span style="word-break:break-all">${escape(link)}</span><br><br>Якщо ви не просили скинути пароль, просто проігноруйте цей лист: пароль не зміниться.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: "Скидання пароля LotScope", html, text };
}
