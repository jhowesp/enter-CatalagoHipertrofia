import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";

import { optimizeImageUrl } from "@/lib/image-url";
import { cn } from "@/lib/utils";

type ProductImageProps = {
  src?: string | null;
  alt: string;
  /** Imagem principal da página carrega junto com o conteúdo. */
  priority?: boolean;
  className?: string;
  width?: number;
};

/**
 * Foto do produto com carregamento otimizado:
 * - Placeholder tipo esqueleto animado enquanto transfere
 * - Transição suave (fade-in) assim que a imagem é decodificada
 * - Fallback automático caso a CDN apresente instabilidade
 * - Priorização de rede (fetchpriority=high) nas primeiras fotos da tela
 */
export function ProductImage({
  src,
  alt,
  priority = false,
  className,
  width,
}: ProductImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(() =>
    src ? optimizeImageUrl(src, { width }) ?? src : null,
  );

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setCurrentSrc(src ? optimizeImageUrl(src, { width }) ?? src : null);
  }, [src, width]);

  if (!src || hasError) {
    return (
      <div
        role="img"
        aria-label={`${alt} — foto não disponível`}
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-2 photo-surface text-muted-foreground/70",
          className,
        )}
      >
        <ImageOff className="h-8 w-8" strokeWidth={1.4} aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-[0.24em]">
          Foto em breve
        </span>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      {/* Esqueleto animado para feedback imediato ao usuário */}
      {!isLoaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse rounded-lg bg-foreground/[0.04]"
        />
      )}

      <img
        src={currentSrc || src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "low"}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          // Se a imagem falhar, cai para a CDN otimizada wsrv.nl em baixa resolução (400px WebP)
          // NUNCA cai para o PNG original pesado do Supabase diretamente
          if (currentSrc && !currentSrc.includes("wsrv.nl") && src && src.startsWith("http")) {
            const clean = src.split("?")[0];
            setCurrentSrc(`https://wsrv.nl/?url=${encodeURIComponent(clean)}&w=400&output=webp&q=75&we=1`);
          } else {
            setHasError(true);
          }
        }}
        className={cn(
          "h-full w-full object-contain transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          className,
        )}
      />
    </div>
  );
}
