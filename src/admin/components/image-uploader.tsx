import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MAX_IMAGE_SIZE_MB } from "@/config/store";
import { removeProductImageByUrl, uploadProductImage, validateImageFile } from "@/services/storage";

type ImageUploaderProps = {
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
};

/** Upload da foto real do produto para o Enter Cloud Storage. */
export function ImageUploader({ value, onChange, disabled = false }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (file: File | undefined) => {
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const previousUrl = value;
      const publicUrl = await uploadProductImage(file);
      onChange(publicUrl);
      if (previousUrl && previousUrl !== publicUrl) {
        await removeProductImageByUrl(previousUrl);
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

  const handleRemove = async () => {
    const currentUrl = value;
    onChange(null);
    if (currentUrl) await removeProductImageByUrl(currentUrl);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-4">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-[radial-gradient(circle_at_50%_15%,hsl(0_0%_16%),hsl(0_0%_6%))] p-2">
          {value ? (
            <img
              src={value}
              alt="Prévia da foto do produto"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="grid h-full w-full place-items-center text-[10px] font-semibold uppercase text-muted-foreground">
              Sem foto
            </span>
          )}
        </div>

        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={(event) => void handleSelect(event.target.files?.[0])}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
              {value ? "Trocar foto" : "Enviar foto"}
            </Button>

            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                disabled={disabled || uploading}
                onClick={() => void handleRemove()}
              >
                <Trash2 />
                Remover
              </Button>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground">
            JPG, PNG, WEBP ou AVIF até {MAX_IMAGE_SIZE_MB} MB. A foto aparece no catálogo sem
            distorcer a embalagem.
          </p>
          {error && <p className="text-[11px] text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}
