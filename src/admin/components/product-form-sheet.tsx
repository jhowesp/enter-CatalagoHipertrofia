import { useEffect, useMemo, useState } from "react";
import { History, Loader2, Plus, Save, X } from "lucide-react";
import { toast } from "sonner";

import { ProductImageGallery } from "@/admin/components/product-image-gallery";
import {
  ProductVariantEditor,
  type VariantDraftRow,
} from "@/admin/components/product-variant-editor";
import { clearDraft, draftKeyFor, readDraft, writeDraft } from "@/admin/lib/form-draft";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { STORE } from "@/config/store";
import { formatCurrency, formatDateTime, parseDecimal } from "@/lib/format";
import { slugify } from "@/lib/slug";
import {
  createProduct,
  listAdminVariants,
  saveProductVariants,
  updateProduct,
  type VariantInput,
} from "@/services/admin";
import type {
  BrandRow,
  CategoryRow,
  ProductInsert,
  ProductRow,
  ProductVariantRow,
} from "@/types/catalog";

type SpecRow = { key: string; value: string };

type FormState = {
  name: string;
  slug: string;
  slugTouched: boolean;
  brandId: string;
  categoryId: string;
  price: string;
  salePrice: string;
  costPrice: string;
  stock: string;
  shortDescription: string;
  description: string;
  weight: string;
  flavor: string;
  specs: SpecRow[];
  featured: boolean;
  active: boolean;
  images: string[];
  variants: VariantDraftRow[];
};

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  slugTouched: false,
  brandId: "",
  categoryId: "",
  price: "",
  salePrice: "",
  costPrice: "",
  stock: "0",
  shortDescription: "",
  description: "",
  weight: "",
  flavor: "",
  specs: [],
  featured: false,
  active: true,
  images: [],
  variants: [],
};

function formFromProduct(product: ProductRow, variants: ProductVariantRow[]): FormState {
  const specs =
    product.specs && typeof product.specs === "object" && !Array.isArray(product.specs)
      ? Object.entries(product.specs as Record<string, unknown>).map(([key, value]) => ({
          key,
          value: value === null || value === undefined ? "" : String(value),
        }))
      : [];

  return {
    name: product.name,
    slug: product.slug,
    slugTouched: true,
    brandId: product.brand_id ?? "",
    categoryId: product.category_id ?? "",
    price: String(product.price ?? ""),
    salePrice: product.sale_price === null ? "" : String(product.sale_price),
    costPrice: product.cost_price === null ? "" : String(product.cost_price),
    stock: String(product.stock ?? 0),
    shortDescription: product.short_description ?? "",
    description: product.description ?? "",
    weight: product.weight ?? "",
    flavor: product.flavor ?? "",
    specs,
    featured: product.featured,
    active: product.active,
    images:
      product.images && product.images.length > 0
        ? product.images
        : product.image_url
          ? [product.image_url]
          : [],
    variants: variants.map((variant) => ({
      flavor: variant.flavor,
      price: variant.price === null ? "" : String(variant.price),
      salePrice: variant.sale_price === null ? "" : String(variant.sale_price),
      stock: String(variant.stock),
      active: variant.active,
    })),
  };
}

type ProductFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductRow | null;
  categories: CategoryRow[];
  brands: BrandRow[];
  onSaved: () => void;
};

