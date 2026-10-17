"use server";

import { unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { syncSquareCustomer, type SquareSyncStatus } from "@/lib/square/connection";
import { denverLocalToIso } from "@/lib/time";
import type { CreateBookingResult } from "@/lib/types";

const MISSING_ENV =
  "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY before saving a booking.";

type BookingDraft = {
  name: string;
  email: string;
  phone: string;
  serviceName: string;
  startTime: string;
  endTime: string;
  price: number;
};

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function friendlyError(message: string): string {
  if (message.includes("bookings_time_order")) {
    return "End time must be after the start time.";
  }
  if (message.includes("bookings_price_nonnegative")) {
    return "Price must be zero or greater.";
  }
  if (message.includes("bookings_status_check")) {
    return "Booking status must be scheduled.";
  }
  return message;
}

function readDraft(formData: FormData): BookingDraft | CreateBookingResult {
  const name = field(formData, "customerName");
  const email = field(formData, "email");
  const phone = field(formData, "phone");
  const serviceName = field(formData, "serviceName");
  const startLocal = field(formData, "startTime");
  const endLocal = field(formData, "endTime");
  const priceRaw = field(formData, "price");

  if (!name || !email || !phone || !serviceName || !startLocal || !endLocal || !priceRaw) {
    return { ok: false, error: "Fill in every field." };
  }
  if (name.length > 200) {
    return { ok: false, error: "Customer name is too long." };
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (phone.length > 40) {
    return { ok: false, error: "Phone number is too long." };
  }
  if (serviceName.length > 200) {
    return { ok: false, error: "Service name is too long." };
  }
  if (!/^\d+(\.\d{1,2})?$/.test(priceRaw)) {
    return { ok: false, error: "Enter a price with up to two decimal places." };
  }

  const [whole] = priceRaw.split(".");
  if (whole.length > 8) {
    return { ok: false, error: "Price is too large." };
  }

  const price = Number(priceRaw);
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, error: "Price must be zero or greater." };
  }

  const startTime = denverLocalToIso(startLocal);
  const endTime = denverLocalToIso(endLocal);
  if (!startTime || !endTime) {
    return {
      ok: false,
      error: "Enter a valid start and end time in Mountain Time.",
    };
  }
  if (new Date(endTime).getTime() <= new Date(startTime).getTime()) {
    return { ok: false, error: "End time must be after the start time." };
  }

  return { name, email, phone, serviceName, startTime, endTime, price };
}

function isDraft(value: BookingDraft | CreateBookingResult): value is BookingDraft {
  return !("ok" in value);
}

export async function createBooking(formData: FormData): Promise<CreateBookingResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: MISSING_ENV };
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return { ok: false, error: MISSING_ENV };
  }

  const draft = readDraft(formData);
  if (!isDraft(draft)) return draft;

  const bookingRow: BookingInsert = {
    service_name: draft.serviceName,
    status: "scheduled",
    start_time: draft.startTime,
    end_time: draft.endTime,
    price: draft.price,
  };

  let customerId: string;
  try {
    const lookup = await supabase
      .from("customers")
      .select("id, email, created_at")
      .ilike("email", draft.email)
      .order("created_at", { ascending: true })
      .limit(100);

    if (lookup.error) {
      return { ok: false, error: friendlyError(lookup.error.message) };
    }

    const rows = Array.isArray(lookup.data) ? lookup.data : [];
    const match = rows.find((row) => {
      const record = row as { email?: unknown };
      return (
        typeof record.email === "string" &&
        record.email.trim().toLowerCase() === draft.email.toLowerCase()
      );
    }) as { id?: unknown } | undefined;

    if (match && typeof match.id === "string") {
      const inserted = await supabase
        .from("bookings")
        .insert({ customer_id: match.id, ...bookingRow })
        .select("id")
        .single();

      if (inserted.error) {
        return { ok: false, error: friendlyError(inserted.error.message) };
      }
      customerId = match.id;
    } else {
      const created = await insertCustomerWithBooking(supabase, draft, bookingRow);
      if (!created.ok) return created;
      customerId = created.customerId;
    }
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save the booking.",
    };
  }

  let squareStatus: SquareSyncStatus = "failed";
  try {
    squareStatus = await syncSquareCustomer({
      customerId,
      name: draft.name,
      email: draft.email,
      phone: draft.phone,
    });
  } catch (error) {
    unstable_rethrow(error);
    squareStatus = "failed";
  }
  const notice = squareNotice(squareStatus);

  revalidatePath("/");
  revalidatePath("/dashboard");
  return notice ? { ok: true, notice } : { ok: true };
}

function squareNotice(status: SquareSyncStatus): string | undefined {
  if (status === "skipped") return "Booking saved. Square was skipped.";
  if (status === "failed") return "Booking saved. Square could not be updated.";
  return undefined;
}

type BookingInsert = {
  service_name: string;
  status: "scheduled";
  start_time: string;
  end_time: string;
  price: number;
};

async function insertCustomerWithBooking(
  supabase: NonNullable<ReturnType<typeof getServiceClient>>,
  draft: BookingDraft,
  bookingRow: BookingInsert,
): Promise<{ ok: true; customerId: string } | { ok: false; error: string }> {
  // Customer and booking go in one request. PostgREST commits that pair
  // in a single Postgres transaction, so a rejected booking does not leave
  // a new customer behind.
  const nested = await supabase
    .from("customers")
    .insert({
      name: draft.name,
      email: draft.email,
      phone: draft.phone,
      bookings: [bookingRow],
    })
    .select("id")
    .single();

  if (!nested.error && nested.data && typeof nested.data.id === "string") {
    return { ok: true, customerId: nested.data.id };
  }

  const message = nested.error?.message ?? "";
  const relationshipMissing = /could not find|relationship|schema cache/i.test(message);
  if (!relationshipMissing) {
    return { ok: false, error: friendlyError(message || "Could not save the booking.") };
  }

  const customer = await supabase
    .from("customers")
    .insert({
      name: draft.name,
      email: draft.email,
      phone: draft.phone,
    })
    .select("id")
    .single();

  if (customer.error || !customer.data || typeof customer.data.id !== "string") {
    return {
      ok: false,
      error: friendlyError(customer.error?.message ?? "Could not save the customer."),
    };
  }

  const booking = await supabase
    .from("bookings")
    .insert({ customer_id: customer.data.id, ...bookingRow })
    .select("id")
    .single();

  if (booking.error) {
    await supabase.from("customers").delete().eq("id", customer.data.id);
    return { ok: false, error: friendlyError(booking.error.message) };
  }

  return { ok: true, customerId: customer.data.id };
}
