import { toast } from "sonner";

import { useQuoteCart, type QuoteCartItem } from "@/context/quote-cart";
import type { CatalogProduct } from "@/types/catalog";

/**
 * Centraliza "Adicionar ao orçamento": grava no carrinho persistente e
 * confirma com um toast que também dá acesso rápido ao orçamento.
 */
export function useAddToQuote() {
  const { addItem, openCart } = useQuoteCart();

  return (
    product: CatalogProduct,
    quantity = 1,
    options: { openDrawer?: boolean } = {},
  ) => {
    const cartItem: Omit<QuoteCartItem, "quantity"> = {
      productId: product.id,
      name: product.name,
      slug: product.slug,
      brandName: product.brandName,
      imageUrl: product.imageUrl,
      unitPrice: product.effectivePrice,
      listPrice: product.price,
      stock: product.stock,
    };

    addItem(cartItem, quantity);

    toast.success("Adicionado ao orçamento", {
      description: `${quantity}x ${product.name}`,
      action: { label: "Ver orçamento", onClick: () => openCart() },
    });

    if (options.openDrawer) openCart();
  };
}
