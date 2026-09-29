import { Link } from "react-router-dom";
import { Home, SearchX } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { useSeo } from "@/hooks/use-seo";

const NotFound = () => {
  useSeo({
    title: "Página não encontrada | Hipertrofia Suplementos",
    description: "A página que você procurou não existe ou foi movida.",
    noindex: true,
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-hero px-6 text-center">
      <BrandLogo size="lg" />

      <SearchX className="h-12 w-12 text-primary" aria-hidden />

      <div className="space-y-2">
        <h1 className="font-display text-4xl tracking-tight text-foreground">
          Página não encontrada
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          O endereço acessado não existe ou o produto saiu do catálogo. Volte ao catálogo
          completo para continuar montando seu orçamento.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="brand" size="xl" asChild>
          <Link to="/catalogo">Ver catálogo</Link>
        </Button>
        <Button variant="outline" size="xl" asChild>
          <Link to="/">
            <Home />
            Ir para o início
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
