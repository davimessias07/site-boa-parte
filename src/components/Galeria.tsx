import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, useState } from 'react'
import { ProdutoImagem } from './ProdutoImagem'

type Props = { fotos: string[]; nome: string; grupo: string }

const SIZES = '(min-width: 1024px) 600px, 100vw'

/**
 * Foto principal fixa + miniaturas. A foto troca na hora (sem animação de deslizar).
 * No celular dá para passar as fotos com o dedo (scroll-snap nativo); no computador,
 * setas e miniaturas.
 */
export function Galeria({ fotos, nome, grupo }: Props) {
  const [atual, setAtual] = useState(0)
  const trilho = useRef<HTMLDivElement>(null)
  const varias = fotos.length > 1

  function irPara(i: number) {
    const n = (i + fotos.length) % fotos.length
    setAtual(n)
    const el = trilho.current
    el?.scrollTo({ left: n * el.clientWidth, behavior: 'instant' })
  }

  return (
    <div className="flex flex-col gap-3" aria-roledescription="galeria" aria-label={`Fotos de ${nome}`}>
      <div className="group relative aspect-square overflow-hidden rounded-3xl bg-white shadow-card">
        <div
          ref={trilho}
          className="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] sm:overflow-hidden [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => {
            const el = e.currentTarget
            const i = Math.round(el.scrollLeft / el.clientWidth)
            if (i !== atual) setAtual(i)
          }}
        >
          {fotos.length ? (
            fotos.map((src, i) => (
              <div key={src} className="size-full shrink-0 snap-center" aria-hidden={i !== atual}>
                <ProdutoImagem
                  src={src}
                  alt={varias ? `${nome} — foto ${i + 1} de ${fotos.length}` : nome}
                  grupo={grupo}
                  prioridade={i === 0}
                  instantanea
                  sizes={SIZES}
                  className="size-full"
                />
              </div>
            ))
          ) : (
            <ProdutoImagem src="" alt={nome} grupo={grupo} className="size-full" />
          )}
        </div>

        {varias && (
          <>
            <button
              type="button"
              onClick={() => irPara(atual - 1)}
              aria-label="Foto anterior"
              className="absolute top-1/2 left-3 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-marinho shadow-md hover:bg-white sm:grid"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => irPara(atual + 1)}
              aria-label="Próxima foto"
              className="absolute top-1/2 right-3 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-marinho shadow-md hover:bg-white sm:grid"
            >
              <ChevronRight className="size-5" />
            </button>
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 sm:hidden" aria-hidden="true">
              {fotos.map((src, i) => (
                <span
                  key={src}
                  className={`h-1.5 rounded-full shadow-[0_0_0_1px_rgb(0_0_0/0.15)] ${i === atual ? 'w-5 bg-white' : 'w-1.5 bg-white/55'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {varias && (
        <div className="grid grid-cols-4 gap-3">
          {fotos.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => irPara(i)}
              onPointerEnter={() => {
                // Mouse na miniatura: já busca a foto grande dela.
                new Image().src = src
              }}
              aria-label={`Ver foto ${i + 1}`}
              aria-current={i === atual}
              className={`overflow-hidden rounded-xl border-2 bg-white ${
                i === atual ? 'border-ouro' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <ProdutoImagem src={src} alt="" grupo={grupo} sizes="120px" className="aspect-square w-full" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