export function ProductFormSheet({
  open,
  onOpenChange,
  product,
  categories,
  brands,
  onSaved,
}: ProductFormSheetProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [restoredAt, setRestoredAt] = useState<number | null>(null);

  const draftKey = draftKeyFor(product?.id ?? null);

  /** Ao abrir: recupera o rascunho salvo; se não houver, carrega do banco. */
  useEffect(() => {
    if (!open) return;

    let active = true;
    setErrors({});

    const draft = readDraft<FormState>(draftKey);

    if (draft?.value) {
      setForm({ ...EMPTY_FORM, ...draft.value });
      setRestoredAt(draft.savedAt);
      return () => {
        active = false;
      };
    }

    setRestoredAt(null);

    if (!product) {
      setForm(EMPTY_FORM);
      return () => {
        active = false;
      };
    }

    void listAdminVariants(product.id)
      .then((variants) => {
        if (active) setForm(formFromProduct(product, variants));
      })
      .catch(() => {
        if (active) setForm(formFromProduct(product, []));
      });

    return () => {
      active = false;
    };
  }, [open, product, draftKey]);

  /**
   * Salva o rascunho continuamente. É o que evita perder o cadastro ao trocar de
   * aba (o preview recarrega e o estado do React se perde).
   */
  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => writeDraft(draftKey, form), 600);
    return () => window.clearTimeout(timer);
  }, [open, form, draftKey]);

  const discardDraft = () => {
    clearDraft(draftKey);
    setRestoredAt(null);
    setErrors({});

    if (!product) {
      setForm(EMPTY_FORM);
      return;
    }

    void listAdminVariants(product.id)
      .then((variants) => setForm(formFromProduct(product, variants)))
      .catch(() => setForm(formFromProduct(product, [])));
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleNameChange = (value: string) => {
    setForm((current) => ({
      ...current,
      name: value,
      slug: current.slugTouched ? current.slug : slugify(value),
    }));
  };

  const margin = useMemo(() => {
    const price = parseDecimal(form.price) ?? 0;
    const salePrice = parseDecimal(form.salePrice);
    const cost = parseDecimal(form.costPrice);
    const effective = salePrice && salePrice > 0 && salePrice < price ? salePrice : price;

    if (cost === null || effective <= 0) return null;

    return {
      effective,
      profit: effective - cost,
      percent: ((effective - cost) / effective) * 100,
    };
  }, [form.price, form.salePrice, form.costPrice]);

  const validate = (): ProductInsert | null => {
    const nextErrors: Record<string, string> = {};

    const name = form.name.trim();
    if (name.length < 2) nextErrors.name = "Informe o nome do produto.";

    const slug = slugify(form.slug || name);
    if (!slug) nextErrors.slug = "Informe o endereço (slug) do produto.";

    const price = parseDecimal(form.price);
    if (price === null || price <= 0) {
      nextErrors.price = "Preço de venda deve ser maior que zero.";
    }

    const salePrice = form.salePrice.trim() ? parseDecimal(form.salePrice) : null;
    if (salePrice !== null) {
      if (salePrice <= 0) nextErrors.salePrice = "Preço promocional deve ser maior que zero.";
      else if (price !== null && salePrice >= price) {
        nextErrors.salePrice = "Preço promocional precisa ser menor que o preço de venda.";
      }
    }

    const costPrice = form.costPrice.trim() ? parseDecimal(form.costPrice) : null;
    if (costPrice !== null && costPrice < 0) {
      nextErrors.costPrice = "Custo não pode ser negativo.";
    }

    const stock = Number(form.stock.trim() === "" ? "0" : form.stock.trim());
    if (!Number.isInteger(stock) || stock < 0) {
      nextErrors.stock = "Estoque deve ser um número inteiro igual ou maior que zero.";
    }

    const variantInputs: VariantInput[] = [];
    const seenFlavors = new Set<string>();

    form.variants.forEach((row, index) => {
      const flavor = row.flavor.trim();
      const variantPrice = row.price.trim() ? parseDecimal(row.price) : null;
      const variantSale = row.salePrice.trim() ? parseDecimal(row.salePrice) : null;
      const variantStock = Number(row.stock.trim() === "" ? "0" : row.stock.trim());

      if (!flavor) {
        nextErrors[`variant-${index}`] = `Sabor do item ${index + 1} está em branco.`;
        return;
      }
      if (seenFlavors.has(flavor.toLowerCase())) {
        nextErrors[`variant-${index}`] = `O sabor "${flavor}" está repetido na lista.`;
        return;
      }
      if (variantPrice !== null && variantPrice <= 0) {
        nextErrors[`variant-${index}`] = `Preço próprio do sabor "${flavor}" deve ser maior que zero.`;
        return;
      }
      if (
        variantSale !== null &&
        (variantSale <= 0 || (variantPrice !== null && variantSale >= variantPrice))
      ) {
        nextErrors[`variant-${index}`] =
          `Promocional do sabor "${flavor}" deve ser maior que zero e menor que o preço próprio.`;
        return;
      }
      if (!Number.isInteger(variantStock) || variantStock < 0) {
        nextErrors[`variant-${index}`] =
          `Estoque do sabor "${flavor}" deve ser um número inteiro maior ou igual a zero.`;
        return;
      }

      seenFlavors.add(flavor.toLowerCase());
      variantInputs.push({
        flavor,
        price: variantPrice,
        salePrice: variantSale,
        stock: variantStock,
        active: row.active,
      });
    });

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return null;

    const specs = form.specs.reduce<Record<string, string>>((acc, spec) => {
      const key = spec.key.trim();
      const value = spec.value.trim();
      if (key && value) acc[key] = value;
      return acc;
    }, {});

    return {
      payload: {
        name,
        slug,
        brand_id: form.brandId || null,
        category_id: form.categoryId || null,
        description: form.description.trim() || null,
        short_description: form.shortDescription.trim() || null,
        specs,
        weight: form.weight.trim() || null,
        flavor: form.flavor.trim() || null,
        price: price as number,
        sale_price: salePrice,
        cost_price: costPrice,
        image_url: form.images[0] ?? null,
        images: form.images,
        stock,
        featured: form.featured,
        active: form.active,
        is_demo: false,
      } satisfies ProductInsert,
      variants: variantInputs,
    };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = validate();
    if (!result) {
      toast.error("Confira os campos destacados antes de salvar.");
      return;
    }

    setSaving(true);
    try {
      const saved = product
        ? await updateProduct(product.id, result.payload)
        : await createProduct(result.payload);

      await saveProductVariants(saved.id, result.variants);

      clearDraft(draftKey);
      toast.success(product ? "Produto atualizado." : "Produto cadastrado.");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao salvar o produto.";
      toast.error(
        message.includes("duplicate")
          ? "Já existe um produto com este endereço (slug) ou um sabor repetido."
          : message,
      );
    } finally {
      setSaving(false);
    }
  };

  const variantErrors = Object.entries(errors)
    .filter(([key]) => key.startsWith("variant-"))
    .map(([, message]) => message);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto border-border bg-background p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="font-display text-xl uppercase tracking-tight">
            {product ? "Editar produto" : "Novo produto"}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Custo e margem são informações internas: nunca aparecem no catálogo público.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 px-5 py-5">
          {restoredAt && (
            <Alert>
              <History />
              <AlertTitle>Rascunho recuperado</AlertTitle>
              <AlertDescription className="space-y-2">
                <span className="block">
                  Restaurei o que você já tinha preenchido (salvo em{" "}
                  {formatDateTime(restoredAt)}). Pode continuar de onde parou.
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs underline"
                  onClick={discardDraft}
                  disabled={saving}
                >
                  Descartar rascunho e começar do zero
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="product-name">Nome *</Label>
              <Input
                id="product-name"
                value={form.name}
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder="Whey Protein Concentrado 900g"
                className="h-11"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="product-slug">Endereço na URL (slug)</Label>
              <Input
                id="product-slug"
                value={form.slug}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    slug: slugify(event.target.value),
                    slugTouched: true,
                  }))
                }
                placeholder="whey-protein-concentrado-900g"
                className="h-11"
              />
              <p className="text-[11px] text-muted-foreground">
                /produto/{form.slug || "endereco-do-produto"}
              </p>
              {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={form.categoryId || "none"}
                onValueChange={(value) => update("categoryId", value === "none" ? "" : value)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Marca</Label>
              <Select
                value={form.brandId || "none"}
                onValueChange={(value) => update("brandId", value === "none" ? "" : value)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem marca</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-price">Preço de venda (R$) *</Label>
              <Input
                id="product-price"
                value={form.price}
                onChange={(event) => update("price", event.target.value)}
                placeholder="189,90"
                inputMode="decimal"
                className="h-11"
              />
              {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-sale">Preço promocional (R$)</Label>
              <Input
                id="product-sale"
                value={form.salePrice}
                onChange={(event) => update("salePrice", event.target.value)}
                placeholder="159,90"
                inputMode="decimal"
                className="h-11"
              />
              {errors.salePrice && (
                <p className="text-xs text-destructive">{errors.salePrice}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-cost">Custo (R$) — interno</Label>
              <Input
                id="product-cost"
                value={form.costPrice}
                onChange={(event) => update("costPrice", event.target.value)}
                placeholder="118,00"
                inputMode="decimal"
                className="h-11"
              />
              {errors.costPrice && (
                <p className="text-xs text-destructive">{errors.costPrice}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-stock">Estoque</Label>
              <Input
                id="product-stock"
                value={form.stock}
                onChange={(event) => update("stock", event.target.value)}
                inputMode="numeric"
                className="h-11"
              />
              {errors.stock && <p className="text-xs text-destructive">{errors.stock}</p>}
            </div>

            <div className="rounded-lg border border-border bg-secondary/40 px-4 py-3 sm:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Margem (uso interno)
              </p>
              {margin ? (
                <p className="mt-1 text-sm text-foreground">
                  Preço praticado {formatCurrency(margin.effective)} • lucro bruto{" "}
                  <span className="font-semibold">
                    {formatCurrency(margin.profit)}
                  </span>{" "}
                  • margem{" "}
                  <span
                    className={
                      margin.percent >= 0 ? "text-success" : "text-destructive"
                    }
                  >
                    {margin.percent.toFixed(1)}%
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Informe preço e custo para calcular a margem.
                </p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="product-short">Descrição curta (aparece no card)</Label>
              <Input
                id="product-short"
                value={form.shortDescription}
                onChange={(event) => update("shortDescription", event.target.value)}
                placeholder="Proteína concentrada com 24 g de proteína por dose."
                className="h-11"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="product-description">Descrição completa</Label>
              <Textarea
                id="product-description"
                rows={4}
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="Detalhe o produto, indicações de uso e diferenciais."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-weight">Peso / volume</Label>
              <Input
                id="product-weight"
                value={form.weight}
                onChange={(event) => update("weight", event.target.value)}
                placeholder="900 g"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-flavor">Sabor (produto de sabor único)</Label>
              <Input
                id="product-flavor"
                value={form.flavor}
                onChange={(event) => update("flavor", event.target.value)}
                placeholder="Baunilha"
                className="h-11"
              />
            </div>

            <div className="sm:col-span-2">
              <ProductVariantEditor
                rows={form.variants}
                onChange={(rows) => update("variants", rows)}
                productPrice={form.price}
                disabled={saving}
              />

              {variantErrors.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {variantErrors.map((message) => (
                    <li key={message} className="text-xs text-destructive">
                      {message}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label>Informações do produto (chave e valor)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    update("specs", [...form.specs, { key: "", value: "" }])
                  }
                >
                  <Plus />
                  Adicionar
                </Button>
              </div>

              {form.specs.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Exemplos: Porções = 30 doses • Proteína por dose = 24 g.
                </p>
              )}

              {form.specs.map((spec, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={spec.key}
                    placeholder="Porções"
                    aria-label={`Nome do item ${index + 1}`}
                    onChange={(event) => {
                      const next = [...form.specs];
                      next[index] = { ...next[index], key: event.target.value };
                      update("specs", next);
                    }}
                  />
                  <Input
                    value={spec.value}
                    placeholder="30 doses"
                    aria-label={`Valor do item ${index + 1}`}
                    onChange={(event) => {
                      const next = [...form.specs];
                      next[index] = { ...next[index], value: event.target.value };
                      update("specs", next);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover item ${index + 1}`}
                    onClick={() =>
                      update(
                        "specs",
                        form.specs.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    <X />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-3 sm:col-span-2">
              <Label>Fotos do produto</Label>
              <ProductImageGallery
                value={form.images}
                onChange={(urls) => update("images", urls)}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-4 py-3">
              <div>
                <p className="text-sm text-foreground">Destaque na home</p>
                <p className="text-[11px] text-muted-foreground">
                  Aparece em "Mais vendidos".
                </p>
              </div>
              <Switch
                checked={form.featured}
                onCheckedChange={(checked) => update("featured", checked)}
                aria-label="Marcar como destaque"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-4 py-3">
              <div>
                <p className="text-sm text-foreground">Produto ativo</p>
                <p className="text-[11px] text-muted-foreground">
                  Inativo sai do catálogo público.
                </p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(checked) => update("active", checked)}
                aria-label="Ativar produto"
              />
            </div>

            {Number(form.stock || 0) <= STORE.lowStockThreshold && (
              <p className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-xs text-warning sm:col-span-2">
                Estoque igual ou abaixo de {STORE.lowStockThreshold} unidades: o produto
                aparece no aviso de estoque baixo do dashboard.
              </p>
            )}
          </div>

          <div className="sticky bottom-0 -mx-5 flex gap-3 border-t border-border bg-background px-5 py-4">
            <Button type="submit" variant="brand" size="lg" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              {product ? "Salvar alterações" : "Cadastrar produto"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            {product?.is_demo && (
              <span className="ml-auto self-center text-[11px] text-muted-foreground">
                Este item é de demonstração e deixa de ser após ser salvo.
              </span>
            )}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
