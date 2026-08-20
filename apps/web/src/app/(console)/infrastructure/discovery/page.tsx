"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { DataTable, EmptyState, KpiGrid, PageHeader, Panel, StatusChip } from "@/components/ui/dashboard";

type Job = {
  id: string;
  name: string;
  ip_range: string;
  protocols: string;
  status: string;
  assets_found: number;
  log?: string;
};

export default function DiscoveryPage() {
  const qc = useQueryClient();
  const [ip, setIp] = useState("10.88.0.0/24");
  const { data } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => api<{ items: Job[] }>("/api/v1/discovery/jobs"),
  });
  const rows = data?.items ?? [];
  const mutate = useMutation({
    mutationFn: () =>
      api<Job>("/api/v1/discovery/jobs", {
        method: "POST",
        body: JSON.stringify({ name: `scan-${Date.now()}`, ip_range: ip, protocols: "synthetic" }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Infrastructure"
        title="Discovery"
        description="Agentless workflow: range → identity → CMDB + topology. Lab jobs use the synthetic plugin."
        meta={`${rows.length} jobs`}
        actions={
          <div className="flex gap-2">
            <input
              className="h-10 w-56 rounded-md border border-line bg-panel px-3 font-mono text-sm outline-none focus:border-coral"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              aria-label="IP range"
            />
            <button
              className="h-10 rounded-md bg-coral px-4 text-sm font-medium text-white disabled:opacity-60"
              disabled={mutate.isPending}
              onClick={() => mutate.mutate()}
            >
              {mutate.isPending ? "Queuing…" : "Run discovery"}
            </button>
          </div>
        }
      />
      <KpiGrid
        items={[
          { label: "Jobs", value: rows.length, hint: "history" },
          { label: "Found", value: rows.reduce((s, j) => s + j.assets_found, 0), hint: "assets" },
          { label: "Running", value: rows.filter((j) => j.status === "running" || j.status === "queued").length, hint: "active" },
          { label: "Failed", value: rows.filter((j) => j.status === "failed").length, hint: "errors", warn: rows.some((j) => j.status === "failed") },
        ]}
      />
      {mutate.error ? <p className="mb-3 text-sm text-crit">{String(mutate.error)}</p> : null}
      <Panel>
        {rows.length === 0 ? (
          <EmptyState label="No discovery jobs yet. Run a synthetic scan to populate the CMDB." />
        ) : (
          <DataTable
            rows={rows}
            columns={[
              { key: "name", label: "Job", render: (j) => (
                <Link className="font-medium text-coral hover:underline" href={`/infrastructure/discovery/${j.id}`}>
                  {j.name}
                </Link>
              ) },
              { key: "ip_range", label: "Range", render: (j) => <span className="font-mono text-xs">{j.ip_range}</span> },
              { key: "protocols", label: "Protocols", render: (j) => <span className="font-mono text-xs">{j.protocols}</span> },
              { key: "status", label: "Status", render: (j) => <StatusChip value={j.status} /> },
              { key: "assets_found", label: "Found", className: "px-4 py-2.5 tabular-nums" },
            ]}
          />
        )}
      </Panel>
    </div>
  );
}
