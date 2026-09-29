import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { CatalogToolbar } from "@/components/catalog/catalog-toolbar";
import { ProductGrid } from "@/components/catalog/product-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { STORE } from "@/config/store";
import { useAddToQuote } from "@/hooks/use-add-to-quote";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useSeo } from "@/hooks/use-seo";
import {
  CATALOG_PAGE_SIZE,
  listBrands,
  listCategories,
  listProducts,
} from "@/services/catalog";
import { isSortOption, type SortOption } from "@/types/catalog";

const Catalogo = () => {
  const addToQuote = useAddToQuote();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlSearch = searchParams.get("q") ?? "";
  const categorySlug = searchParams.get("cat") ?? "";
  const brandSlug = searchParams.get("marca") ?? "";
  const sortParam = searchParams.get("ordem");
  const sort: SortOption = isSortOption(sortParam) ? sortParam : "relevance";

  const [term, setTerm] = useState(urlSearch);
  const debouncedTerm = useDebouncedValue(term, 400);
  const lastWrittenTerm = useRef(urlSearch);
  const [pagesLoaded, setPagesLoaded] = useState(1);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: listBrands,
  });

  // Mantém o campo de busca em sincronia quando a URL muda por fora (ex.: busca do header).
  useEffect(() => {
    if (urlSearch !== lastWrittenTerm.current) {
      lastWrittenTerm.current = urlSearch;
      setTerm(urlSearch);
      setPagesLoaded(1);
    }
  }, [urlSearch]);

  // Digitação -> URL (com atraso, evitando uma requisição por tecla).
  useEffect(() => {
    if (debouncedTerm === lastWrittenTerm.current) return;
    lastWrittenTerm.current = debouncedTerm;

    const next = new URLSearchParams(searchParams);
    if (debouncedTerm.trim()) {
      next.set("q", debouncedTerm);
    } else {
      next.delete("q");
    }
    setSearchParams(next, { replace: true });
    setPagesLoaded(1);
  }, [debouncedTerm, searchParams, setSearchParams]);

  const pageSize = CATALOG_PAGE_SIZE * pagesLoaded;

  const { data, isLoading } = useQuery({
    queryKey: ["catalog", urlSearch, categorySlug, brandSlug, sort, pageSize],
    queryFn: () =>
      listProducts({
        search: urlSearch,
        categorySlug,
        brandSlug,
        sort,
        page: 1,
        pageSize,
      }),
    placeholderData: keepPreviousData,
  });

  const products = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasMore = products.length < total;

  const updateFilters = (next: { cat?: string; marca?: string }) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    setSearchParams(params, { replace: true });
    setPagesLoaded(1);
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("cat");
    params.delete("marca");
    setSearchParams(params, { replace: true });
    setPagesLoaded(1);
  };

  const changeSort = (value: SortOption) => {
    const params = new URLSearchParams(searchParams);
    if (value === "relevance") params.delete("ordem");
    else params.set("ordem", value);
    setSearchParams(params, { replace: true });
    setPagesLoaded(1);
  };

  const heading = useMemo(() => {
    const category = categories.find((item) => item.slug === categorySlug);
    if (category) return category.name;
    if (urlSearch.trim()) return `Resultados para "${urlSearch.trim()}"`;
    return "Catálogo completo";
  }, [categories, categorySlug, urlSearch]);

  useSeo({
    title:
      `${heading} | ${STORE.logoTop} ${STORE.logoBottom} — ${STORE.locationLabel}`,
    description: `Produtos de ${heading.toLowerCase()} com preço, marcas e disponibilidade. Adicione ao orçamento e finalize pelo WhatsApp em ${STORE.locationLabel}.`,
    path: "/catalogo",
  });

  return (
    <PageShell>
      <div className="border-b border-border bg-gradient-soft">
        <div className="container py-8">
          <nav aria-label="Você está aqui" className="mb-3 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              Início
            </Link>
            <span className="px-2">/</span>
            <span className="text-foreground">Catálogo</span>
          </nav>
          <h1 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            {heading}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Escolha os produtos, adicione ao orçamento e envie tudo de uma vez pelo WhatsApp.
            Sem cadastro e sem pagamento online.
          </p>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
          <CatalogFilters
            categories={categories}
            brands={brands}
            categorySlug={categorySlug}
            brandSlug={brandSlug}
            onChange={updateFilters}
            onClear={clearFilters}
          />

          <div className="space-y-5">
            <CatalogToolbar
              search={term}
              onSearchChange={setTerm}
              sort={sort}
              onSortChange={changeSort}
              total={total}
              loading={isLoading}
            />

            <ProductGrid
              products={products}
              onAdd={addToQuote}
              loading={isLoading}
              emptyTitle="Nenhum produto encontrado"
              emptyDescription="Ajuste a busca ou remova os filtros para ver mais opções."
            />

            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="xl"
                  onClick={() => setPagesLoaded((current) => current + 1)}
                >
                  Carregar mais produtos
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default Catalogo;
