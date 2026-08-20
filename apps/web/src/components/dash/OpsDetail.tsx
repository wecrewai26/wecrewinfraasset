"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { EmptyState, KpiGrid, PageHeader, Panel, StatusChip } from "@/components/ui/dashboard";

type AssetRef = { id: string; name: string; asset_type: string; health: string };

function dash(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function AssetLink({ asset }: { asset?: AssetRef | null }) {
  if (!asset) return <span>—</span>;
  return (
    <Link className="text-coral hover:underline" href={`/infrastructure/assets/${asset.id}`}>
      {asset.name}
    </Link>
  );
}

export function AlertDetail() {
  const params = useParams<{ id: string }>();
  const { data, error, isLoading } = useQuery({
    queryKey: ["alert", params.id],
    queryFn: () =>
      api<{
        id: string;
        title: string;
        severity: string;
        status: string;
        message?: string;
        source?: string;
        fired_at?: string;
        asset?: AssetRef | null;
        related_alerts?: { id: string; title: string; severity: string; status: string }[];
      }>(`/api/v1/alerts/${params.id}`),
  });
  if (isLoading) return <p className="text-sm text-muted">Loading alert…</p>;
  if (error) return <p className="text-sm text-crit">{String(error)}</p>;
  if (!data) return <EmptyState label="Alert not found." />;
  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title={data.title}
        description={data.message}
        actions={
          <div className="flex gap-2">
            <StatusChip value={data.severity} />
            <StatusChip value={data.status} />
          </div>
        }
      />
      <KpiGrid
        items={[
          { label: "Severity", value: data.severity, hint: "class", warn: data.severity === "critical" || data.severity === "high" },
          { label: "Source", value: data.source || "—", hint: "emitter" },
          { label: "Fired", value: dash(data.fired_at), hint: "observed" },
          { label: "Asset", value: data.asset?.name || "unscoped", hint: data.asset?.asset_type },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Evidence asset">
          <dl className="divide-y divide-line text-sm">
            <div className="flex justify-between px-4 py-2.5">
              <dt className="text-muted">Configuration item</dt>
              <dd>
                <AssetLink asset={data.asset} />
              </dd>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <dt className="text-muted">Health</dt>
              <dd>
                <StatusChip value={data.asset?.health} />
              </dd>
            </div>
          </dl>
        </Panel>
        <Panel title="Other alerts on this asset">
          {(data.related_alerts ?? []).length === 0 ? (
            <EmptyState label="No sibling alerts." />
          ) : (
            <ul className="divide-y divide-line">
              {(data.related_alerts ?? []).map((a) => (
                <li key={a.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <Link className="text-coral hover:underline" href={`/ops/alerts/${a.id}`}>
                    {a.title}
                  </Link>
                  <StatusChip value={a.severity} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

export function IncidentDetail() {
  const params = useParams<{ id: string }>();
  const { data, error, isLoading } = useQuery({
    queryKey: ["incident", params.id],
    queryFn: () =>
      api<{
        id: string;
        title: string;
        severity: string;
        status: string;
        business_service?: string;
        summary?: string;
        assets?: AssetRef[];
        alerts?: { id: string; title: string; severity: string; status: string; asset?: AssetRef | null }[];
      }>(`/api/v1/incidents/${params.id}`),
  });
  if (isLoading) return <p className="text-sm text-muted">Loading incident…</p>;
  if (error) return <p className="text-sm text-crit">{String(error)}</p>;
  if (!data) return <EmptyState label="Incident not found." />;
  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title={data.title}
        description={data.summary}
        actions={
          <div className="flex gap-2">
            <StatusChip value={data.severity} />
            <StatusChip value={data.status} />
          </div>
        }
      />
      <KpiGrid
        items={[
          { label: "Service", value: data.business_service || "—", hint: "mapped" },
          { label: "Assets", value: data.assets?.length ?? 0, hint: "same service" },
          { label: "Open alerts", value: data.alerts?.length ?? 0, hint: "estate" },
          { label: "Status", value: data.status, hint: "workflow" },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Service assets">
          {(data.assets ?? []).length === 0 ? (
            <EmptyState label="No assets tagged to this service." />
          ) : (
            <ul className="divide-y divide-line">
              {(data.assets ?? []).map((a) => (
                <li key={a.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <AssetLink asset={a} />
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted">{a.asset_type}</span>
                    <StatusChip value={a.health} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Open alerts">
          {(data.alerts ?? []).length === 0 ? (
            <EmptyState label="No open alerts." />
          ) : (
            <ul className="divide-y divide-line">
              {(data.alerts ?? []).map((a) => (
                <li key={a.id} className="px-4 py-2.5 text-sm">
                  <Link className="font-medium text-coral hover:underline" href={`/ops/alerts/${a.id}`}>
                    {a.title}
                  </Link>
                  <p className="text-xs text-muted">{a.asset?.name || "unscoped"}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

export function ChangeDetail() {
  const params = useParams<{ id: string }>();
  const { data, error, isLoading } = useQuery({
    queryKey: ["change", params.id],
    queryFn: () =>
      api<{
        id: string;
        title: string;
        change_type: string;
        status: string;
        risk: string;
        window_start?: string;
        window_end?: string;
        asset?: AssetRef | null;
      }>(`/api/v1/changes/${params.id}`),
  });
  if (isLoading) return <p className="text-sm text-muted">Loading change…</p>;
  if (error) return <p className="text-sm text-crit">{String(error)}</p>;
  if (!data) return <EmptyState label="Change not found." />;
  return (
    <div>
      <PageHeader
        eyebrow="Change"
        title={data.title}
        description={`${data.change_type} · ${dash(data.window_start)} → ${dash(data.window_end)}`}
        actions={
          <div className="flex gap-2">
            <StatusChip value={data.status} />
            <StatusChip value={data.risk} />
          </div>
        }
      />
      <Panel title="Target">
        <dl className="divide-y divide-line text-sm">
          <div className="flex justify-between px-4 py-2.5">
            <dt className="text-muted">Asset</dt>
            <dd>
              <AssetLink asset={data.asset} />
            </dd>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <dt className="text-muted">Window</dt>
            <dd>
              {dash(data.window_start)} — {dash(data.window_end)}
            </dd>
          </div>
        </dl>
      </Panel>
    </div>
  );
}

export function MaintenanceDetail() {
  const params = useParams<{ id: string }>();
  const { data, error, isLoading } = useQuery({
    queryKey: ["maint", params.id],
    queryFn: () =>
      api<{
        id: string;
        title: string;
        status: string;
        impact?: string;
        starts_at?: string;
        ends_at?: string;
        asset?: AssetRef | null;
      }>(`/api/v1/maintenance/${params.id}`),
  });
  if (isLoading) return <p className="text-sm text-muted">Loading maintenance…</p>;
  if (error) return <p className="text-sm text-crit">{String(error)}</p>;
  if (!data) return <EmptyState label="Maintenance not found." />;
  return (
    <div>
      <PageHeader eyebrow="Maintenance" title={data.title} description={data.impact} actions={<StatusChip value={data.status} />} />
      <Panel title="Window">
        <dl className="divide-y divide-line text-sm">
          <div className="flex justify-between px-4 py-2.5">
            <dt className="text-muted">Asset</dt>
            <dd>
              <AssetLink asset={data.asset} />
            </dd>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <dt className="text-muted">Starts</dt>
            <dd>{dash(data.starts_at)}</dd>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <dt className="text-muted">Ends</dt>
            <dd>{dash(data.ends_at)}</dd>
          </div>
        </dl>
      </Panel>
    </div>
  );
}
