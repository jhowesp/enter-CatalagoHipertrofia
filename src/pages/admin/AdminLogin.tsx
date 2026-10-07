import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, Loader2, LogIn, UserPlus } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSeo } from "@/hooks/use-seo";
import { supabase } from "@/integrations/supabase/client";

/**
 * ATENÇÃO: o modo "criar acesso" existe apenas para criar a PRIMEIRA conta de
 * administrador (o painel do Enter Cloud não oferece cadastro de usuário).
 * Ele deve ser removido e o cadastro público desativado assim que a conta existir.
 */
/** Traduz o erro do serviço de autenticação para algo acionável na tela. */
const describeAuthError = (message: string | undefined): string => {
  const text = (message ?? "").toLowerCase();

  if (text.includes("already registered") || text.includes("already been registered")) {
    return "Este e-mail já tem conta criada. Use a opção Entrar com a mesma senha, ou recupere a senha.";
  }
  if (text.includes("weak_password") || text.includes("at least 6")) {
    return "Senha muito curta: o mínimo é 6 caracteres. Recomendo 8 ou mais, misturando letras e números.";
  }
  if (text.includes("unable to validate email") || text.includes("invalid format")) {
    return "E-mail em formato inválido. Confira se digitou corretamente, sem espaços.";
  }
  if (text.includes("rate limit") || text.includes("too many")) {
    return "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.";
  }
  if (text.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos. Se ainda não criou a conta, use a opção de criar acesso.";
  }
  if (text.includes("signups not allowed")) {
    return "O cadastro está fechado neste momento. Me peça para abrir novamente.";
  }
  if (text.includes("email not confirmed")) {
    return "E-mail ainda não confirmado nesta conta. Me avise que eu confirmo no backend.";
  }

  return message?.trim() || "Erro inesperado. Me diga o que apareceu aqui e eu verifico.";
};

/** Mostra a explicação amigável e, entre parênteses, o texto exato do serviço. */
const reportAuthError = (raw: string | undefined, fallback: string): string => {
  const detail = (raw ?? "").trim();
  if (!detail) return fallback;

  const friendly = describeAuthError(detail);
  return friendly === detail ? friendly : `${friendly} (detalhe técnico: ${detail})`;
};

const AdminLogin = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  const goToPanelIfAdmin = async (): Promise<boolean> => {
    const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");

    if (adminError || isAdmin !== true) {
      await supabase.auth.signOut();
      setError(
        `A conta ${email.trim()} foi autenticada, mas este e-mail não está na lista de administradores da loja. ` +
          "Me avise e eu incluo o e-mail correto na lista.",
      );
      return false;
    }

    navigate("/admin", { replace: true });
    return true;
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError || !data.session) {
        setError(reportAuthError(signInError?.message, "Não foi possível entrar."));
        return;
      }

      await goToPanelIfAdmin();
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (password.length < 8) {
      setError("Use uma senha com pelo menos 8 caracteres.");
      return;
    }

    if (password !== passwordConfirm) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (signUpError) {
        setError(reportAuthError(signUpError.message, "Não foi possível criar a conta."));
        return;
      }

      if (!data.session) {
        setNotice(
          "Conta criada. Se o login não entrar automaticamente, use a aba Entrar com o mesmo e-mail e senha.",
        );
        setMode("login");
        return;
      }

      await goToPanelIfAdmin();
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
              {mode === "login"
                ? "Área restrita para gestão do catálogo e dos orçamentos."
                : "Criação da conta de administrador (uso único)."}
            </p>
          </div>
        </div>

        {mode === "signup" && (
          <Alert>
            <UserPlus />
            <AlertTitle>Criação temporária liberada</AlertTitle>
            <AlertDescription>
              Use o e-mail que já está autorizado como administrador. Depois de criar a conta,
              avise para eu fechar este cadastro novamente.
            </AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={mode === "login" ? handleLogin : handleSignup}
          className="space-y-4"
          noValidate
        >
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
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="h-12"
              required
            />
          </div>

          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="admin-password-confirm">Repita a senha</Label>
              <Input
                id="admin-password-confirm"
                type="password"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                placeholder="••••••••"
                className="h-12"
                required
              />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <KeyRound />
              <AlertTitle>
                {mode === "login"
                  ? "Não foi possível entrar"
                  : "Não foi possível criar a conta"}
              </AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {notice && (
            <Alert>
              <KeyRound />
              <AlertTitle>Conta criada</AlertTitle>
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" variant="brand" size="xl" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : mode === "login" ? (
              <LogIn />
            ) : (
              <UserPlus />
            )}
            {mode === "login" ? "Entrar" : "Criar acesso"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            setNotice(null);
          }}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === "login"
            ? "Primeiro acesso? Criar a conta de administrador"
            : "Já tenho conta, quero entrar"}
        </button>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          O cadastro público de clientes não existe: esta tela serve apenas para o acesso
          administrativo da loja.
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
