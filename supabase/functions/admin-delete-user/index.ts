import { corsHeaders, jsonResponse, requireAdmin } from "../_shared/admin-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const auth = await requireAdmin(req);
  if ("error" in auth && auth.error) return auth.error;
  const { adminClient, callerId } = auth;

  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const userId = body.userId;
  if (!userId) {
    return jsonResponse({ error: "userId is required" }, 400);
  }
  if (userId === callerId) {
    return jsonResponse({ error: "You cannot remove your own account" }, 400);
  }

  const { data: target, error: targetError } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();

  if (targetError || !target) {
    return jsonResponse({ error: "User not found" }, 404);
  }
  if (target.role === "admin") {
    return jsonResponse({ error: "Cannot remove the admin account" }, 400);
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteError) {
    return jsonResponse({ error: deleteError.message }, 400);
  }

  return jsonResponse({ ok: true });
});
