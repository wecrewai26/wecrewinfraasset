"use client";

import { useQuery } from "@tanstack/react-query";
import ReactECharts from "echarts-for-react";
import Link from "next/link";
import { Activity, ArrowUpRight, ShieldCheck, Siren, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useLiveTelemetry } from "@/hooks/use-live-telemetry";
import { LiveTelemetryDashboard } from "@/components/ops/LiveTelemetryDashboard";

type Kpis = {
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
  capacity_risks: number;
  unhealthy_assets: number;
  gpu_avg_util: number;
  gpu_avg_temp: number;
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
  sites: { code: string; name: string; status: string }[];
};

type Incident = {
  id: string;
  title: string;
  severity: string;
  status: string;
  business_service?: string;
  summary?: string;
};

type Alert = { id: string; severity: string; title: string; status: string; asset_id?: string };

const GUARDS = [
  "No plaintext credentials",
  "Vault refs only",
  "No production writes from Copilot",
  "Evidence required",
  "RBAC enforced",
  "Immutable audit",
];

function heatTone(pct: number) {
  if (pct >= 85) return "bg-crit/15 text-crit";
  if (pct >= 70) return "bg-warn/20 text-warn";
  if (pct >= 40) return "bg-tide/15 text-tide";
  return "bg-signal/15 text-signal";
}

