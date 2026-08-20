"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { KpiGrid, PageHeader, Panel, StatusChip } from "@/components/ui/dashboard";

type Elevation = {
  id: string;
  name: string;
  asset_type: string;
  rack_unit?: number;
  rack_unit_height: number;
  health: string;
  model?: string;
};

type Rack = {
  name: string;
  ru_total: number;
  cooling_mode: string;
  capacity: {
    power_kw: { used: number; maximum: number; headroom_percent: number; risk: string };
    cooling_kw: { used: number; maximum: number; headroom_percent: number; risk: string };
    space: { used: number; maximum: number };
    servers: number;
    gpus: number;
  };
  elevation: Elevation[];
};

export default function RackDetailPage() {
  const params = useParams<{ id: string }>();
  const { data } = useQuery({
    queryKey: ["rack", params.id],
    queryFn: () => api<Rack>(`/api/v1/racks/${params.id}`),
  });
  if (!data) return <p className="text-sm text-muted">Loading rack…</p>;
  const units = Array.from({ length: data.ru_total }, (_, i) => data.ru_total - i);
  return (
    <div>
      <PageHeader
        eyebrow="Data center"
        title={data.name}
        description={`${data.cooling_mode} cooling · ${data.capacity.servers} servers · ${data.capacity.gpus} GPUs`}
      />
      <KpiGrid
        items={[
          {
            label: "Power",
            value: `${data.capacity.power_kw.used}/${data.capacity.power_kw.maximum}`,
            hint: `${data.capacity.power_kw.headroom_percent}% headroom`,
            warn: data.capacity.power_kw.risk === "critical" || data.capacity.power_kw.risk === "high",
          },
          {
            label: "Cooling",
            value: `${data.capacity.cooling_kw.used}/${data.capacity.cooling_kw.maximum}`,
            hint: `${data.capacity.cooling_kw.headroom_percent}% headroom`,
          },
          { label: "Space", value: `${data.capacity.space.used}/${data.capacity.space.maximum}`, hint: "U" },
          { label: "GPUs", value: data.capacity.gpus, hint: "in cabinet" },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Panel title="Elevation" subtitle="RU from the top">
          <div className="max-h-[640px] overflow-auto px-2 py-2">
            {units.map((u) => {
              const occ = data.elevation.find((e) => e.rack_unit === u);
              return (
                <div key={u} className="flex h-4 items-center gap-2 text-[10px] border-b border-line/60">
                  <span className="w-6 font-mono text-muted">{u}</span>
                  <div
                    className={`h-3 flex-1 rounded-sm ${
                      occ ? (occ.health === "degraded" || occ.health === "unhealthy" ? "bg-coral/70" : "bg-tide/55") : "bg-transparent"
                    }`}
                  />
                  <span className="w-28 truncate">{occ?.name}</span>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="Occupancy">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-panel/80 text-left text-[11px] uppercase tracking-[0.08em] text-muted">
                <tr>
                  {["Asset", "Type", "U", "Health"].map((h) => (
                    <th key={h} className="px-4 py-2.5 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.elevation.map((e) => (
                  <tr key={e.id} className="border-t border-line">
                    <td className="px-4 py-2.5">
                      <Link className="font-medium text-coral hover:underline" href={`/infrastructure/assets/${e.id}`}>
                        {e.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{e.asset_type}</td>
                    <td className="px-4 py-2.5 tabular-nums">{e.rack_unit ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <StatusChip value={e.health} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
