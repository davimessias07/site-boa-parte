// Sincroniza o catálogo com os sites dos distribuidores.
//
//   npm run sincronizar                       todos os fornecedores
//   npm run sincronizar -- --fornecedor=PRE   só um (PRE, ATC, SAL; separados por vírgula)
//   npm run sincronizar -- --simular          só mostra o que faria (não grava nem baixa fotos)
//   npm run sincronizar -- --limite=20        para testes: poucos produtos (não marca nada como sem estoque)
//   npm run sincronizar -- --margem=2         preço de venda = preço do distribuidor × margem (padrão 2)
//
// Regras:
// - Só entra produto EM ESTOQUE no distribuidor e dentro das categorias do site.
// - Produto novo: criado com SKU do fornecedor (ex.: PRE-0143), fotos baixadas e otimizadas.
// - Produto que já existe: atualiza preço e estoque; nome/descrição/categoria editados no painel são mantidos.
// - Produto que sumiu ou esgotou no distribuidor: fica oculto do site até voltar ao estoque.
// - Produto excluído no painel não é recriado.
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { DATA_DIR } from './db.ts'
import * as produtos from './produtos.ts'
import { mapearCategoria, subcategoriaDe } from './sincronizar/categorias.ts'
import { importarFoto } from './sincronizar/fotos.ts'
import { atacadao, sales } from './sincronizar/opencart.ts'
import { premoli } from './sincronizar/premoli.ts'
import type { Coletor } from './sincronizar/tipos.ts'
import { mapaLimitado } from './sincronizar/util.ts'
import { MAX_FOTOS_EXTRAS } from '../shared/catalogo.ts'

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const formatarCentavos = (c: number) => moeda.format(c / 100)

const { values: args } = parseArgs({
  options: {
    fornecedor: { type: 'string' },
    simular: { type: 'boolean', default: false },
    limite: { type: 'string' },
    margem: { type: 'string' },
    'sem-fotos': { type: 'boolean', default: false },
  },
})

const COLETORES: Coletor[] = [premoli, atacadao, sales]
const escolhidos = args.fornecedor?.toUpperCase().split(',').map((s) => s.trim())
const alvo = escolhidos ? COLETORES.filter((c) => escolhidos.includes(c.prefixo)) : COLETORES
const limite = args.limite ? Number(args.limite) : undefined
const margem = Number(args.margem ?? process.env.MARGEM ?? 2)
if (!alvo.length || !(margem > 0)) {
  console.error('Uso: npm run sincronizar -- [--fornecedor=PRE,ATC,SAL] [--simular] [--limite=N] [--margem=2]')
  process.exit(1)
}

const log = (msg: string) => console.log(`[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`)
const interessa = (categorias: string[], nome: string) => mapearCategoria(categorias, nome) !== null

type Resumo = {
  fornecedor: string
  emEstoque: number
  novos: number
  atualizados: number
  semEstoque: number
  foraDoEscopo: number
  semPreco: number
  ignorados: number
  falhas: number
  erros: string[]
  porCategoria: Record<string, number>
  aviso?: string
}

const resumos: Resumo[] = []
const inicio = Date.now()

