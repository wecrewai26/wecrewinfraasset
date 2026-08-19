"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Gauge, Lock, ShieldCheck } from "lucide-react";
import { AuthField, AuthSplit, authInputClass } from "@/components/auth/AuthSplit";
import { BrandMark } from "@/components/brand/BrandMark";
import { api, setSession, type Session } from "@/lib/api";

const highlights = [
  { icon: Gauge, title: "Live estate posture", body: "Racks, GPUs, power, and cooling on one operator surface." },
  { icon: ShieldCheck, title: "Tenant isolation", body: "Each organisation gets its own inventory, roles, and audit trail." },
  { icon: Lock, title: "Vault-first secrets", body: "Credentials stay as references. Nothing is rendered in the UI." },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(nextEmail: string, nextPassword: string) {
    setError("");
    setLoading(true);
    try {
      const session = await api<Session>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: nextEmail, password: nextPassword }),
      });
      setSession(session);
      router.replace("/command");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Check email and password.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await submit(email, password);
  }

  return (
    <AuthSplit
      eyebrow="Infrastructure intelligence"
      title={
        <>
          Evidence before action.
          <br />
          <span className="text-coral">Estate before guesswork.</span>
        </>
      }
      subtitle="Sign in to Command Centre for on-prem, hybrid, and GPU infrastructure — CMDB, DCIM, IPAM, and copilot in one place."
      highlights={highlights}
    >
      <div className="mx-auto w-full max-w-[400px]">
        <div className="mb-8 lg:hidden">
          <BrandMark />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-coral">Sign in</p>
        <h2 className="font-display mt-1 text-2xl font-semibold text-paper">Welcome back</h2>
        <p className="mt-2 text-sm text-muted">Use your organisation account, or open the Chennai DC demo.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <AuthField label="Work email">
            <input
              className={authInputClass}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </AuthField>
          <AuthField label="Password">
            <div className="relative">
              <input
                className={`${authInputClass} pr-10`}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-paper"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </AuthField>
          {error && <p className="text-sm text-crit">{error.replace(/^Value error,\s*/i, "")}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-coral py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setEmail("admin@wecrew.in");
            setPassword("WeCrew!admin");
            void submit("admin@wecrew.in", "WeCrew!admin");
          }}
          className="mt-3 w-full rounded-md border border-line bg-panel py-2.5 text-sm font-medium text-paper hover:border-coral/40"
        >
          Open Chennai DC demo
        </button>

        <p className="mt-6 text-sm text-muted">
          No account yet?{" "}
          <Link href="/signup" className="font-medium text-coral hover:underline">
            Create an organisation
          </Link>
        </p>
        <p className="mt-4 text-[11px] leading-relaxed text-muted">
          Demo roles: admin@wecrew.in · sre@wecrew.in · dceng@wecrew.in · viewer@wecrew.in
        </p>
      </div>
    </AuthSplit>
  );
}
