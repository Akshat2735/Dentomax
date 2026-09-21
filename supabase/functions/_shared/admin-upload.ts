import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "npm:@aws-sdk/client-s3@3.777.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.777.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

export const R2_BUCKET = "dentomax-library";
export const R2_ENDPOINT =
  "https://bc06c1eb78ba4b1f3c88125f4ff08e49.r2.cloudflarestorage.com";

// This direct-to-R2 flow intentionally supports the library's existing ~1 GB PDFs.
export const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024 * 1024;
export const MULTIPART_THRESHOLD_BYTES = 64 * 1024 * 1024;
export const MULTIPART_PART_SIZE_BYTES = 64 * 1024 * 1024;
export const MAX_FILES_PER_BATCH = 20;
export const MAX_BATCH_SIZE_BYTES = 12 * 1024 * 1024 * 1024;
export const PRESIGNED_URL_EXPIRY_SECONDS = 5 * 60;
const UPLOAD_SESSION_EXPIRY_SECONDS = 12 * 60 * 60;

const MAX_TITLE_LENGTH = 300;
const MAX_SUBJECT_LENGTH = 100;
const MAX_TOPIC_LENGTH = 100;
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 50;

export type UploadMode = "put" | "multipart";
export type DocumentFileType = "pdf" | "epub" | "zip";

const fileTypes: Record<DocumentFileType, { extension: RegExp; contentType: string }> = {
  pdf: { extension: /\.pdf$/i, contentType: "application/pdf" },
  epub: { extension: /\.epub$/i, contentType: "application/epub+zip" },
  zip: { extension: /\.zip$/i, contentType: "application/zip" },
};

export interface UploadMetadata {
  clientId: string;
  title: string;
  subject: string;
  topic: string;
  tags: string[];
  fileName: string;
  fileSize: number;
  fileType: DocumentFileType;
}

export interface UploadSession {
  v: 1;
  userId: string;
  key: string;
  mode: UploadMode;
  uploadId?: string;
  partSize?: number;
  partCount?: number;
  metadata: UploadMetadata;
  expiresAt: number;
}

