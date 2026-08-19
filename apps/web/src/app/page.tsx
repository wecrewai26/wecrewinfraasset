"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CircuitBoard,
  Cpu,
  Droplets,
  Gauge,
  Network,
  ShieldCheck,
  Sparkles,
  Warehouse,
} from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { getSession } from "@/lib/api";

const features = [
  {
    icon: Warehouse,
    title: "CMDB + DCIM",
    body: "Racks, rooms, power, and liquid cooling sit next to serials, warranties, and relationships.",
  },
  {
    icon: Sparkles,
    title: "GPU / AI halls",
    body: "Fleet health, DCGM-ready telemetry, InfiniBand fabric, and capacity before you drop another node.",
  },
  {
    icon: Network,
    title: "IPAM + topology",
    body: "Subnets, VLANs, DNS, and blast-radius paths instead of a spreadsheet and a drawing.",
  },
  {
    icon: Gauge,
    title: "Command Centre",
    body: "Live hall signals, incidents, and copilot on the same cream canvas as Sovereign Command.",
  },
];

const signals = [
  { label: "Demo estate", value: "85 assets" },
  { label: "GPU inventory", value: "32 H100s" },
  { label: "Hall", value: "CHN-DC1 · R42" },
];

export default function LandingPage() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(getSession()));
  }, []);

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-ink/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <BrandMark />
          <nav className="flex items-center gap-2 text-sm">
            {signedIn ? (
              <Link
                href="/command"
                className="rounded-md bg-coral px-3.5 py-2 font-medium text-white"
              >
                Open Command Centre
              </Link>
            ) : (
              <>
                <Link href="/login" className="rounded-md px-3 py-2 text-paper hover:text-coral">
                  Sign in
                </Link>
                <Link href="/signup" className="rounded-md bg-coral px-3.5 py-2 font-medium text-white">
                  Create organisation
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="silicon-circuit text-ink">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-[1.15fr_0.85fr] md:py-24">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-coral">
              WeCrew InfraAsset
            </p>
            <h1 className="font-display mt-4 max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight md:text-5xl">
              See the hall before you change the hall.
            </h1>
            <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-ink/70">
              On-prem and hybrid infrastructure intelligence — CMDB, DCIM, IPAM, GPU fleet, digital twin,
              and copilot — without shipping your estate to someone else’s cloud.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={signedIn ? "/command" : "/signup"}
                className="inline-flex items-center rounded-md bg-coral px-4 py-2.5 text-sm font-medium text-white"
              >
                {signedIn ? "Open Command Centre" : "Start a workspace"}
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-md border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-ink hover:bg-white/10"
              >
                Sign in
              </Link>
            </div>
            <ul className="mt-10 flex flex-wrap gap-6 text-[12px] uppercase tracking-[0.12em] text-ink/55">
              <li>Read-only by default</li>
              <li>Vault refs only</li>
              <li>Multi-site ready</li>
            </ul>
          </div>
          <aside className="ops-panel rounded-2xl p-6 text-paper">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted">
              <Cpu size={14} className="text-coral" />
              Chennai DC1 · liquid GPU hall
            </div>
            <p className="font-display mt-3 text-2xl font-semibold">Live demo estate</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Seeded hall with CDU-03 degraded, rack R42 near capacity, and 32 GPUs — the same surface
              operators use after sign-in.
            </p>
            <dl className="mt-6 grid grid-cols-1 gap-3">
              {signals.map((item) => (
                <div key={item.label} className="flex items-baseline justify-between border-b border-line pb-2">
                  <dt className="text-[11px] uppercase tracking-[0.12em] text-muted">{item.label}</dt>
                  <dd className="font-mono text-sm">{item.value}</dd>
                </div>
              ))}
            </dl>
            <Link href="/login" className="mt-6 inline-flex text-sm font-medium text-coral hover:underline">
              Open the demo as admin →
            </Link>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-coral">Platform</p>
        <h2 className="font-display mt-2 text-3xl font-semibold">One model from silicon to site.</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {features.map((item) => (
            <article key={item.title} className="ops-panel rounded-2xl p-5">
              <item.icon size={18} className="text-coral" />
              <h3 className="mt-3 font-display text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-panel">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-3">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 shrink-0 text-coral" size={18} />
            <div>
              <h3 className="font-medium">Guarded operations</h3>
              <p className="mt-1 text-sm text-muted">Audit on every action. Secrets never rendered. Roles from viewer to platform admin.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Droplets className="mt-0.5 shrink-0 text-coral" size={18} />
            <div>
              <h3 className="font-medium">Facilities in the same graph</h3>
              <p className="mt-1 text-sm text-muted">CDU, PDU, and thermal context sit next to the GPU nodes they keep alive.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <CircuitBoard className="mt-0.5 shrink-0 text-coral" size={18} />
            <div>
              <h3 className="font-medium">On-prem first</h3>
              <p className="mt-1 text-sm text-muted">Kind, Helm, and Traefik on your metal — hybrid cloud as an attachment, not the core.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-[12px] text-muted">
        <span>WeCrew · InfraAsset</span>
        <span>On-prem + hybrid infrastructure intelligence</span>
      </footer>
    </div>
  );
}
