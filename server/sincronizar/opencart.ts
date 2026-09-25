// Atacadão dos Móveis e Sales Distribuidora — lojas OpenCart sem API pública.
// Lê o menu de categorias, percorre as listagens (preço) e abre cada produto
// (estoque "Disponibilidade", galeria de fotos, descrição e código).
import type { PrefixoFornecedor } from '../../shared/catalogo.ts'
import type { Coletor, ItemOrigem } from './tipos.ts'
import {
  ErroHttp,
  arrumarNome,
  blocoDiv,
  buscarTexto,
  decodificarEntidades,
  htmlParaTexto,
  mapaLimitado,
  metaConteudo,
  precoEmCentavos,
} from './util.ts'

type Config = {
  prefixo: PrefixoFornecedor
  nome: string
  home: string
  /** trecho do HTML da home onde fica o menu de categorias */
  menu: (html: string) => string
  /** chave hierárquica da categoria ("sala/cadeira"), ou null se o link não é de categoria */
  chaveCategoria: (url: URL) => string | null
  /** marcador do início de cada card de produto na listagem */
  cardProduto: string
  /** início e fim do trecho da galeria na página do produto */
  galeria: [string, string]
  /** requisições simultâneas e pausa entre elas — ser educado com o site do fornecedor */
  concorrencia: number
  pausaMs: number
}

type Categoria = { chave: string; url: string; nome: string }
type Listado = { id: string; url: string; nome: string; custo: number; categorias: string[] }

