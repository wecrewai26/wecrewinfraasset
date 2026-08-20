"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { EmptyState, PageHeader, StatusChip } from "@/components/ui/dashboard";

type Site = {
  id: string;
  name: string;
  code: string;
  city?: string;
  country?: string;
  status: string;
  site_type?: string;
};

export default function SitesPage() {
  const { data } = useQuery({
    queryKey: ["sites"],
    queryFn: () => api<{ items: Site[] }>("/api/v1/data-centers"),
  });
  const rows = data?.items ?? [];
  return (
    <div>
      <PageHeader
        eyebrow="Data center"
        title="Sites"
        description="On-prem halls and edge rooms in this tenant."
        meta={`${rows.length} sites`}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((s) => (
          <Link key={s.id} href={`/dc/sites/${s.id}`} className="ops-panel rounded-2xl p-5 hover:border-coral/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-coral">{s.code}</p>
                <h2 className="font-display mt-1 text-xl font-semibold">{s.name}</h2>
                <p className="mt-1 text-sm text-muted">
                  {[s.city, s.country].filter(Boolean).join(", ") || s.site_type || "site"}
                </p>
              </div>
              <StatusChip value={s.status} />
            </div>
          </Link>
        ))}
      </div>
      {rows.length === 0 ? <EmptyState label="No sites on this tenant." /> : null}
    </div>
  );
}
