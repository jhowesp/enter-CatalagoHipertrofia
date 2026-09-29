# HIPERTROFIA SUPLEMENTOS — Catálogo digital com orçamento via WhatsApp

## Contexto

O projeto hoje é o template Vite + React + TS + Tailwind + shadcn (uma única página
genérica em `src/pages/Index.tsx`, tema claro azul/roxo, i18n en/zh-CN). O objetivo é
substituí-lo por um **catálogo digital premium** da marca **HIPERTROFIA SUPLEMENTOS**:
fundo preto/grafite, vermelho de destaque, mobile-first.

Escopo desta versão (confirmado):
- **Sem** checkout, pagamento online, frete ou login de cliente.
- Carrinho de **orçamento** persistente no navegador, finalizado pelo **WhatsApp**.
- Catálogo público lendo do **banco de dados** (Enter Cloud), com poucos produtos
  demonstrativos já cadastrados — sem mocks no frontend.
- Imagens dos produtos demo: **placeholders neutros** (o componente de imagem já
  aceita `image_url` real para quando as fotos forem importadas).

Decisões confirmadas com o usuário:
1. Ao enviar o orçamento, **salvar `quotes` + `quote_items`** no banco e depois abrir o WhatsApp.
2. Catálogo carrega **direto do banco**.
3. Imagens: placeholders neutros.
4. Dados de contato reais já fornecidos, centralizados em `src/config/store.ts`:

   | Campo | Valor |
   |---|---|
   | WhatsApp (número) | `5519993419516` |
   | WhatsApp (exibição) | `(19) 99341-9516` |
   | Instagram | `@hipertrofia_oficial` |
   | Localização | São João da Boa Vista - SP |
   | Horário de atendimento | 10:00 às 18:30 |

   Trocar qualquer um desses dados no futuro = editar **apenas esse arquivo**.

---

## 1. Backend (Enter Cloud)

Hoje não existe backend conectado (nenhum `.env`, nenhum cliente Supabase em `src/`).
Primeiro passo: `supabase_enable`. Depois, **toda** mudança de schema via `supabase_migration`
e os dados demo via `supabase_insert`.

### Tabelas (uma migration, com RLS + policies na mesma migration)

`categories`, `brands`, `products`, `quotes`, `quote_items` — exatamente os campos pedidos,
mais três colunas de apoio que servem requisitos explícitos (ordenação por preço, seção de
ofertas e "informações do produto"):

- `products.effective_price numeric(10,2) GENERATED ALWAYS AS (coalesce(sale_price, price)) STORED`
  → permite ordenar por preço considerando a promoção, direto no banco (com índice).
- `products.discount_percent integer GENERATED ALWAYS AS (case when sale_price is not null and price > 0 then round((price - sale_price) / price * 100) else 0 end) STORED`
  → badge de desconto e ordenação por maiores descontos.
- `products.specs jsonb NOT NULL DEFAULT '{}'::jsonb` → bloco "Informações do produto"
  (marca, sabor, peso, porções) sem inflar colunas; pronto para importação futura.
- `products.short_description text` → resumo exibido no card/página.
- Trigger `updated_at` em `products`; índices em `slug`, `brand_id`, `category_id`,
  `featured`, `active`, `effective_price` e `quote_items(quote_id)`.

Relacionamentos: `products.brand_id → brands(id) ON DELETE SET NULL`,
`products.category_id → categories(id) ON DELETE SET NULL`,
`quote_items.quote_id → quotes(id) ON DELETE CASCADE`,
`quote_items.product_id → products(id) ON DELETE SET NULL` (o item guarda `product_name` e
`unit_price` como snapshot, então o orçamento não quebra se o produto for desativado).

### RLS (habilitado na criação, policies escopadas)

- `categories` / `brands` / `products`: `SELECT` público apenas com `active = true`.
- `quotes`: `INSERT` para `anon, authenticated`; **sem** policy de select público
  (ninguém lê orçamento de outro; o admin verá depois com policy própria).
