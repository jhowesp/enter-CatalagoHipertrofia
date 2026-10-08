# HIPERTROFIA SUPLEMENTOS — Catálogo digital + Painel administrativo

## Contexto

O projeto hoje é o template Vite + React + TS + Tailwind + shadcn (uma única página genérica em
`src/pages/Index.tsx`, tema claro azul/roxo, i18n en/zh-CN). O objetivo é substituí-lo por um
**catálogo digital premium** da marca **HIPERTROFIA SUPLEMENTOS** (fundo preto/grafite, vermelho de
destaque, mobile-first) com **carrinho de orçamento** finalizado pelo WhatsApp e **painel
administrativo protegido**.

Escopo confirmado:
- **Sem** checkout, pagamento online, frete ou login de cliente. O termo usado é sempre "Meu orçamento".
- Catálogo público lê do banco (**Enter Cloud**), com poucos produtos demonstrativos — sem mocks.
- Imagens dos produtos demo: **placeholders neutros**; o admin pode subir imagens reais.
- Arquitetura mantida: React + TS + Tailwind + shadcn + React Query + Enter Cloud + WhatsApp.

Decisões já confirmadas:
1. Orçamento é **salvo no banco** (`quotes` + `quote_items`) e publicado apenas depois do salvamento bem-sucedido.
2. Catálogo lê **direto do banco**.
3. Placeholders neutros nos produtos de demonstração (nunca imagens geradas por IA representando produto real).
4. Login do painel: **e-mail + senha**.
5. Administrador liberado por e-mail na lista `admin_users`, já definido:
   **`hipertrofia.publicidade@gmail.com`**. A senha **não** é usada, não é gravada no projeto e não
   aparece no plano.
6. **Sem cadastro público de usuário**: o cadastro fica desativado no backend e `/admin/login` contém
   somente e-mail, senha e o botão Entrar. A conta do administrador é criada pelo mecanismo
   administrativo seguro do Enter Cloud e depois autorizada por `admin_users`.
6. Dados reais de contato, centralizados em `src/config/store.ts`:

   | Campo | Valor |
   |---|---|
   | WhatsApp (número) | `5519993419516` |
   | WhatsApp (exibição) | `(19) 99341-9516` |
   | Instagram | `@hipertrofia_oficial` |
   | Localização | São João da Boa Vista - SP |
   | Horário de atendimento | 10:00 às 18:30 |

---

## 1. Banco de dados (Enter Cloud)

Primeiro passo: `supabase_enable` (não há backend conectado hoje). Depois, **todo** schema via
`supabase_migration`, dados via `supabase_insert`, leitura de conferência via `supabase_read_query`.

### Tabelas

`categories`, `brands`, `products`, `quotes`, `quote_items`, `admin_users`.

**products** — campos pedidos + os que servem requisitos explícitos:

| Coluna | Notas |
|---|---|
| `id`, `name`, `slug` (unique), `brand_id`, `category_id`, `description` | FKs `ON DELETE SET NULL` |
| `short_description`, `weight`, `flavor` | colunas reais (batem 1:1 com o CSV) |
| `specs jsonb NOT NULL DEFAULT '{}'` | informações extras do produto (pares chave/valor) |
| `price`, `sale_price` | `numeric(10,2)` |
| `cost_price numeric(10,2)` | **exclusivamente administrativo** |
| `image_url`, `stock`, `featured`, `active`, `created_at`, `updated_at` | |
| `is_demo boolean NOT NULL DEFAULT false` | identifica dados de demonstração internamente |
| `effective_price numeric(10,2) GENERATED ALWAYS AS (coalesce(sale_price, price)) STORED` | ordenação por preço considerando promoção (indexado) |
| `discount_percent integer ... STORED` | badge de desconto / ordenação por desconto |
| `margin_percent integer ... STORED` | **exclusivamente administrativo** |

**quotes**: `id`, `customer_name`, `customer_whatsapp`, `notes`, `total`, `status`
(`text NOT NULL DEFAULT 'new'` com `CHECK (status in ('new','in_progress','sold','cancelled'))`),
`created_at`, `updated_at`.

**quote_items**: `id`, `quote_id` (`ON DELETE CASCADE`), `product_id` (`ON DELETE SET NULL`),
`product_name`, `quantity` (`CHECK > 0`), `unit_price`, `subtotal`, `created_at`.
O item guarda snapshot de nome/preço, então o orçamento histórico não quebra se o produto for
desativado/excluído.

**admin_users**: `email text PRIMARY KEY CHECK (email = lower(email))`, `created_at`.

Índices: `products(slug)`, `products(brand_id)`, `products(category_id)`, `products(featured)`,
`products(active)`, `products(effective_price)`, `quotes(status)`, `quotes(created_at)`,
`quote_items(quote_id)`.

Trigger `set_updated_at()` em `products`, `categories`, `brands`, `quotes`.

### Funções

- `public.is_admin()` — `security definer`, `stable`, `set search_path = public`: verdadeiro se
  `lower(auth.jwt() ->> 'email')` existe em `admin_users`. É a **única** fonte de autorização
  administrativa, usada pelas policies e pelo storage.

### Administrador

`admin_users` é populada por seed com **`hipertrofia.publicidade@gmail.com`** (e-mail do dono da loja).
Não há cadastro de administrador pela aplicação: quem não estiver nessa lista pode até criar conta, mas
não obtém nenhuma permissão. Para adicionar outro administrador no futuro basta inserir o e-mail na tabela.

### Views de leitura pública (isolamento de colunas sensíveis)

`public.public_products` — `WITH (security_invoker = false)`, expõe **apenas**:
`id, name, slug, brand_id, category_id, brand_name, brand_slug, category_name, category_slug,
description, short_description, specs, weight, flavor, price, sale_price, effective_price,
discount_percent, image_url, stock, featured`, sempre com `active = true`.
`cost_price`, `margin_percent` e `is_demo` **não** existem nessa view.
Acesso concedido a `anon, authenticated`.

Para categorias e marcas não há coluna sensível: a própria RLS resolve (policies abaixo).

### RLS (habilitada na mesma migration, policies escopadas)

| Tabela | Policy |
|---|---|
| `products` | `SELECT` apenas `to authenticated` com `is_admin()` — **nenhuma** policy para `anon` (o público usa a view) |
| `products` | `ALL` `to authenticated` com `is_admin()` (criar/editar/excluir) |
| `categories`, `brands` | `SELECT` `to anon, authenticated` com `active = true` |
| `categories`, `brands` | `ALL` `to authenticated` com `is_admin()` (ver inativos, criar, editar) |
| `quotes` | `INSERT` `to anon, authenticated` (cliente envia orçamento) |
| `quotes` | `SELECT`/`UPDATE`/`DELETE` apenas `to authenticated` com `is_admin()` |
| `quote_items` | `INSERT` `to anon, authenticated` com `with check (exists (select 1 from quotes q where q.id = quote_id))` |
| `quote_items` | `SELECT`/`UPDATE`/`DELETE` apenas `to authenticated` com `is_admin()` |
| `admin_users` | RLS habilitada; `SELECT` apenas `to authenticated` com `is_admin()`; sem acesso para `anon` |

Grants explícitos: `select` em `public_products` para `anon, authenticated`; `select` em
`categories`/`brands`; `insert` em `quotes`/`quote_items`; privilégios de CRUD em `products`,
`categories`, `brands`, `quotes`, `quote_items` para `authenticated` (a RLS limita a `is_admin()`);
`execute` em `is_admin()`; **nenhum** `select` direto em `products` para `anon`.

Conferência obrigatória: `supabase_get_table_schema` em cada tabela, confirmando RLS habilitada **e**
as policies listadas (uma migration pode passar sem proteger a tabela).

### Storage de imagens

Bucket `product-images` criado por migration (`insert into storage.buckets ... on conflict do nothing`):
público, limite 5 MB, mime `image/jpeg, image/png, image/webp, image/avif`.
Policies em `storage.objects` (mesmo padrão do skill de upload):
- `SELECT` público restrito ao bucket (imagem do catálogo precisa ser pública).
- `INSERT`/`UPDATE`/`DELETE` `to authenticated` com `public.is_admin()`.
Caminho do objeto: `products/{uuid}.{ext}`; a URL pública é salva em `products.image_url`.

### Seed demonstrativo (poucos itens, todos com `is_demo = true`)

- **10 categorias**: Whey Protein, Creatina, Pré-Treino, Hipercalórico, Barras e Snacks, Vitaminas,
  Termogênicos, Pasta de Amendoim, Acessórios, Outros.
- **6 marcas** do mercado brasileiro (Max Titanium, Integralmédica, Growth Supplements, Dux
  Nutrition, Probiótica, Black Skull) — nomes reais de marcas revendidas, sem logos.
- **13 produtos** com nomes descritivos genéricos (ex.: "Whey Protein Concentrado 900g",
  "Creatina Monohidratada 300g", "Hipercalórico 3kg", "Coqueteleira 700ml"), distribuídos nas 10
  categorias, ~5 com `sale_price`, 8 com `featured = true`, `cost_price` coerente, `image_url = null`,
  `stock` variado (2 produtos com estoque baixo para exercitar o dashboard).
- Nenhum produto é apresentado como item oficial da Hipertrofia; todos ficam marcados como
  demonstração e removíveis em um clique (seção 10).

---

## 2. Garantias de segurança (invariantes)

1. `cost_price` e `margin_percent` **não existem** na view pública; `anon` não tem `select` em `products`. Nada de custo/margem em nenhuma consulta pública, card, página, mensagem de WhatsApp ou sitemap.
2. `is_demo` é interno e não aparece no catálogo público.
3. Orçamentos não podem ser lidos anonimamente: só `is_admin()` lê `quotes`/`quote_items`.
4. O painel só é acessível a usuários autenticados **e** presentes em `admin_users`; a checagem
   decisiva é a policy no banco, nunca estado de frontend, `localStorage` ou `sessionStorage`.
5. Produtos/categorias/marcas públicos exibem somente `active = true`.
6. Nenhuma escrita administrativa parte do cliente sem policy: criar/editar/excluir produto ou
   categoria exige `is_admin()` no banco.
7. `robots.txt` bloqueia `/admin` e as páginas do painel levam `noindex`.
8. **Sem cadastro público de usuário**: a aplicação não oferece signup em nenhuma tela, então ninguém
   obtém privilégio administrativo criando conta pela interface.

---

## 3. Autenticação do painel

- **E-mail + senha** via `supabase.auth`, com **cadastro público desativado**
  (`supabase_configure_auth` → `disable_signup: true`; nenhum usuário consegue criar conta pela
  aplicação). A conta do administrador é criada pelo mecanismo administrativo seguro do Enter Cloud e
  depois autorizada por `admin_users`. *(Se essa criação não estiver disponível para você na hora,
  eu ligo o cadastro temporariamente, você cria a conta com sua senha e eu desativo de novo — nada
  disso envolve eu ver ou guardar senha.)*
