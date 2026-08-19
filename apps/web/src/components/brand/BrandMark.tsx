import Link from "next/link";
import { Cpu } from "lucide-react";
import { cn } from "@/lib/cn";

export function BrandMark({
  href = "/",
  inverted = false,
  compact = false,
}: {
  href?: string;
  inverted?: boolean;
  compact?: boolean;
}) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5">
      <span className="silicon-die-glow flex size-8 shrink-0 items-center justify-center rounded-md bg-coral text-white">
        <Cpu size={16} />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className={cn("font-display text-sm font-semibold tracking-tight", inverted ? "text-ink" : "text-paper")}>
            Infra<span className="text-coral">Asset</span>
          </span>
          <span className={cn("block text-[10px] uppercase tracking-[0.14em]", inverted ? "text-ink/55" : "text-muted")}>
            wecrew.infra
          </span>
        </span>
      )}
    </Link>
  );
}
