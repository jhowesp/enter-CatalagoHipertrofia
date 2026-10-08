import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";

import { useAdminSession } from "@/admin/auth/use-admin-session";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">Verificando seu acesso...</p>
    </div>
  );
}

function ForbiddenScreen({
  email,
  onSignOut,
}: {
  email?: string | null;
  onSignOut: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-gradient-hero px-6 text-center">
      <BrandLogo size="lg" />
      <ShieldAlert className="h-10 w-10 text-foreground" aria-hidden />
      <div className="space-y-2">
        <h1 className="font-display text-2xl tracking-tight text-foreground">
          Acesso não autorizado
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {email ? `A conta ${email} não é` : "Esta conta não é"} um administrador da loja.
          Somente e-mails cadastrados na lista de administradores podem acessar o painel.
        </p>
      </div>
      <Button variant="outline" size="lg" onClick={onSignOut}>
        Sair desta conta
      </Button>
    </div>
  );
}

/** Bloqueia todo o /admin: sem sessão vai para o login, sem autorização mostra o aviso. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, user, signOut } = useAdminSession();

  if (status === "loading") return <LoadingScreen />;
  if (status === "anonymous") return <Navigate to="/admin/login" replace />;
  if (status === "forbidden") {
    return <ForbiddenScreen email={user?.email} onSignOut={signOut} />;
  }

  return <>{children}</>;
}
