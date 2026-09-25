import { db, transacao } from './db.ts'
import {
  MAX_FOTOS_EXTRAS,
  SKU_REGEX,
  encontrarCategoria,
  encontrarFornecedor,
  normalizar,
  parseBooleano,
  parsePreco,
  slugify,
  type ContagemCategoria,
  type PaginaProdutos,
  type PrefixoFornecedor,
  type Produto,
  type ProdutoAdmin,
  type ProdutoEntrada,
  type RelatorioImportacao,
} from '../shared/catalogo.ts'

type Linha = {
  id: number
  sku: string
  nome: string
  slug: string
  descricao: string
  grupo: string
  categoria: string
  categoria_slug: string
  subcategoria: string
  fornecedor: string
  preco_centavos: number
  foto: string
  fotos_extras: string
  disponivel: number
  origem: string | null
  origem_url: string
  origem_codigo: string
  estoque_origem: number | null
  criado_em: string
  atualizado_em: string
}

const COLUNAS_PUBLICAS =
  'id, sku, nome, slug, descricao, grupo, categoria, categoria_slug, subcategoria, preco_centavos, foto, fotos_extras'
/**
 * Listagens levam o que o card usa + as fotos extras (poucos bytes): assim a página do produto
 * já abre com a galeria no formato final, sem pular quando chegam os dados completos.
 * A descrição (o que pesa) vem só em GET /api/produtos/:slug.
 */
const COLUNAS_LISTA = 'id, sku, nome, slug, grupo, categoria, categoria_slug, subcategoria, preco_centavos, foto, fotos_extras'

function paraPublico(l: Linha): Produto {
  return {
    id: l.id,
    sku: l.sku,
    nome: l.nome,
    slug: l.slug,
    descricao: l.descricao ?? '',
    grupo: l.grupo,
    categoria: l.categoria,
    categoriaSlug: l.categoria_slug,
    subcategoria: l.subcategoria,
    preco: l.preco_centavos,
    foto: l.foto,
    fotos: l.fotos_extras === undefined ? [] : lerFotos(l.fotos_extras),
  }
}

