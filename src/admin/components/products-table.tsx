import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { STORE } from "@/config/store";
import { formatCurrency } from "@/lib/format";
import { optimizeImageUrl } from "@/lib/image-url";
import type { BrandRow, CategoryRow, ProductRow } from "@/types/catalog";
import { cn } from "@/lib/utils";

type ProductsTableProps = {
  products: ProductRow[];
  categories: CategoryRow[];
  brands: BrandRow[];
  loading?: boolean;
  onEdit: (product: ProductRow) => void;
  onToggleFlag: (
    product: ProductRow,
    field: "active" | "featured",
    value: boolean,
  ) => void;
  onDelete: (product: ProductRow) => void;
};

function ProductThumb({ product }: { product: ProductRow }) {
  return (
    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-border photo-surface p-1">
      {product.image_url ? (
        <img
          src={optimizeImageUrl(product.image_url, { width: 100 }) ?? product.image_url}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="grid h-full w-full place-items-center text-[9px] font-semibold uppercase text-muted-foreground">
          s/f
        </span>
      )}
    </div>
  );
}

function MarginCell({ product }: { product: ProductRow }) {
  return (
    <span
      className={cn(
        "text-sm font-semibold",
        product.margin_percent === null
          ? "text-muted-foreground"
          : product.margin_percent >= 0
            ? "text-success"
            : "text-destructive",
      )}
    >
      {product.margin_percent === null ? "—" : `${product.margin_percent}%`}
    </span>
  );
}

function StockBadge({ product }: { product: ProductRow }) {
  const low = product.stock <= STORE.lowStockThreshold;

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
        low ? "bg-warning/15 text-warning" : "bg-secondary text-muted-foreground",
      )}
    >
      {product.stock}
    </span>
  );
}

export function ProductsTable({
  products,
  categories,
  brands,
  loading = false,
  onEdit,
  onToggleFlag,
  onDelete,
}: ProductsTableProps) {
  const categoryName = (id: string | null) =>
    categories.find((category) => category.id === id)?.name ?? "Sem categoria";
  const brandName = (id: string | null) =>
    brands.find((brand) => brand.id === id)?.name ?? "Sem marca";

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-16 w-full animate-pulse rounded-lg border border-border bg-card"
          />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
        <p className="font-display text-lg uppercase tracking-tight text-foreground">
          Nenhum produto encontrado
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajuste os filtros ou cadastre um novo produto.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-border bg-secondary/40 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5">Produto</th>
              <th className="px-3 py-2.5 text-right">Preço</th>
              <th className="px-3 py-2.5 text-right">Custo / Margem</th>
              <th className="px-3 py-2.5 text-center">Estoque</th>
              <th className="px-3 py-2.5 text-center">Ativo</th>
              <th className="px-3 py-2.5 text-center">Destaque</th>
              <th className="sticky right-0 bg-secondary/40 px-3 py-2.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <ProductThumb product={product} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{product.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {categoryName(product.category_id)} • {brandName(product.brand_id)}
                        {product.is_demo && (
                          <span className="ml-2 rounded bg-foreground/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-foreground">
                            demonstração
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="whitespace-nowrap px-3 py-2.5 text-right">
                  <span className="font-semibold text-foreground">
                    {formatCurrency(product.effective_price ?? product.price)}
                  </span>
                  {product.sale_price !== null && (
                    <span className="block text-[11px] text-muted-foreground line-through">
                      {formatCurrency(product.price)}
                    </span>
                  )}
                </td>

                <td className="whitespace-nowrap px-3 py-2.5 text-right">
                  <span className="block text-muted-foreground">
                    {product.cost_price === null ? "—" : formatCurrency(product.cost_price)}
                  </span>
                  <span className="block text-[11px]">
                    <MarginCell product={product} />
                  </span>
                </td>

                <td className="px-3 py-2.5 text-center">
                  <StockBadge product={product} />
                </td>

                <td className="px-3 py-2.5 text-center">
                  <Switch
                    checked={product.active}
                    onCheckedChange={(value) => onToggleFlag(product, "active", value)}
                    aria-label={`Ativar ${product.name}`}
                  />
                </td>

                <td className="px-3 py-2.5 text-center">
                  <Switch
                    checked={product.featured}
                    onCheckedChange={(value) => onToggleFlag(product, "featured", value)}
                    aria-label={`Destacar ${product.name}`}
                  />
                </td>

                <td className="sticky right-0 bg-card px-3 py-2.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(product)}
                      aria-label={`Editar ${product.name}`}
                    >
                      <Pencil />
                      <span className="hidden xl:inline">Editar</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-muted-foreground hover:border-destructive/60 hover:text-destructive"
                      onClick={() => onDelete(product)}
                      aria-label={`Excluir ${product.name}`}
                    >
                      <Trash2 />
                      <span className="hidden xl:inline">Excluir</span>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {products.map((product) => (
          <article
            key={product.id}
            className="space-y-3 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex gap-3">
              <ProductThumb product={product} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{product.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {categoryName(product.category_id)} • {brandName(product.brand_id)}
                </p>
                {product.is_demo && (
                  <span className="mt-1 inline-block rounded bg-foreground/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-foreground">
                    demonstração
                  </span>
                )}
              </div>
              <div className="text-right">
                <p className="font-display text-lg text-foreground">
                  {formatCurrency(product.effective_price ?? product.price)}
                </p>
                {product.sale_price !== null && (
                  <p className="text-[11px] text-muted-foreground line-through">
                    {formatCurrency(product.price)}
                  </p>
                )}
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="rounded-md bg-secondary/50 px-2 py-1.5">
                <dt className="text-muted-foreground">Custo</dt>
                <dd className="text-foreground">
                  {product.cost_price === null ? "—" : formatCurrency(product.cost_price)}
                </dd>
              </div>
              <div className="rounded-md bg-secondary/50 px-2 py-1.5">
                <dt className="text-muted-foreground">Margem</dt>
                <dd>
                  <MarginCell product={product} />
                </dd>
              </div>
              <div className="rounded-md bg-secondary/50 px-2 py-1.5">
                <dt className="text-muted-foreground">Estoque</dt>
                <dd>
                  <StockBadge product={product} />
                </dd>
              </div>
            </dl>

            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={product.active}
                  onCheckedChange={(value) => onToggleFlag(product, "active", value)}
                  aria-label={`Ativar ${product.name}`}
                />
                Ativo
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={product.featured}
                  onCheckedChange={(value) => onToggleFlag(product, "featured", value)}
                  aria-label={`Destacar ${product.name}`}
                />
                Destaque
              </label>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onEdit(product)}
              >
                <Pencil />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-muted-foreground hover:border-destructive/60 hover:text-destructive"
                onClick={() => onDelete(product)}
              >
                <Trash2 />
                Excluir
              </Button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
