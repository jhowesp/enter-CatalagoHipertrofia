import { PackageSearch } from "lucide-react";

import { ProductCard } from "@/components/catalog/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CatalogProduct } from "@/types/catalog";

type ProductGridProps = {
  products: CatalogProduct[];
  onAdd: (product: CatalogProduct) => void;
  loading?: boolean;
  skeletonCount?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
};

export function ProductGrid({
  products,
  onAdd,
  loading = false,
  skeletonCount = 8,
  emptyTitle = "Nenhum produto encontrado",
  emptyDescription = "Tente outra busca ou remova os filtros aplicados.",
  className,
}: ProductGridProps) {
  const gridClass = cn(
    "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4",
    className,
  );

  if (loading) {
    return (
      <div className={gridClass} aria-busy="true">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="space-y-2 p-3.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-11 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
        <PackageSearch className="h-10 w-10 text-muted-foreground" aria-hidden />
        <p className="font-display text-lg uppercase tracking-tight text-foreground">
          {emptyTitle}
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          onAdd={onAdd}
          priority={index < 4}
        />
      ))}
    </div>
  );
}