const RE_IMG = /https?:\/\/[^"'\s)]+\/image\/(?:cache\/)?catalog\/[^"'\s)]+?\.(?:jpe?g|png|webp)/gi

/** ".../image/cache/catalog/x/123-500x500.webp" → ".../image/catalog/x/123.webp" (arquivo original, maior). */
const original = (url: string) => url.replace('/image/cache/', '/image/').replace(/-\d+x\d+(\.\w+)$/, '$1')

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** O firewall do site bloqueou (403): parar tudo em vez de insistir. */
class Bloqueado extends Error {}

function criarColetor(cfg: Config): Coletor {
  return {
    prefixo: cfg.prefixo,
    nome: cfg.nome,
    async coletar({ limite, log, interessa, conhecidos }) {
      let bloqueado = false
      // Toda requisição passa por aqui: pausa entre acessos e parada imediata se o site bloquear.
      const pagina = async (url: string) => {
        if (bloqueado) throw new Bloqueado('bloqueado')
        await espera(cfg.pausaMs)
        try {
          return await buscarTexto(url)
        } catch (e) {
          if (e instanceof ErroHttp && (e.status === 403 || e.status === 429)) {
            bloqueado = true
            throw new Bloqueado(`o site bloqueou o acesso (HTTP ${e.status})`)
          }
          throw e
        }
      }
      const base = new URL(cfg.home)
      const urlProduto = (id: string) => `${base.origin}/index.php?route=product/product&product_id=${id}`

      // 1. Categorias do menu; só as "folhas" (sem subcategorias), que têm nome específico.
      const home = await pagina(cfg.home)
      const categorias = new Map<string, Categoria>()
      for (const m of cfg.menu(home).matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
        let url: URL
        try {
          url = new URL(decodificarEntidades(m[1]), cfg.home)
        } catch {
          continue
        }
        const chave = cfg.chaveCategoria(url)
        const nome = decodificarEntidades(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
        if (!chave || !nome || /^(ver todos|exibir tudo)/i.test(nome)) continue
        if (!categorias.has(chave)) categorias.set(chave, { chave, url: url.href, nome })
      }
      const chaves = [...categorias.keys()]
      const folhas = [...categorias.values()].filter((c) => !chaves.some((k) => k.startsWith(`${c.chave}/`)))
      const caminho = (c: Categoria) => {
        const partes = c.chave.split('/')
        return partes.map((_, i) => categorias.get(partes.slice(0, partes.length - i).join('/'))?.nome ?? '').filter(Boolean)
      }
      const alvo = folhas.filter((c) => interessa(caminho(c), ''))
      log(`  ${folhas.length} categorias; ${alvo.length} dentro do escopo do site`)

      // 2. Listagens paginadas → id, nome, preço.
      const listados = new Map<string, Listado>()
      let completa = !limite
      for (const cat of alvo) {
        const nomes = caminho(cat)
        // Sem "?limit=" (proibido no robots.txt dos dois sites): paginação padrão.
        for (let n = 1; n < 200; n++) {
          const u = new URL(cat.url)
          if (n > 1) u.searchParams.set('page', String(n))
          let html: string
          try {
            html = await pagina(u.href)
          } catch (e) {
            log(`  ! falha ao listar ${cat.nome} p.${n}: ${(e as Error).message}`)
            completa = false
            break
          }
          const cards = html.split(cfg.cardProduto).slice(1)
          let novos = 0
          for (const card of cards) {
            const id =
              /(?:cart\.add|compare\.add|wishlist\.add)\(\s*'(\d+)'/.exec(card)?.[1] ?? /product_id=(\d+)/.exec(card)?.[1]
            if (!id) continue
            if (listados.has(id)) continue
            const nome = arrumarNome(/<img[^>]+alt="([^"]*)"/i.exec(card)?.[1] ?? /<h4>\s*<a[^>]*>([^<]+)/i.exec(card)?.[1] ?? '')
            const precoTexto =
              /price-new[^>]*>([^<]+)/i.exec(card)?.[1] ??
              [...card.matchAll(/R\$\s*[\d.]+,\d{2}/g)].map((m) => m[0]).find((p) => precoEmCentavos(p))
            listados.set(id, {
              id,
              url: urlProduto(id),
              nome,
              custo: precoEmCentavos(precoTexto ?? '') ?? 0,
              categorias: nomes,
            })
            novos++
          }
          if (!cards.length || novos === 0 || !html.includes(`page=${n + 1}`)) break
        }
        log(`  ${cat.nome}: ${listados.size} produtos acumulados`)
        if (bloqueado || (limite && listados.size >= limite)) break
      }

      // 3. Página de cada produto: estoque, galeria, descrição, código.
      const candidatos = [...listados.values()].filter((p) => interessa(p.categorias, p.nome)).slice(0, limite || undefined)
      // Já cadastrados que não apareceram na listagem (paginação instável, mudança de categoria…):
      // confere a página antes de concluir que saíram de estoque.
      if (!limite && !bloqueado) {
        const faltando = conhecidos.filter((id) => !listados.has(id))
        for (const id of faltando) candidatos.push({ id, url: urlProduto(id), nome: '', custo: 0, categorias: [] })
        if (faltando.length) log(`  +${faltando.length} já cadastrados fora da listagem (conferindo direto na página)`)
      }
      log(`  abrindo ${candidatos.length} páginas de produto…`)
      const falhas: string[] = []
      let feitos = 0
      const itens = await mapaLimitado(candidatos, cfg.concorrencia, async (p): Promise<ItemOrigem | null> => {
        try {
          const html = await pagina(p.url)
          if (++feitos % 50 === 0) log(`  ${feitos}/${candidatos.length}`)
          const disponibilidade = decodificarEntidades(
            /Disponibilidade:?\s*(?:<[^>]*>\s*)*([^<]+)/i.exec(html)?.[1] ?? '',
          ).trim()
          const emEstoque = /em estoque|^\d+$/i.test(disponibilidade)

          const [ini, fim] = cfg.galeria
          const a = html.indexOf(ini)
          const b = a >= 0 ? html.indexOf(fim, a + ini.length) : -1
          const trecho = a >= 0 ? html.slice(a, b > a ? b : a + 20000) : ''
          const urls = [...trecho.matchAll(RE_IMG)].map((m) => m[0])
          const og = metaConteudo(html, 'og:image')
          if (!urls.length && og) urls.push(og)
          const porOriginal = new Map<string, string[]>()
          for (const url of urls) {
            const o = original(url)
            const alternativas = porOriginal.get(o) ?? [o]
            if (!alternativas.includes(url)) alternativas.push(url)
            porOriginal.set(o, alternativas)
          }

          const iDesc = html.search(/id="tab-description"/i)
          const descricao = iDesc >= 0 ? htmlParaTexto(blocoDiv(html, html.lastIndexOf('<', iDesc))) : ''
          const titulo = metaConteudo(html, 'og:title') || decodificarEntidades(/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1]?.replace(/<[^>]+>/g, '') ?? '')
          const codigo =
            metaConteudo(html, 'og:sku') ||
            decodificarEntidades(/<li>\s*Modelo:?\s*(?:<[^>]*>\s*)*([^<]+)/i.exec(html)?.[1] ?? '').trim()

          // Preço da listagem; se o produto veio só pela conferência, usa o primeiro preço da página.
          const custo =
            p.custo ||
            ([...html.matchAll(/R\$\s*[\d.]+,\d{2}/g)].map((m) => precoEmCentavos(m[0]) ?? 0).find((c) => c > 0) ?? 0)

          return {
            id: p.id,
            url: p.url,
            nome: arrumarNome(titulo) || p.nome,
            descricao,
            custo,
            fotos: [...porOriginal.values()],
            categorias: p.categorias,
            codigo: codigo.slice(0, 60),
            emEstoque,
          }
        } catch (e) {
          // 404 = produto saiu do site: conta como sem estoque. Outros erros: não mexer no produto.
          if (e instanceof Bloqueado) {
            falhas.push(p.id)
            return null
          }
          if (!(e instanceof ErroHttp && e.status === 404)) {
            falhas.push(p.id)
            log(`  ! ${p.nome}: ${(e as Error).message}`)
          }
          return null
        }
      })

      if (bloqueado) {
        log(`  ! ${cfg.nome} bloqueou o acesso automático. Parei para não insistir; nada será ocultado.`)
        completa = false
      }
      return { itens: itens.filter((i): i is ItemOrigem => i !== null), falhas, completa }
    },
  }
}

export const atacadao = criarColetor({
  prefixo: 'ATC',
  nome: 'Atacadão dos Móveis',
  home: 'https://www.catalogoatacadaodosmoveis.com.br/',
  menu: (html) => {
    const i = html.indexOf('id="menu"')
    return i >= 0 ? html.slice(i, html.indexOf('</nav>', i)) : html
  },
  chaveCategoria: (url) => {
    if (url.hostname !== 'www.catalogoatacadaodosmoveis.com.br' || url.search) return null
    const partes = url.pathname.split('/').filter(Boolean)
    return partes.length >= 1 && partes.length <= 2 ? partes.join('/') : null
  },
  cardProduto: 'class="product-thumb"',
  galeria: ['class="thumbnails"', '</ul>'],
  concorrencia: 1,
  pausaMs: 2000,
})

export const sales = criarColetor({
  prefixo: 'SAL',
  nome: 'Sales Distribuidora',
  home: 'https://www.salesdistribuidorademoveis.com.br/',
  menu: (html) => html,
  chaveCategoria: (url) => {
    if (url.searchParams.get('route') !== 'product/category') return null
    const path = url.searchParams.get('path')
    return path && /^[\d_]+$/.test(path) ? path.replace(/_/g, '/') : null
  },
  cardProduto: 'class="product-grid-item',
  galeria: ['gallery-top', 'gallery-thumbs'],
  concorrencia: 2,
  pausaMs: 600,
})
