import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "primary" | "warning" | "success";
  className?: string;
};

const TONES = {
  default: "text-foreground",
  primary: "text-foreground",
  warning: "text-warning",
  success: "text-success",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: StatCardProps) {
  return (
    <article
      className={cn(
        "space-y-3 rounded-xl border border-border bg-card p-4 surface-card",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </span>
        <Icon className={cn("h-4 w-4", TONES[tone])} aria-hidden />
      </div>
      <p className={cn("font-display text-3xl leading-none", TONES[tone])}>{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </article>
  );
}
