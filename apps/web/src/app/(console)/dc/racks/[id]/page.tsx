"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { healthTone } from "@/lib/cn";

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
  if (!data) return <div className="text-muted">Loading rack…</div>;
  const units = Array.from({ length: data.ru_total }, (_, i) => data.ru_total - i);
  return (
    <div className="grid grid-cols-[280px_1fr] gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{data.name}</h1>
        <p className="text-sm text-muted mb-4">{data.cooling_mode} · {data.capacity.servers} servers · {data.capacity.gpus} GPUs</p>
        <div className="border border-line bg-panel rounded p-2">
          {units.map((u) => {
            const occ = data.elevation.find((e) => e.rack_unit === u);
            return (
              <div key={u} className="flex items-center gap-2 h-4 text-[10px] border-b border-line/60">
                <span className="w-6 text-muted font-mono">{u}</span>
                <div className={`flex-1 h-3 rounded-sm ${occ ? (occ.health === "degraded" ? "bg-coral/70" : "bg-tide/60") : "bg-transparent"}`} />
                <span className="truncate w-28">{occ?.name}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="space-y-3">
        {(["power_kw", "cooling_kw"] as const).map((k) => (
          <div key={k} className="border border-line bg-panel p-4 rounded">
            <div className="text-xs text-muted uppercase">{k}</div>
            <div className={`text-xl font-mono ${healthTone(data.capacity[k].risk)}`}>
              {data.capacity[k].used} / {data.capacity[k].maximum} · {data.capacity[k].headroom_percent}% headroom
            </div>
          </div>
        ))}
        <table className="w-full text-sm border border-line">
          <thead className="bg-panel text-muted">
            <tr>
              <th className="text-left px-3 py-2">Asset</th>
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-left px-3 py-2">U</th>
              <th className="text-left px-3 py-2">Health</th>
            </tr>
          </thead>
          <tbody>
            {data.elevation.map((e) => (
              <tr key={e.id} className="border-t border-line">
                <td className="px-3 py-2">{e.name}</td>
                <td className="px-3 py-2 font-mono text-xs">{e.asset_type}</td>
                <td className="px-3 py-2">{e.rack_unit ?? "—"}</td>
                <td className={`px-3 py-2 ${healthTone(e.health)}`}>{e.health}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
