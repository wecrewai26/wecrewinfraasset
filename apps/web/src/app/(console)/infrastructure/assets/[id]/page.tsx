"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { DataTable, EmptyState, KpiGrid, PageHeader, Panel, StatusChip } from "@/components/ui/dashboard";

type Attr = { key: string; value: string; unit?: string; source?: string };
type Peer = { id: string; name: string; asset_type: string; health: string };
type Rel = { id: string; rel_type: string; confidence: string; direction: string; peer: Peer };
type AssetAlert = { id: string; title: string; severity: string; status: string; message?: string; source?: string; fired_at?: string };
type Addr = { id: string; address: string; status: string; role?: string; dns_name?: string };

type AssetDetail = {
  id: string;
  name: string;
  asset_type: string;
  asset_subtype?: string;
  hostname?: string;
  fqdn?: string;
  serial_number?: string;
  manufacturer?: string;
  model?: string;
  status: string;
  health: string;
  environment?: string;
  criticality?: string;
  business_service?: string;
  management_ip?: string;
  warranty_expiry?: string;
  eol_date?: string;
  purchase_date?: string;
  eos_date?: string;
  cost?: number;
  currency?: string;
  last_seen_at?: string;
  discovered_by?: string;
  tags?: string;
  location?: {
    site_id?: string;
    site_name?: string;
    site_code?: string;
    rack_id?: string;
    rack_name?: string;
    rack_unit?: number;
    rack_unit_height?: number;
    room_name?: string;
  };
  attributes: Attr[];
  relationships: Rel[];
  alerts: AssetAlert[];
  addresses: Addr[];
};

function dash(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AssetDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, error, isLoading } = useQuery({
    queryKey: ["asset", params.id],
    queryFn: () => api<AssetDetail>(`/api/v1/assets/${params.id}`),
  });
  if (isLoading) return <p className="text-sm text-muted">Loading asset…</p>;
  if (error) return <p className="text-sm text-crit">{String(error)}</p>;
  if (!data) return <EmptyState label="Asset not found." />;

  const loc = data.location;
  const facts: { label: string; value: string; href?: string }[] = [
    { label: "Hostname", value: data.hostname || "—" },
    { label: "FQDN", value: data.fqdn || "—" },
    { label: "Serial", value: data.serial_number || "—" },
    { label: "Manufacturer", value: data.manufacturer || "—" },
    { label: "Model", value: data.model || "—" },
    { label: "Management IP", value: data.management_ip || "—" },
    { label: "Service", value: data.business_service || "—" },
    { label: "Environment", value: data.environment || "—" },
    { label: "Criticality", value: data.criticality || "—" },
    { label: "Discovered by", value: data.discovered_by || "—" },
    { label: "Warranty", value: dash(data.warranty_expiry) },
    { label: "EOL", value: dash(data.eol_date) },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={data.asset_type}
        title={data.name}
        description={[data.asset_subtype, loc?.site_code, loc?.rack_name && `U${loc.rack_unit ?? "—"} ${loc.rack_name}`]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <div className="flex gap-2">
            <StatusChip value={data.health} />
            <StatusChip value={data.status} />
          </div>
        }
      />
      <KpiGrid
        items={[
          { label: "Health", value: data.health, hint: data.status, warn: data.health !== "healthy" },
          { label: "Alerts", value: data.alerts.length, hint: "on this CI", warn: data.alerts.length > 0 },
          { label: "Relations", value: data.relationships.length, hint: "cmdb edges" },
          { label: "Last seen", value: data.last_seen_at ? dash(data.last_seen_at) : "—", hint: data.discovered_by || "source" },
        ]}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="ops-panel rounded-2xl p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">{f.label}</p>
            <p className="mt-1 truncate font-mono text-sm">{f.value}</p>
          </div>
        ))}
      </div>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Location" subtitle="Site · rack · RU">
          <dl className="divide-y divide-line text-sm">
            <div className="flex justify-between px-4 py-2.5">
              <dt className="text-muted">Site</dt>
              <dd>
                {loc?.site_id ? (
                  <Link className="text-coral hover:underline" href={`/dc/sites/${loc.site_id}`}>
                    {loc.site_code} · {loc.site_name}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <dt className="text-muted">Room</dt>
              <dd>{loc?.room_name || "—"}</dd>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <dt className="text-muted">Rack</dt>
              <dd>
                {loc?.rack_id ? (
                  <Link className="text-coral hover:underline" href={`/dc/racks/${loc.rack_id}`}>
                    {loc.rack_name}
                    {loc.rack_unit != null ? ` · U${loc.rack_unit}` : ""}
                    {loc.rack_unit_height ? ` / ${loc.rack_unit_height}U` : ""}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <dt className="text-muted">Cost</dt>
              <dd className="tabular-nums">{data.cost != null ? `${data.currency || "USD"} ${data.cost}` : "—"}</dd>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <dt className="text-muted">Tags</dt>
              <dd>{data.tags || "—"}</dd>
            </div>
          </dl>
        </Panel>
        <Panel title="Addresses" subtitle="IPAM bindings">
          <DataTable
            rows={data.addresses}
            empty="No addresses bound to this asset."
            columns={[
              { key: "address", label: "Address", render: (r) => <span className="font-mono text-xs">{r.address}</span> },
              { key: "role", label: "Role", render: (r) => r.role || "—" },
              { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
              { key: "dns_name", label: "DNS", render: (r) => <span className="font-mono text-xs">{r.dns_name || "—"}</span> },
            ]}
          />
        </Panel>
      </div>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Relationships" subtitle="Named CMDB edges — not UUIDs">
          {data.relationships.length === 0 ? (
            <EmptyState label="No relationships recorded." />
          ) : (
            <ul className="divide-y divide-line">
              {data.relationships.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] uppercase text-muted">
                      {r.direction} · {r.rel_type}
                    </p>
                    <Link className="font-medium text-coral hover:underline" href={`/infrastructure/assets/${r.peer.id}`}>
                      {r.peer.name}
                    </Link>
                    <p className="font-mono text-[11px] text-muted">{r.peer.asset_type}</p>
                  </div>
                  <StatusChip value={r.peer.health} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Alerts" subtitle="Fired against this configuration item">
          {data.alerts.length === 0 ? (
            <EmptyState label="No alerts on this asset." />
          ) : (
            <ul className="divide-y divide-line">
              {data.alerts.map((a) => (
                <li key={a.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link className="text-sm font-medium text-coral hover:underline" href={`/ops/alerts/${a.id}`}>
                      {a.title}
                    </Link>
                    <StatusChip value={a.severity} />
                  </div>
                  {a.message ? <p className="mt-1 text-xs text-muted">{a.message}</p> : null}
                  <p className="mt-1 font-mono text-[11px] text-muted">
                    {a.source} · {dash(a.fired_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <Panel title="Telemetry & attributes" subtitle="Vault refs and DCGM samples — no guessed values">
        <DataTable
          rows={data.attributes.map((a) => ({ ...a, id: a.key }))}
          empty="No attributes on this asset yet."
          columns={[
            { key: "key", label: "Metric", render: (a) => <span className="font-mono text-xs">{a.key}</span> },
            { key: "value", label: "Value", render: (a) => `${a.value}${a.unit ? ` ${a.unit}` : ""}` },
            { key: "source", label: "Source", render: (a) => <span className="text-muted">{a.source || "—"}</span> },
          ]}
        />
      </Panel>
    </div>
  );
}
