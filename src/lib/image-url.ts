/**
 * Otimiza e acelera fotos de produtos e banners usando a CDN global wsrv.nl (Cloudflare Edge).
 * - Converte arquivos pesados PNG/JPG (que chegam a ter 3 MB) para WebP ultraleve (~20 KB - 40 KB)
 * - Redimensiona para a resolução ideal da tela
 * - Entrega a partir de servidores Edge no Brasil (SP/RJ) em ~30ms em vez de puxar da Ásia em ~15s
 */
export type OptimizeImageOptions = {
  width?: number;
  quality?: number;
};

export function optimizeImageUrl(
  url: string | null | undefined,
  options: OptimizeImageOptions = {},
): string | null {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Já é uma URL otimizada do wsrv.nl
  if (trimmed.includes("wsrv.nl")) {
    return trimmed;
  }

  // Remove eventuais query params antigos
  const cleanUrl = trimmed.split("?")[0];

  // Banners usam resolução maior (1440px), produtos usam 480px (ideal para cards retina sem peso extra)
  const isBanner = cleanUrl.includes("/banners/") || cleanUrl.includes("/banner-images/");
  const width = options.width ?? (isBanner ? 1440 : 480);
  const quality = options.quality ?? 80;

  return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${width}&output=webp&q=${quality}&we=1`;
}
