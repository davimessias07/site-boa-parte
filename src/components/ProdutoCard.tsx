import { useQueryClient } from '@tanstack/react-query'
import { memo, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { Produto } from '../../shared/catalogo'
import { api } from '../lib/api'
import { formatarPreco } from '../lib/formato'
import { BotaoComprar } from './BotaoComprar'
import { ProdutoImagem, preCarregarFoto } from './ProdutoImagem'

export const ProdutoCard = memo(function ProdutoCard({
  produto,
  prioridade,
}: {
  produto: Produto
  prioridade?: boolean
}) {
  const qc = useQueryClient()
  // Intenção de abrir (mouse em cima / toque): já busca o produto completo e a foto grande.
  const preCarregar = () => {
    preCarregarFoto(produto.foto)
    void qc.prefetchQuery({
      queryKey: ['produto', produto.slug],
      queryFn: ({ signal }) => api.produto(produto.slug, signal),
      staleTime: 60_000,
    })
  }

  return (
    <article
      onPointerEnter={preCarregar}
      onTouchStart={preCarregar}
      onFocus={preCarregar}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-card transition-shadow duration-300 hover:shadow-card-hover"
    >
      <div className="relative aspect-square overflow-hidden">
        <ProdutoImagem
          src={produto.foto}
          alt={produto.nome}
          grupo={produto.grupo}
          prioridade={prioridade}
          sizes="(min-width: 1280px) 300px, (min-width: 768px) 33vw, 50vw"
          className="size-full"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <p className="truncate text-[11px] font-medium tracking-wide text-cinza uppercase">
          {produto.categoria}
          {produto.subcategoria && ` · ${produto.subcategoria}`}
        </p>
        <h3 className="line-clamp-2 min-h-[2.5em] font-sans text-sm leading-tight font-semibold sm:text-base">
          {/* O link cobre o card inteiro; o botão Comprar fica acima dele (z-10). */}
          <Link to={`/produto/${produto.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {produto.nome}
          </Link>
        </h3>
        <p className="mt-auto pt-1 font-serif text-lg font-bold text-ouro-escuro sm:text-xl">
          {formatarPreco(produto.preco)}
        </p>
        <div className="relative z-10 mt-2">
          <BotaoComprar produto={produto} />
        </div>
      </div>
    </article>
  )
})

export function ProdutoCardEsqueleto() {
  return (
    <div className="flex animate-pulse flex-col overflow-hidden rounded-2xl bg-white shadow-card" aria-hidden="true">
      <div className="aspect-square bg-creme-escuro/60" />
      <div className="flex flex-col gap-2 p-4">
        <div className="h-3 w-1/2 rounded bg-creme-escuro" />
        <div className="h-4 w-4/5 rounded bg-creme-escuro" />
        <div className="h-6 w-1/3 rounded bg-creme-escuro" />
        <div className="mt-2 h-10 rounded-full bg-creme-escuro" />
      </div>
    </div>
  )
}

export function GradeProdutos({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">{children}</div>
}
