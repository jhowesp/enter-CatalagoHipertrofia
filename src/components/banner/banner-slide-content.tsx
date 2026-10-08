import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type BannerSlideData = {
  eyebrow?: string | null;
  title?: string | null;
  subtitle?: string | null;
  imageUrl?: string | null;
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
 * É usado no carrossel da home e na prévia do painel: um desenho só.
 */
export function BannerSlideContent({
  data,
  priority = false,
  showCta = true,
  className,
}: BannerSlideContentProps) {
  const hasImage = Boolean(data.imageUrl);
  const hasText = Boolean(data.eyebrow || data.title || data.subtitle);
  const hasCta = showCta && Boolean(data.ctaLabel);
  const imageOnly = hasImage && !hasText && !hasCta;

  return (
    <div className={cn("relative flex h-full w-full items-center overflow-hidden", className)}>
      {hasImage ? (
        <>
          <img
            src={data.imageUrl as string}
            alt=""
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {!imageOnly && (
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/35"
            />
          )}
        </>
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
