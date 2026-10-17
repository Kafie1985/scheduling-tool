import { NextResponse } from "next/server";
import { SQUARE_STATE_COOKIE, stateCookieOptions } from "@/lib/square/cookies";
import { readSquareConfig } from "@/lib/square/config";

export function redirectToSchedule(request: Request, square: string, clearState: boolean) {
  const destination = scheduleUrl(request, square);
  const response = NextResponse.redirect(destination);
  if (clearState) {
    response.cookies.set(SQUARE_STATE_COOKIE, "", stateCookieOptions(request, 0));
  }
  return response;
}

function scheduleUrl(request: Request, square: string): URL {
  const config = readSquareConfig();
  const origin = config ? new URL(config.redirectUrl).origin : new URL(request.url).origin;
  const destination = new URL("/", origin);
  destination.searchParams.set("square", square);
  return destination;
}
