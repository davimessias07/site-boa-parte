import Papa from 'papaparse'
import { nomeFornecedor, normalizar, type ProdutoAdmin, type ProdutoEntrada } from '../../../shared/catalogo'
import { precoParaCampo } from '../../lib/formato'

type Coluna = Exclude<keyof ProdutoEntrada, 'fotos'> | 'foto2' | 'foto3' | 'foto4'

// Nomes de coluna aceitos (comparados sem acento/caixa).
const COLUNAS: Record<string, Coluna> = {
  sku: 'sku',
  codigo: 'sku',
  ref: 'sku',
  referencia: 'sku',
  nome: 'nome',
  produto: 'nome',
  categoria: 'categoria',
  subcategoria: 'subcategoria',
  fornecedor: 'fornecedor',
  distribuidor: 'fornecedor',
  preco: 'preco',
  'preco de venda': 'preco',
  valor: 'preco',
  foto: 'foto',
  imagem: 'foto',
  'url da foto': 'foto',
  capa: 'foto',
  'foto capa': 'foto',
  'foto 2': 'foto2',
  foto2: 'foto2',
  'foto 3': 'foto3',
  foto3: 'foto3',
  'foto 4': 'foto4',
  foto4: 'foto4',
  disponivel: 'disponivel',
  disponibilidade: 'disponivel',
  descricao: 'descricao',
}

const CABECALHO = ['SKU', 'Nome', 'Categoria', 'Subcategoria', 'Fornecedor', 'Preço', 'Foto', 'Foto 2', 'Foto 3', 'Foto 4', 'Disponível', 'Descrição']

/** CSV salvo pelo Excel no Brasil costuma vir em Windows-1252; tenta UTF-8 primeiro. */
async function lerTexto(arquivo: File) {
  const bytes = await arquivo.arrayBuffer()
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, '')
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

export async function lerPlanilha(arquivo: File): Promise<ProdutoEntrada[]> {
  let linhas: unknown[][]
  if (/\.xlsx$/i.test(arquivo.name)) {
    const { readSheet } = await import('read-excel-file/browser')
    linhas = (await readSheet(arquivo)) as unknown[][]
  } else if (/\.(csv|txt)$/i.test(arquivo.name)) {
    linhas = Papa.parse<string[]>(await lerTexto(arquivo), { skipEmptyLines: 'greedy' }).data
  } else {
    throw new Error('Formato não suportado. Use .csv ou .xlsx')
  }

  const [cabecalho = [], ...dados] = linhas
  const mapa = cabecalho.map((c) => COLUNAS[normalizar(String(c ?? ''))])
  if (!mapa.includes('nome') && !mapa.includes('sku')) {
    throw new Error(`Cabeçalho não reconhecido. Use as colunas: ${CABECALHO.join(', ')}`)
  }
  const temFotosExtras = mapa.some((c) => c === 'foto2' || c === 'foto3' || c === 'foto4')

  return dados
    .map((linha) => {
      const entrada: Record<string, unknown> = {}
      const extras: string[] = []
      mapa.forEach((campo, i) => {
        const v = linha[i]
        if (!campo || v === null || v === undefined || String(v).trim() === '') return
        if (campo === 'foto2' || campo === 'foto3' || campo === 'foto4') extras.push(String(v).trim())
        else entrada[campo] = campo === 'preco' || campo === 'disponivel' ? v : String(v).trim()
      })
      // Com colunas Foto 2..4 preenchidas, elas substituem as extras atuais; todas vazias = mantém.
      if (temFotosExtras && extras.length) entrada.fotos = extras
      return entrada as ProdutoEntrada
    })
    .filter((e) => Object.keys(e).length > 0)
}

function baixar(nome: string, conteudo: string) {
  const blob = new Blob(['﻿', conteudo], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: nome })
  a.click()
  URL.revokeObjectURL(url)
}

export function exportarCsv(produtos: ProdutoAdmin[]) {
  const linhas = produtos.map((p) => [
    p.sku,
    p.nome,
    p.categoria,
    p.subcategoria,
    nomeFornecedor(p.fornecedor),
    precoParaCampo(p.preco),
    p.foto,
    p.fotos[0] ?? '',
    p.fotos[1] ?? '',
    p.fotos[2] ?? '',
    p.disponivel ? 'sim' : 'não',
    p.descricao,
  ])
  const data = new Date().toISOString().slice(0, 10)
  baixar(`catalogo-boa-parte-${data}.csv`, Papa.unparse([CABECALHO, ...linhas], { delimiter: ';' }))
}

export function baixarModelo() {
  baixar(
    'modelo-importacao-boa-parte.csv',
    Papa.unparse(
      [
        CABECALHO,
        ['PRE-0142', 'Guarda-roupa 6 Portas Espelhado', 'Guarda-roupas', '6 portas', 'Premoli', '1.899,90', 'https://exemplo.com/capa.jpg', 'https://exemplo.com/lateral.jpg', 'https://exemplo.com/aberto.jpg', '', 'sim', 'Guarda-roupa casal com 6 portas.'],
        ['', 'Sofá Retrátil 3 Lugares', 'Sofás e Poltronas', '3 lugares', 'Atacadão', '2499,90', '', '', '', '', 'sim', ''],
      ],
      { delimiter: ';' },
    ),
  )
}
