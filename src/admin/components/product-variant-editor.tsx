import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export type VariantDraftRow = {
  flavor: string;
  /** Vazio = herda o preço do produto. */
  price: string;
  salePrice: string;
  stock: string;
  active: boolean;
};

// eslint-disable-next-line react-refresh/only-export-components
export const EMPTY_VARIANT_ROW: VariantDraftRow = {
  flavor: "",
  price: "",
  salePrice: "",
  stock: "0",
  active: true,
};

type ProductVariantEditorProps = {
  rows: VariantDraftRow[];
  onChange: (rows: VariantDraftRow[]) => void;
  /** Preço de venda do produto, usado só para orientar na tela. */
  productPrice: string;
  disabled?: boolean;
};

/**
 * Sabores do produto (ex.: o mesmo whey em Baunilha, Chocolate e Morango).
 * Cada sabor tem estoque próprio e pode ter preço promocional próprio; em branco,
 * o sabor herda o preço do produto.
 */
export function ProductVariantEditor({
  rows,
  onChange,
  productPrice,
  disabled = false,
}: ProductVariantEditorProps) {
  const updateRow = (index: number, patch: Partial<VariantDraftRow>) => {
    onChange(rows.map((row, itemIndex) => (itemIndex === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => onChange([...rows, { ...EMPTY_VARIANT_ROW }]);

  const removeRow = (index: number) =>
    onChange(rows.filter((_, itemIndex) => itemIndex !== index));

  return (
    <div className="space-y-3 rounded-lg border border-border bg-secondary/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Label>Sabores do produto</Label>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Cada sabor tem estoque próprio. Em branco, o preço do sabor é o preço de venda do
            produto
            {productPrice.trim() ? ` (${productPrice.trim()})` : ""}. Deixe a lista vazia se o
            produto tem um sabor único.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={disabled}>
          <Plus />
          Adicionar sabor
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Nenhum sabor cadastrado. Use o campo "Sabor" acima para um produto de sabor único.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row, index) => (
            <li
              key={index}
              className="grid gap-2 rounded-md border border-border bg-card p-3 sm:grid-cols-12"
            >
              <div className="sm:col-span-4">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Sabor
                </Label>
                <Input
                  value={row.flavor}
                  onChange={(event) => updateRow(index, { flavor: event.target.value })}
                  placeholder="Baunilha"
                  className="mt-1 h-10"
                  disabled={disabled}
                />
              </div>

              <div className="sm:col-span-3">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Preço próprio
                </Label>
                <Input
                  value={row.price}
                  onChange={(event) => updateRow(index, { price: event.target.value })}
                  placeholder="herda"
                  inputMode="decimal"
                  className="mt-1 h-10"
                  disabled={disabled}
                />
              </div>

              <div className="sm:col-span-2">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Promocional
                </Label>
                <Input
                  value={row.salePrice}
                  onChange={(event) => updateRow(index, { salePrice: event.target.value })}
                  placeholder="—"
                  inputMode="decimal"
                  className="mt-1 h-10"
                  disabled={disabled}
                />
              </div>

              <div className="sm:col-span-1">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Estoque
                </Label>
                <Input
                  value={row.stock}
                  onChange={(event) => updateRow(index, { stock: event.target.value })}
                  inputMode="numeric"
                  className="mt-1 h-10"
                  disabled={disabled}
                />
              </div>

              <div className="flex items-end justify-between gap-2 sm:col-span-2">
                <label className="flex items-center gap-2 pb-2 text-[11px] text-muted-foreground">
                  <Switch
                    checked={row.active}
                    onCheckedChange={(checked) => updateRow(index, { active: checked })}
                    disabled={disabled}
                    aria-label={`Sabor ${row.flavor || index + 1} ativo`}
                  />
                  Ativo
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  onClick={() => removeRow(index)}
                  disabled={disabled}
                  aria-label={`Remover sabor ${row.flavor || index + 1}`}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
