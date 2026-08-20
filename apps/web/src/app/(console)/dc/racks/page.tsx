"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Meter, PageHeader, StatusChip } from "@/components/ui/dashboard";

type Rack = {
  id: string;
  name: string;
  ru_used: number;
  ru_total: number;
  power_used_kw: number;
  power_capacity_kw: number;
  cooling_used_kw: number;
  cooling_capacity_kw: number;
  cooling_mode: string;
  status: string;
};

export default function RacksPage() {
  const { data } = useQuery({
    queryKey: ["racks"],
    queryFn: () => api<{ items: Rack[] }>("/api/v1/racks"),
  });
  const rows = data?.items ?? [];
  return (
    <div>
      <PageHeader
        eyebrow="Data center"
        title="Racks"
        description="Space, power and cooling per cabinet."
        meta={`${rows.length} racks`}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <Link key={r.id} href={`/dc/racks/${r.id}`} className="ops-panel rounded-2xl p-4 hover:border-coral/40">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-semibold">{r.name}</h2>
                <p className="text-xs capitalize text-muted">{r.cooling_mode} cooling</p>
              </div>
              <StatusChip value={r.status} />
            </div>
            <Meter label="Space" used={r.ru_used} max={r.ru_total} unit="U" />
            <Meter label="Power" used={r.power_used_kw} max={r.power_capacity_kw} unit="kW" />
            <Meter label="Cooling" used={r.cooling_used_kw} max={r.cooling_capacity_kw} unit="kW" />
          </Link>
        ))}
      </div>
    </div>
  );
}
