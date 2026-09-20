"use client";

import { useEffect, useRef, useState } from "react";
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
  type RenderTask,
} from "pdfjs-dist";
import { supabase } from "@/lib/supabase-browser";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type ViewerState = "requesting" | "loading" | "ready" | "revoked" | "error";

type PdfViewerProps = {
  documentId: string;
  title: string;
  subject: string;
  onClose: () => void;
};

function functionStatus(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("context" in error)) return null;
  const context = (error as { context?: unknown }).context;
  return context instanceof Response ? context.status : null;
}

export function PdfViewer({ documentId, title, subject, onClose }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ViewerState>("requesting");
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.25);
  const [renderError, setRenderError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  useEffect(() => {
    function handleFullscreenChange() {
      setFullscreen(document.fullscreenElement === panelRef.current);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !document.fullscreenElement) onClose();
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  async function toggleFullscreen() {
    if (!panelRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await panelRef.current.requestFullscreen();
  }

  useEffect(() => {
    let disposed = false;
    let loadingTask: ReturnType<typeof getDocument> | null = null;

    async function loadDocument() {
      setState("requesting");
      setPdf(null);
      setPageNumber(1);
      setRenderError("");
      setFallbackUrl(null);

      // R2 URLs are created only by the server-side enforcement function.
      const { data, error } = await supabase.functions.invoke<{ url: string }>(
        "document-signed-url",
        { body: { documentId } },
      );

      if (disposed) return;
      if (error) {
        setState(functionStatus(error) === 403 ? "revoked" : "error");
        return;
      }
      if (!data?.url) {
        setState("error");
        return;
      }

      try {
        setState("loading");
        setFallbackUrl(data.url);
        // Fetch the signed object once and hand PDF.js bytes instead of letting
        // it issue range requests directly to the cross-origin R2 URL.
        const documentResponse = await fetch(data.url);
        if (!documentResponse.ok) throw new Error("document_fetch_failed");
        const documentBytes = await documentResponse.arrayBuffer();
        loadingTask = getDocument({ data: documentBytes });
        const loadedPdf = await loadingTask.promise;
        if (disposed) {
          await loadedPdf.destroy();
          return;
        }
        setPdf(loadedPdf);
        setState("ready");
      } catch {
        if (!disposed) {
          // Some R2 buckets allow navigation to a signed PDF but do not expose
          // the object to JavaScript because of their CORS policy. Keep the
          // protected URL as a native browser-viewer fallback in that case.
          setState("error");
        }
      }
    }

    void loadDocument();
    return () => {
      disposed = true;
      void loadingTask?.destroy();
    };
  }, [documentId]);

  useEffect(() => {
    if (!pdf || !canvasRef.current || state !== "ready") return;
    const loadedPdf = pdf;
    let disposed = false;
    let renderTask: RenderTask | null = null;

    async function renderPage() {
      try {
        const page = await loadedPdf.getPage(pageNumber);
        if (disposed || !canvasRef.current) return;
        const viewport = page.getViewport({ scale });
        const outputScale = window.devicePixelRatio || 1;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("canvas_unavailable");

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        renderTask = page.render({
          canvasContext: context,
          viewport,
          transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
        });
        await renderTask.promise;
      } catch (error) {
        if (!disposed && (error as { name?: string }).name !== "RenderingCancelledException") {
          setRenderError("This PDF could not be rendered. Close the viewer and try again.");
        }
      }
    }

    void renderPage();
    return () => {
      disposed = true;
      renderTask?.cancel();
    };
  }, [pageNumber, pdf, scale, state]);

  const loading = state === "requesting" || state === "loading";
  const showingPdf = state === "ready" && pdf && !renderError;

  return (
    <section className="viewer-backdrop" role="dialog" aria-modal="true" aria-label={`PDF viewer: ${title}`}>
      <div ref={panelRef} className={`viewer-panel ${fullscreen ? "is-fullscreen" : ""}`} onContextMenu={(event) => event.preventDefault()}>
        <header className="viewer-header">
          <div className="viewer-title-group"><a className="viewer-brand" href="/" aria-label="Dentomax Library home"><span className="brand-mark">D</span><span>Dentomax Library</span></a><div className="viewer-title"><p className="eyebrow">{subject}</p><h2 title={title}>{title}</h2></div></div>
          <button className="viewer-close" type="button" onClick={onClose} aria-label="Back to library"><span aria-hidden="true">←</span><span>Back to library</span></button>
        </header>

        {loading && <p className="viewer-message" aria-live="polite">Preparing your secure PDF viewer…</p>}
        {state === "revoked" && <p className="notice error" role="alert">Your access was paused while this page was open. The PDF cannot be loaded. Contact an administrator for help.</p>}
        {state === "error" && fallbackUrl
          ? <p className="viewer-fallback-note" role="status">Opening this document in the browser reader… <a href={fallbackUrl} target="_blank" rel="noreferrer">Open in a new tab</a></p>
          : state === "error" && <p className="notice error" role="alert">We could not open this PDF. Please close the viewer and try again.</p>}
        {renderError && <p className="notice error" role="alert">{renderError}</p>}
        {state === "error" && fallbackUrl && <iframe className="pdf-native-fallback" title={`Native PDF viewer: ${title}`} src={fallbackUrl} />}

        {showingPdf && <>
          <div className="viewer-controls" aria-label="PDF viewer controls">
            <div className="viewer-page-controls"><button type="button" aria-label="Previous page" onClick={() => setPageNumber((page) => Math.max(1, page - 1))} disabled={pageNumber === 1}>‹</button><span>Page {pageNumber} <i>of</i> {pdf.numPages}</span><button type="button" aria-label="Next page" onClick={() => setPageNumber((page) => Math.min(pdf.numPages, page + 1))} disabled={pageNumber === pdf.numPages}>›</button></div>
            <div className="viewer-zoom-controls"><button type="button" aria-label="Zoom out" onClick={() => setScale((current) => Math.max(.75, current - .25))} disabled={scale <= .75}>−</button><span>{Math.round(scale * 100)}%</span><button type="button" aria-label="Zoom in" onClick={() => setScale((current) => Math.min(2.5, current + .25))} disabled={scale >= 2.5}>+</button></div>
            <button className="viewer-fullscreen" type="button" onClick={() => void toggleFullscreen()}>{fullscreen ? "Exit full screen" : "Full screen"}</button>
          </div>
          <div className="pdf-canvas-wrap">
            <canvas ref={canvasRef} aria-label={`${title}, page ${pageNumber}`} />
          </div>
          <p className="viewer-note">Right-click is disabled here as minor friction; it is not a security control.</p>
        </>}
      </div>
    </section>
  );
}
