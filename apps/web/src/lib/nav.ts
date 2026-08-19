import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Bell,
  Box,
  Boxes,
  Building2,
  CircuitBoard,
  Cloud,
  Cpu,
  Database,
  Droplets,
  FileSearch,
  Gauge,
  GitBranch,
  Globe,
  HardDrive,
  KeyRound,
  LayoutGrid,
  Leaf,
  Map,
  Network,
  Radar,
  ScrollText,
  Server,
  Settings,
  ShieldAlert,
  Siren,
  Sparkles,
  Thermometer,
  Timer,
  UserRound,
  Warehouse,
  Wrench,
  Zap,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  phase?: number;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

export const NAV: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      { href: "/command", label: "Command Centre", icon: Gauge },
      { href: "/overview/health", label: "Infrastructure Health", icon: Activity },
      { href: "/overview/capacity", label: "Capacity", icon: LayoutGrid },
      { href: "/overview/risk", label: "Risk", icon: ShieldAlert },
      { href: "/overview/cost", label: "Cost", icon: Timer },
      { href: "/overview/sustainability", label: "Sustainability", icon: Leaf },
      { href: "/overview/alerts", label: "Critical Alerts", icon: Bell },
    ],
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    items: [
      { href: "/infrastructure/assets", label: "Assets", icon: Box },
      { href: "/infrastructure/discovery", label: "Discovery", icon: Radar },
      { href: "/infrastructure/cmdb", label: "CMDB", icon: Database },
      { href: "/infrastructure/relationships", label: "Relationships", icon: GitBranch },
      { href: "/infrastructure/topology", label: "Topology", icon: Map },
      { href: "/infrastructure/network", label: "Network", icon: Network },
      { href: "/infrastructure/ipam", label: "IPAM", icon: Globe },
      { href: "/infrastructure/dns", label: "DNS", icon: FileSearch },
      { href: "/infrastructure/vlans", label: "VLANs", icon: CircuitBoard },
    ],
  },
  {
    id: "compute",
    label: "Compute",
    items: [
      { href: "/compute/servers", label: "Physical Servers", icon: Server },
      { href: "/compute/cpu", label: "CPU Infrastructure", icon: Cpu },
      { href: "/compute/gpu", label: "GPU Infrastructure", icon: Sparkles },
      { href: "/compute/vms", label: "Virtual Machines", icon: Boxes },
      { href: "/compute/vmware", label: "VMware", icon: Cloud, phase: 2 },
      { href: "/compute/proxmox", label: "Proxmox", icon: Server, phase: 2 },
      { href: "/compute/kubernetes", label: "Kubernetes", icon: Boxes, phase: 2 },
      { href: "/compute/containers", label: "Containers", icon: Box, phase: 2 },
    ],
  },
  {
    id: "ai",
    label: "AI Infrastructure",
    items: [
      { href: "/ai/fleet", label: "GPU Fleet", icon: Sparkles, phase: 3 },
      { href: "/ai/health", label: "GPU Health", icon: Activity, phase: 3 },
      { href: "/ai/dcgm", label: "NVIDIA DCGM", icon: Gauge, phase: 3 },
      { href: "/ai/fabric", label: "AI Fabric", icon: Network, phase: 3 },
      { href: "/ai/workloads", label: "AI Workloads", icon: Radar, phase: 3 },
      { href: "/ai/capacity", label: "GPU Capacity", icon: LayoutGrid, phase: 3 },
    ],
  },
  {
    id: "dc",
    label: "Data Center",
    items: [
      { href: "/dc/sites", label: "Sites", icon: Building2, phase: 3 },
      { href: "/dc/racks", label: "Racks", icon: Warehouse, phase: 3 },
      { href: "/dc/power", label: "Power", icon: Zap, phase: 3 },
      { href: "/dc/cooling", label: "Cooling", icon: Thermometer, phase: 3 },
      { href: "/dc/liquid", label: "Liquid Cooling", icon: Droplets, phase: 3 },
      { href: "/dc/thermal", label: "Thermal Map", icon: Map, phase: 3 },
    ],
  },
  {
    id: "storage",
    label: "Storage",
    items: [
      { href: "/storage", label: "Storage", icon: HardDrive, phase: 2 },
      { href: "/storage/nvme", label: "NVMe / NVMe-oF", icon: HardDrive, phase: 2 },
    ],
  },
  {
    id: "cloud",
    label: "Cloud & Hybrid",
    items: [
      { href: "/cloud/aws", label: "AWS", icon: Cloud, phase: 4 },
      { href: "/cloud/azure", label: "Azure", icon: Cloud, phase: 4 },
      { href: "/cloud/gcp", label: "GCP", icon: Cloud, phase: 4 },
      { href: "/hybrid", label: "Hybrid Topology", icon: GitBranch, phase: 4 },
    ],
  },
  {
    id: "ops",
    label: "Operations",
    items: [
      { href: "/ops/alerts", label: "Alerts", icon: Bell },
      { href: "/ops/incidents", label: "Incidents", icon: Siren },
      { href: "/ops/changes", label: "Changes", icon: Wrench },
      { href: "/ops/maintenance", label: "Maintenance", icon: Timer },
    ],
  },
  {
    id: "lifecycle",
    label: "Lifecycle",
    items: [
      { href: "/lifecycle/vendors", label: "Vendors", icon: Building2, phase: 2 },
      { href: "/lifecycle/warranty", label: "Warranty", icon: ShieldAlert, phase: 2 },
      { href: "/lifecycle/contracts", label: "Contracts / AMC", icon: ScrollText, phase: 2 },
      { href: "/lifecycle/licenses", label: "Licenses", icon: KeyRound, phase: 2 },
    ],
  },
  {
    id: "aiops",
    label: "AI Operations",
    items: [
      { href: "/aiops/ask", label: "Ask InfraAsset", icon: Sparkles, phase: 6 },
      { href: "/aiops/rca", label: "Root Cause Analysis", icon: FileSearch, phase: 6 },
      { href: "/aiops/advisor", label: "Capacity Advisor", icon: Gauge, phase: 5 },
      { href: "/aiops/twin", label: "Digital Twin", icon: Map, phase: 5 },
      { href: "/aiops/simulate", label: "Failure Simulation", icon: AlertTriangle, phase: 5 },
      { href: "/aiops/predict", label: "Predictive Maintenance", icon: Radar, phase: 6 },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    items: [
      { href: "/admin/users", label: "Users", icon: UserRound },
      { href: "/admin/audit", label: "Audit Logs", icon: ScrollText },
      { href: "/admin/credentials", label: "Credentials", icon: KeyRound },
      { href: "/admin/settings", label: "System Settings", icon: Settings },
    ],
  },
];

export function isNavActive(pathname: string, href: string) {
  if (href === "/" || href === "/command") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
