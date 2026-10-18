import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/unbounded";
import { AppShell } from "@/components/AppShell";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "LotScope — оцінка лотів з аукціонів США",
  description:
    "ШІ-аналіз пошкоджень за фото, оцінка ремонту та ціна під ключ для компаній, що привозять авто зі США.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uk" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full" suppressHydrationWarning>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
