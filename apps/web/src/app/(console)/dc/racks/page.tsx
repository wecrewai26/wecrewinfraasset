"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";

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
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Racks</h1>
      <div className="grid grid-cols-3 gap-4">
        {(data?.items ?? []).map((r) => (
          <Link key={r.id} href={`/dc/racks/${r.id}`} className="border border-line bg-panel p-4 rounded block">
            <div className="text-lg font-semibold">{r.name}</div>
            <div className="text-xs text-muted mb-3">{r.cooling_mode} cooling</div>
            <Meter label="Space" used={r.ru_used} max={r.ru_total} unit="U" />
            <Meter label="Power" used={r.power_used_kw} max={r.power_capacity_kw} unit="kW" />
            <Meter label="Cooling" used={r.cooling_used_kw} max={r.cooling_capacity_kw} unit="kW" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function Meter({ label, used, max, unit }: { label: string; used: number; max: number; unit: string }) {
  const pct = max ? Math.min(100, (used / max) * 100) : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span>
          {used}/{max} {unit}
        </span>
      </div>
      <div className="h-1.5 bg-line rounded">
        <div className={`h-1.5 rounded ${pct > 85 ? "bg-crit" : pct > 70 ? "bg-warn" : "bg-signal"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
