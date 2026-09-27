import type { Metadata } from "next";
import "./globals.css";
import "./atmosphere.css";
import "./scroll-experience.css";
import "./micro-interactions.css";
import "./course-catalogue.css";
import "./library-experience.css";
import "./home-experience.css";
import "./study-dashboard.css";
import "./course-detail-experience.css";
import "./account-experience.css";
import "./design-system.css";
import { SiteAtmosphere } from "@/components/site-atmosphere";
import { ScrollExperience } from "@/components/scroll-experience";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/library-navigation";
import { SiteToast } from "@/components/site-toast";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Dentomax Library", description: "A protected clinical learning and reference environment." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteAtmosphere />
        <ScrollExperience />
        <SiteHeader />
        <PageTransition>{children}</PageTransition>
        <SiteFooter />
        <SiteToast />
      </body>
    </html>
  );
}