for (const coletor of alvo) {
  log(`== ${coletor.nome} (${coletor.prefixo})${args.simular ? ' — SIMULAÇÃO' : ''}`)
  const r: Resumo = {
    fornecedor: coletor.nome,
    emEstoque: 0,
    novos: 0,
    atualizados: 0,
    semEstoque: 0,
    foraDoEscopo: 0,
    semPreco: 0,
    ignorados: 0,
    falhas: 0,
    erros: [],
    porCategoria: {},
  }
  resumos.push(r)

  let coleta
  try {
    coleta = await coletor.coletar({ limite, log, interessa, conhecidos: produtos.idsDaOrigem(coletor.prefixo) })
  } catch (e) {
    r.aviso = `Site indisponível: ${(e as Error).message}. Nada foi alterado para este fornecedor.`
    log(`! ${r.aviso}`)
    continue
  }
  r.falhas = coleta.falhas.length
  const emEstoque = coleta.itens.filter((i) => i.emEstoque)
  r.emEstoque = emEstoque.length
  log(`  ${coleta.itens.length} produtos lidos, ${emEstoque.length} em estoque`)

  const vistos = new Set<string>()
  let feitos = 0
  await mapaLimitado(emEstoque, 3, async (item) => {
    const origem = `${coletor.prefixo}:${item.id}`
    const jaExiste = produtos.porOrigem(origem)
    const categoria = jaExiste ? jaExiste.categoria : mapearCategoria(item.categorias, item.nome)
    if (!categoria) return void r.foraDoEscopo++
    if (!item.custo) return void r.semPreco++
    if (produtos.origemIgnorada(origem)) return void r.ignorados++
    vistos.add(origem)
    r.porCategoria[categoria] = (r.porCategoria[categoria] ?? 0) + 1
    const preco = Math.round(item.custo * margem)

    if (args.simular) {
      if (r.porCategoria[categoria] <= 2) {
        log(
          `  [${categoria}] ${item.nome} — custo ${formatarCentavos(item.custo)} → ${formatarCentavos(preco)} · ` +
            `${item.fotos.length} foto(s) · origem: ${item.categorias.join(' > ')}${item.codigo ? ` · cód. ${item.codigo}` : ''}`,
        )
      }
      return
    }

    try {
      const existente = produtos.porOrigem(origem)
      const precisaFotos = !args['sem-fotos'] && (!existente || !existente.foto)
      const fotos = precisaFotos
        ? (await mapaLimitado(item.fotos.slice(0, 1 + MAX_FOTOS_EXTRAS), 2, importarFoto)).filter(
            (f): f is string => Boolean(f),
          )
        : undefined

      if (existente) {
        produtos.atualizarDeOrigem(existente.id, { preco, fotos, url: item.url, codigo: item.codigo })
        r.atualizados++
      } else {
        const [capa = '', ...extras] = fotos ?? []
        produtos.criarDeOrigem(
          {
            nome: item.nome,
            descricao: item.descricao,
            categoria,
            subcategoria: subcategoriaDe(item.categorias[0] ?? '', categoria),
            fornecedor: coletor.prefixo,
            preco: preco / 100,
            foto: capa,
            fotos: extras,
            disponivel: true,
          },
          { origem, url: item.url, codigo: item.codigo },
        )
        r.novos++
      }
    } catch (e) {
      r.erros.push(`${item.nome}: ${(e as Error).message}`)
    }
    if (++feitos % 50 === 0) log(`  gravados ${feitos}/${emEstoque.length}`)
  })

  if (args.simular) {
    log(`  por categoria: ${JSON.stringify(r.porCategoria)}`)
    log(`  fora do escopo: ${r.foraDoEscopo} · sem preço: ${r.semPreco}`)
    continue
  }

  // Esgotados/removidos no distribuidor saem do site. Só com leitura completa, e com
  // uma trava: se veio bem menos que o normal, o site do fornecedor provavelmente falhou.
  if (!coleta.completa) {
    r.aviso = 'Leitura parcial — nenhum produto foi marcado como sem estoque.'
  } else {
    const ativos = produtos.contarAtivosDaOrigem(coletor.prefixo)
    if (ativos > 20 && vistos.size < ativos * 0.5) {
      r.aviso = `Só ${vistos.size} de ${ativos} produtos vieram em estoque — parece falha no site; não marquei nada como sem estoque.`
    } else {
      const preservar = new Set(coleta.falhas.map((id) => `${coletor.prefixo}:${id}`))
      r.semEstoque = produtos.marcarSemEstoque(coletor.prefixo, vistos, preservar)
    }
  }
  if (r.aviso) log(`! ${r.aviso}`)
  log(
    `  novos ${r.novos} · atualizados ${r.atualizados} · ficaram sem estoque ${r.semEstoque} · ` +
      `fora do escopo ${r.foraDoEscopo} · sem preço ${r.semPreco} · erros ${r.erros.length} · falhas de leitura ${r.falhas}`,
  )
}

const duracao = Math.round((Date.now() - inicio) / 1000)
log(`Concluído em ${Math.floor(duracao / 60)}min ${duracao % 60}s`)
if (!args.simular) {
  writeFileSync(
    path.join(DATA_DIR, 'ultima-sincronizacao.json'),
    JSON.stringify({ em: new Date().toISOString(), margem, duracaoSegundos: duracao, resumos }, null, 2),
  )
}
