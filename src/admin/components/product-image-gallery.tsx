import { useRef, useState } from "react";
import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MAX_IMAGE_SIZE_MB, MAX_PRODUCT_IMAGES } from "@/config/store";
import {
  removeProductImageByUrl,
  uploadProductImage,
  validateImageFile,
} from "@/services/storage";
import { cn } from "@/lib/utils";

type ProductImageGalleryProps = {
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
};

/**
 * Galeria do produto: até 5 fotos, com a primeira como principal
 * (é ela que aparece no card do catálogo e no carrinho de orçamento).
 */
export function ProductImageGallery({
  value,
  onChange,
  disabled = false,
}: ProductImageGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_PRODUCT_IMAGES - value.length;
  const isFull = remaining <= 0;

  const handleSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError(null);

    if (isFull) {
      setError(
        `Limite de ${MAX_PRODUCT_IMAGES} fotos já atingido. Remova uma para enviar outra.`,
      );
      return;
    }

    const selected = Array.from(files).slice(0, remaining);
    if (files.length > remaining) {
      setError(
        `Cabem mais ${remaining} foto(s): enviei as primeiras e ignorei o restante.`,
      );
    }

    setUploading(true);
    try {
      const uploaded: string[] = [];

      for (const file of selected) {
        const validationError = validateImageFile(file);
        if (validationError) {
          setError(validationError);
          continue;
        }
        uploaded.push(await uploadProductImage(file));
      }

      if (uploaded.length > 0) {
        onChange([...value, ...uploaded]);
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Falha ao enviar a imagem.",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeAt = async (index: number) => {
    const url = value[index];
    onChange(value.filter((_, itemIndex) => itemIndex !== index));
    setError(null);
    await removeProductImageByUrl(url);
  };

  const setAsMain = (index: number) => {
    if (index === 0) return;
    const next = [...value];
    const [picked] = next.splice(index, 1);
    onChange([picked, ...next]);
    setError(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {value.length} de {MAX_PRODUCT_IMAGES} fotos
        </span>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            className="hidden"
            onChange={(event) => void handleSelect(event.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || uploading || isFull}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
            {uploading ? "Enviando..." : "Adicionar foto"}
          </Button>
        </div>
      </div>

      {value.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {value.map((url, index) => (
            <li key={url} className="group relative">
              <div
                className={cn(
                  "aspect-square overflow-hidden rounded-lg border bg-[radial-gradient(circle_at_50%_15%,hsl(0_0%_16%),hsl(0_0%_6%))] p-1.5",
                  index === 0 ? "border-foreground/40" : "border-border",
                )}
              >
                <img
                  src={url}
                  alt={`Foto ${index + 1} do produto`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain"
                />
              </div>

              {index === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-foreground px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-background">
                  Principal
                </span>
              )}

              <div className="mt-1.5 flex items-center justify-between gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px]"
                  disabled={disabled || index === 0}
                  onClick={() => setAsMain(index)}
                  title="Usar como foto principal"
                >
                  <Star className={cn("h-3.5 w-3.5", index === 0 && "text-foreground")} />
                  Principal
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-muted-foreground hover:text-destructive"
                  disabled={disabled}
                  onClick={() => void removeAt(index)}
                  title="Remover esta foto"
                  aria-label={`Remover foto ${index + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Até {MAX_PRODUCT_IMAGES} fotos por produto, JPG/PNG/WEBP/AVIF até {MAX_IMAGE_SIZE_MB} MB
        cada. A foto marcada como <span className="text-foreground">Principal</span> é a que
        aparece no catálogo; as outras viram galeria na página do produto.
      </p>

      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
