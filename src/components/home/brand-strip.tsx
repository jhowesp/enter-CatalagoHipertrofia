import type { Brand } from "@/types/catalog";

export function BrandStrip({ brands }: { brands: Brand[] }) {
  if (brands.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card py-5">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-card to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-card to-transparent" />

      <div className="flex w-max animate-marquee items-center gap-4 px-4">
        {[...brands, ...brands].map((brand, index) => (
          <span
            key={`${brand.id}-${index}`}
            className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-secondary/70 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
          >
            {brand.name}
          </span>
        ))}
      </div>
    </div>
  );
}
