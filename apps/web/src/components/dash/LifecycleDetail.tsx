"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { DataTable, EmptyState, KpiGrid, Meter, PageHeader, Panel, StatusChip } from "@/components/ui/dashboard";

type Ref = { id: string; name: string; asset_type?: string; health?: string; category?: string; hostname?: string; serial_number?: string; model?: string; manufacturer?: string };

function dash(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function AssetLink({ asset }: { asset?: Ref | null }) {
  if (!asset) return <span>—</span>;
  return (
    <Link className="text-coral hover:underline" href={`/infrastructure/assets/${asset.id}`}>
      {asset.name}
    </Link>
  );
}

export function WarrantyDetail() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["warranty", params.id],
    queryFn: () =>
      api<{
        id: string;
        coverage: string;
        start_date?: string;
        end_date?: string;
        asset?: Ref | null;
        vendor?: Ref | null;
      }>(`/api/v1/warranties/${params.id}`),
  });
  if (isLoading) return <p className="text-sm text-muted">Loading warranty…</p>;
  if (error) return <p className="text-sm text-crit">{String(error)}</p>;
  if (!data) return <EmptyState label="Warranty not found." />;
  return (
    <div>
      <PageHeader
        eyebrow="Lifecycle"
        title={data.asset?.name || "Warranty"}
        description={`${data.coverage} cover${data.vendor ? ` · ${data.vendor.name}` : ""}`}
        actions={<StatusChip value={data.coverage} />}
      />
      <KpiGrid
        items={[
          { label: "Asset", value: data.asset?.name || "—", hint: data.asset?.asset_type },
          { label: "Vendor", value: data.vendor?.name || "—", hint: data.vendor?.category },
          { label: "Starts", value: dash(data.start_date), hint: "window" },
          { label: "Ends", value: dash(data.end_date), hint: "expiry" },
        ]}
      />
      <Panel title="Covered configuration item">
        <dl className="divide-y divide-line text-sm">
          <div className="flex justify-between px-4 py-2.5">
            <dt className="text-muted">Asset</dt>
            <dd>
              <AssetLink asset={data.asset} />
            </dd>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <dt className="text-muted">Manufacturer / model</dt>
            <dd>{[data.asset?.manufacturer, data.asset?.model].filter(Boolean).join(" ") || "—"}</dd>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <dt className="text-muted">Serial</dt>
            <dd className="font-mono text-xs">{data.asset?.serial_number || "—"}</dd>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <dt className="text-muted">Health</dt>
            <dd>
              <StatusChip value={data.asset?.health} />
            </dd>
          </div>
        </dl>
      </Panel>
    </div>
  );
}

export function ContractDetail() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["contract", params.id],
    queryFn: () =>
      api<{
        id: string;
        name: string;
        contract_type: string;
        value?: number;
        currency?: string;
        start_date?: string;
        end_date?: string;
        notes?: string;
        vendor?: Ref | null;
      }>(`/api/v1/contracts/${params.id}`),
  });
  if (isLoading) return <p className="text-sm text-muted">Loading contract…</p>;
  if (error) return <p className="text-sm text-crit">{String(error)}</p>;
  if (!data) return <EmptyState label="Contract not found." />;
  return (
    <div>
      <PageHeader eyebrow="Lifecycle" title={data.name} description={data.notes || `${data.contract_type} commercial cover`} />
      <KpiGrid
        items={[
          { label: "Type", value: data.contract_type, hint: "class" },
          { label: "Vendor", value: data.vendor?.name || "—", hint: data.vendor?.category },
          { label: "Value", value: data.value != null ? `${data.currency || "USD"} ${data.value.toLocaleString()}` : "—", hint: "contract" },
          { label: "Ends", value: dash(data.end_date), hint: "window" },
        ]}
      />
      <Panel title="Vendor">
        <p className="px-4 py-3 text-sm">
          {data.vendor ? (
            <Link className="text-coral hover:underline" href={`/lifecycle/vendors/${data.vendor.id}`}>
              {data.vendor.name}
            </Link>
          ) : (
            "Unassigned"
          )}
        </p>
      </Panel>
    </div>
  );
}

