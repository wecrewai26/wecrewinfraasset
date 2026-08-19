/** Simulated live DC / GPU telemetry for Command Centre. Ticks locally — no vendor keys. */

export type TelemetryPoint = {
  t: string;
  ts: number;
  powerKw: number;
  coolingKw: number;
  gpuUtil: number;
  gpuTemp: number;
};

export type MonitorState = "ok" | "warn" | "alert";

export type LiveMonitor = {
  id: string;
  name: string;
  query: string;
  state: MonitorState;
  value: string;
  threshold: string;
};

export type LiveEvent = {
  id: string;
  ts: number;
  label: string;
  severity: "info" | "warn" | "critical";
};

const WINDOW = 36;
export const LIVE_TELEMETRY_TICK_MS = 1500;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function walk(prev: number, step: number, min: number, max: number) {
  return clamp(prev + (Math.random() - 0.48) * step, min, max);
}

function clockLabel(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, { hour12: false });
}

export function nextTelemetryPoint(last: TelemetryPoint): TelemetryPoint {
  const ts = Date.now();
  return {
    t: clockLabel(ts),
    ts,
    powerKw: walk(last.powerKw, 4.2, 38, 92),
    coolingKw: walk(last.coolingKw, 3.6, 30, 88),
    gpuUtil: walk(last.gpuUtil, 6, 22, 98),
    gpuTemp: walk(last.gpuTemp, 1.8, 42, 86),
  };
}

export function createInitialSeries(seed?: Partial<TelemetryPoint>): TelemetryPoint[] {
  const now = Date.now();
  const points: TelemetryPoint[] = [];
  let cur: TelemetryPoint = {
    t: clockLabel(now - WINDOW * LIVE_TELEMETRY_TICK_MS),
    ts: now - WINDOW * LIVE_TELEMETRY_TICK_MS,
    powerKw: seed?.powerKw ?? 64,
    coolingKw: seed?.coolingKw ?? 58,
    gpuUtil: seed?.gpuUtil ?? 71,
    gpuTemp: seed?.gpuTemp ?? 68,
  };
  for (let i = 0; i < WINDOW; i += 1) {
    cur = nextTelemetryPoint(cur);
    cur.ts = now - (WINDOW - i) * LIVE_TELEMETRY_TICK_MS;
    cur.t = clockLabel(cur.ts);
    points.push(cur);
  }
  return points;
}

export function appendTelemetryPoint(prev: TelemetryPoint[], next: TelemetryPoint) {
  return [...prev.slice(-(WINDOW - 1)), next];
}

export function deriveMonitors(latest: TelemetryPoint): LiveMonitor[] {
  const gpuState: MonitorState = latest.gpuTemp >= 82 ? "alert" : latest.gpuTemp >= 76 ? "warn" : "ok";
  const utilState: MonitorState = latest.gpuUtil >= 95 ? "alert" : latest.gpuUtil >= 88 ? "warn" : "ok";
  const powerState: MonitorState = latest.powerKw >= 85 ? "warn" : "ok";
  const coolState: MonitorState =
    latest.coolingKw + 4 < latest.powerKw ? "warn" : latest.coolingKw + 10 < latest.powerKw ? "alert" : "ok";
  return [
    {
      id: "gpu-temp",
      name: "GPU die temp",
      query: "avg:dcgm.gpu_temp{site:CHN-DC1}",
      state: gpuState,
      value: `${latest.gpuTemp.toFixed(1)} °C`,
      threshold: "82 °C",
    },
    {
      id: "gpu-util",
      name: "GPU utilisation",
      query: "avg:dcgm.gpu_util{hall:liquid}",
      state: utilState,
      value: `${latest.gpuUtil.toFixed(0)} %`,
      threshold: "95 %",
    },
    {
      id: "it-power",
      name: "IT power load",
      query: "sum:pdu.outlet_kw{rack:R42}",
      state: powerState,
      value: `${latest.powerKw.toFixed(1)} kW`,
      threshold: "85 kW",
    },
    {
      id: "cdu",
      name: "CDU cooling margin",
      query: "cdu.capacity_kw - it_load_kw",
      state: coolState,
      value: `${(latest.coolingKw - latest.powerKw * 0.92).toFixed(1)} kW`,
      threshold: "4 kW",
    },
  ];
}

const EVENT_POOL: { label: string; severity: LiveEvent["severity"] }[] = [
  { label: "DCGM XID 48 recovered on gpu-node-02", severity: "warn" },
  { label: "CDU-03 loop ΔT 0.6 °C above baseline", severity: "warn" },
  { label: "Redfish poll gpu-node-01 BMC 200 OK", severity: "info" },
  { label: "SNMP PDU-R42 outlet 8 current spike 12 A", severity: "critical" },
  { label: "K8s node gpu-node-04 Ready · 32 GPUs scheduled", severity: "info" },
  { label: "Liquid leak sensor R42 U32 dry", severity: "info" },
  { label: "Discovery job redfish-hall completed 11 assets", severity: "info" },
  { label: "UPS-A battery test scheduled window", severity: "warn" },
];

export function nextLiveEvent(ts = Date.now()): LiveEvent {
  const pick = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)]!;
  return {
    id: `evt-${ts}-${Math.random().toString(36).slice(2, 7)}`,
    ts,
    label: pick.label,
    severity: pick.severity,
  };
}
