import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { optimizeImageUrl } from "@/lib/image-url";
import { cn } from "@/lib/utils";

export type BannerSlideData = {
  eyebrow?: string | null;
  title?: string | null;
  subtitle?: string | null;
  imageUrl?: string | null;
  mobileImageUrl?: string | null;
  ctaLabel?: string | null;
};

type BannerSlideContentProps = {
  data: BannerSlideData;
  /** Primeiro slide carrega a imagem junto com a página. */
  priority?: boolean;
  /** Na prévia do painel o botão é só ilustrativo. */
  showCta?: boolean;
  className?: string;
};

/**
 * Visual do banner. Três situações:
 * 1. só imagem — a arte aparece inteira, sem véu e sem nada por cima;
 * 2. imagem + texto — imagem com véu escuro para o texto ficar legível;
 * 3. só texto — fundo grafite da marca.
 */
export function BannerSlideContent({
  data,
  priority = false,
  showCta = true,
  className,
}: BannerSlideContentProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const rawDesktopUrl = data.imageUrl;
  const rawMobileUrl = data.mobileImageUrl;
  const optimizedDesktopUrl = optimizeImageUrl(rawDesktopUrl, { width: 1440, quality: 80 });
  const optimizedMobileUrl =
    optimizeImageUrl(rawMobileUrl, { width: 640, quality: 80 }) ||
    optimizeImageUrl(rawDesktopUrl, { width: 640, quality: 80 });

  const hasImage = Boolean(rawDesktopUrl || rawMobileUrl);
  const hasText = Boolean(data.eyebrow || data.title || data.subtitle);
  const hasCta = showCta && Boolean(data.ctaLabel);
  const imageOnly = hasImage && !hasText && !hasCta;

  const fallbackDesktop = hasError
    ? (rawDesktopUrl && rawDesktopUrl.startsWith("http")
        ? `https://wsrv.nl/?url=${encodeURIComponent(rawDesktopUrl.split("?")[0])}&w=1200&output=webp&q=75&we=1`
        : rawDesktopUrl)
    : optimizedDesktopUrl ?? rawDesktopUrl;

  const fallbackMobile = hasError
    ? (rawMobileUrl && rawMobileUrl.startsWith("http")
        ? `https://wsrv.nl/?url=${encodeURIComponent(rawMobileUrl.split("?")[0])}&w=640&output=webp&q=75&we=1`
        : rawMobileUrl)
    : optimizedMobileUrl ?? rawMobileUrl;

  return (
    <div
      className={cn(
        "relative flex w-full items-center overflow-hidden",
        imageOnly ? "photo-surface h-auto min-h-[200px] sm:min-h-[300px] lg:min-h-[400px]" : "h-full",
        className,
      )}
    >
      {/* Esqueleto animado de fundo enquanto o banner carrega */}
      {hasImage && !isLoaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-muted/15"
        />
      )}

      {hasImage ? (
        imageOnly ? (
          /* Só arte: a imagem fica no fluxo, então a altura acompanha e nada é cortado. */
          <picture className="block w-full">
            {fallbackMobile && (
              <source media="(max-width: 640px)" srcSet={fallbackMobile} />
            )}
            <img
              src={fallbackDesktop ?? (fallbackMobile || (rawDesktopUrl as string))}
              alt=""
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "low"}
              decoding="async"
              onLoad={() => setIsLoaded(true)}
              onError={() => {
                if (!hasError) setHasError(true);
              }}
              className={cn(
                "h-auto max-h-[70vh] w-full object-contain transition-opacity duration-300 sm:max-h-[560px]",
                isLoaded ? "opacity-100" : "opacity-0",
              )}
            />
          </picture>
        ) : (
          <>
            <picture className="absolute inset-0 block h-full w-full">
              {fallbackMobile && (
                <source media="(max-width: 640px)" srcSet={fallbackMobile} />
              )}
              <img
                src={fallbackDesktop ?? (fallbackMobile || (rawDesktopUrl as string))}
                alt=""
                loading={priority ? "eager" : "lazy"}
                fetchPriority={priority ? "high" : "low"}
                decoding="async"
                onLoad={() => setIsLoaded(true)}
                onError={() => {
                  if (!hasError) setHasError(true);
                }}
                className={cn(
                  "h-full w-full object-cover transition-opacity duration-300",
                  isLoaded ? "opacity-100" : "opacity-0",
                )}
              />
            </picture>
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/35"
            />
          </>
        )
      ) : (
        <div aria-hidden className="absolute inset-0 bg-gradient-hero" />
      )}

      {!imageOnly && (
        <div className="relative w-full px-5 py-7 sm:px-10 sm:py-10 lg:px-14">
          <div className="max-w-xl space-y-3">
            {data.eyebrow && (
              <span className="inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground">
                {data.eyebrow}
              </span>
            )}

            {data.title && (
              <h2 className="font-display text-2xl leading-[1.05] text-foreground sm:text-4xl lg:text-5xl">
                {data.title}
              </h2>
            )}

            {data.subtitle && (
              <p className="max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                {data.subtitle}
              </p>
            )}

            {hasCta && data.ctaLabel && (
              <span className="inline-flex h-12 items-center gap-2 rounded-lg bg-gradient-primary px-6 text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-[0_14px_34px_-16px_hsl(var(--primary)/0.95)]">
                {data.ctaLabel}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
