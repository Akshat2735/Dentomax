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
    .select("*")
    .eq("id", documentId)
    .maybeSingle();
  if (lookupError) {
    console.error("Unable to look up document for deletion", { callerId: context.callerId, documentId });
    return json(request, { error: "delete_failed" }, 500);
  }
  if (!document?.storage_path) return json(request, { error: "document_not_found" }, 404);

  const { error: markError } = await context.adminClient
    .from("documents")
    .update({ deletion_status: "deleting" })
    .eq("id", documentId)
    .in("deletion_status", ["active", "delete_failed"]);
  if (markError) {
    console.error("Unable to mark document for deletion", { callerId: context.callerId, documentId });
    return json(request, { error: "delete_failed" }, 500);
  }

  try {
    await r2Client().send(new DeleteObjectCommand({
      Bucket: "dentomax-library",
      Key: document.storage_path,
    }));
  } catch (error) {
    const { error: failError } = await context.adminClient
      .from("documents")
      .update({ deletion_status: "delete_failed" })
      .eq("id", documentId);
    if (failError) {
      console.error("R2 deletion and deletion-state update both failed", { callerId: context.callerId, documentId, error: String(error) });
      return json(request, { error: "deletion_state_failed" }, 500);
    }
    console.error("Unable to delete document object; deletion is available for retry", { callerId: context.callerId, documentId, error: String(error) });
    return json(request, { error: "delete_failed" }, 500);
  }

  const { error: deleteError } = await context.adminClient.from("documents").delete().eq("id", documentId);
  if (deleteError) {
    console.error("Storage object deleted but database cleanup failed", { callerId: context.callerId, documentId });
    return json(request, { error: "record_cleanup_failed" }, 500);
  }

  console.warn("Document deleted by administrator", {
    callerId: context.callerId,
    documentId,
    timestamp: new Date().toISOString(),
  });
  return json(request, { documentId, deleted: "true" });
});
