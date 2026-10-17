import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_rethrow } from "next/navigation";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { createSquareCustomer, searchSquareCustomerId } from "@/lib/square/customers";
import { readSquareConfig } from "@/lib/square/config";
import {
  accessTokenExpired,
  refreshAccessToken,
  type SquareTokens,
} from "@/lib/square/oauth";

export type SquareSyncStatus = "linked" | "skipped" | "failed";

type StoredConnection = SquareTokens;

export async function isSquareConnected(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = getServiceClient();
  if (!supabase) return false;

  try {
    const { data, error } = await supabase.from("square_connections").select("merchant_id").limit(1);
    if (error || !Array.isArray(data)) return false;
    return data.length > 0;
  } catch (error) {
    unstable_rethrow(error);
    return false;
  }
}

export async function saveSquareConnection(
  supabase: SupabaseClient,
  tokens: SquareTokens,
): Promise<boolean> {
  const { error } = await supabase.from("square_connections").upsert(
    {
      merchant_id: tokens.merchantId,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_at: tokens.expiresAt,
    },
    { onConflict: "merchant_id" },
  );
  return !error;
}

export async function syncSquareCustomer(input: {
  customerId: string;
  name: string;
  email: string;
  phone: string;
}): Promise<SquareSyncStatus> {
  const supabase = getServiceClient();
  if (!supabase) return "failed";

  try {
    const loaded = await loadLatestConnection(supabase);
    if (loaded === "none") return "skipped";
    if (!loaded) return "failed";

    const config = readSquareConfig();
    if (!config) return "failed";

    let accessToken = loaded.accessToken;
    if (accessTokenExpired(loaded.expiresAt)) {
      const refreshed = await refreshAccessToken(config, loaded.refreshToken, loaded.merchantId);
      if (!refreshed) return "failed";
      const saved = await saveSquareConnection(supabase, refreshed);
      if (!saved) return "failed";
      accessToken = refreshed.accessToken;
    }

    const search = await searchSquareCustomerId(accessToken, input.email);
    if (!search.ok) return "failed";

    const squareCustomerId =
      search.id ??
      (await createSquareCustomer(accessToken, {
        name: input.name,
        email: input.email,
        phone: input.phone,
      }));
    if (!squareCustomerId) return "failed";

    const updated = await supabase
      .from("customers")
      .update({ square_customer_id: squareCustomerId })
      .eq("id", input.customerId);
    return updated.error ? "failed" : "linked";
  } catch (error) {
    unstable_rethrow(error);
    return "failed";
  }
}

async function loadLatestConnection(
  supabase: SupabaseClient,
): Promise<StoredConnection | "none" | null> {
  const { data, error } = await supabase
    .from("square_connections")
    .select("merchant_id, access_token, refresh_token, expires_at")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) return missingConnectionTable(error) ? "none" : null;
  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row !== "object") return "none";

  const record = row as Record<string, unknown>;
  const merchantId = asNonEmpty(record.merchant_id);
  const accessToken = asNonEmpty(record.access_token);
  const refreshToken = asNonEmpty(record.refresh_token);
  const expiresAt = asNonEmpty(record.expires_at);
  if (!merchantId || !accessToken || !refreshToken || !expiresAt) return null;
  return { merchantId, accessToken, refreshToken, expiresAt };
}

function missingConnectionTable(error: { code?: string; message?: string }): boolean {
  const message = error.message ?? "";
  return error.code === "PGRST205" || error.code === "42P01" || /schema cache|does not exist/i.test(message);
}

function asNonEmpty(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
