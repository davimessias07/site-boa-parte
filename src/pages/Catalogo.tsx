import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { LoaderCircle, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { GRUPOS, encontrarGrupo, linkWhatsApp, slugify } from '../../shared/catalogo'
import { GrupoIcone } from '../components/GrupoIcone'
import { GradeProdutos, ProdutoCard, ProdutoCardEsqueleto } from '../components/ProdutoCard'
import { WhatsAppIcone } from '../components/WhatsAppIcone'
import { api } from '../lib/api'
import { useMeta } from '../lib/useMeta'
import { useVisivel } from '../lib/useVisivel'

const POR_PAGINA = 24

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
        ativo
          ? 'border-marinho bg-marinho text-white'
          : 'border-marinho/15 bg-white text-marinho hover:border-ouro hover:text-ouro-escuro'
      }`}
    >
      {children}
    </button>
  )
}

export default function Catalogo() {
  const [params, setParams] = useSearchParams()
  const grupo = params.get('grupo') ?? ''
  const categoria = params.get('categoria') ?? ''
  const q = params.get('q') ?? ''

  const grupoAtual = encontrarGrupo(grupo)
  useMeta(
    grupoAtual ? `${grupoAtual.nome} — Catálogo` : 'Catálogo',
    grupoAtual ? grupoAtual.descricao : 'Confira nosso catálogo de móveis e eletrodomésticos.',
  )

  // Campo de busca com debounce: atualiza a URL 300 ms após parar de digitar.
  const [busca, setBusca] = useState(q)
  useEffect(() => setBusca((b) => (b.trim() === q ? b : q)), [q])
  useEffect(() => {
    if (busca.trim() === q) return
    const t = setTimeout(() => {
      setParams(
        (p) => {
          const n = new URLSearchParams(p)
          if (busca.trim()) n.set('q', busca.trim())
          else n.delete('q')
          return n
        },
        { replace: true, preventScrollReset: true },
      )
    }, 300)
    return () => clearTimeout(t)
  }, [busca, q, setParams])

  function filtrar(novo: { grupo?: string; categoria?: string }) {
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        for (const [k, v] of Object.entries(novo)) {
          if (v) n.set(k, v)
          else n.delete(k)
        }
        return n
      },
      { preventScrollReset: true },
    )
  }

  const contagens = useQuery({ queryKey: ['categorias'], queryFn: ({ signal }) => api.categorias(signal) })
  const totalPorCategoria = useMemo(
    () => new Map(contagens.data?.map((c) => [c.categoriaSlug, c.total])),
    [contagens.data],
  )

  const lista = useInfiniteQuery({
    queryKey: ['produtos', 'lista', { q, grupo, categoria }],
    queryFn: ({ pageParam, signal }) =>
      api.produtos({ q, grupo, categoria, cursor: pageParam, limit: POR_PAGINA }, signal),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (ultima) => ultima.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  })

  const produtos = useMemo(() => lista.data?.pages.flatMap((p) => p.items) ?? [], [lista.data])
  const total = lista.data?.pages[0]?.total

  const sentinela = useVisivel<HTMLDivElement>(
    () => {
      if (lista.hasNextPage && !lista.isFetchingNextPage) void lista.fetchNextPage()
    },
    lista.hasNextPage && !lista.isPlaceholderData,
  )

  const categoriasDoGrupo = grupoAtual?.categorias
    .map((nome) => ({ nome, slug: slugify(nome) }))
    .filter((c) => (totalPorCategoria.get(c.slug) ?? 0) > 0)

  const temFiltro = Boolean(q || grupo || categoria)

  return (
    <div className="container-site pt-8 sm:pt-12">
      <header className="mb-8">
        <p className="ornamento mb-3">Catálogo</p>
        <h1 className="text-3xl font-bold sm:text-5xl">{grupoAtual?.nome ?? 'Todos os produtos'}</h1>
      </header>

      {/* Barra de busca + filtros fixos no topo */}
      <div className="sticky top-16 z-30 -mx-4 mb-8 border-b border-marinho/10 bg-creme/95 px-4 pt-2 pb-4 backdrop-blur-md sm:top-20 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <form role="search" onSubmit={(e) => e.preventDefault()} className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-cinza" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto pelo nome…"
            aria-label="Buscar produto pelo nome"
            enterKeyHint="search"
            className="w-full rounded-full border border-marinho/15 bg-white py-3.5 pr-12 pl-12 text-base shadow-sm outline-none placeholder:text-cinza/70 focus:border-ouro focus:ring-4 focus:ring-ouro/15 [&::-webkit-search-cancel-button]:hidden"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              aria-label="Limpar busca"
              className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-full text-cinza hover:bg-creme hover:text-marinho"
            >
              <X className="size-4" />
            </button>
          )}
        </form>

        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip ativo={!grupo} onClick={() => filtrar({ grupo: '', categoria: '' })}>
            Todos
          </Chip>
          {GRUPOS.map((g) => (
            <Chip key={g.slug} ativo={grupo === g.slug} onClick={() => filtrar({ grupo: g.slug, categoria: '' })}>
              <GrupoIcone grupo={g.slug} className="size-4" />
              {g.nome}
            </Chip>
          ))}
        </div>

        {categoriasDoGrupo && categoriasDoGrupo.length > 1 && (
          <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
            {categoriasDoGrupo.map((c) => (
              <button
                key={c.slug}
                type="button"
                aria-pressed={categoria === c.slug}
                onClick={() => filtrar({ categoria: categoria === c.slug ? '' : c.slug })}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                  categoria === c.slug
                    ? 'bg-ouro text-marinho'
                    : 'bg-ouro/10 text-ouro-escuro hover:bg-ouro/20'
                }`}
              >
                {c.nome} <span className="opacity-60">({totalPorCategoria.get(c.slug)})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-5 flex min-h-6 items-center justify-between text-sm text-cinza" aria-live="polite">
        {total !== undefined && (
          <p>
            {total === 1 ? '1 produto encontrado' : `${total.toLocaleString('pt-BR')} produtos encontrados`}
            {q && (
              <>
                {' '}
                para <strong className="text-marinho">“{q}”</strong>
              </>
            )}
          </p>
        )}
        {lista.isFetching && !lista.isFetchingNextPage && <LoaderCircle className="size-4 animate-spin text-ouro" />}
      </div>

      {lista.isError && !lista.data ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-card">
          <p className="mb-4">Não foi possível carregar o catálogo agora.</p>
          <button type="button" className="btn-marinho" onClick={() => void lista.refetch()}>
            Tentar novamente
          </button>
        </div>
      ) : lista.data && produtos.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-14 text-center shadow-card">
          <Search className="mx-auto mb-4 size-10 text-ouro" strokeWidth={1.5} />
          <h2 className="text-2xl font-bold">Nenhum produto encontrado</h2>
          <p className="mx-auto mt-2 max-w-md text-cinza">
            Tente outro termo ou limpe os filtros. Se preferir, fale com a gente — talvez tenhamos o que você procura.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {temFiltro && (
              <button
                type="button"
                className="btn-contorno"
                onClick={() => {
                  setBusca('')
                  setParams({}, { preventScrollReset: true })
                }}
              >
                Limpar filtros
              </button>
            )}
            <a
              className="btn-ouro"
              target="_blank"
              rel="noopener noreferrer"
              href={linkWhatsApp(`Olá! Procuro ${q ? `"${q}"` : 'um produto'} e não encontrei no site. Vocês têm?`)}
            >
              <WhatsAppIcone className="size-4" /> Perguntar no WhatsApp
            </a>
          </div>
        </div>
      ) : (
        <div className={`transition-opacity ${lista.isPlaceholderData ? 'opacity-50' : ''}`}>
          <GradeProdutos>
            {lista.data
              ? produtos.map((p, i) => <ProdutoCard key={p.id} produto={p} prioridade={i < 4} />)
              : Array.from({ length: 8 }, (_, i) => <ProdutoCardEsqueleto key={i} />)}
            {lista.isFetchingNextPage &&
              Array.from({ length: 4 }, (_, i) => <ProdutoCardEsqueleto key={`mais-${i}`} />)}
          </GradeProdutos>
        </div>
      )}

      <div ref={sentinela} aria-hidden="true" className="h-px" />
      {lista.data && !lista.hasNextPage && produtos.length > POR_PAGINA && (
        <p className="mt-10 text-center text-sm text-cinza">Você chegou ao fim do catálogo.</p>
      )}
    </div>
  )
}
