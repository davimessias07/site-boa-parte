import { useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { ChevronRight, HeartHandshake, MessageCircle, ShieldCheck } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { encontrarGrupo, type PaginaProdutos, type Produto } from '../../shared/catalogo'
import { BotaoComprar } from '../components/BotaoComprar'
import { Carregando } from '../components/Layout'
import { GradeProdutos, ProdutoCard } from '../components/ProdutoCard'
import { Galeria } from '../components/Galeria'
import { ErroApi, api } from '../lib/api'
import { formatarPreco } from '../lib/formato'
import { useMeta } from '../lib/useMeta'
import NaoEncontrado from './NaoEncontrado'

/** Usa o produto que já está em cache (listas) para abrir a página instantaneamente. */
function useProdutoEmCache(slug: string) {
  const qc = useQueryClient()
  return (): Produto | undefined => {
    for (const [, dados] of qc.getQueriesData<PaginaProdutos | InfiniteData<PaginaProdutos>>({
      queryKey: ['produtos'],
    })) {
      if (!dados) continue
      const paginas = 'pages' in dados ? dados.pages : [dados]
      for (const pg of paginas) {
        const p = pg.items.find((i) => i.slug === slug)
        if (p) return p
      }
    }
  }
}

export default function ProdutoPagina() {
  const { slug = '' } = useParams()
  const doCache = useProdutoEmCache(slug)

  const { data: produto, error, isPending } = useQuery({
    queryKey: ['produto', slug],
    queryFn: ({ signal }) => api.produto(slug, signal),
    placeholderData: doCache,
    retry: (n, e) => !(e instanceof ErroApi && e.status === 404) && n < 2,
  })

  const relacionados = useQuery({
    queryKey: ['produtos', 'relacionados', produto?.categoriaSlug],
    queryFn: ({ signal }) => api.produtos({ categoria: produto!.categoriaSlug, limit: 5 }, signal),
    enabled: Boolean(produto),
  })

  useMeta(
    produto?.nome,
    produto && `${produto.nome} por ${formatarPreco(produto.preco)}. ${produto.descricao}`.slice(0, 160),
  )

  if (error instanceof ErroApi && error.status === 404) return <NaoEncontrado mensagem="Este produto não está mais disponível." />
  if (isPending || !produto) return <Carregando />

  const grupo = encontrarGrupo(produto.grupo)
  const outros = relacionados.data?.items.filter((p) => p.id !== produto.id).slice(0, 4) ?? []

  return (
    <div className="container-site pt-6 pb-16 sm:pt-10 sm:pb-0">
      <nav aria-label="Trilha de navegação" className="mb-6 text-sm text-cinza">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link to="/" className="hover:text-ouro-escuro">Início</Link></li>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <li><Link to="/catalogo" className="hover:text-ouro-escuro">Catálogo</Link></li>
          {grupo && (
            <>
              <ChevronRight className="size-3.5" aria-hidden="true" />
              <li><Link to={`/catalogo?grupo=${grupo.slug}`} className="hover:text-ouro-escuro">{grupo.nome}</Link></li>
            </>
          )}
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <li>
            <Link to={`/catalogo?grupo=${produto.grupo}&categoria=${produto.categoriaSlug}`} className="hover:text-ouro-escuro">
              {produto.categoria}
            </Link>
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="lg:self-start">
          <Galeria
            key={produto.id}
            fotos={[produto.foto, ...(produto.fotos ?? [])].filter(Boolean)}
            nome={produto.nome}
            grupo={produto.grupo}
          />
        </div>

        <div className="flex flex-col">
          <p className="text-xs font-semibold tracking-[0.2em] text-ouro-escuro uppercase">
            {produto.categoria}
            {produto.subcategoria && ` · ${produto.subcategoria}`}
          </p>
          <h1 className="mt-3 text-3xl leading-tight font-bold sm:text-4xl">{produto.nome}</h1>
          <p className="mt-6 font-serif text-4xl font-bold text-ouro-escuro">{formatarPreco(produto.preco)}</p>

          <div className="mt-8">
            <BotaoComprar produto={produto} grande className="w-full sm:w-auto" />
            <p className="mt-3 flex items-center gap-2 text-sm text-cinza">
              <MessageCircle className="size-4" aria-hidden="true" />
              Você será direcionado ao WhatsApp para finalizar com nosso atendimento.
            </p>
          </div>

          {produto.descricao && (
            <section className="mt-10 border-t border-marinho/10 pt-8">
              <h2 className="mb-3 font-sans text-sm font-semibold tracking-[0.15em] uppercase">Descrição</h2>
              <p className="leading-relaxed whitespace-pre-line text-marinho/85">{produto.descricao}</p>
            </section>
          )}

          <ul className="mt-10 grid gap-4 rounded-2xl bg-white/70 p-5 text-sm sm:grid-cols-2">
            <li className="flex items-start gap-3">
              <ShieldCheck className="size-5 shrink-0 text-ouro-escuro" aria-hidden="true" />
              <span>Compra segura e transparente, com atendimento humano.</span>
            </li>
            <li className="flex items-start gap-3">
              <HeartHandshake className="size-5 shrink-0 text-ouro-escuro" aria-hidden="true" />
              <span>Tire dúvidas sobre medidas, cores e entrega antes de fechar.</span>
            </li>
          </ul>
        </div>
      </div>

      {outros.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-8 text-2xl font-bold sm:text-3xl">Você também pode gostar</h2>
          <GradeProdutos>
            {outros.map((p) => (
              <ProdutoCard key={p.id} produto={p} />
            ))}
          </GradeProdutos>
        </section>
      )}

      {/* Barra fixa no celular para o botão Comprar ficar sempre à mão */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-marinho/10 bg-white/95 py-3 pr-22 pl-4 backdrop-blur-md sm:hidden">
        <p className="min-w-0 flex-1">
          <span className="block truncate text-xs text-cinza">{produto.nome}</span>
          <span className="font-serif text-lg font-bold text-ouro-escuro">{formatarPreco(produto.preco)}</span>
        </p>
        <BotaoComprar produto={produto} className="w-auto! px-5" />
      </div>
    </div>
  )
}
