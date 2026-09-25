import { ImagePlus, Link2, LoaderCircle, Star, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MAX_FOTOS_EXTRAS } from '../../../shared/catalogo'
import { ProdutoImagem } from '../../components/ProdutoImagem'
import { estiloCampo } from './Dialogo'
import { enviarFoto } from './imagem'

const MAX_FOTOS = 1 + MAX_FOTOS_EXTRAS

type Props = {
  /** Todas as fotos do produto; a primeira é a capa. */
  fotos: string[]
  /** Recebe um atualizador (evita sobrescrever mudanças feitas durante um upload). */
  aoMudar: (atualizar: (atuais: string[]) => string[]) => void
  grupo: string
  aoErro: (mensagem: string) => void
  aoEnviar: (enviando: boolean) => void
}

export function FotosCampo({ fotos, aoMudar, grupo, aoErro, aoEnviar }: Props) {
  const [enviando, setEnviando] = useState(0)
  const [url, setUrl] = useState('')
  const vagas = MAX_FOTOS - fotos.length - enviando

  useEffect(() => aoEnviar(enviando > 0), [enviando, aoEnviar])

  async function enviarArquivos(lista: FileList | null) {
    const arquivos = [...(lista ?? [])].slice(0, Math.max(vagas, 0))
    if (!arquivos.length) return
    aoErro('')
    setEnviando((n) => n + arquivos.length)
    // Envia em paralelo, mas mantém a ordem em que foram escolhidas.
    const resultados = await Promise.allSettled(arquivos.map(enviarFoto))
    const urls = resultados.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
    const falha = resultados.find((r) => r.status === 'rejected')
    if (falha) aoErro((falha.reason as Error).message)
    aoMudar((atuais) => [...atuais, ...urls].slice(0, MAX_FOTOS))
    setEnviando((n) => n - arquivos.length)
  }

  function adicionarUrl() {
    const u = url.trim()
    if (!u) return
    if (!/^https?:\/\//.test(u)) return aoErro('A URL da foto deve começar com http:// ou https://')
    if (fotos.includes(u)) return setUrl('')
    aoMudar((atuais) => [...atuais, u].slice(0, MAX_FOTOS))
    setUrl('')
  }

  const tornarCapa = (src: string) => aoMudar((atuais) => [src, ...atuais.filter((f) => f !== src)])
  const remover = (src: string) => aoMudar((atuais) => atuais.filter((f) => f !== src))

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-semibold">Fotos</span>
        <span className="text-xs text-cinza">
          {fotos.length}/{MAX_FOTOS} · capa + até {MAX_FOTOS_EXTRAS} extras
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {fotos.map((src, i) => (
          <li key={src} className="group relative aspect-square overflow-hidden rounded-2xl border border-marinho/10 bg-white">
            <ProdutoImagem src={src} alt={i === 0 ? 'Capa' : `Foto ${i + 1}`} grupo={grupo} prioridade className="size-full" />
            {i === 0 && (
              <span className="absolute top-2 left-2 rounded-full bg-ouro px-2 py-0.5 text-[10px] font-bold tracking-wide text-marinho uppercase">
                Capa
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-linear-to-t from-black/50 to-transparent p-2 opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => tornarCapa(src)}
                  className="grid size-8 place-items-center rounded-full bg-white/90 text-marinho hover:bg-white"
                  aria-label={`Usar foto ${i + 1} como capa`}
                  title="Usar como capa"
                >
                  <Star className="size-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => remover(src)}
                className="grid size-8 place-items-center rounded-full bg-white/90 text-red-700 hover:bg-white"
                aria-label={`Remover foto ${i + 1}`}
                title="Remover"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}

        {Array.from({ length: enviando }, (_, i) => (
          <li key={`enviando-${i}`} className="grid aspect-square place-items-center rounded-2xl border border-marinho/10 bg-white">
            <LoaderCircle className="size-6 animate-spin text-ouro" />
          </li>
        ))}

        {vagas > 0 && (
          <li>
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-marinho/20 bg-white/60 p-2 text-center text-xs text-cinza transition hover:border-ouro hover:text-ouro-escuro">
              <ImagePlus className="size-7" strokeWidth={1.5} />
              <span className="font-semibold">{fotos.length === 0 ? 'Adicionar capa' : 'Adicionar foto'}</span>
              <span>até {vagas}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  void enviarArquivos(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
          </li>
        )}
      </ul>

      {vagas > 0 && (
        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-cinza" />
            <input
              className={`${estiloCampo} pl-10`}
              placeholder="…ou cole a URL de uma imagem (https://…)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  adicionarUrl()
                }
              }}
            />
          </div>
          <button type="button" className="btn-contorno py-2" onClick={adicionarUrl} disabled={!url.trim()}>
            Adicionar
          </button>
        </div>
      )}
      <p className="mt-2 text-xs text-cinza">
        A primeira foto é a capa (aparece no catálogo). Clique na estrela para trocar a capa. Fotos enviadas são
        otimizadas automaticamente (WEBP, 1200 px).
      </p>
    </div>
  )
}