- `quote_items`: `INSERT` com `with check (exists (select 1 from quotes where quotes.id = quote_id))`.
- `GRANT` explícito de `select` em catálogo e `insert` em quotes/quote_items para `anon, authenticated`.
- Conferir com `supabase_get_table_schema` em cada tabela que a RLS está **habilitada e com as policies listadas**.

### Seed demonstrativo (poucos itens, como pedido)

- **10 categorias**: Whey Protein, Creatina, Pré-Treino, Hipercalórico, Barras e Snacks,
  Vitaminas, Termogênicos, Pasta de Amendoim, Acessórios, Outros.
- **6 marcas** do mercado brasileiro (Max Titanium, Integralmédica, Growth Supplements,
  Dux Nutrition, Probiótica, Black Skull).
- **13 produtos** com nomes descritivos genéricos (ex.: "Whey Protein Concentrado 900g",
  "Creatina Monohidratada 300g", "Hipercalórico 3kg", "Coqueteleira 700ml"), distribuídos
  nas 10 categorias; ~5 com `sale_price` (para a seção Ofertas), 8 com `featured = true`,
  `image_url = null` (placeholder neutro), `stock` variado.

---

## 2. Identidade visual (fundação)

**`src/index.css`** — tema escuro por padrão (não depende de classe `dark`), tokens HSL:

- fundo `0 0% 5%` (preto), card/superfície `0 0% 9%` (grafite), border `0 0% 17%`,
  muted-foreground `0 0% 64%` (textos secundários em cinza)
- `--primary: 356 90% 48%` (vermelho Hipertrofia) com `--primary-foreground: 0 0% 100%`
- `--radius: 0.75rem`, `--ring` vermelho
- tokens novos: `--gradient-hero`, `--gradient-primary`, `--gradient-surface`,
  `--shadow-card`, `--shadow-glow` (brilho vermelho), `--transition-smooth`
- espelhar os mesmos valores em `.dark` para consistência de componentes shadcn

**`tailwind.config.ts`** — `fontFamily.display` (Anton, condensada esportiva) e
`fontFamily.sans` (Inter); `boxShadow.card/glow`; `backgroundImage.gradient-hero/gradient-primary`;
keyframes `fade-up`, `marquee`, `pulse-glow`; container com padding mobile-first.

**`index.html`** — `lang="pt-BR"`, título "HIPERTROFIA SUPLEMENTOS | Suplementos para treino pesado",
meta description, Open Graph (título/descrição/imagem), `theme-color #0A0A0B`,
Google Fonts (Anton + Inter).

**`src/components/ui/button.tsx`** — variantes da marca: `brand` (vermelho sólido, altura
grande em mobile), `whatsapp` (superfície escura + ícone verde), `ghost-strong`, e sizes
`xl`/`icon-lg` para alvos de toque ≥ 44px.

**`src/components/ui/sonner.tsx`** — fixar `theme="dark"` (next-themes não está montado, o
toast cairia em claro) e position `top-center`.

---

## 3. Estrutura de arquivos

### Configuração e utilitários (novos)

- `src/config/store.ts` — **fonte única** de configuração:
  `WHATSAPP_NUMBER = "5519993419516"`, `WHATSAPP_DISPLAY = "(19) 99341-9516"`,
  `INSTAGRAM_HANDLE = "hipertrofia_oficial"`, `CITY = "São João da Boa Vista"`,
  `STATE = "SP"`, `OPENING_HOURS = "10:00 às 18:30"`, nome da marca e URLs.
  Toda mensagem/link é montado a partir daqui.
- `src/config/navigation.ts` — links do header/footer + mapa `slug → ícone lucide`
  das categorias (o banco não tem coluna de ícone).
- `src/lib/format.ts` — `formatCurrency` (BRL), `formatDiscount`, `formatPhone`, `onlyDigits`.
- `src/lib/whatsapp.ts` — `buildQuoteMessage(quote)` (texto do orçamento) e `openWhatsapp(text)`.
  Reutilizado pela página de finalização, pelo header/footer e pelo botão "Comprar pelo WhatsApp" do produto.
- `src/types/catalog.ts` — tipos `Product`, `Category`, `Brand`, `QuoteDraft`, derivados dos
  tipos gerados em `src/integrations/supabase/types.ts` (sem duplicar a forma do banco).
