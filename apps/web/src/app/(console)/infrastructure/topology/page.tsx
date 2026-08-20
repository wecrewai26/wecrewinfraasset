"use client";

import { Background, Controls, MiniMap, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "@/lib/api";
import { EmptyState, KpiGrid, PageHeader, Panel, StatusChip } from "@/components/ui/dashboard";

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

  const allNodes = data?.nodes ?? [];
  const nodes = useMemo(() => {
    const grouped: Record<string, number> = {};
    return allNodes.slice(0, 80).map((n) => {
      grouped[n.type] = (grouped[n.type] || 0) + 1;
      const degraded = n.health === "degraded" || n.health === "unhealthy";
      return {
        id: n.id,
        position: { x: (grouped[n.type] % 8) * 180, y: Object.keys(grouped).indexOf(n.type) * 110 },
        data: { label: `${n.label}\n${n.type}` },
        style: {
          background: degraded ? "#fff1ea" : "#fffcf7",
          color: "#14181f",
          border: degraded ? "1px solid #ff5b2e" : "1px solid #e6e0d4",
          fontSize: 11,
          width: 150,
          borderRadius: 12,
        },
      };
    });
  }, [allNodes]);

  const edges = useMemo(
    () =>
      (data?.edges ?? [])
        .filter((e) => nodes.some((n) => n.id === e.source) && nodes.some((n) => n.id === e.target))
        .map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label, style: { stroke: "#b8b0a4" } })),
    [data, nodes],
  );

  const types = [...new Set(allNodes.map((n) => n.type))];
  const unhealthy = allNodes.filter((n) => n.health !== "healthy").length;

  return (
    <div>
      <PageHeader
        eyebrow="Infrastructure"
        title="Digital twin topology"
        description="Physical, power, cooling, network, Kubernetes and cloud dependencies — capped at 80 nodes for the canvas."
      />
      <KpiGrid
        items={[
          { label: "Nodes", value: allNodes.length, hint: "cmdb" },
          { label: "Edges", value: data?.edges.length ?? 0, hint: "rels" },
          { label: "Classes", value: types.length, hint: "types" },
          { label: "Attention", value: unhealthy, hint: "not healthy", warn: unhealthy > 0 },
        ]}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {types.slice(0, 12).map((t) => (
          <StatusChip key={t} value={t} />
        ))}
      </div>
      <Panel>
        <div className="h-[640px] bg-[#f7f4ee]">
          {nodes.length === 0 ? (
            <EmptyState label="No topology yet. Discover or seed the CMDB first." />
          ) : (
            <ReactFlow nodes={nodes} edges={edges} fitView>
              <MiniMap />
              <Controls />
              <Background color="#ddd6c8" gap={18} />
            </ReactFlow>
          )}
        </div>
      </Panel>
    </div>
  );
}
