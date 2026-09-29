import { MessageCircle } from "lucide-react";

import { buildSupportMessage, whatsappUrl } from "@/lib/whatsapp";

/** Botão flutuante do WhatsApp (telas a partir de md, onde não há barra inferior). */
export function WhatsappFloat() {
  return (
    <a
      href={whatsappUrl(buildSupportMessage())}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar no WhatsApp da loja"
      className="fixed bottom-6 right-6 z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-[0_18px_40px_-16px_hsl(var(--primary)/0.95)] transition-transform hover:scale-105 md:flex"
    >
      <MessageCircle className="h-6 w-6" aria-hidden />
      <span className="absolute inset-0 -z-10 animate-pulse-glow rounded-full" aria-hidden />
    </a>
  );
}
