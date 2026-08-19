"use client";

import ReactECharts from "echarts-for-react";
import { Activity, Radio, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import type { LiveTelemetrySnapshot } from "@/hooks/use-live-telemetry";
import type { LiveEvent, LiveMonitor, MonitorState, TelemetryPoint } from "@/lib/live-telemetry";

function monitorTone(state: MonitorState) {
  if (state === "alert") return "bg-crit/15 text-crit";
  if (state === "warn") return "bg-warn/20 text-warn";
  return "bg-signal/15 text-signal";
}

function LiveDot({ active }: { active: boolean }) {
  return (
    <span className="relative inline-flex size-2" aria-hidden>
      <span
        className={cn(
          "absolute inline-flex size-full rounded-full opacity-60",
          active ? "animate-ping bg-coral" : "bg-muted/40",
        )}
      />
      <span className={cn("relative inline-flex size-2 rounded-full", active ? "bg-coral" : "bg-muted")} />
    </span>
  );
}

function MetricTile({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-panel px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="font-display mt-1 text-2xl font-semibold tabular-nums tracking-tight">
        {value}
        {unit ? <span className="ml-0.5 text-sm font-medium text-muted">{unit}</span> : null}
      </p>
      <p className="mt-0.5 font-mono text-[10px] text-muted">{hint}</p>
    </div>
  );
}

function TimeseriesWidget({
  title,
  subtitle,
  data,
  dataKey,
  color,
  unit: _unit,
}: {
  title: string;
  subtitle: string;
  data: TelemetryPoint[];
  dataKey: keyof TelemetryPoint;
  color: string;
  unit: string;
}) {
  return (
    <section className="ops-panel flex min-w-0 flex-col rounded-2xl p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold tracking-tight">{title}</h3>
          <p className="text-xs text-muted">{subtitle}</p>
        </div>
        <Activity className="size-3.5 shrink-0 text-tide/70" />
      </div>
      <ReactECharts
        style={{ height: 160 }}
        option={{
          backgroundColor: "transparent",
          grid: { left: 36, right: 8, top: 8, bottom: 24 },
          xAxis: {
            type: "category",
            data: data.map((d) => d.t),
            axisLabel: { color: "#5c5a56", fontSize: 10, interval: 8 },
            axisLine: { show: false },
            axisTick: { show: false },
          },
          yAxis: {
            type: "value",
            axisLabel: { color: "#5c5a56", fontSize: 10 },
            splitLine: { lineStyle: { color: "#ddd6c8", type: "dashed" } },
          },
          series: [
            {
              type: "line",
              data: data.map((d) => d[dataKey]),
              smooth: true,
              showSymbol: false,
              lineStyle: { color, width: 2 },
              areaStyle: { color: `${color}33` },
            },
          ],
          tooltip: { trigger: "axis" },
        }}
      />
    </section>
  );
}

function MonitorsStrip({ monitors }: { monitors: LiveMonitor[] }) {
  return (
    <section className="ops-panel rounded-2xl p-4">
      <div className="mb-3 flex items-center gap-2">
        <ShieldAlert size={16} className="text-coral" />
        <div>
          <h3 className="font-display text-sm font-semibold tracking-tight">Active monitors</h3>
          <p className="text-xs text-muted">Threshold checks on live series — vendor-neutral collectors</p>
        </div>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {monitors.map((m) => (
          <li key={m.id} className="rounded-xl border border-line bg-panel px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium leading-snug">{m.name}</p>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] uppercase", monitorTone(m.state))}>
                {m.state}
              </span>
            </div>
            <p className="mt-1 font-mono text-[10px] text-muted">{m.query}</p>
            <p className="mt-1.5 text-xs tabular-nums">
              <span className="font-semibold">{m.value}</span>
              <span className="text-muted"> · thr {m.threshold}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EventStream({ events }: { events: LiveEvent[] }) {
  return (
    <section className="ops-panel flex h-full flex-col rounded-2xl p-4">
      <div className="mb-3 flex items-center gap-2">
        <Radio size={16} className="text-tide" />
        <div>
          <h3 className="font-display text-sm font-semibold tracking-tight">Live event stream</h3>
          <p className="text-xs text-muted">Rolling ingest from Redfish · SNMP · DCGM</p>
        </div>
      </div>
      <ul className="min-h-0 flex-1 space-y-1.5 overflow-hidden">
        {events.map((e) => (
          <li key={e.id} className="flex items-start gap-2 rounded-lg border border-line bg-ink/50 px-2.5 py-1.5">
            <span
              className={cn(
                "mt-1.5 size-1.5 shrink-0 rounded-full",
                e.severity === "critical" ? "bg-crit" : e.severity === "warn" ? "bg-warn" : "bg-tide",
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{e.label}</p>
              <p className="font-mono text-[10px] text-muted">
                {new Date(e.ts).toLocaleTimeString(undefined, { hour12: false })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LiveTelemetryDashboard({ snapshot }: { snapshot: LiveTelemetrySnapshot }) {
  const { series, latest, monitors, events, updatedAt } = snapshot;
  if (!updatedAt || series.length === 0) return null;
  const ageSec = Math.max(0, Math.round((Date.now() - updatedAt) / 1000));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-coral">Live telemetry</p>
          <h2 className="font-display text-xl font-semibold tracking-tight md:text-2xl">
            Hall metrics & monitors
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Streaming power, cooling and GPU series with threshold monitors — simulated 1.5s ticks until collectors
            attach.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-xs">
          <LiveDot active />
          <span className="font-medium">LIVE</span>
          <span className="font-mono text-muted">{ageSec === 0 ? "now" : `${ageSec}s ago`}</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="IT power" value={latest.powerKw.toFixed(1)} unit="kW" hint="pdu · live" />
        <MetricTile label="Cooling" value={latest.coolingKw.toFixed(1)} unit="kW" hint="cdu · live" />
        <MetricTile label="GPU util" value={latest.gpuUtil.toFixed(0)} unit="%" hint="dcgm · avg" />
        <MetricTile label="GPU temp" value={latest.gpuTemp.toFixed(1)} unit="°C" hint="die · avg" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TimeseriesWidget
          title="IT power"
          subtitle="PDU outlet sum · liquid GPU hall"
          data={series}
          dataKey="powerKw"
          color="#ff5b2e"
          unit="kW"
        />
        <TimeseriesWidget
          title="GPU utilisation"
          subtitle="DCGM average across scheduled devices"
          data={series}
          dataKey="gpuUtil"
          color="#2b4cff"
          unit="%"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <MonitorsStrip monitors={monitors} />
        <EventStream events={events} />
      </div>
    </div>
  );
}
