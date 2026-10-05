"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  dateKeyFromIso,
  dayNumber,
  formatDayHeading,
  formatMonthLabel,
  formatTime,
  formatWeekLabel,
  isSameMonth,
  monthGrid,
  startOfWeek,
  weekdayLabel,
} from "@/lib/time";
import type { Booking } from "@/lib/types";

type View = "week" | "month";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const statusClass: Record<string, string> = {
  scheduled: "bg-teal-50 text-teal-950 ring-teal-200",
  confirmed: "bg-sky-50 text-sky-950 ring-sky-200",
  completed: "bg-stone-100 text-stone-600 ring-stone-200",
  cancelled: "bg-rose-50 text-rose-800 ring-rose-200",
};

function statusStyle(status: string): string {
  return statusClass[status] ?? "bg-stone-100 text-stone-700 ring-stone-200";
}

function statusLabel(status: string): string {
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Scheduled";
}

function BookingCard({ booking, compact }: { booking: Booking; compact?: boolean }) {
  const time = `${formatTime(booking.startTime)} – ${formatTime(booking.endTime)}`;
  const cancelled = booking.status === "cancelled";

  return (
    <article
      title={`${time} · ${booking.serviceName} · ${booking.customerName} · ${money.format(booking.price)}`}
      className={`rounded-lg px-2 py-1.5 text-left ring-1 ring-inset ${statusStyle(booking.status)} ${cancelled ? "opacity-70" : ""}`}
    >
      <p className={`font-medium leading-4 ${compact ? "truncate text-[11px]" : "text-xs"} ${cancelled ? "line-through" : ""}`}>
        {compact ? `${formatTime(booking.startTime)} ${booking.serviceName}` : booking.serviceName}
      </p>
      {compact ? null : (
        <p className="mt-0.5 text-[11px] leading-4 opacity-80">{time}</p>
      )}
      <p className={`truncate leading-4 ${compact ? "text-[11px]" : "mt-0.5 text-xs"}`}>
        {booking.customerName}
      </p>
      {compact ? null : (
        <p className="mt-1 text-[10px] font-medium uppercase tracking-wide opacity-70">
          {statusLabel(booking.status)} · {money.format(booking.price)}
        </p>
      )}
    </article>
  );
}

export function Calendar({
  bookings,
  today,
}: {
  bookings: Booking[];
  today: string;
}) {
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(today);

  const byDay = useMemo(() => {
    const grouped = new Map<string, Booking[]>();
    for (const booking of bookings) {
      const key = dateKeyFromIso(booking.startTime);
      const list = grouped.get(key);
      if (list) list.push(booking);
      else grouped.set(key, [booking]);
    }
    return grouped;
  }, [bookings]);

  const days = view === "week"
    ? Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(cursor), index))
    : monthGrid(cursor);

  const visibleCount = days.reduce(
    (count, day) => count + (byDay.get(day)?.length ?? 0),
    0,
  );

  function shift(direction: -1 | 1) {
    setCursor((current) =>
      view === "week" ? addDays(current, direction * 7) : addMonths(current, direction),
    );
  }

  const rangeLabel = view === "week" ? formatWeekLabel(cursor) : formatMonthLabel(cursor);

  return (
    <section className="rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-stone-200 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-stone-950">
            {rangeLabel}
          </h2>
          <p className="text-sm text-stone-500">
            {visibleCount === 0
              ? `No bookings this ${view}.`
              : `${visibleCount} booking${visibleCount === 1 ? "" : "s"} this ${view}.`}
            {" "}
            Times are Mountain Time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-stone-100 p-1" role="group" aria-label="Calendar range">
            {(["week", "month"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={view === option}
                onClick={() => setView(option)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                  view === option
                    ? "bg-white text-stone-950 shadow-sm"
                    : "text-stone-600 hover:text-stone-950"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => shift(-1)}
              aria-label={view === "week" ? "Previous week" : "Previous month"}
              className="grid h-9 w-9 place-items-center rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              onClick={() => setCursor(today)}
              className="h-9 rounded-lg border border-stone-200 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => shift(1)}
              aria-label={view === "week" ? "Next week" : "Next month"}
              className="grid h-9 w-9 place-items-center rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50"
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>
        </div>
      </div>

      {view === "week" ? (
        <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-7">
          {days.map((day) => {
            const items = byDay.get(day) ?? [];
            const isToday = day === today;
            return (
              <div
                key={day}
                className={`min-h-36 rounded-xl border p-2 ${
                  isToday ? "border-teal-300 bg-teal-50/50" : "border-stone-200 bg-stone-50/60"
                }`}
              >
                <p className={`mb-2 text-xs font-semibold ${isToday ? "text-teal-800" : "text-stone-500"}`}>
                  {formatDayHeading(day)}
                </p>
                <div className="space-y-2">
                  {items.length === 0 ? (
                    <p className="text-xs text-stone-400">Open</p>
                  ) : (
                    items.map((booking) => <BookingCard key={booking.id} booking={booking} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-3 sm:p-5">
          <div className="grid grid-cols-7 gap-1">
            {days.slice(0, 7).map((day) => (
              <div key={`label-${day}`} className="px-1 pb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                {weekdayLabel(day)}
              </div>
            ))}
            {days.map((day) => {
              const items = byDay.get(day) ?? [];
              const inMonth = isSameMonth(day, cursor);
              const isToday = day === today;
              const extra = Math.max(0, items.length - 3);
              return (
                <div
                  key={day}
                  className={`min-h-24 rounded-lg border p-1.5 sm:min-h-28 ${
                    inMonth ? "border-stone-200 bg-white" : "border-transparent bg-stone-50"
                  } ${isToday ? "ring-2 ring-teal-600" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setCursor(day);
                      setView("week");
                    }}
                    className={`mb-1 grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
                      isToday
                        ? "bg-teal-800 text-white"
                        : inMonth
                          ? "text-stone-800 hover:bg-stone-100"
                          : "text-stone-400 hover:bg-stone-100"
                    }`}
                    aria-label={`Show week of ${formatDayHeading(day)}`}
                  >
                    {dayNumber(day)}
                  </button>
                  <div className="space-y-1">
                    {items.slice(0, 3).map((booking) => (
                      <BookingCard key={booking.id} booking={booking} compact />
                    ))}
                    {extra > 0 ? (
                      <p className="px-1 text-[11px] font-medium text-stone-500">+{extra} more</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
