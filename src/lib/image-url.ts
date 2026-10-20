/**
 * Converte URLs diretas do Supabase Storage para a rota de proxy com cache da Vercel Edge CDN (/supabase-storage/...).
 * Isso permite que a CDN da Vercel em São Paulo guarde as fotos em cache local por até 30 dias,
 * eliminando a latência de cruzar os cabos submarinos até Singapura (~4.7s -> ~20ms).
 */
export function optimizeImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;

  const SUPABASE_STORAGE_PREFIX =
    "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/";

  if (url.startsWith(SUPABASE_STORAGE_PREFIX)) {
    return `/supabase-storage/${url.slice(SUPABASE_STORAGE_PREFIX.length)}`;
  }

  return url;
}