- `src/hooks/use-seo.ts` — título, meta description, canonical, OG e JSON-LD por rota.
- `src/hooks/use-debounce.ts` — debounce da busca.

### Dados

- `src/services/catalog.ts` — `listProducts(filters)` (busca `ilike` por nome, filtro de
  categoria/marca, ordenação por `effective_price`/`discount_percent`/nome, paginação
  `range`), `getProductBySlug` (`.maybeSingle()`), `listRelated(product)`,
  `listFeatured()`, `listOffers()`, `listCategories()`, `listBrands()`.
- `src/services/quotes.ts` — `createQuote(draft)`: insere `quotes` e retorna id; insere
  `quote_items` em lote. Sem SQL cru, só o cliente.
- Consumo com **`@tanstack/react-query`** (já configurado em `src/App.tsx`).

### Carrinho ("Meu orçamento")

- `src/context/quote-cart.tsx` — `QuoteCartProvider` + `useQuoteCart()`: estado com snapshot
  do item (`productId, name, slug, brand, imageUrl, unitPrice, quantity`), ações add/update/remove/clear,
  `itemCount`, `total`, persistência em `localStorage` (`hipertrofia:orcamento:v1`) com
  rehidratação segura. `src/App.tsx` passa a envolver o `RouterProvider` com o provider.
- `src/components/layout/cart-drawer.tsx` — `Sheet` lateral "Meu orçamento" com itens,
  steppers de quantidade, remover, total e CTA "Finalizar pelo WhatsApp".
- `src/components/layout/mobile-action-bar.tsx` — barra fixa inferior no mobile:
  "Meu orçamento (n)" com total + ícone WhatsApp (evita sobreposição com o botão flutuante,
  que fica visível a partir de `md`).
- `src/components/layout/whatsapp-float.tsx` — botão flutuante do WhatsApp (desktop).

### Layout

- `src/components/layout/page-shell.tsx` — `<SiteHeader/> <main> {children} <SiteFooter/>`
  + espaçamento para a barra inferior mobile; usado por todas as páginas.
- `src/components/layout/site-header.tsx` — sticky com blur, logo (ícone + "HIPERTROFIA" /
  "SUPLEMENTOS" espaçado), nav desktop, **campo de busca** (desktop inline → mobile via Sheet),
  menu mobile (`Sheet` com busca, categorias e contato), botão "Meu orçamento" com badge,
  ícone WhatsApp.
- `src/components/layout/site-footer.tsx` — marca, descrição, WhatsApp, Instagram,
  endereço e horário, links rápidos, categorias, aviso "Preços sujeitos a alteração".

### Catálogo / produto

- `src/components/catalog/product-image.tsx` — placeholder neutro (grafite + ícone lucide +
  inicial) quando `image_url` é nulo; `object-cover`/`aspect-square` sem distorção quando existe.
- `src/components/catalog/product-card.tsx` — foto, nome, marca, preço, preço promocional
  tachado, badge de desconto, "Adicionar ao orçamento" (grande, sempre visível no mobile) e
  link para a página do produto.
- `src/components/catalog/product-grid.tsx` — grid responsivo 2/3/4 colunas + skeletons de carregamento + estado vazio.
- `src/components/catalog/price-block.tsx`, `src/components/catalog/quantity-stepper.tsx`,
  `src/components/catalog/discount-badge.tsx`.
- `src/components/catalog/catalog-filters.tsx` — categorias e marcas (radio/checkbox), chips
  de filtros ativos, "Limpar filtros"; sidebar no desktop e `Sheet` no mobile.
- `src/components/catalog/catalog-toolbar.tsx` — busca + ordenação (`Select`): Relevância,
  Menor preço, Maior preço, Maior desconto, Nome A–Z + contagem de resultados.

### Home

- `src/components/home/hero.tsx` — banner principal: gradiente escuro + brilho vermelho,
  headline em Anton, subtítulo, CTAs "Ver catálogo" e "Falar no WhatsApp", 3 selos de confiança.
