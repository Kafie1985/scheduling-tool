import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function supabaseEnv() {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  return { url, anonKey, serviceRoleKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey, serviceRoleKey } = supabaseEnv();
  if (!url || !anonKey || !serviceRoleKey) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function getServiceClient(): SupabaseClient | null {
  const { url, serviceRoleKey } = supabaseEnv();
  if (!isSupabaseConfigured() || !url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
