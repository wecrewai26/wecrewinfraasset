"use client";

import { GpuFleet } from "@/components/dash/GpuFleet";

export default function GpuHealthPage() {
  return (
    <GpuFleet
      title="GPU health"
      description="Degraded and unhealthy accelerators first — DCGM samples live on each GPU asset."
      attentionOnly
    />
  );
}
