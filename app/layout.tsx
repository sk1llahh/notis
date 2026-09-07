import type { Metadata } from "next";
import { Navbar } from "@/shared/ui/navbar";
import "./globals.css";
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: {
    default: "Notis — Образовательная платформа графов знаний",
    template: "%s | Notis",
  },
  description:
    "Интерактивные графы курсов, расчет тумана войны (Fog of War) и интервальные повторения SuperMemo-2.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-surface-canvas text-text-primary font-sans">
        <Navbar />
        <div className="flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}