- `/admin/login` contém **somente**: campo de e-mail, campo de senha e botão **Entrar**
  (`signInWithPassword`). Sem aba de cadastro, sem link de "criar conta", sem cadastro de
  administrador pela interface pública. Em sucesso, redireciona para `/admin`.
- `src/admin/auth/use-admin-session.ts` — registra `supabase.auth.onAuthStateChange` **antes** de
  `getSession()`, guarda `user` **e** `session`, nunca usa callback `async` e defer chamadas ao client
  com `setTimeout(..., 0)`. Consulta a RPC `is_admin()` para saber se o usuário autenticado é
  administrador. A sessão do Supabase Auth é a única coisa persistida pelo próprio cliente de auth;
  **autorização nunca** é guardada em `localStorage`/`sessionStorage`.
- `src/admin/auth/require-admin.tsx` — guarda de rota: carregando → spinner; sem sessão →
  `/admin/login`; sessão sem autorização → tela "acesso não autorizado" com botão sair.
- **Autorização real fica no banco**: mesmo forjando o estado do frontend, um usuário fora de
  `admin_users` não consegue ler produto/orçamento nem gravar nada, porque as policies exigem
  `is_admin()` (que compara o e-mail do JWT com `admin_users`).
- Adicionar outro administrador no futuro = inserir o e-mail na tabela `admin_users`.

---

## 4. Identidade visual

**`src/index.css`** — tema escuro por padrão (independe de classe `dark`):
fundo `0 0% 5%`, card/grafite `0 0% 9%`, border `0 0% 17%`, `muted-foreground 0 0% 64%`,
`--primary: 356 90% 48%` (vermelho Hipertrofia) com `--primary-foreground 0 0% 100%`,
`--ring` vermelho, `--radius 0.75rem`; tokens novos `--gradient-hero`, `--gradient-primary`,
`--gradient-surface`, `--shadow-card`, `--shadow-glow`, `--transition-smooth`; mesmos valores
espelhados em `.dark` para consistência dos componentes shadcn.

**`tailwind.config.ts`** — `fontFamily.display` (Anton, condensada esportiva) e `fontFamily.sans`
(Inter); `boxShadow.card/glow`; `backgroundImage.gradient-hero/gradient-primary`; keyframes
`fade-up`, `marquee`, `pulse-glow`; container mobile-first.

**`index.html`** — `lang="pt-BR"`, título, meta description, Open Graph, `theme-color #0A0A0B`,
Google Fonts (Anton + Inter).

**`src/components/ui/button.tsx`** — variantes `brand` (vermelho sólido), `whatsapp`
(superfície escura + ícone verde), `ghost-strong`, tamanhos `xl`/`icon-lg` para alvos de toque ≥ 44px.
**`src/components/ui/sonner.tsx`** — `theme="dark"` fixo (o `next-themes` não está montado), `top-center`.

---

## 5. Estrutura pública (catálogo)

### Configuração e utilitários

- `src/config/store.ts` — **fonte única**: WhatsApp, Instagram, localização, horário, nome da marca,
  `LOW_STOCK_THRESHOLD` (estoque baixo no dashboard), labels dos status de orçamento
  (`new → Novo`, `in_progress → Em atendimento`, `sold → Vendido`, `cancelled → Cancelado`).
- `src/config/navigation.ts` — links do header/footer e mapa `slug da categoria → ícone lucide`.
- `src/lib/format.ts` — `formatCurrency` (BRL), `formatDiscount`, `formatPhone`, `formatDateTime`, `onlyDigits`.
- `src/lib/slug.ts` — `slugify` (reutilizado pelo admin e pela importação CSV).
- `src/lib/whatsapp.ts` — `buildQuoteMessage()` e `openWhatsapp()` (usados na finalização, no header,
  no rodapé e no botão do produto).
- `src/types/catalog.ts` — tipos derivados de `src/integrations/supabase/types.ts` (sem duplicar o schema).
- `src/hooks/use-seo.ts`, `src/hooks/use-debounce.ts`.

### Dados e estado

- `src/services/catalog.ts` — `listProducts(filters)` na view `public_products` (busca `ilike` por nome,
  filtro categoria/marca, ordenação por `effective_price`/`discount_percent`/nome, paginação `range`),
  `getProductBySlug` (`.maybeSingle()`), `listRelated`, `listFeatured`, `listOffers`,
  `listCategories`, `listBrands`.
- `src/services/quotes.ts` — `createQuote({customer, items})`: insere `quotes` (retorna id) e depois
  `quote_items` em lote; em falha de itens, o erro é propagado para que o carrinho **não** seja limpo.
- `src/context/quote-cart.tsx` — `QuoteCartProvider` + `useQuoteCart()`: item snapshot
  (`productId, name, slug, brand, price, salePrice, imageUrl, quantity, stock`), add/update/remove/clear,
  `itemCount`, `total`, persistência em `localStorage` (`hipertrofia:orcamento:v1`) com rehidratação segura.
  Registrado em `src/App.tsx` envolvendo o `RouterProvider`.
- Consumo com **React Query** (já configurado em `src/App.tsx`).

### Componentes e páginas

Layout: `src/components/layout/{page-shell,site-header,site-footer,cart-drawer,mobile-action-bar,whatsapp-float}.tsx`
— header sticky com logo, busca, nav, menu mobile (Sheet), botão "Meu orçamento" com badge e WhatsApp;
rodapé com contato real, links e categorias; drawer lateral do orçamento; barra fixa inferior no mobile
(evita sobreposição com o botão flutuante, que aparece a partir de `md`).

Catálogo: `src/components/catalog/{product-image,product-card,product-grid,price-block,quantity-stepper,discount-badge,catalog-filters,catalog-toolbar}.tsx`.
`product-image` usa placeholder neutro (grafite + ícone lucide + inicial) quando `image_url` é nulo e,
quando há imagem, `aspect-square` + `object-contain` sobre superfície grafite (embalagem **nunca**
distorcida nem cortada), com `loading="lazy"` e `decoding="async"`.

Home: `src/components/home/{hero,section-heading,product-rail,category-grid,brand-strip,whatsapp-cta-band}.tsx`
— banner com gradiente escuro + brilho vermelho e headline em Anton, selos de confiança,
**Mais vendidos** (`featured`), **Ofertas** (`sale_price`), **Categorias** (10 tiles),
**Principais marcas** (faixa), faixa de CTA para o WhatsApp.

Páginas:
- `src/pages/Index.tsx` (reescrito) — home completa, sem `useTranslation` (app PT-BR).
- `src/pages/Catalogo.tsx` (`/catalogo`) — busca, filtro por categoria, filtro por marca, ordenação por
  preço/desconto/nome, contagem, "Carregar mais", skeletons, estado vazio; filtros refletidos na query
  string (`?q=&cat=&marca=&ordem=`).
- `src/pages/Produto.tsx` (`/produto/:slug`) — foto grande, nome, marca, preço, promoção, descrição,
  "Informações do produto", quantidade, "Adicionar ao orçamento", "Comprar pelo WhatsApp", relacionados,
  breadcrumb e estado de produto não encontrado.
- `src/pages/Orcamento.tsx` (`/orcamento`) — "Meu orçamento": itens, quantidade, remover, subtotal por
  item, quantidade total de produtos, valor total, limpar, continuar comprando, CTA finalizar.
- `src/pages/FinalizarOrcamento.tsx` (`/orcamento/finalizar`) — fluxo da seção 6.
- `src/pages/NotFound.tsx` — reestilizado com a identidade da marca.

Rotas (`src/router.tsx`), catch-all `*` mantido por último:
`/`, `/catalogo`, `/produto/:slug`, `/orcamento`, `/orcamento/finalizar`, `/admin/login`,
`/admin` (layout protegido com `Outlet`) com filhas `produtos`, `categorias`, `marcas`,
`orcamentos`, `orcamentos/:id`.

---

## 6. Fluxo de finalização do orçamento

Ordem exata exigida:

1. **Validar** os dados do cliente (react-hook-form + zod: nome e WhatsApp obrigatórios, WhatsApp com
   dígitos suficientes).
2. **Revalidar os preços no banco**: buscar as linhas atuais em `public_products` para os itens do
   carrinho. Se algum item ficou inativo/excluído, bloqueia o envio com aviso e botão para removê-lo.
   Preço usado na mensagem e no banco é o `effective_price` do banco (imune a adulteração do carrinho).
3. **Salvar** `quotes` (status `new`, `total`) + `quote_items` (`product_name`, `quantity`, `unit_price`,
   `subtotal`).
4. Somente se o salvamento retornou sucesso: **gerar a mensagem** completa (nome, itens, quantidades,
   preço unitário, subtotais, total).
5. **Abrir o WhatsApp** — uma janela em branco é aberta de forma síncrona no clique (para não ser
   bloqueada pelo navegador) e recebe a URL `wa.me/5519993419516?text=...` depois do salvamento.
   Em falha, essa janela é fechada.
6. **Mostrar confirmação** ao cliente (tela de sucesso com resumo e "Voltar ao catálogo").
7. **Limpar o carrinho apenas após o salvamento com sucesso.**

Se o salvamento falhar: mensagem de erro, **carrinho intacto**, sem tela de sucesso e sem abrir o
WhatsApp. Orçamento vazio redireciona para `/catalogo`.

---

## 7. Painel administrativo

`src/admin/` + `src/pages/admin/`:

- **Shell** (`src/admin/layout/admin-shell.tsx`) — sidebar (Dashboard, Produtos, Categorias, Marcas,
  Orçamentos) + topbar com e-mail do administrador e "Sair"; no mobile a sidebar vira Sheet.
- **Dashboard** (`/admin`) — cards: **produtos ativos**, **orçamentos (total)**,
  **valor total dos orçamentos**, **orçamentos novos**, **produtos com estoque baixo**; lista dos 5
  orçamentos mais recentes; banner de dados de demonstração.
- **Produtos** (`/admin/produtos`) — tabela com miniatura, nome, marca, categoria, preço, promoção,
  **custo**, **margem** (R$ e %), estoque (badge quando baixo), switches de **ativo** e **destaque**,
  ações editar/excluir. Busca, filtros (categoria, marca, ativos/inativos, somente demonstração) e paginação.
- **Formulário de produto** (Sheet criar/editar) — nome, slug (gerado do nome, editável), marca,
  categoria, preço, preço promocional, custo, estoque, descrição curta, descrição, peso, sabor, specs
  (pares chave/valor), destaque, ativo, upload de imagem com prévia e remoção. Mostra **margem
  calculada em tempo real** (R$ e %) e alerta quando `sale_price >= price`.
- **Categorias** (`/admin/categorias`) e **Marcas** (`/admin/marcas`) — listar, criar, editar nome/slug,
  ativar/desativar, (categorias) imagem opcional.
- **Orçamentos** (`/admin/orcamentos`) — tabela com cliente, WhatsApp, data, quantidade de itens, valor
  total, **status** e botão "Detalhes"; filtro por status.
- **Detalhe do orçamento** (`/admin/orcamentos/:id`) — cliente, WhatsApp, observação, data, status
  (Select que altera o status), produtos com quantidade, preço unitário e subtotal, total, e botão
  "Abrir conversa no WhatsApp" do cliente.
