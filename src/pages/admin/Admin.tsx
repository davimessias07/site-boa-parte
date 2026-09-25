import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Download,
  ExternalLink,
  FileSpreadsheet,
  LoaderCircle,
  Lock,
  LogOut,
  PackageX,
  Pencil,
  Plus,
  Search,
  Store,
  Trash2,
} from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from 'react'
import { Link } from 'react-router'
import { FORNECEDORES, nomeFornecedor, normalizar, type ProdutoAdmin, type ProdutoEntrada } from '../../../shared/catalogo'
import { ProdutoImagem } from '../../components/ProdutoImagem'
import { formatarPreco } from '../../lib/formato'
import { useMeta } from '../../lib/useMeta'
import { EVENTO_SESSAO, adminApi, sessao } from './adminApi'
import { estiloCampo } from './Dialogo'
import { Importar } from './Importar'
import { exportarCsv } from './planilha'
import { ProdutoForm } from './ProdutoForm'

const assinar = (cb: () => void) => {
  window.addEventListener(EVENTO_SESSAO, cb)
  return () => window.removeEventListener(EVENTO_SESSAO, cb)
}

export default function Admin() {
  useMeta('Painel')
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.append(meta)
    return () => meta.remove()
  }, [])

  const token = useSyncExternalStore(assinar, sessao.get)
  return (
    <div className="min-h-dvh bg-creme">{token ? <Painel /> : <Login />}</div>
  )
}

function Login() {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')
    try {
      sessao.set((await adminApi.login(senha)).token)
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <form onSubmit={entrar} className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-card">
        <img src="/logo-160.png" alt="Móveis Boa Parte" width={96} height={96} className="mx-auto size-24 rounded-full" />
        <h1 className="mt-4 text-2xl font-bold">Painel do catálogo</h1>
        <p className="mt-1 text-sm text-cinza">Acesso restrito à equipe</p>
        <label className="mt-6 block text-left">
          <span className="text-sm font-semibold">Senha</span>
          <div className="relative mt-1.5">
            <Lock className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-cinza" />
            <input
              type="password"
              autoFocus
              required
              autoComplete="current-password"
              className={`${estiloCampo} pl-10`}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
        </label>
        {erro && <p role="alert" className="mt-3 text-sm text-red-700">{erro}</p>}
        <button type="submit" disabled={carregando} className="btn-ouro mt-6 w-full">
          {carregando && <LoaderCircle className="size-4 animate-spin" />} Entrar
        </button>
        <Link to="/" className="mt-4 inline-block text-sm text-cinza hover:text-marinho">
          ← Voltar ao site
        </Link>
      </form>
    </div>
  )
}

const POR_VEZ = 100

/** Mesma regra do servidor: liberado no painel e (manual ou com estoque no distribuidor). */
const noSite = (p: ProdutoAdmin) => p.disponivel && p.estoqueOrigem !== false

