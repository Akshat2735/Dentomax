"use client";

import { ChangeEvent, DragEvent, FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024 * 1024;
const MAX_FILES_PER_BATCH = 20;
const MAX_BATCH_SIZE_BYTES = 12 * 1024 * 1024 * 1024;

type AccessState = "checking" | "signed_out" | "forbidden" | "ready" | "failed";
type ItemStatus = "ready" | "preparing" | "uploading" | "finalizing" | "complete" | "error";
type RemoteUpload = {
  clientId: string;
  mode: "put" | "multipart";
  session: string;
  uploadUrl?: string;
  partSize?: number;
  partCount?: number;
};
type QueuedFile = {
  id: string;
  file: File;
  fileType: "pdf" | "epub" | "zip";
  title: string;
  status: ItemStatus;
  progress: number;
  error?: string;
};

const errorMessages: Record<string, string> = {
  unauthorized: "Your session has expired. Please sign in again.",
  forbidden: "Only active administrator accounts can upload documents.",
  invalid_file_metadata: "One or more files have invalid metadata.",
  invalid_batch: "A batch can contain up to 20 files and 12 GB in total.",
  upload_initiation_failed: "The upload could not be prepared. Please try again.",
  invalid_upload_session: "The secure upload session expired. Start the file again.",
  uploaded_size_mismatch: "The uploaded file size did not match and was removed.",
  uploaded_content_type_invalid: "The uploaded file type did not match and was removed.",
  uploaded_file_invalid: "The file contents do not match its selected format and were removed.",
  document_creation_failed: "The library record could not be created. The file was removed.",
  document_creation_rollback_failed: "The library record could not be created and cleanup needs attention. Please contact an administrator.",
  cancel_failed: "The incomplete upload could not be cleaned up automatically.",
  request_failed: "The upload request was interrupted. Check your connection and retry the file.",
  r2_network_error: "R2 storage blocked this browser upload. Add this app origin to the R2 bucket CORS policy, then retry the file.",
  r2_upload_failed: "The storage service rejected the upload. Retry the file or choose another supported format.",
  missing_upload_etag: "The upload completed without a storage confirmation. Retry the file.",
};

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

function fileTypeFor(filename: string): QueuedFile["fileType"] | null {
  if (/\.pdf$/i.test(filename)) return "pdf";
  if (/\.epub$/i.test(filename)) return "epub";
  if (/\.zip$/i.test(filename)) return "zip";
  return null;
}

function contentTypeFor(fileType: QueuedFile["fileType"]): string {
  return fileType === "pdf" ? "application/pdf" : fileType === "epub" ? "application/epub+zip" : "application/zip";
}

function defaultTitle(filename: string): string {
  return filename.replace(/\.(pdf|epub|zip)$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function parseTags(value: string): string[] {
  return [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))];
}

async function invokeFunction<T>(name: string, accessToken: string, body: unknown): Promise<T> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  let payload: Record<string, unknown> = {};
  try { payload = await response.json(); } catch { /* handled below */ }
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "request_failed");
  return payload as T;
}

function putToR2(
  url: string,
  blob: Blob,
  onProgress: (uploadedBytes: number) => void,
  contentType?: string,
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    if (contentType) request.setRequestHeader("Content-Type", contentType);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded);
    };
    request.onerror = () => reject(new Error("r2_network_error"));
    request.onabort = () => reject(new Error("r2_upload_aborted"));
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error("r2_upload_failed"));
        return;
      }
      resolve(request.getResponseHeader("ETag"));
    };
    request.send(blob);
  });
}

