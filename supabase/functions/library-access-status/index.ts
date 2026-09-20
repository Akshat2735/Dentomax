import { createClient } from "npm:@supabase/supabase-js@2.57.4";

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  const configuredOrigins = (Deno.env.get("APP_ORIGIN") ?? "http://localhost:3000")
    .split(",").map((value) => value.trim()).filter(Boolean);
  const allowed = origin && (configuredOrigins.includes(origin) || /^http:\/\/localhost(?::\d+)?$/.test(origin));

  return {
    "Access-Control-Allow-Origin": allowed ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function response(request: Request, body: Record<string, string>, status: number): Response {
  return Response.json(body, { status, headers: corsHeaders(request) });
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
  if (!token) return response(request, { error: "unauthorized" }, 401);

  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const anonKey = requiredEnv("SUPABASE_ANON_KEY");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const callerClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser(token);
  const user = userData.user;

  if (userError || !user) return response(request, { error: "unauthorized" }, 401);

  // RLS intentionally hides profiles from revoked users. This function exposes
  // only the caller's own access state, never another user's profile data.
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Unable to check library access status", { userId: user.id });
    return response(request, { error: "internal_error" }, 500);
  }

  if (profile?.status === "active") return response(request, { status: "active" }, 200);
  if (profile?.status === "revoked") return response(request, { status: "revoked" }, 200);
  return response(request, { error: "forbidden" }, 403);
});
