// Dados de negócio compartilhados entre site (src/) e API (server/).

export const WHATSAPP_NUMERO = '5571982875363'
export const WHATSAPP_EXIBICAO = '(71) 98287-5363'

export const FORNECEDORES = [
  { prefixo: 'PRE', nome: 'Premoli Distribuidora' },
  { prefixo: 'ATC', nome: 'Atacadão dos Móveis' },
  { prefixo: 'SAL', nome: 'Sales Distribuidora' },
] as const

export type PrefixoFornecedor = (typeof FORNECEDORES)[number]['prefixo']

export type Grupo = {
  slug: string
  nome: string
  descricao: string
  categorias: string[]
}

export const GRUPOS: Grupo[] = [
  {
    slug: 'quarto',
    nome: 'Quarto',
    descricao: 'Camas, colchões, guarda-roupas e tudo para o seu descanso',
    categorias: ['Camas e Cabeceiras', 'Colchões', 'Guarda-roupas', 'Cômodas', 'Criados-mudos'],
  },
  {
    slug: 'sala',
    nome: 'Sala',
    descricao: 'Racks, sofás, estantes e mesas para receber bem',
    categorias: ['Racks e Painéis de TV', 'Sofás e Poltronas', 'Estantes', 'Mesas de Centro e de Canto'],
  },
  {
    slug: 'cozinha-e-jantar',
    nome: 'Cozinha e Jantar',
    descricao: 'Mesas, cadeiras, armários e balcões',
    categorias: ['Mesas de Jantar', 'Cadeiras', 'Armários e Balcões de Cozinha'],
  },
  {
    slug: 'eletrodomesticos',
    nome: 'Eletrodomésticos',
    descricao: 'Geladeiras, fogões, micro-ondas e mais',
    categorias: ['Geladeiras', 'Fogões', 'Micro-ondas', 'Lavadoras', 'Outros Eletrodomésticos'],
  },
  {
    slug: 'portateis',
    nome: 'Portáteis',
    descricao: 'Ventiladores, liquidificadores, ferros de passar e mais',
    categorias: ['Ventiladores', 'Liquidificadores', 'Ferros de Passar', 'Outros Portáteis'],
  },
  {
    slug: 'variedades',
    nome: 'Variedades',
    descricao: 'Achados especiais para completar sua casa',
    categorias: ['Variedades'],
  },
]

/** Remove acentos, caixa baixa e espaços extras — usado em busca e comparação. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function slugify(texto: string): string {
  return normalizar(texto)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export type CategoriaInfo = { grupo: Grupo; categoria: string; slug: string }

const CATEGORIAS: CategoriaInfo[] = GRUPOS.flatMap((grupo) =>
  grupo.categorias.map((categoria) => ({ grupo, categoria, slug: slugify(categoria) })),
)

/** Aceita nome ("Guarda-roupas", "guarda roupas") ou slug ("guarda-roupas"). */
export function encontrarCategoria(valor: string): CategoriaInfo | undefined {
  const slug = slugify(valor)
  return CATEGORIAS.find((c) => c.slug === slug)
}

export function encontrarGrupo(slug: string): Grupo | undefined {
  return GRUPOS.find((g) => g.slug === slug)
}

/** Aceita prefixo ("PRE") ou nome ("Premoli", "Premoli Distribuidora"). */
export function encontrarFornecedor(valor: string): PrefixoFornecedor | undefined {
  const v = normalizar(valor)
  if (!v) return undefined
  const f = FORNECEDORES.find(
    (f) => normalizar(f.prefixo) === v || normalizar(f.nome) === v || normalizar(f.nome).startsWith(v),
  )
  return f?.prefixo
}

export function nomeFornecedor(prefixo: string): string {
  return FORNECEDORES.find((f) => f.prefixo === prefixo)?.nome ?? prefixo
}

export const SKU_REGEX = /^(PRE|ATC|SAL)-\d{4,}$/

/**
 * Converte preço digitado/planilha para centavos.
 * Aceita "R$ 1.299,90", "1299,90", "1299.90", "1.299", 1299.9.
 */
export function parsePreco(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) && valor >= 0 ? Math.round(valor * 100) : null
  if (typeof valor !== 'string') return null
  let s = valor.replace(/R\$|\s/gi, '')
  if (!s) return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  return Math.round(parseFloat(s) * 100)
}

export function parseBooleano(valor: unknown, padrao: boolean): boolean {
  if (typeof valor === 'boolean') return valor
  if (typeof valor === 'number') return valor !== 0
  const v = normalizar(String(valor ?? ''))
  if (!v) return padrao
  if (['true', 'sim', 's', '1', 'yes', 'y', 'disponivel', 'verdadeiro', 'x'].includes(v)) return true
  if (['false', 'nao', 'n', '0', 'no', 'indisponivel', 'falso'].includes(v)) return false
  return padrao
}

export function mensagemWhatsApp(produto: { nome: string; sku: string }): string {
  return `Olá! Tenho interesse no produto ${produto.nome} (Ref: ${produto.sku}). Poderia me passar mais informações?`
}

export function linkWhatsApp(texto?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMERO}`
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base
}

/** Formato público do produto (API → site). Fornecedor e disponibilidade ficam de fora. */
export type Produto = {
  id: number
  sku: string
  nome: string
  slug: string
  descricao: string
  grupo: string
  categoria: string
  categoriaSlug: string
  subcategoria: string
  /** em centavos */
  preco: number
  /** foto de capa (cards, listagens) */
  foto: string
  /** até MAX_FOTOS_EXTRAS fotos adicionais, exibidas na galeria do produto */
  fotos: string[]
}

export const MAX_FOTOS_EXTRAS = 3

export type ProdutoAdmin = Produto & {
  fornecedor: PrefixoFornecedor
  /** controle manual do painel */
  disponivel: boolean
  /** "PRE:39892" quando veio do site do distribuidor; null = cadastro manual */
  origem: string | null
  origemUrl: string
  origemCodigo: string
  /** estoque no site do distribuidor (null = cadastro manual) */
  estoqueOrigem: boolean | null
  criadoEm: string
  atualizadoEm: string
}

export type PaginaProdutos = {
  /** versão resumida: `descricao` vazia (use GET /api/produtos/:slug para o completo) */
  items: Produto[]
  nextCursor: number | null
  total?: number
}

export type ContagemCategoria = { grupo: string; categoriaSlug: string; total: number }

/** Corpo aceito ao criar/editar (painel e importação). */
export type ProdutoEntrada = {
  sku?: string
  nome?: string
  descricao?: string
  categoria?: string
  subcategoria?: string
  fornecedor?: string
  preco?: string | number
  foto?: string
  /** fotos extras; ausente = mantém as atuais (planilha), [] = remove todas */
  fotos?: string[]
  disponivel?: boolean | string | number
}

export type RelatorioImportacao = {
  inseridos: number
  atualizados: number
  erros: { linha: number; mensagem: string }[]
}
