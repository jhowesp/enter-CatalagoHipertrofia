import type { Database, Json } from "@/integrations/supabase/types";
import type { QuoteStatus } from "@/config/store";

type PublicTables = Database["public"]["Tables"];

export type ProductRow = PublicTables["products"]["Row"];
export type ProductInsert = PublicTables["products"]["Insert"];
export type ProductUpdate = PublicTables["products"]["Update"];
export type CategoryRow = PublicTables["categories"]["Row"];
export type BrandRow = PublicTables["brands"]["Row"];
export type QuoteRow = PublicTables["quotes"]["Row"];
export type QuoteItemRow = PublicTables["quote_items"]["Row"];
export type PublicProductRow = Database["public"]["Views"]["public_products"]["Row"];
export type PublicProductVariantRow =
  Database["public"]["Views"]["public_product_variants"]["Row"];
export type ProductVariantRow = PublicTables["product_variants"]["Row"];

/** Sabor de um produto, com estoque e (opcionalmente) preço próprios. */
export type ProductVariant = {
  id: string;
  productId: string;
  flavor: string;
  stock: number;
  /** Preço efetivo do sabor: próprio, senão herdado do produto. */
  price: number;
  /** Preço de tabela, para exibir riscado quando houver promoção. */
  listPrice: number;
  position: number;
};

/** Produto já normalizado para o catálogo público (sem custo, sem margem, sem flags internas). */
export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  brandId: string | null;
  brandName: string | null;
  brandSlug: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  description: string | null;
  shortDescription: string | null;
  specs: Record<string, string>;
  weight: string | null;
  flavor: string | null;
  price: number;
  salePrice: number | null;
  effectivePrice: number;
  discountPercent: number;
  imageUrl: string | null;
  /** Galeria do produto (até 5 fotos). A primeira é a principal. */
  images: string[];
  stock: number;
  featured: boolean;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  active: boolean;
};

export type Brand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  active: boolean;
};

export type SortOption =
  | "relevance"
  | "price-asc"
  | "price-desc"
  | "discount"
  | "name";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Relevância" },
  { value: "price-asc", label: "Menor preço" },
  { value: "price-desc", label: "Maior preço" },
  { value: "discount", label: "Maior desconto" },
  { value: "name", label: "Nome (A-Z)" },
];

export const isSortOption = (value: string | null): value is SortOption =>
  SORT_OPTIONS.some((option) => option.value === value);

export type ProductFilters = {
  search?: string;
  categorySlug?: string;
  brandSlug?: string;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
};

/** Item enviado para a função de criação do orçamento: id, quantidade e sabor. */
export type QuoteDraftItem = {
  productId: string;
  quantity: number;
  /** Sabor escolhido, quando o produto tem variações. */
  flavor?: string | null;
};

export type QuoteSummaryItem = {
  productId: string | null;
  name: string;
  flavor: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type QuoteWithItems = {
  quote: QuoteRow;
  items: QuoteItemRow[];
  itemsCount: number;
};

export type { QuoteStatus };

/** Normaliza a lista de fotos do produto, descartando valores vazios. */
export function normalizeImages(value: string[] | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

/** Normaliza o jsonb `specs` para um mapa de textos exibíveis. */
export function normalizeSpecs(value: Json | null | undefined): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, Json>).reduce<Record<string, string>>(
    (acc, [key, raw]) => {
      if (raw === null || raw === undefined) return acc;
      const text = typeof raw === "object" ? JSON.stringify(raw) : String(raw);
      if (text.trim()) acc[key] = text;
      return acc;
    },
    {},
  );
}
