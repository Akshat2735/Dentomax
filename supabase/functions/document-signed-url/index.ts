import { S3Client, GetObjectCommand } from "npm:@aws-sdk/client-s3@3.777.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.777.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const SIGNED_URL_EXPIRY_SECONDS = 5 * 60;
const R2_BUCKET = "dentomax-library";
const R2_ENDPOINT =
  "https://bc06c1eb78ba4b1f3c88125f4ff08e49.r2.cloudflarestorage.com";

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  const configuredOrigins = (Deno.env.get("APP_ORIGIN") ?? "http://localhost:3000")
    .split(",").map((value) => value.trim()).filter(Boolean);
  // Local Next dev servers may select a free port (for example localhost:3001).
  // Production remains restricted to the explicit APP_ORIGIN allow-list.
  const isLocalDevelopmentOrigin = /^http:\/\/localhost(?::\d+)?$/.test(origin ?? "");
  const allowed = origin && (configuredOrigins.includes(origin) || isLocalDevelopmentOrigin);

  return {
    "Access-Control-Allow-Origin": allowed ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function response(
  request: Request,
  body: Record<string, string>,
  status: number,
): Response {
  return Response.json(body, { status, headers: corsHeaders(request) });
}

function logDenied(reason: string, userId: string | null): void {
  // Supabase retains Edge Function logs; never log authorization headers or R2 secrets.
  console.warn(JSON.stringify({
    event: "document_signed_url_denied",
    reason,
    userId,
    timestamp: new Date().toISOString(),
  }));
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (request.method !== "POST") {
    return response(request, { error: "method_not_allowed" }, 405);
  }

  const token = bearerToken(request);
  if (!token) {
    logDenied("missing_jwt", null);
    return response(request, { error: "unauthorized" }, 401);
  }

  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const anonKey = requiredEnv("SUPABASE_ANON_KEY");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  // This network call validates the JWT and supplies the authenticated auth.users id.
  const callerClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser(token);
  const user = userData.user;

  if (userError || !user) {
    logDenied("invalid_jwt", null);
    return response(request, { error: "unauthorized" }, 401);
  }

  // Elevated access bypasses RLS, so profile status is always checked explicitly.
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Unable to check caller profile status", { userId: user.id });
    return response(request, { error: "internal_error" }, 500);
  }

  // Do not construct an R2 client, load R2 credentials, or query documents first.
  if (profile?.status !== "active") {
    logDenied("inactive_or_missing_profile", user.id);
    return response(request, { error: "forbidden" }, 403);
  }

  let documentId: string;
  try {
    const body = await request.json();
    documentId = typeof body?.documentId === "string" ? body.documentId : "";
  } catch {
    return response(request, { error: "invalid_request" }, 400);
  }

  if (!documentId) {
    return response(request, { error: "invalid_request" }, 400);
  }

  const { data: document, error: documentError } = await adminClient
    .from("documents")
    .select("storage_path, file_type")
    .eq("id", documentId)
    .maybeSingle();

  if (documentError) {
    console.error("Unable to look up document", { documentId, userId: user.id });
    return response(request, { error: "internal_error" }, 500);
  }

  if (!document?.storage_path) {
    return response(request, { error: "not_found" }, 404);
  }

  const r2 = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
    },
  });

  const filename = document.storage_path.split("/").pop()?.replace(/["\r\n]/g, "") ?? "download";
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: document.storage_path,
    // ZIP and EPUB files are downloads, while PDFs continue to open in PDF.js.
    ...(document.file_type !== "pdf" ? {
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    } : {}),
  });
  const url = await getSignedUrl(
    r2,
    command,
    { expiresIn: SIGNED_URL_EXPIRY_SECONDS },
  );

  // Successful responses intentionally contain only the temporary URL.
  return Response.json({ url }, { headers: corsHeaders(request) });
});