export function LicenseDetail() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["license", params.id],
    queryFn: () =>
      api<{
        id: string;
        name: string;
        seats?: number;
        used?: number;
        expiry?: string;
        vendor?: Ref | null;
        asset?: Ref | null;
      }>(`/api/v1/licenses/${params.id}`),
  });
  if (isLoading) return <p className="text-sm text-muted">Loading license…</p>;
  if (error) return <p className="text-sm text-crit">{String(error)}</p>;
  if (!data) return <EmptyState label="License not found." />;
  return (
    <div>
      <PageHeader eyebrow="Lifecycle" title={data.name} description={data.vendor ? `Entitlement from ${data.vendor.name}` : "Software entitlement"} />
      <KpiGrid
        items={[
          { label: "Vendor", value: data.vendor?.name || "—", hint: "publisher" },
          { label: "Seats", value: data.seats ?? "—", hint: "cap" },
          { label: "Used", value: data.used ?? "—", hint: "consumed" },
          { label: "Expires", value: dash(data.expiry), hint: "window" },
        ]}
      />
      {data.seats != null ? (
        <div className="ops-panel mb-4 rounded-2xl p-4">
          <Meter label="Seats" used={data.used ?? 0} max={data.seats} unit="" />
        </div>
      ) : null}
      <Panel title="Bound asset">
        <p className="px-4 py-3 text-sm">
          <AssetLink asset={data.asset} />
        </p>
      </Panel>
    </div>
  );
}

export function VendorDetail() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["vendor", params.id],
    queryFn: () =>
      api<{
        id: string;
        name: string;
        category: string;
        support_email?: string;
        support_phone?: string;
        assets: Ref[];
        warranties: { id: string; coverage: string; end_date?: string; asset?: Ref | null }[];
        contracts: { id: string; name: string; contract_type: string; end_date?: string }[];
        licenses: { id: string; name: string; expiry?: string }[];
      }>(`/api/v1/vendors/${params.id}`),
  });
  if (isLoading) return <p className="text-sm text-muted">Loading vendor…</p>;
  if (error) return <p className="text-sm text-crit">{String(error)}</p>;
  if (!data) return <EmptyState label="Vendor not found." />;
  return (
    <div>
      <PageHeader
        eyebrow={data.category}
        title={data.name}
        description={[data.support_email, data.support_phone].filter(Boolean).join(" · ") || "No support contact on file"}
      />
      <KpiGrid
        items={[
          { label: "Assets", value: data.assets.length, hint: "catalogued" },
          { label: "Warranties", value: data.warranties.length, hint: "cover" },
          { label: "Contracts", value: data.contracts.length, hint: "amc" },
          { label: "Licenses", value: data.licenses.length, hint: "seats" },
        ]}
      />
      <div className="mb-4">
        <Panel title="Assets from this vendor" subtitle="Named CIs, not vendor IDs">
          <DataTable
            rows={data.assets}
            empty="No assets tagged to this vendor."
            columns={[
              {
                key: "name",
                label: "Asset",
                render: (a) => (
                  <Link className="text-coral hover:underline" href={`/infrastructure/assets/${a.id}`}>
                    {a.name}
                  </Link>
                ),
              },
              { key: "asset_type", label: "Type", render: (a) => a.asset_type || "—" },
              { key: "model", label: "Model", render: (a) => a.model || "—" },
              { key: "health", label: "Health", render: (a) => <StatusChip value={a.health} /> },
            ]}
          />
        </Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Warranties">
          <DataTable
            rows={data.warranties}
            empty="No warranties."
            columns={[
              {
                key: "asset",
                label: "Asset",
                render: (w) =>
                  w.asset ? (
                    <Link className="text-coral hover:underline" href={`/lifecycle/warranty/${w.id}`}>
                      {w.asset.name}
                    </Link>
                  ) : (
                    "—"
                  ),
              },
              { key: "coverage", label: "Cover", render: (w) => w.coverage },
              { key: "end_date", label: "Ends", render: (w) => dash(w.end_date) },
            ]}
          />
        </Panel>
        <Panel title="Contracts">
          <DataTable
            rows={data.contracts}
            empty="No contracts."
            columns={[
              {
                key: "name",
                label: "Contract",
                render: (c) => (
                  <Link className="text-coral hover:underline" href={`/lifecycle/contracts/${c.id}`}>
                    {c.name}
                  </Link>
                ),
              },
              { key: "type", label: "Type", render: (c) => c.contract_type },
              { key: "end_date", label: "Ends", render: (c) => dash(c.end_date) },
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}