export interface AdminContext {
  callerId: string;
  adminClient: ReturnType<typeof createClient>;
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  const configuredOrigins = (Deno.env.get("APP_ORIGIN") ?? "http://localhost:3000")
    .split(",").map((value) => value.trim()).filter(Boolean);
  const allowed = origin && (configuredOrigins.includes(origin) || /^http:\/\/localhost(?::\d+)?$/.test(origin));
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function json(
  request: Request,
  body: Record<string, unknown>,
  status = 200,
): Response {
  return Response.json(body, { status, headers: corsHeaders(request) });
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  return authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
}

// Every upload endpoint checks the caller before parsing request input or contacting R2.
export async function requireActiveAdmin(
  request: Request,
): Promise<AdminContext | Response> {
  const token = bearerToken(request);
  if (!token) return json(request, { error: "unauthorized" }, 401);

  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const anonKey = requiredEnv("SUPABASE_ANON_KEY");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const callerClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser(token);
  const caller = userData.user;
  if (userError || !caller) return json(request, { error: "unauthorized" }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role, status")
    .eq("id", caller.id)
    .maybeSingle();
  if (profileError) {
    console.error("Unable to check upload admin role", { callerId: caller.id });
    return json(request, { error: "internal_error" }, 500);
  }
  if (profile?.status !== "active" || profile.role !== "admin") {
    console.warn("Direct upload denied", {
      callerId: caller.id,
      timestamp: new Date().toISOString(),
    });
    return json(request, { error: "forbidden" }, 403);
  }
  return { callerId: caller.id, adminClient };
}

function asTrimmedString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

export function validateUploadMetadata(value: unknown): UploadMetadata | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const clientId = asTrimmedString(input.clientId);
  const title = asTrimmedString(input.title);
  const subject = asTrimmedString(input.subject);
  const topic = asTrimmedString(input.topic) || "general";
  const fileName = asTrimmedString(input.fileName);
  const fileSize = input.fileSize;
  const fileType = input.fileType;
  const tagsInput = input.tags;

  if (!clientId || !title || !subject || !fileName ||
    title.length > MAX_TITLE_LENGTH || subject.length > MAX_SUBJECT_LENGTH ||
    topic.length > MAX_TOPIC_LENGTH || typeof fileType !== "string" || !(fileType in fileTypes) ||
    !fileTypes[fileType as DocumentFileType].extension.test(fileName) ||
    !Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_SIZE_BYTES ||
    !Array.isArray(tagsInput)) {
    return null;
  }

  const tags = tagsInput.map(asTrimmedString);
  if (tags.some((tag) => !tag || tag.length > MAX_TAG_LENGTH)) return null;
  const uniqueTags = [...new Set(tags as string[])];
  if (uniqueTags.length > MAX_TAGS) return null;

  return { clientId, title, subject, topic, tags: uniqueTags, fileName, fileSize, fileType: fileType as DocumentFileType };
}

function slugifySegment(value: string): string {
  const slug = value.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "untitled";
}

export function storagePathFor(metadata: UploadMetadata): string {
  const filename = metadata.fileName.replace(/\.(pdf|epub|zip)$/i, "");
  return `${slugifySegment(metadata.subject)}/${slugifySegment(metadata.topic)}/${crypto.randomUUID()}-${slugifySegment(filename)}.${metadata.fileType}`;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sessionSignature(payload: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(requiredEnv("UPLOAD_SESSION_SECRET")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, payload));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export async function signUploadSession(
  session: Omit<UploadSession, "v" | "expiresAt">,
): Promise<string> {
  const payload = new TextEncoder().encode(JSON.stringify({
    ...session,
    v: 1,
    expiresAt: Date.now() + UPLOAD_SESSION_EXPIRY_SECONDS * 1000,
  } satisfies UploadSession));
  return `${bytesToBase64Url(payload)}.${bytesToBase64Url(await sessionSignature(payload))}`;
}

export async function verifyUploadSession(
  token: unknown,
  callerId: string,
): Promise<UploadSession | null> {
  if (typeof token !== "string") return null;
  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra) return null;

  try {
    const payload = base64UrlToBytes(encodedPayload);
    const signature = base64UrlToBytes(encodedSignature);
    if (!constantTimeEqual(signature, await sessionSignature(payload))) return null;
    const decoded = JSON.parse(new TextDecoder().decode(payload)) as UploadSession;
    if (decoded.v !== 1 || decoded.userId !== callerId || decoded.expiresAt <= Date.now() ||
      !decoded.key || !decoded.mode || !decoded.metadata ||
      !validateUploadMetadata(decoded.metadata)) return null;
    if (decoded.mode === "multipart" &&
      (!decoded.uploadId || !decoded.partSize || !decoded.partCount || decoded.partCount < 1)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function r2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      // R2 credentials are available only inside Edge Functions, never in browser code.
      accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

export async function initiateDirectUpload(
  callerId: string,
  metadata: UploadMetadata,
): Promise<Record<string, unknown>> {
  const key = storagePathFor(metadata);
  const r2 = r2Client();
  if (metadata.fileSize <= MULTIPART_THRESHOLD_BYTES) {
    const session = await signUploadSession({
      userId: callerId,
      key,
      mode: "put",
      metadata,
    });
    const uploadUrl = await getSignedUrl(
      r2,
      new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: fileTypes[metadata.fileType].contentType }),
      { expiresIn: PRESIGNED_URL_EXPIRY_SECONDS },
    );
    return { clientId: metadata.clientId, mode: "put", session, uploadUrl };
  }

  const started = await r2.send(new CreateMultipartUploadCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: fileTypes[metadata.fileType].contentType,
  }));
  if (!started.UploadId) throw new Error("multipart_upload_id_missing");
  const partCount = Math.ceil(metadata.fileSize / MULTIPART_PART_SIZE_BYTES);
  const session = await signUploadSession({
    userId: callerId,
    key,
    mode: "multipart",
    uploadId: started.UploadId,
    partSize: MULTIPART_PART_SIZE_BYTES,
    partCount,
    metadata,
  });
  return {
    clientId: metadata.clientId,
    mode: "multipart",
    session,
    partSize: MULTIPART_PART_SIZE_BYTES,
    partCount,
  };
}

export async function signPartUploadUrl(session: UploadSession, partNumber: number): Promise<string> {
  if (session.mode !== "multipart" || !session.uploadId || !session.partCount ||
    partNumber < 1 || partNumber > session.partCount) throw new Error("invalid_part_number");
  return getSignedUrl(
    r2Client(),
    new UploadPartCommand({
      Bucket: R2_BUCKET,
      Key: session.key,
      UploadId: session.uploadId,
      PartNumber: partNumber,
    }),
    { expiresIn: PRESIGNED_URL_EXPIRY_SECONDS },
  );
}

async function fileSignatureIsValid(r2: S3Client, key: string, fileType: DocumentFileType): Promise<boolean> {
  const object = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key, Range: "bytes=0-4" }));
  const body = object.Body as { transformToByteArray?: () => Promise<Uint8Array> } | undefined;
  if (!body?.transformToByteArray) return false;
  const bytes = await body.transformToByteArray();
  if (fileType === "pdf") return new TextDecoder().decode(bytes) === "%PDF-";
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