export function AdminDocumentUploadForm() {
  const [accessState, setAccessState] = useState<AccessState>("checking");
  const [items, setItems] = useState<QueuedFile[]>([]);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("general");
  const [tags, setTags] = useState("");
  const [batchError, setBatchError] = useState("");
  const [running, setRunning] = useState(false);
  const [draggingFiles, setDraggingFiles] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData.user;
      if (userError || !user) return setAccessState("signed_out");
      const { data: profile, error: profileError } = await supabase
        .from("profiles").select("role, status").eq("id", user.id).maybeSingle();
      if (profileError) return setAccessState("failed");
      setAccessState(profile?.status === "active" && profile.role === "admin" ? "ready" : "forbidden");
    }
    void checkAccess();
  }, []);

  function updateItem(id: string, patch: Partial<QueuedFile>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function queueFiles(selected: File[]) {
    if (!selected.length) return;
    const invalid = selected.find((file) => !fileTypeFor(file.name) || !file.size || file.size > MAX_FILE_SIZE_BYTES);
    if (invalid) {
      setBatchError(`“${invalid.name}” must be a non-empty PDF, EPUB, or ZIP file within the 3 GB per-file limit.`);
      return;
    }
    setBatchError("");
    setItems((current) => {
      const known = new Set(current.map((item) => `${item.file.name}:${item.file.size}:${item.file.lastModified}`));
      const additions = selected.filter((file) => !known.has(`${file.name}:${file.size}:${file.lastModified}`)).flatMap((file) => {
        const fileType = fileTypeFor(file.name);
        return fileType ? [{ id: crypto.randomUUID(), file, fileType, title: defaultTitle(file.name), status: "ready" as const, progress: 0 }] : [];
      });
      return [...current, ...additions];
    });
  }

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    queueFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function dropFiles(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDraggingFiles(false);
    queueFiles(Array.from(event.dataTransfer.files));
  }

  async function cancelRemoteUpload(accessToken: string, session: string) {
    try { await invokeFunction("admin-upload-cancel", accessToken, { session }); } catch { /* reported by the original error */ }
  }

  async function uploadOne(item: QueuedFile, remote: RemoteUpload, accessToken: string) {
    let fileTransferred = false;
    try {
      updateItem(item.id, { status: "uploading", progress: 0, error: undefined });
      const parts: Array<{ partNumber: number; etag: string }> = [];
      if (remote.mode === "put") {
        if (!remote.uploadUrl) throw new Error("upload_initiation_failed");
        await putToR2(remote.uploadUrl, item.file, (loaded) => updateItem(item.id, {
          progress: Math.round((loaded / item.file.size) * 100),
        }), contentTypeFor(item.fileType));
      } else {
        if (!remote.partSize || !remote.partCount) throw new Error("upload_initiation_failed");
        let bytesUploaded = 0;
        for (let partNumber = 1; partNumber <= remote.partCount; partNumber += 1) {
          const start = (partNumber - 1) * remote.partSize;
          const chunk = item.file.slice(start, Math.min(start + remote.partSize, item.file.size));
          const signed = await invokeFunction<{ uploadUrl: string }>("admin-upload-part-url", accessToken, {
            session: remote.session, partNumber,
          });
          const etag = await putToR2(signed.uploadUrl, chunk, (loaded) => updateItem(item.id, {
            progress: Math.round(((bytesUploaded + loaded) / item.file.size) * 100),
          }));
          if (!etag) throw new Error("missing_upload_etag");
          parts.push({ partNumber, etag });
          bytesUploaded += chunk.size;
        }
      }

      fileTransferred = true;
      updateItem(item.id, { status: "finalizing", progress: 100 });
      const completed = await invokeFunction<{ id?: string }>("admin-upload-complete", accessToken, { session: remote.session, parts });
      if (!completed.id) throw new Error("document_creation_failed");
      updateItem(item.id, { status: "complete", progress: 100 });
    } catch (error) {
      if (!fileTransferred) await cancelRemoteUpload(accessToken, remote.session);
      const code = error instanceof Error ? error.message : "request_failed";
      updateItem(item.id, {
        status: "error",
        error: errorMessages[code] ?? `Upload failed (${code}). You can retry this file in a new batch.`,
      });
    }
  }

  async function startBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running) return;
    const candidates = items.filter((item) => item.status === "ready" || item.status === "error");
    if (!candidates.length) return setBatchError("Select at least one file first.");
    if (!subject.trim()) return setBatchError("Enter a subject for this batch.");
    if (candidates.length > MAX_FILES_PER_BATCH || candidates.reduce((total, item) => total + item.file.size, 0) > MAX_BATCH_SIZE_BYTES) {
      return setBatchError("A batch can contain up to 20 files and 12 GB in total.");
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) return setBatchError("Sign in with an active administrator account before uploading.");

    setRunning(true);
    setBatchError("");
    candidates.forEach((item) => updateItem(item.id, { status: "preparing", progress: 0, error: undefined }));
    try {
      const prepared = await invokeFunction<{ uploads: RemoteUpload[] }>("admin-upload-initiate", accessToken, {
        files: candidates.map((item) => ({
          clientId: item.id,
          title: item.title.trim(),
          subject: subject.trim(),
          topic: topic.trim() || "general",
          tags: parseTags(tags),
          fileName: item.file.name,
          fileSize: item.file.size,
          fileType: item.fileType,
        })),
      });
      const remoteById = new Map(prepared.uploads.map((upload) => [upload.clientId, upload]));
      const queue = candidates.map((item) => ({ item, remote: remoteById.get(item.id) })).filter((entry): entry is { item: QueuedFile; remote: RemoteUpload } => Boolean(entry.remote));
      if (queue.length !== candidates.length) throw new Error("upload_initiation_failed");
      const workers = Array.from({ length: Math.min(2, queue.length) }, async () => {
        while (queue.length) {
          const next = queue.shift();
          if (next) await uploadOne(next.item, next.remote, accessToken);
        }
      });
      await Promise.all(workers);
    } catch (error) {
      const code = error instanceof Error ? error.message : "upload_initiation_failed";
      setBatchError(errorMessages[code] ?? "The batch could not be started. Please try again.");
      candidates.forEach((item) => updateItem(item.id, { status: "error", error: "The batch could not be prepared." }));
    } finally {
      setRunning(false);
    }
  }

  if (accessState !== "ready") {
    const messages: Record<Exclude<AccessState, "ready">, string> = {
      checking: "Checking your administrator access…",
      signed_out: "Sign in with an active administrator account to upload documents.",
      forbidden: "This account is not an active administrator and cannot upload documents.",
      failed: "We could not confirm your administrator access. Please refresh and try again.",
    };
    return <section className="access-card" aria-live="polite"><p>{messages[accessState]}</p>{accessState === "signed_out" && <a className="button" href="/admin/sign-in">Admin sign in</a>}</section>;
  }

  return (
    <form className="upload-card" onSubmit={startBatch}>
      <div className="field-grid">
        <label>Subject<input required value={subject} maxLength={100} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Facial Esthetics" disabled={running} /></label>
        <label>Topic<input value={topic} maxLength={100} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Smile design" disabled={running} /></label>
        <label className="full-width">Tags <span className="optional">optional, comma-separated; applied to this batch</span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="composite, guide, esthetics" disabled={running} /></label>
      </div>
      <label className={`file-field upload-dropzone ${draggingFiles ? "dragging" : ""}`} htmlFor="pdf-files" onDragEnter={(event) => { event.preventDefault(); setDraggingFiles(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setDraggingFiles(false); }} onDrop={dropFiles}>
        <span className="dropzone-icon">↑</span><strong>Drop library files here</strong><span>or <u>browse from your computer</u></span><small>PDF, EPUB, ZIP · up to 20 files · 3 GB per file</small>
        <input id="pdf-files" name="files" className="file-picker-input" type="file" multiple accept="application/pdf,application/epub+zip,application/zip,.pdf,.epub,.zip" disabled={running} onChange={selectFiles} />
      </label>
      {items.length > 0 && <section className="queue" aria-live="polite">
        <div className="queue-heading"><div><strong>Upload queue</strong><span>{items.length} file{items.length === 1 ? "" : "s"} ready</span></div><span>{formatBytes(items.reduce((total, item) => total + item.file.size, 0))} total</span></div>
        {items.map((item) => <div className="queue-item" key={item.id}>
          <div className="queue-file"><span className="upload-file-icon">{item.fileType.toUpperCase()}</span><div><strong title={item.file.name}>{item.file.name}</strong><small>{formatBytes(item.file.size)} · {item.status === "complete" ? "Uploaded" : item.status === "ready" ? "Ready to upload" : item.status === "error" ? "Needs attention" : `${item.progress}%`}</small></div></div>
          <label className="title-field"><span>Title</span><input value={item.title} maxLength={300} disabled={running || item.status === "complete"} onChange={(event) => updateItem(item.id, { title: event.target.value })} /></label>
          {item.status === "ready" || item.status === "error" ? <button type="button" className="text-button queue-remove" aria-label={`Remove ${item.file.name}`} disabled={running} onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}>×</button> : <span className={`status ${item.status}`}>{item.status === "complete" ? "Added" : `${item.progress}%`}</span>}
          {(item.status === "uploading" || item.status === "finalizing") && <div className="progress-track item-progress"><div className="progress-bar" style={{ width: `${item.progress}%` }} /></div>}
          {item.error && <p className="item-error" role="alert">{item.error}</p>}
        </div>)}
      </section>}
      {batchError && <p className="notice error" role="alert">{batchError}</p>}
      <button className="button" type="submit" disabled={running}>{running ? "Uploading batch…" : "Upload selected files"}</button>
    </form>
  );
}
