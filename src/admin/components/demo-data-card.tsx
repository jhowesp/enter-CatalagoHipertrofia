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
import { deleteDemoProducts } from "@/services/admin";

type DemoDataCardProps = {
  count: number;
  onRemoved: () => void;
};

/**
 * Dados de demonstração: identificados no banco por `is_demo` e removíveis
 * em um clique antes de entrar o catálogo real.
 */
export function DemoDataCard({ count, onRemoved }: DemoDataCardProps) {
  const [removing, setRemoving] = useState(false);

  if (count <= 0) return null;

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const removed = await deleteDemoProducts();
      toast.success(`${removed} produtos de demonstração removidos.`);
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
    <section className="rounded-xl border border-primary/35 bg-primary/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <Flame className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="space-y-1">
            <h2 className="font-display text-lg tracking-tight text-foreground">
              {count} {count === 1 ? "produto de demonstração" : "produtos de demonstração"}
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Estes itens existem só para validar a interface e não são o catálogo
              definitivo. Você pode removê-los todos de uma vez antes de importar os produtos
              reais — os orçamentos já enviados são preservados. Produtos que você editar ou
              importar deixam de ser demonstração.
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
              <AlertDialogTitle>Remover os produtos de demonstração?</AlertDialogTitle>
              <AlertDialogDescription>
                Serão excluídos {count} produtos marcados como demonstração. Categorias,
                marcas e orçamentos não são afetados. Esta ação não pode ser desfeita.
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
