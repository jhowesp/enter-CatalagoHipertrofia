import { useQuery, useQueryClient } from "@tanstack/react-query";

import { EntityManager } from "@/admin/components/entity-manager";
import { useSeo } from "@/hooks/use-seo";
import { createBrand, listAdminBrands, updateBrand } from "@/services/admin";

const AdminMarcas = () => {
  const queryClient = useQueryClient();

  useSeo({
    title: "Marcas | Painel Hipertrofia Suplementos",
    description: "Cadastro e organização das marcas do catálogo.",
    path: "/admin/marcas",
    noindex: true,
  });

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: listAdminBrands,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
    void queryClient.invalidateQueries({ queryKey: ["brands"] });
  };

  return (
    <EntityManager
      title="Marcas"
      description="As marcas aparecem nos filtros, nos cards e na faixa de principais marcas da home. Desativar esconde do site sem apagar os produtos."
      items={brands.map((brand) => ({
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        active: brand.active,
      }))}
      loading={isLoading}
      createLabel="Marca"
      onCreate={(input) => createBrand({ ...input, active: true })}
      onUpdate={(id, input) => updateBrand(id, input)}
      onChanged={refresh}
    />
  );
};

export default AdminMarcas;
