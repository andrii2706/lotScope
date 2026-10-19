export const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
