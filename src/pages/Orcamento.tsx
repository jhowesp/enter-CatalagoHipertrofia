import { Link } from "react-router-dom";
import { ArrowRight, ShoppingCart, Trash2 } from "lucide-react";

import { QuantityStepper } from "@/components/catalog/quantity-stepper";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { QUOTE_NOTICE } from "@/config/store";
import { useQuoteCart } from "@/context/quote-cart";
import { useSeo } from "@/hooks/use-seo";
import { formatCurrency } from "@/lib/format";

const Orcamento = () => {
  const { items, setQuantity, removeItem, clear, totalUnits, totalValue } =
    useQuoteCart();

  useSeo({
    title: "Meu orçamento | Hipertrofia Suplementos",
    description:
      "Revise os produtos do seu orçamento, ajuste as quantidades e finalize pelo WhatsApp.",
    path: "/orcamento",
    noindex: true,
  });

  return (
    <PageShell>
      <div className="border-b border-border bg-gradient-soft">
        <div className="container py-8">
          <h1 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            Meu orçamento
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Ajuste as quantidades e envie o orçamento para a loja pelo WhatsApp. Sem compra
            online e sem cadastro.
          </p>
        </div>
      </div>

      <div className="container py-8">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
            <ShoppingCart className="h-10 w-10 text-muted-foreground" aria-hidden />
            <p className="font-display text-xl uppercase tracking-tight text-foreground">
              Seu orçamento está vazio
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              Adicione produtos do catálogo para montar seu orçamento e enviar para a loja.
            </p>
            <Button variant="brand" size="xl" asChild>
              <Link to="/catalogo">
                Ver catálogo
                <ArrowRight />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-3">
              {items.map((item) => (
                <article
                  key={item.key}
                  className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 surface-card sm:flex-row sm:items-center"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[radial-gradient(circle_at_50%_15%,hsl(0_0%_16%),hsl(0_0%_6%))] p-2">
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

                  <div className="min-w-0 flex-1 space-y-1">
                    {item.brandName && (
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
                        {item.brandName}
                      </p>
                    )}
                    <h2 className="text-sm font-semibold text-foreground">
                      <Link to={`/produto/${item.slug}`} className="hover:text-foreground">
                        {item.name}
                      </Link>
                    </h2>
                    {item.flavor && (
                      <p className="text-xs text-muted-foreground">Sabor: {item.flavor}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.unitPrice)} por unidade
                      {item.listPrice > item.unitPrice && (
                        <span className="ml-2 line-through">
                          {formatCurrency(item.listPrice)}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <QuantityStepper
                      value={item.quantity}
                      onChange={(quantity) => setQuantity(item.key, quantity)}
                      min={1}
                      max={Math.max(1, item.stock)}
                      size="sm"
                      ariaLabel={`Quantidade de ${item.name}`}
                    />
                    <span className="font-display text-lg text-foreground">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="self-start text-muted-foreground hover:text-destructive sm:self-center"
                    onClick={() => removeItem(item.key)}
                    aria-label={`Remover ${item.name}`}
                  >
                    <Trash2 />
                  </Button>
                </article>
              ))}

              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="outline" size="lg" asChild>
                  <Link to="/catalogo">Continuar comprando</Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  className="text-muted-foreground"
                  onClick={clear}
                >
                  <Trash2 />
                  Limpar orçamento
                </Button>
              </div>
            </div>

            <aside className="lg:sticky lg:top-32 lg:self-start">
              <div className="space-y-4 rounded-xl border border-border bg-card p-5 surface-card">
                <h2 className="font-display text-lg tracking-tight text-foreground">
                  Resumo
                </h2>

                <dl className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Produtos diferentes</dt>
                    <dd className="text-foreground">{items.length}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Quantidade total</dt>
                    <dd className="text-foreground">{totalUnits}</dd>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <dt className="font-semibold text-foreground">Valor total</dt>
                    <dd className="font-display text-2xl text-foreground">
                      {formatCurrency(totalValue)}
                    </dd>
                  </div>
                </dl>

                <Button variant="brand" size="xl" className="w-full" asChild>
                  <Link to="/orcamento/finalizar">
                    Finalizar pelo WhatsApp
                    <ArrowRight />
                  </Link>
                </Button>

                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {QUOTE_NOTICE}
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default Orcamento;
