import { supabase } from "@/integrations/supabase/client";
import {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_TYPES,
  IMAGE_BUCKET,
  MAX_IMAGE_SIZE_MB,
} from "@/config/store";

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Formato não aceito. Use JPG, PNG, WEBP ou AVIF.";
  }
  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    return `Imagem maior que ${MAX_IMAGE_SIZE_MB} MB. Reduza o arquivo e tente novamente.`;
  }
  return null;
}

/** Sobe a foto do produto e devolve a URL pública para salvar em `image_url`. */
export async function uploadProductImage(file: File): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const rawExtension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const extension = ALLOWED_IMAGE_EXTENSIONS.includes(rawExtension)
    ? rawExtension
    : "jpg";

  const path = `products/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function objectPathFromPublicUrl(url: string): string | null {
  const marker = `/${IMAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index < 0) return null;
  const path = url.slice(index + marker.length);
  return path ? decodeURIComponent(path) : null;
}

/** Remove a imagem antiga do storage quando ela é substituída ou descartada. */
export async function removeProductImageByUrl(url: string | null | undefined) {
  if (!url) return;
  const path = objectPathFromPublicUrl(url);
  if (!path || !path.startsWith("products/")) return;
  await supabase.storage.from(IMAGE_BUCKET).remove([path]);
}
