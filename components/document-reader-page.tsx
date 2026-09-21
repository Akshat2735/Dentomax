"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PdfViewer } from "@/components/pdf-viewer";
import { supabase } from "@/lib/supabase-browser";

type DocumentInfo = { id: string; title: string; subject: string; file_type: "pdf" | "epub" | "zip" };

export function DocumentReaderPage({ id }: { id: string }) {
  const router = useRouter();
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null);
  const [state, setState] = useState<"loading" | "missing" | "error">("loading");
  useEffect(() => {
    let active = true;
    async function load() {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { router.replace("/sign-in"); return; }
      const { data, error } = await supabase.from("documents").select("id,title,subject,file_type").eq("id", id).eq("deletion_status", "active").maybeSingle();
      if (!active) return;
      if (error) { console.error("Unable to load document metadata", error); setState("error"); return; }
      if (!data || data.file_type !== "pdf") { setState("missing"); return; }
      setDocumentInfo(data as DocumentInfo);
    }
    void load(); return () => { active = false; };
  }, [id, router]);
  if (documentInfo) return <PdfViewer documentId={documentInfo.id} title={documentInfo.title} subject={documentInfo.subject} onClose={() => router.back()} />;
  return <main className="system-state"><a className="brand-lockup" href="/library"><span className="brand-mark">D</span><span>Dentomax <small>Library</small></span></a>{state === "loading" ? <><span className="system-spinner"/><p>Loading document…</p></> : <><h1>Unable to load this document.</h1><p>{state === "missing" ? "This document is unavailable or you no longer have access." : "Please try again or return to the library."}</p><a className="button" href="/library">Return to library</a></>}</main>;
}
