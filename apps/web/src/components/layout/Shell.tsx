"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Command, Cpu, LogOut, Search } from "lucide-react";
import { isNavActive, NAV } from "@/lib/nav";
import { clearSession, getSession, type Session } from "@/lib/api";
import { cn } from "@/lib/cn";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSessionState] = useState<Session | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [site, setSite] = useState("CHN-DC1");
  const [env, setEnv] = useState("production");
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const current = getSession();
    if (!current) {
      router.replace("/login");
      return;
    }
    setSessionState(current);
  }, [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "[") {
        e.preventDefault();
        setExpanded((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const matches = useMemo(() => {
    const q = query.toLowerCase();
    return NAV.flatMap((g) => g.items)
      .filter((i) => i.label.toLowerCase().includes(q) || i.href.includes(q))
      .slice(0, 12);
  }, [query]);

  return (
    <div className="flex min-h-screen w-full">
      <aside
        className={cn(
          "sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r border-rail-line bg-rail text-rail-fg transition-[width] duration-200 ease-out",
          expanded ? "w-60" : "w-[3.75rem]",
        )}
      >
        <div
          className={cn(
            "flex items-center border-b border-rail-line",
            expanded ? "gap-2.5 px-3 py-3.5" : "flex-col gap-2 px-2 py-3",
          )}
        >
          <Link
            href="/command"
            className="silicon-die-glow flex size-8 shrink-0 items-center justify-center rounded-md bg-coral text-white"
            aria-label="InfraAsset Command Centre"
          >
            <Cpu size={16} />
          </Link>
          {expanded && (
            <div className="min-w-0">
              <div className="font-display text-sm font-semibold tracking-tight text-ink leading-tight">
                Infra<span className="text-coral">Asset</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-rail-fg/55">wecrew.infra</div>
            </div>
          )}
        </div>
        <nav className={cn("flex-1 overflow-y-auto py-3", expanded ? "px-2" : "px-1.5")}>
          {NAV.map((group) => (
            <div key={group.id} className="mb-4 last:mb-0">
              {expanded ? (
                <div className="px-2 pb-1.5 text-[10px] uppercase tracking-[0.16em] text-rail-fg/45">
                  {group.label}
                </div>
              ) : (
                <div className="mx-auto mb-1.5 h-px w-6 bg-rail-line" />
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isNavActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={item.label}
                        className={cn(
                          "flex items-center rounded-md text-[13px] transition-colors",
                          expanded ? "gap-2.5 px-2 py-1.5" : "justify-center px-0 py-2",
                          active
                            ? "bg-rail-accent font-medium text-ink"
                            : "text-rail-fg/85 hover:bg-rail-accent/50 hover:text-ink",
                        )}
                      >
                        <Icon size={16} className={cn("shrink-0", active ? "text-coral" : "opacity-80")} />
                        {expanded && <span className="truncate">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        {expanded && (
          <div className="mt-auto px-4 py-3 text-[11px] leading-relaxed text-rail-fg/45 border-t border-rail-line">
            Read-only inventory · vault refs only · multi-site
          </div>
        )}
        <button
          type="button"
          className="absolute top-3.5 -right-3 z-40 inline-flex size-6 items-center justify-center rounded-full border border-line bg-panel text-paper shadow-sm hover:bg-ink"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
        >
          {expanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col bg-ink">
        <header className="h-14 border-b border-line flex items-center gap-3 px-5 sticky top-0 bg-ink/95 backdrop-blur z-20">
          <select
            value={site}
            onChange={(e) => setSite(e.target.value)}
            className="h-9 rounded-md border border-line bg-panel px-2 text-sm"
          >
            <option>CHN-DC1</option>
            <option>BOM-EDGE1</option>
          </select>
          <select
            value={env}
            onChange={(e) => setEnv(e.target.value)}
            className="h-9 rounded-md border border-line bg-panel px-2 text-sm"
          >
            <option>production</option>
            <option>uat</option>
            <option>lab</option>
          </select>
          <button
            className="flex items-center gap-2 text-sm text-muted border border-line rounded-md px-3 py-1.5 flex-1 max-w-[420px] bg-panel"
            onClick={() => setOpen(true)}
          >
            <Search size={14} />
            Search assets, racks, incidents
            <span className="ml-auto flex items-center gap-1 text-[11px]">
              <Command size={11} />K
            </span>
          </button>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <div className="text-muted">
              {session?.full_name} · <span className="text-paper">{session?.role}</span>
            </div>
            <button
              className="text-muted hover:text-coral"
              onClick={() => {
                clearSession();
                router.push("/");
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <main className="w-full flex-1 space-y-6 px-3 py-5 md:px-6 animate-rise-in mx-auto max-w-[1600px]">
          {children}
        </main>
      </div>
      {open && (
        <div className="fixed inset-0 bg-paper/40 z-50" onClick={() => setOpen(false)}>
          <div
            className="mx-auto mt-24 w-[560px] bg-panel border border-line rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Go to…"
              className="w-full bg-transparent px-4 py-3 outline-none border-b border-line"
            />
            <ul className="max-h-80 overflow-auto">
              {matches.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block px-4 py-2 text-sm hover:bg-black/[0.04]"
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                    <span className="text-muted ml-2">{item.href}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
