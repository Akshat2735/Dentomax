import type { Metadata } from "next";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = { title: "Dentomax Library", description: "A protected clinical learning and reference environment." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><div className="app-frame">{children}</div><SiteFooter /></body>
    </html>
  );
}
