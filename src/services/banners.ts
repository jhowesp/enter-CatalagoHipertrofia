import { supabase } from "@/integrations/supabase/client";
import { mapBanner, serializeBannerImages, type Banner, type BannerInput } from "@/types/banner";

/** Banners que a home deve exibir (só ativos), na ordem definida no painel. */
export async function listActiveBanners(): Promise<Banner[]> {
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("active", true)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapBanner);
}

export async function listAdminBanners(): Promise<Banner[]> {
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapBanner);
}

export async function createBanner(input: BannerInput, position: number): Promise<Banner> {
  const rawImageUrl = serializeBannerImages(input.imageUrl, input.mobileImageUrl);
  const { data, error } = await supabase
    .from("banners")
    .insert({
      eyebrow: input.eyebrow,
      title: input.title,
      subtitle: input.subtitle,
      image_url: rawImageUrl,
      cta_label: input.ctaLabel,
      cta_href: input.ctaHref,
      active: input.active,
      position,
      is_demo: false,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapBanner(data);
}

export async function updateBanner(id: string, input: BannerInput): Promise<Banner> {
  const rawImageUrl = serializeBannerImages(input.imageUrl, input.mobileImageUrl);
  const { data, error } = await supabase
    .from("banners")
    .update({
      eyebrow: input.eyebrow,
      title: input.title,
      subtitle: input.subtitle,
      image_url: rawImageUrl,
      cta_label: input.ctaLabel,
      cta_href: input.ctaHref,
      active: input.active,
      is_demo: false,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapBanner(data);
}

export async function setBannerActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("banners").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteBanner(id: string): Promise<void> {
  const { error } = await supabase.from("banners").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Reordena a lista movendo o banner uma casa. Regrava a posição de todos na
 * ordem resultante — assim funciona mesmo quando duas posições estão repetidas.
 */
export async function moveBanner(id: string, direction: "up" | "down"): Promise<void> {
  const banners = await listAdminBanners();
  const index = banners.findIndex((banner) => banner.id === id);
  if (index < 0) return;

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= banners.length) return;

  const reordered = [...banners];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(targetIndex, 0, moved);

  const results = await Promise.all(
    reordered.map((banner, position) =>
      supabase.from("banners").update({ position }).eq("id", banner.id),
    ),
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);
}
