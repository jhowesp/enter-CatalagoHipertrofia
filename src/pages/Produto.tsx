import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Check, MessageCircle, PackageX, ShoppingCart, Tag } from "lucide-react";

import { ProductGrid } from "@/components/catalog/product-grid";
import { DiscountBadge } from "@/components/catalog/discount-badge";
import { PriceBlock } from "@/components/catalog/price-block";
import { ProductImage } from "@/components/catalog/product-image";
import { QuantityStepper } from "@/components/catalog/quantity-stepper";
import { SectionHeading } from "@/components/home/section-heading";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { QUOTE_NOTICE, STORE } from "@/config/store";
import { useAddToQuote } from "@/hooks/use-add-to-quote";
import { useSeo } from "@/hooks/use-seo";
import { formatCurrency, inventoryLabel } from "@/lib/format";
import { buildProductMessage, whatsappUrl } from "@/lib/whatsapp";
import { getProductBySlug, listRelatedProducts } from "@/services/catalog";
import { cn } from "@/lib/utils";

const Produto = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const addToQuote = useAddToQuote();
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => getProductBySlug(slug),
    enabled: Boolean(slug),
  });

  const { data: related = [] } = useQuery({
    queryKey: ["related", product?.id, product?.categorySlug],
    queryFn: () => listRelatedProducts(product!, 4),
    enabled: Boolean(product?.id),
  });

  useEffect(() => {
    setQuantity(1);
    setImageIndex(0);
  }, [slug]);

  const productJsonLd = useMemo(() => {
    if (!product) return null;
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.shortDescription ?? product.description ?? undefined,
      sku: product.slug,
      category: product.categoryName ?? undefined,
      brand: product.brandName
        ? { "@type": "Brand", name: product.brandName }
        : undefined,
      image: product.imageUrl ?? undefined,
      offers: {
        "@type": "Offer",
        priceCurrency: "BRL",
        price: product.effectivePrice.toFixed(2),
        availability:
          product.stock > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/PreOrder",
        url: `${window.location.origin}/produto/${product.slug}`,
      },
    };
  }, [product]);

  useSeo({
    title: product
      ? `${product.name}${product.brandName ? ` — ${product.brandName}` : ""} | ${STORE.logoTop} ${STORE.logoBottom}`
      : `Produto | ${STORE.logoTop} ${STORE.logoBottom}`,
    description: product
      ? `${product.shortDescription ?? product.name} por ${formatCurrency(product.effectivePrice)} em ${STORE.locationLabel}. Adicione ao orçamento e finalize pelo WhatsApp.`
      : undefined,
    image: product?.imageUrl ?? undefined,
    path: `/produto/${slug}`,
    jsonLd: productJsonLd,
    noindex: !isLoading && !product,
  });

  if (isLoading) {
    return (
      <PageShell>
        <div className="container py-16">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="aspect-square w-full animate-pulse rounded-2xl border border-border bg-card" />
            <div className="space-y-4">
              <div className="h-4 w-24 animate-pulse rounded bg-card" />
              <div className="h-10 w-3/4 animate-pulse rounded bg-card" />
              <div className="h-8 w-32 animate-pulse rounded bg-card" />
              <div className="h-24 w-full animate-pulse rounded bg-card" />
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!product) {
    return (
      <PageShell>
        <div className="container flex flex-col items-center gap-4 py-20 text-center">
          <PackageX className="h-12 w-12 text-muted-foreground" aria-hidden />
          <h1 className="font-display text-3xl tracking-tight text-foreground">
            Produto não encontrado
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Este produto não está disponível no catálogo. Ele pode ter sido desativado ou o
            endereço está incorreto.
          </p>
          <Button variant="brand" size="xl" asChild>
            <Link to="/catalogo">Voltar ao catálogo</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const specs = Object.entries(product.specs);
  const subtotal = quantity * product.effectivePrice;
  const gallery = product.images;
  const activeImage = gallery[imageIndex] ?? product.imageUrl;

  return (
    <PageShell>
      <div className="container py-8">
        <nav aria-label="Você está aqui" className="mb-5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Início
          </Link>
          <span className="px-2">/</span>
          <Link to="/catalogo" className="hover:text-foreground">
            Catálogo
          </Link>
          {product.categorySlug && (
            <>
              <span className="px-2">/</span>
              <Link
                to={`/catalogo?cat=${product.categorySlug}`}
                className="hover:text-foreground"
              >
                {product.categoryName}
              </Link>
            </>
          )}
          <span className="px-2">/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-[radial-gradient(circle_at_50%_12%,hsl(0_0%_16%),hsl(0_0%_6%))] p-6">
              <div className="aspect-square w-full">
                <ProductImage src={activeImage} alt={product.name} priority />
              </div>
              {product.discountPercent > 0 && (
                <DiscountBadge
                  percent={product.discountPercent}
                  className="absolute left-5 top-5"
                />
              )}
            </div>

            {gallery.length > 1 && (
              <ul className="grid grid-cols-5 gap-2">
                {gallery.map((url, index) => (
                  <li key={url}>
                    <button
                      type="button"
                      onClick={() => setImageIndex(index)}
                      aria-pressed={index === imageIndex}
                      aria-label={`Ver foto ${index + 1} de ${gallery.length}`}
                      className={cn(
                        "aspect-square w-full overflow-hidden rounded-lg border bg-[radial-gradient(circle_at_50%_15%,hsl(0_0%_16%),hsl(0_0%_6%))] p-1.5 transition-colors",
                        index === imageIndex
                          ? "border-primary"
                          : "border-border hover:border-primary/60",
                      )}
                    >
                      <img
                        src={url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              {product.brandName && (
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  {product.brandName}
                </p>
              )}
              <h1 className="font-display text-3xl leading-tight tracking-tight text-foreground sm:text-4xl">
                {product.name}
              </h1>
              {product.shortDescription && (
                <p className="text-sm text-muted-foreground">{product.shortDescription}</p>
              )}
            </div>

            <div className="space-y-2 rounded-xl border border-border bg-card p-4 surface-card">
              <PriceBlock product={product} size="lg" />
              {product.salePrice !== null && product.discountPercent > 0 && (
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Economia de {formatCurrency(product.price - product.effectivePrice)} no
                  preço promocional
                </p>
              )}
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Boxes className="h-4 w-4 text-primary" aria-hidden />
                {inventoryLabel(product.stock, STORE.lowStockThreshold)}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Quantidade
                  </span>
                  <QuantityStepper
                    value={quantity}
                    onChange={setQuantity}
                    size="lg"
                    max={Math.max(1, product.stock)}
                    ariaLabel="Quantidade"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Subtotal
                  </span>
                  <span className="font-display text-2xl text-foreground">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant="brand"
                  size="xl"
                  onClick={() => addToQuote(product, quantity, { openDrawer: true })}
                >
                  <ShoppingCart />
                  Adicionar ao orçamento
                </Button>
                <Button variant="whatsapp" size="xl" asChild>
                  <a
                    href={whatsappUrl(
                      buildProductMessage({
                        name: product.name,
                        brandName: product.brandName,
                        quantity,
                        unitPrice: product.effectivePrice,
                      }),
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle />
                    Comprar pelo WhatsApp
                  </a>
                </Button>
              </div>

              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {QUOTE_NOTICE}
              </p>
            </div>

            {(specs.length > 0 || product.weight || product.flavor) && (
              <section className="space-y-3 rounded-xl border border-border bg-card p-4">
                <h2 className="flex items-center gap-2 font-display text-base tracking-tight text-foreground">
                  <Tag className="h-4 w-4 text-primary" aria-hidden />
                  Informações do produto
                </h2>
                <dl className="grid gap-2 sm:grid-cols-2">
                  {product.brandName && (
                    <div className="rounded-lg bg-secondary/50 px-3 py-2">
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Marca
                      </dt>
                      <dd className="text-sm text-foreground">{product.brandName}</dd>
                    </div>
                  )}
                  {product.categoryName && (
                    <div className="rounded-lg bg-secondary/50 px-3 py-2">
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Categoria
                      </dt>
                      <dd className="text-sm text-foreground">{product.categoryName}</dd>
                    </div>
                  )}
                  {specs.map(([key, value]) => (
                    <div key={key} className="rounded-lg bg-secondary/50 px-3 py-2">
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {key}
                      </dt>
                      <dd className="text-sm text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {product.description && (
              <section className="space-y-2">
                <h2 className="font-display text-base tracking-tight text-foreground">
                  Descrição
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              </section>
            )}

            <ul className="grid gap-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" aria-hidden />
                Orçamento enviado direto para o WhatsApp da loja
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" aria-hidden />
                Retirada em {STORE.locationLabel} • {STORE.openingDays}, {STORE.openingHours}
              </li>
            </ul>
          </div>
        </div>

        {related.length > 0 && (
          <section className="pt-14">
            <SectionHeading
              title="Produtos relacionados"
              href={
                product.categorySlug ? `/catalogo?cat=${product.categorySlug}` : "/catalogo"
              }
              linkLabel="Ver categoria"
            />
            <ProductGrid products={related} onAdd={addToQuote} />
          </section>
        )}
      </div>
    </PageShell>
  );
};

export default Produto;
