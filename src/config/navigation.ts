import {
  Activity,
  Cookie,
  Dumbbell,
  FlaskConical,
  Flame,
  Milk,
  Nut,
  Package,
  Pill,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type NavLink = {
  label: string;
  href: string;
};

export const PRIMARY_NAV: NavLink[] = [
  { label: "Início", href: "/" },
  { label: "Catálogo", href: "/catalogo" },
  { label: "Ofertas", href: "/catalogo?ordem=discount" },
  { label: "Meu orçamento", href: "/orcamento" },
];

export const FOOTER_QUICK_LINKS: NavLink[] = [
  { label: "Início", href: "/" },
  { label: "Catálogo completo", href: "/catalogo" },
  { label: "Ofertas do mês", href: "/catalogo?ordem=discount" },
  { label: "Meu orçamento", href: "/orcamento" },
];

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "whey-protein": Milk,
  creatina: FlaskConical,
  "pre-treino": Zap,
  hipercalorico: Flame,
  "barras-e-snacks": Cookie,
  vitaminas: Pill,
  termogenicos: Activity,
  "pasta-de-amendoim": Nut,
  acessorios: Dumbbell,
  outros: Package,
};

export const getCategoryIcon = (slug: string): LucideIcon =>
  CATEGORY_ICONS[slug] ?? Package;
