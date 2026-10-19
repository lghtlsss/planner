import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { Inter } from "next/font/google";
import { Provider } from "@/providers/provider";
import { cn } from "cn";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Планер",
  description: "Учебный планер",
  applicationName: "Планер",
  appleWebApp: {
    capable: true,
    title: "Планер",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f3fb",
};

const THEME_INIT_SCRIPT = `
(function() {
  var mq = window.matchMedia('(prefers-color-scheme: dark)');

  function apply() {
    try {
      var theme = localStorage.getItem('app-theme') || 'system';
      var isDark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', isDark);
    } catch (e) {}
  }

  apply();
  window.addEventListener('storage', apply);
  mq.addEventListener('change', apply);
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={cn("h-full", "antialiased", "font-sans", inter.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
