import { useState } from "react";
import { Flame, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteDemoData } from "@/services/admin";

type DemoDataCardProps = {
  productCount: number;
  bannerCount: number;
  onRemoved: () => void;
};

/**
 * Dados de demonstração: marcados no banco por `is_demo` (produtos e banners)
 * e removíveis em um clique antes de entrar o catálogo real.
 */
export function DemoDataCard({ productCount, bannerCount, onRemoved }: DemoDataCardProps) {
  const [removing, setRemoving] = useState(false);

  const total = productCount + bannerCount;
  if (total <= 0) return null;

  const parts = [
    productCount > 0
      ? `${productCount} ${productCount === 1 ? "produto" : "produtos"}`
      : null,
    bannerCount > 0 ? `${bannerCount} ${bannerCount === 1 ? "banner" : "banners"}` : null,
  ].filter(Boolean);

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const result = await deleteDemoData();
      toast.success(
        `Removido: ${result.products} produto(s) e ${result.banners} banner(s) de demonstração.`,
      );
      onRemoved();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível remover os itens.",
      );
    } finally {
      setRemoving(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-secondary/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <Flame className="mt-0.5 h-5 w-5 shrink-0 text-foreground" aria-hidden />
          <div className="space-y-1">
            <h2 className="font-display text-lg tracking-tight text-foreground">
              {parts.join(" e ")} de demonstração
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Estes itens existem só para validar a interface e não são o catálogo definitivo.
              Você pode removê-los todos de uma vez antes de cadastrar os dados reais — os
              orçamentos já enviados são preservados. Itens que você editar deixam de ser
              demonstração.
            </p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="lg" disabled={removing}>
              {removing ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Remover dados de demonstração
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover os dados de demonstração?</AlertDialogTitle>
              <AlertDialogDescription>
                Serão excluídos {parts.join(" e ")}. Categorias, marcas e orçamentos não são
                afetados. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => void handleRemove()}>
                Remover agora
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
