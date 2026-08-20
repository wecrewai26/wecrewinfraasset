"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { EmptyState, KpiGrid, PageHeader, Panel, StatusChip } from "@/components/ui/dashboard";

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
};

export function AssetTable({
  assetType,
  title,
  eyebrow = "Inventory",
  description,
}: {
  assetType?: string;
  title: string;
  eyebrow?: string;
  description?: string;
}) {
  const [q, setQ] = useState("");
  const params = new URLSearchParams();
  if (assetType) params.set("asset_type", assetType);
  if (q) params.set("q", q);
  params.set("page_size", "200");
  const { data, error, isLoading } = useQuery({
    queryKey: ["assets", assetType, q],
    queryFn: () => api<{ items: Asset[]; total: number }>(`/api/v1/assets?${params}`),
  });

  const rows = data?.items ?? [];
  const types = useMemo(() => Array.from(new Set(rows.map((r) => r.asset_type))), [rows]);
  const unhealthy = rows.filter((r) => r.health === "degraded" || r.health === "unhealthy").length;

  return (
    <div>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        meta={`${data?.total ?? 0} records${unhealthy ? ` · ${unhealthy} attention` : ""}`}
        actions={
          <label className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter name, serial, IP, service"
              className="h-10 w-72 rounded-md border border-line bg-panel pl-9 pr-3 text-sm outline-none focus:border-coral"
            />
          </label>
        }
      />
      <KpiGrid
        items={[
          { label: "In view", value: data?.total ?? rows.length, hint: "cmdb" },
          { label: "Attention", value: unhealthy, hint: "degraded+", warn: unhealthy > 0 },
          { label: "Types", value: types.length || "—", hint: assetType || "mixed" },
          {
            label: "Services",
            value: new Set(rows.map((r) => r.business_service).filter(Boolean)).size,
            hint: "mapped",
          },
        ]}
      />
      {error ? <p className="mb-3 text-sm text-crit">{String(error)}</p> : null}
      <Panel>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-panel/80 text-left text-[11px] uppercase tracking-[0.08em] text-muted">
              <tr>
                {["Name", "Type", "Model", "Health", "Status", "Service", "IP"].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-line hover:bg-black/[0.03]">
                  <td className="px-4 py-2.5">
                    <Link className="font-medium text-coral hover:underline" href={`/infrastructure/assets/${row.id}`}>
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{row.asset_type}</td>
                  <td className="px-4 py-2.5">{row.model || "—"}</td>
                  <td className="px-4 py-2.5">
                    <StatusChip value={row.health} />
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusChip value={row.status} />
                  </td>
                  <td className="px-4 py-2.5 text-muted">{row.business_service || "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{row.management_ip || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {isLoading ? <EmptyState label="Loading inventory…" /> : null}
          {!isLoading && rows.length === 0 ? <EmptyState label="No assets in this view." /> : null}
        </div>
      </Panel>
      {!assetType && types.length > 0 ? (
        <p className="mt-3 text-[11px] text-muted">Types in view: {types.join(" · ")}</p>
      ) : null}
    </div>
  );
}
