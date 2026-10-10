import { lazy } from "react";

import { RequireAdmin } from "./admin/auth/require-admin";
import { SuspenseRoute } from "./components/layout/route-fallback";
import Catalogo from "./pages/Catalogo";
import FinalizarOrcamento from "./pages/FinalizarOrcamento";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Orcamento from "./pages/Orcamento";
import Produto from "./pages/Produto";

/*
 * Painel administrativo sob demanda: o cliente que só navega no catálogo não baixa
 * as telas do painel (produtos, banners, importação CSV, etc.).
 */
const AdminShell = lazy(() =>
  import("./admin/layout/admin-shell").then((module) => ({ default: module.AdminShell })),
);
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProdutos = lazy(() => import("./pages/admin/AdminProdutos"));
const AdminBanners = lazy(() => import("./pages/admin/AdminBanners"));
const AdminCategorias = lazy(() => import("./pages/admin/AdminCategorias"));
const AdminMarcas = lazy(() => import("./pages/admin/AdminMarcas"));
const AdminOrcamentos = lazy(() => import("./pages/admin/AdminOrcamentos"));
const AdminOrcamentoDetalhe = lazy(() => import("./pages/admin/AdminOrcamentoDetalhe"));

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
    element: <SuspenseRoute><AdminLogin /></SuspenseRoute>,
  },
  {
    path: "/admin",
    name: "admin",
    element: (
      <RequireAdmin>{<SuspenseRoute><AdminShell /></SuspenseRoute>}</RequireAdmin>
    ),
    children: [
      {
        index: true,
        name: "admin-dashboard",
        element: <SuspenseRoute><AdminDashboard /></SuspenseRoute>,
      },
      {
        path: "produtos",
        name: "admin-produtos",
        element: <SuspenseRoute><AdminProdutos /></SuspenseRoute>,
      },
      {
        path: "banners",
        name: "admin-banners",
        element: <SuspenseRoute><AdminBanners /></SuspenseRoute>,
      },
      {
        path: "categorias",
        name: "admin-categorias",
        element: <SuspenseRoute><AdminCategorias /></SuspenseRoute>,
      },
      {
        path: "marcas",
        name: "admin-marcas",
        element: <SuspenseRoute><AdminMarcas /></SuspenseRoute>,
      },
      {
        path: "orcamentos",
        name: "admin-orcamentos",
        element: <SuspenseRoute><AdminOrcamentos /></SuspenseRoute>,
      },
      {
        path: "orcamentos/:id",
        name: "admin-orcamento-detalhe",
        element: <SuspenseRoute><AdminOrcamentoDetalhe /></SuspenseRoute>,
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
