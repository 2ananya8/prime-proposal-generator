import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "./app-config";
import { ADMIN_CREATE_PRIME_EMAIL_ERROR, isPrimeInfoservEmail } from "./email-domain";

const MIN_PASSWORD_LENGTH = 8;

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing. Add it to .env for local admin user management, or deploy Supabase Edge Functions for production.",
    );
  }
  return key;
}

async function requireAdminServer(accessToken: string) {
  const url = getSupabaseUrl(process.env);
  const anon = getSupabaseAnonKey(process.env);
  if (!url || !anon) throw new Error("Supabase is not configured on the server.");

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) throw new Error("Unauthorized");

  const adminClient = createClient(url, getServiceRoleKey());
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    throw new Error("Admin access required");
  }

  return { adminClient, callerId: userData.user.id };
}

const CreateUserInput = z.object({
  email: z.string().email(),
  password: z.string().min(MIN_PASSWORD_LENGTH),
  accessToken: z.string().min(1),
});

const DeleteUserInput = z.object({
  userId: z.string().uuid(),
  accessToken: z.string().min(1),
});

export const adminCreateUserServer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CreateUserInput.parse(input))
  .handler(async ({ data }) => {
    const { adminClient } = await requireAdminServer(data.accessToken);
    const email = data.email.trim().toLowerCase();

    if (isPrimeInfoservEmail(email)) {
      throw new Error(ADMIN_CREATE_PRIME_EMAIL_ERROR);
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { must_change_password: true },
    });
    if (createError) throw new Error(createError.message);

    const userId = created.user?.id;
    if (!userId) throw new Error("User creation failed");

    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: userId,
      email,
      role: "user",
      must_change_password: true,
    });
    if (profileError) {
      await adminClient.auth.admin.deleteUser(userId);
      throw new Error(profileError.message);
    }

    return { id: userId, email, role: "user" as const };
  });

export const adminDeleteUserServer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DeleteUserInput.parse(input))
  .handler(async ({ data }) => {
    const { adminClient, callerId } = await requireAdminServer(data.accessToken);
    if (data.userId === callerId) throw new Error("You cannot remove your own account");

    const { data: target, error: targetError } = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("id", data.userId)
      .maybeSingle();

    if (targetError || !target) throw new Error("User not found");
    if (target.role === "admin") throw new Error("Cannot remove the admin account");

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(data.userId);
    if (deleteError) throw new Error(deleteError.message);

    return { ok: true as const };
  });
