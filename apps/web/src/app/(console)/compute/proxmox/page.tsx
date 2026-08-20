"use client";
import { AssetTable } from "@/components/assets/AssetTable";
export default function Page() {
  return (
    <AssetTable
      eyebrow="Compute"
      title="Proxmox"
      description="Proxmox nodes and guests as configuration items."
      assetType="hypervisor"
    />
  );
}
