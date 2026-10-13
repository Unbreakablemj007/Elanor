"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SearchIcon } from "@/components/icons";
import { EmptyState } from "@/components/ui";
import { formatUsd } from "@/lib/format";
import { t } from "@/lib/strings";

type Row = { customer_id: string; name: string; phone: string; spent: number; count: number };

export default function CustomerList({ customers }: { customers: Row[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return customers
      .filter((c) => !q || c.name.toLowerCase().includes(q) || (digits && c.phone.replace(/\D/g, "").includes(digits)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, query]);

  return (
    <div className="space-y-4">
      <label className="relative block">
        <span className="sr-only">{t.common.search}</span>
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input type="search" className="input pl-10" placeholder={t.customers.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      {filtered.length === 0 ? (
        <EmptyState>{customers.length === 0 ? t.customers.empty : t.customers.emptyFiltered}</EmptyState>
      ) : (
        <ul className="card divide-y divide-line p-0">
          {filtered.map((c) => (
            <li key={c.customer_id}>
              <Link href={`/customers/${c.customer_id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-bg">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft font-medium text-accent-strong">
                  {c.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-xs text-muted">{c.phone || "—"}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold">{formatUsd(c.spent)}</p>
                  <p className="text-xs text-muted">
                    {c.count} {t.customers.purchases.toLowerCase()}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
