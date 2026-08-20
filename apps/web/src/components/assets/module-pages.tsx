"use client";

import { AssetTable } from "@/components/assets/AssetTable";
import {
  AddressesBoard,
  AlertsBoard,
  AuditBoard,
  ChangesBoard,
  CloudBoard,
  CoolingBoard,
  ContractsBoard,
  DnsBoard,
  GpuCapacityBoard,
  IncidentsBoard,
  IpamBoard,
  LicensesBoard,
  MaintenanceBoard,
  NetworksBoard,
  PowerBoard,
  PredictionsBoard,
  RelationshipsBoard,
  StorageBoard,
  UsersBoard,
  VendorsBoard,
  VlansBoard,
  WarrantyBoard,
} from "@/components/dash/DomainBoards";

export function ServersPage() {
  return (
    <AssetTable
      eyebrow="Compute"
      title="Physical servers"
      description="Bare-metal nodes in the CMDB — GPU and CPU halls."
      assetType="server"
    />
  );
}
export function CpuPage() {
  return (
    <AssetTable
      eyebrow="Compute"
      title="CPU infrastructure"
      description="General compute servers, not the H100 tray."
      assetType="server"
    />
  );
}
export function GpuInfraPage() {
  return (
    <AssetTable
      eyebrow="Compute"
      title="GPU infrastructure"
      description="Accelerators as first-class assets."
      assetType="gpu"
    />
  );
}
export function VmPage() {
  return (
    <AssetTable eyebrow="Compute" title="Virtual machines" description="Hypervisor guests in the CMDB." assetType="vm" />
  );
}
export function K8sPage() {
  return (
    <AssetTable
      eyebrow="Compute"
      title="Kubernetes"
      description="Clusters and control planes as configuration items."
      assetType="kubernetes_cluster"
    />
  );
}
export function StoragePage() {
  return <StorageBoard />;
}
export function CoolingPage() {
  return <CoolingBoard />;
}
export function PowerPage() {
  return <PowerBoard />;
}
export function AlertsPage() {
  return <AlertsBoard />;
}
export function IncidentsPage() {
  return <IncidentsBoard />;
}
export function ChangesPage() {
  return <ChangesBoard />;
}
export function MaintPage() {
  return <MaintenanceBoard />;
}
export function SubnetsPage() {
  return <IpamBoard />;
}
export function VlansPage() {
  return <VlansBoard />;
}
export function DnsPage() {
  return <DnsBoard />;
}
export function NetworksPage() {
  return <NetworksBoard />;
}
export function RelPage() {
  return <RelationshipsBoard />;
}
export function CapacityPage() {
  return <GpuCapacityBoard />;
}
export function CloudPage() {
  return <CloudBoard />;
}
export function UsersPage() {
  return <UsersBoard />;
}
export function AuditPage() {
  return <AuditBoard />;
}
export function VendorsPage() {
  return <VendorsBoard />;
}
export function WarrantyPage() {
  return <WarrantyBoard />;
}
export function ContractsPage() {
  return <ContractsBoard />;
}
export function LicensesPage() {
  return <LicensesBoard />;
}
export function PredictPage() {
  return <PredictionsBoard />;
}
export function AddressesPage() {
  return <AddressesBoard />;
}
