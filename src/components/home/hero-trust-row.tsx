import { BadgeCheck, ShieldCheck, Truck } from "lucide-react";

import { cn } from "@/lib/utils";

const TRUST_ITEMS = [
  { icon: BadgeCheck, label: "Marcas originais" },
  { icon: Truck, label: "Retirada na loja" },
  { icon: ShieldCheck, label: "Orçamento sem compromisso" },
];

/** Faixa de selos de confiança usada pelo banner estático e pelo carrossel. */
export function HeroTrustRow({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-6 gap-y-2", className)}>
      {TRUST_ITEMS.map((item) => (
        <li
          key={item.label}
          className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
        >
          <item.icon className="h-4 w-4 text-foreground" aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
