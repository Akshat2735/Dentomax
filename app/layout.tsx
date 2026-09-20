import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dentomax Library Admin",
  description: "Admin tools for the Dentomax library",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
