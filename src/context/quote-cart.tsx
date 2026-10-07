import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { QUOTE_CART_STORAGE_KEY } from "@/config/store";

export type QuoteCartItem = {
  /** Chave única do item: produto + sabor. */
  key: string;
  productId: string;
  name: string;
  slug: string;
  brandName: string | null;
  imageUrl: string | null;
  /** Sabor escolhido, quando o produto tem variações. */
  flavor: string | null;
  /** Preço usado no orçamento: promocional quando existir. */
  unitPrice: number;
  /** Preço de tabela, para exibir riscado. */
  listPrice: number;
  quantity: number;
  stock: number;
};

// eslint-disable-next-line react-refresh/only-export-components
export const buildCartItemKey = (productId: string, flavor: string | null): string =>
  `${productId}::${(flavor ?? "").trim().toLowerCase()}`;

type QuoteCartContextValue = {
  items: QuoteCartItem[];
  itemCount: number;
  totalUnits: number;
  totalValue: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<QuoteCartItem, "quantity" | "key">, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const QuoteCartContext = createContext<QuoteCartContextValue | null>(null);

function normalizeItem(value: unknown): QuoteCartItem | null {
  if (!value || typeof value !== "object") return null;

  const item = value as Record<string, unknown>;
  const productId = typeof item.productId === "string" ? item.productId : null;
  const unitPrice = typeof item.unitPrice === "number" ? item.unitPrice : null;
  const quantity = typeof item.quantity === "number" ? item.quantity : null;

  if (!productId || unitPrice === null || quantity === null || quantity <= 0) return null;

  const flavor =
    typeof item.flavor === "string" && item.flavor.trim() ? item.flavor.trim() : null;

  return {
    key: buildCartItemKey(productId, flavor),
    productId,
    name: typeof item.name === "string" ? item.name : "",
    slug: typeof item.slug === "string" ? item.slug : "",
    brandName: typeof item.brandName === "string" ? item.brandName : null,
    imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : null,
    flavor,
    unitPrice,
    listPrice: typeof item.listPrice === "number" ? item.listPrice : unitPrice,
    quantity,
    stock: typeof item.stock === "number" ? item.stock : 0,
  };
}

function readStoredCart(): QuoteCartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(QUOTE_CART_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeItem)
      .filter((item): item is QuoteCartItem => item !== null);
  } catch {
    return [];
  }
}

export function QuoteCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<QuoteCartItem[]>(() => readStoredCart());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(QUOTE_CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* armazenamento indisponível: o orçamento continua válido na sessão atual */
    }
  }, [items]);

  const addItem = useCallback(
    (item: Omit<QuoteCartItem, "quantity" | "key">, quantity = 1) => {
      const safeQuantity = Math.max(1, Math.trunc(quantity));
      const key = buildCartItemKey(item.productId, item.flavor);

      setItems((current) => {
        const existing = current.find((entry) => entry.key === key);
        if (existing) {
          return current.map((entry) =>
            entry.key === key
              ? { ...entry, ...item, key, quantity: entry.quantity + safeQuantity }
              : entry,
          );
        }
        return [...current, { ...item, key, quantity: safeQuantity }];
      });
    },
    [],
  );

  const setQuantity = useCallback((key: string, quantity: number) => {
    setItems((current) =>
      current.flatMap((entry) => {
        if (entry.key !== key) return [entry];
        const next = Math.trunc(quantity);
        if (next <= 0) return [];
        return [{ ...entry, quantity: next }];
      }),
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((current) => current.filter((entry) => entry.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<QuoteCartContextValue>(() => {
    const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    return {
      items,
      itemCount: items.length,
      totalUnits,
      totalValue,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem,
      setQuantity,
      removeItem,
      clear,
    };
  }, [items, isOpen, addItem, setQuantity, removeItem, clear]);

  return (
    <QuoteCartContext.Provider value={value}>{children}</QuoteCartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useQuoteCart(): QuoteCartContextValue {
  const context = useContext(QuoteCartContext);
  if (!context) {
    throw new Error("useQuoteCart precisa estar dentro de QuoteCartProvider.");
  }
  return context;
}
