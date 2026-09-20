import { DeleteObjectCommand } from "npm:@aws-sdk/client-s3@3.777.0";
import { corsHeaders, json, r2Client, requireActiveAdmin } from "../_shared/admin-upload.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method !== "POST") return json(request, { error: "method_not_allowed" }, 405);

  const context = await requireActiveAdmin(request);
  if (context instanceof Response) return context;

  let documentId: unknown;
  try {
    ({ documentId } = await request.json());
  } catch {
    return json(request, { error: "invalid_request" }, 400);
  }
  if (typeof documentId !== "string" || !UUID_PATTERN.test(documentId)) {
    return json(request, { error: "invalid_request" }, 400);
  }

  const { data: document, error: lookupError } = await context.adminClient
    .from("documents")
    .select("id, storage_path")
    .eq("id", documentId)
    .maybeSingle();
  if (lookupError) {
    console.error("Unable to look up document for deletion", { callerId: context.callerId, documentId });
    return json(request, { error: "delete_failed" }, 500);
  }
  if (!document?.storage_path) return json(request, { error: "document_not_found" }, 404);

  try {
    await r2Client().send(new DeleteObjectCommand({
      Bucket: "dentomax-library",
      Key: document.storage_path,
    }));
  } catch (error) {
    console.error("Unable to delete document object", { callerId: context.callerId, documentId, error: String(error) });
    return json(request, { error: "delete_failed" }, 500);
  }

  const { error: deleteError } = await context.adminClient
    .from("documents")
    .delete()
    .eq("id", documentId);
  if (deleteError) {
    console.error("Document object deleted but database record cleanup failed", { callerId: context.callerId, documentId });
    return json(request, { error: "record_cleanup_failed" }, 500);
  }

  console.warn("Document deleted by administrator", {
    callerId: context.callerId,
    documentId,
    timestamp: new Date().toISOString(),
  });
  return json(request, { documentId, deleted: "true" });
});