function Painel() {
  const qc = useQueryClient()
  const produtos = useQuery({ queryKey: ['admin', 'produtos'], queryFn: adminApi.listar })

  const [busca, setBusca] = useState('')
  const [fornecedor, setFornecedor] = useState('')
  const [status, setStatus] = useState<'' | 'sim' | 'nao' | 'esgotado'>('')
  const [limite, setLimite] = useState(POR_VEZ)
  const [editando, setEditando] = useState<ProdutoAdmin | null | undefined>(undefined)
  const [importando, setImportando] = useState(false)
  const buscaAdiada = useDeferredValue(busca)

  const lista = produtos.data ?? []
  const filtrados = useMemo(() => {
    const termos = normalizar(buscaAdiada).split(' ').filter(Boolean)
    return lista.filter((p) => {
      if (fornecedor && p.fornecedor !== fornecedor) return false
      if (status === 'sim' && !noSite(p)) return false
      if (status === 'nao' && p.disponivel) return false
      if (status === 'esgotado' && p.estoqueOrigem !== false) return false
      if (!termos.length) return true
      const alvo = normalizar(`${p.nome} ${p.sku} ${p.categoria} ${p.subcategoria} ${p.origemCodigo}`)
      return termos.every((t) => alvo.includes(t))
    })
  }, [lista, buscaAdiada, fornecedor, status])

  useEffect(() => setLimite(POR_VEZ), [buscaAdiada, fornecedor, status])

  // Após qualquer alteração, o site público busca os dados de novo.
  const atualizarCaches = () => {
    void qc.invalidateQueries({ queryKey: ['admin'] })
    void qc.invalidateQueries({ queryKey: ['produtos'] })
    void qc.invalidateQueries({ queryKey: ['produto'] })
    void qc.invalidateQueries({ queryKey: ['categorias'] })
  }

  const salvar = useMutation({
    mutationFn: (dados: ProdutoEntrada) =>
      editando ? adminApi.atualizar(editando.id, dados) : adminApi.criar(dados),
    onSuccess: atualizarCaches,
  })

  const alternar = useMutation({
    mutationFn: (p: ProdutoAdmin) => adminApi.disponivel(p.id, !p.disponivel),
    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: ['admin', 'produtos'] })
      qc.setQueryData<ProdutoAdmin[]>(['admin', 'produtos'], (antes) =>
        antes?.map((x) => (x.id === p.id ? { ...x, disponivel: !p.disponivel } : x)),
      )
    },
    onError: (e) => alert((e as Error).message),
    onSettled: atualizarCaches,
  })

  const remover = useMutation({
    mutationFn: (p: ProdutoAdmin) => adminApi.remover(p.id),
    onSuccess: atualizarCaches,
    onError: (e) => alert((e as Error).message),
  })

  const disponiveis = lista.filter(noSite).length
  const esgotados = lista.filter((p) => p.estoqueOrigem === false).length

  return (
    <>
      <header className="sticky top-0 z-30 bg-marinho text-white">
        <div className="container-site flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo-160.png" alt="" width={40} height={40} className="size-10 rounded-full" />
            <div className="leading-tight">
              <p className="font-serif text-lg font-bold">Boa Parte</p>
              <p className="text-xs text-ouro-claro">Painel do catálogo</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link to="/" target="_blank" className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm hover:bg-white/10 sm:flex">
              <ExternalLink className="size-4" /> Ver site
            </Link>
            <button type="button" onClick={sessao.limpar} className="flex items-center gap-2 rounded-full px-3 py-2 text-sm hover:bg-white/10">
              <LogOut className="size-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="container-site py-8">
        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          {[
            { rotulo: 'Produtos', valor: lista.length },
            { rotulo: 'No site', valor: disponiveis },
            { rotulo: 'Fora do site', valor: lista.length - disponiveis },
          ].map((c) => (
            <div key={c.rotulo} className="rounded-2xl bg-white p-4 shadow-card sm:p-6">
              <p className="text-xs text-cinza sm:text-sm">{c.rotulo}</p>
              <p className="font-serif text-2xl font-bold sm:text-4xl">{produtos.isPending ? '—' : c.valor}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-cinza" />
            <input
              type="search"
              placeholder="Buscar por nome, SKU ou categoria…"
              className={`${estiloCampo} pl-10`}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:flex">
            <select className={estiloCampo} value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} aria-label="Fornecedor">
              <option value="">Todos fornecedores</option>
              {FORNECEDORES.map((f) => (
                <option key={f.prefixo} value={f.prefixo}>{f.nome}</option>
              ))}
            </select>
            <select className={estiloCampo} value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Disponibilidade">
              <option value="">Todos</option>
              <option value="sim">Aparecendo no site</option>
              <option value="nao">Ocultos no painel</option>
              <option value="esgotado">Esgotados no distribuidor{esgotados ? ` (${esgotados})` : ''}</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ouro flex-1 py-2.5 lg:flex-none" onClick={() => setEditando(null)}>
              <Plus className="size-4" /> Novo produto
            </button>
            <button type="button" className="btn-contorno py-2.5" onClick={() => setImportando(true)}>
              <FileSpreadsheet className="size-4" /> Importar
            </button>
            <button type="button" className="btn-contorno py-2.5" onClick={() => exportarCsv(filtrados)} disabled={!filtrados.length}>
              <Download className="size-4" /> Exportar
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-card">
          {produtos.isPending ? (
            <div className="grid place-items-center p-16"><LoaderCircle className="size-8 animate-spin text-ouro" /></div>
          ) : produtos.isError ? (
            <p className="p-8 text-center text-red-700">{produtos.error.message}</p>
          ) : filtrados.length === 0 ? (
            <p className="p-12 text-center text-cinza">Nenhum produto encontrado.</p>
          ) : (
            <ul className="divide-y divide-marinho/5">
              {filtrados.slice(0, limite).map((p) => (
                <li key={p.id} className={`flex flex-wrap items-center gap-x-4 gap-y-3 p-4 transition ${noSite(p) ? '' : 'bg-creme/60'}`}>
                  <ProdutoImagem src={p.foto} alt="" grupo={p.grupo} className="size-14 shrink-0 rounded-xl" sizes="56px" />
                  <div className="min-w-0 flex-1 basis-48">
                    <p className={`truncate font-semibold ${noSite(p) ? '' : 'text-cinza line-through decoration-cinza/40'}`}>{p.nome}</p>
                    <p className="truncate text-xs text-cinza">
                      <span className="font-mono text-marinho">{p.sku}</span> · {p.categoria}
                      {p.subcategoria && ` / ${p.subcategoria}`} · {nomeFornecedor(p.fornecedor)}
                      {p.origemCodigo && ` · cód. fornecedor ${p.origemCodigo}`}
                    </p>
                    {p.estoqueOrigem === false && (
                      <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        <PackageX className="size-3" /> Esgotado no distribuidor — volta sozinho quando repor
                      </p>
                    )}
                  </div>
                  <p className="w-28 text-right font-serif font-bold text-ouro-escuro">{formatarPreco(p.preco)}</p>
                  <label className="flex cursor-pointer items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      role="switch"
                      className="peer sr-only"
                      checked={p.disponivel}
                      onChange={() => alternar.mutate(p)}
                    />
                    <span className="relative h-6 w-11 rounded-full bg-marinho/20 transition peer-checked:bg-green-600 peer-focus-visible:ring-2 peer-focus-visible:ring-ouro after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
                    <span className="w-16">{p.disponivel ? 'No site' : 'Oculto'}</span>
                  </label>
                  <div className="flex gap-1">
                    {p.origemUrl && (
                      <a href={p.origemUrl} target="_blank" rel="noopener noreferrer" className="grid size-9 place-items-center rounded-full text-cinza hover:bg-creme hover:text-marinho" aria-label={`Ver ${p.nome} no site do distribuidor`} title="Ver no site do distribuidor">
                        <Store className="size-4" />
                      </a>
                    )}
                    {noSite(p) && (
                      <Link to={`/produto/${p.slug}`} target="_blank" className="grid size-9 place-items-center rounded-full text-cinza hover:bg-creme hover:text-marinho" aria-label={`Ver ${p.nome} no site`}>
                        <ExternalLink className="size-4" />
                      </Link>
                    )}
                    <button type="button" onClick={() => setEditando(p)} className="grid size-9 place-items-center rounded-full text-cinza hover:bg-creme hover:text-marinho" aria-label={`Editar ${p.nome}`}>
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const aviso = p.origem
                          ? '\n\nEste produto veio do site do distribuidor e NÃO será importado de novo nas próximas sincronizações.'
                          : ''
                        if (confirm(`Excluir "${p.nome}" definitivamente?${aviso}\n\nDica: para esconder temporariamente, use o botão "No site/Oculto".`)) remover.mutate(p)
                      }}
                      className="grid size-9 place-items-center rounded-full text-cinza hover:bg-red-50 hover:text-red-700"
                      aria-label={`Excluir ${p.nome}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {filtrados.length > limite && (
          <div className="mt-6 text-center">
            <button type="button" className="btn-contorno" onClick={() => setLimite((l) => l + POR_VEZ)}>
              Mostrar mais ({filtrados.length - limite} restantes)
            </button>
          </div>
        )}
      </main>

      {editando !== undefined && (
        <ProdutoForm
          key={editando?.id ?? 'novo'}
          produto={editando}
          aoFechar={() => setEditando(undefined)}
          aoSalvar={salvar.mutateAsync}
        />
      )}
      {importando && (
        <Importar
          aoFechar={() => setImportando(false)}
          aoImportar={async (linhas) => {
            const r = await adminApi.importar(linhas)
            atualizarCaches()
            return r
          }}
        />
      )}
    </>
  )
}
