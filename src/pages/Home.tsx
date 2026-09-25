import { useQuery } from '@tanstack/react-query'
import { ArrowRight, HeartHandshake, ShieldCheck, Truck } from 'lucide-react'
import { Link } from 'react-router'
import { GRUPOS, linkWhatsApp } from '../../shared/catalogo'
import { GrupoIcone } from '../components/GrupoIcone'
import { GradeProdutos, ProdutoCard, ProdutoCardEsqueleto } from '../components/ProdutoCard'
import { WhatsAppIcone } from '../components/WhatsAppIcone'
import { api } from '../lib/api'
import { useMeta } from '../lib/useMeta'

const DIFERENCIAIS = [
  { icone: ShieldCheck, titulo: 'Qualidade garantida', texto: 'Produtos escolhidos pela durabilidade e acabamento.' },
  { icone: HeartHandshake, titulo: 'Atendimento de confiança', texto: 'Conversa direta com a gente, do início ao fim.' },
  { icone: Truck, titulo: 'Da escolha à entrega', texto: 'Acompanhamos sua compra até chegar na sua casa.' },
]

export default function Home() {
  useMeta()
  const recentes = useQuery({
    queryKey: ['produtos', 'recentes'],
    queryFn: ({ signal }) => api.produtos({ limit: 8 }, signal),
  })

  return (
    <>
      {/* Banner principal */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -right-40 size-[36rem] rounded-full border border-ouro/20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 size-[28rem] rounded-full border border-ouro/30"
        />
        <div className="container-site grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div className="animate-surgir">
            <p className="ornamento mb-6">Móveis & Eletrodomésticos</p>
            <h1 className="text-4xl leading-[1.1] font-bold sm:text-5xl lg:text-6xl">
              Móveis que transformam sua casa em <span className="text-ouro-escuro italic">lar</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-cinza">
              Qualidade, beleza e preço justo para cada ambiente. Escolha pelo catálogo e feche sua compra com
              atendimento direto no WhatsApp.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/catalogo" className="btn-ouro px-7 py-4 text-base">
                Ver catálogo <ArrowRight className="size-4" />
              </Link>
              <a
                href={linkWhatsApp('Olá! Vim pelo site da Móveis Boa Parte e gostaria de ajuda para escolher.')}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-contorno px-7 py-4 text-base"
              >
                <WhatsAppIcone className="size-4 text-whatsapp" /> Falar com um atendente
              </a>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-sm lg:max-w-md">
            <div className="absolute inset-4 rounded-full bg-ouro/25 blur-3xl" aria-hidden="true" />
            <img
              src="/logo-640.jpg"
              srcSet="/logo-640.jpg 640w, /logo.jpg 1254w"
              sizes="(min-width: 1024px) 448px, 384px"
              alt="Logotipo Móveis Boa Parte — A escolha certa para o seu lar"
              width={640}
              height={640}
              fetchPriority="high"
              className="relative w-full rounded-full shadow-2xl shadow-marinho/15"
            />
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="border-y border-marinho/10 bg-white/50">
        <ul className="container-site grid gap-6 py-8 sm:grid-cols-3">
          {DIFERENCIAIS.map(({ icone: Icone, titulo, texto }) => (
            <li key={titulo} className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ouro/15 text-ouro-escuro">
                <Icone className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold">{titulo}</p>
                <p className="text-sm text-cinza">{texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Categorias em destaque */}
      <section className="container-site pt-20">
        <div className="mb-10 text-center">
          <p className="ornamento mb-3 justify-center">Categorias</p>
          <h2 className="text-3xl font-bold sm:text-4xl">Tudo para cada cantinho da casa</h2>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {GRUPOS.map((g) => (
            <li key={g.slug}>
              <Link
                to={`/catalogo?grupo=${g.slug}`}
                className="group flex h-full flex-col gap-3 rounded-2xl border border-marinho/5 bg-white p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:border-ouro/40 hover:shadow-card-hover sm:flex-row sm:items-center sm:gap-5 sm:p-6"
              >
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-marinho text-ouro transition group-hover:bg-ouro group-hover:text-marinho">
                  <GrupoIcone grupo={g.slug} className="size-6" />
                </span>
                <span className="flex-1">
                  <span className="block font-serif text-lg font-bold sm:text-xl">{g.nome}</span>
                  <span className="mt-1 hidden text-sm text-cinza sm:block">{g.descricao}</span>
                </span>
                <ArrowRight
                  className="hidden size-5 text-ouro transition group-hover:translate-x-1 sm:block"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Produtos recentes */}
      <section className="container-site pt-20">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="ornamento mb-3">Novidades</p>
            <h2 className="text-3xl font-bold sm:text-4xl">Chegaram na loja</h2>
          </div>
          <Link to="/catalogo" className="btn-contorno">
            Ver todos <ArrowRight className="size-4" />
          </Link>
        </div>
        {recentes.isError ? (
          <p className="text-cinza">Não foi possível carregar os produtos agora. Tente novamente em instantes.</p>
        ) : (
          <GradeProdutos>
            {recentes.data
              ? recentes.data.items.map((p) => <ProdutoCard key={p.id} produto={p} />)
              : Array.from({ length: 8 }, (_, i) => <ProdutoCardEsqueleto key={i} />)}
          </GradeProdutos>
        )}
      </section>

      {/* Chamada final */}
      <section className="container-site pt-20">
        <div className="relative overflow-hidden rounded-3xl bg-marinho px-6 py-14 text-center text-white sm:px-12">
          <div
            aria-hidden="true"
            className="absolute -bottom-32 -left-32 size-80 rounded-full border border-ouro/30"
          />
          <div aria-hidden="true" className="absolute -top-20 -right-20 size-64 rounded-full border border-ouro/20" />
          <h2 className="relative text-3xl font-bold sm:text-4xl">
            Não encontrou o que procura?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-white/75">
            Nosso catálogo é atualizado toda semana. Fale com a gente e encontramos o móvel ideal para você.
          </p>
          <a
            href={linkWhatsApp('Olá! Estou procurando um produto e não encontrei no site. Podem me ajudar?')}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ouro relative mt-8 px-8 py-4 text-base"
          >
            <WhatsAppIcone className="size-5" /> Chamar no WhatsApp
          </a>
        </div>
      </section>
    </>
  )
}
