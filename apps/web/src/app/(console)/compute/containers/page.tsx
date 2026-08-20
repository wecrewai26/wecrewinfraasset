"use client";
import { AssetTable } from "@/components/assets/AssetTable";
export default function Page() {
  return (
    <AssetTable
      eyebrow="Compute"
      title="Containers"
      description="Runtime containers linked to hosts in the CMDB."
      assetType="container"
    />
  );
}
