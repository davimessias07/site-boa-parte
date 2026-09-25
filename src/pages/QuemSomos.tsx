import { Award, Eye, Heart, HeartHandshake, PackageCheck, Scale, Target, TrendingUp } from 'lucide-react'
import { Link } from 'react-router'
import { useMeta } from '../lib/useMeta'

const VALORES = [
  { icone: HeartHandshake, titulo: 'Respeito ao cliente', texto: 'Tratar cada pessoa com atenção, respeito, transparência e profissionalismo.' },
  { icone: Award, titulo: 'Qualidade', texto: 'Buscar produtos que ofereçam qualidade, funcionalidade e durabilidade.' },
  { icone: Scale, titulo: 'Preço justo', texto: 'Oferecer boas soluções com equilíbrio entre preço e qualidade.' },
  { icone: Eye, titulo: 'Transparência', texto: 'Manter relações claras e honestas em todas as etapas da venda.' },
  { icone: Heart, titulo: 'Atendimento', texto: 'Valorizar o cliente e proporcionar uma experiência positiva antes, durante e depois da compra.' },
  { icone: PackageCheck, titulo: 'Compromisso', texto: 'Cumprir aquilo que foi combinado, respeitando prazos e responsabilidades.' },
  { icone: TrendingUp, titulo: 'Evolução', texto: 'Buscar continuamente melhorias nos produtos, processos e atendimento.' },
]

export default function QuemSomos() {
  useMeta('Quem Somos', 'Conheça a Móveis Boa Parte: nossa história, missão, visão e valores.')

  return (
    <>
      <section className="container-site grid items-center gap-12 pt-10 sm:pt-16 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <p className="ornamento mb-4">Quem Somos</p>
          <h1 className="text-4xl leading-tight font-bold sm:text-5xl">
            Mais do que vender móveis, construímos <span className="text-ouro-escuro italic">lares</span>
          </h1>
          <div className="mt-8 space-y-5 text-lg leading-relaxed text-marinho/85">
            <p>
              A Móveis Boa Parte é uma empresa dedicada a oferecer móveis que unem qualidade, funcionalidade, beleza e
              bom custo-benefício para transformar os ambientes de nossos clientes.
            </p>
            <p>
              Trabalhamos para proporcionar uma experiência de compra segura, transparente e satisfatória, desde a
              escolha do produto até a entrega.
            </p>
            <p>
              Nosso compromisso é atender cada cliente com respeito, atenção e responsabilidade, buscando sempre
              oferecer soluções que façam sentido para sua casa e seu dia a dia.
            </p>
            <p>
              Mais do que vender móveis, buscamos participar da construção de ambientes mais confortáveis, bonitos e
              acolhedores, construindo relacionamentos baseados em confiança e credibilidade.
            </p>
          </div>
        </div>
        <img
          src="/logo-640.jpg"
          alt="Logotipo Móveis Boa Parte"
          width={640}
          height={640}
          loading="lazy"
          className="mx-auto w-full max-w-sm rounded-full shadow-2xl shadow-marinho/15"
        />
      </section>

      <section className="container-site mt-20 grid gap-5 md:grid-cols-2">
        <article className="rounded-3xl bg-marinho p-8 text-white sm:p-10">
          <Target className="mb-5 size-9 text-ouro" aria-hidden="true" />
          <h2 className="text-3xl font-bold">Missão</h2>
          <p className="mt-4 leading-relaxed text-white/80">
            Oferecer móveis de qualidade, com preços justos e atendimento de confiança, proporcionando aos nossos
            clientes soluções que contribuam para ambientes mais bonitos, confortáveis e funcionais.
          </p>
        </article>
        <article className="rounded-3xl border border-ouro/30 bg-white p-8 sm:p-10">
          <Eye className="mb-5 size-9 text-ouro-escuro" aria-hidden="true" />
          <h2 className="text-3xl font-bold">Visão</h2>
          <p className="mt-4 leading-relaxed text-marinho/80">
            Ser reconhecida como uma empresa de referência no segmento de móveis, destacando-se pela qualidade dos
            produtos, excelência no atendimento, confiança e compromisso com seus clientes.
          </p>
        </article>
      </section>

      <section className="container-site mt-20">
        <div className="mb-10 text-center">
          <p className="ornamento mb-3 justify-center">Valores</p>
          <h2 className="text-3xl font-bold sm:text-4xl">O que guia cada atendimento</h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALORES.map(({ icone: Icone, titulo, texto }) => (
            <li key={titulo} className="rounded-2xl bg-white p-6 shadow-card">
              <span className="mb-4 grid size-12 place-items-center rounded-full bg-ouro/15 text-ouro-escuro">
                <Icone className="size-6" aria-hidden="true" />
              </span>
              <h3 className="text-xl font-bold">{titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-cinza">{texto}</p>
            </li>
          ))}
          <li className="flex flex-col justify-center rounded-2xl bg-ouro p-6 text-marinho">
            <p className="font-serif text-xl font-bold">Venha montar seu lar com a gente.</p>
            <Link to="/catalogo" className="btn-marinho mt-4 self-start">
              Ver catálogo
            </Link>
          </li>
        </ul>
      </section>
    </>
  )
}
