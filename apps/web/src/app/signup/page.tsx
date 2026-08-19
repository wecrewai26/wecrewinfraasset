"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Eye, EyeOff, ShieldCheck, Sparkles } from "lucide-react";
import { AuthField, AuthSplit, authInputClass } from "@/components/auth/AuthSplit";
import { BrandMark } from "@/components/brand/BrandMark";
import { api, setSession, type Session } from "@/lib/api";

const highlights = [
  { icon: Building2, title: "Your own tenant", body: "Organisation slug, users, and inventory stay isolated from the demo estate." },
  { icon: Sparkles, title: "Platform admin from day one", body: "The first account owns the workspace and can invite operators later." },
  { icon: ShieldCheck, title: "Ready for Command Centre", body: "Sign up lands you in the console — empty until discovery starts." },
];

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const session = await api<Session>("/api/v1/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          full_name: fullName,
          email,
          organization,
          password,
          confirm_password: confirmPassword,
        }),
      });
      setSession(session);
      router.replace("/command");
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^Value error,\s*/i, "") : "Could not create the account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplit
      eyebrow="Create organisation"
      title={
        <>
          Stand up a private
          <br />
          <span className="text-coral">InfraAsset workspace.</span>
        </>
      }
      subtitle="A new tenant, a platform admin, and Command Centre — without touching the WeCrew demo hall."
      highlights={highlights}
    >
      <div className="mx-auto w-full max-w-[400px]">
        <div className="mb-8 lg:hidden">
          <BrandMark />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-coral">Sign up</p>
        <h2 className="font-display mt-1 text-2xl font-semibold text-paper">Create your organisation</h2>
        <p className="mt-2 text-sm text-muted">Password must be at least 10 characters.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <AuthField label="Full name">
            <input
              className={authInputClass}
              autoComplete="name"
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </AuthField>
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
          <AuthField label="Organisation">
            <input
              className={authInputClass}
              autoComplete="organization"
              required
              minLength={2}
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
          </AuthField>
          <AuthField label="Password">
            <div className="relative">
              <input
                className={`${authInputClass} pr-10`}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={10}
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
          <AuthField label="Confirm password">
            <input
              className={authInputClass}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={10}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </AuthField>
          {error && <p className="text-sm text-crit">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-coral py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-60"
          >
            {loading ? "Creating workspace…" : "Create organisation"}
          </button>
        </form>

        <p className="mt-6 text-sm text-muted">
          Already have access?{" "}
          <Link href="/login" className="font-medium text-coral hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthSplit>
  );
}