function lerFotos(json: string): string[] {
  try {
    const v = JSON.parse(json) as unknown
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

const URL_FOTO = /^(https?:\/\/|\/uploads\/)/

function paraAdmin(l: Linha): ProdutoAdmin {
  return {
    ...paraPublico(l),
    fornecedor: l.fornecedor as PrefixoFornecedor,
    disponivel: l.disponivel === 1,
    origem: l.origem,
    origemUrl: l.origem_url,
    origemCodigo: l.origem_codigo,
    estoqueOrigem: l.estoque_origem === null ? null : l.estoque_origem === 1,
    criadoEm: l.criado_em,
    atualizadoEm: l.atualizado_em,
  }
}

/** Aparece no site: liberado no painel E (cadastro manual OU em estoque no fornecedor). */
const VISIVEL = 'disponivel = 1 AND COALESCE(estoque_origem, 1) = 1'

const escaparLike = (s: string) => s.replace(/[\\%_]/g, '\\$&')

// ---------- Leitura pública (somente disponíveis) ----------

export function listarPublico(f: {
  q?: string
  grupo?: string
  categoria?: string
  cursor?: number
  limite: number
}): PaginaProdutos {
  const where = [VISIVEL]
  const params: (string | number)[] = []

  for (const termo of normalizar(f.q ?? '').split(' ').filter(Boolean).slice(0, 6)) {
    where.push(`busca LIKE ? ESCAPE '\\'`)
    params.push(`%${escaparLike(termo)}%`)
  }
  if (f.grupo) {
    where.push('grupo = ?')
    params.push(f.grupo)
  }
  if (f.categoria) {
    where.push('categoria_slug = ?')
    params.push(f.categoria)
  }

  const filtro = where.join(' AND ')
  const total =
    f.cursor === undefined
      ? (db.prepare(`SELECT COUNT(*) AS n FROM produtos WHERE ${filtro}`).get(...params) as { n: number }).n
      : undefined

  const linhas = db
    .prepare(
      `SELECT ${COLUNAS_LISTA} FROM produtos WHERE ${filtro}${f.cursor !== undefined ? ' AND id < ?' : ''}
       ORDER BY id DESC LIMIT ?`,
    )
    .all(...params, ...(f.cursor !== undefined ? [f.cursor] : []), f.limite + 1) as Linha[]

  const temMais = linhas.length > f.limite
  const items = linhas.slice(0, f.limite).map(paraPublico)
  return { items, nextCursor: temMais ? items[items.length - 1].id : null, total }
}

export function buscarPorSlug(slug: string): Produto | undefined {
  const l = db.prepare(`SELECT ${COLUNAS_PUBLICAS} FROM produtos WHERE slug = ? AND ${VISIVEL}`).get(slug) as
    | Linha
    | undefined
  return l && paraPublico(l)
}

export function contarCategorias(): ContagemCategoria[] {
  return (
    db
      .prepare(
        `SELECT grupo, categoria_slug, COUNT(*) AS total FROM produtos
         WHERE ${VISIVEL} GROUP BY grupo, categoria_slug`,
      )
      .all() as { grupo: string; categoria_slug: string; total: number }[]
  ).map((r) => ({ grupo: r.grupo, categoriaSlug: r.categoria_slug, total: r.total }))
}

// ---------- Admin ----------

export function listarAdmin(): ProdutoAdmin[] {
  return (db.prepare('SELECT * FROM produtos ORDER BY id DESC').all() as Linha[]).map(paraAdmin)
}

function porId(id: number): Linha | undefined {
  return db.prepare('SELECT * FROM produtos WHERE id = ?').get(id) as Linha | undefined
}

function porSku(sku: string): Linha | undefined {
  return db.prepare('SELECT * FROM produtos WHERE sku = ?').get(sku) as Linha | undefined
}

export class ErroValidacao extends Error {}

type Dados = {
  sku: string | null
  nome: string
  descricao: string
  grupo: string
  categoria: string
  categoriaSlug: string
  subcategoria: string
  fornecedor: PrefixoFornecedor
  preco: number
  foto: string
  fotos: string[]
  disponivel: boolean
}

const texto = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim())

/** Valida a entrada. Campos em branco herdam de `base` (usado ao atualizar via planilha). */
function validar(e: ProdutoEntrada, base?: Linha): Dados {
  const nome = texto(e.nome) || base?.nome || ''
  if (!nome) throw new ErroValidacao('Nome é obrigatório')
  if (nome.length > 200) throw new ErroValidacao('Nome muito longo (máx. 200 caracteres)')

  const cat = encontrarCategoria(texto(e.categoria) || base?.categoria || '')
  if (!cat) throw new ErroValidacao(`Categoria inválida: "${texto(e.categoria)}"`)

  let sku: string | null = texto(e.sku).toUpperCase() || base?.sku || null
  if (sku && !SKU_REGEX.test(sku)) throw new ErroValidacao(`SKU inválido: "${sku}" (use PRE-0001, ATC-0001 ou SAL-0001)`)

  const fornecedor =
    encontrarFornecedor(texto(e.fornecedor)) ??
    (sku?.slice(0, 3) as PrefixoFornecedor | undefined) ??
    (base?.fornecedor as PrefixoFornecedor | undefined)
  if (!fornecedor) throw new ErroValidacao('Fornecedor é obrigatório (Premoli, Atacadão ou Sales)')
  if (sku && !sku.startsWith(fornecedor)) {
    throw new ErroValidacao(`SKU ${sku} não corresponde ao fornecedor ${fornecedor}`)
  }

  const precoBruto = texto(e.preco) === '' ? undefined : e.preco
  const preco = precoBruto === undefined ? (base?.preco_centavos ?? null) : parsePreco(precoBruto)
  if (preco === null) throw new ErroValidacao(`Preço inválido: "${texto(e.preco)}"`)

  const fotos = Array.isArray(e.fotos)
    ? [...new Set(e.fotos.map(texto).filter(Boolean))]
    : base
      ? lerFotos(base.fotos_extras)
      : []
  // Sem capa mas com extras: a primeira extra vira capa.
  const foto = texto(e.foto) || base?.foto || fotos.shift() || ''
  if (foto && !URL_FOTO.test(foto)) throw new ErroValidacao('Foto deve ser uma URL (http/https)')
  if (fotos.length > MAX_FOTOS_EXTRAS) throw new ErroValidacao(`Máximo de ${MAX_FOTOS_EXTRAS} fotos além da capa`)
  const invalida = fotos.find((f) => !URL_FOTO.test(f))
  if (invalida) throw new ErroValidacao(`Foto extra inválida: "${invalida}"`)

  return {
    sku,
    nome,
    descricao: texto(e.descricao) || base?.descricao || '',
    grupo: cat.grupo.slug,
    categoria: cat.categoria,
    categoriaSlug: cat.slug,
    subcategoria: texto(e.subcategoria) || base?.subcategoria || '',
    fornecedor,
    preco,
    foto,
    fotos: fotos.filter((f) => f !== foto),
    disponivel: parseBooleano(e.disponivel, base ? base.disponivel === 1 : true),
  }
}

function proximoSku(prefixo: string): string {
  const r = db
    .prepare(`SELECT MAX(CAST(substr(sku, 5) AS INTEGER)) AS n FROM produtos WHERE sku LIKE ?`)
    .get(`${prefixo}-%`) as { n: number | null }
  return `${prefixo}-${String((r.n ?? 0) + 1).padStart(4, '0')}`
}

function slugUnico(nome: string, ignorarId?: number): string {
  const base = slugify(nome) || 'produto'
  const existe = db.prepare('SELECT id FROM produtos WHERE slug = ? AND id IS NOT ?')
  let slug = base
  for (let i = 2; existe.get(slug, ignorarId ?? null); i++) slug = `${base}-${i}`
  return slug
}

const buscaDe = (d: Dados) => normalizar(`${d.nome} ${d.categoria} ${d.subcategoria}`)

function inserir(d: Dados): Linha {
  const sku = d.sku ?? proximoSku(d.fornecedor)
  if (porSku(sku)) throw new ErroValidacao(`SKU ${sku} já existe`)
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO produtos (sku, nome, slug, descricao, grupo, categoria, categoria_slug, subcategoria,
         fornecedor, preco_centavos, foto, fotos_extras, disponivel, busca)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      sku,
      d.nome,
      slugUnico(d.nome),
      d.descricao,
      d.grupo,
      d.categoria,
      d.categoriaSlug,
      d.subcategoria,
      d.fornecedor,
      d.preco,
      d.foto,
      JSON.stringify(d.fotos),
      d.disponivel ? 1 : 0,
      buscaDe(d),
    )
  return porId(Number(lastInsertRowid))!
}