export default function CommandCentrePage() {
  const { data } = useQuery({ queryKey: ["kpis"], queryFn: () => api<Kpis>("/api/v1/overview/kpis") });
  const { data: incidents } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => api<{ items: Incident[] }>("/api/v1/incidents"),
  });
  const { data: alerts } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => api<{ items: Alert[] }>("/api/v1/alerts"),
  });
  const live = useLiveTelemetry(true, {
    powerKw: data?.it_power_load_kw,
    coolingKw: data?.cooling_load_kw,
    gpuUtil: data?.gpu_avg_util,
    gpuTemp: data?.gpu_avg_temp,
  });

  if (!data) return <div className="text-muted">Loading command picture…</div>;

  const estate = Math.max(
    40,
    100 - data.unhealthy_assets * 3 - data.critical_alerts * 8 - data.capacity_risks * 6,
  );
  const openIncidents = incidents?.items ?? [];
  const p1 = openIncidents.filter((i) => i.severity === "critical" || i.severity === "high" || i.severity === "P1");

  return (
    <div className="space-y-8">
      <section className="command-pulse relative overflow-hidden rounded-2xl border border-rail-line">
        <div className="pointer-events-none absolute inset-0 silicon-circuit" aria-hidden />
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-coral/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-72 rounded-full bg-tide/25 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-8 p-6 md:p-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4 animate-rise-in">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-coral">Platform · scoped estate</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">Command Centre</h1>
            <p className="max-w-xl text-sm leading-relaxed text-rail-fg">
              Inventory, power, cooling, GPU and hybrid topology for the selected site / environment — dig into
              evidence when something breaks. Read-only; Copilot cites metrics, never guesses.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Link
                href="/ops/incidents"
                className="inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-medium text-paper hover:bg-white"
              >
                <Siren size={16} />
                Open active incident
              </Link>
              <Link
                href="/aiops/ask"
                className="inline-flex items-center gap-2 rounded-md border border-rail-line bg-white/5 px-3 py-2 text-sm text-ink hover:bg-white/10"
              >
                Ask InfraAsset
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
          <div className="grid w-full max-w-md grid-cols-3 gap-3 animate-rise-in">
            <PulseStat label="Health" value={estate} hint="estate index" />
            <PulseStat label="Critical" value={data.critical_alerts} hint="open alerts" danger />
            <PulseStat label="GPUs" value={data.gpus} hint={`${data.gpu_avg_util.toFixed(0)}% util`} />
          </div>
        </div>
      </section>

      <div
        role="note"
        className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-signal/25 bg-signal/5 px-3 py-2"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-signal">
          <ShieldCheck size={16} />
          Read-only operations plane
        </span>
        <ul className="flex flex-wrap gap-1.5 text-xs text-muted">
          {GUARDS.map((g) => (
            <li key={g} className="rounded-full border border-line bg-panel px-2 py-0.5">
              {g}
            </li>
          ))}
        </ul>
      </div>

      <section className="ops-panel overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <Sparkles size={16} className="text-tide" />
          <h2 className="font-display text-sm font-semibold">Estate signals</h2>
          <span className="text-xs text-muted">Assets · power · cooling · GPU · alerts</span>
        </div>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 divide-y sm:divide-y-0 sm:divide-x divide-line">
          {[
            { label: "Assets", value: data.total_assets, hint: "cmdb" },
            { label: "Servers", value: data.physical_servers, hint: "compute" },
            { label: "K8s nodes", value: data.kubernetes_nodes, hint: "k8s" },
            { label: "GPUs", value: data.gpus, hint: "dcgm" },
            { label: "IT power", value: `${data.it_power_load_kw}`, hint: "kW" },
            { label: "Cooling", value: `${data.cooling_load_kw}`, hint: "kW" },
            { label: "Headroom", value: `${data.thermal_headroom_kw}`, hint: "kW", warn: data.thermal_headroom_kw < 15 },
            { label: "Capacity risk", value: data.capacity_risks, hint: "racks", warn: data.capacity_risks > 0 },
          ].map((s) => (
            <li key={s.label} className="px-4 py-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">{s.label}</p>
              <p className={`font-display mt-1 text-xl font-semibold tabular-nums ${s.warn ? "text-crit" : ""}`}>
                {s.value}
              </p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">{s.hint}</p>
            </li>
          ))}
        </ul>
      </section>

      <LiveTelemetryDashboard snapshot={live} />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ops-panel rounded-2xl p-5">
          <h2 className="font-display text-lg font-semibold">Power vs cooling</h2>
          <p className="text-sm text-muted mb-3">Rack IT load against thermal capacity · Chennai DC1</p>
          <ReactECharts
            style={{ height: 260 }}
            option={{
              backgroundColor: "transparent",
              textStyle: { color: "#5c5a56" },
              legend: { textStyle: { color: "#5c5a56" } },
              xAxis: { type: "category", data: data.racks.map((r) => r.name), axisLabel: { color: "#5c5a56" } },
              yAxis: { type: "value", name: "kW", axisLabel: { color: "#5c5a56" } },
              series: [
                { name: "Power used", type: "bar", data: data.racks.map((r) => r.power_used_kw), color: "#ff5b2e" },
                { name: "Cooling used", type: "bar", data: data.racks.map((r) => r.cooling_used_kw), color: "#2b4cff" },
              ],
            }}
          />
        </section>
        <section className="ops-panel rounded-2xl p-5">
          <div className="mb-3 flex items-center gap-2">
            <Activity size={16} className="text-coral" />
            <div>
              <h2 className="font-display text-lg font-semibold">Rack headroom</h2>
              <p className="text-sm text-muted">Power / cooling / space utilisation</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted uppercase">
                  <th className="pb-2 font-medium">Rack</th>
                  <th className="pb-2 font-medium">Power</th>
                  <th className="pb-2 font-medium">Cooling</th>
                  <th className="pb-2 font-medium">Space</th>
                </tr>
              </thead>
              <tbody>
                {data.racks.map((r) => {
                  const power = (r.power_used_kw / r.power_capacity_kw) * 100;
                  const cool = (r.cooling_used_kw / r.cooling_capacity_kw) * 100;
                  const space = (r.ru_used / r.ru_total) * 100;
                  return (
                    <tr key={r.id} className="border-t border-line">
                      <th className="py-2.5 pr-4 text-left font-medium">
                        <Link href={`/dc/racks/${r.id}`} className="hover:text-coral">
                          {r.name}
                        </Link>
                      </th>
                      <td className="py-2.5 pr-3">
                        <span className={`inline-flex min-w-12 justify-center rounded-md px-2 py-1 text-xs font-semibold tabular-nums ${heatTone(power)}`}>
                          {power.toFixed(0)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`inline-flex min-w-12 justify-center rounded-md px-2 py-1 text-xs font-semibold tabular-nums ${heatTone(cool)}`}>
                          {cool.toFixed(0)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`inline-flex min-w-12 justify-center rounded-md px-2 py-1 text-xs font-semibold tabular-nums ${heatTone(space)}`}>
                          {space.toFixed(0)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="ops-panel rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <Siren size={16} className="text-crit" />
            <div>
              <h2 className="font-display text-lg font-semibold">Active incidents</h2>
              <p className="text-sm text-muted">Ordered by severity · {p1.length} high/critical</p>
            </div>
          </div>
          <div className="space-y-3">
            {openIncidents.map((i) => (
              <Link
                key={i.id}
                href="/ops/incidents"
                className="block rounded-xl border border-line bg-panel/60 p-3 hover:border-coral/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{i.title}</p>
                  <span className="rounded-full border border-crit/30 bg-crit/10 px-2 py-0.5 text-[11px] uppercase text-crit">
                    {i.severity}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {i.status}
                  {i.business_service ? ` · ${i.business_service}` : ""}
                </p>
                {i.summary && <p className="mt-1 text-xs text-muted">{i.summary}</p>}
              </Link>
            ))}
          </div>
        </section>
        <section className="ops-panel rounded-2xl p-5">
          <h2 className="font-display text-lg font-semibold">Critical alerts</h2>
          <p className="mb-4 text-sm text-muted">Live from telemetry and discovery</p>
          <div className="space-y-3">
            {(alerts?.items ?? []).slice(0, 6).map((a) => (
              <Link key={a.id} href="/ops/alerts" className="block border-b border-line pb-2 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{a.title}</p>
                  <span className={`text-[11px] uppercase ${a.severity === "critical" ? "text-crit" : "text-warn"}`}>
                    {a.severity}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function PulseStat({ label, value, hint, danger }: { label: string; value: number; hint: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-rail-line bg-rail-accent/70 px-3 py-3 backdrop-blur">
      <p className="text-[10px] uppercase tracking-[0.14em] text-rail-fg/70">{label}</p>
      <p className={`font-display mt-1 text-3xl font-semibold tabular-nums ${danger ? "text-red-400" : "text-ink"}`}>
        {value}
      </p>
      <p className="text-xs text-rail-fg/60">{hint}</p>
    </div>
  );
}
