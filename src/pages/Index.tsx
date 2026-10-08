import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { CategoryGrid } from "@/components/home/category-grid";
import { BrandStrip } from "@/components/home/brand-strip";
import { Hero } from "@/components/home/hero";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { ProductRail } from "@/components/home/product-rail";
import { SectionHeading } from "@/components/home/section-heading";
import { WhatsappCtaBand } from "@/components/home/whatsapp-cta-band";
import { PageShell } from "@/components/layout/page-shell";
import { INSTAGRAM_URL, STORE } from "@/config/store";
import { useAddToQuote } from "@/hooks/use-add-to-quote";
import { useSeo } from "@/hooks/use-seo";
import {
  listBrands,
  listCategories,
  listFeaturedProducts,
  listOfferProducts,
} from "@/services/catalog";
import { listActiveBanners } from "@/services/banners";

const Home = () => {
  const addToQuote = useAddToQuote();

  const { data: featured = [], isLoading: loadingFeatured } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => listFeaturedProducts(8),
  });

  const { data: offers = [], isLoading: loadingOffers } = useQuery({
    queryKey: ["products", "offers"],
    queryFn: () => listOfferProducts(4),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: listBrands,
  });

  // Carrossel de banners quando houver campanha ativa; senão, o banner fixo da marca.
  const { data: banners = [] } = useQuery({
    queryKey: ["banners", "active"],
    queryFn: listActiveBanners,
  });

  const storeJsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "Store",
      name: STORE.name,
      description: STORE.description,
      telephone: `+${STORE.whatsappNumber}`,
      address: {
        "@type": "PostalAddress",
        addressLocality: STORE.city,
        addressRegion: STORE.state,
        addressCountry: "BR",
      },
      openingHours: STORE.openingHours,
      sameAs: [INSTAGRAM_URL],
    }),
    [],
  );

  useSeo({
    title: `${STORE.logoTop.toUpperCase()} ${STORE.logoBottom.toUpperCase()} | Suplementos em ${STORE.locationLabel}`,
    description: `Catálogo de whey protein, creatina, pré-treino, hipercalórico, vitaminas e acessórios em ${STORE.locationLabel}. Monte seu orçamento e finalize pelo WhatsApp.`,
    path: "/",
    jsonLd: storeJsonLd,
  });

  return (
    <PageShell>
      {banners.length > 0 ? <HeroCarousel banners={banners} /> : <Hero />}

      <div className="container space-y-14 py-12">
        <section>
          <SectionHeading
            title="Mais vendidos"
            description="Os produtos que mais saem na loja, escolhidos por quem treina pesado."
            href="/catalogo"
          />
          <ProductRail
            products={featured}
            onAdd={addToQuote}
            loading={loadingFeatured}
          />
        </section>

        {(loadingOffers || offers.length > 0) && (
          <section>
            <SectionHeading
              title="Ofertas"
              description="Descontos ativos enquanto durar o estoque. Sem compromisso: monta o orçamento e confirma no WhatsApp."
              href="/catalogo?ordem=discount"
              linkLabel="Ver todas as ofertas"
            />
            <ProductRail products={offers} onAdd={addToQuote} loading={loadingOffers} />
          </section>
        )}

        <section>
          <SectionHeading
            title="Categorias"
            description="Navegue direto pelo que você precisa."
            href="/catalogo"
          />
          <CategoryGrid categories={categories} />
        </section>

        <section>
          <SectionHeading
            title="Principais marcas"
            description="Trabalhamos com as marcas mais procuradas do mercado."
          />
          <BrandStrip brands={brands} />
        </section>

        <WhatsappCtaBand />
      </div>
    </PageShell>
  );
};

export default Home;
