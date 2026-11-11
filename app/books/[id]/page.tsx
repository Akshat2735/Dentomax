import { DocumentReaderPage } from "@/components/document-reader-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reader",
  robots: { index: false, follow: false },
};

export default async function BookReaderRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DocumentReaderPage id={id} />;
}
