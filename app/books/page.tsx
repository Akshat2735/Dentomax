import { LibraryPage } from "@/components/library-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book library",
  description: "Sign in to browse the protected Dentomax dental reference library by subject, topic and file type.",
  robots: { index: false, follow: false },
};

export default function BooksPage() {
  return <main className="library-shell" id="main-content"><LibraryPage /></main>;
}