- `src/components/home/section-heading.tsx`, `src/components/home/product-rail.tsx`
  (scroll horizontal com snap no mobile, grid no desktop) usados em **Mais vendidos** e **Ofertas**.
- `src/components/home/category-grid.tsx` — **Categorias** (10 tiles com ícone, link para `/catalogo?cat=slug`).
- `src/components/home/brand-strip.tsx` — **Principais marcas** (faixa com nomes das marcas).
- `src/components/home/whatsapp-cta-band.tsx` — faixa "Não achou? Fale com a gente".

### Páginas

- `src/pages/Index.tsx` (reescrito) — Header + busca + banner + Mais vendidos + Ofertas +
  Categorias + Marcas + rodapé. Deixa de usar `useTranslation` (app PT-BR).
- `src/pages/Catalogo.tsx` (`/catalogo`) — todos os produtos, busca, filtros de categoria e
  marca, ordenação, contagem, "Carregar mais". Estado dos filtros em **query params**
  (`?q=&cat=&marca=&ordem=`) para URL compartilhável e indexável.
- `src/pages/Produto.tsx` (`/produto/:slug`) — foto grande, nome, marca, preço, promoção,
  descrição, "Informações do produto" (specs), seletor de quantidade, "Adicionar ao orçamento",
  "Comprar pelo WhatsApp", produtos relacionados (mesma categoria, limite 4), breadcrumb e
  tratamento de slug inexistente.
- `src/pages/Orcamento.tsx` (`/orcamento`) — "Meu orçamento": itens, quantidade, remover,
  subtotal por item, quantidade total de produtos, valor total, limpar, continuar comprando,
  CTA para finalizar. **Nunca** usa a palavra "checkout".
- `src/pages/FinalizarOrcamento.tsx` (`/orcamento/finalizar`) — formulário (react-hook-form +
  zod): nome, WhatsApp, observação opcional; revisão do orçamento; botão
  "Enviar orçamento pelo WhatsApp" que valida → monta a mensagem (nome, lista com quantidade,
  preço unitário, subtotais, total) → `window.open` do WhatsApp → salva `quotes`/`quote_items`
  (falha no salvamento não bloqueia o envio; apenas avisa) → limpa o orçamento e mostra
  confirmação. Carrinho vazio redireciona para `/catalogo`.
- `src/pages/NotFound.tsx` — reestilizado com a identidade da marca e link para o catálogo.

### Rotas

`src/router.tsx`: `/`, `/catalogo`, `/produto/:slug`, `/orcamento`, `/orcamento/finalizar` e o
catch-all `*` (que já existe) mantido por último.

---

## 4. SEO

- `useSeo` por página: `<title>`, `meta description`, canonical, `og:*` e `twitter:card`.
- JSON-LD: `Product` na página do produto (nome, marca, preço, disponibilidade) e
  `Store`/`Organization` na home.
- URLs amigáveis por slug (`/produto/:slug`) e filtros refletidos na query string.
- HTML semântico: `header/nav/main/section/article/footer`, um `<h1>` por página, `alt` em imagens.
- `public/robots.txt` — adicionar `Sitemap: /sitemap.xml`; criar `public/sitemap.xml` com home,
  catálogo, categorias e os produtos demo.
- Imagens com `loading="lazy"`/`decoding="async"` e `aspect-*` fixo para não deslocar layout.

---

## Checklist de implementação

- [ ] `supabase_enable` executado com sucesso e cliente/gestão do backend disponível no projeto.
- [ ] Migration criada com `categories`, `brands`, `products`, `quotes`, `quote_items`, os
      relacionamentos, as colunas geradas `effective_price`/`discount_percent`, trigger de
      `updated_at` e índices.
- [ ] RLS habilitada em **cada** uma das 5 tabelas, com policy de leitura pública apenas para
      catálogo ativo e policy de insert para `quotes`/`quote_items`.
- [ ] `supabase_get_table_schema` confirma RLS habilitada e policies listadas nas 5 tabelas.
- [ ] Seed via `supabase_insert`: 10 categorias, 6 marcas, 13 produtos (5 com `sale_price`, 8 `featured`).
- [ ] `src/config/store.ts` existe com WhatsApp `5519993419516` / `(19) 99341-9516`,
      Instagram `hipertrofia_oficial`, localização São João da Boa Vista - SP e horário
      10:00 às 18:30 em um único lugar, e nenhuma outra parte do código repete esses valores.
