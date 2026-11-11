import { AccountPage } from "@/components/account-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

export default function Account() { return <AccountPage />; }
