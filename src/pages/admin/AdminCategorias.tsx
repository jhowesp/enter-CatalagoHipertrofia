import { useQuery, useQueryClient } from "@tanstack/react-query";

import { EntityManager } from "@/admin/components/entity-manager";
import { useSeo } from "@/hooks/use-seo";
import {
  createCategory,
  listAdminCategories,
  updateCategory,
} from "@/services/admin";

const AdminCategorias = () => {
  const queryClient = useQueryClient();

  useSeo({
    title: "Categorias | Painel Hipertrofia Suplementos",
    description: "Cadastro e organização das categorias do catálogo.",
    path: "/admin/categorias",
    noindex: true,
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: listAdminCategories,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    void queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  return (
    <EntityManager
      title="Categorias"
      description="As categorias organizam o catálogo e o menu. Desativar uma categoria a esconde do site sem apagar os produtos."
      items={categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        active: category.active,
      }))}
      loading={isLoading}
      createLabel="Categoria"
      onCreate={(input) => createCategory({ ...input, active: true })}
      onUpdate={(id, input) => updateCategory(id, input)}
      onChanged={refresh}
    />
  );
};

export default AdminCategorias;
