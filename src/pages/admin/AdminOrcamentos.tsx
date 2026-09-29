import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { QuoteStatusBadge, QuoteStatusSelect } from "@/admin/components/quote-status-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  QUOTE_STATUS_OPTIONS,
  type QuoteStatus,
} from "@/config/store";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useSeo } from "@/hooks/use-seo";
import { formatCurrency, formatDateTime, formatPhone } from "@/lib/format";
import { ADMIN_PAGE_SIZE, listAdminQuotes, updateQuoteStatus } from "@/services/admin";

const AdminOrcamentos = () => {
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const search = useDebouncedValue(term, 350);
  const [status, setStatus] = useState<QuoteStatus | "all">("all");
  const [pagesLoaded, setPagesLoaded] = useState(1);
  const [savingId, setSavingId] = useState<string | null>(null);

  useSeo({
    title: "Orçamentos | Painel Hipertrofia Suplementos",
    description: "Orçamentos recebidos pelo site.",
    path: "/admin/orcamentos",
    noindex: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-quotes", search, status, pagesLoaded],
    queryFn: () =>
      listAdminQuotes({
        search,
        status,
        page: 1,
        pageSize: ADMIN_PAGE_SIZE * pagesLoaded,
      }),
  });

  const quotes = data?.items ?? [];
  const total = data?.total ?? 0;

  const handleStatusChange = async (id: string, next: QuoteStatus) => {
    setSavingId(id);
    try {
      await updateQuoteStatus(id, next);
      toast.success("Status atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar o status.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight text-foreground">Orçamentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} {total === 1 ? "orçamento recebido" : "orçamentos recebidos"} pelo site.
        </p>
      </div>

      <section className="flex flex-wrap gap-3 rounded-xl border border-border bg-card p-4 surface-card">
        <div className="relative min-w-[240px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setPagesLoaded(1);
            }}
            placeholder="Buscar por cliente ou WhatsApp"
            aria-label="Buscar orçamento"
            className="h-11 pl-9"
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as QuoteStatus | "all");
            setPagesLoaded(1);
          }}
        >
          <SelectTrigger className="h-11 w-[190px]" aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {QUOTE_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-20 w-full animate-pulse rounded-lg border border-border bg-card"
            />
          ))}
        </div>
      ) : quotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
          <p className="font-display text-lg uppercase tracking-tight text-foreground">
            Nenhum orçamento encontrado
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Quando um cliente finalizar pelo WhatsApp, o orçamento aparece aqui.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-secondary/40 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">WhatsApp</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3 text-center">Itens</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => (
                  <tr key={quote.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {quote.customer_name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatPhone(quote.customer_whatsapp)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(quote.created_at)}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {quote.itemsCount}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      {formatCurrency(quote.total)}
                    </td>
                    <td className="px-4 py-3">
                      <QuoteStatusSelect
                        value={quote.status as QuoteStatus}
                        disabled={savingId === quote.id}
                        onChange={(next) => void handleStatusChange(quote.id, next)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/admin/orcamentos/${quote.id}`}>Visualizar</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {quotes.map((quote) => (
              <article
                key={quote.id}
                className="space-y-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {quote.customer_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPhone(quote.customer_whatsapp)} • {quote.itemsCount} itens
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDateTime(quote.created_at)}
                    </p>
                  </div>
                  <p className="font-display text-lg text-foreground">
                    {formatCurrency(quote.total)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <QuoteStatusBadge status={quote.status as QuoteStatus} />
                  <QuoteStatusSelect
                    value={quote.status as QuoteStatus}
                    disabled={savingId === quote.id}
                    onChange={(next) => void handleStatusChange(quote.id, next)}
                    className="w-[150px]"
                  />
                </div>

                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link to={`/admin/orcamentos/${quote.id}`}>Ver detalhes</Link>
                </Button>
              </article>
            ))}
          </div>
        </>
      )}

      {quotes.length < total && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setPagesLoaded((current) => current + 1)}
          >
            Carregar mais orçamentos
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminOrcamentos;
