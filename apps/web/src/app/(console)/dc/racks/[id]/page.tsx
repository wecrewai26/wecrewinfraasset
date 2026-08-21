"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { DataTable, EmptyState, KpiGrid, PageHeader, Panel, StatusChip } from "@/components/ui/dashboard";

type Addr = {
  id?: string;
  address: string;
  role?: string;
  status?: string;
  dns_name?: string;
  cidr?: string;
  gateway?: string;
  vlan?: number;
  vlan_name?: string;
  asset_id?: string;
  asset_name?: string;
  asset_type?: string;
};

type Occupant = {
  id: string;
  name: string;
  asset_type: string;
  asset_subtype?: string;
  hostname?: string;
  fqdn?: string;
  serial_number?: string;
  manufacturer?: string;
  model?: string;
  management_ip?: string;
  rack_unit?: number;
  rack_unit_height: number;
  health: string;
  status: string;
  environment?: string;
  criticality?: string;
  business_service?: string;
  gpu_count?: number;
  addresses: Addr[];
};

type Rack = {
  name: string;
  ru_total: number;
  cooling_mode: string;
  location?: {
    site_id?: string;
    site_code?: string;
    site_name?: string;
    city?: string;
    country?: string;
    address?: string;
    building?: string;
    room?: string;
    row?: string;
  };
  capacity: {
    power_kw: { used: number; maximum: number; headroom_percent: number; risk: string };
    cooling_kw: { used: number; maximum: number; headroom_percent: number; risk: string };
    space: { used: number; maximum: number };
    servers: number;
    gpus: number;
  };
  elevation: Occupant[];
  addresses: Addr[];
};

const CHASSIS = new Set(["server", "switch", "pdu", "storage", "firewall", "rack_manifold"]);

function locLine(loc?: Rack["location"]) {
  if (!loc) return "";
  return [loc.site_code, loc.building, loc.room, loc.row, loc.address, loc.city, loc.country].filter(Boolean).join(" · ");
}

function ruLabel(row: Occupant) {
  if (row.rack_unit == null) return "—";
  const height = row.rack_unit_height || 1;
  if (height <= 1) return `U${row.rack_unit}`;
  return `U${row.rack_unit}–${row.rack_unit + height - 1}`;
}

function AssetLink({ row }: { row: Occupant }) {
  return (
    <Link className="font-medium text-coral hover:underline" href={`/infrastructure/assets/${row.id}`}>
      {row.name}
    </Link>
  );
}

