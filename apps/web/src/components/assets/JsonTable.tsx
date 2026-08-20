"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { EmptyState, PageHeader, Panel, StatusChip } from "@/components/ui/dashboard";

const HIDDEN = new Set([
  "id",
  "tenant_id",
  "secret_ciphertext",
  "hashed_password",
  "created_at",
  "updated_at",
  "actor_id",
  "resource_id",
]);

const CHIP_KEYS = new Set(["health", "status", "severity", "risk", "verdict"]);

export function JsonTable({
  title,
  path,
  description,
  eyebrow = "Operations",
}: {
  title: string;
  path: string;
  description?: string;
  eyebrow?: string;
}) {
  const { data, error, isLoading } = useQuery({
    queryKey: [path],
    queryFn: () => api<Record<string, unknown> | unknown[]>(path),
  });
  const rows = extractRows(data).map(flattenRow);
  const cols = pickColumns(rows);

  return (
    <div>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        meta={`${rows.length} records`}
      />
      {error ? <p className="mb-3 text-sm text-crit">{String(error)}</p> : null}
      <Panel>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-panel/80 text-left text-[11px] uppercase tracking-[0.08em] text-muted">
              <tr>
                {cols.map((c) => (
                  <th key={c} className="px-4 py-2.5 font-medium">
                    {labelize(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={String(row.id ?? i)} className="border-t border-line hover:bg-black/[0.03]">
                  {cols.map((c) => (
                    <td key={c} className="max-w-[260px] truncate px-4 py-2.5">
                      {renderCell(c, row[c], row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {isLoading ? <EmptyState label="Loading…" /> : null}
          {!isLoading && rows.length === 0 ? <EmptyState label="Nothing in this scope yet." /> : null}
        </div>
      </Panel>
    </div>
  );
}

function extractRows(data: Record<string, unknown> | unknown[] | undefined): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  for (const key of ["items", "accounts", "resources"]) {
    const v = data[key];
    if (Array.isArray(v)) return v as Record<string, unknown>[];
  }
  return [data];
}

function flattenRow(row: Record<string, unknown>): Record<string, unknown> {
  const attrs = row.attributes;
  if (attrs && typeof attrs === "object" && !Array.isArray(attrs)) {
    const { attributes, ...rest } = row;
    return { ...rest, ...(attributes as Record<string, unknown>) };
  }
  return row;
}

function pickColumns(rows: Record<string, unknown>[]): string[] {
  if (!rows[0]) return [];
  const preferred = [
    "name",
    "title",
    "email",
    "full_name",
    "asset_type",
    "type",
    "rel_type",
    "severity",
    "health",
    "status",
    "risk",
    "cidr",
    "vlan_id",
    "record_type",
    "provider",
    "role",
    "business_service",
    "summary",
  ];
  const keys = Object.keys(rows[0]).filter((k) => !HIDDEN.has(k));
  const ordered = [...preferred.filter((k) => keys.includes(k)), ...keys.filter((k) => !preferred.includes(k))];
  return ordered.slice(0, 7);
}

function labelize(key: string) {
  return key.replaceAll("_", " ");
}

function renderCell(key: string, value: unknown, row: Record<string, unknown>) {
  if (CHIP_KEYS.has(key) && typeof value === "string") return <StatusChip value={value} />;
  if (key === "name" && typeof value === "string" && typeof row.id === "string" && typeof row.asset_type === "string") {
    return (
      <Link className="font-medium text-coral hover:underline" href={`/infrastructure/assets/${row.id}`}>
        {value}
      </Link>
    );
  }
  return format(value);
}

function format(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "number") return String(v);
  if (typeof v === "object") {
    if (Array.isArray(v)) return `${v.length}`;
    const rec = v as Record<string, unknown>;
    if (typeof rec.used === "number" && typeof rec.maximum === "number") {
      return `${rec.used}/${rec.maximum}`;
    }
    if (typeof rec.name === "string") return rec.name;
    return "—";
  }
  return String(v);
}
