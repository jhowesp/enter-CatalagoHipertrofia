/**
 * Mapeamento direto de assets estáticos na CDN de Borda da Vercel (Edge em São Paulo - GRU).
 * Entrega instantânea (~10ms a 25ms) para todo o catálogo atual sem passar por servidores distantes.
 */
const STATIC_EDGE_ASSETS: Record<string, string> = {
  // Banner Lipo Super HD
  "785e91c9-7d55-48b9-b967-45a42f9245c9.png": "/catalog-images/banners/lipo-super-hd.webp",

  // Todos os 27 produtos do catálogo oficial
  "ded20c6e-7d2f-42a8-9eef-bbb8f430cc55.png": "/catalog-images/products/protein-crush-900g-under-labz.webp",
  "48aba898-9824-4326-aab4-286c2dc599cd.png": "/catalog-images/products/whey-q10-450g-endogen.webp",
  "8d967a19-ffa3-4ad5-99e0-8d87eee6bf4f.png": "/catalog-images/products/beef-protein-900g-under-labz.webp",
  "360d0de8-1571-41e9-bd3c-b0c675d87849.png": "/catalog-images/products/dimethylex-termogenico-60-caps-under-labz.webp",
  "8094ab18-739d-4f7a-bc0e-329b3b0bf321.png": "/catalog-images/products/fckng-booster-energy-300g-under-labz.webp",
  "08c04592-e116-4f3d-88f5-09b12c3b7f38.png": "/catalog-images/products/v9-pump-300g.webp",
  "d566398c-e7bf-446d-8a84-31a9bbbac73f.png": "/catalog-images/products/osteo-repair-60-capsulas.webp",
  "826883fb-3217-4568-8ee8-9f424e1e9931.png": "/catalog-images/products/beta-alanine-300g.webp",
  "43987414-72dd-4276-99f4-53b0abf941a8.png": "/catalog-images/products/glutamina-100-pure-300g.webp",
  "aea6da19-e352-4787-82ba-95f14a36dba8.png": "/catalog-images/products/kit-mass-gain.webp",
  "5353d96a-096c-41c8-b3a8-06f1dea99562.png": "/catalog-images/products/creatina-100-pure-500g.webp",
  "c70bd6e0-24b7-4ab6-8244-2a078bcf09e8.png": "/catalog-images/products/colageno-verisol-em-gomas-red-berries.webp",
  "ed6127d6-8d9e-4bd8-a3a4-740d3283bc8a.png": "/catalog-images/products/doce-de-leite-400g-zero-acucar.webp",
  "62c8998e-ecc9-426f-9e3d-a0572c27bb71.png": "/catalog-images/products/warzone-night-360g.webp",
  "61f26091-bd6c-4630-b2e1-59b2cb00fbe1.png": "/catalog-images/products/albumina-1kg-uevo.webp",
  "9f5e52b3-62ce-48df-9ccc-77253c847adc.png": "/catalog-images/products/creatina-100-pura-300g-endogen.webp",
  "864980fb-2ddf-4210-97b9-1cae65664206.png": "/catalog-images/products/captain-gainer-3kg-hipercalorico.webp",
  "e2f5a1ac-6787-41fe-967c-b8999fe1bd8d.png": "/catalog-images/products/creatina-100-pure-300g.webp",
  "0986d675-50b1-4754-9e98-5d12fc30caa2.png": "/catalog-images/products/creatina-100-pure-150g.webp",
  "f754e3a2-57c0-45af-b1e9-2c9cd5ac973a.png": "/catalog-images/products/rampage-300g-under-labz.webp",
  "a83efe04-e1a8-4a22-83a2-573a01cceeb3.png": "/catalog-images/products/whey-100-900g-under-labz.webp",
  "194218ef-7cad-48d9-ab53-7eadbda6b789.png": "/catalog-images/products/lipo-super-hd-termogenico.webp",
  "d594aa33-575f-4b53-a1ef-878dba8dc399.png": "/catalog-images/products/cafeina-anidra-60-capsulas.webp",
  "37d32f1a-964a-4f46-942e-fc213013ab6c.png": "/catalog-images/products/fckng-booster-ecstasy-energy-600g.webp",
  "404cc0da-19ae-40d1-91bc-22d91b226d43.png": "/catalog-images/products/warzone-rocket-energy-450g.webp",
  "43c4b120-a330-4023-ae92-739ac9ce8a91.png": "/catalog-images/products/multivitaminico-under-labz.webp",
  "705054ca-ae0e-44d3-adbd-56fee1520972.png": "/catalog-images/products/tribulus-alphagenin.webp",
};

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

  // Se já for um arquivo estático local do projeto, devolve imediatamente
  if (trimmed.startsWith("/") || trimmed.startsWith("./")) {
    return trimmed;
  }

  // Extrai o nome do arquivo da URL do Supabase
  const filename = trimmed.split("/").pop()?.split("?")[0];
  if (filename && STATIC_EDGE_ASSETS[filename]) {
    // Para o banner em telas mobile (<= 768px), usa a versão compacta mobile
    if (filename === "785e91c9-7d55-48b9-b967-45a42f9245c9.png" && options.width && options.width <= 768) {
      return "/catalog-images/banners/lipo-super-hd-mobile.webp";
    }
    return STATIC_EDGE_ASSETS[filename];
  }

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Já é uma URL otimizada do wsrv.nl
  if (trimmed.includes("wsrv.nl")) {
    return trimmed;
  }

  // Remove eventuais query params antigos
  const cleanUrl = trimmed.split("?")[0];

  // Banners usam 1440px, produtos usam 480px
  const isBanner = cleanUrl.includes("/banners/") || cleanUrl.includes("/banner-images/");
  const width = options.width ?? (isBanner ? 1440 : 480);
  const quality = options.quality ?? 80;

  return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${width}&output=webp&q=${quality}&we=1`;
}
