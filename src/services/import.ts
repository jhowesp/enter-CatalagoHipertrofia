import Papa from "papaparse";

import { parseBoolean, parseDecimal } from "@/lib/format";
import { slugify, uniqueSlug } from "@/lib/slug";
import {
  createBrand,
  createCategory,
  createProduct,
  listAdminBrands,
  listAdminCategories,
  updateProduct,
} from "@/services/admin";
import type { ProductInsert, ProductRow } from "@/types/catalog";

/** Colunas aceitas no CSV de importação de produtos. */
export const CSV_COLUMNS = [
  "name",
  "brand",
  "category",
  "description",
  "short_description",
  "price",
  "sale_price",
  "cost_price",
  "stock",
  "featured",
  "active",
  "weight",
  "flavor",
  "image_url",
] as const;

export const REQUIRED_CSV_COLUMNS = ["name", "price"] as const;

const TEMPLATE_SAMPLE: Record<string, string> = {
  name: "Whey Protein Concentrado 900g",
  brand: "Max Titanium",
  category: "Whey Protein",
  description: "Proteína concentrada de rápida absorção para o dia a dia.",
  short_description: "24 g de proteína por dose.",
  price: "189,90",
  sale_price: "159,90",
  cost_price: "118,00",
  stock: "10",
  featured: "sim",
  active: "sim",
  weight: "900 g",
  flavor: "Baunilha",
  image_url: "",
};

export function buildCsvTemplate(): string {
  return Papa.unparse([TEMPLATE_SAMPLE], { columns: [...CSV_COLUMNS], delimiter: ";" });
}

export type ImportRowError = {
  line: number;
  field: string;
  message: string;
};

export type ProductDraft = {
  line: number;
  name: string;
  slug: string;
  brandName: string | null;
  categoryName: string | null;
  description: string | null;
  shortDescription: string | null;
  specs: Record<string, string>;
  weight: string | null;
  flavor: string | null;
  price: number;
  salePrice: number | null;
  costPrice: number | null;
  stock: number;
  featured: boolean;
  active: boolean;
  imageUrl: string | null;
};

export type ParsedImportRow = {
  line: number;
  draft: ProductDraft | null;
  errors: ImportRowError[];
};

export type ParseResult = {
  headerErrors: string[];
  rows: ParsedImportRow[];
};

const text = (value: unknown): string => String(value ?? "").trim();

/** Lê o CSV (separador , ou ;) e valida cada linha antes de qualquer gravação. */
export function parseImportCsv(content: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(content.trim(), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  const headers = (parsed.meta.fields ?? []).map((field) => field.trim().toLowerCase());
  const headerErrors: string[] = [];

  if (headers.length === 0) {
    headerErrors.push("Não foi possível ler o cabeçalho do arquivo.");
  }

  REQUIRED_CSV_COLUMNS.forEach((column) => {
    if (!headers.includes(column)) {
      headerErrors.push(`Coluna obrigatória ausente: "${column}".`);
    }
  });

  const unknownColumns = headers.filter(
    (header) => header && !(CSV_COLUMNS as readonly string[]).includes(header),
  );
  if (unknownColumns.length > 0) {
    headerErrors.push(
      `Colunas ignoradas por não existirem no cadastro: ${unknownColumns.join(", ")}.`,
    );
  }

  if (headerErrors.some((error) => error.startsWith("Coluna obrigatória"))) {
    return { headerErrors, rows: [] };
  }

  const rows = (parsed.data ?? []).map((raw, index) => {
    const line = index + 2; // linha 1 é o cabeçalho
    const errors: ImportRowError[] = [];
    const addError = (field: string, message: string) =>
      errors.push({ line, field, message });

    const name = text(raw.name);
    if (name.length < 2) addError("name", "Nome do produto é obrigatório.");

    const price = parseDecimal(raw.price);
    if (price === null || price <= 0) {
      addError("price", "Preço de venda deve ser um número maior que zero.");
    }

    const salePrice = raw.sale_price === undefined ? null : parseDecimal(raw.sale_price);
    if (salePrice !== null) {
      if (salePrice <= 0) {
        addError("sale_price", "Preço promocional deve ser maior que zero.");
      } else if (price !== null && salePrice >= price) {
        addError("sale_price", "Preço promocional deve ser menor que o preço de venda.");
      }
    }

    const costPrice = raw.cost_price === undefined ? null : parseDecimal(raw.cost_price);
    if (costPrice !== null && costPrice < 0) {
      addError("cost_price", "Custo não pode ser negativo.");
    }

    const stockValue = raw.stock === undefined || text(raw.stock) === "" ? 0 : Number(text(raw.stock));
    if (!Number.isFinite(stockValue) || stockValue < 0 || !Number.isInteger(stockValue)) {
      addError("stock", "Estoque deve ser um número inteiro maior ou igual a zero.");
    }

    const imageUrl = text(raw.image_url);
    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
      addError("image_url", "URL da imagem deve começar com http:// ou https://");
    }

    const weight = text(raw.weight);
    const flavor = text(raw.flavor);

    if (errors.length > 0) return { line, draft: null, errors };

    const specs: Record<string, string> = {};
    if (weight) specs["Peso líquido"] = weight;
    if (flavor) specs["Sabor"] = flavor;

    const draft: ProductDraft = {
      line,
      name,
      slug: slugify(name),
      brandName: text(raw.brand) || null,
      categoryName: text(raw.category) || null,
      description: text(raw.description) || null,
      shortDescription: text(raw.short_description) || null,
      specs,
      weight: weight || null,
      flavor: flavor || null,
      price: price as number,
      salePrice,
      costPrice,
      stock: Number.isFinite(stockValue) ? stockValue : 0,
      featured: parseBoolean(raw.featured, false),
      active: raw.active === undefined || text(raw.active) === "" ? true : parseBoolean(raw.active, true),
      imageUrl: imageUrl || null,
    };

    return { line, draft, errors: [] };
  });

  return { headerErrors, rows };
}

