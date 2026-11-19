import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const LOCAL_CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

export class PdfUnavailableError extends Error {}

async function launchOptions(): Promise<Parameters<typeof puppeteer.launch>[0]> {
  const configured = process.env.CHROME_PATH;
  if (configured) return { executablePath: configured, headless: true };
  const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (!serverless) {
    const local = LOCAL_CHROME.find((p) => existsSync(p));
    if (local) return { executablePath: local, headless: true };
    if (process.platform !== "linux") {
      throw new PdfUnavailableError("Не знайдено Chrome для створення PDF. Вкажіть шлях у CHROME_PATH.");
    }
  }
  const chromium = (await import("@sparticuz/chromium")).default;
  return {
    executablePath: await chromium.executablePath(),
    args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
    headless: "shell",
  };
}

export async function renderPdf(url: string, cookie: { name: string; value: string }): Promise<Uint8Array> {
  const browser = await puppeteer.launch({ ...(await launchOptions()), defaultViewport: { width: 1280, height: 900 } });
  try {
    await browser.setCookie({ name: cookie.name, value: cookie.value, domain: new URL(url).hostname, path: "/", httpOnly: true, secure: url.startsWith("https:") });
    const page = await browser.newPage();
    await page.emulateMediaType("print");
    await page.goto(url, { waitUntil: "networkidle0", timeout: 40_000 });
    await page.waitForSelector("article.sheet", { timeout: 15_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map((img) => new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          })),
      );
    });
    return await page.pdf({ format: "A4", preferCSSPageSize: true, printBackground: true });
  } finally {
    await browser.close();
  }
}
