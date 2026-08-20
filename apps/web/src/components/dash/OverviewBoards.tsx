"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { EmptyState, KpiGrid, Meter, PageHeader, Panel, StatusChip } from "@/components/ui/dashboard";

export type EstateKpis = {
  total_assets: number;
  physical_servers: number;
  virtual_machines: number;
  kubernetes_nodes: number;
  gpus: number;
  network_devices: number;
  it_power_load_kw: number;
  cooling_load_kw: number;
  thermal_headroom_kw: number;
  critical_alerts: number;
  open_incidents: number;
  unhealthy_assets: number;
  capacity_risks: number;
  gpu_avg_util: number;
  gpu_avg_temp: number;
  asset_distribution: { type: string; count: number }[];
  sites: { id: string; name: string; code: string; city?: string; status: string }[];
  racks: {
    id: string;
    name: string;
    power_used_kw: number;
    power_capacity_kw: number;
    cooling_used_kw: number;
    cooling_capacity_kw: number;
    ru_used: number;
    ru_total: number;
  }[];
};

type Asset = {
  id: string;
  name: string;
  asset_type: string;
  health: string;
  status: string;
  business_service?: string;
};

type Alert = { id: string; severity: string; title: string; status: string };
type Incident = { id: string; title: string; severity: string; status: string; summary?: string };

function useKpis() {
  return useQuery({ queryKey: ["kpis"], queryFn: () => api<EstateKpis>("/api/v1/overview/kpis") });
}

