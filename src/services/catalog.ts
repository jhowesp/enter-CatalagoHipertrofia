import { supabase } from "@/integrations/supabase/client";
import {
  normalizeImages,
  normalizeSpecs,
  type Brand,
  type CatalogProduct,
  type Category,
  type ProductFilters,
  type PublicProductRow,
} from "@/types/catalog";

const PUBLIC_PRODUCT_COLUMNS =
  "id,name,slug,brand_id,brand_name,brand_slug,category_id,category_name,category_slug,description,short_description,specs,weight,flavor,price,sale_price,effective_price,discount_percent,image_url,images,stock,featured";

/**
 * A view pública já vem sem `cost_price`, `margin_percent`, `is_demo` e apenas
 * com produtos ativos. Ainda assim normalizamos para tipos estritos.
 */
function mapProduct(row: PublicProductRow): CatalogProduct {
  const price = Number(row.price ?? 0);
  const salePrice = row.sale_price === null ? null : Number(row.sale_price);

  return {
    id: String(row.id ?? ""),
    name: row.name ?? "",
    slug: row.slug ?? "",
    brandId: row.brand_id ?? null,
    brandName: row.brand_name ?? null,
    brandSlug: row.brand_slug ?? null,
    categoryId: row.category_id ?? null,
    categoryName: row.category_name ?? null,
    categorySlug: row.category_slug ?? null,
    description: row.description ?? null,
    shortDescription: row.short_description ?? null,
    specs: normalizeSpecs(row.specs),
    weight: row.weight ?? null,
    flavor: row.flavor ?? null,
    price,
    salePrice,
    effectivePrice: Number(row.effective_price ?? salePrice ?? price),
    discountPercent: Number(row.discount_percent ?? 0),
    imageUrl: row.image_url ?? null,
    images: (() => {
      const gallery = normalizeImages(row.images);
      if (gallery.length > 0) return gallery;
      return row.image_url ? [row.image_url] : [];
    })(),
    stock: Number(row.stock ?? 0),
    featured: Boolean(row.featured),
  };
}

/** Remove caracteres que quebram a sintaxe de `or()` do PostgREST. */
function sanitizeSearch(term: string | undefined): string {
  return (term ?? "")
    .replace(/[,()%*\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function applySort<T extends {
  order: (column: string, options?: { ascending?: boolean }) => T;
}>(query: T, sort: ProductFilters["sort"]): T {
  switch (sort) {
    case "price-asc":
      return query.order("effective_price", { ascending: true });
    case "price-desc":
      return query.order("effective_price", { ascending: false });
    case "discount":
      return query.order("discount_percent", { ascending: false });
    case "name":
      return query.order("name", { ascending: true });
    default:
      return query.order("featured", { ascending: false }).order("name", { ascending: true });
  }
}

export async function listProducts(
  filters: ProductFilters = {},
): Promise<{ items: CatalogProduct[]; total: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.max(1, filters.pageSize ?? 12);
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("public_products")
    .select(PUBLIC_PRODUCT_COLUMNS, { count: "exact" });

  const term = sanitizeSearch(filters.search);
  if (term) {
    query = query.or(
      `name.ilike.%${term}%,brand_name.ilike.%${term}%,category_name.ilike.%${term}%`,
    );
  }

  if (filters.categorySlug) {
    query = query.eq("category_slug", filters.categorySlug);
  }

  if (filters.brandSlug) {
    query = query.eq("brand_slug", filters.brandSlug);
  }

  query = applySort(query, filters.sort);

  const { data, error, count } = await query.range(from, from + pageSize - 1);

  if (error) throw new Error(error.message);

  return {
    items: (data ?? []).map((row) => mapProduct(row as PublicProductRow)),
    total: count ?? 0,
  };
}

export async function getProductBySlug(
  slug: string,
): Promise<CatalogProduct | null> {
  const { data, error } = await supabase
    .from("public_products")
    .select(PUBLIC_PRODUCT_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapProduct(data as PublicProductRow) : null;
}

export async function getProductsByIds(ids: string[]): Promise<CatalogProduct[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("public_products")
    .select(PUBLIC_PRODUCT_COLUMNS)
    .in("id", ids);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapProduct(row as PublicProductRow));
}

export async function listFeaturedProducts(limit = 8): Promise<CatalogProduct[]> {
  const { data, error } = await supabase
    .from("public_products")
    .select(PUBLIC_PRODUCT_COLUMNS)
    .eq("featured", true)
    .order("effective_price", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapProduct(row as PublicProductRow));
}

export async function listOfferProducts(limit = 8): Promise<CatalogProduct[]> {
  const { data, error } = await supabase
    .from("public_products")
    .select(PUBLIC_PRODUCT_COLUMNS)
    .not("sale_price", "is", null)
    .order("discount_percent", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapProduct(row as PublicProductRow));
}

export async function listRelatedProducts(
  product: Pick<CatalogProduct, "id" | "categorySlug">,
  limit = 4,
): Promise<CatalogProduct[]> {
  let query = supabase
    .from("public_products")
    .select(PUBLIC_PRODUCT_COLUMNS)
    .neq("id", product.id)
    .order("featured", { ascending: false })
    .order("name", { ascending: true })
    .limit(limit);

  if (product.categorySlug) {
    query = query.eq("category_slug", product.categorySlug);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapProduct(row as PublicProductRow));
}

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,slug,image_url,active")
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    imageUrl: row.image_url ?? null,
    active: row.active,
  }));
}

export async function listBrands(): Promise<Brand[]> {
  const { data, error } = await supabase
    .from("brands")
    .select("id,name,slug,logo_url,active")
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url ?? null,
    active: row.active,
  }));
}

export const CATALOG_PAGE_SIZE = 12;
