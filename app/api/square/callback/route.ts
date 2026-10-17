import type { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase/admin";
import { SQUARE_STATE_COOKIE } from "@/lib/square/cookies";
import { readSquareConfig } from "@/lib/square/config";
import { saveSquareConnection } from "@/lib/square/connection";
import { exchangeAuthorizationCode, statesMatch } from "@/lib/square/oauth";
import { redirectToSchedule } from "@/lib/square/redirect";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const oauthError = params.get("error");
  if (oauthError === "access_denied") return redirectToSchedule(request, "denied", true);
  if (oauthError) return redirectToSchedule(request, "error", true);

  const state = params.get("state");
  const code = params.get("code");
  const stored = request.cookies.get(SQUARE_STATE_COOKIE)?.value ?? null;
  if (!statesMatch(stored, state) || !code || code.length > 191) {
    return redirectToSchedule(request, "error", true);
  }

  const config = readSquareConfig();
  if (!config) return redirectToSchedule(request, "unconfigured", true);

  const tokens = await exchangeAuthorizationCode(config, code);
  if (!tokens) return redirectToSchedule(request, "error", true);

  const supabase = getServiceClient();
  if (!supabase) return redirectToSchedule(request, "error", true);

  const saved = await saveSquareConnection(supabase, tokens);
  return redirectToSchedule(request, saved ? "connected" : "error", true);
}
