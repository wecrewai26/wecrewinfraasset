"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { EmptyState, KpiGrid, Meter, PageHeader, Panel, StatusChip } from "@/components/ui/dashboard";

type Site = {
  id: string;
  name: string;
  code: string;
  city?: string;
  country?: string;
  address?: string;
  status: string;
  site_type?: string;
};

type Room = { id: string; name: string; room_type?: string; design_power_kw?: number; design_cooling_kw?: number };
type Building = { id: string; name: string; floors?: number };
type Rack = {
  id: string;
  name: string;
  site_id: string;
  ru_used: number;
  ru_total: number;
  power_used_kw: number;
  power_capacity_kw: number;
  cooling_used_kw: number;
  cooling_capacity_kw: number;
  cooling_mode: string;
  status: string;
};

type Tree = { site: Site; buildings: Building[]; rooms: Room[]; racks: { id: string; name: string }[] };

export default function SiteDetailPage() {
  const params = useParams<{ id: string }>();
  const tree = useQuery({
    queryKey: ["site-tree", params.id],
    queryFn: () => api<Tree>(`/api/v1/sites/${params.id}/tree`),
  });
  const racks = useQuery({
    queryKey: ["racks"],
    queryFn: () => api<{ items: Rack[] }>("/api/v1/racks"),
  });
  const site = tree.data?.site;
  const siteRacks = (racks.data?.items ?? []).filter((r) => r.site_id === params.id);
  if (tree.isLoading) return <p className="text-sm text-muted">Loading site…</p>;
  if (!site) return <EmptyState label="Site not found." />;

  return (
    <div>
      <PageHeader
        eyebrow={site.site_type || "site"}
        title={site.name}
        description={[site.address, site.city, site.country].filter(Boolean).join(" · ")}
        actions={<StatusChip value={site.status} />}
      />
      <KpiGrid
        items={[
          { label: "Code", value: site.code, hint: "site" },
          { label: "Buildings", value: tree.data?.buildings.length ?? 0, hint: "structure" },
          { label: "Rooms", value: tree.data?.rooms.length ?? 0, hint: "white space" },
          { label: "Racks", value: siteRacks.length, hint: "cabinets" },
        ]}
      />
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <Panel title="Buildings">
          <ul className="divide-y divide-line">
            {(tree.data?.buildings ?? []).map((b) => (
              <li key={b.id} className="flex justify-between px-4 py-2.5 text-sm">
                <span>{b.name}</span>
                <span className="text-muted">{b.floors ?? 1} floors</span>
              </li>
            ))}
            {(tree.data?.buildings ?? []).length === 0 ? <EmptyState label="No buildings." /> : null}
          </ul>
        </Panel>
        <Panel title="Rooms">
          <ul className="divide-y divide-line">
            {(tree.data?.rooms ?? []).map((r) => (
              <li key={r.id} className="px-4 py-2.5 text-sm">
                <div className="flex justify-between">
                  <span>{r.name}</span>
                  <span className="font-mono text-[11px] text-muted">{r.room_type}</span>
                </div>
                {r.design_power_kw != null ? (
                  <p className="text-xs text-muted">
                    {r.design_power_kw} kW IT · {r.design_cooling_kw ?? "—"} kW cooling
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {siteRacks.map((r) => (
          <Link key={r.id} href={`/dc/racks/${r.id}`} className="ops-panel rounded-2xl p-4 hover:border-coral/40">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-semibold">{r.name}</h2>
                <p className="text-xs capitalize text-muted">{r.cooling_mode} cooling</p>
              </div>
              <StatusChip value={r.status} />
            </div>
            <Meter label="Space" used={r.ru_used} max={r.ru_total} unit="U" />
            <Meter label="Power" used={r.power_used_kw} max={r.power_capacity_kw} unit="kW" />
            <Meter label="Cooling" used={r.cooling_used_kw} max={r.cooling_capacity_kw} unit="kW" />
          </Link>
        ))}
      </div>
      {siteRacks.length === 0 ? <EmptyState label="No racks on this site." /> : null}
    </div>
  );
}
