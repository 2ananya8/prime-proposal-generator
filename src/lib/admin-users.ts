const MIN_PASSWORD_LENGTH = 8;

const EDGE_FUNCTION_DEPLOY_HINT =
  "Deploy Supabase Edge Functions (admin-create-user, admin-delete-user) in your project dashboard, or add SUPABASE_SERVICE_ROLE_KEY to .env for local dev.";

async function getAccessToken(): Promise<string> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("You must be signed in.");
  }
  return data.session.access_token;
}

function isEdgeFunctionUnavailable(error: unknown): boolean {
  const msg = error && typeof error === "object" && "message" in error
    ? String((error as { message: string }).message)
    : "";
  return /Failed to send a request to the Edge Function|FunctionsFetchError|Failed to fetch|404|Relay/i.test(msg);
}

function mapFunctionError(error: unknown, data: { error?: string } | null): string {
  if (data?.error) return data.error;
  if (error && typeof error === "object" && "message" in error) {
    const msg = String((error as { message: string }).message);
    if (isEdgeFunctionUnavailable(error)) {
      return `Edge Function unavailable. ${EDGE_FUNCTION_DEPLOY_HINT}`;
    }
    return msg;
  }
  return "Request failed";
}

async function createUserViaEdge(email: string, password: string, token: string) {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: { email: email.trim().toLowerCase(), password },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw new Error(mapFunctionError(error, data as { error?: string } | null));
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as { id: string; email: string; role: string };
}

async function deleteUserViaEdge(userId: string, token: string) {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.functions.invoke("admin-delete-user", {
    body: { userId },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw new Error(mapFunctionError(error, data as { error?: string } | null));
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
}

export async function adminCreateUser(email: string, password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  const token = await getAccessToken();

  try {
    return await createUserViaEdge(email, password, token);
  } catch (edgeError) {
    if (!isEdgeFunctionUnavailable(edgeError)) throw edgeError;
    const { adminCreateUserServer } = await import("./admin-users.functions");
    return adminCreateUserServer({
      data: { email: email.trim().toLowerCase(), password, accessToken: token },
    });
  }
}

export async function adminDeleteUser(userId: string) {
  const token = await getAccessToken();

  try {
    await deleteUserViaEdge(userId, token);
  } catch (edgeError) {
    if (!isEdgeFunctionUnavailable(edgeError)) throw edgeError;
    const { adminDeleteUserServer } = await import("./admin-users.functions");
    await adminDeleteUserServer({ data: { userId, accessToken: token } });
  }
}
