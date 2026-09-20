import { createClient } from "npm:@supabase/supabase-js@2.57.4";

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

function corsHeaders(request: Request): HeadersInit {
  const allowedOrigin = Deno.env.get("APP_ORIGIN") ?? "http://localhost:3000";
  const origin = request.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin === allowedOrigin ? allowedOrigin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function response(request: Request, body: Record<string, string>, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders(request) });
}

function bearerToken(request: Request): string | null {
  return request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return response(request, { error: "method_not_allowed" }, 405);

  const token = bearerToken(request);
  if (!token) return response(request, { error: "unauthorized" }, 401);

  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const anonKey = requiredEnv("SUPABASE_ANON_KEY");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const callerClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser(token);
  if (userError || !userData.user) return response(request, { error: "unauthorized" }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { count, error: adminLookupError } = await adminClient
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("status", "active");

  if (adminLookupError) return response(request, { error: "internal_error" }, 500);
  if ((count ?? 0) > 0) return response(request, { error: "admin_already_exists" }, 409);

  const { data: updatedProfile, error: updateError } = await adminClient
    .from("profiles")
    .update({ role: "admin", status: "active" })
    .eq("id", userData.user.id)
    .select("id")
    .maybeSingle();

  if (updateError) return response(request, { error: "claim_failed" }, 500);
  if (!updatedProfile) return response(request, { error: "profile_not_found" }, 404);
  return response(request, { status: "active" });
});
