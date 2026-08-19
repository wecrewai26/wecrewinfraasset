"use client";

import { useState } from "react";
import { api } from "@/lib/api";

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

  async function run() {
    setResult(await api<Radius>("/api/v1/digital-twin/simulate", { method: "POST", body: JSON.stringify({ asset_name: name }) }));
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Failure simulation</h1>
      <p className="text-sm text-muted">Blast radius from the CMDB digital twin. Try CDU-03, UPS-A, TOR-R42, FW-EDGE-01.</p>
      <div className="flex gap-2">
        <input className="bg-panel border border-line rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="bg-coral text-white px-4 rounded" onClick={run}>
          Simulate failure
        </button>
      </div>
      {result && (
        <div className="space-y-3">
          <div className="text-lg">
            {result.origin.name} affects <span className="text-coral">{result.total_affected}</span> assets
          </div>
          <div className="text-sm text-muted">
            {Object.entries(result.counts).map(([k, v]) => `${k}:${v}`).join(" · ")}
          </div>
          <div className="text-sm">Services: {result.business_services.join(", ") || "none"}</div>
          {result.layers.map((l) => (
            <div key={l.depth} className="border border-line p-3 rounded">
              <div className="text-xs text-muted mb-1">Depth {l.depth}</div>
              <div className="text-sm">{l.assets.map((a) => a.name).join(" · ")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
