import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  MessageCircle,
  ShoppingCart,
} from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STORE, WHATSAPP_DISPLAY } from "@/config/store";
import { useQuoteCart } from "@/context/quote-cart";
import { useSeo } from "@/hooks/use-seo";
import { formatCurrency, maskPhoneInput, onlyDigits } from "@/lib/format";
import {
  buildQuoteMessage,
  closePendingWindow,
  openPendingWhatsappWindow,
  sendPendingWindowToWhatsapp,
  whatsappUrl,
} from "@/lib/whatsapp";
import { getProductsByIds } from "@/services/catalog";
import { createQuote } from "@/services/quotes";
import type { CatalogProduct, QuoteSummaryItem } from "@/types/catalog";

const formSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, "Informe seu nome (pelo menos 2 letras).")
    .max(120, "Nome muito longo."),
  customerWhatsapp: z
    .string()
    .trim()
    .refine((value) => onlyDigits(value).length >= 10, {
      message: "Informe um WhatsApp válido com DDD.",
    }),
  notes: z.string().trim().max(500, "Observação muito longa.").optional(),
});

type FormValues = z.infer<typeof formSchema>;

type Step = "idle" | "saving" | "success" | "error";

const FinalizarOrcamento = () => {
  const { items, totalValue, clear } = useQuoteCart();
  const [step, setStep] = useState<Step>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{
    quoteId: string;
    total: number;
    items: QuoteSummaryItem[];
    whatsappUrl: string;
    whatsappOpened: boolean;
  } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { customerName: "", customerWhatsapp: "", notes: "" },
  });

  useSeo({
    title: "Finalizar orçamento pelo WhatsApp | Hipertrofia Suplementos",
    description:
      "Informe seu nome e WhatsApp para enviar o orçamento montado no catálogo da Hipertrofia Suplementos.",
    path: "/orcamento/finalizar",
    noindex: true,
  });

  const onSubmit = async (values: FormValues) => {
    if (items.length === 0) return;

    setErrorMessage(null);
    setStep("saving");

    // Abrimos a aba antes de qualquer espera: assim o navegador não bloqueia o pop-up.
    const pendingWindow = openPendingWhatsappWindow();

    // 1. Confere os produtos e os preços atuais direto no catálogo (fonte da verdade).
    let currentProducts: CatalogProduct[];
    try {
      currentProducts = await getProductsByIds(items.map((item) => item.productId));
    } catch {
      closePendingWindow(pendingWindow);
      setStep("error");
      setErrorMessage(
        "Não foi possível confirmar os produtos agora. Verifique sua conexão e tente novamente.",
      );
      return;
    }

    const productsById = new Map(currentProducts.map((product) => [product.id, product]));
    const unavailable = items.filter((item) => !productsById.has(item.productId));

    if (unavailable.length > 0) {
      closePendingWindow(pendingWindow);
      setStep("error");
      setErrorMessage(
        `Estes produtos saíram do catálogo: ${unavailable
          .map((item) => item.name)
          .join(", ")}. Remova do orçamento para continuar.`,
      );
      return;
    }

    const summaryItems: QuoteSummaryItem[] = items.map((item) => {
      const product = productsById.get(item.productId)!;
      return {
        productId: product.id,
        name: product.name,
        quantity: item.quantity,
        unitPrice: product.effectivePrice,
        subtotal: item.quantity * product.effectivePrice,
      };
    });

    // 2. Salva o orçamento no banco. Nada é liberado antes disso dar certo.
    const result = await createQuote({
      customerName: values.customerName,
      customerWhatsapp: values.customerWhatsapp,
      notes: values.notes,
      items: summaryItems.map((item) => ({
        productId: item.productId as string,
        quantity: item.quantity,
      })),
    });

    if (!result.ok) {
      closePendingWindow(pendingWindow);
      setStep("error");
      setErrorMessage(result.message);
      return;
    }

    // 3. Monta a mensagem com os dados confirmados pelo banco.
    const message = buildQuoteMessage({
      customerName: values.customerName,
      customerWhatsapp: values.customerWhatsapp,
      notes: values.notes,
      items: summaryItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      total: result.total,
      createdAt: new Date(),
    });

    const url = whatsappUrl(message);

    // 4. Abre o WhatsApp na aba já reservada.
    const opened = sendPendingWindowToWhatsapp(pendingWindow, url);

    // 5. Confirma para o cliente com o resumo do que foi enviado.
    setConfirmed({
      quoteId: result.quoteId,
      total: result.total,
      items: summaryItems,
      whatsappUrl: url,
      whatsappOpened: opened,
    });
    setStep("success");

    // 6. Só agora o carrinho é limpo — depois do orçamento gravado com sucesso.
    clear();
  };

  if (items.length === 0 && step !== "success") {
    return <Navigate to="/catalogo" replace />;
  }

  if (step === "success" && confirmed) {
    return (
      <PageShell bottomBar={false}>
        <div className="container max-w-3xl py-12">
          <div className="space-y-6 rounded-xl border border-border bg-card p-6 surface-card">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-9 w-9 text-success" aria-hidden />
              <div>
                <h1 className="font-display text-2xl tracking-tight text-foreground">
                  Orçamento enviado para a loja
                </h1>
                <p className="text-sm text-muted-foreground">
                  Registramos seu orçamento e abrimos a conversa no WhatsApp.
                </p>
              </div>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-secondary/50 px-3 py-2">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Protocolo
                </dt>
                <dd className="truncate text-sm text-foreground">{confirmed.quoteId}</dd>
              </div>
              <div className="rounded-lg bg-secondary/50 px-3 py-2">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Valor total
                </dt>
                <dd className="font-display text-lg text-primary">
                  {formatCurrency(confirmed.total)}
                </dd>
              </div>
            </dl>

            <div className="space-y-2">
              <h2 className="font-display text-base tracking-tight text-foreground">
                Itens do orçamento
              </h2>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {confirmed.items.map((item) => (
                  <li key={item.productId} className="flex justify-between gap-3">
                    <span className="truncate">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="whitespace-nowrap text-foreground">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {!confirmed.whatsappOpened && (
              <Alert>
                <AlertTriangle />
                <AlertTitle>Abra a conversa no WhatsApp</AlertTitle>
                <AlertDescription>
                  O navegador bloqueou a abertura automática. Toque no botão abaixo para
                  enviar a mensagem com seu orçamento.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="brand" size="xl" asChild>
                <a href={confirmed.whatsappUrl} target="_blank" rel="noreferrer">
                  <MessageCircle />
                  Abrir conversa no WhatsApp
                </a>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link to="/catalogo">
                  Voltar ao catálogo
                  <ArrowRight />
                </Link>
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Se preferir, também atendemos em {WHATSAPP_DISPLAY} — {STORE.openingDays},{" "}
              {STORE.openingHours}.
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell bottomBar={false}>
      <div className="border-b border-border bg-gradient-soft">
        <div className="container py-8">
          <h1 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            Finalizar orçamento
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Informe seu nome e WhatsApp. Vamos registrar o orçamento e abrir a conversa com a
            mensagem pronta.
          </p>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="space-y-4 rounded-xl border border-border bg-card p-5 surface-card">
              <div className="space-y-2">
                <Label htmlFor="customerName">Seu nome *</Label>
                <Input
                  id="customerName"
                  autoComplete="name"
                  placeholder="Como devemos te chamar"
                  className="h-12"
                  aria-invalid={Boolean(errors.customerName)}
                  {...register("customerName")}
                />
                {errors.customerName && (
                  <p className="text-xs text-destructive">{errors.customerName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerWhatsapp">Seu WhatsApp *</Label>
                <Input
                  id="customerWhatsapp"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(19) 99999-9999"
                  className="h-12"
                  aria-invalid={Boolean(errors.customerWhatsapp)}
                  {...register("customerWhatsapp", {
                    onChange: (event) =>
                      setValue(
                        "customerWhatsapp",
                        maskPhoneInput(event.target.value),
                        { shouldValidate: false },
                      ),
                  })}
                />
                {errors.customerWhatsapp && (
                  <p className="text-xs text-destructive">
                    {errors.customerWhatsapp.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observação (opcional)</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  placeholder="Ex.: prefiro retirar sábado de manhã, sabor chocolate se tiver..."
                  {...register("notes")}
                />
              </div>
            </div>

            {errorMessage && (
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertTitle>Não foi possível enviar agora</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Button
                type="submit"
                variant="brand"
                size="xl"
                className="w-full"
                disabled={step === "saving"}
              >
                {step === "saving" ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Registrando orçamento...
                  </>
                ) : (
                  <>
                    <MessageCircle />
                    Enviar orçamento pelo WhatsApp
                  </>
                )}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                Seu orçamento só é enviado após registrar os itens. Se algo falhar, seu
                carrinho continua intacto.
              </p>
            </div>
          </form>

          <aside className="lg:sticky lg:top-32 lg:self-start">
            <div className="space-y-4 rounded-xl border border-border bg-card p-5 surface-card">
              <h2 className="flex items-center gap-2 font-display text-lg tracking-tight text-foreground">
                <ShoppingCart className="h-4 w-4 text-primary" aria-hidden />
                Resumo do orçamento
              </h2>

              <ul className="space-y-2 text-sm">
                {items.map((item) => (
                  <li key={item.productId} className="flex justify-between gap-3">
                    <span className="min-w-0 text-muted-foreground">
                      <span className="block truncate text-foreground">{item.name}</span>
                      <span className="text-xs">
                        {item.quantity} x {formatCurrency(item.unitPrice)}
                      </span>
                    </span>
                    <span className="whitespace-nowrap text-foreground">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-display text-2xl text-primary">
                  {formatCurrency(totalValue)}
                </span>
              </div>

              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Os valores são reconfirmados no catálogo antes de enviar, garantindo o preço
                promocional vigente.
              </p>

              <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
                <Link to="/orcamento">Editar meu orçamento</Link>
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </PageShell>
  );
};

export default FinalizarOrcamento;