- **Importação CSV** (seção 8) acessível de `/admin/produtos`.
- **Dados de demonstração** (seção 10) no Dashboard e em `/admin/produtos`.

Serviços: `src/services/admin.ts` (CRUD de produtos/categorias/marcas lendo **todas** as colunas,
incluindo custo e margem; `listQuotes` com contagem de itens via `quote_items(count)`; `getQuote`;
`updateQuoteStatus`; `deleteDemoData`) e `src/services/import.ts` (CSV).
Após cada mutação, `invalidateQueries` do React Query.

Todas as páginas `/admin*` levam `noindex` e não compartilham layout/consultas com o catálogo público.

---

## 8. Importação em massa por CSV

Colunas aceitas: `name, brand, category, description, short_description, price, sale_price,
cost_price, stock, featured, active, weight, flavor, image_url`.

- Parser: `papaparse` (adicionar dependência `papaparse` + `@types/papaparse`), com detecção
  automática de separador (`,` ou `;`), aspas e BOM — necessário porque CSV gerado no Excel pt-BR usa `;`.
- Botão "Baixar modelo CSV" (cabeçalho + 1 linha de exemplo, gerado no cliente) e upload ou colagem do conteúdo.
- **Validação antes de gravar**, mostrando: total de linhas, quantidade de **válidos**,
  quantidade de **erros**, e a lista de linhas com erro (`linha 12 — sale_price (59,90) maior ou igual a price (59,90)`).
  Regras: `name` obrigatório; `price` numérico > 0; `sale_price` opcional e < `price`; `cost_price`
  opcional ≥ 0; `stock` inteiro ≥ 0 (padrão 0); `featured`/`active` aceitam sim/não, true/false, 1/0;
  `brand`/`category` resolvidos por nome ou slug; `image_url` opcional e deve começar com `http`;
  aceita decimal com vírgula (`149,90`) e separador de milhar.
- Opções: "Atualizar produtos existentes (mesmo slug)" e "Criar categorias/marcas inexistentes".
- Prévia: quantos produtos serão **criados**, quantos **atualizados**, quais categorias/marcas serão criadas.
- **Confirmação explícita** antes de gravar; gravação em lotes de 50; relatório final com criados,
  atualizados e falhas (linha + motivo). Produtos importados entram com `is_demo = false`.
- Se `admin_users` não liberar o usuário, a gravação falha no banco (RLS) — a tela mostra o erro real.

---

## 9. Imagens

- Demonstração: placeholder neutro do componente `product-image` (nunca imagem de IA fingindo produto real).
- Admin: upload para o bucket `product-images` em `products/{uuid}.{ext}`, validação de tipo (jpeg/png/webp/avif)
  e tamanho (≤ 5 MB), prévia, trocar e remover (remove também o objeto antigo do storage).
- Público: `aspect-square`, `object-contain`, proporção preservada, `loading="lazy"` (exceto a imagem
  principal do produto, que usa `eager`) e `decoding="async"`, com largura/altura reservadas para não
  deslocar o layout.

---

## 10. Produtos de demonstração

- Todos os 13 produtos de exemplo entram com `is_demo = true` e nunca são tratados como catálogo definitivo.
- Dashboard e `/admin/produtos` mostram um aviso com a contagem: "13 produtos de demonstração" e um
  botão **"Remover produtos de demonstração"** (com diálogo de confirmação) que exclui apenas
  `is_demo = true` em um clique, antes da entrada dos produtos reais. O histórico de orçamentos
  permanece (o `quote_items` guarda o nome do produto).
- Produto novo (formulário ou CSV) entra sempre com `is_demo = false`.

---

## 11. SEO

- `useSeo` por página: `<title>`, meta description, canonical, `og:*`, `twitter:card`; `noindex` nas
  rotas `/admin*` e no orçamento do cliente.
- JSON-LD: `Product` na página do produto (nome, marca, preço, disponibilidade) e `Store` na home.
- URLs amigáveis por slug (`/produto/:slug`), filtros em query string, HTML semântico
  (`header/nav/main/section/article/footer`, um `<h1>` por página, `alt` em imagens).
- `public/robots.txt` — `Sitemap: /sitemap.xml` e `Disallow: /admin`; `public/sitemap.xml` com home,
  catálogo, categorias e os produtos **ativos e não-demo** (sem custo, sem margem).

---

## Arquivos principais

Novos — config/utils: `src/config/{store,navigation}.ts`, `src/lib/{format,slug,whatsapp}.ts`,
`src/types/catalog.ts`, `src/hooks/{use-seo,use-debounce}.ts`.
Novos — dados: `src/services/{catalog,quotes,admin,import}.ts`, `src/context/quote-cart.tsx`.
Novos — público: `src/components/layout/*`, `src/components/catalog/*`, `src/components/home/*`,
`src/pages/{Catalogo,Produto,Orcamento,FinalizarOrcamento}.tsx`, `public/sitemap.xml`.
Novos — admin: `src/admin/auth/{use-admin-session,require-admin}.tsx`,
`src/admin/layout/admin-shell.tsx`, `src/admin/components/*`,
`src/pages/admin/{AdminLogin,Dashboard,AdminProdutos,AdminCategorias,AdminMarcas,AdminOrcamentos,AdminOrcamentoDetalhe}.tsx`.
Alterados: `src/router.tsx`, `src/App.tsx`, `src/pages/Index.tsx`, `src/pages/NotFound.tsx`,
`src/index.css`, `tailwind.config.ts`, `index.html`, `public/robots.txt`,
`src/components/ui/{button,sonner}.tsx`, `package.json`.

---

## Checklist de implementação

- [ ] `supabase_enable` executado e cliente/tipos gerados disponíveis em `src/integrations/supabase/`.
- [ ] `supabase_configure_auth` com `disable_signup: true` (nenhum cadastro público de usuário).
- [ ] Migration cria `categories`, `brands`, `products`, `quotes`, `quote_items`, `admin_users` com FKs,
      `CHECK` de status, colunas geradas (`effective_price`, `discount_percent`, `margin_percent`), `is_demo`,
      trigger de `updated_at` e índices.
- [ ] Migration cria `public.is_admin()` e a view `public.public_products`
      (`security_invoker = false`) sem `cost_price`, `margin_percent` ou `is_demo`, filtrando `active = true`.
- [ ] Seed insere `hipertrofia.publicidade@gmail.com` em `admin_users`.
- [ ] Migration habilita RLS em **todas** as 6 tabelas com as policies da seção 1 e sem policy de `select`
      em `products` para `anon`.
- [ ] `supabase_get_table_schema` confirma, tabela por tabela, RLS habilitada e policies listadas.
- [ ] Bucket `product-images` criado como público com policies de leitura pública e escrita por `is_admin()`.
- [ ] Seed via `supabase_insert`: 10 categorias, 6 marcas, 13 produtos com `is_demo = true`.
- [ ] `src/config/store.ts` com WhatsApp `5519993419516` / `(19) 99341-9516`, Instagram
      `hipertrofia_oficial`, São João da Boa Vista - SP, "10:00 às 18:30", labels de status e limite de
      estoque baixo — e nenhum outro arquivo repetindo esses valores.
- [ ] `src/index.css` e `tailwind.config.ts` com tokens preto/grafite/vermelho, fontes, gradientes,
      sombras e animações; `index.html` com `lang="pt-BR"`, título, description, OG e fontes.
- [ ] `button.tsx` com variantes `brand`/`whatsapp` e tamanhos de toque; `sonner.tsx` em tema escuro.
- [ ] `QuoteCartProvider` registrado em `src/App.tsx` e persistindo em `localStorage`.
- [ ] Home com banner, busca, Mais vendidos, Ofertas, Categorias, Principais marcas e rodapé com os dados reais de contato.
- [ ] `/catalogo` com busca, filtro de categoria, filtro de marca, ordenação (incluindo por preço) e adicionar ao orçamento.
- [ ] `/produto/:slug` com foto, marca, preços, descrição, specs, quantidade, adicionar ao orçamento,
      WhatsApp e relacionados.
- [ ] `/orcamento` permite alterar quantidade, remover, ver subtotais, quantidade total e valor total.
- [ ] `/orcamento/finalizar` segue a ordem validar → revalidar preços → salvar → gerar mensagem → abrir
      WhatsApp → confirmar → limpar carrinho.
- [ ] `src/admin/auth/*` registra `onAuthStateChange` antes de `getSession()`, guarda sessão e usuário,
      defer chamadas ao client e bloqueia `/admin*` para não administradores.
- [ ] `/admin/login` contém apenas e-mail, senha e o botão Entrar — nenhuma aba, botão ou link de
      cadastro, e nenhuma senha registrada no código.
- [ ] `src/admin/auth/*` nunca grava autorização em `localStorage`/`sessionStorage`; o cliente de auth
      persiste apenas a sessão do Supabase.
- [ ] `/admin` com os 5 indicadores do dashboard e os orçamentos recentes.
- [ ] `/admin/produtos` com tabela (custo, margem, estoque, ativo, destaque) e formulário de criar/editar
      com upload de imagem.
- [ ] `/admin/categorias` e `/admin/marcas` permitem listar, criar, editar e ativar/desativar.
- [ ] `/admin/orcamentos` com cliente, WhatsApp, data, quantidade de itens, total, status e detalhes.
- [ ] `/admin/orcamentos/:id` mostra todos os dados do orçamento, permite alterar status e abrir a
      conversa do cliente no WhatsApp.
- [ ] Importação CSV com papaparse, validação, contadores de válidos/erros, linhas com erro, prévia e
      confirmação antes de gravar, além do modelo para download.
- [ ] Aviso de dados de demonstração com botão "Remover produtos de demonstração" (somente `is_demo = true`).
- [ ] `useSeo` aplicado nas páginas públicas e `noindex` em `/admin*` e no orçamento.
- [ ] `robots.txt` com `Disallow: /admin` + sitemap; `public/sitemap.xml` gerado sem produtos demo/inativos.
- [ ] `router.tsx` com as rotas públicas, as rotas `/admin*` aninhadas no layout protegido e o catch-all por último.

## Checklist de verificação

- [ ] `pnpm lint` e `pnpm exec tsc --noEmit` sem erros; `pnpm run build` conclui com sucesso.
- [ ] `supabase_read_query` em `public_products` **falha** ao tentar selecionar `cost_price` ou
      `margin_percent` (colunas inexistentes) e não retorna nenhum registro com `active = false`.
- [ ] Consulta crua em `products` como `anon` não retorna linhas (sem policy de select para `anon`).
- [ ] `supabase_read_query` em `quotes`/`quote_items` sem sessão de administrador não é possível pela API
      pública; nenhum `select` anônimo está liberado.
- [ ] `supabase_read_query` confirma 10 categorias, 6 marcas e 13 produtos, todos com `is_demo = true`.
- [ ] Orçamento de teste cria 1 linha em `quotes` com `status = 'new'` e N em `quote_items` com
      `subtotal = quantity * unit_price`.
