import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { isValidEmail, isValidNewPassword, isValidUsername, verifyTurnstile } from "../_shared/signup-validation.ts";

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

function clientIp(request: Request): string | null {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method !== "POST") {
    return response(request, { error: "method_not_allowed" }, 405);
  }

  let email = "";
  let username = "";
  let password = "";
  let honeypot = "";
  let captchaToken = "";
  try {
    const body = await request.json();
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    username = typeof body?.username === "string" ? body.username.trim() : "";
    password = typeof body?.password === "string" ? body.password : "";
    honeypot = typeof body?.website === "string" ? body.website : "";
    captchaToken = typeof body?.captchaToken === "string" ? body.captchaToken : "";
  } catch {
    return response(request, { error: "invalid_request" }, 400);
  }

  // Bot trap: the hidden "website" field is invisible to people. If it is filled in,
  // pretend the sign-up worked so the bot learns nothing, but create nothing.
  if (honeypot.trim() !== "") {
    return response(request, { status: "pending" }, 201);
  }

  if (!isValidEmail(email) || !isValidUsername(username) || !isValidNewPassword(password)) {
    return response(request, { error: "invalid_request" }, 400);
  }

  // Cloudflare Turnstile. Enforced as soon as TURNSTILE_SECRET_KEY is set as a
  // function secret; until then sign-up behaves exactly as before.
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (turnstileSecret) {
    if (!(await verifyTurnstile(turnstileSecret, captchaToken, clientIp(request)))) {
      return response(request, { error: "captcha_failed" }, 400);
    }
  } else {
    console.warn("TURNSTILE_SECRET_KEY is not set: sign-up is not protected by a captcha.");
  }

  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: createdUserData, error: createUserError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  const createdUser = createdUserData.user;

  if (createUserError || !createdUser) {
    return response(request, { error: "signup_failed" }, 400);
  }

  const { error: profileError } = await adminClient.from("profiles").insert({
    id: createdUser.id,
    username,
    status: "revoked",
    role: "student",
  });

  if (profileError) {
    await adminClient.auth.admin.deleteUser(createdUser.id);
    if (profileError.code === "23505") {
      return response(request, { error: "username_taken" }, 409);
    }
    return response(request, { error: "signup_failed" }, 500);
  }

  return response(request, { status: "pending" }, 201);
});
