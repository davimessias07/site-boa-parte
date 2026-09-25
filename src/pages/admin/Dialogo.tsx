import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

/** Modal nativo (<dialog>): foco, ESC e backdrop de graça. */
export function Dialogo({
  titulo,
  aoFechar,
  children,
  largura = 'max-w-2xl',
}: {
  titulo: string
  aoFechar: () => void
  children: ReactNode
  largura?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)

  // Sem cleanup: ao desmontar o elemento sai do DOM e o modal fecha sozinho.
  // (Fechar no cleanup dispararia onClose no double-effect do StrictMode.)
  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      onClick={(e) => e.target === ref.current && aoFechar()}
      className={`m-auto w-[calc(100%-2rem)] ${largura} rounded-3xl bg-creme p-0 text-marinho shadow-2xl backdrop:bg-marinho/50 backdrop:backdrop-blur-sm`}
    >
      <div className="flex items-center justify-between border-b border-marinho/10 px-6 py-4">
        <h2 className="text-2xl font-bold">{titulo}</h2>
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="grid size-10 place-items-center rounded-full hover:bg-marinho/5"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="max-h-[80dvh] overflow-y-auto px-6 py-6">{children}</div>
    </dialog>
  )
}

export const estiloCampo =
  'w-full rounded-xl border border-marinho/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-ouro focus:ring-4 focus:ring-ouro/15'

export function Campo({ rotulo, dica, children }: { rotulo: string; dica?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">{rotulo}</span>
      {children}
      {dica && <span className="text-xs text-cinza">{dica}</span>}
    </label>
  )
}
