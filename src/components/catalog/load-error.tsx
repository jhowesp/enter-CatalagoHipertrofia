import { RefreshCw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LoadErrorProps = {
  onRetry?: () => void;
  title?: string;
  description?: string;
  className?: string;
};

/**
 * Aviso de falha ao carregar (backend dormindo, internet do cliente, etc.).
 * Existe para não confundir "não consegui carregar" com "catálogo vazio".
 */
export function LoadError({
  onRetry,
  title = "Não conseguimos carregar os produtos agora",
  description = "Verifique sua conexão e tente de novo em alguns instantes.",
  className,
}: LoadErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center",
        className,
      )}
    >
      <WifiOff className="h-9 w-9 text-muted-foreground" aria-hidden />
      <p className="font-display text-lg uppercase tracking-tight text-foreground">
        {title}
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button type="button" variant="outline" size="lg" onClick={onRetry}>
          <RefreshCw />
          Tentar de novo
        </Button>
      )}
    </div>
  );
}