export default function RackDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["rack", params.id],
    queryFn: () => api<Rack>(`/api/v1/racks/${params.id}`),
  });
  if (isLoading) return <p className="text-sm text-muted">Loading rack…</p>;
  if (error) return <p className="text-sm text-crit">{String(error)}</p>;
  if (!data) return <EmptyState label="Rack not found." />;

  const servers = data.elevation.filter((e) => e.asset_type === "server");
  const network = data.elevation.filter((e) => e.asset_type === "switch" || e.asset_type === "firewall");
  const power = data.elevation.filter((e) => e.asset_type === "pdu" || e.asset_type === "rack_manifold");
  const chassis = data.elevation.filter((e) => CHASSIS.has(e.asset_type) && e.rack_unit != null);
  const units = Array.from({ length: data.ru_total }, (_, i) => data.ru_total - i);
  const loc = data.location;

  return (
    <div>
      <PageHeader
        eyebrow="Data center"
        title={data.name}
        description={`${data.cooling_mode} cooling · ${data.capacity.servers} servers · ${data.capacity.gpus} GPUs${locLine(loc) ? ` · ${locLine(loc)}` : ""}`}
        actions={
          loc?.site_id ? (
            <Link className="text-sm text-coral hover:underline" href={`/dc/sites/${loc.site_id}`}>
              {loc.site_code}
            </Link>
          ) : null
        }
      />
      <KpiGrid
        items={[
          {
            label: "Power",
            value: `${data.capacity.power_kw.used}/${data.capacity.power_kw.maximum}`,
            hint: `${data.capacity.power_kw.headroom_percent}% headroom`,
            warn: data.capacity.power_kw.risk === "critical" || data.capacity.power_kw.risk === "high",
          },
          {
            label: "Cooling",
            value: `${data.capacity.cooling_kw.used}/${data.capacity.cooling_kw.maximum}`,
            hint: `${data.capacity.cooling_kw.headroom_percent}% headroom`,
          },
          { label: "Space", value: `${data.capacity.space.used}/${data.capacity.space.maximum}`, hint: "U" },
          { label: "GPUs", value: data.capacity.gpus, hint: "in cabinet" },
        ]}
      />

      <div className="mb-4">
        <Panel title="Servers" subtitle="Hostname, BMC, data IP, serial, and U position">
          {servers.length === 0 ? (
            <EmptyState label="No servers in this cabinet." />
          ) : (
            <DataTable
              rows={servers}
              columns={[
                { key: "name", label: "Server", render: (row) => <AssetLink row={row} /> },
                { key: "hostname", label: "Hostname", render: (row) => <span className="font-mono text-xs">{row.hostname || "—"}</span> },
                { key: "fqdn", label: "FQDN", render: (row) => <span className="font-mono text-xs">{row.fqdn || "—"}</span> },
                {
                  key: "bmc",
                  label: "BMC / mgmt IP",
                  render: (row) => (
                    <span className="font-mono text-xs">{row.management_ip || row.addresses.find((a) => a.role === "bmc" || a.role === "mgmt")?.address || "—"}</span>
                  ),
                },
                {
                  key: "data",
                  label: "Data IP",
                  render: (row) => (
                    <span className="font-mono text-xs">
                      {row.addresses.find((a) => a.role === "roce" || a.role === "data")?.address || "—"}
                    </span>
                  ),
                },
                { key: "serial", label: "Serial", render: (row) => <span className="font-mono text-xs">{row.serial_number || "—"}</span> },
                { key: "model", label: "Model", render: (row) => `${row.manufacturer || ""} ${row.model || ""}`.trim() || "—" },
                { key: "u", label: "U", render: (row) => ruLabel(row) },
                { key: "gpu", label: "GPUs", render: (row) => row.gpu_count || "—" },
                { key: "service", label: "Service", render: (row) => row.business_service || "—" },
                { key: "health", label: "Health", render: (row) => <StatusChip value={row.health} /> },
              ]}
            />
          )}
        </Panel>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Network in cabinet" subtitle="ToR, InfiniBand, management addresses">
          {network.length === 0 ? (
            <EmptyState label="No switches in this cabinet." />
          ) : (
            <DataTable
              rows={network}
              columns={[
                { key: "name", label: "Device", render: (row) => <AssetLink row={row} /> },
                { key: "role", label: "Role", render: (row) => row.asset_subtype || row.asset_type },
                { key: "ip", label: "Mgmt IP", render: (row) => <span className="font-mono text-xs">{row.management_ip || "—"}</span> },
                { key: "fqdn", label: "FQDN", render: (row) => <span className="font-mono text-xs">{row.fqdn || "—"}</span> },
                { key: "model", label: "Model", render: (row) => `${row.manufacturer || ""} ${row.model || ""}`.trim() || "—" },
                { key: "health", label: "Health", render: (row) => <StatusChip value={row.health} /> },
              ]}
            />
          )}
        </Panel>
        <Panel title="Power & liquid" subtitle="PDUs and rack manifold">
          {power.length === 0 ? (
            <EmptyState label="No power or manifold assets." />
          ) : (
            <DataTable
              rows={power}
              columns={[
                { key: "name", label: "Asset", render: (row) => <AssetLink row={row} /> },
                { key: "type", label: "Type", render: (row) => row.asset_type },
                { key: "ip", label: "Mgmt IP", render: (row) => <span className="font-mono text-xs">{row.management_ip || "—"}</span> },
                { key: "serial", label: "Serial", render: (row) => <span className="font-mono text-xs">{row.serial_number || "—"}</span> },
                { key: "model", label: "Model", render: (row) => `${row.manufacturer || ""} ${row.model || ""}`.trim() || "—" },
              ]}
            />
          )}
        </Panel>
      </div>

      <div className="mb-4">
        <Panel title="Addresses" subtitle="IPAM bindings in this cabinet — BMC, RoCE, and OOB">
          {(data.addresses ?? []).length === 0 ? (
            <EmptyState label="No addresses bound in this rack." />
          ) : (
            <DataTable
              rows={(data.addresses ?? []).map((a, i) => ({ ...a, id: a.id || `${a.address}-${i}` }))}
              columns={[
                { key: "asset", label: "Asset", render: (row) => row.asset_name || "—" },
                { key: "address", label: "Address", render: (row) => <span className="font-mono text-xs">{row.address}</span> },
                { key: "role", label: "Role", render: (row) => row.role || "—" },
                { key: "dns", label: "DNS", render: (row) => <span className="font-mono text-xs">{row.dns_name || "—"}</span> },
                { key: "subnet", label: "Subnet", render: (row) => <span className="font-mono text-xs">{row.cidr || "—"}</span> },
                { key: "gw", label: "Gateway", render: (row) => <span className="font-mono text-xs">{row.gateway || "—"}</span> },
                {
                  key: "vlan",
                  label: "VLAN",
                  render: (row) => (row.vlan != null ? `${row.vlan}${row.vlan_name ? ` · ${row.vlan_name}` : ""}` : "—"),
                },
                { key: "status", label: "Status", render: (row) => row.status || "—" },
              ]}
            />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Panel title="Elevation" subtitle="RU from the top — chassis only">
          <div className="max-h-[640px] overflow-auto px-2 py-2">
            {units.map((u) => {
              const occ = chassis.find((e) => e.rack_unit === u);
              return (
                <div key={u} className="flex h-4 items-center gap-2 border-b border-line/60 text-[10px]">
                  <span className="w-6 font-mono text-muted">{u}</span>
                  <div
                    className={`h-3 flex-1 rounded-sm ${
                      occ ? (occ.health === "degraded" || occ.health === "unhealthy" ? "bg-coral/70" : "bg-tide/55") : "bg-transparent"
                    }`}
                  />
                  <span className="w-28 truncate">{occ?.name}</span>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="Occupancy" subtitle="Named configuration items with a U position">
          {chassis.length === 0 ? (
            <EmptyState label="No chassis placed on this elevation." />
          ) : (
            <DataTable
              rows={chassis}
              columns={[
                { key: "name", label: "Asset", render: (row) => <AssetLink row={row} /> },
                { key: "type", label: "Type", render: (row) => <span className="font-mono text-xs">{row.asset_type}</span> },
                { key: "u", label: "U", render: (row) => ruLabel(row) },
                { key: "ip", label: "IP", render: (row) => <span className="font-mono text-xs">{row.management_ip || "—"}</span> },
                { key: "health", label: "Health", render: (row) => <StatusChip value={row.health} /> },
              ]}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
