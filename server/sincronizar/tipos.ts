import type { PrefixoFornecedor } from '../../shared/catalogo.ts'

/** Produto como encontrado no site do distribuidor. */
export type ItemOrigem = {
  /** id do produto no site do distribuidor */
  id: string
  url: string
  nome: string
  descricao: string
  /** preço do distribuidor (custo), em centavos */
  custo: number
  /** URLs das fotos em ordem (capa primeiro); cada entrada tem alternativas em ordem de preferência */
  fotos: string[][]
  /** categorias no site do distribuidor, da mais específica para a mais geral */
  categorias: string[]
  /** código/modelo do distribuidor, quando existe */
  codigo: string
  emEstoque: boolean
}

export type Coleta = {
  itens: ItemOrigem[]
  /** ids que deram erro ao ler — não devem ser marcados como sem estoque */
  falhas: string[]
  /** false = listagem incompleta; nesse caso nada é marcado como sem estoque */
  completa: boolean
}

export type OpcoesColeta = {
  limite?: number
  log: (msg: string) => void
  /** decide antes de abrir a página do produto se a categoria interessa (economiza requisições) */
  interessa: (categorias: string[], nome: string) => boolean
  /** ids deste fornecedor já no catálogo: se não aparecerem na listagem, a página deles é conferida */
  conhecidos: string[]
}

export type Coletor = {
  prefixo: PrefixoFornecedor
  nome: string
  coletar: (o: OpcoesColeta) => Promise<Coleta>
}
