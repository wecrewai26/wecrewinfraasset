"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { EmptyState, KpiGrid, PageHeader, Panel, StatusChip } from "@/components/ui/dashboard";

type Job = {
  id: string;
  name: string;
  ip_range: string;
  protocols: string;
  status: string;
  assets_found: number;
  log?: string;
  error?: string;
  started_at?: string;
  finished_at?: string;
};

export default function DiscoveryJobPage() {
  const params = useParams<{ id: string }>();
  const { data, error, isLoading } = useQuery({
    queryKey: ["job", params.id],
    queryFn: () => api<Job>(`/api/v1/discovery/jobs/${params.id}`),
  });
  if (isLoading) return <p className="text-sm text-muted">Loading job…</p>;
  if (error) return <p className="text-sm text-crit">{String(error)}</p>;
  if (!data) return <EmptyState label="Job not found." />;
  return (
    <div>
      <PageHeader
        eyebrow="Discovery"
        title={data.name}
        description={`${data.protocols} against ${data.ip_range}`}
        actions={<StatusChip value={data.status} />}
      />
      <KpiGrid
        items={[
          { label: "Found", value: data.assets_found, hint: "assets" },
          { label: "Range", value: data.ip_range, hint: "cidr" },
          { label: "Status", value: data.status, hint: "job" },
          { label: "Error", value: data.error ? "yes" : "none", hint: "run", warn: Boolean(data.error) },
        ]}
      />
      {data.error ? <p className="mb-3 text-sm text-crit">{data.error}</p> : null}
      <Panel title="Collector log" subtitle="Synthetic or live plugin output">
        {data.log ? (
          <pre className="max-h-[480px] overflow-auto bg-[#f7f4ee] p-4 font-mono text-[11px] leading-relaxed">{data.log}</pre>
        ) : (
          <EmptyState label="No log captured for this job." />
        )}
      </Panel>
      <p className="mt-3 text-sm">
        <Link className="text-coral hover:underline" href="/infrastructure/discovery">
          Back to jobs
        </Link>
      </p>
    </div>
  );
}
