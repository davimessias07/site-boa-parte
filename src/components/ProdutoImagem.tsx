import { useEffect, useRef, useState } from 'react'
import { GrupoIcone } from './GrupoIcone'

type Props = {
  src: string
  alt: string
  grupo: string
  /** Primeira dobra: carrega na hora com prioridade alta. Demais: quando chegam a ~1.500 px da tela. */
  prioridade?: boolean
  /**
   * Sem fade: a miniatura (já em cache, vinda do card) aparece na hora como fundo
   * e a versão grande a substitui quando chegar — nada pisca nem some.
   */
  instantanea?: boolean
  sizes?: string
  className?: string
}

/** Fotos enviadas/sincronizadas têm versão reduzida "-sm" (480 px) ao lado da grande (1200 px). */
function miniaturaDe(src: string) {
  const m = src.match(/^(\/uploads\/[\w-]+)\.(webp|jpg|png)$/)
  return m ? `${m[1]}-sm.${m[2]}` : null
}

// Um único IntersectionObserver para todas as fotos: começa a baixar ~1.500 px antes de a foto
// aparecer (o loading="lazy" nativo espera chegar bem mais perto e a foto aparecia atrasada).
const aoAproximar = new WeakMap<Element, () => void>()
let observador: IntersectionObserver | null = null
function observar(el: Element, cb: () => void) {
  observador ??= new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue
        aoAproximar.get(e.target)?.()
        aoAproximar.delete(e.target)
        observador!.unobserve(e.target)
      }
    },
    { rootMargin: '1500px 1500px' },
  )
  aoAproximar.set(el, cb)
  observador.observe(el)
  return () => {
    aoAproximar.delete(el)
    observador?.unobserve(el)
  }
}

/** Pede ao navegador a foto grande antes de abrir o produto (ex.: mouse em cima do card). */
export function preCarregarFoto(src: string) {
  if (src) new Image().src = src
}

export function ProdutoImagem({ src, alt, grupo, prioridade, instantanea, sizes, className = '' }: Props) {
  const [falhou, setFalhou] = useState(false)
  const [carregou, setCarregou] = useState(false)
  const [perto, setPerto] = useState(Boolean(prioridade))
  const ref = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (perto || !ref.current) return
    return observar(ref.current, () => setPerto(true))
  }, [perto])

  if (!src || falhou) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-linear-to-br from-creme to-creme-escuro ${className}`}
      >
        <div className="flex flex-col items-center gap-2 text-ouro">
          <GrupoIcone grupo={grupo} className="size-12" strokeWidth={1.25} />
          <span className="text-[10px] font-semibold tracking-[0.2em] text-ouro-escuro/70 uppercase">Boa Parte</span>
        </div>
      </div>
    )
  }

  const mini = miniaturaDe(src)
  const fade = instantanea ? '' : `transition-opacity duration-200 ${carregou ? 'opacity-100' : 'opacity-0'}`

  return (
    <img
      ref={ref}
      // Ordem importa: sizes/srcSet antes de src, senão o navegador já começa a baixar a foto grande.
      sizes={sizes}
      srcSet={perto && mini ? `${mini} 480w, ${src} 1200w` : undefined}
      src={perto ? src : undefined}
      alt={perto ? alt : ''}
      fetchPriority={prioridade ? 'high' : 'auto'}
      decoding={instantanea ? 'sync' : 'async'}
      onLoad={() => setCarregou(true)}
      onError={() => setFalhou(true)}
      style={instantanea && mini && !carregou ? { backgroundImage: `url(${mini})` } : undefined}
      className={`bg-creme-escuro bg-cover bg-center object-cover ${fade} ${className}`}
    />
  )
}
