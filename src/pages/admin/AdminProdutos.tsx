import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CsvImportSheet } from "@/admin/components/csv-import-sheet";
import { DemoDataCard } from "@/admin/components/demo-data-card";
import { ProductFormSheet } from "@/admin/components/product-form-sheet";
import { ProductsTable } from "@/admin/components/products-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useSeo } from "@/hooks/use-seo";
import {
  ADMIN_PAGE_SIZE,
  deleteProduct,
  getDashboardMetrics,
  listAdminBrands,
  listAdminCategories,
  listAdminProducts,
  setProductFlag,
} from "@/services/admin";
import type { ProductRow } from "@/types/catalog";

const AdminProdutos = () => {
  const queryClient = useQueryClient();

  const [term, setTerm] = useState("");
  const search = useDebouncedValue(term, 350);
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [visibility, setVisibility] = useState<"all" | "active" | "inactive">("all");
  const [demoOnly, setDemoOnly] = useState(false);
  const [pagesLoaded, setPagesLoaded] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ProductRow | null>(null);

  useSeo({
    title: "Produtos | Painel Hipertrofia Suplementos",
    description: "Cadastro, edição e importação de produtos.",
    path: "/admin/produtos",
    noindex: true,
  });

  const pageSize = ADMIN_PAGE_SIZE * pagesLoaded;

  const { data, isLoading } = useQuery({
    queryKey: [
      "admin-products",
      search,
      categoryId,
      brandId,
      visibility,
      demoOnly,
      pageSize,
    ],
    queryFn: () =>
      listAdminProducts({
        search,
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
        visibility,
        demoOnly,
        page: 1,
        pageSize,
      }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: listAdminCategories,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: listAdminBrands,
  });

  const { data: metrics } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: getDashboardMetrics,
  });

  const products = data?.items ?? [];
  const total = data?.total ?? 0;

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-low-stock"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
    void queryClient.invalidateQueries({ queryKey: ["banners", "active"] });
    void queryClient.invalidateQueries({ queryKey: ["products"] });
    void queryClient.invalidateQueries({ queryKey: ["categories"] });
    void queryClient.invalidateQueries({ queryKey: ["brands"] });
  };

  const resetPaging = () => setPagesLoaded(1);

  const handleToggleFlag = async (
    product: ProductRow,
    field: "active" | "featured",
    value: boolean,
  ) => {
    try {
      await setProductFlag(product.id, { [field]: value });
      toast.success(
        field === "active"
          ? value
            ? "Produto ativado."
            : "Produto desativado."
          : value
            ? "Produto marcado como destaque."
            : "Destaque removido.",
      );
      refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar o produto.");
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteProduct(toDelete.id);
      toast.success("Produto excluído.");
      setToDelete(null);
      refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir o produto.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight text-foreground">Produtos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} {total === 1 ? "produto cadastrado" : "produtos cadastrados"} no catálogo.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="lg" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet />
            Importar CSV
          </Button>
          <Button
            variant="brand"
            size="lg"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus />
            Novo produto
          </Button>
        </div>
      </div>

      <DemoDataCard
        productCount={metrics?.demoProducts ?? 0}
        bannerCount={metrics?.demoBanners ?? 0}
        onRemoved={refreshAll}
      />

      <section className="space-y-4 rounded-xl border border-border bg-card p-4 surface-card">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={term}
              onChange={(event) => {
                setTerm(event.target.value);
                resetPaging();
              }}
              placeholder="Buscar produto por nome"
              aria-label="Buscar produto"
              className="h-11 pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Select
              value={categoryId || "all"}
              onValueChange={(value) => {
                setCategoryId(value === "all" ? "" : value);
                resetPaging();
              }}
            >
              <SelectTrigger className="h-11 w-[180px]" aria-label="Filtrar por categoria">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={brandId || "all"}
              onValueChange={(value) => {
                setBrandId(value === "all" ? "" : value);
                resetPaging();
              }}
            >
              <SelectTrigger className="h-11 w-[170px]" aria-label="Filtrar por marca">
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as marcas</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={visibility}
              onValueChange={(value) => {
                setVisibility(value as "all" | "active" | "inactive");
                resetPaging();
              }}
            >
              <SelectTrigger className="h-11 w-[150px]" aria-label="Filtrar por status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Somente ativos</SelectItem>
                <SelectItem value="inactive">Somente inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <label className="flex items-center gap-3 text-xs text-muted-foreground">
          <Switch
            checked={demoOnly}
            onCheckedChange={(checked) => {
              setDemoOnly(checked);
              resetPaging();
            }}
          />
          Mostrar somente produtos de demonstração
        </label>
      </section>

      <ProductsTable
        products={products}
        categories={categories}
        brands={brands}
        loading={isLoading}
        onEdit={(product) => {
          setEditing(product);
          setFormOpen(true);
        }}
        onToggleFlag={(product, field, value) =>
          void handleToggleFlag(product, field, value)
        }
        onDelete={setToDelete}
      />

      {products.length < total && (
        <div className="flex flex-col items-center gap-2">
          {isLoading && <p className="text-xs text-muted-foreground">Carregando...</p>}
          <Button
            variant="outline"
            size="lg"
            onClick={() => setPagesLoaded((current) => current + 1)}
          >
            Carregar mais produtos
          </Button>
        </div>
      )}

      <ProductFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        categories={categories}
        brands={brands}
        onSaved={refreshAll}
      />

      <CsvImportSheet
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={refreshAll}
      />

      <AlertDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{toDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              O produto sai do catálogo permanentemente. Se ele já apareceu em orçamentos, o
              histórico é preservado. Se quiser apenas tirar do ar, desative o produto em vez
              de excluir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDelete()}
            >
              <Trash2 />
              Excluir produto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminProdutos;
