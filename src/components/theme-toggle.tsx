import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Botão de troca de tema. Fica no cabeçalho, em todas as páginas do catálogo.
 * O rótulo descreve a AÇÃO (para onde o clique leva), não o estado atual.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evita divergência entre o HTML do servidor estático e o tema real do cliente.
  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme !== "light" : true;

  const toggle = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);

    try {
      document.documentElement.style.colorScheme = next;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", next === "dark" ? "#0A0A0B" : "#FFFFFF");
    } catch {
      /* opcional: só o conforto da barra do navegador no celular */
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      onClick={toggle}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      aria-pressed={!isDark}
      className={cn(className)}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
