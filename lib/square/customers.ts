import { SQUARE_SANDBOX_ORIGIN, SQUARE_VERSION } from "@/lib/square/config";

type CustomerSyncInput = {
  name: string;
  email: string;
  phone: string;
};

export async function searchSquareCustomerId(
  accessToken: string,
  email: string,
): Promise<{ ok: true; id: string | null } | { ok: false }> {
  const result = await postSquare("/v2/customers/search", accessToken, {
    limit: 1,
    query: {
      filter: {
        email_address: {
          exact: email,
        },
      },
    },
  });
  if (!result.ok) return { ok: false };

  const record = asRecord(result.body);
  if (!record) return { ok: false };
  if (Array.isArray(record.errors) && record.errors.length > 0) return { ok: false };

  const customers = record.customers;
  if (customers == null) return { ok: true, id: null };
  if (!Array.isArray(customers) || customers.length === 0) return { ok: true, id: null };

  const id = asNonEmpty(asRecord(customers[0])?.id);
  if (!id) return { ok: false };
  return { ok: true, id };
}

export async function createSquareCustomer(
  accessToken: string,
  input: CustomerSyncInput,
): Promise<string | null> {
  const name = splitName(input.name);
  const body: Record<string, string> = {
    idempotency_key: crypto.randomUUID(),
    given_name: name.givenName,
    email_address: input.email,
  };
  if (name.familyName) body.family_name = name.familyName;
  const phone = squarePhone(input.phone);
  if (phone) body.phone_number = phone;

  const result = await postSquare("/v2/customers", accessToken, body);
  if (!result.ok) return null;
  const customer = asRecord(asRecord(result.body)?.customer);
  return asNonEmpty(customer?.id);
}

async function postSquare(
  path: string,
  accessToken: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; body: unknown }> {
  try {
    const response = await fetch(`${SQUARE_SANDBOX_ORIGIN}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": SQUARE_VERSION,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const parsed = await response.json().catch(() => null);
    return { ok: response.ok, body: parsed };
  } catch {
    return { ok: false, body: null };
  }
}

function splitName(name: string): { givenName: string; familyName?: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const givenName = (parts[0] ?? "Customer").slice(0, 300);
  const familyName = parts.slice(1).join(" ").slice(0, 300);
  return familyName ? { givenName, familyName } : { givenName };
}

function squarePhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (/^\+[1-9]\d{1,14}$/.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNonEmpty(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
