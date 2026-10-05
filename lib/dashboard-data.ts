import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { todayKey } from "@/lib/time";
import type { Booking, Customer, DashboardData } from "@/lib/types";

const PAGE_SIZE = 1000;
const MAX_PAGES = 10;

type PageQuery = PromiseLike<{
  data: unknown;
  error: { message: string } | null;
}>;

async function fetchPages(
  load: (from: number, to: number) => PageQuery,
): Promise<{ rows: unknown[]; error: string | null }> {
  const rows: unknown[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;
    const result = await load(from, from + PAGE_SIZE - 1);
    if (result.error) {
      return { rows: [], error: result.error.message };
    }
    const batch = Array.isArray(result.data) ? result.data : [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  return { rows, error: null };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asPrice(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function mapCustomer(value: unknown): Customer | null {
  const row = asRecord(value);
  if (!row || typeof row.id !== "string" || typeof row.name !== "string") {
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    email: asString(row.email),
    phone: asString(row.phone),
  };
}

function mapBooking(
  value: unknown,
  customers: Map<string, Customer>,
): Booking | null {
  const row = asRecord(value);
  if (
    !row ||
    typeof row.id !== "string" ||
    typeof row.service_name !== "string" ||
    typeof row.start_time !== "string" ||
    typeof row.end_time !== "string"
  ) {
    return null;
  }

  const customerId = asString(row.customer_id);
  const customer = customerId ? customers.get(customerId) : undefined;

  return {
    id: row.id,
    serviceName: row.service_name,
    status: asString(row.status) ?? "scheduled",
    startTime: row.start_time,
    endTime: row.end_time,
    price: asPrice(row.price),
    customerName: customer?.name ?? "Unknown customer",
    customerEmail: customer?.email ?? null,
    customerPhone: customer?.phone ?? null,
  };
}

export async function loadDashboard(): Promise<DashboardData> {
  await connection();
  const today = todayKey();
  const empty: DashboardData = {
    configured: false,
    customers: [],
    bookings: [],
    error: null,
    today,
  };

  if (!isSupabaseConfigured()) return empty;

  const supabase = getServiceClient();
  if (!supabase) return empty;

  try {
    const [customerPage, bookingPage] = await Promise.all([
      fetchPages((from, to) =>
        supabase
          .from("customers")
          .select("id, name, email, phone")
          .order("name", { ascending: true })
          .range(from, to),
      ),
      fetchPages((from, to) =>
        supabase
          .from("bookings")
          .select(
            "id, customer_id, service_name, status, start_time, end_time, price",
          )
          .order("start_time", { ascending: true })
          .range(from, to),
      ),
    ]);

    if (customerPage.error || bookingPage.error) {
      return {
        configured: true,
        customers: [],
        bookings: [],
        error: customerPage.error ?? bookingPage.error,
        today,
      };
    }

    const customers = customerPage.rows
      .map(mapCustomer)
      .filter((row): row is Customer => row !== null)
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
    const byId = new Map(customers.map((customer) => [customer.id, customer]));
    const bookings = bookingPage.rows
      .map((row) => mapBooking(row, byId))
      .filter((row): row is Booking => row !== null)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    return { configured: true, customers, bookings, error: null, today };
  } catch (error) {
    unstable_rethrow(error);
    return {
      configured: true,
      customers: [],
      bookings: [],
      error:
        error instanceof Error
          ? error.message
          : "Could not load bookings from Supabase.",
      today,
    };
  }
}
