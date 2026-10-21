import { supabase } from "@/integrations/supabase/client";
import { optimizeImageUrl } from "@/lib/image-url";
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

/**
 * Reduz e converte imagens para WebP no navegador antes de subir para o Supabase.
 * Garante que banners e produtos nunca excedam resoluções e pesos excessivos no banco.
 */
async function compressImage(file: File, maxWidth = 1200, quality = 0.80): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return file;
  }

  // Se já for WebP leve (< 200 KB), não precisa reprocessar
  if (file.type === "image/webp" && file.size < 200 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(file);

        ctx.drawImage(img, 0, 0, width, height);

        // Converte para WebP com compressão eficiente
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Se o WebP gerado for menor OU o arquivo original for pesado (> 200 KB), usa o WebP
              if (blob.size < file.size || file.size > 200 * 1024) {
                const compressed = new File(
                  [blob],
                  file.name.replace(/\.[^.]+$/, ".webp"),
                  { type: "image/webp" },
                );
                return resolve(compressed);
              }
            }
            resolve(file);
          },
          "image/webp",
          quality,
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
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

  const isBanner = bucket === BANNER_BUCKET;
  // Banners: máx 1440px. Produtos: máx 800px.
  const processedFile = await compressImage(
    file,
    isBanner ? 1440 : 800,
    0.80,
  );

  const rawExtension = processedFile.name.split(".").pop()?.toLowerCase() ?? "webp";
  const extension = ALLOWED_IMAGE_EXTENSIONS.includes(rawExtension) ? rawExtension : "webp";
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, processedFile, { contentType: processedFile.type, upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  // Pré-aquece o cache da CDN na borda em segundo plano para Desktop e Mobile
  try {
    if (typeof window !== "undefined") {
      const sizes = isBanner ? [1440, 640] : [480, 800];
      sizes.forEach((w) => {
        const cdnUrl = optimizeImageUrl(data.publicUrl, { width: w });
        if (cdnUrl) {
          fetch(cdnUrl, { mode: "no-cors" }).catch(() => {});
        }
      });
    }
  } catch {
    // Ignora falhas de pre-warm silenciosamente
  }

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

  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    console.warn(`Falha ao remover arquivo do bucket ${bucket}:`, error.message);
  }
}

export async function uploadProductImage(file: File): Promise<string> {
  return uploadImageFile({ file, bucket: IMAGE_BUCKET, folder: "products" });
}

export async function removeProductImageByUrl(url: string | null | undefined): Promise<void> {
  return removeImageByUrl(url, IMAGE_BUCKET);
}

export async function uploadBannerImage(file: File): Promise<string> {
  return uploadImageFile({ file, bucket: BANNER_BUCKET, folder: "banners" });
}

export async function removeBannerImageByUrl(url: string | null | undefined): Promise<void> {
  return removeImageByUrl(url, BANNER_BUCKET);
}
