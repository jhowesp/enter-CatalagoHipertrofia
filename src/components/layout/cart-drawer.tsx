import { Link } from "react-router-dom";
import { ShoppingCart, Trash2 } from "lucide-react";

import { QuantityStepper } from "@/components/catalog/quantity-stepper";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { QUOTE_NOTICE } from "@/config/store";
import { useQuoteCart } from "@/context/quote-cart";
import { formatCurrency } from "@/lib/format";

export function CartDrawer() {
  const {
    items,
    isOpen,
    openCart,
    closeCart,
    setQuantity,
    removeItem,
    clear,
    totalUnits,
    totalValue,
  } = useQuoteCart();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? openCart() : closeCart())}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-border bg-background p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="font-display text-xl uppercase tracking-tight">
            Meu orçamento
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {totalUnits === 0
              ? "Nenhum item adicionado ainda."
              : `${totalUnits} ${totalUnits === 1 ? "item" : "itens"} no orçamento`}
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <ShoppingCart className="h-10 w-10 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Seu orçamento está vazio. Explore o catálogo e adicione os produtos que quiser.
            </p>
            <Button variant="brand" size="lg" asChild onClick={closeCart}>
              <Link to="/catalogo">Ver catálogo</Link>
            </Button>
          </div>
        ) : (
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {items.map((item) => (
              <article
                key={item.key}
                className="flex gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-[radial-gradient(circle_at_50%_15%,hsl(0_0%_16%),hsl(0_0%_6%))] p-1.5">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-[10px] font-semibold uppercase text-muted-foreground">
                      Sem foto
                    </span>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link
                    to={`/produto/${item.slug}`}
                    onClick={closeCart}
                    className="line-clamp-2 text-sm font-semibold text-foreground hover:text-foreground"
                  >
                    {item.name}
                  </Link>
                  {item.brandName && (
                    <span className="text-[11px] uppercase tracking-[0.16em] text-foreground">
                      {item.brandName}
                    </span>
                  )}
                  {item.flavor && (
                    <span className="text-[11px] text-muted-foreground">
                      Sabor: {item.flavor}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(item.unitPrice)} cada
                  </span>

                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                    <QuantityStepper
                      value={item.quantity}
                      min={1}
                      size="sm"
                      onChange={(quantity) => setQuantity(item.key, quantity)}
                      ariaLabel={`Quantidade de ${item.name}`}
                    />
                    <span className="font-display text-base text-foreground">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(item.key)}
                  aria-label={`Remover ${item.name} do orçamento`}
                >
                  <Trash2 />
                </Button>
              </article>
            ))}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={clear}
            >
              <Trash2 />
              Limpar orçamento
            </Button>
          </div>
        )}

        {items.length > 0 && (
          <div className="space-y-3 border-t border-border px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total do orçamento</span>
              <span className="font-display text-2xl text-foreground">
                {formatCurrency(totalValue)}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {QUOTE_NOTICE}
            </p>
            <div className="grid gap-2">
              <Button variant="brand" size="xl" asChild onClick={closeCart}>
                <Link to="/orcamento/finalizar">Finalizar pelo WhatsApp</Link>
              </Button>
              <Button variant="outline" size="lg" asChild onClick={closeCart}>
                <Link to="/orcamento">Ver meu orçamento completo</Link>
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
