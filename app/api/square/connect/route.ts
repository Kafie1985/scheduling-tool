import { NextResponse } from "next/server";
import { SQUARE_STATE_COOKIE, stateCookieOptions } from "@/lib/square/cookies";
import { readSquareConfig } from "@/lib/square/config";
import { buildAuthorizeUrl, randomOAuthState } from "@/lib/square/oauth";
import { redirectToSchedule } from "@/lib/square/redirect";

export const dynamic = "force-dynamic";

const STATE_MAX_AGE_SECONDS = 60 * 10;

export async function GET(request: Request) {
  const config = readSquareConfig();
  if (!config) return redirectToSchedule(request, "unconfigured", false);

  const state = randomOAuthState();
  const response = NextResponse.redirect(buildAuthorizeUrl(config, state));
  response.cookies.set(SQUARE_STATE_COOKIE, state, stateCookieOptions(request, STATE_MAX_AGE_SECONDS));
  return response;
}
