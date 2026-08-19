"use client";

import { useEffect, useState } from "react";
import {
  LIVE_TELEMETRY_TICK_MS,
  appendTelemetryPoint,
  createInitialSeries,
  deriveMonitors,
  nextLiveEvent,
  nextTelemetryPoint,
  type LiveEvent,
  type LiveMonitor,
  type TelemetryPoint,
} from "@/lib/live-telemetry";

export type LiveTelemetrySnapshot = {
  series: TelemetryPoint[];
  latest: TelemetryPoint;
  monitors: LiveMonitor[];
  events: LiveEvent[];
  updatedAt: number;
};

const EVENT_CAP = 8;

export function useLiveTelemetry(enabled = true, seed?: Partial<TelemetryPoint>): LiveTelemetrySnapshot {
  const [series, setSeries] = useState<TelemetryPoint[]>([]);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [updatedAt, setUpdatedAt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    setSeries(createInitialSeries(seed));
    setEvents(Array.from({ length: 4 }, () => nextLiveEvent(Date.now() - Math.random() * 12_000)));
    setUpdatedAt(Date.now());
    const id = window.setInterval(() => {
      setSeries((prev) => {
        const last = prev[prev.length - 1]!;
        return appendTelemetryPoint(prev, nextTelemetryPoint(last));
      });
      setUpdatedAt(Date.now());
      if (Math.random() < 0.4) {
        setEvents((prev) => [nextLiveEvent(), ...prev].slice(0, EVENT_CAP));
      }
    }, LIVE_TELEMETRY_TICK_MS);
    return () => window.clearInterval(id);
  }, [enabled]);

  const latest = series[series.length - 1];
  const monitors = latest ? deriveMonitors(latest) : [];
  return {
    series,
    latest: latest ?? {
      t: "00:00:00",
      ts: 0,
      powerKw: seed?.powerKw ?? 0,
      coolingKw: seed?.coolingKw ?? 0,
      gpuUtil: seed?.gpuUtil ?? 0,
      gpuTemp: seed?.gpuTemp ?? 0,
    },
    monitors,
    events,
    updatedAt,
  };
}
