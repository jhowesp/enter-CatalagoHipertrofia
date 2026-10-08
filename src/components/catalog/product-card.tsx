import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";

import { DiscountBadge } from "@/components/catalog/discount-badge";
import { PriceBlock } from "@/components/catalog/price-block";
import { ProductImage } from "@/components/catalog/product-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CatalogProduct } from "@/types/catalog";

type ProductCardProps = {
  product: CatalogProduct;
  onAdd: (product: CatalogProduct) => void;
  /** Primeiras imagens da tela carregam com prioridade. */
  priority?: boolean;
  className?: string;
};

export function ProductCard({ product, onAdd, priority = false, className }: ProductCardProps) {
  const outOfStock = product.stock <= 0;

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card surface-card transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-card",
        className,
      )}
    >
      <Link
        to={`/produto/${product.slug}`}
        className="relative block aspect-square w-full overflow-hidden bg-[radial-gradient(circle_at_50%_15%,hsl(0_0%_16%),hsl(0_0%_6%))] p-3"
        aria-label={`Ver detalhes de ${product.name}`}
      >
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          priority={priority}
        />
        {product.discountPercent > 0 && (
          <DiscountBadge percent={product.discountPercent} className="absolute left-3 top-3" />
        )}
        {outOfStock && (
          <span className="absolute right-3 top-3 rounded-full border border-border bg-background/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Sob consulta
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        {product.brandName && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
            {product.brandName}
          </span>
        )}

        <h3 className="line-clamp-2 font-sans text-sm font-semibold normal-case leading-snug tracking-normal text-foreground">
          <Link to={`/produto/${product.slug}`} className="hover:text-foreground">
            {product.name}
          </Link>
        </h3>

        {product.shortDescription && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {product.shortDescription}
          </p>
        )}

        <div className="mt-auto space-y-3 pt-1">
          <div className="flex items-end justify-between gap-2">
            <PriceBlock product={product} size="md" />
            {product.flavor && (
              <span className="pb-1 text-[11px] text-muted-foreground">
                {product.flavor}
              </span>
            )}
          </div>

          <Button
            type="button"
            variant="brand"
            size="lg"
            className="h-auto min-h-11 w-full whitespace-normal px-2 py-2.5 text-center text-[11px] leading-tight tracking-normal sm:text-xs"
            onClick={() => onAdd(product)}
          >
            <ShoppingCart className="shrink-0" />
            Adicionar ao orçamento
          </Button>
        </div>
      </div>
    </article>
  );
}
