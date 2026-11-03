import type { Metadata } from "next";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import { AppShell } from "@/components/layout/AppShell";
import { THEME_BOOT_SCRIPT } from "@/lib/client/theme";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "LotScope — оцінка лотів з аукціонів",
  description:
    "ШІ-аналіз пошкоджень за фото, оцінка ремонту та ціна під ключ для компаній, що привозять авто з аукціонів США, Канади, Європи та ОАЕ.",
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
