export const SQUARE_VERSION = "2026-09-16";
export const SQUARE_SANDBOX_ORIGIN = "https://connect.squareupsandbox.com";
export const SQUARE_AUTHORIZE_URL = `${SQUARE_SANDBOX_ORIGIN}/oauth2/authorize`;
export const SQUARE_TOKEN_URL = `${SQUARE_SANDBOX_ORIGIN}/oauth2/token`;
export const SQUARE_STATE_COOKIE = "square_oauth_state";
export const SQUARE_SCOPES = "CUSTOMERS_READ CUSTOMERS_WRITE";

export type SquareConfig = {
  applicationId: string;
  applicationSecret: string;
  redirectUrl: string;
};

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function readSquareConfig(): SquareConfig | null {
  if (readEnv("SQUARE_ENVIRONMENT") !== "sandbox") return null;

  const applicationId = readEnv("SQUARE_APPLICATION_ID");
  const applicationSecret = readEnv("SQUARE_APPLICATION_SECRET");
  const redirectUrl = readEnv("SQUARE_REDIRECT_URL");
  if (!applicationId || !applicationSecret || !redirectUrl) return null;

  try {
    const parsed = new URL(redirectUrl);
    const pathname = parsed.pathname.replace(/\/$/, "");
    const localHost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const allowedProtocol =
      parsed.protocol === "https:" || (parsed.protocol === "http:" && localHost);
    if (!allowedProtocol || pathname !== "/api/square/callback" || parsed.username || parsed.password) {
      return null;
    }
  } catch {
    return null;
  }

  return { applicationId, applicationSecret, redirectUrl };
}
