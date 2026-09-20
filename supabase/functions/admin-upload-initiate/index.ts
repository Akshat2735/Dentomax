import {
  corsHeaders,
  initiateDirectUpload,
  json,
  MAX_BATCH_SIZE_BYTES,
  MAX_FILES_PER_BATCH,
  requireActiveAdmin,
  validateUploadMetadata,
} from "../_shared/admin-upload.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "method_not_allowed" }, 405);

  const context = await requireActiveAdmin(request);
  if (context instanceof Response) return context;

  let files: unknown;
  try {
    files = (await request.json()).files;
  } catch {
    return json(request, { error: "invalid_request" }, 400);
  }
  if (!Array.isArray(files) || !files.length || files.length > MAX_FILES_PER_BATCH) {
    return json(request, { error: "invalid_batch" }, 400);
  }
  const metadata = files.map(validateUploadMetadata);
  if (metadata.some((file) => !file)) return json(request, { error: "invalid_file_metadata" }, 400);
  const validMetadata = metadata as NonNullable<(typeof metadata)[number]>[];
  if (new Set(validMetadata.map((file) => file.clientId)).size !== validMetadata.length ||
    validMetadata.reduce((total, file) => total + file.fileSize, 0) > MAX_BATCH_SIZE_BYTES) {
    return json(request, { error: "invalid_batch" }, 400);
  }

  try {
    const uploads = [];
    for (const file of validMetadata) uploads.push(await initiateDirectUpload(context.callerId, file));
    return json(request, { uploads }, 201);
  } catch (error) {
    console.error("Unable to initiate direct upload", { callerId: context.callerId, error: String(error) });
    return json(request, { error: "upload_initiation_failed" }, 502);
  }
});
