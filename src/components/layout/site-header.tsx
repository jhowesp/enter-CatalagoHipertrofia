import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Menu, MessageCircle, Search, ShoppingCart } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PRIMARY_NAV, getCategoryIcon } from "@/config/navigation";
import { INSTAGRAM_URL, STORE, WHATSAPP_DISPLAY } from "@/config/store";
import { useQuoteCart } from "@/context/quote-cart";
import { buildSupportMessage, whatsappUrl } from "@/lib/whatsapp";
import { listCategories } from "@/services/catalog";
import { cn } from "@/lib/utils";

const supportUrl = whatsappUrl(buildSupportMessage());

export function SiteHeader() {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const { totalUnits, openCart } = useQuoteCart();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
    staleTime: 5 * 60 * 1000,
  });

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = term.trim();
    navigate(query ? `/catalogo?q=${encodeURIComponent(query)}` : "/catalogo");
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-lg">
      <div className="border-b border-border/70 bg-gradient-to-r from-primary/15 via-transparent to-transparent">
        <div className="container flex items-center justify-between gap-3 py-2 text-[11px] text-muted-foreground">
          <span className="truncate">
            {STORE.locationLabel} • Atendimento {STORE.openingHours}
          </span>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden shrink-0 font-semibold text-foreground/80 hover:text-primary sm:inline"
          >
            @{STORE.instagramHandle}
          </a>
        </div>
      </div>

      <div className="container flex items-center gap-3 py-3">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon-lg"
              className="lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[86vw] overflow-y-auto p-0 sm:max-w-sm">
            <SheetHeader className="border-b border-border px-5 py-4 text-left">
              <SheetTitle className="font-display text-lg uppercase">
                Navegação
              </SheetTitle>
              <SheetDescription className="text-xs">
                Busque, escolha a categoria e monte seu orçamento.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-5 py-4">
              <form onSubmit={submitSearch} className="flex gap-2">
                <Input
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                  placeholder="Buscar produto"
                  aria-label="Buscar produto"
                  className="h-11"
                />
                <Button type="submit" size="icon-lg" aria-label="Buscar">
                  <Search />
                </Button>
              </form>

              <nav className="grid gap-1">
                {PRIMARY_NAV.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-md px-3 py-3 text-sm font-semibold uppercase tracking-wide text-foreground hover:bg-accent"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Categorias
                </p>
                <div className="grid gap-1">
                  {categories.map((category) => {
                    const Icon = getCategoryIcon(category.slug);
                    return (
                      <Link
                        key={category.id}
                        to={`/catalogo?cat=${category.slug}`}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-accent"
                      >
                        <Icon className="h-4 w-4 text-primary" aria-hidden />
                        {category.name}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1 rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Atendimento</p>
                <p>WhatsApp {WHATSAPP_DISPLAY}</p>
                <p>
                  {STORE.openingDays}, {STORE.openingHours}
                </p>
                <p>{STORE.locationLabel}</p>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Link to="/" className="shrink-0" aria-label={`${STORE.name} — início`}>
          <BrandLogo size="md" />
        </Link>

        <nav className="ml-2 hidden items-center gap-1 lg:flex">
          {PRIMARY_NAV.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <form
          onSubmit={submitSearch}
          className="relative ml-auto hidden max-w-xs flex-1 md:block"
        >
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Buscar whey, creatina, pré-treino..."
            aria-label="Buscar produto"
            className="h-11 pl-9"
          />
        </form>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Button
            variant="whatsapp"
            size="icon-lg"
            asChild
            className="hidden sm:inline-flex"
            aria-label="Falar no WhatsApp"
          >
            <a href={supportUrl} target="_blank" rel="noreferrer">
              <MessageCircle />
            </a>
          </Button>

          <Button
            type="button"
            variant="brand"
            size="lg"
            className={cn("relative", "px-3 sm:px-4")}
            onClick={openCart}
            aria-label="Abrir meu orçamento"
          >
            <ShoppingCart />
            <span className="hidden sm:inline">Meu orçamento</span>
            {totalUnits > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-background bg-foreground px-1 text-[10px] font-bold text-background">
                {totalUnits}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
