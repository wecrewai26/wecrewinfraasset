"use client";

import { GpuFleet } from "@/components/dash/GpuFleet";

export default function DcgmPage() {
  return (
    <GpuFleet
      title="NVIDIA DCGM"
      description="Temperature, utilisation, power and throttle flags from the collector, mapped onto CMDB GPUs."
    />
  );
}
