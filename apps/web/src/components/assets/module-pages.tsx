"use client";

import { AssetTable } from "@/components/assets/AssetTable";
import { JsonTable } from "@/components/assets/JsonTable";

export function ServersPage() {
  return <AssetTable title="Physical servers" assetType="server" />;
}
export function CpuPage() {
  return <AssetTable title="CPU infrastructure" assetType="server" />;
}
export function GpuInfraPage() {
  return <AssetTable title="GPU infrastructure" assetType="gpu" />;
}
export function VmPage() {
  return <AssetTable title="Virtual machines" assetType="vm" />;
}
export function K8sPage() {
  return <AssetTable title="Kubernetes" assetType="kubernetes_cluster" />;
}
export function StoragePage() {
  return <JsonTable title="Storage" path="/api/v1/storage" />;
}
export function CoolingPage() {
  return <JsonTable title="Cooling" path="/api/v1/cooling" description="Air + liquid loop, CDU, pumps, chillers, cold plates." />;
}
export function PowerPage() {
  return <JsonTable title="Power" path="/api/v1/power" description="Utility → UPS → PDU → PSU chain." />;
}
export function AlertsPage() {
  return <JsonTable title="Alerts" path="/api/v1/alerts" />;
}
export function IncidentsPage() {
  return <JsonTable title="Incidents" path="/api/v1/incidents" />;
}
export function ChangesPage() {
  return <JsonTable title="Changes" path="/api/v1/changes" />;
}
export function MaintPage() {
  return <JsonTable title="Maintenance" path="/api/v1/maintenance" />;
}
export function SubnetsPage() {
  return <JsonTable title="IPAM" path="/api/v1/ipam/subnets" />;
}
export function VlansPage() {
  return <JsonTable title="VLANs" path="/api/v1/ipam/vlans" />;
}
export function DnsPage() {
  return <JsonTable title="DNS" path="/api/v1/ipam/dns" />;
}
export function NetworksPage() {
  return <JsonTable title="Network" path="/api/v1/ipam/networks" />;
}
export function RelPage() {
  return <JsonTable title="CMDB relationships" path="/api/v1/cmdb/relationships" />;
}
export function CapacityPage() {
  return <JsonTable title="Capacity" path="/api/v1/capacity" />;
}
export function SitesPage() {
  return <JsonTable title="Sites" path="/api/v1/data-centers" />;
}
export function CloudPage() {
  return <JsonTable title="Cloud accounts" path="/api/v1/cloud/accounts" />;
}
export function UsersPage() {
  return <JsonTable title="Users" path="/api/v1/users" />;
}
export function AuditPage() {
  return <JsonTable title="Audit logs" path="/api/v1/audit" />;
}
export function VendorsPage() {
  return <JsonTable title="Vendors" path="/api/v1/vendors" />;
}
export function WarrantyPage() {
  return <JsonTable title="Warranties" path="/api/v1/warranties" />;
}
export function ContractsPage() {
  return <JsonTable title="Contracts" path="/api/v1/contracts" />;
}
export function LicensesPage() {
  return <JsonTable title="Licenses" path="/api/v1/licenses" />;
}
export function PredictPage() {
  return <JsonTable title="Predictions" path="/api/v1/predictions" description="Evidence-backed forecasts only." />;
}
export function AddressesPage() {
  return <JsonTable title="IP addresses" path="/api/v1/ipam/addresses" />;
}