- [ ] Adicionar 2 produtos, mudar quantidade, remover 1 e recarregar: orçamento e total permanecem corretos.
- [ ] Finalização com nome/WhatsApp vazios é bloqueada com mensagem de validação e **não** grava no banco.
- [ ] Finalização com carrinho vazio redireciona para `/catalogo`.
- [ ] Simulação de falha no salvamento mantém o carrinho cheio e não exibe sucesso.
- [ ] Busca por termo inexistente e combinação categoria + marca sem resultado mostram estado vazio, sem erro.
- [ ] Ordenação por menor preço e por maior desconto respeitam `effective_price`/`discount_percent` (promoção considerada).
- [ ] `/produto/slug-inexistente` mostra estado de não encontrado, não tela em branco.
- [ ] `/admin` sem sessão redireciona para `/admin/login`; usuário autenticado fora de `admin_users` vê
      "acesso não autorizado" e não consegue ler produto, orçamento ou gravar nada.
- [ ] Login com `hipertrofia.publicidade@gmail.com` acessa o dashboard; credenciais fora de
      `admin_users` não obtêm permissão nenhuma.
- [ ] Tentativa de cadastro pela aplicação falha (cadastro público desativado) — nenhuma tela oferece
      signup e o endpoint de signup rejeita a criação de conta.
- [ ] Administrador logado cria, edita, ativa/desativa, altera preço, promoção, custo, estoque, categoria,
      marca, destaque e specs, e a alteração aparece no catálogo público.
- [ ] Upload de imagem no admin gera URL pública em `product-images` e a imagem aparece no card e na
      página do produto sem distorção.
- [ ] Importação de um CSV com linhas válidas e inválidas mostra os contadores e as linhas com erro
      corretos e, após confirmar, grava apenas as válidas.
- [ ] Alterar status de um orçamento no painel persiste e aparece na listagem com o rótulo em português
      (Novo / Em atendimento / Vendido / Cancelado).
- [ ] "Abrir conversa no WhatsApp" no detalhe do orçamento usa `wa.me/5519993419516` e o número do cliente.
- [ ] "Remover produtos de demonstração" exclui os 13 produtos demo e o catálogo público fica com o
      catálogo real (estado vazio tratado, sem erro).
- [ ] `website_screenshot` em `mobile_390` e `desktop_1280` para home, `/catalogo`, `/produto/:slug`,
      `/orcamento/finalizar`, `/admin/login` e `/admin`: sem overflow horizontal, alvos de toque
      confortáveis, contraste legível e imagens sem distorção.
- [ ] `get_console_logs` sem erros de runtime no fluxo público e no painel.

---

## Estado da entrega (verificado)

### Entregue e verificado

- [x] Enter Cloud conectado; cadastro público de usuário **desativado** (`disable_signup: true`).
- [x] Tabelas `categories`, `brands`, `products`, `quotes`, `quote_items`, `admin_users` com FKs,
      `CHECK` de status, colunas geradas (`effective_price`, `discount_percent`, `margin_percent`),
      `is_demo`, trigger de `updated_at` e índices.
- [x] RLS habilitada nas 6 tabelas, conferida com consulta às políticas do Postgres.
- [x] View `public_products` sem `cost_price`, `margin_percent` e `is_demo`, só com produtos ativos.
- [x] `create_quote` (security definer) com autoteste de migração: cria, valida total/itens/status,
      apaga o próprio registro de teste e recusa produto inexistente, nome inválido e WhatsApp inválido.
- [x] Seed: 10 categorias, 6 marcas, 13 produtos com `is_demo = true`; administrador
      `hipertrofia.publicidade@gmail.com` na lista de administradores.
- [x] Bucket `product-images` público com 4 policies (leitura pública; escrita só para administrador).
- [x] Verificação anônima real pela API pública: criar orçamento retorna HTTP 200 com total 319,80
      (2 x 159,90 do preço promocional); ler `quotes` devolve vazio; ler `products` devolve
      401/42501 (permission denied); ler `public_products` funciona; pedir `cost_price` devolve 42703.
- [x] Orçamento de teste removido: `quotes` e `quote_items` em 0 linhas.
- [x] `pnpm lint`, `pnpm exec tsc --noEmit` e `pnpm run build` sem erros.
- [x] Telas conferidas por captura: home em 390px e 1280px, catálogo em 390px e 1280px,
      página de produto em 390px e `/admin` (redireciona para o login).
- [x] Correções visuais após verificação: botão do card deixou de transbordar; hero trocou a alegação
      genérica de desconto pelos dados reais de atendimento.

### Pendente de verificação (depende da conta de administrador)

- [ ] Fluxos autenticados do painel: cadastrar/editar/excluir produto, alterar preço, promoção, custo,
      estoque, categoria, marca, destaque, specs, upload de imagem, CRUD de categorias e marcas,
      alteração de status do orçamento e detalhe do orçamento.
- [ ] Importação CSV ponta a ponta no navegador.

Para isso a conta de administrador precisa existir com o e-mail `hipertrofia.publicidade@gmail.com`.
Como o cadastro público está desativado, há dois caminhos: criar a conta pelo mecanismo
administrativo do Enter Cloud, ou eu ativar o cadastro por um instante para você criar a conta com
sua senha e desativar em seguida.

---

# Tarefa atual: conta de administrador + exportação para o GitHub

## Contexto

Duas necessidades, nenhuma delas alterando o app:

1. **Conta de autenticação do administrador.** A tabela `admin_users` já tem o e-mail
   `hipertrofia.publicidade@gmail.com`, mas ainda **não existe usuário de autenticação** (a lista de
   usuários está vazia), então não há como entrar em `/admin`. O cadastro público está desativado
   (`disable_signup: true`) e deve continuar assim.
2. **Exportar o projeto para o GitHub** na conta `jhowesp`, usando a conexão de workspace
   "GitHub de Jhow Esperança" que já existe, **sem alterar nenhum arquivo do projeto**.

## Parte A — Criar o primeiro usuário administrador

Caminho escolhido: **você cria pelo painel do Enter Cloud** (em Autenticação → Usuários). Não existe
ferramenta do meu lado para criar usuário de autenticação, e a senha não deve passar por mim.

Procedimento:

1. Em **Autenticação → Usuários**, crie um usuário com exatamente
   `hipertrofia.publicidade@gmail.com` e a senha que você quiser.
2. Marque o usuário como **confirmado** (auto-confirmação de e-mail já está ligada no projeto; se o
   painel pedir, confirme manualmente). Sem isso o login é recusado.
3. **Não** reative o cadastro público: ele permanece desativado, e isso não muda nada para o seu acesso.
4. Entre em `/admin/login` com esse e-mail e a senha definida. O painel autoriza pelo e-mail estar em
   `admin_users` (verificado no banco por `is_admin()`, não no navegador).

O que **não** precisa ser feito: nada de cadastro pela aplicação, nada de alterar código, nada de
mexer nas políticas de RLS — a autorização já está pronta e testada.

Verificação: contagem de usuários de autenticação maior que zero e login chegando em `/admin`
(dashboard). Se o login responder "Esta conta não tem acesso ao painel", o e-mail cadastrado está
diferente do que está em `admin_users`.

Observação: enquanto o usuário não existir, os fluxos autenticados do painel (cadastrar/editar
produto, CSV, status de orçamento) continuam **não verificados** — a autorização e as negações para
anônimos já foram testadas, mas o CRUD autenticado só pode ser testado depois deste passo.

## Parte B — Exportar para o GitHub

Caminho: **connector GitHub no chat** (não é o App Runtime). O catálogo já aponta a conexão do
workspace (`GitHub de Jhow Esperança`, conta `jhowesp`) com `state: selection_required`. Selecionar a
conexão para este chat libera as operações do GitHub para eu executar a exportação aqui, sem criar
backend function nem tocar em arquivo do projeto — é justamente o que evita a alteração que você pediu
para não fazer.

Sequência:

1. `request_connector_access({ kind: "chat_connector", connector_id: "plg_daam7o162a4pv4q7h5e0" })`
   para selecionar a conexão existente para este chat.
2. Inspecionar as operações disponíveis (`search_operations` + `get_operation`) antes de gravar:
   criação de repositório, criação/atualização de arquivo e envio em lote. Se alguma operação
   necessária estiver desabilitada, eu informo e paro em vez de improvisar outro caminho.
3. Criar o repositório **`hipertrofia-catalogo`**, **privado**, na conta `jhowesp`.
4. Enviar os arquivos do projeto, preservando os caminhos: `src/**`, `public/**`, `supabase/**`,
   `index.html`, `package.json`, `pnpm-lock.yaml`, `tailwind.config.ts`, `postcss.config.js`,
   `tsconfig*.json`, `eslint.config.js`, `components.json`, `.gitignore`, `.npmrc`,
   `.env.example`, `i18n.config.json`, `README.md`, `CodeGuideline.md`.
   - `src/integrations/supabase/client.ts` **entra** (é a chave pública que já vai embutida no site).
   - Ficam fora: `node_modules/`, `dist/` e `.enter/` (metadados internos de trabalho).
   - Envio em lotes por tamanho, não por quantidade: `src/integrations/supabase/types.ts` (136 KB) e
     `pnpm-lock.yaml` (204 KB) vão sozinhos ou com poucos arquivos; o restante em lotes maiores.
     Binários (`public/favicon.ico`) em base64.
   - Nada é reescrito no projeto: o conteúdo vem dos arquivos já versionados, sem edição.
5. Conferir o resultado: listar a raiz do repositório e reabrir 2–3 arquivos (um `.tsx` de página, o
   `index.html` e o `package.json`) comparando com os originais, e confirmar a contagem de arquivos
   enviados.

Riscos e limites conhecidos:
- Se o repositório já existir na conta, eu paro e pergunto antes de escrever nele.
- Se houver limite de tamanho por chamada, eu reduzo o lote; o envio é retomável, arquivo a arquivo.
- O repositório é privado, então o conteúdo (inclusive o e-mail dentro de `.enter/`, que fica fora)
  não fica exposto.
- A exportação é um retrato único: depois de novas alterações no projeto, uma nova sincronização
  precisa ser pedida novamente.

## Checklist da tarefa

- [ ] Usuário `hipertrofia.publicidade@gmail.com` criado e confirmado em Autenticação → Usuários.
- [ ] Cadastro público continua desativado (nenhuma mudança em `supabase_configure_auth`).
- [ ] Login em `/admin/login` abre o dashboard do painel.
- [ ] Conexão GitHub (`plg_daam7o162a4pv4q7h5e0`) selecionada para este chat.
- [ ] Operações de repositório e de gravação de arquivo inspecionadas antes do envio.
- [ ] Repositório `hipertrofia-catalogo` criado como privado na conta `jhowesp`.
- [ ] Arquivos enviados preservando os caminhos, sem `node_modules/`, `dist/` ou `.enter/`.
- [ ] Nenhum arquivo do projeto foi alterado durante a exportação.
- [ ] Raiz do repositório conferida e 3 arquivos comparados com os originais.
- [ ] Contagem de arquivos enviados confere com o conjunto exportado.

