"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { KpiGrid, PageHeader, Panel } from "@/components/ui/dashboard";

type Radius = {
  origin: { name: string; asset_type: string };
  total_affected: number;
  counts: Record<string, number>;
  business_services: string[];
  layers: { depth: number; assets: { name: string; asset_type: string }[] }[];
};

export default function SimulatePage() {
  const [name, setName] = useState("CDU-03");
  const [result, setResult] = useState<Radius | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      setResult(await api<Radius>("/api/v1/digital-twin/simulate", { method: "POST", body: JSON.stringify({ asset_name: name }) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="AI operations"
        title="Failure simulation"
        description="Blast radius from the CMDB digital twin. Try CDU-03, UPS-A, TOR-R42, FW-EDGE-01."
        actions={
          <div className="flex gap-2">
            <input
              className="h-10 w-48 rounded-md border border-line bg-panel px-3 font-mono text-sm outline-none focus:border-coral"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Asset name"
            />
            <button className="h-10 rounded-md bg-coral px-4 text-sm font-medium text-white disabled:opacity-60" disabled={busy} onClick={() => void run()}>
              {busy ? "Walking graph…" : "Simulate failure"}
            </button>
          </div>
        }
      />
      {error ? <p className="mb-3 text-sm text-crit">{error}</p> : null}
      {result ? (
        <div className="space-y-4">
          <KpiGrid
            items={[
              { label: "Origin", value: result.origin.name, hint: result.origin.asset_type },
              { label: "Affected", value: result.total_affected, hint: "assets", warn: result.total_affected > 10 },
              { label: "Services", value: result.business_services.length, hint: "mapped" },
              { label: "Depths", value: result.layers.length, hint: "hops" },
            ]}
          />
          <Panel title="Impact by class">
            <ul className="divide-y divide-line">
              {Object.entries(result.counts).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-mono text-xs">{k}</span>
                  <span className="tabular-nums">{v}</span>
                </li>
              ))}
            </ul>
          </Panel>
          {result.business_services.length > 0 ? (
            <p className="text-sm text-muted">Services: {result.business_services.join(", ")}</p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            {result.layers.map((l) => (
              <Panel key={l.depth} title={`Depth ${l.depth}`} subtitle={`${l.assets.length} assets`}>
                <p className="px-4 py-3 text-sm leading-relaxed">{l.assets.map((a) => a.name).join(" · ")}</p>
              </Panel>
            ))}
          </div>
        </div>
      ) : (
        <Panel>
          <p className="px-4 py-8 text-center text-sm text-muted">Simulate a failure to walk CMDB relationships outward.</p>
        </Panel>
      )}
    </div>
  );
}
