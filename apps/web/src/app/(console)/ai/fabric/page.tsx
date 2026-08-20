"use client";

import { AssetTable } from "@/components/assets/AssetTable";

export default function Page() {
  return (
    <AssetTable
      eyebrow="AI infrastructure"
      title="AI fabric"
      description="ToR, spine and InfiniBand / Ethernet switches serving the GPU hall."
      assetType="switch"
    />
  );
}
