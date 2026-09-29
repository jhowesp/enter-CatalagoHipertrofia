import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, Loader2, LogIn } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSeo } from "@/hooks/use-seo";
import { supabase } from "@/integrations/supabase/client";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSeo({
    title: "Acesso ao painel | Hipertrofia Suplementos",
    description: "Área restrita da loja.",
    path: "/admin/login",
    noindex: true,
  });

  // Quem já está autenticado e autorizado não precisa ver o formulário.
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active || !data.session) return;
      const { data: isAdmin } = await supabase.rpc("is_admin");
      if (active && isAdmin === true) navigate("/admin", { replace: true });
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError || !data.session) {
        setError(
          signInError?.message === "Invalid login credentials"
            ? "E-mail ou senha incorretos."
            : (signInError?.message ?? "Não foi possível entrar."),
        );
        return;
      }

      const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");

      if (adminError || isAdmin !== true) {
        await supabase.auth.signOut();
        setError(
          "Esta conta não tem acesso ao painel. Somente e-mails cadastrados como administradores podem entrar.",
        );
        return;
      }

      navigate("/admin", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-6 surface-card sm:p-8">
        <div className="space-y-3 text-center">
          <BrandLogo size="lg" className="justify-center" />
          <div>
            <h1 className="font-display text-2xl tracking-tight text-foreground">
              Painel da loja
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Área restrita para gestão do catálogo e dos orçamentos.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="admin-email">E-mail</Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seuemail@exemplo.com"
              className="h-12"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-password">Senha</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="h-12"
              required
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <KeyRound />
              <AlertTitle>Não foi possível entrar</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" variant="brand" size="xl" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <LogIn />}
            Entrar
          </Button>
        </form>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          O cadastro de novas contas está desativado. Para liberar outro administrador, o
          e-mail precisa ser incluído na lista de administradores da loja.
        </p>

        <p className="text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            Voltar para o site
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
