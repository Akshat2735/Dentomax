import { DocumentReaderPage } from "@/components/document-reader-page";
export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <DocumentReaderPage id={id} />; }
