import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MessageCircle, Receipt } from "lucide-react";
import { toast } from "sonner";

import { QuoteStatusSelect } from "@/admin/components/quote-status-select";
import { Button } from "@/components/ui/button";
import type { QuoteStatus } from "@/config/store";
import { useSeo } from "@/hooks/use-seo";
import { formatCurrency, formatDateTime, formatPhone } from "@/lib/format";
import { whatsappUrlForNumber } from "@/lib/whatsapp";
import { getQuoteWithItems, updateQuoteStatus } from "@/services/admin";

const AdminOrcamentoDetalhe = () => {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  useSeo({
    title: "Detalhe do orçamento | Painel Hipertrofia Suplementos",
    description: "Detalhes do orçamento recebido.",
    path: `/admin/orcamentos/${id}`,
    noindex: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-quote", id],
    queryFn: () => getQuoteWithItems(id),
    enabled: Boolean(id),
  });

  const handleStatusChange = async (next: QuoteStatus) => {
    setSaving(true);
    try {
      await updateQuoteStatus(id, next);
      toast.success("Status atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["admin-quote", id] });
      void queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar o status.");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando orçamento...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl tracking-tight text-foreground">
          Orçamento não encontrado
        </h1>
        <p className="text-sm text-muted-foreground">
          Este orçamento não existe ou foi removido.
        </p>
        <Button variant="outline" size="lg" asChild>
          <Link to="/admin/orcamentos">
            <ArrowLeft />
            Voltar para a lista
          </Link>
        </Button>
      </div>
    );
  }

  const { quote, items, itemsCount } = data;
  const conversationUrl = whatsappUrlForNumber(
    quote.customer_whatsapp,
    `Olá, ${quote.customer_name}! Aqui é a Hipertrofia Suplementos. Recebemos seu orçamento no valor de ${formatCurrency(quote.total)} e vamos confirmar disponibilidade e retirada.`,
  );

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/orcamentos")}>
        <ArrowLeft />
        Voltar
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight text-foreground">
            {quote.customer_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Orçamento de {formatDateTime(quote.created_at)} • {itemsCount}{" "}
            {itemsCount === 1 ? "item" : "itens"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <QuoteStatusSelect
            value={quote.status as QuoteStatus}
            disabled={saving}
            onChange={(next) => void handleStatusChange(next)}
            className="w-[190px]"
          />
          <Button variant="whatsapp" size="lg" asChild>
            <a href={conversationUrl} target="_blank" rel="noreferrer">
              <MessageCircle />
              Abrir conversa no WhatsApp
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Receipt className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="font-display text-base tracking-tight text-foreground">
              Produtos do orçamento
            </h2>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-secondary/40 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3 text-center">Qtd.</th>
                  <th className="px-4 py-3 text-right">Preço unitário</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-border/60">
                    <td className="px-4 py-3 text-foreground">
                      {item.product_name}
                      {item.product_flavor && (
                        <span className="block text-[11px] text-muted-foreground">
                          Sabor: {item.product_flavor}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-secondary/30">
                  <td className="px-4 py-3 font-semibold text-foreground" colSpan={3}>
                    Total do orçamento
                  </td>
                  <td className="px-4 py-3 text-right font-display text-xl text-primary">
                    {formatCurrency(quote.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="space-y-3 rounded-xl border border-border bg-card p-5 surface-card">
            <h2 className="font-display text-base tracking-tight text-foreground">
              Dados do cliente
            </h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Nome
                </dt>
                <dd className="text-foreground">{quote.customer_name}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  WhatsApp
                </dt>
                <dd className="text-foreground">
                  {formatPhone(quote.customer_whatsapp)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Observação
                </dt>
                <dd className="text-foreground">
                  {quote.notes?.trim() ? quote.notes : "Sem observações"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Data
                </dt>
                <dd className="text-foreground">{formatDateTime(quote.created_at)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Protocolo
                </dt>
                <dd className="break-all text-xs text-muted-foreground">{quote.id}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default AdminOrcamentoDetalhe;
