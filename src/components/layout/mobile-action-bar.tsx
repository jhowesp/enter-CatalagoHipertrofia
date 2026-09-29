import { Link } from "react-router-dom";
import { MessageCircle, ShoppingCart } from "lucide-react";

import { useQuoteCart } from "@/context/quote-cart";
import { buildSupportMessage, whatsappUrl } from "@/lib/whatsapp";
import { formatCurrency } from "@/lib/format";

/** Barra fixa inferior no celular: orçamento sempre a um toque + WhatsApp. */
export function MobileActionBar() {
  const { totalUnits, totalValue, openCart } = useQuoteCart();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden">
      <div className="flex items-stretch gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={openCart}
          className="flex flex-1 items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors active:bg-accent"
        >
          <span className="relative grid h-9 w-9 place-items-center rounded-md bg-gradient-primary text-primary-foreground">
            <ShoppingCart className="h-4 w-4" aria-hidden />
            {totalUnits > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-card bg-foreground px-1 text-[10px] font-bold text-background">
                {totalUnits}
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Meu orçamento
            </span>
            <span className="block truncate font-display text-base leading-tight text-foreground">
              {totalUnits > 0 ? formatCurrency(totalValue) : "Vazio"}
            </span>
          </span>
        </button>

        {totalUnits > 0 ? (
          <Link
            to="/orcamento/finalizar"
            className="flex shrink-0 items-center rounded-lg bg-gradient-primary px-4 text-xs font-semibold uppercase tracking-wide text-primary-foreground"
          >
            Finalizar
          </Link>
        ) : (
          <a
            href={whatsappUrl(buildSupportMessage())}
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-secondary px-4 text-xs font-semibold uppercase tracking-wide text-foreground"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
