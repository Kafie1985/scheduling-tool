import { SQUARE_STATE_COOKIE } from "@/lib/square/config";

export function stateCookieOptions(request: Request, maxAge: number) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: requestIsHttps(request),
    path: "/",
    maxAge,
  };
}

export { SQUARE_STATE_COOKIE };

function requestIsHttps(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (forwarded) return forwarded === "https";
  return new URL(request.url).protocol === "https:";
}