## Operações GitHub confirmadas (inspeção read-only já feita)

Conexão para este chat: **GitHub de Jhow Esperança**, conta `jhowesp` (usuário id 284968012),
status ACTIVE, conta do tipo privada. Sessão do conector: `rate`.

| Uso | Operação (tool slug) | Observação |
|---|---|---|
| Conferir identidade | `GITHUB_GET_THE_AUTHENTICATED_USER` | antes de escrever |
| Checar se o repo já existe | `GITHUB_GET_A_REPOSITORY` (owner `jhowesp`, repo `hipertrofia-catalogo`) | 404 = não existe; se existir, paro e pergunto |
| Criar o repositório | `GITHUB_CREATE_A_REPOSITORY_FOR_THE_AUTHENTICATED_USER` com `name: "hipertrofia-catalogo"`, `private: true` | `auto_init: false` |
| Enviar os arquivos | `GITHUB_COMMIT_MULTIPLE_FILES` (`owner`, `repo`, `branch: "main"`, `message`, `upserts:[{path, content, encoding}]`) | 1º commit cria a branch `main`; texto em `utf-8`, binário em `base64` |
| Conferir o resultado | `GITHUB_GET_REPOSITORY_CONTENT` (path `""` lista a raiz) + reabrir 2–3 arquivos | comparação com o original |

Todos os arquivos saem do conteúdo já versionado, sem edição — nada é alterado no projeto.
Lotes por tamanho: `src/integrations/supabase/types.ts` (136 KB) e `pnpm-lock.yaml` (204 KB) vão
sozinhos; o restante em lotes maiores. Fora do repositório: `node_modules/`, `dist/` e `.enter/`.

---

# Bloqueio atual da exportação (verificado em 2026-10-01)

## Evidências coletadas (conexão "GitHub de Jhow Esperança", conta `jhowesp`)

| Verificação | Resultado |
|---|---|
| `GITHUB_GET_THE_AUTHENTICATED_USER` | OK — `jhowesp`, id 284968012 |
| `GITHUB_CREATE_A_REPOSITORY_FOR_THE_AUTHENTICATED_USER` | **403** — "Resource not accessible by integration" |
| `GITHUB_GET_A_REPOSITORY` em `jhowesp/hipertrofia-catalogo` | **404** (inclusive depois de você criar o repositório) |
| `GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER` | **lista vazia**, mesmo com o repositório existindo |
| `GITHUB_FIND_REPOSITORIES` com `user:jhowesp` | **422** — sem permissão para ver os repositórios do usuário |

## Diagnóstico

A instalação da integração GitHub **não tem acesso concedido aos repositórios** dessa conta:
ela não cria repositório, não enxerga o repositório recém-criado e não lista nada. Sem isso, não há
como enviar arquivo algum — e não existe caminho legítimo de contorno (nada de token pessoal,
script próprio ou CLI).

## O que precisa ser feito (do seu lado, na conexão do workspace)

1. Conceder à integração GitHub acesso ao repositório `hipertrofia-catalogo` — ou passar a permitir
   **todos os repositórios** da conta, que é o mais simples.
2. Garantir a permissão de escrita de conteúdo (**Contents: read and write**).
3. Me avisar quando terminar. Eu **reconfiro** com `GITHUB_GET_A_REPOSITORY` antes de escrever —
   sua confirmação sozinha não é prova de acesso, e eu não escrevo em repositório que não consigo ler.

## Envio depois da liberação (estratégia de lotes)

A integração grava arquivos com o conteúdo embutido na própria chamada (não existe envio em lote por
arquivo compactado). O conjunto a enviar é de ~151 arquivos (todos os versionados, menos
`node_modules/`, `dist/` e `.enter/`), cerca de 1,2 MB de texto. Por isso o envio é feito em lotes:

- Lote 1 — raiz: `package.json`, `pnpm-lock.yaml`, `index.html`, `tailwind.config.ts`,
  `postcss.config.js`, `tsconfig*.json`, `eslint.config.js`, `components.json`, `.gitignore`,
  `.npmrc`, `.env.example`, `i18n.config.json`, `README.md`, `CodeGuideline.md`.
- Lotes seguintes — `src/**` (hooks, lib, config, types, services, context, components, pages, admin)
  preservando exatamente os caminhos atuais.
- Lotes finais — `public/**`, `supabase/**` (config.toml e as 3 migrations).
- Os dois arquivos pesados vão sozinhos na chamada: `pnpm-lock.yaml` (204 KB) e
  `src/integrations/supabase/types.ts` (136 KB).
- Nada é editado, recriado, refatorado ou removido: o conteúdo sai exatamente dos arquivos atuais.

## Decisão adotada

Como as perguntas foram canceladas, vale o que você já determinou na mensagem:
**projeto completo, sem omitir arquivo algum**, em vários lotes, excluindo apenas `node_modules/`,
`dist/` e `.enter/`. Nada é editado, recriado, refatorado ou removido.

## Ordem de execução (quando o acesso for liberado)

1. Reconfirmar o acesso com `GITHUB_GET_A_REPOSITORY` (`owner: jhowesp`, `repo: hipertrofia-catalogo`).
   Se ainda vier 404, **paro** e reporto: não escrevo em repositório que não consigo ler.
2. Ler a branch padrão do repositório e usá-la como alvo do commit.
3. Enviar os lotes com `GITHUB_COMMIT_MULTIPLE_FILES`, começando pela raiz e terminando em
   `supabase/**`, cada lote com uma mensagem de commit descrevendo o conteúdo.
4. Conferir com `GITHUB_GET_REPOSITORY_CONTENT` (path vazio, lista a raiz) e reabrir 3 arquivos
   (`src/App.tsx`, `index.html`, `config/store.ts`) comparando com os originais.
5. Relatar a quantidade de arquivos enviados e a lista por pasta.

## Checklist da exportação

- [ ] Acesso da conexão GitHub ao repositório confirmado por leitura (não por suposição).
- [ ] Branch padrão do repositório identificada e usada como alvo.
- [ ] Lote da raiz enviado (configs + README + CodeGuideline).
- [ ] `src/**` completo enviado preservando os caminhos.
- [ ] `public/**` enviado (favicon, robots.txt, sitemap.xml, locales, placeholder).
- [ ] `supabase/**` enviado (config.toml + 3 migrations).
- [ ] `pnpm-lock.yaml` (204 KB) e `src/integrations/supabase/types.ts` (136 KB) enviados.
- [ ] Nenhum arquivo do projeto alterado durante o processo.
- [ ] Raiz do repositório conferida e 3 arquivos comparados com os originais.
- [ ] Quantidade de arquivos enviados conferida contra a lista dos versionados, menos
      `node_modules/`, `dist/` e `.enter/`.

## Segunda verificação de acesso (mesma data)

| Leitura | Resultado |
|---|---|
| `GITHUB_GET_A_REPOSITORY` → `jhowesp/hipertrofia-catalogo` | 404 |
| `GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER` (`type: all`) | lista vazia |
| `GITHUB_GET_REPOSITORY_CONTENT` na raiz (`path: ""`) | 404 |

Conclusão: a conexão continua **sem acesso** ao repositório. Nenhum arquivo foi enviado e nenhuma
escrita foi feita. As causas prováveis, em ordem:

1. A integração GitHub está instalada com acesso apenas a repositórios selecionados, e este não foi
   incluído.
2. O repositório foi criado em outra conta (a conexão autentica como `jhowesp`, id 284968012) —
   vale conferir na barra de endereços do navegador se é exatamente
   `github.com/jhowesp/hipertrofia-catalogo`.
3. A permissão de conteúdo da integração não inclui leitura/escrita de repositórios privados.

Próximo passo (seu): reconectar/autorizar a conexão GitHub concedendo acesso a esse repositório — ou
a todos — com permissão de **Contents: read and write**. Depois disso eu re verifico; se ainda vier
404, continuo parado e reportando, sem escrever nada.

## Terceira verificação e encaminhamento

Terceira leitura, mesmo resultado: `GITHUB_GET_A_REPOSITORY` 404, lista de repositórios vazia,
`GITHUB_GET_REPOSITORY_CONTENT` na raiz 404.

Confirmado com você: a URL é exatamente `github.com/jhowesp/hipertrofia-catalogo`. Como dono e nome
estão corretos, não é erro de identificação — é falta de autorização da integração. A lista de
repositórios vazia e o 403 na criação mostram que a instalação praticamente não tem permissão de
repositório, nem de leitura.

Ação combinada: você vai **reconectar a conexão GitHub** concedendo acesso aos repositórios, com
**Contents: read and write**. Ao reconectar, vale conferir dois pontos:

1. Se a reconexão gerar uma conexão nova, ela pode precisar ser **selecionada para este chat**
   novamente — nesse caso eu refaço `search_chat_connectors` + `request_connector_access` antes de
   qualquer escrita.
2. Se a instalação for do tipo "somente repositórios selecionados", o `hipertrofia-catalogo` precisa
   estar marcado nessa lista.

Assim que você avisar, a primeira ação continua sendo **apenas leitura**: `GITHUB_GET_A_REPOSITORY` e
`GITHUB_GET_REPOSITORY_CONTENT` na raiz. Só depois de as duas responderem com sucesso é que os lotes
de arquivos começam.

## Quarta verificação + isolamento da causa

| Leitura | Resultado |
|---|---|
| `GITHUB_GET_A_REPOSITORY` → `jhowesp/hipertrofia-catalogo` | 404 |
| `GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER` | lista vazia |
| `GITHUB_GET_REPOSITORY_CONTENT` na raiz de `jhowesp/hipertrofia-catalogo` | 404 |
| `GITHUB_GET_REPOSITORY_CONTENT` na raiz de um repositório **público** (`octocat/Hello-World`) | **sucesso** — listou o README |

Isso fecha o diagnóstico: a credencial da integração **funciona** (lê conteúdo de repositório público),
mas a instalação **não tem nenhum repositório concedido** — por isso listar os repositórios da conta
vem vazio e o repositório privado responde 404. Somado ao 403 ao criar repositório, o quadro é de uma
instalação sem permissões de repositório: nem leitura, nem escrita, nem criação.

Consequência prática: nenhuma releitura vai mudar enquanto a autorização não for refeita. Não é nome,
não é dono, não é o repositório estar privado — é a conexão não ter acesso concedido.

Correção (na conexão do workspace): reconectar a integração GitHub concedendo acesso aos repositórios
(todos, ou com `hipertrofia-catalogo` marcado) e a permissão **Contents: read and write**. Depois
disso, a verificação de leitura passa a responder na primeira tentativa e o envio pode começar.

## Quinta verificação (teste de conexão e de transferência)

| Teste | Resultado |
|---|---|
| Estado da conexão GitHub no chat (`search_chat_connectors`) | `ready`, 1 conexão — **conectada** |
| `GITHUB_GET_A_REPOSITORY` → `jhowesp/hipertrofia-catalogo` | 404 |
| `GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER` | lista vazia |
| `GITHUB_GET_REPOSITORY_CONTENT` na raiz do repositório | 404 |

