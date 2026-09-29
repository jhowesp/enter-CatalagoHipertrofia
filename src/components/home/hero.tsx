import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, Clock, MapPin, MessageCircle, ShieldCheck, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { STORE, WHATSAPP_DISPLAY } from "@/config/store";
import { buildSupportMessage, whatsappUrl } from "@/lib/whatsapp";

const TRUST_ITEMS = [
  { icon: BadgeCheck, label: "Marcas originais" },
  { icon: Truck, label: "Retirada na loja" },
  { icon: ShieldCheck, label: "Orçamento sem compromisso" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-hero">
      <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_70%_40%,hsl(var(--primary)/0.22),transparent_62%)] lg:block" />
      <div className="container relative grid gap-8 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-20">
        <div className="space-y-6 animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            {STORE.locationLabel}
          </span>

          <h1 className="font-display text-4xl leading-[0.95] text-foreground sm:text-5xl lg:text-6xl">
            Treine pesado,
            <span className="block text-primary text-glow">suplemente certo</span>
          </h1>

          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Whey protein, creatina, pré-treino, hipercalórico e muito mais com atendimento
            direto no WhatsApp. Monte seu orçamento, envie e receba a confirmação da loja
            sem precisar criar conta.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="brand" size="xl" asChild>
              <Link to="/catalogo">
                Ver catálogo completo
                <ArrowRight />
              </Link>
            </Button>
            <Button variant="whatsapp" size="xl" asChild>
              <a
                href={whatsappUrl(buildSupportMessage())}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle />
                Falar no WhatsApp
              </a>
            </Button>
          </div>

          <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
            {TRUST_ITEMS.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
              >
                <item.icon className="h-4 w-4 text-primary" aria-hidden />
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative hidden lg:block">
          <div className="relative mx-auto w-full max-w-sm rounded-2xl border border-border bg-[radial-gradient(circle_at_50%_10%,hsl(0_0%_16%),hsl(0_0%_6%))] p-8 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Atendimento direto
            </p>
            <p className="mt-3 font-display text-4xl leading-none text-primary text-glow">
              {WHATSAPP_DISPLAY}
            </p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                {STORE.openingDays}, {STORE.openingHours}
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                {STORE.locationLabel}
              </li>
            </ul>
            <span className="absolute -bottom-4 left-6 rounded-lg border border-border bg-card px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground shadow-card">
              Orçamento sem compromisso
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
