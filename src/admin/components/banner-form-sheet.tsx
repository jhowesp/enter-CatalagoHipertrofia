import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Monitor, Save, Smartphone, Trash2 } from "lucide-react";
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
import { optimizeImageUrl } from "@/lib/image-url";
import { cn } from "@/lib/utils";

type FormState = {
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  eyebrow: "",
  title: "",
  subtitle: "",
  ctaLabel: "",
  ctaHref: "",
  imageUrl: null,
  mobileImageUrl: null,
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
    mobileImageUrl: banner.mobileImageUrl,
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
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<"desktop" | "mobile" | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(banner ? formFromBanner(banner) : EMPTY_FORM);
    setPreviewMode("desktop");
  }, [open, banner]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleUpload = async (file: File | undefined, target: "desktop" | "mobile") => {
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setUploadingTarget(target);
    try {
      const fieldKey = target === "desktop" ? "imageUrl" : "mobileImageUrl";
      const previous = form[fieldKey];
      const publicUrl = await uploadBannerImage(file);
      update(fieldKey, publicUrl);
      if (previous && previous !== form.imageUrl && previous !== form.mobileImageUrl) {
        await removeBannerImageByUrl(previous);
      }
      toast.success(
        target === "desktop" ? "Imagem para desktop enviada!" : "Imagem para celular enviada!",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar a imagem.");
    } finally {
      setUploadingTarget(null);
      if (target === "desktop" && desktopInputRef.current) desktopInputRef.current.value = "";
      if (target === "mobile" && mobileInputRef.current) mobileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = async (target: "desktop" | "mobile") => {
    const fieldKey = target === "desktop" ? "imageUrl" : "mobileImageUrl";
    const current = form[fieldKey];
    update(fieldKey, null);
    if (current && current !== form.imageUrl && current !== form.mobileImageUrl) {
      await removeBannerImageByUrl(current);
    }
  };

  const validate = (): BannerInput | null => {
    const nextErrors: Record<string, string> = {};
    const title = form.title.trim();

    if (title.length > 0 && title.length < 2) {
      nextErrors.title = "Título muito curto. Deixe em branco para usar só a imagem.";
    }

    if (title.length === 0 && !form.imageUrl && !form.mobileImageUrl) {
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
      mobileImageUrl: form.mobileImageUrl,
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
        toast.success("Banner atualizado com sucesso.");
      } else {
        await createBanner(payload, nextPosition);
        toast.success("Banner criado com sucesso.");
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
    imageUrl: previewMode === "mobile" ? form.mobileImageUrl || form.imageUrl : form.imageUrl,
    mobileImageUrl: form.mobileImageUrl,
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
            Configure imagens exclusivas para computador e celular com proporções ideais.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 px-5 py-5">
          {/* PRÉVIA COM SELETOR DESKTOP / MOBILE */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground">
                Prévia do Banner ({previewMode === "desktop" ? "Computador" : "Celular"})
              </Label>
              <div className="inline-flex rounded-lg border border-border bg-secondary/50 p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewMode("desktop")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    previewMode === "desktop"
                      ? "bg-foreground text-background shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("mobile")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    previewMode === "mobile"
                      ? "bg-foreground text-background shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  Mobile
                </button>
              </div>
            </div>

            <div
              className={cn(
                "transition-all duration-200",
                previewMode === "mobile" ? "mx-auto max-w-[280px]" : "w-full",
              )}
            >
              <BannerPreview
                data={previewData}
                className={cn(
                  "overflow-hidden rounded-xl border border-border shadow-xs",
                  previewMode === "mobile" ? "h-[260px]" : "h-[150px] sm:h-[180px]",
                )}
              />
            </div>
          </div>

          {/* SELEÇÃO DE IMAGENS (DESKTOP E MOBILE) */}
          <div className="space-y-4 rounded-xl border border-border bg-card/60 p-4">
            <p className="font-sans text-xs font-semibold uppercase tracking-wider text-foreground">
              Arquivos de Imagem do Banner
            </p>

            {/* 1. IMAGEM PARA DESKTOP */}
            <div className="space-y-2 rounded-lg border border-border/80 bg-background/50 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Monitor className="h-4 w-4 text-primary" />
                  1. Imagem para Desktop (Computador)
                </Label>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  1920 × 600 px (16:9)
                </span>
              </div>

              <div className="mt-2 flex items-start gap-3">
                <div className="h-20 w-36 shrink-0 overflow-hidden rounded-lg border border-border photo-surface">
                  {form.imageUrl ? (
                    <img
                      src={optimizeImageUrl(form.imageUrl, { width: 300 }) ?? form.imageUrl}
                      alt="Prévia Desktop"
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-center text-[10px] font-semibold uppercase text-muted-foreground">
                      Sem imagem
                    </span>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <input
                    ref={desktopInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="hidden"
                    onChange={(event) => void handleUpload(event.target.files?.[0], "desktop")}
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={saving || uploadingTarget !== null}
                      onClick={() => desktopInputRef.current?.click()}
                    >
                      {uploadingTarget === "desktop" ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <ImagePlus />
                      )}
                      {form.imageUrl ? "Trocar desktop" : "Enviar desktop"}
                    </Button>

                    {form.imageUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={saving || uploadingTarget !== null}
                        onClick={() => void handleRemoveImage("desktop")}
                      >
                        <Trash2 />
                        Remover
                      </Button>
                    )}
                  </div>

                  <p className="text-[11px] leading-tight text-muted-foreground">
                    Formato horizontal ideal para monitores e notebooks.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. IMAGEM PARA MOBILE */}
            <div className="space-y-2 rounded-lg border border-border/80 bg-background/50 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Smartphone className="h-4 w-4 text-emerald-500" />
                  2. Imagem para Mobile (Celular)
                </Label>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                  1080 × 1080 px (1:1)
                </span>
              </div>

              <div className="mt-2 flex items-start gap-3">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border photo-surface">
                  {form.mobileImageUrl ? (
                    <img
                      src={optimizeImageUrl(form.mobileImageUrl, { width: 200 }) ?? form.mobileImageUrl}
                      alt="Prévia Mobile"
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="grid h-full w-full place-items-center p-2 text-center text-[10px] font-semibold uppercase leading-tight text-muted-foreground">
                      Usa versão Desktop
                    </span>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <input
                    ref={mobileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="hidden"
                    onChange={(event) => void handleUpload(event.target.files?.[0], "mobile")}
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={saving || uploadingTarget !== null}
                      onClick={() => mobileInputRef.current?.click()}
                    >
                      {uploadingTarget === "mobile" ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <ImagePlus />
                      )}
                      {form.mobileImageUrl ? "Trocar mobile" : "Enviar mobile"}
                    </Button>

                    {form.mobileImageUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={saving || uploadingTarget !== null}
                        onClick={() => void handleRemoveImage("mobile")}
                      >
                        <Trash2 />
                        Remover
                      </Button>
                    )}
                  </div>

                  <p className="text-[11px] leading-tight text-muted-foreground">
                    Formato quadrado ou vertical para smartphones (1080×1080 ou 1080×1350). Se não enviar, adapta a imagem de desktop.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* DEMAIS DADOS DO BANNER */}
          <div className="space-y-2">
            <Label htmlFor="banner-eyebrow">Selo / Chamada superior (opcional)</Label>
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
              Deixe em branco para o banner aparecer apenas com a imagem (arte completa sem texto por cima).
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="banner-cta-label">Texto do botão (opcional)</Label>
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
              <p className="text-sm font-semibold text-foreground">Banner ativo</p>
              <p className="text-[11px] text-muted-foreground">
                Banners inativos saem do carrossel da home.
              </p>
            </div>
            <Switch
              checked={form.active}
              onCheckedChange={(checked) => update("active", checked)}
              aria-label="Banner ativo"
            />
          </div>

          <div className="sticky bottom-0 -mx-5 flex gap-3 border-t border-border bg-background px-5 py-4">
            <Button type="submit" variant="brand" size="lg" disabled={saving || uploadingTarget !== null}>
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
