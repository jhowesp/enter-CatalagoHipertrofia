import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/** Chave usada também pelo script de `index.html` (evita piscar o tema errado). */
export const THEME_STORAGE_KEY = "hipertrofia-tema";

/**
 * Tema claro/escuro do site.
 * O escuro é o padrão da marca; o cliente escolhe o claro pelo botão no cabeçalho
 * e a escolha fica salva no navegador.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      storageKey={THEME_STORAGE_KEY}
    >
      {children}
    </NextThemesProvider>
  );
}
