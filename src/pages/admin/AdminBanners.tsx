import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Loader2, Monitor, Pencil, Plus, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { BannerFormSheet } from "@/admin/components/banner-form-sheet";
import { BannerPreview } from "@/admin/components/banner-preview";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MAX_BANNERS } from "@/config/store";
import { useSeo } from "@/hooks/use-seo";
import {
  deleteBanner,
  listAdminBanners,
  moveBanner,
  setBannerActive,
} from "@/services/banners";
import { removeBannerImageByUrl } from "@/services/storage";
import type { Banner } from "@/types/banner";
import { bannerLabel } from "@/types/banner";
import { cn } from "@/lib/utils";

const AdminBanners = () => {
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [toDelete, setToDelete] = useState<Banner | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useSeo({
    title: "Banners | Painel Hipertrofia Suplementos",
    description: "Banners promocionais da home.",
    path: "/admin/banners",
    noindex: true,
  });

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: listAdminBanners,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
    void queryClient.invalidateQueries({ queryKey: ["banners", "active"] });
  };

  const limitReached = banners.length >= MAX_BANNERS;

  const handleToggleActive = async (banner: Banner, active: boolean) => {
    setBusyId(banner.id);
    try {
      await setBannerActive(banner.id, active);
      toast.success(active ? "Banner ativado." : "Banner desativado.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao alterar o banner.");
    } finally {
      setBusyId(null);
    }
  };

  const handleMove = async (banner: Banner, direction: "up" | "down") => {
    setBusyId(banner.id);
    try {
      await moveBanner(banner.id, direction);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao reordenar.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;

    try {
      await deleteBanner(toDelete.id);
      await removeBannerImageByUrl(toDelete.imageUrl);
      toast.success("Banner excluído.");
      setToDelete(null);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir o banner.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight text-foreground">Banners</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {banners.length} de {MAX_BANNERS} banners. A ordem aqui é a ordem do carrossel na
            home; sem nenhum banner ativo, a home volta ao banner padrão da marca.
          </p>
        </div>

        <Button
          variant="brand"
          size="lg"
          disabled={limitReached}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus />
          Novo banner
        </Button>
      </div>

      {limitReached && (
        <p className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-xs text-warning">
          Limite de {MAX_BANNERS} banners atingido. Exclua um para criar outro — carrossel muito
          longo cansa o cliente.
        </p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="h-40 w-full animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
          <p className="font-display text-lg uppercase tracking-tight text-foreground">
            Nenhum banner cadastrado
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Enquanto não houver banner ativo, a home mostra o banner padrão da marca.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {banners.map((banner, index) => (
            <li
              key={banner.id}
              className={cn(
                "grid gap-4 rounded-xl border border-border bg-card p-4 surface-card lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]",
                !banner.active && "opacity-70",
              )}
            >
              <BannerPreview
                data={{
                  eyebrow: banner.eyebrow,
                  title: banner.title,
                  subtitle: banner.subtitle,
                  imageUrl: banner.imageUrl,
                  mobileImageUrl: banner.mobileImageUrl,
                  ctaLabel: banner.ctaLabel,
                }}
                className="h-[132px]"
              />

              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-semibold text-foreground">
                      {banner.title ?? "Banner só com imagem"}
                      {banner.isDemo && (
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          demonstração
                        </Badge>
                      )}
                    </p>
                    {banner.eyebrow && (
                      <p className="truncate text-[11px] uppercase tracking-[0.18em] text-foreground">
                        {banner.eyebrow}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {banner.imageUrl && (
                        <Badge variant="outline" className="gap-1 text-[10px] font-normal">
                          <Monitor className="h-3 w-3 text-primary" /> Desktop
                        </Badge>
                      )}
                      {banner.mobileImageUrl ? (
                        <Badge variant="outline" className="gap-1 text-[10px] font-normal border-emerald-500/30 text-emerald-500">
                          <Smartphone className="h-3 w-3" /> Mobile
                        </Badge>
                      ) : banner.imageUrl ? (
                        <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                          Mobile: adaptação
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Posição {index + 1}
                  </span>
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={banner.active}
                      disabled={busyId === banner.id}
                      onCheckedChange={(value) => void handleToggleActive(banner, value)}
                      aria-label={`Banner ${bannerLabel(banner)} ativo`}
                    />
                    {banner.active ? "Ativo" : "Inativo"}
                  </label>

                  <div className="ml-auto flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={index === 0 || busyId === banner.id}
                      onClick={() => void handleMove(banner, "up")}
                      aria-label={`Mover ${bannerLabel(banner)} para cima`}
                    >
                      {busyId === banner.id ? <Loader2 className="animate-spin" /> : <ArrowUp />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={index === banners.length - 1 || busyId === banner.id}
                      onClick={() => void handleMove(banner, "down")}
                      aria-label={`Mover ${bannerLabel(banner)} para baixo`}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(banner);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-muted-foreground hover:border-destructive/60 hover:text-destructive"
                      onClick={() => setToDelete(banner)}
                      aria-label={`Excluir banner ${bannerLabel(banner)}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <BannerFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        banner={editing}
        nextPosition={banners.length}
        onSaved={refresh}
      />

      <AlertDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir o banner "{toDelete ? bannerLabel(toDelete) : ""}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O banner sai do carrossel da home e a imagem enviada é removida do armazenamento.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDelete()}
            >
              <Trash2 />
              Excluir banner
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBanners;
