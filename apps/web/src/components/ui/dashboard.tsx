import type { ReactNode } from "react";
import { cn, healthTone } from "@/lib/cn";

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-coral">{eyebrow}</p>
        ) : null}
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
        {meta ? <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-muted">{meta}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function StatusChip({ value }: { value?: string | null }) {
  const v = value || "unknown";
  const tone = healthTone(v);
  const surface =
    tone === "text-signal"
      ? "bg-signal/10"
      : tone === "text-warn"
        ? "bg-warn/15"
        : tone === "text-crit"
          ? "bg-crit/10"
          : "bg-black/[0.04]";
  return (
    <span className={cn("inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium capitalize", surface, tone)}>
      {v.replaceAll("_", " ")}
    </span>
  );
}

export function KpiGrid({
  items,
}: {
  items: { label: string; value: string | number; hint?: string; warn?: boolean }[];
}) {
  return (
    <ul className="ops-panel mb-5 grid divide-y divide-line overflow-hidden rounded-2xl sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
      {items.map((item) => (
        <li key={item.label} className="px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">{item.label}</p>
          <p className={cn("font-display mt-1 text-2xl font-semibold tabular-nums", item.warn && "text-crit")}>
            {item.value}
          </p>
          {item.hint ? <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">{item.hint}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export function Panel({
  title,
  subtitle,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("ops-panel overflow-hidden rounded-2xl", className)}>
      {(title || subtitle) && (
        <div className="border-b border-line px-4 py-3">
          {title ? <h2 className="font-display text-sm font-semibold">{title}</h2> : null}
          {subtitle ? <p className="text-xs text-muted">{subtitle}</p> : null}
        </div>
      )}
      {children}
    </section>
  );
}

export function Meter({
  label,
  used,
  max,
  unit,
}: {
  label: string;
  used: number;
  max: number;
  unit: string;
}) {
  const pct = max ? Math.min(100, (used / max) * 100) : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[11px] text-muted">
        <span>{label}</span>
        <span className="tabular-nums">
          {used}/{max} {unit}
        </span>
      </div>
      <div className="mt-1 h-1.5 rounded bg-line">
        <div
          className={cn("h-1.5 rounded", pct > 85 ? "bg-crit" : pct > 70 ? "bg-warn" : "bg-signal")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return <p className="px-4 py-8 text-center text-sm text-muted">{label}</p>;
}

export type Column<T> = {
  key: string;
  label: string;
  className?: string;
  render?: (row: T) => ReactNode;
};

export function DataTable<T extends { id?: string }>({
  columns,
  rows,
  empty = "Nothing in this scope yet.",
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: string;
}) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-panel/80 text-left text-[11px] uppercase tracking-[0.08em] text-muted">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-2.5 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={String(row.id ?? i)} className="border-t border-line hover:bg-black/[0.03]">
              {columns.map((c) => (
                <td key={c.key} className={c.className ?? "max-w-[280px] truncate px-4 py-2.5"}>
                  {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? <EmptyState label={empty} /> : null}
    </div>
  );
}
