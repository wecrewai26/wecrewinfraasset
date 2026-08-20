"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, getSession } from "@/lib/api";
import {
  DataTable,
  EmptyState,
  KpiGrid,
  Meter,
  PageHeader,
  Panel,
  StatusChip,
} from "@/components/ui/dashboard";

function useItems<T>(path: string) {
  return useQuery({
    queryKey: [path],
    queryFn: async () => {
      const data = await api<T[] | { items?: T[] }>(path);
      if (Array.isArray(data)) return data;
      return data.items ?? [];
    },
  });
}

function dash(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

type Alert = {
  id: string;
  title: string;
  severity: string;
  status: string;
  message?: string;
  source?: string;
  fired_at?: string;
  asset?: { id: string; name: string } | null;
};
type Incident = { id: string; title: string; severity: string; status: string; business_service?: string; summary?: string };
type Change = {
  id: string;
  title: string;
  change_type: string;
  status: string;
  risk: string;
  window_start?: string;
  asset?: { id: string; name: string } | null;
};
type Maint = {
  id: string;
  title: string;
  status: string;
  impact?: string;
  starts_at?: string;
  ends_at?: string;
  asset?: { id: string; name: string } | null;
};
type Subnet = { id: string; cidr: string; gateway?: string; purpose?: string; dhcp: boolean; utilization_percent: number };
type Vlan = { id: string; vlan_id: number; name: string; purpose?: string };
type Dns = { id: string; name: string; record_type: string; value: string; zone: string; ttl: number };
type Net = { id: string; name: string; network_type: string; status: string };
type Addr = { id: string; address: string; status: string; role?: string; dns_name?: string };
type Facility = {
  id: string;
  name: string;
  asset_type: string;
  health: string;
  status: string;
  model?: string;
  attributes?: Record<string, string>;
};
type CapRow = {
  id?: string;
  scope_name: string;
  scope_id?: string;
  resource: string;
  used: number;
  maximum: number;
  available: number;
  headroom_percent: number;
  risk: string;
};
type CloudAccount = { id: string; provider: string; name: string; account_id: string; environment: string; status: string };
type CloudResource = { id: string; provider: string; name: string; resource_type: string; region?: string; status: string };
type User = { id: string; email: string; full_name: string; role: string; team?: string; is_active: boolean };
type Audit = { id: string; action: string; actor_email?: string; resource_type: string; details?: string; created_at?: string };
type Cred = { id: string; name: string; protocol: string; username?: string; vault_path?: string; has_secret: boolean };
type Vendor = { id: string; name: string; category: string; support_email?: string };
type Warranty = { id: string; coverage: string; start_date?: string; end_date?: string };
type Contract = { id: string; name: string; contract_type: string; value?: number; currency?: string; end_date?: string };
type License = { id: string; name: string; seats?: number; used?: number; expiry?: string };
type Rel = {
  id: string;
  rel_type: string;
  source_id: string;
  target_id: string;
  confidence: string;
  source?: { id: string; name: string; asset_type: string; health: string };
  target?: { id: string; name: string; asset_type: string; health: string };
};
type Prediction = { id: string; prediction_type: string; summary: string; confidence: string; horizon_days: number };

export function AlertsBoard() {
  const { data: rows = [] } = useItems<Alert>("/api/v1/alerts");
  const open = rows.filter((r) => r.status === "open" || r.status === "firing");
  const crit = open.filter((r) => r.severity === "critical" || r.severity === "high");
  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Alerts"
        description="Open hall, GPU and fabric conditions. Evidence stays on the asset."
        meta={`${rows.length} total`}
      />
      <KpiGrid
        items={[
          { label: "Open", value: open.length, hint: "queue" },
          { label: "Critical / high", value: crit.length, hint: "page", warn: crit.length > 0 },
          { label: "Sources", value: new Set(rows.map((r) => r.source).filter(Boolean)).size || "—", hint: "emitters" },
          { label: "Resolved", value: rows.filter((r) => r.status === "resolved").length, hint: "closed" },
        ]}
      />
      <Panel>
        <DataTable
          rows={rows}
          columns={[
            { key: "title", label: "Alert", render: (r) => (
              <Link className="font-medium text-coral hover:underline" href={`/ops/alerts/${r.id}`}>
                {r.title}
              </Link>
            ) },
            { key: "severity", label: "Severity", render: (r) => <StatusChip value={r.severity} /> },
            { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
            { key: "source", label: "Source", render: (r) => <span className="font-mono text-xs">{r.source || "—"}</span> },
            { key: "fired_at", label: "Fired", render: (r) => dash(r.fired_at) },
          ]}
        />
      </Panel>
    </div>
  );
}

export function IncidentsBoard() {
  const { data: rows = [] } = useItems<Incident>("/api/v1/incidents");
  const active = rows.filter((r) => r.status !== "resolved");
  return (
    <div>
      <PageHeader eyebrow="Operations" title="Incidents" description="Active investigations on this tenant." meta={`${rows.length} records`} />
      <KpiGrid
        items={[
          { label: "Active", value: active.length, hint: "open", warn: active.length > 0 },
          { label: "Critical", value: rows.filter((r) => r.severity === "critical").length, hint: "P1" },
          { label: "Services", value: new Set(rows.map((r) => r.business_service).filter(Boolean)).size, hint: "mapped" },
          { label: "Total", value: rows.length, hint: "history" },
        ]}
      />
      <Panel>
        <DataTable
          rows={rows}
          columns={[
            { key: "title", label: "Incident", render: (r) => (
              <Link className="font-medium text-coral hover:underline" href={`/ops/incidents/${r.id}`}>
                {r.title}
              </Link>
            ) },
            { key: "severity", label: "Severity", render: (r) => <StatusChip value={r.severity} /> },
            { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
            { key: "business_service", label: "Service", render: (r) => r.business_service || "—" },
            { key: "summary", label: "Summary", render: (r) => <span className="text-muted">{r.summary || "—"}</span> },
          ]}
        />
      </Panel>
    </div>
  );
}

export function ChangesBoard() {
  const { data: rows = [] } = useItems<Change>("/api/v1/changes");
  return (
    <div>
      <PageHeader eyebrow="Operations" title="Changes" description="Scheduled windows against CMDB assets." />
      <KpiGrid
        items={[
          { label: "Changes", value: rows.length, hint: "cab" },
          { label: "High risk", value: rows.filter((r) => r.risk === "high" || r.risk === "critical").length, hint: "review" },
          { label: "Scheduled", value: rows.filter((r) => r.status === "scheduled").length, hint: "window" },
          { label: "Types", value: new Set(rows.map((r) => r.change_type)).size, hint: "kinds" },
        ]}
      />
      <Panel>
        <DataTable
          rows={rows}
          columns={[
            { key: "title", label: "Change", render: (r) => (
              <Link className="font-medium text-coral hover:underline" href={`/ops/changes/${r.id}`}>
                {r.title}
              </Link>
            ) },
            { key: "change_type", label: "Type", render: (r) => <span className="font-mono text-xs">{r.change_type}</span> },
            { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
            { key: "risk", label: "Risk", render: (r) => <StatusChip value={r.risk} /> },
            { key: "window_start", label: "Window", render: (r) => dash(r.window_start) },
          ]}
        />
      </Panel>
    </div>
  );
}

export function MaintenanceBoard() {
  const { data: rows = [] } = useItems<Maint>("/api/v1/maintenance");
  return (
    <div>
      <PageHeader eyebrow="Operations" title="Maintenance" description="Planned work that can take capacity off the floor." />
      <Panel>
        <DataTable
          rows={rows}
          columns={[
            { key: "title", label: "Window", render: (r) => (
              <Link className="font-medium text-coral hover:underline" href={`/ops/maintenance/${r.id}`}>
                {r.title}
              </Link>
            ) },
            { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
            { key: "starts_at", label: "Starts", render: (r) => dash(r.starts_at) },
            { key: "ends_at", label: "Ends", render: (r) => dash(r.ends_at) },
            { key: "impact", label: "Impact", render: (r) => <span className="text-muted">{r.impact || "—"}</span> },
          ]}
        />
      </Panel>
    </div>
  );
}

export function IpamBoard() {
  const { data: rows = [] } = useItems<Subnet>("/api/v1/ipam/subnets");
  const hot = rows.filter((r) => r.utilization_percent >= 80).length;
  return (
    <div>
      <PageHeader eyebrow="Network" title="IPAM" description="Subnet utilisation across the tenant." meta={`${rows.length} prefixes`} />
      <KpiGrid
        items={[
          { label: "Subnets", value: rows.length, hint: "prefixes" },
          { label: "Hot", value: hot, hint: "≥ 80%", warn: hot > 0 },
          { label: "DHCP", value: rows.filter((r) => r.dhcp).length, hint: "enabled" },
          {
            label: "Avg used",
            value: rows.length ? `${Math.round(rows.reduce((s, r) => s + r.utilization_percent, 0) / rows.length)}%` : "—",
            hint: "utilisation",
          },
        ]}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((s) => (
          <div key={s.id} className="ops-panel rounded-2xl p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-mono text-sm font-medium">{s.cidr}</h2>
              <span className="text-xs text-muted">{s.purpose || "subnet"}</span>
            </div>
            <Meter label="Utilisation" used={s.utilization_percent} max={100} unit="%" />
            <p className="mt-2 font-mono text-[11px] text-muted">gw {s.gateway || "—"} · dhcp {s.dhcp ? "on" : "off"}</p>
          </div>
        ))}
      </div>
      {rows.length === 0 ? <EmptyState label="No subnets in this tenant." /> : null}
    </div>
  );
}

export function VlansBoard() {
  const { data: rows = [] } = useItems<Vlan>("/api/v1/ipam/vlans");
  return (
    <div>
      <PageHeader eyebrow="Network" title="VLANs" description="Layer-2 segments used by the hall and GPU fabric." meta={`${rows.length} VLANs`} />
      <Panel>
        <DataTable
          rows={rows}
          columns={[
            { key: "vlan_id", label: "ID", render: (r) => <span className="font-mono">{r.vlan_id}</span> },
            { key: "name", label: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
            { key: "purpose", label: "Purpose", render: (r) => r.purpose || "—" },
          ]}
        />
      </Panel>
    </div>
  );
}

export function DnsBoard() {
  const { data: rows = [] } = useItems<Dns>("/api/v1/ipam/dns");
  return (
    <div>
      <PageHeader eyebrow="Network" title="DNS" description="Records bound to CMDB names." meta={`${rows.length} records`} />
      <Panel>
        <DataTable
          rows={rows}
          columns={[
            { key: "name", label: "Name", render: (r) => <span className="font-mono text-xs">{r.name}</span> },
            { key: "record_type", label: "Type", render: (r) => <StatusChip value={r.record_type} /> },
            { key: "value", label: "Value", render: (r) => <span className="font-mono text-xs">{r.value}</span> },
            { key: "zone", label: "Zone" },
            { key: "ttl", label: "TTL", className: "px-4 py-2.5 tabular-nums" },
          ]}
        />
      </Panel>
    </div>
  );
}

export function NetworksBoard() {
  const { data: rows = [] } = useItems<Net>("/api/v1/ipam/networks");
  return (
    <div>
      <PageHeader eyebrow="Network" title="Networks" description="LAN, storage and GPU fabrics." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((n) => (
          <div key={n.id} className="ops-panel rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-coral">{n.network_type}</p>
                <h2 className="font-display mt-1 text-lg font-semibold">{n.name}</h2>
              </div>
              <StatusChip value={n.status} />
            </div>
          </div>
        ))}
      </div>
      {rows.length === 0 ? <EmptyState label="No networks yet." /> : null}
    </div>
  );
}

export function AddressesBoard() {
  const { data: rows = [] } = useItems<Addr>("/api/v1/ipam/addresses");
  return (
    <div>
      <PageHeader eyebrow="Network" title="IP addresses" description="Allocated management and data-plane addresses." meta={`${rows.length} IPs`} />
      <KpiGrid
        items={[
          { label: "Addresses", value: rows.length, hint: "allocated" },
          { label: "Roles", value: new Set(rows.map((r) => r.role).filter(Boolean)).size, hint: "kinds" },
          { label: "Named", value: rows.filter((r) => r.dns_name).length, hint: "dns" },
          { label: "Reserved", value: rows.filter((r) => r.status === "reserved").length, hint: "held" },
        ]}
      />
      <Panel>
        <DataTable
          rows={rows}
          columns={[
            { key: "address", label: "Address", render: (r) => <span className="font-mono text-xs">{r.address}</span> },
            { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
            { key: "role", label: "Role", render: (r) => r.role || "—" },
            { key: "dns_name", label: "DNS", render: (r) => <span className="font-mono text-xs">{r.dns_name || "—"}</span> },
          ]}
        />
      </Panel>
    </div>
  );
}

function FacilityBoard({
  path,
  title,
  eyebrow,
  description,
}: {
  path: string;
  title: string;
  eyebrow: string;
  description: string;
}) {
  const { data: rows = [] } = useItems<Facility>(path);
  const unhealthy = rows.filter((r) => r.health !== "healthy").length;
  return (
    <div>
      <PageHeader eyebrow={eyebrow} title={title} description={description} meta={`${rows.length} assets`} />
      <KpiGrid
        items={[
          { label: "Assets", value: rows.length, hint: "cmdb" },
          { label: "Attention", value: unhealthy, hint: "not healthy", warn: unhealthy > 0 },
          { label: "Types", value: new Set(rows.map((r) => r.asset_type)).size, hint: "classes" },
          { label: "Online", value: rows.filter((r) => r.status === "online" || r.status === "healthy").length, hint: "status" },
        ]}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((a) => {
          const attrs = Object.entries(a.attributes ?? {}).slice(0, 4);
          return (
            <Link key={a.id} href={`/infrastructure/assets/${a.id}`} className="ops-panel rounded-2xl p-4 hover:border-coral/40">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{a.asset_type}</p>
                  <h2 className="font-display mt-1 text-lg font-semibold">{a.name}</h2>
                  <p className="text-xs text-muted">{a.model || "—"}</p>
                </div>
                <StatusChip value={a.health} />
              </div>
              {attrs.length > 0 ? (
                <dl className="space-y-1">
                  {attrs.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2 text-[11px]">
                      <dt className="text-muted">{k.replaceAll("_", " ")}</dt>
                      <dd className="font-mono tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </Link>
          );
        })}
      </div>
      {rows.length === 0 ? <EmptyState label="No assets in this class." /> : null}
    </div>
  );
}

export function PowerBoard() {
  return (
    <FacilityBoard
      path="/api/v1/power"
      eyebrow="Data center"
      title="Power"
      description="Utility → UPS → PDU chain as CMDB assets."
    />
  );
}

export function CoolingBoard() {
  return (
    <FacilityBoard
      path="/api/v1/cooling"
      eyebrow="Data center"
      title="Cooling"
      description="Air and liquid loop — CDU, pumps, chillers, cold plates."
    />
  );
}

export function StorageBoard() {
  return (
    <FacilityBoard path="/api/v1/storage" eyebrow="Storage" title="Storage" description="Arrays and NVMe endpoints in the CMDB." />
  );
}

export function GpuCapacityBoard() {
  const { data: rows = [] } = useItems<CapRow>("/api/v1/capacity");
  const byRack = new Map<string, CapRow[]>();
  for (const r of rows) {
    const key = r.scope_name || "fleet";
    byRack.set(key, [...(byRack.get(key) ?? []), r]);
  }
  const risky = rows.filter((r) => r.risk === "high" || r.risk === "critical").length;
  return (
    <div>
      <PageHeader
        eyebrow="AI infrastructure"
        title="GPU capacity"
        description="Rack power, cooling, space and fleet GPU utilisation — not a scheduler."
      />
      <KpiGrid
        items={[
          { label: "Scopes", value: byRack.size, hint: "racks + fleet" },
          { label: "At risk", value: risky, hint: "high+", warn: risky > 0 },
          { label: "Records", value: rows.length, hint: "metrics" },
          {
            label: "Tightest",
            value: rows.length ? `${Math.min(...rows.map((r) => r.headroom_percent)).toFixed(0)}%` : "—",
            hint: "headroom",
          },
        ]}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...byRack.entries()].map(([name, items]) => (
          <div key={name} className="ops-panel rounded-2xl p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-lg font-semibold">{name}</h2>
              <StatusChip value={items.some((i) => i.risk === "critical" || i.risk === "high") ? "high" : "ok"} />
            </div>
            {items.map((i) => (
              <Meter
                key={`${name}-${i.resource}`}
                label={i.resource.replaceAll("_", " ")}
                used={i.used}
                max={i.maximum}
                unit={i.resource.includes("kw") ? "kW" : i.resource === "space" ? "U" : "%"}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CloudBoard({ provider }: { provider?: string }) {
  const q = useQuery({
    queryKey: ["cloud-accounts"],
    queryFn: () => api<{ accounts: CloudAccount[]; resources: CloudResource[] }>("/api/v1/cloud/accounts"),
  });
  const accounts = (q.data?.accounts ?? []).filter((a) => !provider || a.provider === provider);
  const resources = (q.data?.resources ?? []).filter((r) => !provider || r.provider === provider);
  const title = provider ? provider.toUpperCase() : "Hybrid topology";
  return (
    <div>
      <PageHeader
        eyebrow="Cloud"
        title={title}
        description={provider ? `${provider.toUpperCase()} accounts and native resources linked into the CMDB.` : "All connected clouds on this tenant."}
      />
      <KpiGrid
        items={[
          { label: "Accounts", value: accounts.length, hint: "connected" },
          { label: "Resources", value: resources.length, hint: "native" },
          { label: "Regions", value: new Set(resources.map((r) => r.region).filter(Boolean)).size, hint: "geo" },
          { label: "Providers", value: new Set(accounts.map((a) => a.provider)).size, hint: "clouds" },
        ]}
      />
      <div className="mb-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((a) => (
          <div key={a.id} className="ops-panel rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-coral">{a.provider}</p>
                <h2 className="font-display mt-1 text-lg font-semibold">{a.name}</h2>
                <p className="mt-1 font-mono text-xs text-muted">{a.account_id}</p>
              </div>
              <StatusChip value={a.status} />
            </div>
            <p className="mt-3 text-xs capitalize text-muted">{a.environment}</p>
          </div>
        ))}
      </div>
      <Panel title="Native resources" subtitle="Linked into the CMDB when an asset exists">
        <DataTable
          rows={resources}
          columns={[
            { key: "name", label: "Resource" },
            { key: "provider", label: "Provider", render: (r) => <span className="font-mono text-xs uppercase">{r.provider}</span> },
            { key: "resource_type", label: "Type", render: (r) => <span className="font-mono text-xs">{r.resource_type}</span> },
            { key: "region", label: "Region", render: (r) => r.region || "—" },
            { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
          ]}
        />
      </Panel>
    </div>
  );
}

export function UsersBoard() {
  const { data: rows = [], error } = useItems<User>("/api/v1/users");
  return (
    <div>
      <PageHeader eyebrow="Admin" title="Users" description="Tenant identities and RBAC roles." meta={`${rows.length} accounts`} />
      {error ? <p className="mb-3 text-sm text-crit">{String(error)}</p> : null}
      <KpiGrid
        items={[
          { label: "Users", value: rows.length, hint: "tenant" },
          { label: "Active", value: rows.filter((r) => r.is_active).length, hint: "enabled" },
          { label: "Admins", value: rows.filter((r) => r.role.includes("admin")).length, hint: "privileged" },
          { label: "Teams", value: new Set(rows.map((r) => r.team).filter(Boolean)).size, hint: "groups" },
        ]}
      />
      <Panel>
        <DataTable
          rows={rows}
          columns={[
            { key: "full_name", label: "Name", render: (r) => <span className="font-medium">{r.full_name}</span> },
            { key: "email", label: "Email", render: (r) => <span className="font-mono text-xs">{r.email}</span> },
            { key: "role", label: "Role", render: (r) => <StatusChip value={r.role} /> },
            { key: "team", label: "Team", render: (r) => r.team || "—" },
            { key: "is_active", label: "Active", render: (r) => <StatusChip value={r.is_active ? "active" : "disabled"} /> },
          ]}
        />
      </Panel>
    </div>
  );
}

export function AuditBoard() {
  const { data: rows = [] } = useItems<Audit>("/api/v1/audit");
  return (
    <div>
      <PageHeader eyebrow="Admin" title="Audit logs" description="Immutable actor / action trail. Secrets are never written here." />
      <Panel>
        <DataTable
          rows={rows}
          columns={[
            { key: "created_at", label: "When", render: (r) => dash(r.created_at) },
            { key: "actor_email", label: "Actor", render: (r) => <span className="font-mono text-xs">{r.actor_email || "—"}</span> },
            { key: "action", label: "Action", render: (r) => <span className="font-mono text-xs">{r.action}</span> },
            { key: "resource_type", label: "Resource" },
            { key: "details", label: "Detail", render: (r) => <span className="text-muted">{r.details || "—"}</span> },
          ]}
        />
      </Panel>
    </div>
  );
}

export function CredentialsBoard() {
  const { data: rows = [] } = useItems<Cred>("/api/v1/credentials");
  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Credentials"
        description="Vault references only. Ciphertext never rendered in this console."
      />
      <Panel>
        <DataTable
          rows={rows}
          columns={[
            { key: "name", label: "Name" },
            { key: "protocol", label: "Protocol", render: (r) => <span className="font-mono text-xs">{r.protocol}</span> },
            { key: "username", label: "Username", render: (r) => r.username || "—" },
            { key: "vault_path", label: "Vault", render: (r) => <span className="font-mono text-xs">{r.vault_path || "—"}</span> },
            { key: "has_secret", label: "Secret", render: (r) => <StatusChip value={r.has_secret ? "vault ref" : "none"} /> },
          ]}
        />
      </Panel>
    </div>
  );
}

export function SettingsBoard() {
  const session = getSession();
  const health = useQuery({ queryKey: ["healthz"], queryFn: () => api<{ status: string; product: string; env: string }>("/healthz") });
  const guards = ["No plaintext credentials", "Vault refs only", "No production writes from Copilot", "Evidence required", "RBAC enforced", "Immutable audit"];
  return (
    <div>
      <PageHeader eyebrow="Admin" title="System settings" description="Runtime posture for this console session — not a config editor." />
      <KpiGrid
        items={[
          { label: "API", value: health.data?.status ?? "…", hint: "healthz" },
          { label: "Environment", value: health.data?.env ?? "—", hint: "runtime" },
          { label: "Tenant", value: session?.tenant ?? "—", hint: "scope" },
          { label: "Role", value: session?.role ?? "—", hint: session?.email },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Session">
          <dl className="divide-y divide-line text-sm">
            {[
              ["Signed in as", session?.full_name],
              ["Email", session?.email],
              ["Role", session?.role],
              ["Tenant", session?.tenant],
              ["Product", health.data?.product],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex justify-between px-4 py-2.5">
                <dt className="text-muted">{k}</dt>
                <dd className="font-medium">{v || "—"}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel title="Guards" subtitle="Always on for this deployment">
          <ul className="divide-y divide-line">
            {guards.map((g) => (
              <li key={g} className="px-4 py-2.5 text-sm">
                {g}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

export function VendorsBoard() {
  const { data: rows = [] } = useItems<Vendor>("/api/v1/vendors");
  return (
    <div>
      <PageHeader eyebrow="Lifecycle" title="Vendors" description="Hardware and support contacts on this tenant." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((v) => (
          <div key={v.id} className="ops-panel rounded-2xl p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-coral">{v.category}</p>
            <h2 className="font-display mt-1 text-lg font-semibold">{v.name}</h2>
            <p className="mt-2 font-mono text-xs text-muted">{v.support_email || "no support mailbox"}</p>
          </div>
        ))}
      </div>
      {rows.length === 0 ? <EmptyState label="No vendors catalogued." /> : null}
    </div>
  );
}

export function WarrantyBoard() {
  const { data: rows = [] } = useItems<Warranty>("/api/v1/warranties");
  return (
    <div>
      <PageHeader eyebrow="Lifecycle" title="Warranties" description="Coverage windows attached to CMDB assets." />
      <Panel>
        <DataTable
          rows={rows}
          columns={[
            { key: "coverage", label: "Coverage", render: (r) => <StatusChip value={r.coverage} /> },
            { key: "start_date", label: "Start", render: (r) => dash(r.start_date) },
            { key: "end_date", label: "End", render: (r) => dash(r.end_date) },
          ]}
        />
      </Panel>
    </div>
  );
}

export function ContractsBoard() {
  const { data: rows = [] } = useItems<Contract>("/api/v1/contracts");
  return (
    <div>
      <PageHeader eyebrow="Lifecycle" title="Contracts / AMC" description="Commercial cover — not a finance system of record." />
      <Panel>
        <DataTable
          rows={rows}
          columns={[
            { key: "name", label: "Contract" },
            { key: "contract_type", label: "Type", render: (r) => <span className="font-mono text-xs">{r.contract_type}</span> },
            {
              key: "value",
              label: "Value",
              render: (r) => (r.value != null ? `${r.currency || "USD"} ${r.value.toLocaleString()}` : "—"),
            },
            { key: "end_date", label: "Ends", render: (r) => dash(r.end_date) },
          ]}
        />
      </Panel>
    </div>
  );
}

export function LicensesBoard() {
  const { data: rows = [] } = useItems<License>("/api/v1/licenses");
  return (
    <div>
      <PageHeader eyebrow="Lifecycle" title="Licenses" description="Seat and expiry tracking for software entitlements." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((l) => (
          <div key={l.id} className="ops-panel rounded-2xl p-4">
            <h2 className="font-display text-lg font-semibold">{l.name}</h2>
            {l.seats != null ? <Meter label="Seats" used={l.used ?? 0} max={l.seats} unit="" /> : <p className="mt-2 text-sm text-muted">No seat cap</p>}
            <p className="mt-2 text-xs text-muted">Expires {dash(l.expiry)}</p>
          </div>
        ))}
      </div>
      {rows.length === 0 ? <EmptyState label="No licenses on this tenant." /> : null}
    </div>
  );
}

export function RelationshipsBoard() {
  const { data: rows = [] } = useItems<Rel>("/api/v1/cmdb/relationships");
  const types = [...new Set(rows.map((r) => r.rel_type))];
  return (
    <div>
      <PageHeader eyebrow="CMDB" title="Relationships" description="Typed edges the digital twin uses for blast radius." meta={`${rows.length} edges`} />
      <KpiGrid
        items={[
          { label: "Edges", value: rows.length, hint: "cmdb" },
          { label: "Types", value: types.length, hint: "rel_type" },
          { label: "Confirmed", value: rows.filter((r) => r.confidence === "confirmed").length, hint: "confidence" },
          { label: "Assets", value: new Set(rows.flatMap((r) => [r.source_id, r.target_id])).size, hint: "touched" },
        ]}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {types.map((t) => (
          <span key={t} className="rounded-full border border-line bg-panel px-2 py-0.5 font-mono text-[11px]">
            {t} · {rows.filter((r) => r.rel_type === t).length}
          </span>
        ))}
      </div>
      <Panel>
        <DataTable
          rows={rows.slice(0, 80)}
          columns={[
            { key: "rel_type", label: "Type", render: (r) => <span className="font-mono text-xs">{r.rel_type}</span> },
            {
              key: "source_id",
              label: "Source",
              render: (r) => (
                <Link className="text-coral hover:underline" href={`/infrastructure/assets/${r.source?.id || r.source_id}`}>
                  {r.source?.name || r.source_id.slice(0, 8)}
                </Link>
              ),
            },
            {
              key: "target_id",
              label: "Target",
              render: (r) => (
                <Link className="text-coral hover:underline" href={`/infrastructure/assets/${r.target?.id || r.target_id}`}>
                  {r.target?.name || r.target_id.slice(0, 8)}
                </Link>
              ),
            },
            { key: "confidence", label: "Confidence", render: (r) => <StatusChip value={r.confidence} /> },
          ]}
        />
      </Panel>
    </div>
  );
}

export function CmdbBoard() {
  const kpis = useQuery({ queryKey: ["kpis"], queryFn: () => api<{ total_assets: number; gpus: number; physical_servers: number; unhealthy_assets: number; asset_distribution: { type: string; count: number }[] }>("/api/v1/overview/kpis") });
  const dist = kpis.data?.asset_distribution ?? [];
  return (
    <div>
      <PageHeader eyebrow="CMDB" title="Configuration database" description="Canonical inventory this tenant owns. Drill into assets for evidence." />
      <KpiGrid
        items={[
          { label: "Assets", value: kpis.data?.total_assets ?? "—", hint: "cmdb" },
          { label: "Servers", value: kpis.data?.physical_servers ?? "—", hint: "compute" },
          { label: "GPUs", value: kpis.data?.gpus ?? "—", hint: "accelerators" },
          { label: "Unhealthy", value: kpis.data?.unhealthy_assets ?? "—", hint: "attention", warn: (kpis.data?.unhealthy_assets ?? 0) > 0 },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Classes" subtitle="Asset types in this tenant">
          <ul className="divide-y divide-line">
            {dist.map((d) => (
              <li key={d.type} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="font-mono text-xs">{d.type}</span>
                <span className="tabular-nums">{d.count}</span>
              </li>
            ))}
            {dist.length === 0 ? <EmptyState label="No inventory yet." /> : null}
          </ul>
        </Panel>
        <Panel title="Open the inventory">
          <div className="space-y-2 p-4">
            {[
              ["/infrastructure/assets", "All assets"],
              ["/infrastructure/relationships", "Relationship graph"],
              ["/infrastructure/topology", "Digital twin"],
              ["/infrastructure/discovery", "Discovery jobs"],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="block rounded-xl border border-line px-4 py-3 text-sm hover:border-coral/40">
                {label}
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function PredictionsBoard() {
  const { data: rows = [] } = useItems<Prediction>("/api/v1/predictions");
  return (
    <div>
      <PageHeader
        eyebrow="AI operations"
        title="Predictive maintenance"
        description="Evidence-backed forecasts only. Copilot will not invent remaining useful life."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((p) => (
          <div key={p.id} className="ops-panel rounded-2xl p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-coral">{p.prediction_type}</p>
              <StatusChip value={p.confidence} />
            </div>
            <p className="text-sm">{p.summary}</p>
            <p className="mt-2 text-xs text-muted">{p.horizon_days} day horizon</p>
          </div>
        ))}
      </div>
      {rows.length === 0 ? <EmptyState label="No predictions seeded for this tenant." /> : null}
    </div>
  );
}