- [ ] `src/index.css` e `tailwind.config.ts` com os tokens preto/grafite/vermelho, fontes,
      gradientes, sombras e animações.
- [ ] `src/components/ui/button.tsx` com variantes `brand`/`whatsapp` e tamanhos de toque;
      `sonner.tsx` com tema escuro.
- [ ] `QuoteCartProvider` registrado em `src/App.tsx` e persistindo em `localStorage`.
- [ ] Header com logo, busca, menu de categorias, menu mobile, badge de orçamento e WhatsApp.
- [ ] Home renderiza banner, busca, Mais vendidos, Ofertas, Categorias, Principais marcas e rodapé.
- [ ] `/catalogo` lista produtos do banco com busca, filtro de categoria, filtro de marca,
      ordenação por preço e "Adicionar ao orçamento" funcional.
- [ ] `/produto/:slug` mostra foto grande, marca, preços, descrição, specs, quantidade,
      adicionar ao orçamento, WhatsApp e relacionados.
- [ ] `/orcamento` permite alterar quantidade, remover itens, ver subtotais, quantidade total
      e valor total, e persiste após recarregar a página.
- [ ] `/orcamento/finalizar` gera mensagem com nome, itens, quantidades, preço unitário,
      subtotais e total, abre o WhatsApp e grava `quotes` + `quote_items`.
- [ ] Botão flutuante do WhatsApp no desktop e barra de ações fixa no mobile sem sobreposição.
- [ ] `useSeo` aplicado em home, catálogo, produto e orçamento, com JSON-LD em produto.
- [ ] `index.html` com `lang="pt-BR"`, título, description, OG e fontes; `robots.txt` com sitemap;
      `public/sitemap.xml` criado.
- [ ] `router.tsx` com as 5 rotas novas e o catch-all por último.

## Checklist de verificação

- [ ] `pnpm lint` e `pnpm exec tsc --noEmit` sem erros.
- [ ] `pnpm run build` conclui com sucesso.
- [ ] `supabase_read_query` retorna 10 categorias, 6 marcas e 13 produtos com `active = true`.
- [ ] Consulta anônima do catálogo não expõe linhas com `active = false` (nenhum produto
      desativado aparece).
- [ ] `supabase_read_query` confirma que um orçamento de teste criou 1 linha em `quotes` e
      N linhas em `quote_items` com `subtotal` coerente com `quantity * unit_price`.
- [ ] Adicionar 2 produtos, mudar quantidade, remover 1, recarregar a página: orçamento
      permanece e o total confere.
- [ ] Busca por termo inexistente mostra estado vazio (sem erro e sem lista quebrada).
- [ ] Filtro por categoria + marca + ordenação por menor preço respeita a ordem de
      `effective_price` (promoção considerada).
- [ ] Link gerado do WhatsApp contém nome, itens, quantidades, preço unitário e total, e abre
      em `wa.me/5519993419516` (lido de `src/config/store.ts`).
- [ ] Rodapé e área de contato exibem `(19) 99341-9516`, `@hipertrofia_oficial`,
      São João da Boa Vista - SP e "10:00 às 18:30", todos vindos de `src/config/store.ts`.
- [ ] Envio com nome/WhatsApp vazios é bloqueado com mensagem de validação.
- [ ] `/orcamento/finalizar` com o orçamento vazio redireciona para o catálogo em vez de
      enviar mensagem sem itens.
- [ ] Slug inexistente em `/produto/xxx` mostra estado de não encontrado, não tela em branco.
- [ ] `website_screenshot` em `mobile_390` e `desktop_1280` para home, `/catalogo`,
      `/produto/:slug` e `/orcamento/finalizar`: sem overflow horizontal, botões de toque
      confortáveis, contraste legível e imagens sem distorção.
- [ ] `get_console_logs` sem erros de runtime após navegar por home, catálogo, produto e finalização.
