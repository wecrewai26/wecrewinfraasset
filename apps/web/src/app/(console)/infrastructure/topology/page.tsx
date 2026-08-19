"use client";

import { Background, Controls, MiniMap, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMemo } from "react";

type Graph = {
  nodes: { id: string; label: string; type: string; health: string }[];
  edges: { id: string; source: string; target: string; label: string }[];
};

export default function TopologyPage() {
  const { data } = useQuery({
    queryKey: ["topology"],
    queryFn: () =>
      api<Graph>(
        "/api/v1/topology?types=rack,server,gpu,cdu,switch,firewall,kubernetes_cluster,application,cloud_resource,ups,pdu",
      ),
  });

  const nodes = useMemo(() => {
    const grouped: Record<string, number> = {};
    return (data?.nodes ?? []).slice(0, 80).map((n) => {
      grouped[n.type] = (grouped[n.type] || 0) + 1;
      return {
        id: n.id,
        position: { x: (grouped[n.type] % 8) * 180, y: Object.keys(grouped).indexOf(n.type) * 110 },
        data: { label: `${n.label}\n${n.type}` },
        style: {
          background: n.health === "degraded" ? "#fff1ea" : "#fffcf7",
          color: "#14181f",
          border: n.health === "degraded" ? "1px solid #ff5b2e" : "1px solid #e6e0d4",
          fontSize: 11,
          width: 150,
        },
      };
    });
  }, [data]);

  const edges = useMemo(
    () =>
      (data?.edges ?? [])
        .filter((e) => nodes.some((n) => n.id === e.source) && nodes.some((n) => n.id === e.target))
        .map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label, style: { stroke: "#b8b0a4" } })),
    [data, nodes],
  );

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Digital twin topology</h1>
      <p className="text-sm text-muted">Physical, power, cooling, network, Kubernetes and cloud dependencies.</p>
      <div className="h-[640px] border border-line rounded overflow-hidden bg-ink">
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}
