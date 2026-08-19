"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { healthTone } from "@/lib/cn";

type Result = {
  verdict: string;
  rack: string;
  checks: { name: string; result: string; detail: string }[];
  alternatives: { rack: string; verdict: string }[];
};

export default function AdvisorPage() {
  const [rack, setRack] = useState("R42");
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    setResult(
      await api<Result>("/api/v1/ai/capacity-advisor", {
        method: "POST",
        body: JSON.stringify({ rack, gpu_count: 8, ru_needed: 4, power_kw: 10.2, cooling_kw: 10.2, weight_kg: 85 }),
      }),
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-semibold">Capacity advisor</h1>
      <p className="text-sm text-muted">Can another GPU server be placed? Checks rack U, power, PDU/UPS path, cooling, weight and fabric.</p>
      <div className="flex gap-2">
        <input className="bg-panel border border-line rounded px-3 py-2 w-32" value={rack} onChange={(e) => setRack(e.target.value)} />
        <button className="bg-coral text-white px-4 rounded" onClick={run}>
          Evaluate 8-GPU chassis
        </button>
      </div>
      {result && (
        <div>
          <div className={`text-xl font-semibold ${healthTone(result.verdict)}`}>{result.verdict} · {result.rack}</div>
          <table className="w-full text-sm border border-line mt-3">
            <tbody>
              {result.checks.map((c) => (
                <tr key={c.name} className="border-t border-line">
                  <td className="px-3 py-2">{c.name}</td>
                  <td className={`px-3 py-2 ${healthTone(c.result)}`}>{c.result}</td>
                  <td className="px-3 py-2 text-muted">{c.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.alternatives.length > 0 && (
            <p className="text-sm mt-3">Alternatives: {result.alternatives.map((a) => a.rack).join(", ")}</p>
          )}
        </div>
      )}
    </div>
  );
}