Resposta objetiva: **a conexão está ativa, mas a transferência ainda não é possível.** A integração
não enxerga nenhum repositório da conta `jhowesp`, então não há destino acessível para escrever.
Nada foi enviado e nenhum arquivo do projeto foi alterado.

Lembrete de permissão do workspace: **apenas owner/admin** pode criar/gerenciar conexões e conceder
acessos. Se você não for o dono do workspace, quem for precisa ajustar a conexão GitHub.

### Caminho alternativo, se a conexão não puder ser corrigida

Como a limitação é do acesso da integração (e não do conteúdo), dá para entregar o projeto por
download: gerar um arquivo `.zip` do repositório de trabalho (tudo, exceto `node_modules/`, `dist/` e
`.enter/`) e te devolver um link para baixar e subir manualmente no GitHub. Continua sem alterar
nenhum arquivo do projeto — o zip é um artefato novo, fora do código. Nesse caso o commit final no
GitHub é feito por você, pelo navegador.

## Estado atual (aguardando definição sua)

Perguntas canceladas: nenhum caminho foi escolhido. Situação registrada:

- Conexão GitHub do chat: ativa, conta `jhowesp`.
- Acesso ao repositório `jhowesp/hipertrofia-catalogo`: **negado** (404 na leitura, lista vazia,
  403 na criação). Transferência por essa conexão: indisponível.
- Alternativa preparada e não executada: gerar `.zip` do projeto (sem `node_modules/`, `dist/`,
  `.enter/`) e entregar link de download para commit manual no GitHub.
- Nada foi enviado ao GitHub; nenhum arquivo do projeto foi alterado.

Para retomar basta uma destas duas coisas: (1) avisar que a conexão foi reconectada com acesso aos
repositórios, ou (2) pedir o `.zip` para subir manualmente.

---

# Tarefa: autorizar novo administrador `jhowfa1@hotmail.com`

## Contexto

Você pediu para adicionar `jhowfa1@hotmail.com` como administrador. Situação verificada agora:

- `admin_users` tem **1 registro**: `hipertrofia.publicidade@gmail.com`.
- `auth.users` tem **0 usuários**: nenhuma conta de login existe ainda — nem a do primeiro
  administrador. É por isso que o painel não abre.

## O que eu faço (autorização)

Inserir `jhowfa1@hotmail.com` em `public.admin_users`, mantendo o registro existente. Passam a valer
**dois** e-mails autorizados: `hipertrofia.publicidade@gmail.com` e `jhowfa1@hotmail.com`.
É um `INSERT` de uma linha, sem tocar em nenhuma outra tabela, sem alterar políticas e sem mexer no
catálogo. Nada no app muda: a autorização já está implementada e testada (`is_admin()` + RLS).

SQL previsto (idempotente):

```sql
insert into public.admin_users (email)
values ('jhowfa1@hotmail.com')
on conflict (email) do nothing;
```

## O que depende de você (conta de login)

A senha **não** passa por mim, não é gravada no projeto e eu não tenho ferramenta para criar usuário
de autenticação. Em **Autenticação → Usuários** (Enter Cloud), crie a conta com o e-mail que for usar
como login — `jhowfa1@hotmail.com` e/ou `hipertrofia.publicidade@gmail.com` — escolhendo a senha na
tela e marcando o usuário como **confirmado**. O cadastro público continua desativado.

**Segurança:** a senha que você escreveu no chat não foi usada nem armazenada por mim em nenhum
lugar. Como ela trafegou em texto aberto, o recomendável é trocá-la depois de criar a conta.

## Verificação após executar

1. `select email from public.admin_users order by email` → deve retornar os dois e-mails.
2. `select count(*) from auth.users` → deve ser > 0 depois que você criar a conta.
3. Login em `/admin/login` com o e-mail cadastrado abre o dashboard.
4. Um e-mail **fora** da lista, mesmo com conta criada, recebe "acesso não autorizado" — a checagem é
   no banco (`is_admin()`), não no navegador.

## Checklist

- [ ] `jhowfa1@hotmail.com` inserido em `public.admin_users` (com `on conflict do nothing`).
- [ ] Registro existente `hipertrofia.publicidade@gmail.com` preservado.
- [ ] Leitura de `admin_users` confirma exatamente 2 e-mails autorizados.
- [ ] Conta de login criada por você em Autenticação → Usuários, marcada como confirmada.
- [ ] Login em `/admin/login` chega ao dashboard.
- [ ] Senha usada no chat trocada depois da criação da conta.
- [ ] Nenhuma senha gravada no projeto, no plano ou em qualquer tabela.

---

# Acesso administrativo: concluído, agora fechar a janela temporária

## Contexto

Funcionou. Verificado no banco:

- `auth.users`: 1 conta — `hipertrofia.publicidade@gmail.com`, **confirmada**, com senha, último
  acesso em 07/10/2026 15:25 (ou seja, o login no painel aconteceu).
- `admin_users`: 2 e-mails autorizados — `hipertrofia.publicidade@gmail.com` e `jhowfa1@hotmail.com`.

A causa raiz do bloqueio anterior ficou identificada e registrada: o provedor de e-mail estava
desligado (`external_email_enabled: false`), o que derrubava cadastro **e** login por senha. Com ele
ligado, o cadastro passou.

## O que falta fazer (limpeza combinada)

1. **Fechar o cadastro público de volta**: `supabase_configure_auth` com `disable_signup: true`
   (mantendo `auto_confirm_email: true` e `external_anonymous_users_enabled: false`).
2. **Remover o formulário temporário** de `src/pages/admin/AdminLogin.tsx`, devolvendo a tela ao
   formato exigido: somente e-mail, senha e botão Entrar — sem modo de criação de conta, sem
   `describeAuthError`/`reportAuthError` órfãos.
3. **Revalidar**: `pnpm lint`, `pnpm exec tsc --noEmit` e `pnpm run build`.
4. Conferir no endpoint de configuração que `disable_signup` voltou a `true`.

## Verificação

- [ ] `disable_signup: true` confirmado no endpoint de configuração de autenticação.
- [ ] `external_anonymous_users_enabled: false` mantido.
- [ ] `/admin/login` mostra apenas e-mail, senha e Entrar (nenhuma opção de criar conta).
- [ ] A conta existente continua entrando e chega ao dashboard (login não depende da janela aberta).
- [ ] `pnpm lint`, `tsc --noEmit` e `build` sem erros.
- [ ] Nenhuma alteração em RLS, tabelas, políticas ou no catálogo público.

## Observação

Com a conta criada, os fluxos autenticados do painel (cadastrar/editar produto, upload de imagem,
CRUD de categorias e marcas, importação CSV e alteração de status de orçamento) podem finalmente ser
testados por você no dia a dia — antes eles estavam impossíveis de exercitar.

---

# Nova tarefa: até 5 fotos por produto

## Contexto

Hoje cada produto tem **uma** foto: a coluna `products.image_url` (um texto) com upload único em
`src/admin/components/image-uploader.tsx`. Você quer até 5 fotos por produto no cadastro do painel.
A entrega inclui o banco, o formulário do admin e a exibição pública — de nada serve subir 5 fotos se
o cliente só vê uma.

## Decisões de arquitetura

1. **Onde guardar as fotos.** Uma coluna nova em `products`: `images text[] NOT NULL DEFAULT '{}'`
   (lista de URLs no Enter Cloud Storage). Um array resolve bem "até 5 fotos sem legenda": fica na
   própria linha do produto, não exige tabela extra nem junção na view pública, e não cria consulta
   N+1. Um `CHECK` no banco garante o limite: no máximo 5 itens.
2. **A foto principal continua sendo `image_url`.** Ao salvar, o app grava `images` e espelha
   `images[1]` em `image_url`. Assim card do catálogo, carrinho, JSON-LD e SEO continuam funcionando
   sem nenhuma alteração — e não há duas fontes de verdade na tela.
3. **Reaproveitar o que já existe.** Mesmo bucket `product-images`, mesmo caminho
   `products/{uuid}.{ext}`, mesmas funções de `src/services/storage.ts`
   (`uploadProductImage`, `removeProductImageByUrl`, `validateImageFile`) e o mesmo limite de 5 MB.
   Nada de infraestrutura nova.
4. **Sem tabela nova** e sem mexer em RLS: a policy de admin em `products` já cobre a coluna nova.

## Mudanças

### Banco (migration)

- `alter table public.products add column images text[] not null default '{}'`.
- `CHECK` de limite: `array_length(images, 1) is null or array_length(images, 1) <= 5`.
- Recriar a view `public_products` acrescentando `images` **no fim** da lista de colunas
  (`create or replace view` aceita coluna nova no final; o público continua sem `cost_price`,
  `margin_percent` e `is_demo`).
- Nada de `DROP`, nada de remover coluna, nada de apagar dado.

### Admin

- Novo componente `src/admin/components/product-image-gallery.tsx`:
  - botão de envio (aceita também seleção múltipla), no máximo 5 imagens no total;
  - miniaturas com remover individual e ação "usar como principal" (a principal é a que vai para o card);
  - aviso quando o limite de 5 é atingido e bloqueio do envio além disso;
  - remoção também apaga o arquivo do storage (reaproveitando `removeProductImageByUrl`).
- `src/admin/components/product-form-sheet.tsx`: trocar o `ImageUploader` único pela galeria; salvar
  `images` e `image_url` (principal) juntos.

### Público

- `src/types/catalog.ts`: `CatalogProduct` ganha `images: string[]`.
- `src/services/catalog.ts`: incluir `images` na consulta e no mapeamento.
- `src/pages/Produto.tsx`: imagem principal grande + faixa de miniaturas clicáveis para trocar a
  exibição (com `loading="lazy"` e proporção preservada, sem distorcer a embalagem).
- `src/components/catalog/product-card.tsx`: **sem mudança** — continua usando a principal.

### Pendência de segurança que continua aberta

O cadastro público ainda está **liberado** e o formulário temporário "Criar acesso" ainda está em
`/admin/login`. A conta já existe e o login funciona, então isso deve ser fechado:
`disable_signup: true` de volta e remoção do modo de cadastro da tela, deixando apenas e-mail, senha e
Entrar — exatamente o que você pediu no começo.

## Checklist de implementação

- [ ] Migration: coluna `images text[]` em `products` com `CHECK` de no máximo 5.
- [ ] Migration: view `public_products` recriada expondo `images` no fim da lista.
- [ ] `CatalogProduct.images` criado em `src/types/catalog.ts` e preenchido em `src/services/catalog.ts`.
- [ ] `product-image-gallery.tsx` criado com limite de 5, remover, definir principal e limpeza no storage.
- [ ] `product-form-sheet.tsx` usando a galeria e salvando `images` + `image_url` (principal).
- [ ] `Produto.tsx` exibindo principal + miniaturas clicáveis.
- [ ] `disable_signup: true` restaurado e modo de cadastro removido de `AdminLogin.tsx`.

## Checklist de verificação

