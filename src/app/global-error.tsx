"use client";

import { useEffect } from "react";

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("[LotScope] Критична помилка", error.digest ?? "", error);
  }, [error]);

  return (
    <html lang="uk">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#f6f7f9", color: "#101828", fontFamily: "system-ui, sans-serif" }}>
        <title>LotScope</title>
        <div style={{ maxWidth: 420, padding: 32, textAlign: "center", background: "#fff", border: "1px solid #e4e7ec", borderRadius: 16 }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>LotScope тимчасово недоступний</h1>
          <p style={{ margin: "10px 0 0", color: "#475467", fontSize: 15 }}>Спробуйте оновити сторінку за хвилину.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ marginTop: 20, height: 40, padding: "0 18px", border: 0, borderRadius: 10, background: "#2b59ff", color: "#fff", fontWeight: 600, cursor: "pointer" }}
          >
            Спробувати ще раз
          </button>
        </div>
      </body>
    </html>
  );
}