export async function finalizeDirectUpload(
  context: AdminContext,
  session: UploadSession,
  rawParts: unknown,
): Promise<{ response: Response; uploaded: boolean }> {
  const { callerId, adminClient } = context;
  const existing = await adminClient.from("documents").select("id").eq("storage_path", session.key).maybeSingle();
  if (existing.data?.id) return { response: Response.json({ id: existing.data.id, storagePath: session.key }), uploaded: true };
  if (existing.error) {
    console.error("Unable to check existing direct upload", { callerId, key: session.key });
    return { response: new Response(JSON.stringify({ error: "internal_error" }), { status: 500 }), uploaded: false };
  }

  const r2 = r2Client();
  try {
    if (session.mode === "multipart") {
      if (!Array.isArray(rawParts) || rawParts.length !== session.partCount) {
        try {
          await r2.send(new AbortMultipartUploadCommand({
            Bucket: R2_BUCKET,
            Key: session.key,
            UploadId: session.uploadId,
          }));
        } catch { /* best-effort cleanup for malformed completion requests */ }
        return { response: new Response(JSON.stringify({ error: "invalid_parts" }), { status: 400 }), uploaded: false };
      }
      const parts: { PartNumber: number; ETag: string }[] = [];
      for (let index = 0; index < rawParts.length; index += 1) {
        const part = rawParts[index];
        const item = part as { partNumber?: unknown; etag?: unknown };
        if (typeof item?.partNumber !== "number" || item.partNumber !== index + 1 ||
          typeof item.etag !== "string" || !item.etag) {
          try {
            await r2.send(new AbortMultipartUploadCommand({
              Bucket: R2_BUCKET,
              Key: session.key,
              UploadId: session.uploadId,
            }));
          } catch { /* best-effort cleanup for malformed completion requests */ }
          return { response: new Response(JSON.stringify({ error: "invalid_parts" }), { status: 400 }), uploaded: false };
        }
        parts.push({ PartNumber: item.partNumber, ETag: item.etag });
      }
      await r2.send(new CompleteMultipartUploadCommand({
        Bucket: R2_BUCKET,
        Key: session.key,
        UploadId: session.uploadId,
        MultipartUpload: { Parts: parts },
      }));
    }

    const head = await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: session.key }));
    if (head.ContentLength !== session.metadata.fileSize) {
      await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: session.key }));
      return { response: new Response(JSON.stringify({ error: "uploaded_size_mismatch" }), { status: 400 }), uploaded: false };
    }
    const contentType = head.ContentType?.split(";", 1)[0].trim().toLowerCase();
    if (contentType !== fileTypes[session.metadata.fileType].contentType) {
      await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: session.key }));
      return { response: new Response(JSON.stringify({ error: "uploaded_content_type_invalid" }), { status: 400 }), uploaded: false };
    }
    if (!await fileSignatureIsValid(r2, session.key, session.metadata.fileType)) {
      await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: session.key }));
      return { response: new Response(JSON.stringify({ error: "uploaded_file_invalid" }), { status: 400 }), uploaded: false };
    }

    const { data: document, error: documentError } = await adminClient.from("documents").insert({
      title: session.metadata.title,
      subject: session.metadata.subject,
      tags: session.metadata.tags,
      storage_path: session.key,
      file_size: session.metadata.fileSize,
      file_type: session.metadata.fileType,
    }).select("id").single();
    if (documentError || !document) throw new Error("document_insert_failed");
    return {
      response: Response.json({ id: document.id, storagePath: session.key }, { status: 201 }),
      uploaded: true,
    };
  } catch (error) {
    try {
      await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: session.key }));
      console.warn("Direct upload finalize failed; R2 object rolled back", { callerId, key: session.key });
    } catch {
      console.error("Direct upload finalize and R2 rollback failed", { callerId, key: session.key });
      return { response: new Response(JSON.stringify({ error: "document_creation_rollback_failed" }), { status: 500 }), uploaded: false };
    }
    console.error("Direct upload finalize failed", { callerId, error: String(error) });
    return { response: new Response(JSON.stringify({ error: "document_creation_failed" }), { status: 500 }), uploaded: false };
  }
}

export async function cancelDirectUpload(
  context: AdminContext,
  session: UploadSession,
): Promise<Response> {
  const { callerId, adminClient } = context;
  const existing = await adminClient.from("documents").select("id").eq("storage_path", session.key).maybeSingle();
  if (existing.data?.id) return new Response(JSON.stringify({ error: "already_finalized" }), { status: 409 });
  const r2 = r2Client();
  try {
    if (session.mode === "multipart") {
      await r2.send(new AbortMultipartUploadCommand({
        Bucket: R2_BUCKET,
        Key: session.key,
        UploadId: session.uploadId,
      }));
    } else {
      await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: session.key }));
    }
    return Response.json({ cancelled: true });
  } catch (error) {
    console.error("Direct upload cancellation failed", { callerId, key: session.key, error: String(error) });
    return new Response(JSON.stringify({ error: "cancel_failed" }), { status: 500 });
  }
}
