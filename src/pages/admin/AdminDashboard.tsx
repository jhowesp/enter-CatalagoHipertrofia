import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  Package,
  Receipt,
  Sparkles,
} from "lucide-react";

import { DemoDataCard } from "@/admin/components/demo-data-card";
import { StatCard } from "@/admin/components/stat-card";
import { QuoteStatusBadge } from "@/admin/components/quote-status-select";
import { Button } from "@/components/ui/button";
import { QUOTE_STATUS_LABELS, STORE, type QuoteStatus } from "@/config/store";
import { useSeo } from "@/hooks/use-seo";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  getDashboardMetrics,
  listAdminQuotes,
  listLowStockProducts,
} from "@/services/admin";

const AdminDashboard = () => {
  const queryClient = useQueryClient();

  useSeo({
    title: "Dashboard | Painel Hipertrofia Suplementos",
    description: "Resumo do catálogo e dos orçamentos.",
    path: "/admin",
    noindex: true,
  });

  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: getDashboardMetrics,
  });

  const { data: quotes } = useQuery({
    queryKey: ["admin-quotes", "recent"],
    queryFn: () => listAdminQuotes({ status: "all", page: 1, pageSize: 5 }),
  });

  const { data: lowStock = [] } = useQuery({
    queryKey: ["admin-low-stock"],
    queryFn: () => listLowStockProducts(5),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-low-stock"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão geral da loja {STORE.name}.
          </p>
        </div>
        <Button variant="brand" size="lg" asChild>
          <Link to="/admin/produtos">
            Gerenciar produtos
            <ArrowRight />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Produtos ativos"
          value={loadingMetrics ? "—" : String(metrics?.activeProducts ?? 0)}
          hint={
            metrics && metrics.totalProducts !== metrics.activeProducts
              ? `${metrics.totalProducts - metrics.activeProducts} inativo(s)`
              : "Todo o catálogo está no ar"
          }
          icon={Package}
        />
        <StatCard
          label="Orçamentos"
          value={loadingMetrics ? "—" : String(metrics?.totalQuotes ?? 0)}
          hint={`${metrics?.newQuotes ?? 0} aguardando atendimento`}
          icon={Receipt}
        />
        <StatCard
          label="Valor em orçamentos"
          value={loadingMetrics ? "—" : formatCurrency(metrics?.totalQuoteValue ?? 0)}
          hint="Soma de todos os orçamentos recebidos"
          icon={BadgeDollarSign}
          tone="primary"
        />
        <StatCard
          label="Orçamentos novos"
          value={loadingMetrics ? "—" : String(metrics?.newQuotes ?? 0)}
          hint="Status Novo"
          icon={Sparkles}
          tone="primary"
        />
        <StatCard
          label="Estoque baixo"
          value={loadingMetrics ? "—" : String(metrics?.lowStockProducts ?? 0)}
          hint={`Até ${STORE.lowStockThreshold} unidades`}
          icon={AlertTriangle}
          tone={metrics && metrics.lowStockProducts > 0 ? "warning" : "default"}
        />
      </div>

      <DemoDataCard count={metrics?.demoProducts ?? 0} onRemoved={refresh} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5 surface-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg tracking-tight text-foreground">
              Últimos orçamentos
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/orcamentos">
                Ver todos
                <ArrowRight />
              </Link>
            </Button>
          </div>

          {quotes && quotes.items.length > 0 ? (
            <ul className="space-y-3">
              {quotes.items.map((quote) => (
                <li
                  key={quote.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {quote.customer_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDateTime(quote.created_at)} • {quote.itemsCount} itens
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-base text-foreground">
                      {formatCurrency(quote.total)}
                    </span>
                    <QuoteStatusBadge status={quote.status as QuoteStatus} />
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/admin/orcamentos/${quote.id}`}>Detalhes</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum orçamento recebido ainda. Assim que um cliente enviar, ele aparece aqui.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5 surface-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg tracking-tight text-foreground">
              Produtos com estoque baixo
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/produtos">
                Ajustar
                <ArrowRight />
              </Link>
            </Button>
          </div>

          {lowStock.length > 0 ? (
            <ul className="space-y-3">
              {lowStock.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{product.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {product.is_demo ? "demonstração • " : ""}
                      {formatCurrency(product.effective_price ?? product.price)}
                    </p>
                  </div>
                  <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">
                    {product.stock} un.
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum produto com estoque baixo no momento.
            </p>
          )}
        </section>
      </div>

      <p className="text-xs text-muted-foreground">
        Status disponíveis: {" "}
        {Object.values(QUOTE_STATUS_LABELS).join(" • ")}.
      </p>
    </div>
  );
};

export default AdminDashboard;
