import type { Mail } from "@/types/system";
const RESEND_URL = (process.env.RESEND_API_URL || "https://api.resend.com").replace(/\/+$/, "");

const replyTo = () => (process.env.MAIL_REPLY_TO || "").trim();

type MailLang = "uk" | "pl";

const footer = (lang: MailLang = "uk") =>
  replyTo()
    ? lang === "pl"
      ? `Wiadomość wysłana automatycznie. Pytania o dostęp kieruj na ${replyTo()}.`
      : `Лист надіслано автоматично. Питання щодо доступу пишіть на ${replyTo()}.`
    : lang === "pl"
      ? "Wiadomość wysłana automatycznie, nie trzeba na nią odpowiadać."
      : "Лист надіслано автоматично, відповідати на нього не потрібно.";

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
      body: JSON.stringify({
        from: process.env.MAIL_FROM,
        to: [mail.to],
        ...(replyTo() ? { reply_to: replyTo() } : {}),
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }),
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

const RESET = {
  uk: {
    hello: (name: string) => (name ? `Вітаємо, ${name}!` : "Вітаємо!"),
    asked: "Ви або хтось інший попросили скинути пароль до LotScope.",
    open: (m: number) => `Щоб задати новий пароль, відкрийте посилання (діє ${m} хвилин, один раз):`,
    ignore: "Якщо ви не просили скинути пароль, просто проігноруйте цей лист: пароль не зміниться.",
    press: (m: number) => `Натисніть кнопку, щоб задати новий пароль. Посилання діє ${m} хвилин і спрацьовує один раз.`,
    button: "Задати новий пароль",
    copy: "Якщо кнопка не працює, скопіюйте посилання в браузер:",
    subject: "Скидання пароля LotScope",
  },
  pl: {
    hello: (name: string) => (name ? `Dzień dobry, ${name}!` : "Dzień dobry!"),
    asked: "Ty lub ktoś inny poprosił o zmianę hasła do LotScope.",
    open: (m: number) => `Aby ustawić nowe hasło, otwórz link (działa ${m} minut, jeden raz):`,
    ignore: "Jeśli nie prosiłeś o zmianę hasła, zignoruj tę wiadomość: hasło się nie zmieni.",
    press: (m: number) => `Kliknij przycisk, aby ustawić nowe hasło. Link działa ${m} minut i tylko jeden raz.`,
    button: "Ustaw nowe hasło",
    copy: "Jeśli przycisk nie działa, skopiuj link do przeglądarki:",
    subject: "Zmiana hasła LotScope",
  },
};

const INVITE = {
  uk: {
    hello: "Вітаємо!",
    who: (inviter: string) => (inviter ? `${inviter} запрошує вас` : "Вас запрошено"),
    line: (who: string, company: string, role: string) => `${who} до LotScope у компанію «${company}» з роллю «${role}».`,
    open: (d: number) => `Щоб створити акаунт і задати пароль, відкрийте посилання (діє ${d} днів, один раз):`,
    google: "Увійти можна також через Google-акаунт з цією поштою.",
    ignore: "Якщо ви не чекали цього запрошення, просто проігноруйте лист.",
    press: (d: number) => `Натисніть кнопку, щоб створити акаунт і задати пароль. Посилання діє ${d} днів і спрацьовує один раз.`,
    button: "Прийняти запрошення",
    copy: "Якщо кнопка не працює, скопіюйте посилання в браузер:",
    subject: (company: string) => `Запрошення до LotScope: «${company}»`,
  },
  pl: {
    hello: "Dzień dobry!",
    who: (inviter: string) => (inviter ? `${inviter} zaprasza Cię` : "Otrzymujesz zaproszenie"),
    line: (who: string, company: string, role: string) => `${who} do LotScope, do firmy „${company}”, w roli „${role}”.`,
    open: (d: number) => `Aby utworzyć konto i ustawić hasło, otwórz link (działa ${d} dni, jeden raz):`,
    google: "Możesz też zalogować się kontem Google z tym adresem e-mail.",
    ignore: "Jeśli nie spodziewałeś się tego zaproszenia, zignoruj tę wiadomość.",
    press: (d: number) => `Kliknij przycisk, aby utworzyć konto i ustawić hasło. Link działa ${d} dni i tylko jeden raz.`,
    button: "Przyjmij zaproszenie",
    copy: "Jeśli przycisk nie działa, skopiuj link do przeglądarki:",
    subject: (company: string) => `Zaproszenie do LotScope: „${company}”`,
  },
};

const page = (lang: MailLang, body: string, button: string, link: string, after: string) => `<!doctype html><html lang="${lang}"><body style="margin:0;background:#f3f4f7;font-family:Arial,Helvetica,sans-serif;color:#14171c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td style="font-size:20px;font-weight:700;padding-bottom:16px">LotScope</td></tr>
<tr><td style="font-size:15px;line-height:1.6">${body}</td></tr>
<tr><td style="padding:24px 0"><a href="${escape(link)}" style="display:inline-block;background:#c8f542;color:#0a0c0f;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px">${escape(button)}</a></td></tr>
<tr><td style="font-size:13px;line-height:1.6;color:#566070">${after}</td></tr>
<tr><td style="font-size:12px;line-height:1.6;color:#8a93a3;border-top:1px solid #e6e8ee;padding-top:16px">${escape(footer(lang))}</td></tr>
</table></td></tr></table></body></html>`;

export function resetEmail(name: string, link: string, minutes: number, lang: MailLang = "uk"): Omit<Mail, "to"> {
  const m = RESET[lang];
  const hello = m.hello(name);
  const text = [hello, "", m.asked, m.open(minutes), link, "", m.ignore, "", footer(lang)].join("\n");
  const html = page(
    lang,
    `${escape(hello)}<br><br>${escape(m.asked)} ${escape(m.press(minutes))}`,
    m.button,
    link,
    `${escape(m.copy)}<br><span style="word-break:break-all">${escape(link)}</span><br><br>${escape(m.ignore)}`,
  );
  return { subject: m.subject, html, text };
}

export function inviteEmail(opts: { companyName: string; roleLabel: string; inviter: string; link: string; days: number; lang?: MailLang }): Omit<Mail, "to"> {
  const { companyName, roleLabel, inviter, link, days } = opts;
  const lang = opts.lang ?? "uk";
  const m = INVITE[lang];
  const line = m.line(m.who(inviter), companyName, roleLabel);
  const text = [m.hello, "", line, m.open(days), link, "", m.google, m.ignore, "", footer(lang)].join("\n");
  const html = page(
    lang,
    `${escape(m.hello)}<br><br>${escape(line)} ${escape(m.press(days))}`,
    m.button,
    link,
    `${escape(m.google)}<br><br>${escape(m.copy)}<br><span style="word-break:break-all">${escape(link)}</span><br><br>${escape(m.ignore)}`,
  );
  return { subject: m.subject(companyName), html, text };
}
