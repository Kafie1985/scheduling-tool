"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { createBooking } from "@/app/actions/create-booking";
import { BUSINESS_TIME_LABEL, defaultRange } from "@/lib/time";

const fieldClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20";

export function AddBookingModal({
  configured,
  onClose,
}: {
  configured: boolean;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [times] = useState(() => defaultRange());

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, pending]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || pending || notice) return;
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await createBooking(formData);
      if (result.ok) {
        if (result.notice) {
          setNotice(result.notice);
          return;
        }
        onClose();
        return;
      }
      setError(result.error);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/40 p-4 sm:items-center"
      onClick={() => {
        if (!pending) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-booking-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="add-booking-title" className="text-lg font-semibold tracking-tight text-stone-950">
              Add booking
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Status is saved as scheduled. Times use {BUSINESS_TIME_LABEL}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="grid h-8 w-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 disabled:opacity-50"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm font-medium text-stone-700">
            Customer name
            <input name="customerName" required autoFocus autoComplete="name" className={`mt-1 ${fieldClass}`} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-stone-700">
              Email
              <input name="email" type="email" required autoComplete="email" className={`mt-1 ${fieldClass}`} />
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Phone
              <input name="phone" type="tel" required autoComplete="tel" className={`mt-1 ${fieldClass}`} />
            </label>
          </div>
          <label className="block text-sm font-medium text-stone-700">
            Service name
            <input name="serviceName" required placeholder="Wash and fold" className={`mt-1 ${fieldClass}`} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-stone-700">
              Start time
              <input
                name="startTime"
                type="datetime-local"
                required
                defaultValue={times.start}
                className={`mt-1 ${fieldClass}`}
              />
            </label>
            <label className="block text-sm font-medium text-stone-700">
              End time
              <input
                name="endTime"
                type="datetime-local"
                required
                defaultValue={times.end}
                className={`mt-1 ${fieldClass}`}
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-stone-700">
            Price
            <input
              name="price"
              type="number"
              required
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="18.00"
              className={`mt-1 ${fieldClass}`}
            />
          </label>

          {configured ? null : (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Submit is off until NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and
              SUPABASE_SERVICE_ROLE_KEY are set in .env.local.
            </p>
          )}
          {notice ? (
            <p role="status" className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-950">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-50"
            >
              {notice ? "Done" : "Cancel"}
            </button>
            {notice ? null : (
              <button
                type="submit"
                disabled={!configured || pending}
                className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                {pending ? "Saving..." : "Save booking"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
