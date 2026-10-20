import type { Database } from "@/integrations/supabase/types";
import { optimizeImageUrl } from "@/lib/image-url";

export type BannerRow = Database["public"]["Tables"]["banners"]["Row"];

/** Lê as URLs de desktop e mobile a partir do campo `image_url` (JSON ou string simples legada). */
export function parseBannerImages(raw: string | null | undefined): {
  desktop: string | null;
  mobile: string | null;
} {
  if (!raw || typeof raw !== "string") return { desktop: null, mobile: null };
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed) as { desktop?: string | null; mobile?: string | null };
      return {
        desktop: parsed.desktop?.trim() || null,
        mobile: parsed.mobile?.trim() || null,
      };
    } catch {
      // Formato não é JSON válido, trata como string simples
    }
  }
  return { desktop: trimmed, mobile: null };
}

/** Empacota as URLs de desktop e mobile no campo `image_url` mantendo compatibilidade. */
export function serializeBannerImages(
  desktop: string | null | undefined,
  mobile: string | null | undefined,
): string | null {
  const d = desktop?.trim() || null;
  const m = mobile?.trim() || null;
  if (d && m) {
    return JSON.stringify({ desktop: d, mobile: m });
  }
  if (m && !d) {
    return JSON.stringify({ desktop: m, mobile: m });
  }
  return d;
}

/** Banner promocional da home, já normalizado para a tela. */
export type Banner = {
  id: string;
  /** Selo pequeno acima do título (ex.: "Oferta da semana"). */
  eyebrow: string | null;
  /** Opcional quando o banner é só imagem. */
  title: string | null;
  subtitle: string | null;
  /** Imagem otimizada para Desktop / Telas Largas. */
  imageUrl: string | null;
  /** Imagem otimizada para Celular / Telas Verticais. */
  mobileImageUrl: string | null;
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
  mobileImageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  active: boolean;
};

export function mapBanner(row: BannerRow): Banner {
  const { desktop, mobile } = parseBannerImages(row.image_url);
  return {
    id: row.id,
    eyebrow: row.eyebrow?.trim() ? row.eyebrow.trim() : null,
    title: row.title?.trim() ? row.title.trim() : null,
    subtitle: row.subtitle?.trim() ? row.subtitle.trim() : null,
    imageUrl: optimizeImageUrl(desktop),
    mobileImageUrl: optimizeImageUrl(mobile),
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
  banner: Pick<Banner, "imageUrl" | "mobileImageUrl" | "eyebrow" | "title" | "subtitle" | "ctaLabel">,
): boolean {
  return Boolean(
    (banner.imageUrl || banner.mobileImageUrl) && !banner.eyebrow && !banner.title && !banner.subtitle && !banner.ctaLabel,
  );
}

/** Link de destino seguro: interno ou http(s). Qualquer outro esquema é descartado. */
export function isSafeBannerHref(href: string | null): boolean {
  if (!href) return false;
  return href.startsWith("/") || /^https?:\/\//i.test(href);
}
