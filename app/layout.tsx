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

export const metadata: Metadata = {
  title: { default: "Dentomax Library | Dental courses and a protected reference library", template: "%s | Dentomax Library" },
  description: "Explore Dentomax's catalogue of professional dental, facial aesthetics and cosmetology courses, and sign in to a protected clinical reference library.",
  applicationName: "Dentomax Library",
};

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