- [ ] `pnpm lint`, `pnpm exec tsc --noEmit` e `pnpm run build` sem erros.
- [ ] No painel: enviar 3 fotos em um produto, definir outra como principal e salvar.
- [ ] O banco mostra `images` com 3 URLs e `image_url` igual à principal escolhida.
- [ ] A 6ª foto é recusada com aviso de limite (na tela e pelo `CHECK` do banco).
- [ ] Remover uma foto apaga a linha da lista e o arquivo correspondente do storage.
- [ ] A página do produto mostra a principal e troca a imagem grande ao clicar nas miniaturas.
- [ ] O card do catálogo continua exibindo a principal, sem distorção.
- [ ] Produto sem foto continua exibindo o placeholder neutro.
- [ ] `/admin/login` volta a ter somente e-mail, senha e Entrar, com `disable_signup: true`.

---

# Correção: lápis de edição invisível na lista de produtos

## Contexto (causa identificada)

`src/admin/components/products-table.tsx` monta a tabela de desktop com **10 colunas**
(Produto, Categoria/Marca, Preço, Promoção, Custo, Margem, Estoque, Ativo, Destaque, **Ações**) e o
contêiner usa `overflow-hidden` (linha 116). O painel ainda reserva 240px para a barra lateral, então
em telas de 1024–1400px a tabela fica mais larga que a área disponível e as colunas da direita são
**cortadas** — a última é exatamente a de **Ações**, que contém o lápis de editar. Por isso o botão
"some" em vez de aparecer.

O layout de cartões (`lg:hidden`, com botão "Editar" textual) só entra abaixo de 1024px, ou seja,
justamente na faixa mais usada em notebook o usuário cai no layout problemático.

## Mudanças (só em `src/admin/components/products-table.tsx`)

1. **Nunca mais cortar**: trocar `overflow-hidden` por `overflow-x-auto` no contêiner da tabela.
2. **Coluna de ações sempre visível**: `sticky right-0` com fundo próprio, para o lápis continuar no
   lugar mesmo se a tabela rolar na horizontal.
3. **Reduzir o quadro** (o que você pediu): compactar de 10 para 7 colunas, agrupando informação:
   - **Produto** passa a mostrar categoria e marca embaixo do nome (elimina a coluna
     "Categoria / Marca");
   - **Preço** mostra o promocional logo abaixo (elimina a coluna "Promoção");
   - **Custo / Margem** em uma única coluna, empilhados (elimina a coluna "Margem");
   - Colunas restantes: Produto, Preço, Custo/Margem, Estoque, Ativo, Destaque, Ações.
4. **Padding menor** nas células (`px-3 py-2.5` em vez de `px-4 py-3`) e `whitespace-nowrap` nos
   valores numéricos, para o conjunto caber na largura do conteúdo em 1024px.
5. **Ações mais visíveis**: botões de Editar e Excluir com borda (`variant="outline"`), ícones um
   pouco maiores e rótulo "Editar" visível a partir de `xl` — hoje são ícones sem borda, fáceis de
   passar despercebidos.
6. O layout de cartões abaixo de `lg` continua igual (já tem botão "Editar" textual).

## Checklist

- [ ] Contêiner da tabela com `overflow-x-auto` no lugar de `overflow-hidden`.
- [ ] Coluna "Ações" com `sticky right-0` e fundo, mostrando lápis e lixeira.
- [ ] Tabela reduzida a 7 colunas com categoria/marca, promoção, custo e margem agrupados.
- [ ] Padding das células reduzido e valores numéricos sem quebra.
- [ ] Botões de ação com borda e rótulo "Editar" a partir de `xl`.
- [ ] Cartões abaixo de `lg` inalterados.

## Verificação

- [ ] `pnpm lint`, `pnpm exec tsc --noEmit` e `pnpm run build` sem erros.
- [ ] Conferência de largura por cálculo: 7 colunas com padding reduzido cabem na área útil a
      partir de 1024px (a de ações fixa na borda direita como garantia).
- [ ] Você recarrega **Produtos** na sua sessão e confirma o lápis visível e o quadro menor.
      Observação honesta: essa tela exige login e eu não consigo abrir o painel autenticado para
      capturar imagem — por isso a garantia estrutural (ações fixas + rolagem horizontal) em vez de
      só ajuste de largura.

## Observação

Se "o quadro" que você quer diminuir for o **formulário** de produto (aquele painel lateral grande),
me diga: ele hoje abre com 672px de largura e vários campos agrupados; dá para reduzir, mas como ele
tem bastante campo, prefiro confirmar antes de apertar.

---

# Nova tarefa: banners promocionais configuráveis + carrossel interativo na home

## Contexto

Hoje a home tem um banner fixo (`src/components/home/hero.tsx`), sem forma de trocar a campanha sem
mexer em código. Você pediu (1) uma aba no painel para configurar banners promocionais e (2) um
banner interativo na home, com acabamento profissional.

Decisões confirmadas:
- O carrossel **substitui** o banner atual quando existir pelo menos um banner ativo; **sem banner
  cadastrado, a home continua exatamente como está** (nada quebra).
- **Sem agendamento**: apenas ativo/inativo.

## Reaproveitamento (nada novo desnecessário)

- `src/components/ui/carousel.tsx` (embla) já vem no projeto — é o motor do carrossel, com arraste no
  celular, teclado e `CarouselApi`. Não entra dependência nova (o plugin de autoplay não será
  instalado; o autoplay usa o próprio `api.scrollNext()`).
- O bucket de imagens e as funções de `src/services/storage.ts` serão generalizados para servir
  produto e banner, sem duplicar validação de tipo/tamanho.
- O componente `DemoDataCard` e a limpeza de dados de demonstração passam a cobrir banners também.

## Banco e armazenamento (migration)

Tabela `public.banners`:
- `id`, `eyebrow text` (selo acima do título), `title text not null` (título obrigatório),
  `subtitle text`, `image_url text`, `cta_label text`, `cta_href text`, `active boolean default true`,
  `position integer default 0`, `is_demo boolean default false`, `created_at`, `updated_at`.
- `CHECK` do título com pelo menos 2 caracteres e **`CHECK` de segurança do link**:
  `cta_href is null or cta_href ~ '^(/|https?://)'` — impede `javascript:` no destino do botão.
- Trigger de `updated_at` (reaproveita `public.set_updated_at()` já existente) e índice em
  `position`.
- RLS habilitada na criação, com duas políticas: leitura pública apenas de banners ativos e gestão
  completa só para administrador (`is_admin()`).
- Sem colunas sensíveis, então não é preciso view pública (diferente de `products`, que esconde custo
  e margem).

Bucket `banner-images`: público, 5 MB, `image/jpeg, image/png, image/webp, image/avif`, com as
mesmas quatro políticas já usadas no bucket de produto (leitura pública; escrita só para
administrador). Objetos em `banners/{uuid}.{ext}`.

Seed: **2 banners demonstrativos** com `is_demo = true` (um de ofertas apontando para
`/catalogo?ordem=discount` e um institucional com o WhatsApp da loja), para a home já mostrar o
carrossel e você poder editar/remover.

## Painel (`/admin/banners`)

- Novo item **Banners** no menu do painel (`src/admin/layout/admin-shell.tsx`) e rota em
  `src/router.tsx`.
- Lista com: miniatura do banner (mesmo desenho do site), título, destino do botão, **ordem com
  subir/descer**, chave ativo/inativo, editar e excluir com confirmação.
- Formulário (sheet): selo, título, subtítulo, imagem (upload com prévia e remover), texto e link do
  botão, ativo — e uma **prévia ao vivo** do slide exatamente como fica na home.
- Limite de **6 banners** na tela do painel, com aviso, para o carrossel não virar um slideshow
  interminável.
- Validação no app (título, link começando com `/` ou `http`) além do `CHECK` no banco.

## Home (banner interativo)

Novo `src/components/home/hero-carousel.tsx`, usando o carrossel existente:
- Slide no visual da marca: imagem de fundo com véu escuro + gradiente vermelho, selo, título em
  Anton, subtítulo e botão de ação (link interno ou externo com `rel="noopener noreferrer"`).
- **Interações**: avanço automático a cada 6s, **pausado ao passar o mouse, ao focar e quando a aba
  não está visível**; navegação por setas (desktop) e **arraste** (celular); indicadores clicáveis.
- **Acessibilidade**: `aria-roledescription="carousel"`, rótulos "1 de N", botões com descrição,
  indicadores como botões, e **respeito a `prefers-reduced-motion`** (desliga o avanço automático e
  as transições animadas).
- **Sem salto de layout**: altura fixa por faixa de tela (mobile/desktop) e imagem do primeiro slide
  carregada com prioridade, as demais com `loading="lazy"`.
- **Um único banner ativo** → vira uma faixa estática, sem setas nem indicadores.
- **Nenhum banner ativo** → renderiza o `Hero` atual, inalterado. A faixa de selos de confiança
  ("Marcas originais • Retirada na loja • Orçamento sem compromisso") sai para
  `src/components/home/hero-trust-row.tsx` e passa a ser usada pelos dois.

## Arquivos

Novos: `src/types/banner.ts`, `src/services/banners.ts`,
`src/admin/components/banner-form-sheet.tsx`, `src/admin/components/banner-preview.tsx`,
`src/pages/admin/AdminBanners.tsx`, `src/components/home/hero-carousel.tsx`,
`src/components/home/hero-trust-row.tsx`.
Alterados: `src/router.tsx`, `src/admin/layout/admin-shell.tsx`, `src/pages/Index.tsx`,
`src/components/home/hero.tsx`, `src/services/storage.ts`, `src/services/admin.ts`,
`src/admin/components/demo-data-card.tsx`, `src/config/store.ts`, `src/pages/admin/AdminDashboard.tsx`.

## Checklist de implementação

- [ ] Migration: tabela `banners` com os `CHECK` (título e esquema do link), trigger de `updated_at`
      e índice de `position`.
- [ ] RLS habilitada em `banners` com leitura pública só de ativos e gestão por `is_admin()`.
- [ ] Bucket `banner-images` criado com as quatro políticas (leitura pública, escrita por admin).
- [ ] Seed de 2 banners demonstrativos com `is_demo = true`.
- [ ] `src/types/banner.ts` e `src/services/banners.ts` (listar ativos, listar todos, criar, editar,
      excluir, ativar/desativar, reordenar).
- [ ] `src/services/storage.ts` generalizado, mantendo as assinaturas atuais de produto intactas e
      somando as de banner.
- [ ] Item "Banners" no menu e rota `/admin/banners` protegida pelo `RequireAdmin`.
- [ ] `AdminBanners.tsx` com lista, reordenação, ativar/desativar e excluir com confirmação.
- [ ] `banner-form-sheet.tsx` com todos os campos, upload de imagem e prévia ao vivo do slide.
- [ ] `hero-carousel.tsx` com autoplay, pausa em hover/foco/aba oculta, setas, arraste, indicadores,
      `prefers-reduced-motion`, altura fixa e imagem prioritária no primeiro slide.
