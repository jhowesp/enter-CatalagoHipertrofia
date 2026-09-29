import { useState } from "react";
import { Check, Loader2, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { slugify } from "@/lib/slug";

export type EntityItem = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
};

type EntityManagerProps<T extends EntityItem> = {
  title: string;
  description: string;
  items: T[];
  loading?: boolean;
  createLabel: string;
  onCreate: (input: { name: string; slug: string }) => Promise<unknown>;
  onUpdate: (
    id: string,
    input: { name: string; slug: string; active: boolean },
  ) => Promise<unknown>;
  onChanged: () => void;
};

/**
 * Gerenciador reutilizável de categorias e marcas:
 * cadastro rápido, edição em linha e ativação/desativação.
 */
export function EntityManager<T extends EntityItem>({
  title,
  description,
  items,
  loading = false,
  createLabel,
  onCreate,
  onUpdate,
  onChanged,
}: EntityManagerProps<T>) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      toast.error("Informe um nome com pelo menos 2 letras.");
      return;
    }

    setCreating(true);
    try {
      await onCreate({ name: cleanName, slug: slugify(cleanName) });
      setName("");
      toast.success(`${createLabel} cadastrado.`);
      onChanged();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao cadastrar.";
      toast.error(
        message.includes("duplicate")
          ? "Já existe um registro com este endereço (slug)."
          : message,
      );
    } finally {
      setCreating(false);
    }
  };

  const startEditing = (item: T) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditSlug(item.slug);
  };

  const saveEditing = async (item: T) => {
    if (editName.trim().length < 2) {
      toast.error("Nome muito curto.");
      return;
    }

    setSavingId(item.id);
    try {
      await onUpdate(item.id, {
        name: editName.trim(),
        slug: slugify(editSlug || editName),
        active: item.active,
      });
      setEditingId(null);
      toast.success("Alterações salvas.");
      onChanged();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao salvar.";
      toast.error(
        message.includes("duplicate")
          ? "Já existe um registro com este endereço (slug)."
          : message,
      );
    } finally {
      setSavingId(null);
    }
  };

  const toggleActive = async (item: T, active: boolean) => {
    setSavingId(item.id);
    try {
      await onUpdate(item.id, { name: item.name, slug: item.slug, active });
      toast.success(active ? "Ativado." : "Desativado.");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao alterar status.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>

      <form
        onSubmit={handleCreate}
        className="grid gap-4 rounded-xl border border-border bg-card p-5 surface-card sm:grid-cols-[1fr_auto] sm:items-end"
      >
        <div className="space-y-2">
          <Label htmlFor="entity-name">Nome</Label>
          <Input
            id="entity-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={createLabel === "Categoria" ? "Ex.: Aminoácidos" : "Ex.: Dux Nutrition"}
            className="h-11"
          />
          <p className="text-[11px] text-muted-foreground">
            Endereço na URL: {name.trim() ? slugify(name) : "gerado-automaticamente"}
          </p>
        </div>
        <Button type="submit" variant="brand" size="lg" disabled={creating}>
          {creating ? <Loader2 className="animate-spin" /> : <Plus />}
          Cadastrar {createLabel.toLowerCase()}
        </Button>
      </form>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-12 w-full animate-pulse rounded-md bg-secondary/60"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Nenhum registro cadastrado ainda.
          </p>
        ) : (
          <ul>
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 last:border-0 sm:flex-row sm:items-center"
              >
                {editingId === item.id ? (
                  <>
                    <div className="grid flex-1 gap-2 sm:grid-cols-2">
                      <Input
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        aria-label={`Nome de ${item.name}`}
                      />
                      <Input
                        value={editSlug}
                        onChange={(event) => setEditSlug(event.target.value)}
                        aria-label={`Endereço de ${item.name}`}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="brand"
                        size="sm"
                        disabled={savingId === item.id}
                        onClick={() => void saveEditing(item)}
                      >
                        {savingId === item.id ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Check />
                        )}
                        Salvar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                        disabled={savingId === item.id}
                      >
                        <X />
                        Cancelar
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{item.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        /{item.slug}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Switch
                          checked={item.active}
                          disabled={savingId === item.id}
                          onCheckedChange={(value) => void toggleActive(item, value)}
                          aria-label={`${item.active ? "Desativar" : "Ativar"} ${item.name}`}
                        />
                        {item.active ? "Ativo" : "Inativo"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(item)}
                      >
                        <Pencil />
                        Editar
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