function gravar(atual: Linha, d: Dados): Linha {
  const sku = d.sku ?? atual.sku
  if (sku !== atual.sku && porSku(sku)) throw new ErroValidacao(`SKU ${sku} já existe`)
  // Slug só muda se o nome mudar, para não quebrar links compartilhados à toa.
  const slug = d.nome === atual.nome ? atual.slug : slugUnico(d.nome, atual.id)
  db.prepare(
    `UPDATE produtos SET sku = ?, nome = ?, slug = ?, descricao = ?, grupo = ?, categoria = ?, categoria_slug = ?,
       subcategoria = ?, fornecedor = ?, preco_centavos = ?, foto = ?, fotos_extras = ?, disponivel = ?, busca = ?,
       atualizado_em = datetime('now')
     WHERE id = ?`,
  ).run(
    sku,
    d.nome,
    slug,
    d.descricao,
    d.grupo,
    d.categoria,
    d.categoriaSlug,
    d.subcategoria,
    d.fornecedor,
    d.preco,
    d.foto,
    JSON.stringify(d.fotos),
    d.disponivel ? 1 : 0,
    buscaDe(d),
    atual.id,
  )
  return porId(atual.id)!
}

export function criar(e: ProdutoEntrada): ProdutoAdmin {
  return paraAdmin(inserir(validar(e)))
}

export function atualizar(id: number, e: ProdutoEntrada): ProdutoAdmin | undefined {
  const atual = porId(id)
  if (!atual) return undefined
  return paraAdmin(gravar(atual, validar(e)))
}

export function definirDisponivel(id: number, disponivel: boolean): ProdutoAdmin | undefined {
  db.prepare(`UPDATE produtos SET disponivel = ?, atualizado_em = datetime('now') WHERE id = ?`).run(
    disponivel ? 1 : 0,
    id,
  )
  const l = porId(id)
  return l && paraAdmin(l)
}

/** Todas as fotos do produto (capa + extras). */
export function fotosDe(p: { foto: string; fotos: string[] }): string[] {
  return [p.foto, ...p.fotos].filter(Boolean)
}

/** Remove o produto e devolve as fotos dele (para apagar os arquivos), ou null se não existir. */
export function remover(id: number): string[] | null {
  const l = porId(id)
  if (!l) return null
  transacao(() => {
    db.prepare('DELETE FROM produtos WHERE id = ?').run(id)
    // Sem isso a próxima sincronização traria o produto de volta.
    if (l.origem) db.prepare('INSERT OR IGNORE INTO origens_ignoradas (origem) VALUES (?)').run(l.origem)
  })
  return fotosDe(paraPublico(l))
}

/** Importação da planilha: atualiza pelo SKU quando existir, senão cria. */
export function importar(linhas: ProdutoEntrada[]): RelatorioImportacao {
  const rel: RelatorioImportacao = { inseridos: 0, atualizados: 0, erros: [] }
  transacao(() => {
    linhas.forEach((e, i) => {
      const linha = i + 2 // +1 cabeçalho, +1 base 1 (igual ao Excel)
      try {
        const sku = texto(e.sku).toUpperCase()
        const existente = sku ? porSku(sku) : undefined
        if (existente) {
          gravar(existente, validar(e, existente))
          rel.atualizados++
        } else {
          inserir(validar(e))
          rel.inseridos++
        }
      } catch (err) {
        if (!(err instanceof ErroValidacao)) throw err
        rel.erros.push({ linha, mensagem: err.message })
      }
    })
  })
  return rel
}

