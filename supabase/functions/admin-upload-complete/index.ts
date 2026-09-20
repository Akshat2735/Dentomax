import {
  corsHeaders,
  finalizeDirectUpload,
  json,
  requireActiveAdmin,
  verifyUploadSession,
} from "../_shared/admin-upload.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "method_not_allowed" }, 405);

  const context = await requireActiveAdmin(request);
  if (context instanceof Response) return context;

  let body: { session?: unknown; parts?: unknown };
  try { body = await request.json(); } catch { return json(request, { error: "invalid_request" }, 400); }
  const session = await verifyUploadSession(body.session, context.callerId);
  if (!session) return json(request, { error: "invalid_upload_session" }, 400);

  const result = await finalizeDirectUpload(context, session, body.parts);
  const payload = await result.response.json();
  return json(request, payload, result.response.status);
});
