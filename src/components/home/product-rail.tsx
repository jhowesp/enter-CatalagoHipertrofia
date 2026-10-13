import { LoadError } from "@/components/catalog/load-error";
import { ProductCard } from "@/components/catalog/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CatalogProduct } from "@/types/catalog";

type ProductRailProps = {
  products: CatalogProduct[];
  onAdd: (product: CatalogProduct) => void;
  loading?: boolean;
  /** Falha ao carregar (diferente de não haver resultado). */
  error?: boolean;
  onRetry?: () => void;
  skeletonCount?: number;
  className?: string;
};

/**
 * Vitrine horizontal com "snap" no celular (deslizar com o dedo) e
 * grade de 4 colunas a partir de lg.
 */
export function ProductRail({
  products,
  onAdd,
  loading = false,
  error = false,
  onRetry,
  skeletonCount = 4,
  className,
}: ProductRailProps) {
  if (loading) {
    return (
      <div className={cn("grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4", className)}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="space-y-2 p-3.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error && !loading) {
    return <LoadError onRetry={onRetry} className={className} />;
  }

  if (products.length === 0) return null;

  return (
    <div
      className={cn(
        "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:gap-4 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0",
        className,
      )}
    >
      {products.map((product, index) => (
        <div
          key={product.id}
          className="w-[68%] shrink-0 snap-start sm:w-[46%] lg:w-auto"
        >
          <ProductCard product={product} onAdd={onAdd} priority={index < 2} />
        </div>
      ))}
    </div>
  );
}