export function totalProdutos(): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM produtos').get() as { n: number }).n
}

// ---------- Sincronização com distribuidores ----------

export type DadosOrigem = { origem: string; url: string; codigo: string }

export function porOrigem(origem: string): ProdutoAdmin | undefined {
  const l = db.prepare('SELECT * FROM produtos WHERE origem = ?').get(origem) as Linha | undefined
  return l && paraAdmin(l)
}

export function origemIgnorada(origem: string): boolean {
  return Boolean(db.prepare('SELECT 1 FROM origens_ignoradas WHERE origem = ?').get(origem))
}

/** Cria um produto vindo do site do distribuidor (SKU gerado pelo fornecedor). */
export function criarDeOrigem(e: ProdutoEntrada, o: DadosOrigem): ProdutoAdmin {
  return transacao(() => {
    const l = inserir(validar({ ...e, sku: undefined }))
    db.prepare('UPDATE produtos SET origem = ?, origem_url = ?, origem_codigo = ?, estoque_origem = 1 WHERE id = ?').run(
      o.origem,
      o.url,
      o.codigo,
      l.id,
    )
    return paraAdmin(porId(l.id)!)
  })
}

/**
 * Atualiza só o que vem do fornecedor: custo→preço, estoque e (se o produto ainda
 * não tem foto) as fotos. Nome, descrição e categoria editados no painel são preservados.
 */
export function atualizarDeOrigem(id: number, dados: { preco: number; fotos?: string[]; url: string; codigo: string }) {
  const atual = porId(id)
  if (!atual) return
  const [capa = '', ...extras] = dados.fotos ?? []
  const semFoto = !atual.foto && capa
  db.prepare(
    `UPDATE produtos SET preco_centavos = ?, estoque_origem = 1, origem_url = ?, origem_codigo = ?,
       foto = CASE WHEN ? THEN ? ELSE foto END,
       fotos_extras = CASE WHEN ? THEN ? ELSE fotos_extras END,
       atualizado_em = CASE WHEN preco_centavos <> ? OR estoque_origem IS NOT 1 THEN datetime('now') ELSE atualizado_em END
     WHERE id = ?`,
  ).run(
    dados.preco,
    dados.url,
    dados.codigo,
    semFoto ? 1 : 0,
    capa,
    semFoto ? 1 : 0,
    JSON.stringify(extras.slice(0, MAX_FOTOS_EXTRAS)),
    dados.preco,
    id,
  )
}

/** Marca como sem estoque tudo do fornecedor que não apareceu em estoque nesta sincronização. */
export function marcarSemEstoque(prefixo: string, emEstoque: Set<string>, preservar: Set<string>): number {
  const linhas = db
    .prepare(`SELECT id, origem FROM produtos WHERE origem LIKE ? AND COALESCE(estoque_origem, 1) = 1`)
    .all(`${prefixo}:%`) as { id: number; origem: string }[]
  const sair = linhas.filter((l) => !emEstoque.has(l.origem) && !preservar.has(l.origem))
  const upd = db.prepare(`UPDATE produtos SET estoque_origem = 0, atualizado_em = datetime('now') WHERE id = ?`)
  transacao(() => sair.forEach((l) => upd.run(l.id)))
  return sair.length
}

export function contarAtivosDaOrigem(prefixo: string): number {
  return (
    db
      .prepare(`SELECT COUNT(*) AS n FROM produtos WHERE origem LIKE ? AND COALESCE(estoque_origem, 1) = 1`)
      .get(`${prefixo}:%`) as { n: number }
  ).n
}

/** ids (no site do fornecedor) dos produtos dele já cadastrados e em estoque. */
export function idsDaOrigem(prefixo: string): string[] {
  return (
    db
      .prepare(`SELECT origem FROM produtos WHERE origem LIKE ? AND COALESCE(estoque_origem, 1) = 1`)
      .all(`${prefixo}:%`) as { origem: string }[]
  ).map((l) => l.origem.slice(prefixo.length + 1))
}

// ---------- Exportação para site estático ----------

/** Todos os produtos que aparecem no site, completos, do mais novo para o mais antigo. */
export function listarVisiveis(): Produto[] {
  return (
    db.prepare(`SELECT ${COLUNAS_PUBLICAS} FROM produtos WHERE ${VISIVEL} ORDER BY id DESC`).all() as Linha[]
  ).map(paraPublico)
}
