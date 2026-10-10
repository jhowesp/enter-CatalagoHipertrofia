import type { Database } from "@/integrations/supabase/types";

export type BannerRow = Database["public"]["Tables"]["banners"]["Row"];

/** Banner promocional da home, já normalizado para a tela. */
export type Banner = {
  id: string;
  /** Selo pequeno acima do título (ex.: "Oferta da semana"). */
  eyebrow: string | null;
  /** Opcional quando o banner é só imagem. */
  title: string | null;
  subtitle: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  /** Destino do botão: caminho interno (`/catalogo`) ou URL http(s). */
  ctaHref: string | null;
  active: boolean;
  position: number;
  isDemo: boolean;
};

export type BannerInput = {
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  active: boolean;
};

export function mapBanner(row: BannerRow): Banner {
  return {
    id: row.id,
    eyebrow: row.eyebrow?.trim() ? row.eyebrow.trim() : null,
    title: row.title?.trim() ? row.title.trim() : null,
    subtitle: row.subtitle?.trim() ? row.subtitle.trim() : null,
    imageUrl: row.image_url,
    ctaLabel: row.cta_label?.trim() ? row.cta_label.trim() : null,
    ctaHref: row.cta_href?.trim() ? row.cta_href.trim() : null,
    active: row.active,
    position: row.position,
    isDemo: row.is_demo,
  };
}

/** Texto usado em rótulos de acessibilidade e listagens quando não há título. */
export function bannerLabel(banner: Pick<Banner, "title" | "ctaLabel">): string {
  return banner.title ?? banner.ctaLabel ?? "Banner promocional";
}

/**
 * Banner só com arte: tem imagem e não tem selo, título, subtítulo nem botão.
 * Nesse caso a arte manda no visual — nada de véu por cima nem corte —, então a
 * altura acompanha a imagem em vez de uma faixa fixa.
 */
export function isImageOnlyBanner(
  banner: Pick<Banner, "imageUrl" | "eyebrow" | "title" | "subtitle" | "ctaLabel">,
): boolean {
  return Boolean(
    banner.imageUrl && !banner.eyebrow && !banner.title && !banner.subtitle && !banner.ctaLabel,
  );
}

/** Link de destino seguro: interno ou http(s). Qualquer outro esquema é descartado. */
export function isSafeBannerHref(href: string | null): boolean {
  if (!href) return false;
  return href.startsWith("/") || /^https?:\/\//i.test(href);
}
