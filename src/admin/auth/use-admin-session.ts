import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type AdminAuthStatus = "loading" | "anonymous" | "forbidden" | "authorized";

/**
 * Sessão do painel.
 *
 * A autorização de verdade é feita no banco (a função `is_admin()` compara o e-mail do
 * token com a lista de administradores e as políticas de RLS usam esse resultado).
 * Aqui só espelhamos isso para a interface — nunca gravamos permissão no navegador.
 */
export function useAdminSession() {
  const [status, setStatus] = useState<AdminAuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let active = true;

    const checkAdmin = () => {
      setTimeout(() => {
        void supabase.rpc("is_admin").then(({ data, error }) => {
          if (!active) return;
          setStatus(!error && data === true ? "authorized" : "forbidden");
        });
      }, 0);
    };

    const applySession = (nextSession: Session | null) => {
      if (!active) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setStatus("anonymous");
        return;
      }

      setStatus("loading");
      checkAdmin();
    };

    // Listener registrado antes de getSession para não perder a sessão restaurada.
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        applySession(nextSession);
      },
    );

    void supabase.auth.getSession().then(({ data }) => applySession(data.session));

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setStatus("anonymous");
  };

  return { status, user, session, signOut };
}
