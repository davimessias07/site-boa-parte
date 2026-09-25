import { normalizar, type ContagemCategoria, type PaginaProdutos, type Produto } from '../../shared/catalogo'

/**
 * Versão publicada como site estático (Vercel): não há API; o catálogo vem de
 * /dados/catalogo.json e a busca/filtro/paginação acontece no navegador.
 * Ativada no build por `VITE_ESTATICO=true` (npm run exportar:vercel).
 */
export const ESTATICO = import.meta.env.VITE_ESTATICO === 'true'

export class ErroApi extends Error {
  status: number
  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.status = status
  }
}

export async function requisitar<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const corpo = (await res.json().catch(() => null)) as { erro?: string } | null
    throw new ErroApi(res.status, corpo?.erro ?? `Erro ${res.status}`)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

export type FiltroProdutos = { q?: string; grupo?: string; categoria?: string }
type Consulta = FiltroProdutos & { cursor?: number; limit?: number }

function montarQuery(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') sp.set(k, String(v))
  return sp.toString()
}

const apiServidor = {
  produtos: (f: Consulta, signal?: AbortSignal) => requisitar<PaginaProdutos>(`/api/produtos?${montarQuery(f)}`, { signal }),
  produto: (slug: string, signal?: AbortSignal) =>
    requisitar<Produto>(`/api/produtos/${encodeURIComponent(slug)}`, { signal }),
  categorias: (signal?: AbortSignal) => requisitar<ContagemCategoria[]>('/api/categorias', { signal }),
}

// ---------- Modo estático ----------

/** Quantidade de arquivos em que as descrições são divididas (mesmo valor do exportador). */
export const PARTES_DESCRICAO = 64

type Indexado = { produto: Produto; busca: string }
let catalogo: Promise<Indexado[]> | null = null

/** Baixa o catálogo uma única vez por visita (já vem ordenado do mais novo para o mais antigo). */
function carregarCatalogo(): Promise<Indexado[]> {
  catalogo ??= requisitar<Produto[]>('/dados/catalogo.json')
    .then((lista) =>
      lista.map((p) => ({ produto: p, busca: normalizar(`${p.nome} ${p.categoria} ${p.subcategoria}`) })),
    )
    .catch((e) => {
      catalogo = null // permite tentar de novo
      throw e
    })
  return catalogo
}

const apiEstatica = {
  async produtos(f: Consulta, _signal?: AbortSignal): Promise<PaginaProdutos> {
    const todos = await carregarCatalogo()
    const termos = normalizar(f.q ?? '').split(' ').filter(Boolean).slice(0, 6)
    const filtrados = todos.filter(
      ({ produto: p, busca }) =>
        (!f.grupo || p.grupo === f.grupo) &&
        (!f.categoria || p.categoriaSlug === f.categoria) &&
        termos.every((t) => busca.includes(t)),
    )
    const limite = Math.min(Math.max(f.limit ?? 24, 1), 60)
    const inicio = f.cursor === undefined ? 0 : filtrados.findIndex(({ produto }) => produto.id < f.cursor!)
    const pagina = inicio < 0 ? [] : filtrados.slice(inicio, inicio + limite)
    const temMais = inicio >= 0 && inicio + limite < filtrados.length
    return {
      items: pagina.map((x) => x.produto),
      nextCursor: temMais ? pagina[pagina.length - 1].produto.id : null,
      total: f.cursor === undefined ? filtrados.length : undefined,
    }
  },

  async produto(slug: string, _signal?: AbortSignal): Promise<Produto> {
    const achado = (await carregarCatalogo()).find((x) => x.produto.slug === slug)
    if (!achado) throw new ErroApi(404, 'Produto não encontrado')
    const p = achado.produto
    const descricoes = await requisitar<Record<string, string>>(`/dados/descricoes/${p.id % PARTES_DESCRICAO}.json`).catch(
      () => ({}) as Record<string, string>,
    )
    return { ...p, descricao: descricoes[p.id] ?? '' }
  },

  async categorias(_signal?: AbortSignal): Promise<ContagemCategoria[]> {
    const contagem = new Map<string, ContagemCategoria>()
    for (const { produto: p } of await carregarCatalogo()) {
      const c = contagem.get(p.categoriaSlug) ?? { grupo: p.grupo, categoriaSlug: p.categoriaSlug, total: 0 }
      c.total++
      contagem.set(p.categoriaSlug, c)
    }
    return [...contagem.values()]
  },
}

export const api = ESTATICO ? apiEstatica : apiServidor
