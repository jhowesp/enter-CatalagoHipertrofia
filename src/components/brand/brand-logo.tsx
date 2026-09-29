import { cn } from "@/lib/utils";
import { STORE } from "@/config/store";

type BrandLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  stacked?: boolean;
};

const SIZES = {
  sm: { mark: "h-8 w-8", top: "text-base", bottom: "text-[8px]" },
  md: { mark: "h-10 w-10", top: "text-xl", bottom: "text-[9px]" },
  lg: { mark: "h-12 w-12", top: "text-2xl", bottom: "text-[10px]" },
};

/** Logo da marca: marca gráfica em vermelho + lockup tipográfico. */
export function BrandLogo({ className, size = "md", stacked = true }: BrandLogoProps) {
  const scale = SIZES[size];

  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span
        aria-hidden
        className={cn(
          "relative grid place-items-center rounded-lg bg-gradient-primary shadow-[0_10px_24px_-12px_hsl(var(--primary)/0.9)]",
          scale.mark,
        )}
      >
        <span className="font-display text-lg leading-none text-primary-foreground">H</span>
      </span>
      <span className={cn("flex flex-col", stacked ? "leading-none" : "flex-row items-baseline gap-1.5")}>
        <span
          className={cn(
            "font-display uppercase leading-none tracking-tight text-foreground",
            scale.top,
          )}
        >
          {STORE.logoTop}
        </span>
        <span
          className={cn(
            "font-semibold uppercase tracking-[0.35em] text-primary",
            scale.bottom,
            stacked ? "mt-0.5" : "mt-0",
          )}
        >
          {STORE.logoBottom}
        </span>
      </span>
    </span>
  );
}
