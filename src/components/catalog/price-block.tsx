import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CatalogProduct } from "@/types/catalog";

type PriceBlockProps = {
  product: Pick<CatalogProduct, "price" | "salePrice" | "effectivePrice" | "discountPercent">;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const PRICE_TEXT = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-3xl",
};

const OLD_TEXT = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export function PriceBlock({ product, size = "md", className }: PriceBlockProps) {
  const hasDiscount = product.salePrice !== null && product.discountPercent > 0;

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span
        className={cn(
          "font-display tracking-tight text-foreground",
          PRICE_TEXT[size],
          hasDiscount && "text-foreground",
        )}
      >
        {formatCurrency(product.effectivePrice)}
      </span>
      {hasDiscount && (
        <span className={cn("text-muted-foreground line-through", OLD_TEXT[size])}>
          {formatCurrency(product.price)}
        </span>
      )}
    </div>
  );
}
