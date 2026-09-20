import { corsHeaders, json, requireActiveAdmin } from "../_shared/admin-upload.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method !== "POST") return json(request, { error: "method_not_allowed" }, 405);

  // This explicitly validates JWT, active status, and admin role before parsing
  // the request or using the service-role client to update any profile.
  const context = await requireActiveAdmin(request);
  if (context instanceof Response) return context;

  let userId: unknown;
  let status: unknown;
  try {
    ({ userId, status } = await request.json());
  } catch {
    return json(request, { error: "invalid_request" }, 400);
  }

  if (typeof userId !== "string" || !UUID_PATTERN.test(userId) ||
    (status !== "active" && status !== "revoked")) {
    return json(request, { error: "invalid_request" }, 400);
  }

  // Avoid an administrator accidentally removing their own ability to administer the library.
  if (userId === context.callerId && status === "revoked") {
    return json(request, { error: "cannot_revoke_self" }, 400);
  }

  const { data: updatedProfile, error: updateError } = await context.adminClient
    .from("profiles")
    .update({ status })
    .eq("id", userId)
    .select("id, status")
    .maybeSingle();

  if (updateError) {
    console.error("Unable to update profile status", {
      callerId: context.callerId,
      targetUserId: userId,
    });
    return json(request, { error: "status_update_failed" }, 500);
  }
  if (!updatedProfile) return json(request, { error: "profile_not_found" }, 404);

  console.warn("Profile status updated by administrator", {
    callerId: context.callerId,
    targetUserId: updatedProfile.id,
    status: updatedProfile.status,
    timestamp: new Date().toISOString(),
  });
  return json(request, { userId: updatedProfile.id, status: updatedProfile.status });
});
