export const NETWORK_MESSAGE = "Немає з’єднання з інтернетом. Перевірте мережу і спробуйте ще раз.";
export const GENERIC_MESSAGE = "Щось пішло не так. Спробуйте ще раз.";
export const UNAVAILABLE_MESSAGE = "Сервіс тимчасово недоступний. Спробуйте за кілька хвилин.";
export const TIMEOUT_MESSAGE = "Відповідь затримується. Спробуйте ще раз.";

const READABLE = /[а-яіїєґ]/i;

export function userMessage(error: unknown, fallback = GENERIC_MESSAGE): string {
  if (typeof console !== "undefined") console.error("[LotScope]", error);
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) return TIMEOUT_MESSAGE;
  if (error instanceof TypeError) return NETWORK_MESSAGE;
  if (error instanceof Error && READABLE.test(error.message)) return error.message;
  return fallback;
}

export function statusMessage(status: number, fallback = GENERIC_MESSAGE): string {
  if (status === 408 || status === 504) return TIMEOUT_MESSAGE;
  if (status === 413) return "Забагато даних за один раз. Спробуйте з меншою кількістю фото або файлів.";
  if (status === 429) return "Забагато запитів. Зачекайте хвилину і спробуйте ще раз.";
  if (status >= 500) return UNAVAILABLE_MESSAGE;
  return fallback;
}

export function responseMessage(url: string, status: number, data: unknown, fallback = GENERIC_MESSAGE): string {
  const error = data && typeof data === "object" && "error" in data ? (data as { error?: unknown }).error : undefined;
  if (typeof console !== "undefined") console.error("[LotScope]", url, status, data);
  if (typeof error === "string" && READABLE.test(error)) return error;
  return statusMessage(status, fallback);
}
