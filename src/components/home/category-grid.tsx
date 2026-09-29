import { Link } from "react-router-dom";

import { getCategoryIcon } from "@/config/navigation";
import type { Category } from "@/types/catalog";

export function CategoryGrid({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {categories.map((category) => {
        const Icon = getCategoryIcon(category.slug);
        return (
          <Link
            key={category.id}
            to={`/catalogo?cat=${category.slug}`}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-4 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-glow"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-secondary text-primary transition-colors group-hover:border-primary/50 group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-sm font-semibold leading-tight text-foreground">
              {category.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
