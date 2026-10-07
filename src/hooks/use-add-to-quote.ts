import { toast } from "sonner";

import { useQuoteCart, type QuoteCartItem } from "@/context/quote-cart";
import type { CatalogProduct } from "@/types/catalog";

export type AddToQuoteOptions = {
  openDrawer?: boolean;
  /** Sabor escolhido quando o produto tem variações. */
  flavor?: string | null;
  /** Preço do sabor escolhido (sobrepõe o preço do produto). */
  unitPrice?: number;
  listPrice?: number;
  stock?: number;
};

/**
 * Centraliza "Adicionar ao orçamento": grava no carrinho persistente e
 * confirma com um toast que também dá acesso rápido ao orçamento.
 */
export function useAddToQuote() {
  const { addItem, openCart } = useQuoteCart();

  return (
    product: CatalogProduct,
    quantity = 1,
    options: AddToQuoteOptions = {},
  ) => {
    const flavor = options.flavor?.trim() ? options.flavor.trim() : null;

    const cartItem: Omit<QuoteCartItem, "quantity" | "key"> = {
      productId: product.id,
      name: product.name,
      slug: product.slug,
      brandName: product.brandName,
      imageUrl: product.imageUrl,
      flavor,
      unitPrice: options.unitPrice ?? product.effectivePrice,
      listPrice: options.listPrice ?? product.price,
      stock: options.stock ?? product.stock,
    };

    addItem(cartItem, quantity);

    toast.success("Adicionado ao orçamento", {
      description: `${quantity}x ${product.name}${flavor ? ` — ${flavor}` : ""}`,
      action: { label: "Ver orçamento", onClick: () => openCart() },
    });

    if (options.openDrawer) openCart();
  };
}