- [ ] `hero-trust-row.tsx` extraído e usado pelo `Hero` e pelo carrossel.
- [ ] `Index.tsx` busca os banners ativos e escolhe entre carrossel e `Hero` atual.
- [ ] Limpeza de demonstração cobrindo banners (produtos + banners) no card e no dashboard.

## Checklist de verificação

- [ ] `pnpm lint`, `pnpm exec tsc --noEmit` e `pnpm run build` sem erros.
- [ ] Leitura no banco confirma RLS habilitada em `banners` com as duas políticas.
- [ ] Leitura confirma o bucket `banner-images` e suas quatro políticas.
- [ ] Consulta pública (chave anônima) retorna apenas banners ativos.
- [ ] `cta_href` com `javascript:` é recusado pelo `CHECK` do banco.
- [ ] Captura da home em `mobile_390` e `desktop_1280` com o carrossel renderizado no lugar do hero.
- [ ] Com todos os banners desativados (teste temporário por SQL), a home volta a mostrar o `Hero`
      atual — e depois reativo os banners demonstrativos.
- [ ] Nenhum arquivo do catálogo, do orçamento ou da autenticação é alterado por esta tarefa.
- [ ] Limitação declarada: autoplay, arraste, teclado e pausa por hover **não** são comprováveis por
      captura de tela — dependem da sua conferência no navegador.

---

# Repaletização: preto e branco, com vermelho só em botões e destaques

## Contexto

A identidade atual usa vermelho em muitos lugares além do botão: texto de marca, preços em oferta,
títulos, ícones, bordas, selos, brilhos e gradientes. Você definiu a paleta como **preto e branco**,
pediu a **logo branca sobre quadrado preto** (na home e no favicon) e que o **vermelho fique apenas em
botões e destaques**.

Levantamento feito no código: **64 ocorrências de `text-primary`** (vermelho em texto/ícone) e **32 de
fundo/borda/gradiente/brilho**, em cerca de 35 arquivos. Boa parte dessas marcas não vem de classe
solta, e sim dos tokens: `--gradient-hero` (com brilhos vermelhos), `--ring` (foco vermelho),
`--shadow-glow` e `.text-glow`.

## O que continua vermelho (botões e destaques)

- Todos os botões: `Button` (variantes `default` e `brand`), "Adicionar ao orçamento", "Finalizar
  pelo WhatsApp", "Entrar", "Salvar", e o botão flutuante do WhatsApp.
- **Selo de desconto** (-16%) nos cards e na página do produto — é o destaque comercial.
- Cores semânticas de estado: `warning` (estoque baixo) e `destructive` (excluir/erro) permanecem,
  porque não são a cor de marca.

## O que passa a ser preto/branco

1. **Tokens** (`src/index.css`):
   - `--gradient-hero`: vira grafite puro, sem os brilhos vermelhos (afeta home, banners sem imagem,
     faixa de WhatsApp, login do painel, páginas de orçamento e 404).
   - `--ring`: foco neutro (branco suave) no lugar de vermelho.
   - `--shadow-glow` e `.text-glow`: sem vermelho (sombra escura neutra).
   - `--gradient-primary` fica vermelho: é usado só em botões.
2. **Logo e ícones** (`public/brand/`): `badge-192.png`, `badge-384.png`, `favicon.ico` e
   `favicon-64.png` refeitos com **silhueta branca sobre fundo preto**; `og.png` refeito em preto e
   branco (sem a barra vermelha). A silhueta branca sem fundo (`mark-192/640.png`) continua.
3. **Componente da marca** (`brand-logo.tsx`): container do quadrado preto (sem gradiente vermelho) e
   o "SUPLEMENTOS" do lockup passa a branco/cinza.
4. **Textos e ícones** (os 64 usos): nome da marca no card e na página do produto, **preços em
   oferta** (brancos; o desconto continua sinalizado pelo selo e pelo preço riscado), link
   "Ver tudo →", títulos com destaque em vermelho no hero e nos banners, selos/pílulas (inclusive
   "Oferta da semana" e o selo "Principal" da galeria), ícones de confiança, do rodapé, do menu
   mobile, da lista de filtros e de estado vazio, indicadores, e o `h1` com brilho vermelho.
5. **Superfícies**: barra de aviso do topo (tingimento vermelho), cartões do card (hover com borda e
   brilho vermelhos), pílulas de categoria no hover, botões de quantidade/indicadores, o "badge" de
   demonstração e as faixas de aviso do painel.

## Arquivos principais

- `src/index.css` (tokens) e `public/brand/*` + `public/favicon.ico` (assets).
- `src/components/brand/brand-logo.tsx`.
- Site: `src/components/home/{hero,hero-carousel,hero-trust-row,category-grid,section-heading,whatsapp-cta-band}.tsx`,
  `src/components/banner/banner-slide-content.tsx`,
  `src/components/catalog/{product-card,price-block,catalog-filters,catalog-toolbar,quantity-stepper,product-grid}.tsx`,
  `src/components/layout/{site-header,site-footer,cart-drawer,mobile-action-bar}.tsx`,
  `src/pages/{Index,Catalogo,Produto,Orcamento,FinalizarOrcamento,NotFound}.tsx`.
- Painel: `src/admin/layout/admin-shell.tsx`,
  `src/admin/components/{stat-card,demo-data-card,product-image-gallery,product-variant-editor,products-table,quote-status-select,csv-import-sheet}.tsx`,
  `src/pages/admin/*.tsx`.
- Intocados: `src/components/ui/*` de formulário que usam a cor de marca só no estado ativo
  (checkbox, radio, slider, calendar) — decisão: **passam para branco** para manter o monocromático.

## Checklist de implementação

- [ ] `--gradient-hero` sem vermelho e `--ring` neutro em `src/index.css`.
- [ ] `--shadow-glow` e `.text-glow` sem vermelho.
- [ ] `badge-192.png`, `badge-384.png`, `favicon.ico` e `favicon-64.png` com silhueta branca sobre
      preto; `og.png` em preto e branco.
- [ ] `brand-logo.tsx` com quadrado preto e lockup sem vermelho.
- [ ] Preços em oferta em branco no card e na página do produto (selo e preço riscado mantidos).
- [ ] Nome da marca, links "Ver tudo", títulos, selos e pílulas sem vermelho (site e banners).
- [ ] Ícones de confiança, rodapé, menu mobile, filtros, estados vazios e indicadores em cinza/branco.
- [ ] Barra de aviso do topo, hovers de card e pílulas de categoria sem tingimento vermelho.
- [ ] Painel: navegação ativa, cartões de indicador, selo de demonstração, galeria e importação sem
      vermelho; mantidos `warning` e `destructive`.
- [ ] Controles de formulário (checkbox, radio, slider, calendar) em branco no estado ativo.
- [ ] Nenhum botão perde o vermelho; nenhum texto, ícone, borda ou gradiente de marca fica vermelho.

## Checklist de verificação

- [ ] `pnpm lint`, `pnpm exec tsc --noEmit` e `pnpm run build` sem erros.
- [ ] Busca no código não encontra `text-primary` fora de botões, selo de desconto e estados
      semânticos (`warning`/`destructive`).
- [ ] Capturas da home em `mobile_390` e `desktop_1280`: logo branca sobre preto, cabeçalho e rodapé
      monocromáticos, vermelho apenas nos botões e no selo de oferta.
- [ ] Captura do catálogo: cards com preço branco e selo de desconto vermelho.
- [ ] Captura da página de produto: seletor de sabor, informações e preços em preto e branco.
- [ ] Favicon e imagem de compartilhamento conferidos como arquivo (`read_file`) em preto e branco.
- [ ] Limitação declarada: as telas autenticadas do painel não podem ser capturadas por mim; a
      conferência visual do painel depende de você.

---

# Correção: quadrado da logo ainda vermelho (cache do navegador)

## Contexto e causa

Você reportou que o quadrado da logo, ao lado de "HIPERTROFIA", continua com fundo vermelho.
Verificado:

- No **código**: o container do logo já é `bg-black` e a imagem é a versão branca sobre preto.
- Na **home renderizada agora**: o quadrado aparece preto.
- No **arquivo**: `public/brand/badge-192.png` é branco sobre preto (conferido).

Ou seja, o que está vermelho é a **cópia antiga da imagem no cache do seu navegador**. Eu substituí o
conteúdo do arquivo mantendo o **mesmo nome** (`badge-192.png`), então o navegador continua servindo a
versão que baixou antes — a vermelha. Um ajuste de cache do navegador não se resolve só trocando o
conteúdo: é preciso trocar a **URL**.

## Correção estrutural (não depende mais de imagem)

1. **Novo caminho com versão** para os ativos de marca: `public/brand/v2/`
   (`mark-192.png`, `mark-640.png`, `logo-192.png`, `logo-384.png`, `favicon.ico`,
   `apple-touch-64.png`, `og.png`). URL nova = o navegador é obrigado a baixar de novo.
2. **O quadrado passa a ser desenhado pelo CSS**, não pela imagem: o container usa `bg-black`
   (fundo preto garantido pelo CSS, que vem no bundle e é atualizado junto com o código) e dentro
   dele vai a **silhueta branca com fundo transparente** (`mark-192.png`, 4 KB).
   Assim o vermelho deixa de existir em qualquer arquivo de imagem — mesmo que uma imagem fique em
   cache, o quadrado continua preto.
3. **`index.html`**: ícone da aba, apple-touch-icon e imagem de compartilhamento passam a apontar
   para `/brand/v2/...`.
4. **Remover os arquivos antigos** que carregam o vermelho (`public/brand/badge-192.png`,
   `badge-384.png`, `favicon-64.png`, `favicon.ico` da raiz antiga) para não sobrar versão vermelha
   em lugar nenhum do projeto.

## Arquivos

- `src/components/brand/brand-logo.tsx` (quadrado por CSS + silhueta transparente, novo caminho).
- `index.html` (favicon, apple-touch-icon, `og:image`).
- `public/brand/v2/*` (novos) e remoção dos antigos em `public/brand/` e `public/favicon.ico`.

## Checklist de implementação

- [ ] `public/brand/v2/` criado com todos os ativos monocromáticos.
- [ ] `brand-logo.tsx` usando `bg-black` (CSS) + `mark-192.png` transparente do novo caminho.
- [ ] `index.html` apontando favicon, apple-touch e `og:image` para `/brand/v2/`.
- [ ] Arquivos antigos com a versão vermelha removidos do projeto.
- [ ] Nenhuma referência remanescente a `/brand/badge-192.png` ou aos antigos.

## Checklist de verificação

- [ ] `pnpm lint`, `pnpm exec tsc --noEmit` e `pnpm run build` sem erros.
- [ ] Busca no código não encontra referência aos caminhos antigos das imagens.
- [ ] Requisição direta aos novos arquivos responde 200 (URL nova, sem cache).
- [ ] Captura da home em `mobile_390` e `desktop_1280` com o quadrado preto e a silhueta branca.
- [ ] `read_file` confirma que `logo-192.png`, `favicon.ico` do novo caminho e `og.png` são preto e
      branco.
- [ ] Você recarrega a home (se aparecer algo antigo, um recarregamento forçado resolve) e confirma
      o quadrado preto.
