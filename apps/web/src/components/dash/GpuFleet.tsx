"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { EmptyState, KpiGrid, PageHeader, Panel, StatusChip } from "@/components/ui/dashboard";

type Gpu = {
  id: string;
  name: string;
  model?: string;
  health: string;
  business_service?: string;
  metrics: Record<string, { value: string; unit?: string }>;
};

export function GpuFleet({
  title = "GPU fleet",
  description = "NVIDIA DCGM metrics normalized onto CMDB GPU assets.",
  attentionOnly = false,
}: {
  title?: string;
  description?: string;
  attentionOnly?: boolean;
}) {
  const { data } = useQuery({
    queryKey: ["gpu"],
    queryFn: () => api<{ items: Gpu[] }>("/api/v1/gpu"),
  });
  const all = data?.items ?? [];
  const rows = attentionOnly ? all.filter((g) => g.health !== "healthy") : all;
  const degraded = all.filter((g) => g.health !== "healthy").length;
  const hot = all.filter((g) => Number(g.metrics.gpu_temperature_c?.value) >= 80).length;
  return (
    <div>
      <PageHeader
        eyebrow="AI infrastructure"
        title={title}
        description={description}
        meta={`${all.length} GPUs`}
      />
      <KpiGrid
        items={[
          { label: "GPUs", value: all.length, hint: "cmdb" },
          { label: "Attention", value: degraded, hint: "not healthy", warn: degraded > 0 },
          { label: "Hot", value: hot, hint: "≥ 80°C", warn: hot > 0 },
          {
            label: "Avg util",
            value: all.length
              ? `${Math.round(all.reduce((s, g) => s + Number(g.metrics.gpu_utilization_percent?.value || 0), 0) / all.length)}%`
              : "—",
            hint: "dcgm",
          },
        ]}
      />
      <Panel>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-panel/80 text-left text-[11px] uppercase tracking-[0.08em] text-muted">
              <tr>
                {["GPU", "Health", "Util", "Mem", "Temp", "Power", "Throttle", "Service"].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.id} className="border-t border-line hover:bg-black/[0.03]">
                  <td className="px-4 py-2.5">
                    <Link className="font-mono text-xs text-coral hover:underline" href={`/infrastructure/assets/${g.id}`}>
                      {g.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusChip value={g.health} />
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{g.metrics.gpu_utilization_percent?.value ?? "—"}%</td>
                  <td className="px-4 py-2.5 tabular-nums">{g.metrics.gpu_memory_utilization_percent?.value ?? "—"}%</td>
                  <td className="px-4 py-2.5 tabular-nums">{g.metrics.gpu_temperature_c?.value ?? "—"}°C</td>
                  <td className="px-4 py-2.5 tabular-nums">{g.metrics.gpu_power_watts?.value ?? "—"} W</td>
                  <td className="px-4 py-2.5">
                    <StatusChip value={g.metrics.throttling?.value || "none"} />
                  </td>
                  <td className="px-4 py-2.5 text-muted">{g.business_service || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <EmptyState label="No GPUs in this tenant." /> : null}
        </div>
      </Panel>
    </div>
  );
}
