import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Brand, Category } from "@/types/catalog";
import { cn } from "@/lib/utils";

type FilterChangeHandler = (next: { cat?: string; marca?: string }) => void;

type FiltersPanelProps = {
  categories: Category[];
  brands: Brand[];
  categorySlug: string;
  brandSlug: string;
  onChange: FilterChangeHandler;
  onClear: () => void;
};

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        {title}
      </h3>
      <div className="grid gap-1">{children}</div>
    </section>
  );
}

function FilterOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
        active
          ? "border-foreground/40 bg-secondary text-foreground"
          : "border-transparent bg-secondary/40 text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <span className="truncate">{label}</span>
      {active && <X className="h-3.5 w-3.5 shrink-0 text-foreground" aria-hidden />}
    </button>
  );
}

function FiltersPanel({
  categories,
  brands,
  categorySlug,
  brandSlug,
  onChange,
  onClear,
}: FiltersPanelProps) {
  const hasFilters = Boolean(categorySlug || brandSlug);

  return (
    <div className="space-y-6">
      <FilterGroup title="Categorias">
        {categories.map((category) => (
          <FilterOption
            key={category.id}
            label={category.name}
            active={categorySlug === category.slug}
            onClick={() =>
              onChange({ cat: categorySlug === category.slug ? "" : category.slug })
            }
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Marcas">
        {brands.map((brand) => (
          <FilterOption
            key={brand.id}
            label={brand.name}
            active={brandSlug === brand.slug}
            onClick={() =>
              onChange({ marca: brandSlug === brand.slug ? "" : brand.slug })
            }
          />
        ))}
      </FilterGroup>

      {hasFilters && (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          onClick={onClear}
        >
          <X />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}

export function CatalogFilters(props: FiltersPanelProps) {
  const [open, setOpen] = useState(false);
  const activeCount = (props.categorySlug ? 1 : 0) + (props.brandSlug ? 1 : 0);

  return (
    <>
      <aside className="hidden lg:block">
        <div className="sticky top-32 rounded-xl border border-border bg-card p-4 surface-card">
          <FiltersPanel {...props} />
        </div>
      </aside>

      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="lg" className="w-full">
              <SlidersHorizontal />
              Filtros
              {activeCount > 0 && (
                <span className="ml-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
                  {activeCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[86vw] overflow-y-auto p-0 sm:max-w-sm"
          >
            <SheetHeader className="border-b border-border px-5 py-4 text-left">
              <SheetTitle className="font-display text-lg uppercase">
                Filtrar catálogo
              </SheetTitle>
              <SheetDescription className="text-xs">
                Escolha categoria e marca para encontrar mais rápido.
              </SheetDescription>
            </SheetHeader>
            <div className="px-5 py-5">
              <FiltersPanel {...props} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
