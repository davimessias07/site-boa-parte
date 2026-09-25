// Premoli Distribuidora — loja WooCommerce com a Store API pública (/wp-json/wc/store/v1).
import type { Coletor, ItemOrigem } from './tipos.ts'
import { arrumarNome, buscarJson, decodificarEntidades, htmlParaTexto } from './util.ts'

const BASE = 'https://premolidistribuidora.com.br/wp-json/wc/store/v1'

type Categoria = { id: number; name: string; parent: number }
type ProdutoWoo = {
  id: number
  name: string
  permalink: string
  sku: string
  short_description: string
  description: string
  is_in_stock: boolean
  prices: { price: string; currency_minor_unit: number }
  images: { src: string }[]
  categories: { id: number; name: string }[]
}

export const premoli: Coletor = {
  prefixo: 'PRE',
  nome: 'Premoli Distribuidora',
  async coletar({ limite, log }) {
    const { dados: cats } = await buscarJson<Categoria[]>(`${BASE}/products/categories?per_page=100`)
    const porId = new Map(cats.map((c) => [c.id, c]))
    const profundidade = (id: number): number => {
      const c = porId.get(id)
      return c && c.parent ? 1 + profundidade(c.parent) : 0
    }

    const itens: ItemOrigem[] = []
    // stock_status=instock: a própria loja filtra só o que tem estoque.
    for (let pagina = 1; ; pagina++) {
      const { dados, headers } = await buscarJson<ProdutoWoo[]>(
        `${BASE}/products?per_page=100&page=${pagina}&stock_status=instock&orderby=date&order=desc`,
      )
      const totalPaginas = Number(headers.get('x-wp-totalpages') ?? 1)
      for (const p of dados) {
        if (!p.is_in_stock) continue
        const categorias = [...p.categories]
          .sort((a, b) => profundidade(b.id) - profundidade(a.id))
          .flatMap((c) => {
            const pai = porId.get(porId.get(c.id)?.parent ?? 0)
            return pai ? [decodificarEntidades(c.name), decodificarEntidades(pai.name)] : [decodificarEntidades(c.name)]
          })
        itens.push({
          id: String(p.id),
          url: p.permalink,
          nome: arrumarNome(p.name),
          descricao: htmlParaTexto(p.short_description || p.description),
          custo: Math.round(Number(p.prices.price) * 10 ** (2 - (p.prices.currency_minor_unit ?? 2))),
          fotos: p.images.map((i) => [i.src]),
          categorias: [...new Set(categorias)],
          codigo: p.sku ?? '',
          emEstoque: true,
        })
      }
      log(`  página ${pagina}/${totalPaginas} — ${itens.length} em estoque`)
      if (pagina >= totalPaginas || (limite && itens.length >= limite)) break
    }
    return { itens: limite ? itens.slice(0, limite) : itens, falhas: [], completa: !limite }
  },
}
