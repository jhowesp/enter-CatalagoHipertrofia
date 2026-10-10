import { Suspense, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

/** Espera discreta enquanto um bloco de código é baixado (ex.: o painel). */
export function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center gap-3 bg-background text-sm text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      Carregando...
    </div>
  );
}

/** Envolve uma página carregada sob demanda com a espera padrão. */
export function SuspenseRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}
