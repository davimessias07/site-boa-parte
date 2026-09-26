# Móveis Boa Parte — site catálogo

Catálogo de móveis e eletrodomésticos com botão **Comprar** que abre o WhatsApp
(`71 98287-5363`) com a mensagem e o SKU do produto já preenchidos.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Front-end | React 19 + TypeScript, Vite 8, React Router 8, TanStack Query 5, Tailwind CSS 4 |
| Back-end | Node 24 (TypeScript nativo), Fastify 5, SQLite nativo (`node:sqlite`) |
| Fontes | Playfair Display + Inter, self-hosted (sem Google Fonts) |

Requisitos do briefing atendidos: scroll infinito (cursor), busca por nome no topo do catálogo,
lazy loading de imagens (`loading="lazy"` + `srcset`), URL amigável `/produto/<slug>`, layout
responsivo mobile-first, produtos indisponíveis somem do site, fornecedor nunca exposto na API pública.

## Rodar

```bash
npm install
npm run dev          # site em http://localhost:5173  (API em :3001)
```

Produção (um único processo serve site + API):

```bash
npm run build
ADMIN_PASSWORD=uma-senha-forte PORT=3000 npm start
```

Variáveis: `ADMIN_PASSWORD` (obrigatória em produção; padrão de dev `boaparte`), `PORT`,
`DATA_DIR` (banco + fotos, padrão `./data`), `SESSION_SECRET`, `SEED=true` (cria produtos de exemplo num banco vazio — só para desenvolvimento).

Faça backup da pasta `data/` — ela contém o banco (`boaparte.db`) e as fotos enviadas.

## Painel — `/admin`

- Cadastrar, editar, excluir e marcar produtos como **No site / Oculto**.
- SKU gerado automaticamente pelo fornecedor (`PRE-`, `ATC-`, `SAL-`) se deixado em branco.
- Fotos: 1 capa + até 3 extras (galeria na página do produto; estrela troca a capa).
  Upload redimensionado no navegador para WEBP (1200 px + miniatura 480 px).
- **Importar planilha** (`.csv` ou `.xlsx`): SKU existente atualiza, SKU novo/vazio cria.
  Colunas: `SKU, Nome, Categoria, Subcategoria, Fornecedor, Preço, Foto, Foto 2, Foto 3, Foto 4, Disponível, Descrição`
  (`Foto` = capa; `Foto 2..4` em branco mantêm as extras atuais).
  Há botão para baixar a planilha modelo.
- **Exportar** o catálogo em CSV (edite no Excel e reimporte na atualização semanal).

## Sincronização com os distribuidores

Importa dos sites da Premoli, do Atacadão e da Sales **só os produtos em estoque** e dentro das
categorias do site, com fotos (baixadas e otimizadas) e **o mesmo preço do site do distribuidor**.

```bash
npm run sincronizar                          # todos
npm run sincronizar -- --fornecedor=ATC      # só um (PRE, ATC, SAL)
npm run sincronizar -- --simular             # mostra o que faria, sem gravar
npm run sincronizar -- --margem=1.3          # aplica margem (ex.: +30%); padrão 1 = mesmo preço
```

- Rodar de novo **atualiza preço e estoque**: o que esgotar/sumir no distribuidor sai do site
  (aviso "Esgotado no distribuidor" no painel) e volta sozinho quando repor.
- Nome, descrição e categoria editados no painel **não são sobrescritos**.
- Produto de distribuidor excluído no painel **não volta** nas próximas sincronizações.
- Premoli usa a API pública da loja (WooCommerce). Atacadão e Sales são lidos página a página,
  devagar e respeitando o `robots.txt`; se o site bloquear o acesso, a sincronização daquele
  fornecedor para e **não oculta nada**.
- Resumo da última execução: `data/ultima-sincronizacao.json`.

Para rodar toda semana, agende `npm run sincronizar` (Agendador de Tarefas do Windows ou cron).

## Publicação na Vercel (vitrine estática)

A Vercel não guarda banco nem arquivos, então o site publicado é uma **vitrine estática**: catálogo,
busca, filtros, página do produto e WhatsApp funcionam sem servidor; o painel `/admin` e a
sincronização rodam **só na máquina local**.

```bash
npm run exportar:vercel     # gera publicar/ a partir do banco local (produtos visíveis + fotos em uso)
git add -A && git commit -m "Atualiza catálogo" && git push
```

A Vercel (projeto importado deste repositório) publica a pasta `publicar/` automaticamente a cada
push — configurado em `vercel.json` (sem build na Vercel). Para ver localmente exatamente o que vai
ao ar: `npx vite preview --outDir publicar`.

Fluxo semanal: `npm run sincronizar` → revisar no painel local → `npm run exportar:vercel` → commit/push.

## Estrutura

```
shared/catalogo.ts   categorias, fornecedores, WhatsApp, regras compartilhadas
server/              API Fastify + SQLite (db.ts, produtos.ts, seed.ts, index.ts)
src/pages/           Home, Catálogo, Produto, Quem Somos, Contato, admin/
src/components/      Header, Footer, ProdutoCard, ProdutoImagem, BotaoComprar…
```
