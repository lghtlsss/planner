import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { Provider } from "@/providers/provider";
import { cn } from "cn";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Planner app",
  description: "",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", "font-sans", inter.variable)}
    >
      <Provider>
        <body className="min-h-full flex flex-col">{children}</body>
      </Provider>
    </html>
  );
}
