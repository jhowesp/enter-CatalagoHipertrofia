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
  productId: string;
  name: string;
  slug: string;
  brandName: string | null;
  imageUrl: string | null;
  /** Preço usado no orçamento: promocional quando existir. */
  unitPrice: number;
  /** Preço de tabela, para exibir riscado. */
  listPrice: number;
  quantity: number;
  stock: number;
};

type QuoteCartContextValue = {
  items: QuoteCartItem[];
  itemCount: number;
  totalUnits: number;
  totalValue: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<QuoteCartItem, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
};

const QuoteCartContext = createContext<QuoteCartContextValue | null>(null);

function isCartItem(value: unknown): value is QuoteCartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.productId === "string" &&
    typeof item.name === "string" &&
    typeof item.slug === "string" &&
    typeof item.unitPrice === "number" &&
    typeof item.quantity === "number" &&
    Number.isFinite(item.unitPrice) &&
    Number.isFinite(item.quantity) &&
    item.quantity > 0
  );
}

function readStoredCart(): QuoteCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUOTE_CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCartItem);
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
    (item: Omit<QuoteCartItem, "quantity">, quantity = 1) => {
      const safeQuantity = Math.max(1, Math.trunc(quantity));
      setItems((current) => {
        const existing = current.find((entry) => entry.productId === item.productId);
        if (existing) {
          return current.map((entry) =>
            entry.productId === item.productId
              ? { ...entry, ...item, quantity: entry.quantity + safeQuantity }
              : entry,
          );
        }
        return [...current, { ...item, quantity: safeQuantity }];
      });
    },
    [],
  );

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((current) =>
      current.flatMap((entry) => {
        if (entry.productId !== productId) return [entry];
        const next = Math.trunc(quantity);
        if (next <= 0) return [];
        return [{ ...entry, quantity: next }];
      }),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => current.filter((entry) => entry.productId !== productId));
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
