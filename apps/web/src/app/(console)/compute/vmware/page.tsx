"use client";
import { AssetTable } from "@/components/assets/AssetTable";
export default function Page() {
  return (
    <AssetTable
      eyebrow="Compute"
      title="VMware"
      description="vSphere guests and hypervisors registered in the CMDB."
      assetType="vm"
    />
  );
}
