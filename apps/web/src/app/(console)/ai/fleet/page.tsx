"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { healthTone } from "@/lib/cn";

type Gpu = {
  id: string;
  name: string;
  model?: string;
  health: string;
  business_service?: string;
  metrics: Record<string, { value: string; unit?: string }>;
};

export default function GpuFleetPage() {
  const { data } = useQuery({
    queryKey: ["gpu"],
    queryFn: () => api<{ items: Gpu[] }>("/api/v1/gpu"),
  });
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">GPU fleet</h1>
      <p className="text-sm text-muted mb-4">NVIDIA DCGM metrics normalized onto CMDB GPU assets.</p>
      <div className="overflow-auto border border-line rounded">
        <table className="w-full text-sm">
          <thead className="bg-panel text-muted">
            <tr>
              {["GPU", "Health", "Util %", "Mem %", "Temp", "Power", "Throttle", "ECC", "Service"].map((h) => (
                <th key={h} className="text-left px-3 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((g) => (
              <tr key={g.id} className="border-t border-line">
                <td className="px-3 py-2 font-mono text-xs">{g.name}</td>
                <td className={`px-3 py-2 ${healthTone(g.health)}`}>{g.health}</td>
                <td className="px-3 py-2">{g.metrics.gpu_utilization_percent?.value}</td>
                <td className="px-3 py-2">{g.metrics.gpu_memory_utilization_percent?.value}</td>
                <td className="px-3 py-2">{g.metrics.gpu_temperature_c?.value}°C</td>
                <td className="px-3 py-2">{g.metrics.gpu_power_watts?.value} W</td>
                <td className="px-3 py-2">{g.metrics.throttling?.value}</td>
                <td className="px-3 py-2">{g.metrics.ecc_corrected?.value}</td>
                <td className="px-3 py-2">{g.business_service}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