export type ImportContext = {
  categories: { id: string; name: string; slug: string }[];
  brands: { id: string; name: string; slug: string }[];
  products: { id: string; name: string; slug: string }[];
};

export type ImportOptions = {
  updateExisting: boolean;
  createMissingTaxonomy: boolean;
};

export type ImportPlanItem = {
  line: number;
  draft: ProductDraft;
  action: "create" | "update";
  existingProductId: string | null;
  brandId: string | null;
  categoryId: string | null;
};

export type ImportPreview = {
  totalRows: number;
  validRows: number;
  plan: ImportPlanItem[];
  errors: ImportRowError[];
  headerErrors: string[];
  createCount: number;
  updateCount: number;
  newCategories: string[];
  newBrands: string[];
};

const normalizeKey = (value: string | null): string =>
  (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/**
 * Monta o plano de importação: o que será criado, o que será atualizado e
 * quais linhas têm erro. Nada é gravado nesta etapa.
 */
export function buildImportPreview(
  parsed: ParseResult,
  context: ImportContext,
  options: ImportOptions,
): ImportPreview {
  const categoryByName = new Map(context.categories.map((item) => [normalizeKey(item.name), item]));
  const categoryBySlug = new Map(context.categories.map((item) => [item.slug, item]));
  const brandByName = new Map(context.brands.map((item) => [normalizeKey(item.name), item]));
  const brandBySlug = new Map(context.brands.map((item) => [item.slug, item]));
  const productsBySlug = new Map(context.products.map((item) => [item.slug, item]));

  const errors: ImportRowError[] = [];
  const plan: ImportPlanItem[] = [];
  const newCategories = new Set<string>();
  const newBrands = new Set<string>();
  const seenSlugs = new Set<string>();

  parsed.rows.forEach((row) => {
    if (!row.draft) {
      errors.push(...row.errors);
      return;
    }

    const draft = row.draft;
    let rowFailed = false;

    if (seenSlugs.has(draft.slug)) {
      errors.push({
        line: draft.line,
        field: "name",
        message: "O arquivo tem duas linhas com o mesmo produto.",
      });
      rowFailed = true;
    }
    seenSlugs.add(draft.slug);

    const existingProduct = productsBySlug.get(draft.slug) ?? null;

    if (existingProduct && !options.updateExisting) {
      errors.push({
        line: draft.line,
        field: "name",
        message: `Produto já cadastrado com o slug "${draft.slug}". Marque "Atualizar produtos existentes" para sobrescrever.`,
      });
      rowFailed = true;
    }

    let categoryId: string | null = null;
    if (draft.categoryName) {
      const found =
        categoryByName.get(normalizeKey(draft.categoryName)) ??
        categoryBySlug.get(slugify(draft.categoryName));
      if (found) {
        categoryId = found.id;
      } else if (options.createMissingTaxonomy) {
        newCategories.add(draft.categoryName);
      } else {
        errors.push({
          line: draft.line,
          field: "category",
          message: `Categoria "${draft.categoryName}" não existe. Ative "Criar categorias e marcas inexistentes" ou cadastre antes.`,
        });
        rowFailed = true;
      }
    }

    let brandId: string | null = null;
    if (draft.brandName) {
      const found =
        brandByName.get(normalizeKey(draft.brandName)) ??
        brandBySlug.get(slugify(draft.brandName));
      if (found) {
        brandId = found.id;
      } else if (options.createMissingTaxonomy) {
        newBrands.add(draft.brandName);
      } else {
        errors.push({
          line: draft.line,
          field: "brand",
          message: `Marca "${draft.brandName}" não existe. Ative "Criar categorias e marcas inexistentes" ou cadastre antes.`,
        });
        rowFailed = true;
      }
    }

    if (rowFailed) return;

    plan.push({
      line: draft.line,
      draft,
      action: existingProduct ? "update" : "create",
      existingProductId: existingProduct?.id ?? null,
      brandId,
      categoryId,
    });
  });

  return {
    totalRows: parsed.rows.length,
    validRows: plan.length,
    plan,
    errors,
    headerErrors: parsed.headerErrors,
    createCount: plan.filter((item) => item.action === "create").length,
    updateCount: plan.filter((item) => item.action === "update").length,
    newCategories: [...newCategories].sort(),
    newBrands: [...newBrands].sort(),
  };
}

export type ImportReport = {
  created: number;
  updated: number
  failures: { line: number; message: string }[];
  createdCategories: number;
  createdBrands: number;
};

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function toInsert(
  item: ImportPlanItem,
  brandId: string | null,
  categoryId: string | null,
): ProductInsert {
  return {
    name: item.draft.name,
    slug: item.draft.slug,
    brand_id: brandId,
    category_id: categoryId,
    description: item.draft.description,
    short_description: item.draft.shortDescription,
    specs: item.draft.specs,
    weight: item.draft.weight,
    flavor: item.draft.flavor,
    price: item.draft.price,
    sale_price: item.draft.salePrice,
    cost_price: item.draft.costPrice,
    image_url: item.draft.imageUrl,
    stock: item.draft.stock,
    featured: item.draft.featured,
    active: item.draft.active,
    is_demo: false,
  };
}

/** Cria categorias/marcas que faltam e grava os produtos em lotes. */
export async function runImport(
  preview: ImportPreview,
  options: ImportOptions,
): Promise<ImportReport> {
  const categoryIdByName = new Map<string, string>();
  const brandIdByName = new Map<string, string>();

  const [existingCategories, existingBrands] = await Promise.all([
    listAdminCategories(),
    listAdminBrands(),
  ]);

  existingCategories.forEach((category) =>
    categoryIdByName.set(normalizeKey(category.name), category.id),
  );
  existingBrands.forEach((brand) => brandIdByName.set(normalizeKey(brand.name), brand.id));

  let createdCategories = 0;
  let createdBrands = 0;

  if (options.createMissingTaxonomy) {
    const takenCategorySlugs = new Set(existingCategories.map((item) => item.slug));
    for (const name of preview.newCategories) {
      const created = await createCategory({
        name,
        slug: uniqueSlug(name, takenCategorySlugs),
        active: true,
      });
      categoryIdByName.set(normalizeKey(name), created.id);
      createdCategories += 1;
    }

    const takenBrandSlugs = new Set(existingBrands.map((item) => item.slug));
    for (const name of preview.newBrands) {
      const created = await createBrand({
        name,
        slug: uniqueSlug(name, takenBrandSlugs),
        active: true,
      });
      brandIdByName.set(normalizeKey(name), created.id);
      createdBrands += 1;
    }
  }

  const failures: { line: number; message: string }[] = [];
  let created = 0;
  let updated = 0;

  const toCreate: { item: ImportPlanItem; payload: ProductInsert }[] = [];

  for (const item of preview.plan) {
    const brandId = item.draft.brandName
      ? (brandIdByName.get(normalizeKey(item.draft.brandName)) ?? null)
      : null;
    const categoryId = item.draft.categoryName
      ? (categoryIdByName.get(normalizeKey(item.draft.categoryName)) ?? null)
      : null;

    if (item.action === "update" && item.existingProductId) {
      try {
        await updateProduct(item.existingProductId, toInsert(item, brandId, categoryId));
        updated += 1;
      } catch (error) {
        failures.push({
          line: item.line,
          message: error instanceof Error ? error.message : "Falha ao atualizar linha.",
        });
      }
    } else {
      toCreate.push({ item, payload: toInsert(item, brandId, categoryId) });
    }
  }

  // Insere em lotes: menos requisições e erro isolado por lote.
  for (const batch of chunk(toCreate, 50)) {
    try {
      await Promise.all(batch.map((entry) => createProduct(entry.payload)));
      created += batch.length;
    } catch (error) {
      // Em caso de erro no lote, tentamos linha por linha para isolar a falha.
      for (const entry of batch) {
        try {
          await createProduct(entry.payload);
          created += 1;
        } catch (lineError) {
          failures.push({
            line: entry.item.line,
            message:
              lineError instanceof Error ? lineError.message : "Falha ao gravar linha.",
          });
        }
      }
    }
  }

  return { created, updated, failures, createdCategories, createdBrands };
}

export type { ProductRow };