export function HealthDashboard() {
  const { data } = useKpis();
  const unhealthy = useQuery({
    queryKey: ["unhealthy-assets"],
    queryFn: async () => {
      const degraded = await api<{ items: Asset[] }>("/api/v1/assets?health=degraded&page_size=20");
      const bad = await api<{ items: Asset[] }>("/api/v1/assets?health=unhealthy&page_size=20");
      const seen = new Set<string>();
      const items = [...degraded.items, ...bad.items].filter((a) => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
      return { items };
    },
  });
  const alerts = useQuery({
    queryKey: ["alerts"],
    queryFn: () => api<{ items: Alert[] }>("/api/v1/alerts"),
  });
  const dist = data?.asset_distribution ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Infrastructure health"
        description="Estate posture across compute, GPU, network and facilities — degraded first."
      />
      <KpiGrid
        items={[
          { label: "Assets", value: data?.total_assets ?? "—", hint: "cmdb" },
          { label: "Unhealthy", value: data?.unhealthy_assets ?? "—", hint: "degraded+", warn: (data?.unhealthy_assets ?? 0) > 0 },
          { label: "Critical alerts", value: data?.critical_alerts ?? "—", hint: "open", warn: (data?.critical_alerts ?? 0) > 0 },
          { label: "Incidents", value: data?.open_incidents ?? "—", hint: "active" },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Distribution" subtitle="Asset types in the tenant" className="lg:col-span-1">
          <ul className="divide-y divide-line">
            {dist.slice(0, 10).map((d) => (
              <li key={d.type} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="font-mono text-xs">{d.type}</span>
                <span className="tabular-nums">{d.count}</span>
              </li>
            ))}
            {dist.length === 0 ? <EmptyState label="No inventory yet." /> : null}
          </ul>
        </Panel>
        <Panel title="Needs attention" subtitle="Degraded or unhealthy assets" className="lg:col-span-2">
          <AssetMini rows={unhealthy.data?.items ?? []} />
        </Panel>
      </div>
      <Panel title="Open alerts" subtitle="Live operations queue" className="mt-4">
        <AlertMini rows={(alerts.data?.items ?? []).filter((a) => a.status !== "resolved").slice(0, 8)} />
      </Panel>
    </div>
  );
}

export function CapacityDashboard() {
  const { data } = useKpis();
  const racks = data?.racks ?? [];
  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Capacity"
        description="Power, cooling and space headroom by rack. R42 is the liquid GPU hall."
      />
      <KpiGrid
        items={[
          { label: "IT power", value: data ? `${data.it_power_load_kw}` : "—", hint: "kW" },
          { label: "Cooling", value: data ? `${data.cooling_load_kw}` : "—", hint: "kW" },
          { label: "Headroom", value: data ? `${data.thermal_headroom_kw}` : "—", hint: "kW", warn: (data?.thermal_headroom_kw ?? 99) < 15 },
          { label: "At risk", value: data?.capacity_risks ?? "—", hint: "racks", warn: (data?.capacity_risks ?? 0) > 0 },
        ]}
      />
      <div className="grid gap-4 md:grid-cols-3">
        {racks.map((r) => (
          <Link key={r.id} href={`/dc/racks/${r.id}`} className="ops-panel rounded-2xl p-4 hover:border-coral/40">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-lg font-semibold">{r.name}</h2>
              <span className="font-mono text-[11px] text-muted">rack</span>
            </div>
            <Meter label="Space" used={r.ru_used} max={r.ru_total} unit="U" />
            <Meter label="Power" used={r.power_used_kw} max={r.power_capacity_kw} unit="kW" />
            <Meter label="Cooling" used={r.cooling_used_kw} max={r.cooling_capacity_kw} unit="kW" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function RiskDashboard() {
  const { data } = useKpis();
  const alerts = useQuery({
    queryKey: ["alerts"],
    queryFn: () => api<{ items: Alert[] }>("/api/v1/alerts"),
  });
  const incidents = useQuery({
    queryKey: ["incidents"],
    queryFn: () => api<{ items: Incident[] }>("/api/v1/incidents"),
  });
  const racks = data?.racks ?? [];
  const risky = racks.filter((r) => r.power_capacity_kw > 0 && (r.power_used_kw / r.power_capacity_kw) > 0.8);

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Risk"
        description="Where headroom, health and open incidents compound — not a scoring black box."
      />
      <KpiGrid
        items={[
          { label: "Capacity risk", value: data?.capacity_risks ?? "—", hint: "racks", warn: (data?.capacity_risks ?? 0) > 0 },
          { label: "Unhealthy", value: data?.unhealthy_assets ?? "—", hint: "assets" },
          { label: "Critical alerts", value: data?.critical_alerts ?? "—", hint: "open", warn: (data?.critical_alerts ?? 0) > 0 },
          { label: "Incidents", value: data?.open_incidents ?? "—", hint: "active" },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Tight racks" subtitle="Power utilisation over 80%">
          <ul className="divide-y divide-line">
            {risky.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <Link href={`/dc/racks/${r.id}`} className="font-medium text-coral hover:underline">
                  {r.name}
                </Link>
                <span className="tabular-nums text-crit">
                  {((r.power_used_kw / r.power_capacity_kw) * 100).toFixed(0)}% power
                </span>
              </li>
            ))}
            {risky.length === 0 ? <EmptyState label="No racks over the power line." /> : null}
          </ul>
        </Panel>
        <Panel title="Active incidents">
          <ul className="divide-y divide-line">
            {(incidents.data?.items ?? []).map((i) => (
              <li key={i.id} className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <StatusChip value={i.severity} />
                  <span className="text-sm font-medium">{i.title}</span>
                </div>
                {i.summary ? <p className="mt-1 text-xs text-muted">{i.summary}</p> : null}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel title="Alerts" className="mt-4">
        <AlertMini rows={alerts.data?.items ?? []} />
      </Panel>
    </div>
  );
}

export function SustainabilityDashboard() {
  const { data } = useKpis();
  const pue =
    data && data.it_power_load_kw > 0
      ? ((data.it_power_load_kw + data.cooling_load_kw) / data.it_power_load_kw).toFixed(2)
      : "—";
  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Sustainability"
        description="Facilities load next to IT load. Approximate PUE from rack power + cooling, not a billed utility meter."
      />
      <KpiGrid
        items={[
          { label: "IT power", value: data ? `${data.it_power_load_kw}` : "—", hint: "kW" },
          { label: "Cooling", value: data ? `${data.cooling_load_kw}` : "—", hint: "kW" },
          { label: "Headroom", value: data ? `${data.thermal_headroom_kw}` : "—", hint: "kW" },
          { label: "Est. PUE", value: pue, hint: "IT + cooling / IT" },
        ]}
      />
      <div className="grid gap-4 md:grid-cols-3">
        {(data?.racks ?? []).map((r) => (
          <Link key={r.id} href={`/dc/racks/${r.id}`} className="ops-panel rounded-2xl p-4 hover:border-coral/40">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-lg font-semibold">{r.name}</h2>
              <span className="font-mono text-[11px] text-muted">thermal</span>
            </div>
            <Meter label="Power" used={r.power_used_kw} max={r.power_capacity_kw} unit="kW" />
            <Meter label="Cooling" used={r.cooling_used_kw} max={r.cooling_capacity_kw} unit="kW" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function CostDashboard() {
  const contracts = useQuery({
    queryKey: ["contracts"],
    queryFn: () => api<{ items: Record<string, unknown>[] }>("/api/v1/contracts"),
  });
  const licenses = useQuery({
    queryKey: ["licenses"],
    queryFn: () => api<{ items: Record<string, unknown>[] }>("/api/v1/licenses"),
  });
  const vendors = useQuery({
    queryKey: ["vendors"],
    queryFn: () => api<{ items: Record<string, unknown>[] }>("/api/v1/vendors"),
  });
  const { data } = useKpis();
  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Cost"
        description="Contracts, licenses and vendors on this tenant — not a finance system of record."
      />
      <KpiGrid
        items={[
          { label: "Vendors", value: vendors.data?.items.length ?? "—", hint: "catalog" },
          { label: "Contracts", value: contracts.data?.items.length ?? "—", hint: "amc" },
          { label: "Licenses", value: licenses.data?.items.length ?? "—", hint: "entitlements" },
          { label: "Servers", value: data?.physical_servers ?? "—", hint: "capital" },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Contracts">
          <SimpleList
            rows={(contracts.data?.items ?? []).map((c) => ({
              title: String(c.name ?? c.vendor ?? "Contract"),
              meta: String(c.status ?? c.end_date ?? ""),
            }))}
          />
        </Panel>
        <Panel title="Licenses">
          <SimpleList
            rows={(licenses.data?.items ?? []).map((c) => ({
              title: String(c.name ?? c.product ?? "License"),
              meta: String(c.status ?? ""),
            }))}
          />
        </Panel>
      </div>
    </div>
  );
}

export function AlertsDashboard() {
  const alerts = useQuery({
    queryKey: ["alerts"],
    queryFn: () => api<{ items: Alert[] }>("/api/v1/alerts"),
  });
  const rows = alerts.data?.items ?? [];
  const open = rows.filter((a) => a.status === "open" || a.status === "firing").length;
  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Critical alerts"
        description="Open hall and GPU conditions. Evidence lives on the asset, not in this list alone."
        meta={`${rows.length} total · ${open} open`}
      />
      <Panel>
        <AlertMini rows={rows} />
      </Panel>
    </div>
  );
}

function AssetMini({ rows }: { rows: Asset[] }) {
  if (!rows.length) return <EmptyState label="No degraded assets." />;
  return (
    <ul className="divide-y divide-line">
      {rows.map((a) => (
        <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
          <Link href={`/infrastructure/assets/${a.id}`} className="font-medium text-coral hover:underline">
            {a.name}
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-[11px] text-muted sm:inline">{a.asset_type}</span>
            <StatusChip value={a.health} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function AlertMini({ rows }: { rows: Alert[] }) {
  if (!rows.length) return <EmptyState label="No alerts." />;
  return (
    <ul className="divide-y divide-line">
      {rows.map((a) => (
        <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <div className="min-w-0">
            <Link href={`/ops/alerts/${a.id}`} className="truncate font-medium text-coral hover:underline">
              {a.title}
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusChip value={a.severity} />
            <StatusChip value={a.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function SimpleList({ rows }: { rows: { title: string; meta: string }[] }) {
  if (!rows.length) return <EmptyState label="None on this tenant." />;
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => (
        <li key={r.title} className="flex items-center justify-between px-4 py-2.5 text-sm">
          <span>{r.title}</span>
          <span className="text-xs text-muted">{r.meta}</span>
        </li>
      ))}
    </ul>
  );
}
