"use client";

import { useMemo, useState } from "react";
import type { Customer } from "@/lib/types";

export function CustomerSidebar({
  customers,
  configured,
  loadError,
}: {
  customers: Customer[];
  configured: boolean;
  loadError: boolean;
}) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.email, customer.phone]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(needle)),
    );
  }, [customers, query]);

  return (
    <aside className="flex max-h-[40rem] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)]">
      <div className="border-b border-stone-200 px-4 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-stone-950">Customers</h2>
          <p className="text-sm text-stone-500">{customers.length}</p>
        </div>
        <label className="mt-3 block">
          <span className="sr-only">Search customers</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, or phone"
            className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-teal-700 focus:bg-white focus:ring-2 focus:ring-teal-700/20"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!configured ? (
          <p className="px-4 py-8 text-sm text-stone-500">
            Names, emails, and phones will list here after Supabase is configured.
          </p>
        ) : loadError ? (
          <p className="px-4 py-8 text-sm text-stone-500">Customers could not be loaded.</p>
        ) : customers.length === 0 ? (
          <p className="px-4 py-8 text-sm text-stone-500">
            No customers yet. A new customer is saved the first time you book their email.
          </p>
        ) : visible.length === 0 ? (
          <p className="px-4 py-8 text-sm text-stone-500">No customers match that search.</p>
        ) : (
          <ul>
            {visible.map((customer) => (
              <li key={customer.id} className="border-b border-stone-100 px-4 py-3 last:border-b-0">
                <p className="font-medium text-stone-950">{customer.name}</p>
                <p className="mt-0.5 truncate text-sm text-stone-600">
                  {customer.email || "No email"}
                </p>
                <p className="truncate text-sm text-stone-500">
                  {customer.phone || "No phone"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
