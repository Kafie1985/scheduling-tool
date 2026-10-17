import { timingSafeEqual } from "node:crypto";
import {
  SQUARE_SCOPES,
  SQUARE_AUTHORIZE_URL,
  SQUARE_TOKEN_URL,
  SQUARE_VERSION,
  type SquareConfig,
} from "@/lib/square/config";

export type SquareTokens = {
  merchantId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};

export function buildAuthorizeUrl(config: SquareConfig, state: string): string {
  const url = new URL(SQUARE_AUTHORIZE_URL);
  url.searchParams.set("client_id", config.applicationId);
  url.searchParams.set("scope", SQUARE_SCOPES);
  url.searchParams.set("session", "false");
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", config.redirectUrl);
  return url.toString();
}

export function statesMatch(stored: string | null, received: string | null): boolean {
  if (!stored || !received) return false;
  if (stored.length > 128 || received.length > 128) return false;
  const left = Buffer.from(stored);
  const right = Buffer.from(received);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function randomOAuthState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

export async function exchangeAuthorizationCode(
  config: SquareConfig,
  code: string,
): Promise<SquareTokens | null> {
  return requestTokens({
    client_id: config.applicationId,
    client_secret: config.applicationSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUrl,
  });
}

export async function refreshAccessToken(
  config: SquareConfig,
  refreshToken: string,
  merchantId: string,
): Promise<SquareTokens | null> {
  return requestTokens(
    {
      client_id: config.applicationId,
      client_secret: config.applicationSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    },
    merchantId,
  );
}

export function accessTokenExpired(expiresAt: string, now = Date.now()): boolean {
  const expires = Date.parse(expiresAt);
  if (!Number.isFinite(expires)) return true;
  return expires <= now + 60_000;
}

async function requestTokens(
  payload: Record<string, string>,
  merchantIdFallback?: string,
): Promise<SquareTokens | null> {
  let response: Response;
  try {
    response = await fetch(SQUARE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Square-Version": SQUARE_VERSION,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    return null;
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return null;
  }
  if (!response.ok) return null;
  return parseTokens(body, merchantIdFallback);
}

function parseTokens(body: unknown, merchantIdFallback?: string): SquareTokens | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  if (Array.isArray(record.errors) && record.errors.length > 0) return null;

  const accessToken = asNonEmpty(record.access_token);
  const refreshToken = asNonEmpty(record.refresh_token);
  const expiresAt = asNonEmpty(record.expires_at);
  const merchantId = asNonEmpty(record.merchant_id) ?? merchantIdFallback ?? null;
  if (!accessToken || !refreshToken || !expiresAt || !merchantId) return null;
  if (!Number.isFinite(Date.parse(expiresAt))) return null;

  return { merchantId, accessToken, refreshToken, expiresAt };
}

function asNonEmpty(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
