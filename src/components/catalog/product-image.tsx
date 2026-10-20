import { ImageOff } from "lucide-react";

import { optimizeImageUrl } from "@/lib/image-url";
import { cn } from "@/lib/utils";

type ProductImageProps = {
  src?: string | null;
  alt: string;
  /** Imagem principal da página carrega junto com o conteúdo. */
  priority?: boolean;
  className?: string;
};

/**
 * Foto do produto.
 * Sem `image_url` (produtos de demonstração) mostramos um bloco grafite neutro.
 * Com imagem, mantemos a proporção com `object-contain` sobre fundo escuro,
 * evitando cortar ou distorcer a embalagem.
 */
export function ProductImage({ src, alt, priority = false, className }: ProductImageProps) {
  if (!src) {
    return (
      <div
        role="img"
        aria-label={`${alt} — foto ainda não cadastrada`}
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-2 photo-surface text-muted-foreground/70",
          className,
        )}
      >
        <ImageOff className="h-9 w-9" strokeWidth={1.4} aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-[0.24em]">
          Foto em breve
        </span>
      </div>
    );
  }

  const finalSrc = optimizeImageUrl(src) ?? src;

  return (
    <img
      src={finalSrc}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cn("h-full w-full object-contain", className)}
    />
  );
}
