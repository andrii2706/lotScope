"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("[LotScope] Помилка на сторінці", error.digest ?? "", error);
  }, [error]);

  return (
    <div className="card mx-auto mt-10 max-w-lg p-8 text-center">
      <span className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-warn-bg text-warn">
        <TriangleAlert className="size-6" />
      </span>
      <h1 className="text-xl font-bold tracking-tight">Сторінку не вдалося показати</h1>
      <p className="mt-2 text-sm text-muted">Щось пішло не так. Спробуйте ще раз або поверніться до звітів.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex min-h-10 items-center gap-2 rounded-[10px] bg-accent px-4 text-sm font-semibold text-accent-ink transition hover:brightness-110"
        >
          <RotateCcw className="size-4" /> Спробувати ще раз
        </button>
        <Link href="/history" className="inline-flex min-h-10 items-center rounded-[10px] border border-line2 bg-surface px-4 text-sm font-semibold transition hover:bg-panel2">
          До звітів
        </Link>
      </div>
    </div>
  );
}
