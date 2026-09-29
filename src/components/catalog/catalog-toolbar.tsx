import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SORT_OPTIONS, type SortOption } from "@/types/catalog";

type CatalogToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
  total: number;
  loading?: boolean;
};

export function CatalogToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  total,
  loading = false,
}: CatalogToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 surface-card sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por nome do produto, marca ou categoria"
          aria-label="Buscar produto"
          className="h-11 pl-9"
        />
      </div>

      <div className="flex items-center gap-3">
        <Select value={sort} onValueChange={(value) => onSortChange(value as SortOption)}>
          <SelectTrigger className="h-11 w-[172px]" aria-label="Ordenar produtos">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {loading ? "Carregando..." : `${total} ${total === 1 ? "produto" : "produtos"}`}
        </span>
      </div>
    </div>
  );
}
