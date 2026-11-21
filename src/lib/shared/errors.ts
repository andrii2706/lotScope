import { isUserText, t } from "./i18n.ts";

export const NETWORK_MESSAGE = "Немає з’єднання з інтернетом. Перевірте мережу і спробуйте ще раз.";
export const GENERIC_MESSAGE = "Щось пішло не так. Спробуйте ще раз.";
export const UNAVAILABLE_MESSAGE = "Сервіс тимчасово недоступний. Спробуйте за кілька хвилин.";
export const TIMEOUT_MESSAGE = "Відповідь затримується. Спробуйте ще раз.";

const tr = (s: string) => t(s);

export function serverText(s: string): string {
  return tr(s);
}

export function userMessage(error: unknown, fallback = GENERIC_MESSAGE): string {
  if (typeof console !== "undefined") console.error("[LotScope]", error);
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) return tr(TIMEOUT_MESSAGE);
  if (error instanceof TypeError) return tr(NETWORK_MESSAGE);
  if (error instanceof Error && isUserText(error.message)) return tr(error.message);
  return tr(fallback);
}

export function statusMessage(status: number, fallback = GENERIC_MESSAGE): string {
  if (status === 408 || status === 504) return tr(TIMEOUT_MESSAGE);
  if (status === 413) return tr("Забагато даних за один раз. Спробуйте з меншою кількістю фото або файлів.");
  if (status === 429) return tr("Забагато запитів. Зачекайте хвилину і спробуйте ще раз.");
  if (status >= 500) return tr(UNAVAILABLE_MESSAGE);
  return tr(fallback);
}

export function responseMessage(url: string, status: number, data: unknown, fallback = GENERIC_MESSAGE): string {
  const error = data && typeof data === "object" && "error" in data ? (data as { error?: unknown }).error : undefined;
  if (typeof console !== "undefined") console.error("[LotScope]", url, status, data);
  if (typeof error === "string" && isUserText(error)) return tr(error);
  return statusMessage(status, fallback);
}
