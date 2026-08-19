import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";

export type AuthHighlight = {
  icon: LucideIcon;
  title: string;
  body: string;
};

export function AuthSplit({
  eyebrow,
  title,
  subtitle,
  highlights,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  highlights: AuthHighlight[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ink">
      <div className="grid min-h-screen lg:grid-cols-[1.15fr_minmax(420px,480px)]">
        <section className="relative hidden overflow-hidden silicon-circuit text-ink lg:flex lg:flex-col">
          <div className="relative flex flex-1 flex-col justify-between px-12 py-10 xl:px-16 xl:py-12">
            <BrandMark inverted />
            <div className="my-10 max-w-lg space-y-10">
              <div className="space-y-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-coral">{eyebrow}</p>
                <h1 className="font-display text-[2.25rem] font-semibold leading-[1.1] tracking-tight text-ink xl:text-[2.75rem]">
                  {title}
                </h1>
                <p className="max-w-md text-[15px] leading-relaxed text-ink/70">{subtitle}</p>
              </div>
              <ul className="space-y-5">
                {highlights.map((item) => (
                  <li key={item.title} className="flex gap-4">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                      <item.icon className="h-4 w-4 text-coral" strokeWidth={2} />
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold text-ink">{item.title}</div>
                      <p className="mt-1 text-[13px] leading-relaxed text-ink/65">{item.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink/45">On-prem · hybrid · GPU · DCIM</p>
          </div>
        </section>
        <section className="flex flex-col justify-center bg-ink px-5 py-10 sm:px-10">{children}</section>
      </div>
    </div>
  );
}

export function AuthField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{label}</span>
      {children}
    </label>
  );
}

export const authInputClass =
  "w-full rounded-md border border-line bg-panel px-3 py-2.5 text-sm text-paper outline-none transition-colors placeholder:text-muted/70 focus:border-coral";
