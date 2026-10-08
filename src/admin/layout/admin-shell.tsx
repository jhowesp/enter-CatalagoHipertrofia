import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  ExternalLink,
  FolderTree,
  Image,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  ShoppingBag,
  Tags,
} from "lucide-react";

import { useAdminSession } from "@/admin/auth/use-admin-session";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/produtos", label: "Produtos", icon: ShoppingBag, end: false },
  { to: "/admin/banners", label: "Banners", icon: Image, end: false },
  { to: "/admin/categorias", label: "Categorias", icon: FolderTree, end: false },
  { to: "/admin/marcas", label: "Marcas", icon: Tags, end: false },
  { to: "/admin/orcamentos", label: "Orçamentos", icon: Receipt, end: false },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="grid gap-1">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/15 text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )
          }
        >
          <item.icon className="h-4 w-4" aria-hidden />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

/**
 * Estrutura do painel: menu lateral, cabeçalho com o e-mail autenticado e a área da página.
 * A permissão real está no banco (políticas de RLS), não aqui.
 */
export function AdminShell() {
  const { signOut } = useAdminSession();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setEmail(data.session?.user.email ?? null);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-lg" className="lg:hidden" aria-label="Abrir menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[82vw] p-0 sm:max-w-xs">
              <SheetHeader className="border-b border-border px-5 py-4 text-left">
                <SheetTitle className="font-display text-lg uppercase">Painel</SheetTitle>
                <SheetDescription className="text-xs">
                  Gestão do catálogo e dos orçamentos.
                </SheetDescription>
              </SheetHeader>
              <div className="px-3 py-4">
                <NavList />
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/admin" aria-label="Painel da Hipertrofia Suplementos">
            <BrandLogo size="sm" />
          </Link>

          <span className="ml-2 hidden text-[11px] font-semibold uppercase tracking-[0.28em] text-primary sm:inline">
            Painel
          </span>

          <div className="ml-auto flex items-center gap-2">
            {email && (
              <span className="hidden max-w-[220px] truncate text-xs text-muted-foreground md:inline">
                {email}
              </span>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to="/" target="_blank">
                <ExternalLink />
                Ver site
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-border p-4 lg:block">
          <NavList />
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
