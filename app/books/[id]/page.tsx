import { DocumentReaderPage } from "@/components/document-reader-page";

export default async function BookReaderRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DocumentReaderPage id={id} />;
}
