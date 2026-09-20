import {
  corsHeaders,
  json,
  requireActiveAdmin,
  signPartUploadUrl,
  verifyUploadSession,
} from "../_shared/admin-upload.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "method_not_allowed" }, 405);

  const context = await requireActiveAdmin(request);
  if (context instanceof Response) return context;

  let body: { session?: unknown; partNumber?: unknown };
  try { body = await request.json(); } catch { return json(request, { error: "invalid_request" }, 400); }
  const session = await verifyUploadSession(body.session, context.callerId);
  const partNumber = body.partNumber;
  if (!session || !Number.isSafeInteger(partNumber)) return json(request, { error: "invalid_upload_session" }, 400);

  try {
    return json(request, { uploadUrl: await signPartUploadUrl(session, partNumber) });
  } catch {
    return json(request, { error: "invalid_part" }, 400);
  }
});
