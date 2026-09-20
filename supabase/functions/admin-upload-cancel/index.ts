import {
  cancelDirectUpload,
  corsHeaders,
  json,
  requireActiveAdmin,
  verifyUploadSession,
} from "../_shared/admin-upload.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "method_not_allowed" }, 405);

  const context = await requireActiveAdmin(request);
  if (context instanceof Response) return context;

  let body: { session?: unknown };
  try { body = await request.json(); } catch { return json(request, { error: "invalid_request" }, 400); }
  const session = await verifyUploadSession(body.session, context.callerId);
  if (!session) return json(request, { error: "invalid_upload_session" }, 400);

  const response = await cancelDirectUpload(context, session);
  const payload = await response.json();
  return json(request, payload, response.status);
});
