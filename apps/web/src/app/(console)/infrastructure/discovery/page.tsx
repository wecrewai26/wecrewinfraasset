"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";

type Job = {
  id: string;
  name: string;
  ip_range: string;
  protocols: string;
  status: string;
  assets_found: number;
  log?: string;
};

export default function DiscoveryPage() {
  const qc = useQueryClient();
  const [ip, setIp] = useState("10.88.0.0/24");
  const { data } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => api<{ items: Job[] }>("/api/v1/discovery/jobs"),
  });
  const mutate = useMutation({
    mutationFn: () =>
      api<Job>("/api/v1/discovery/jobs", {
        method: "POST",
        body: JSON.stringify({ name: `scan-${Date.now()}`, ip_range: ip, protocols: "synthetic" }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Discovery</h1>
      <p className="text-sm text-muted">
        Agentless workflow: IP range → ping sweep → port detection → identity → credentials → deep discovery →
        CMDB + topology. Lab jobs use the synthetic plugin; collector-workers execute ICMP/SNMP/Redfish against live ranges.
      </p>
      <div className="flex gap-2">
        <input className="bg-panel border border-line rounded px-3 py-2" value={ip} onChange={(e) => setIp(e.target.value)} />
        <button className="bg-coral text-white px-4 rounded" onClick={() => mutate.mutate()}>
          Run discovery
        </button>
      </div>
      <table className="w-full text-sm border border-line">
        <thead className="bg-panel text-muted">
          <tr>
            <th className="text-left px-3 py-2">Job</th>
            <th className="text-left px-3 py-2">Range</th>
            <th className="text-left px-3 py-2">Status</th>
            <th className="text-left px-3 py-2">Found</th>
          </tr>
        </thead>
        <tbody>
          {(data?.items ?? []).map((j) => (
            <tr key={j.id} className="border-t border-line">
              <td className="px-3 py-2">{j.name}</td>
              <td className="px-3 py-2 font-mono text-xs">{j.ip_range}</td>
              <td className="px-3 py-2">{j.status}</td>
              <td className="px-3 py-2">{j.assets_found}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
