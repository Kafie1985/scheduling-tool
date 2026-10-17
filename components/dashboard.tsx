"use client";

import { useState } from "react";
import { AddBookingModal } from "@/components/add-booking-modal";
import { Calendar } from "@/components/calendar";
import { CustomerSidebar } from "@/components/customer-sidebar";
import type { Booking, Customer } from "@/lib/types";

export function Dashboard({
  configured,
  customers,
  bookings,
  error,
  today,
  squareConnected,
  squareBanner,
}: {
  configured: boolean;
  customers: Customer[];
  bookings: Booking[];
  error: string | null;
  today: string;
  squareConnected: boolean;
  squareBanner: { tone: "ok" | "warn"; message: string } | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-full">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal-800 text-sm font-semibold tracking-wide text-white">
              ST
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
                Scheduling tool
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-stone-950">Schedule</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {squareConnected ? (
              <p className="inline-flex h-10 items-center rounded-lg bg-teal-50 px-3 text-sm font-medium text-teal-900">
                Square connected
              </p>
            ) : null}
            <a
              href="/api/square/connect"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 hover:bg-stone-50"
            >
              Connect Square
            </a>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900"
            >
              Add booking
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          {squareBanner ? (
            <div
              className={
                squareBanner.tone === "ok"
                  ? "rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-950"
                  : "rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
              }
            >
              {squareBanner.message}
            </div>
          ) : null}
          {configured ? null : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p className="font-medium">Supabase is not configured.</p>
              <p className="mt-1">
                Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and
                SUPABASE_SERVICE_ROLE_KEY to .env.local. The calendar and customer list stay
                empty, and saving a booking is disabled, until those values are present.
              </p>
            </div>
          )}
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">
              <p className="font-medium">Could not load the schedule.</p>
              <p className="mt-1">{error}</p>
            </div>
          ) : null}
          <Calendar bookings={configured && !error ? bookings : []} today={today} />
        </div>
        <CustomerSidebar
          customers={configured && !error ? customers : []}
          configured={configured}
          loadError={Boolean(error)}
        />
      </main>

      {open ? (
        <AddBookingModal configured={configured} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}
