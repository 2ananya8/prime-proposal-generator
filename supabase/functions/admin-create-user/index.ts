import { corsHeaders, jsonResponse, requireAdmin } from "../_shared/admin-auth.ts";

const MIN_PASSWORD_LENGTH = 8;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const auth = await requireAdmin(req);
  if ("error" in auth && auth.error) return auth.error;
  const { adminClient } = auth;

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: "Valid email is required" }, 400);
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return jsonResponse({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, 400);
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { must_change_password: true },
  });

  if (createError) {
    return jsonResponse({ error: createError.message }, 400);
  }

  const userId = created.user?.id;
  if (!userId) {
    return jsonResponse({ error: "User creation failed" }, 500);
  }

  const { error: profileError } = await adminClient.from("profiles").upsert({
    id: userId,
    email,
    role: "user",
    must_change_password: true,
  });

  if (profileError) {
    await adminClient.auth.admin.deleteUser(userId);
    return jsonResponse({ error: profileError.message }, 500);
  }

  return jsonResponse({ id: userId, email, role: "user" });
});
