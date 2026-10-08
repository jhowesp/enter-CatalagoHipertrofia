import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { BannerPreview } from "@/admin/components/banner-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MAX_IMAGE_SIZE_MB } from "@/config/store";
import { createBanner, updateBanner } from "@/services/banners";
import {
  removeBannerImageByUrl,
  uploadBannerImage,
  validateImageFile,
} from "@/services/storage";
import { isSafeBannerHref, type Banner, type BannerInput } from "@/types/banner";

type FormState = {
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string | null;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  eyebrow: "",
  title: "",
  subtitle: "",
  ctaLabel: "",
  ctaHref: "",
  imageUrl: null,
  active: true,
};

function formFromBanner(banner: Banner): FormState {
  return {
    eyebrow: banner.eyebrow ?? "",
    title: banner.title ?? "",
    subtitle: banner.subtitle ?? "",
    ctaLabel: banner.ctaLabel ?? "",
    ctaHref: banner.ctaHref ?? "",
    imageUrl: banner.imageUrl,
    active: banner.active,
  };
}

type BannerFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  banner: Banner | null;
  /** Posição usada ao criar um banner novo (vai para o fim da lista). */
  nextPosition: number;
  onSaved: () => void;
};

export function BannerFormSheet({
  open,
  onOpenChange,
  banner,
  nextPosition,
  onSaved,
}: BannerFormSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(banner ? formFromBanner(banner) : EMPTY_FORM);
  }, [open, banner]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setUploading(true);
    try {
      const previous = form.imageUrl;
      const publicUrl = await uploadBannerImage(file);
      update("imageUrl", publicUrl);
      if (previous) await removeBannerImageByUrl(previous);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar a imagem.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemoveImage = async () => {
    const current = form.imageUrl;
    update("imageUrl", null);
    if (current) await removeBannerImageByUrl(current);
  };

  const validate = (): BannerInput | null => {
    const nextErrors: Record<string, string> = {};
    const title = form.title.trim();

    if (title.length > 0 && title.length < 2) {
      nextErrors.title = "Título muito curto. Deixe em branco para usar só a imagem.";
    }

    if (title.length === 0 && !form.imageUrl) {
      nextErrors.title =
        "O banner precisa de pelo menos um título ou uma imagem. Envie a imagem ou escreva o título.";
    }

    const ctaHref = form.ctaHref.trim();
    if (ctaHref && !isSafeBannerHref(ctaHref)) {
      nextErrors.ctaHref =
        "Use um caminho interno começando com / (ex.: /catalogo?ordem=discount) ou um endereço http(s).";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return null;

    return {
      eyebrow: form.eyebrow.trim() || null,
      title: title || null,
      subtitle: form.subtitle.trim() || null,
      imageUrl: form.imageUrl,
      ctaLabel: form.ctaLabel.trim() || null,
      ctaHref: ctaHref || null,
      active: form.active,
    };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = validate();
    if (!payload) {
      toast.error("Confira os campos destacados antes de salvar.");
      return;
    }

    setSaving(true);
    try {
      if (banner) {
        await updateBanner(banner.id, payload);
        toast.success("Banner atualizado.");
      } else {
        await createBanner(payload, nextPosition);
        toast.success("Banner criado.");
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar o banner.");
    } finally {
      setSaving(false);
    }
  };

  const previewData = {
    eyebrow: form.eyebrow.trim() || null,
    title: form.title.trim() || null,
    subtitle: form.subtitle.trim() || null,
    imageUrl: form.imageUrl,
    ctaLabel: form.ctaLabel.trim() || null,
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto border-border bg-background p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="font-display text-xl uppercase tracking-tight">
            {banner ? "Editar banner" : "Novo banner"}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            O banner aparece no carrossel da home, na ordem definida na lista.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Prévia</Label>
            <BannerPreview data={previewData} className="h-[150px] sm:h-[180px]" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="banner-eyebrow">Selo (opcional)</Label>
            <Input
              id="banner-eyebrow"
              value={form.eyebrow}
              onChange={(event) => update("eyebrow", event.target.value)}
              placeholder="Oferta da semana"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="banner-title">Título (opcional se houver imagem)</Label>
            <Input
              id="banner-title"
              value={form.title}
              onChange={(event) => update("title", event.target.value)}
              placeholder="Whey e creatina com desconto"
              className="h-11"
            />
            <p className="text-[11px] text-muted-foreground">
              Deixe em branco para o banner aparecer só com a imagem, sem texto por cima.
            </p>
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="banner-subtitle">Subtítulo (opcional)</Label>
            <Textarea
              id="banner-subtitle"
              rows={2}
              value={form.subtitle}
              onChange={(event) => update("subtitle", event.target.value)}
              placeholder="Descontos ativos enquanto durar o estoque."
            />
          </div>

          <div className="space-y-2">
            <Label>Imagem de fundo (opcional)</Label>
            <div className="flex items-start gap-3">
              <div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg border border-border bg-[radial-gradient(circle_at_50%_15%,hsl(0_0%_16%),hsl(0_0%_6%))]">
                {form.imageUrl ? (
                  <img
                    src={form.imageUrl}
                    alt="Prévia da imagem do banner"
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-[10px] font-semibold uppercase text-muted-foreground">
                    Sem imagem
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                  onChange={(event) => void handleUpload(event.target.files?.[0])}
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving || uploading}
                    onClick={() => inputRef.current?.click()}
                  >
                    {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
                    {form.imageUrl ? "Trocar imagem" : "Enviar imagem"}
                  </Button>

                  {form.imageUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={saving || uploading}
                      onClick={() => void handleRemoveImage()}
                    >
                      <Trash2 />
                      Remover
                    </Button>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Sem imagem, o banner usa o gradiente da marca. JPG, PNG, WEBP ou AVIF até{" "}
                  {MAX_IMAGE_SIZE_MB} MB.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="banner-cta-label">Texto do botão</Label>
              <Input
                id="banner-cta-label"
                value={form.ctaLabel}
                onChange={(event) => update("ctaLabel", event.target.value)}
                placeholder="Ver ofertas"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="banner-cta-href">Destino do botão</Label>
              <Input
                id="banner-cta-href"
                value={form.ctaHref}
                onChange={(event) => update("ctaHref", event.target.value)}
                placeholder="/catalogo?ordem=discount"
                className="h-11"
              />
              {errors.ctaHref && (
                <p className="text-xs text-destructive">{errors.ctaHref}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-4 py-3">
            <div>
              <p className="text-sm text-foreground">Banner ativo</p>
              <p className="text-[11px] text-muted-foreground">
                Inativo sai do carrossel da home.
              </p>
            </div>
            <Switch
              checked={form.active}
              onCheckedChange={(checked) => update("active", checked)}
              aria-label="Banner ativo"
            />
          </div>

          <div className="sticky bottom-0 -mx-5 flex gap-3 border-t border-border bg-background px-5 py-4">
            <Button type="submit" variant="brand" size="lg" disabled={saving || uploading}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              {banner ? "Salvar alterações" : "Criar banner"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
