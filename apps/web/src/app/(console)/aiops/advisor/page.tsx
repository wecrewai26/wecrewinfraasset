"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Panel, StatusChip } from "@/components/ui/dashboard";

type Result = {
  verdict: string;
  rack: string;
  checks: { name: string; result: string; detail: string }[];
  alternatives: { rack: string; verdict: string }[];
};

export default function AdvisorPage() {
  const [rack, setRack] = useState("R42");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      setResult(
        await api<Result>("/api/v1/ai/capacity-advisor", {
          method: "POST",
          body: JSON.stringify({ rack, gpu_count: 8, ru_needed: 4, power_kw: 10.2, cooling_kw: 10.2, weight_kg: 85 }),
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow="AI operations"
        title="Capacity advisor"
        description="Can another 8-GPU chassis land? Checks rack U, power, PDU path, cooling, weight and fabric."
        actions={
          <div className="flex gap-2">
            <input
              className="h-10 w-32 rounded-md border border-line bg-panel px-3 font-mono text-sm outline-none focus:border-coral"
              value={rack}
              onChange={(e) => setRack(e.target.value)}
              aria-label="Rack"
            />
            <button className="h-10 rounded-md bg-coral px-4 text-sm font-medium text-white disabled:opacity-60" disabled={busy} onClick={() => void run()}>
              {busy ? "Evaluating…" : "Evaluate 8-GPU chassis"}
            </button>
          </div>
        }
      />
      {error ? <p className="mb-3 text-sm text-crit">{error}</p> : null}
      {result ? (
        <div className="space-y-4">
          <Panel>
            <div className="flex items-center gap-3 px-4 py-4">
              <StatusChip value={result.verdict} />
              <p className="font-display text-xl font-semibold">
                {result.verdict} · {result.rack}
              </p>
            </div>
          </Panel>
          <Panel title="Checks">
            <ul className="divide-y divide-line">
              {result.checks.map((c) => (
                <li key={c.name} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted">{c.detail}</p>
                  </div>
                  <StatusChip value={c.result} />
                </li>
              ))}
            </ul>
          </Panel>
          {result.alternatives.length > 0 ? (
            <Panel title="Alternatives">
              <ul className="divide-y divide-line">
                {result.alternatives.map((a) => (
                  <li key={a.rack} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="font-mono">{a.rack}</span>
                    <StatusChip value={a.verdict} />
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      ) : (
        <Panel>
          <p className="px-4 py-8 text-center text-sm text-muted">Pick a rack and evaluate placement against live capacity.</p>
        </Panel>
      )}
    </div>
  );
}
