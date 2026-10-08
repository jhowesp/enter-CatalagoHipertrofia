import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock, Instagram, MapPin, MessageCircle } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { FOOTER_QUICK_LINKS } from "@/config/navigation";
import {
  INSTAGRAM_URL,
  QUOTE_NOTICE,
  STORE,
  WHATSAPP_DISPLAY,
} from "@/config/store";
import { buildSupportMessage, whatsappUrl } from "@/lib/whatsapp";
import { listCategories } from "@/services/catalog";

export function SiteFooter() {
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <footer className="mt-16 border-t border-border bg-gradient-soft">
      <div className="container grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <BrandLogo size="md" />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            {STORE.description}
          </p>
          <a
            href={whatsappUrl(buildSupportMessage())}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:underline"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            Falar no WhatsApp
          </a>
        </div>

        <div className="space-y-3">
          <h2 className="font-display text-base tracking-tight text-foreground">
            Atendimento
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-foreground" aria-hidden />
              <a
                href={whatsappUrl(buildSupportMessage())}
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground"
              >
                {WHATSAPP_DISPLAY}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Instagram className="mt-0.5 h-4 w-4 shrink-0 text-foreground" aria-hidden />
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground"
              >
                @{STORE.instagramHandle}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-foreground" aria-hidden />
              {STORE.locationLabel}
            </li>
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-foreground" aria-hidden />
              {STORE.openingDays}, {STORE.openingHours}
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="font-display text-base tracking-tight text-foreground">
            Navegação
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {FOOTER_QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <Link to={link.href} className="hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="font-display text-base tracking-tight text-foreground">
            Categorias
          </h2>
          <ul className="grid gap-2 text-sm text-muted-foreground">
            {categories.slice(0, 8).map((category) => (
              <li key={category.id}>
                <Link
                  to={`/catalogo?cat=${category.slug}`}
                  className="hover:text-foreground"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border/70">
        <div className="container flex flex-col gap-2 py-5 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {STORE.name}. Todos os direitos reservados.
          </p>
          <p>{QUOTE_NOTICE}</p>
        </div>
      </div>
    </footer>
  );
}
