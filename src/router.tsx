import { AdminShell } from "./admin/layout/admin-shell";
import { RequireAdmin } from "./admin/auth/require-admin";
import Catalogo from "./pages/Catalogo";
import FinalizarOrcamento from "./pages/FinalizarOrcamento";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Orcamento from "./pages/Orcamento";
import Produto from "./pages/Produto";
import AdminCategorias from "./pages/admin/AdminCategorias";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminMarcas from "./pages/admin/AdminMarcas";
import AdminOrcamentoDetalhe from "./pages/admin/AdminOrcamentoDetalhe";
import AdminOrcamentos from "./pages/admin/AdminOrcamentos";
import AdminProdutos from "./pages/admin/AdminProdutos";

export const routers = [
  {
    path: "/",
    name: "home",
    element: <Index />,
  },
  {
    path: "/catalogo",
    name: "catalogo",
    element: <Catalogo />,
  },
  {
    path: "/produto/:slug",
    name: "produto",
    element: <Produto />,
  },
  {
    path: "/orcamento",
    name: "orcamento",
    element: <Orcamento />,
  },
  {
    path: "/orcamento/finalizar",
    name: "finalizar-orcamento",
    element: <FinalizarOrcamento />,
  },
  {
    path: "/admin/login",
    name: "admin-login",
    element: <AdminLogin />,
  },
  {
    path: "/admin",
    name: "admin",
    element: (
      <RequireAdmin>
        <AdminShell />
      </RequireAdmin>
    ),
    children: [
      {
        index: true,
        name: "admin-dashboard",
        element: <AdminDashboard />,
      },
      {
        path: "produtos",
        name: "admin-produtos",
        element: <AdminProdutos />,
      },
      {
        path: "categorias",
        name: "admin-categorias",
        element: <AdminCategorias />,
      },
      {
        path: "marcas",
        name: "admin-marcas",
        element: <AdminMarcas />,
      },
      {
        path: "orcamentos",
        name: "admin-orcamentos",
        element: <AdminOrcamentos />,
      },
      {
        path: "orcamentos/:id",
        name: "admin-orcamento-detalhe",
        element: <AdminOrcamentoDetalhe />,
      },
    ],
  },
  /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
  {
    path: "*",
    name: "404",
    element: <NotFound />,
  },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
