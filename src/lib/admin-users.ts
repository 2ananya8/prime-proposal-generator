const MIN_PASSWORD_LENGTH = 8;

async function getAccessToken(): Promise<string> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("You must be signed in.");
  }
  return data.session.access_token;
}

function mapFunctionError(error: unknown, data: { error?: string } | null): string {
  if (data?.error) return data.error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: string }).message);
  }
  return "Request failed";
}

export async function adminCreateUser(email: string, password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  const { supabase } = await import("@/integrations/supabase/client");
  const token = await getAccessToken();
  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: { email: email.trim().toLowerCase(), password },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw new Error(mapFunctionError(error, data as { error?: string } | null));
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as { id: string; email: string; role: string };
}

export async function adminDeleteUser(userId: string) {
  const { supabase } = await import("@/integrations/supabase/client");
  const token = await getAccessToken();
  const { data, error } = await supabase.functions.invoke("admin-delete-user", {
    body: { userId },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw new Error(mapFunctionError(error, data as { error?: string } | null));
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
}
