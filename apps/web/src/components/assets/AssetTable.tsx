"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { healthTone } from "@/lib/cn";

type Asset = {
  id: string;
  name: string;
  asset_type: string;
  manufacturer?: string;
  model?: string;
  status: string;
  health: string;
  business_service?: string;
  management_ip?: string;
  serial_number?: string;
};

export function AssetTable({ assetType, title }: { assetType?: string; title: string }) {
  const [q, setQ] = useState("");
  const params = new URLSearchParams();
  if (assetType) params.set("asset_type", assetType);
  if (q) params.set("q", q);
  params.set("page_size", "200");
  const { data } = useQuery({
    queryKey: ["assets", assetType, q],
    queryFn: () => api<{ items: Asset[]; total: number }>(`/api/v1/assets?${params}`),
  });

  const rows = data?.items ?? [];
  const types = useMemo(() => Array.from(new Set(rows.map((r) => r.asset_type))), [rows]);

  return (
    <div>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-muted text-sm">{data?.total ?? 0} records</p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter name, serial, IP, service"
          className="bg-panel border border-line rounded px-3 py-2 w-80 text-sm"
        />
      </div>
      <div className="overflow-auto border border-line rounded">
        <table className="w-full text-sm">
          <thead className="bg-panel text-muted text-left">
            <tr>
              {["Name", "Type", "Model", "Health", "Status", "Service", "IP"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line hover:bg-black/[0.03]">
                <td className="px-3 py-2">
                  <Link className="text-coral" href={`/infrastructure/assets/${row.id}`}>
                    {row.name}
                  </Link>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{row.asset_type}</td>
                <td className="px-3 py-2">{row.model}</td>
                <td className={`px-3 py-2 ${healthTone(row.health)}`}>{row.health}</td>
                <td className={`px-3 py-2 ${healthTone(row.status)}`}>{row.status}</td>
                <td className="px-3 py-2">{row.business_service}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.management_ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!assetType && <p className="text-[11px] text-muted mt-2">Types in view: {types.join(", ")}</p>}
    </div>
  );
}
