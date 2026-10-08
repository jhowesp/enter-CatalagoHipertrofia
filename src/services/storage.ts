import { supabase } from "@/integrations/supabase/client";
import {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_TYPES,
  BANNER_BUCKET,
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

/** Sobe uma imagem para o bucket indicado e devolve a URL pública. */
export async function uploadImageFile({
  file,
  bucket,
  folder,
}: {
  file: File;
  bucket: string;
  folder: string;
}): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const rawExtension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const extension = ALLOWED_IMAGE_EXTENSIONS.includes(rawExtension) ? rawExtension : "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function objectPathFromPublicUrl(url: string, bucket: string): string | null {
  const marker = `/${bucket}/`;
  const index = url.indexOf(marker);
  if (index < 0) return null;

  const path = url.slice(index + marker.length);
  return path ? decodeURIComponent(path) : null;
}

/** Remove um arquivo do bucket a partir da URL pública. */
export async function removeImageByUrl(
  url: string | null | undefined,
  bucket: string,
): Promise<void> {
  if (!url) return;

  const path = objectPathFromPublicUrl(url, bucket);
  if (!path) return;

  await supabase.storage.from(bucket).remove([path]);
}

/* Fotos de produto ------------------------------------------------- */

export async function uploadProductImage(file: File): Promise<string> {
  return uploadImageFile({ file, bucket: IMAGE_BUCKET, folder: "products" });
}

export async function removeProductImageByUrl(url: string | null | undefined) {
  await removeImageByUrl(url, IMAGE_BUCKET);
}

/* Imagens de banner ------------------------------------------------- */

export async function uploadBannerImage(file: File): Promise<string> {
  return uploadImageFile({ file, bucket: BANNER_BUCKET, folder: "banners" });
}

export async function removeBannerImageByUrl(url: string | null | undefined) {
  await removeImageByUrl(url, BANNER_BUCKET);
}
