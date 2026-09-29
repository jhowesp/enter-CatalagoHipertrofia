import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { STORE, WHATSAPP_DISPLAY } from "@/config/store";
import { buildSupportMessage, whatsappUrl } from "@/lib/whatsapp";

export function WhatsappCtaBand() {
  return (
    <section className="overflow-hidden rounded-2xl border border-primary/30 bg-gradient-hero">
      <div className="flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="space-y-2">
          <h2 className="font-display text-2xl tracking-tight text-foreground sm:text-3xl">
            Não achou o que procura?
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            Chame no WhatsApp e conte o que você precisa. Confirmamos disponibilidade,
            valores e a forma de retirada em {STORE.locationLabel}.
          </p>
        </div>

        <Button variant="brand" size="xl" asChild className="w-full shrink-0 sm:w-auto">
          <a href={whatsappUrl(buildSupportMessage())} target="_blank" rel="noreferrer">
            <MessageCircle />
            Falar com a loja
          </a>
        </Button>
      </div>

      <div className="border-t border-border/60 px-6 py-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:px-8">
        WhatsApp {WHATSAPP_DISPLAY} • {STORE.openingDays}, {STORE.openingHours}
      </div>
    </section>
  );
}
