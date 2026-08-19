"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function JsonTable({
  title,
  path,
  description,
}: {
  title: string;
  path: string;
  description?: string;
}) {
  const { data, error } = useQuery({
    queryKey: [path],
    queryFn: () => api<Record<string, unknown>>(path),
  });
  const rows = extractRows(data);
  const cols = rows[0] ? Object.keys(rows[0]).filter((k) => !["secret_ciphertext", "hashed_password"].includes(k)).slice(0, 8) : [];
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {description && <p className="text-sm text-muted mb-3">{description}</p>}
      {error && <p className="text-crit text-sm">{String(error)}</p>}
      <div className="overflow-auto border border-line rounded mt-3">
        <table className="w-full text-sm">
          <thead className="bg-panel text-muted">
            <tr>
              {cols.map((c) => (
                <th key={c} className="text-left px-3 py-2">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={String(row.id ?? i)} className="border-t border-line">
                {cols.map((c) => (
                  <td key={c} className="px-3 py-2 max-w-[240px] truncate">
                    {format(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function extractRows(data: Record<string, unknown> | undefined): Record<string, unknown>[] {
  if (!data) return [];
  for (const key of ["items", "accounts", "resources"]) {
    const v = data[key];
    if (Array.isArray(v)) return v as Record<string, unknown>[];
  }
  if (Array.isArray(data)) return data as unknown as Record<string, unknown>[];
  return [data];
}

function format(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
