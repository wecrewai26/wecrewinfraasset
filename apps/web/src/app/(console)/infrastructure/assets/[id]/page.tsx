"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { healthTone } from "@/lib/cn";

export default function AssetDetailPage() {
  const params = useParams<{ id: string }>();
  const { data } = useQuery({
    queryKey: ["asset", params.id],
    queryFn: () => api<Record<string, unknown>>(`/api/v1/assets/${params.id}`),
  });
  if (!data) return <div className="text-muted">Loading asset…</div>;
  const attrs = (data.attributes as { key: string; value: string; unit?: string; source?: string }[]) || [];
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-muted uppercase tracking-widest">{String(data.asset_type)}</div>
        <h1 className="text-2xl font-semibold">{String(data.name)}</h1>
        <div className={healthTone(String(data.health))}>
          {String(data.health)} · {String(data.status)}
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-3 text-sm">
        {["manufacturer", "model", "serial_number", "management_ip", "business_service", "criticality", "environment"].map(
          (k) => (
            <div key={k} className="border border-line bg-panel p-3 rounded">
              <dt className="text-muted text-xs">{k}</dt>
              <dd className="font-mono mt-1">{String(data[k] ?? "—")}</dd>
            </div>
          ),
        )}
      </dl>
      <div className="border border-line rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-panel text-muted">
            <tr>
              <th className="text-left px-3 py-2">Metric</th>
              <th className="text-left px-3 py-2">Value</th>
              <th className="text-left px-3 py-2">Source</th>
            </tr>
          </thead>
          <tbody>
            {attrs.map((a) => (
              <tr key={a.key} className="border-t border-line">
                <td className="px-3 py-2 font-mono text-xs">{a.key}</td>
                <td className="px-3 py-2">
                  {a.value} {a.unit}
                </td>
                <td className="px-3 py-2 text-muted">{a.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
