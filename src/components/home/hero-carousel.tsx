import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { BannerSlideContent } from "@/components/banner/banner-slide-content";
import { HeroTrustRow } from "@/components/home/hero-trust-row";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { STORE } from "@/config/store";
import { bannerLabel, isImageOnlyBanner, normalizeBannerHref, type Banner } from "@/types/banner";
import { cn } from "@/lib/utils";

const AUTOPLAY_MS = 6000;

/** Respeita quem pediu menos movimento no sistema operacional. */
function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(query.matches);

    const listener = (event: MediaQueryListEvent) => setPrefersReduced(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  return prefersReduced;
}

function BannerLink({
  banner,
  children,
}: {
  banner: Banner;
  children: React.ReactNode;
}) {
  const targetHref = normalizeBannerHref(banner.ctaHref);
  if (!targetHref) return <>{children}</>;

  const isExternal = /^https?:\/\//i.test(targetHref);

  if (isExternal) {
    return (
      <a
        href={targetHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={bannerLabel(banner)}
        className="block h-full w-full select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      to={targetHref}
      aria-label={bannerLabel(banner)}
      className="block h-full w-full select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {children}
    </Link>
  );
}

/**
 * Carrossel de banners promocionais da home.
 * Avança sozinho, pausa no hover/foco e com a aba oculta, navega por setas,
 * arraste no celular e indicadores clicáveis.
 */
export function HeroCarousel({ banners }: { banners: Banner[] }) {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [current, setCurrent] = useState(0);
  const [pausedByPointer, setPausedByPointer] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const multiple = banners.length > 1;

  useEffect(() => {
    if (!api) return;

    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  useEffect(() => {
    const onVisibilityChange = () => setTabHidden(document.hidden);
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!api || !multiple || pausedByPointer || tabHidden || prefersReducedMotion) return;

    const timer = window.setInterval(() => api.scrollNext(), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [api, multiple, pausedByPointer, tabHidden, prefersReducedMotion]);

  return (
    <section className="border-b border-border">
      <h1 className="sr-only">
        {STORE.name} — {STORE.tagline}
      </h1>

      <Carousel
        setApi={setApi}
        opts={{ loop: multiple, align: "start", watchDrag: multiple }}
        className="relative w-full"
        aria-roledescription="carousel"
        aria-label="Destaques e promoções da loja"
        onMouseEnter={() => setPausedByPointer(true)}
        onMouseLeave={() => setPausedByPointer(false)}
        onFocusCapture={() => setPausedByPointer(true)}
        onBlurCapture={() => setPausedByPointer(false)}
      >
        <CarouselContent className="-ml-0 items-center">
          {banners.map((banner, index) => {
            const imageOnly = isImageOnlyBanner(banner);

            return (
              <CarouselItem
                key={banner.id}
                className="pl-0"
                aria-roledescription="slide"
                aria-label={`${index + 1} de ${banners.length}: ${bannerLabel(banner)}`}
              >
                <article
                  className={cn(
                    "w-full",
                    /* Só arte: a altura vem da imagem com min-height para estabilidade. Com texto: faixa de altura fixa. */
                    imageOnly
                      ? "min-h-[180px] sm:min-h-[280px] lg:min-h-[360px]"
                      : cn(
                          "h-[300px] sm:h-[380px] lg:h-[440px]",
                          !multiple && "sm:h-[360px] lg:h-[420px]",
                        ),
                  )}
                >
                  <BannerLink banner={banner}>
                    <BannerSlideContent
                      data={{
                        eyebrow: banner.eyebrow,
                        title: banner.title,
                        subtitle: banner.subtitle,
                        imageUrl: banner.imageUrl,
                        mobileImageUrl: banner.mobileImageUrl,
                        ctaLabel: banner.ctaLabel,
                      }}
                      priority={index === 0}
                    />
                  </BannerLink>
                </article>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {multiple && (
          <>
            <CarouselPrevious
              className="left-3 hidden h-10 w-10 sm:inline-flex"
              aria-label="Banner anterior"
            />
            <CarouselNext
              className="right-3 hidden h-10 w-10 sm:inline-flex"
              aria-label="Próximo banner"
            />

            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 backdrop-blur">
              {banners.map((banner, index) => (
                <button
                  key={banner.id}
                  type="button"
                  onClick={() => api?.scrollTo(index)}
                  aria-label={`Ir para o banner ${index + 1}: ${bannerLabel(banner)}`}
                  aria-current={index === current}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    index === current
                      ? "w-6 bg-foreground"
                      : "w-2 bg-muted-foreground/50 hover:bg-muted-foreground",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </Carousel>

      <div className="container py-4">
        <HeroTrustRow />
      </div>
    </section>
  );
}
