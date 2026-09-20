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

function response(
  request: Request,
  body: Record<string, string>,
  status: number,
): Response {
  return Response.json(body, { status, headers: corsHeaders(request) });
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function generatePassword(): string {
  // Rejection sampling avoids modulo bias. The prefix guarantees the common
  // upper/lower/digit/symbol password requirements without reducing randomness.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_";
  const limit = 256 - (256 % alphabet.length);
  const characters: string[] = [];

  while (characters.length < 24) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    for (const byte of bytes) {
      if (byte < limit) characters.push(alphabet[byte % alphabet.length]);
      if (characters.length === 24) break;
    }
  }

  return `Aa1!${characters.join("")}`;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
    return response(request, { error: "unauthorized" }, 401);
  }

  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const anonKey = requiredEnv("SUPABASE_ANON_KEY");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  // Verify the caller's JWT with Supabase Auth; do not trust unverified claims.
  const callerClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser(token);
  const caller = userData.user;

  if (userError || !caller) {
    return response(request, { error: "unauthorized" }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // This client bypasses RLS, so role and status must be explicitly checked.
  const { data: callerProfile, error: callerProfileError } = await adminClient
    .from("profiles")
    .select("role, status")
    .eq("id", caller.id)
    .maybeSingle();

  if (callerProfileError) {
    console.error("Unable to check admin role", { callerId: caller.id });
    return response(request, { error: "internal_error" }, 500);
  }

  if (callerProfile?.status !== "active" || callerProfile.role !== "admin") {
    console.warn("Admin user creation denied", {
      callerId: caller.id,
      timestamp: new Date().toISOString(),
    });
    return response(request, { error: "forbidden" }, 403);
  }

  let email = "";
  let username = "";
  try {
    const body = await request.json();
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    username = typeof body?.username === "string" ? body.username.trim() : email;
  } catch {
    return response(request, { error: "invalid_request" }, 400);
  }

  if (!isEmail(email) || !username || username.length > 100) {
    return response(request, { error: "invalid_request" }, 400);
  }

  const password = generatePassword();
  const { data: createdUserData, error: createUserError } = await adminClient.auth.admin
    .createUser({ email, password, email_confirm: true });
  const createdUser = createdUserData.user;

  if (createUserError || !createdUser) {
    // Do not log the email or generated password.
    console.warn("Admin user creation failed", { callerId: caller.id });
    return response(request, { error: "user_creation_failed" }, 400);
  }

  let profileInsertFailed = false;
  try {
    const { error: profileInsertError } = await adminClient.from("profiles").insert({
      id: createdUser.id,
      username,
      status: "active",
      role: "student",
    });
    profileInsertFailed = Boolean(profileInsertError);
  } catch {
    profileInsertFailed = true;
  }

  if (profileInsertFailed) {
    const { error: rollbackError } = await adminClient.auth.admin.deleteUser(createdUser.id);
    if (rollbackError) {
      console.error("Profile insert failed and Auth-user rollback failed", {
        callerId: caller.id,
        userId: createdUser.id,
      });
    } else {
      console.warn("Profile insert failed; Auth user rolled back", {
        callerId: caller.id,
        userId: createdUser.id,
      });
    }
    return response(request, { error: "profile_creation_failed" }, 500);
  }

  // The plaintext password is sent exactly once in this response and is never logged or stored here.
  return Response.json({ password }, { headers: corsHeaders(request) });
});
