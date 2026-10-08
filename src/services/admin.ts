import { supabase } from "@/integrations/supabase/client";
import { STORE, type QuoteStatus } from "@/config/store";
import type {
  BrandRow,
  CategoryRow,
  ProductInsert,
  ProductRow,
  ProductUpdate,
  ProductVariantRow,
  QuoteItemRow,
  QuoteRow,
  QuoteWithItems,
} from "@/types/catalog";

/* ------------------------------------------------------------------ */
/* Produtos                                                            */
/* ------------------------------------------------------------------ */

export type AdminProductFilters = {
  search?: string;
  categoryId?: string;
  brandId?: string;
  visibility?: "all" | "active" | "inactive";
  demoOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export const ADMIN_PAGE_SIZE = 20;

function sanitizeSearch(term: string | undefined): string {
  return (term ?? "")
    .replace(/[,()%*\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function listAdminProducts(
  filters: AdminProductFilters = {},
): Promise<{ items: ProductRow[]; total: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? ADMIN_PAGE_SIZE;

  let query = supabase.from("products").select("*", { count: "exact" });

  const term = sanitizeSearch(filters.search);
  if (term) query = query.ilike("name", `%${term}%`);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.brandId) query = query.eq("brand_id", filters.brandId);
  if (filters.visibility === "active") query = query.eq("active", true);
  if (filters.visibility === "inactive") query = query.eq("active", false);
  if (filters.demoOnly) query = query.eq("is_demo", true);

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query
    .order("name", { ascending: true })
    .range(from, from + pageSize - 1);

  if (error) throw new Error(error.message);
  return { items: (data ?? []) as ProductRow[], total: count ?? 0 };
}

/** Lista enxuta (id, nome, slug) usada pela importação CSV para detectar duplicados. */
export async function listProductReferences(): Promise<
  { id: string; name: string; slug: string }[]
> {
  const { data, error } = await supabase.from("products").select("id,name,slug");

  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; name: string; slug: string }[];
}

export async function getAdminProduct(id: string): Promise<ProductRow | null> {  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as ProductRow) ?? null;
}

export async function createProduct(payload: ProductInsert): Promise<ProductRow> {
  const { data, error } = await supabase
    .from("products")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as ProductRow;
}

export async function updateProduct(
  id: string,
  payload: ProductUpdate,
): Promise<ProductRow> {
  const { data, error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as ProductRow;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setProductFlag(
  id: string,
  payload: Pick<ProductUpdate, "active" | "featured">,
): Promise<void> {
  const { error } = await supabase.from("products").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ */
/* Sabores (variações do produto)                                      */
/* ------------------------------------------------------------------ */

export type VariantInput = {
  flavor: string;
  /** null = herda o preço do produto. */
  price: number | null;
  salePrice: number | null;
  stock: number;
  active: boolean;
};

export async function listAdminVariants(
  productId: string,
): Promise<ProductVariantRow[]> {
  const { data, error } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", productId)
    .order("position", { ascending: true })
    .order("flavor", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ProductVariantRow[];
}

/**
 * Sincroniza os sabores do produto com a lista informada.
 * Atualiza/insere por sabor e só depois remove os que saíram — assim uma falha
 * no meio do caminho não apaga os sabores existentes.
 */
export async function saveProductVariants(
  productId: string,
  rows: VariantInput[],
): Promise<void> {
  const cleaned = rows
    .map((row, index) => ({ ...row, flavor: row.flavor.trim(), position: index }))
    .filter((row) => row.flavor.length > 0);

  if (cleaned.length > 0) {
    const { error: upsertError } = await supabase.from("product_variants").upsert(
      cleaned.map((row) => ({
        product_id: productId,
        flavor: row.flavor,
        price: row.price,
        sale_price: row.salePrice,
        stock: row.stock,
        active: row.active,
        position: row.position,
      })),
      { onConflict: "product_id,flavor" },
    );

    if (upsertError) throw new Error(upsertError.message);
  }

  const { data: existing, error: readError } = await supabase
    .from("product_variants")
    .select("id,flavor")
    .eq("product_id", productId);

  if (readError) throw new Error(readError.message);

  const keep = new Set(cleaned.map((row) => row.flavor));
  const toDelete = (existing ?? [])
    .filter((row) => !keep.has(row.flavor))
    .map((row) => row.id);

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("product_variants")
      .delete()
      .in("id", toDelete);

    if (deleteError) throw new Error(deleteError.message);
  }
}

/* ------------------------------------------------------------------ */
/* Categorias e marcas                                                 */
/* ------------------------------------------------------------------ */

export async function listAdminCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CategoryRow[];
}

export async function createCategory(payload: {
  name: string;
  slug: string;
  image_url?: string | null;
  active?: boolean;
}): Promise<CategoryRow> {
  const { data, error } = await supabase
    .from("categories")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as CategoryRow;
}

export async function updateCategory(
  id: string,
  payload: { name?: string; slug?: string; image_url?: string | null; active?: boolean },
): Promise<CategoryRow> {
  const { data, error } = await supabase
    .from("categories")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as CategoryRow;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listAdminBrands(): Promise<BrandRow[]> {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as BrandRow[];
}

export async function createBrand(payload: {
  name: string;
  slug: string;
  logo_url?: string | null;
  active?: boolean;
}): Promise<BrandRow> {
  const { data, error } = await supabase
    .from("brands")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as BrandRow;
}

export async function updateBrand(
  id: string,
  payload: { name?: string; slug?: string; logo_url?: string | null; active?: boolean },
): Promise<BrandRow> {
  const { data, error } = await supabase
    .from("brands")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as BrandRow;
}

export async function deleteBrand(id: string): Promise<void> {
  const { error } = await supabase.from("brands").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ */
/* Orçamentos                                                          */
/* ------------------------------------------------------------------ */

export type AdminQuoteListItem = QuoteRow & { itemsCount: number };

type QuoteWithCountRow = QuoteRow & { quote_items?: { count: number }[] };

export async function listAdminQuotes(filters: {
  status?: QuoteStatus | "all";
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: AdminQuoteListItem[]; total: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? ADMIN_PAGE_SIZE;

  let query = supabase
    .from("quotes")
    .select("*, quote_items(count)", { count: "exact" });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const term = sanitizeSearch(filters.search);
  if (term) {
    query = query.or(
      `customer_name.ilike.%${term}%,customer_whatsapp.ilike.%${term}%`,
    );
  }

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) throw new Error(error.message);

  const items = ((data ?? []) as unknown as QuoteWithCountRow[]).map((row) => {
    const { quote_items: quoteItems, ...quote } = row;
    return {
      ...(quote as QuoteRow),
      itemsCount: quoteItems?.[0]?.count ?? 0,
    };
  });

  return { items, total: count ?? 0 };
}

export async function getQuoteWithItems(
  id: string,
): Promise<QuoteWithItems | null> {
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (quoteError) throw new Error(quoteError.message);
  if (!quote) return null;

  const { data: items, error: itemsError } = await supabase
    .from("quote_items")
    .select("*")
    .eq("quote_id", id)
    .order("created_at", { ascending: true });

  if (itemsError) throw new Error(itemsError.message);

  const list = (items ?? []) as QuoteItemRow[];
  return {
    quote: quote as QuoteRow,
    items: list,
    itemsCount: list.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export async function updateQuoteStatus(
  id: string,
  status: QuoteStatus,
): Promise<void> {
  const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ */
/* Dashboard e dados de demonstração                                   */
/* ------------------------------------------------------------------ */

export type DashboardMetrics = {
  activeProducts: number;
  totalProducts: number;
  totalQuotes: number;
  totalQuoteValue: number;
  newQuotes: number;
  lowStockProducts: number;
  demoProducts: number;
  demoBanners: number;
};

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [
    activeProducts,
    totalProducts,
    totalQuotes,
    newQuotes,
    lowStock,
    demos,
    demoBanners,
    totals,
  ] = await Promise.all([
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("active", true),
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("quotes").select("id", { count: "exact", head: true }),
      supabase
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .eq("status", "new"),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("active", true)
        .lte("stock", STORE.lowStockThreshold),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("is_demo", true),
      supabase.from("banners").select("id", { count: "exact", head: true }).eq("is_demo", true),
      supabase.from("quotes").select("total"),
    ]);

  const firstError =
    activeProducts.error ??
    totalProducts.error ??
    totalQuotes.error ??
    newQuotes.error ??
    lowStock.error ??
    demos.error ??
    demoBanners.error ??
    totals.error;

  if (firstError) throw new Error(firstError.message);

  const totalQuoteValue = (totals.data ?? []).reduce(
    (sum, row) => sum + Number((row as { total: number | null }).total ?? 0),
    0,
  );

  return {
    activeProducts: activeProducts.count ?? 0,
    totalProducts: totalProducts.count ?? 0,
    totalQuotes: totalQuotes.count ?? 0,
    totalQuoteValue,
    newQuotes: newQuotes.count ?? 0,
    lowStockProducts: lowStock.count ?? 0,
    demoProducts: demos.count ?? 0,
    demoBanners: demoBanners.count ?? 0,
  };
}

export async function listLowStockProducts(limit = 5): Promise<ProductRow[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .lte("stock", STORE.lowStockThreshold)
    .order("stock", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as ProductRow[];
}

export type DemoCleanupResult = { products: number; banners: number };

/**
 * Remove apenas o que está marcado como demonstração (produtos e banners da home).
 * O histórico de orçamentos é preservado: `quote_items` guarda o nome do produto.
 */
export async function deleteDemoData(): Promise<DemoCleanupResult> {
  const [productsResult, bannersResult] = await Promise.all([
    supabase.from("products").delete().eq("is_demo", true).select("id"),
    supabase.from("banners").delete().eq("is_demo", true).select("id"),
  ]);

  if (productsResult.error) throw new Error(productsResult.error.message);
  if (bannersResult.error) throw new Error(bannersResult.error.message);

  return {
    products: (productsResult.data ?? []).length,
    banners: (bannersResult.data ?? []).length,
  };
}
