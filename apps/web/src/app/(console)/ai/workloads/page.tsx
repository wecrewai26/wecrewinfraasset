"use client";

import { AssetTable } from "@/components/assets/AssetTable";

export default function Page() {
  return (
    <AssetTable
      eyebrow="AI infrastructure"
      title="AI workloads"
      description="Training and inference pods registered in the CMDB."
      assetType="pod"
    />
  );
}
