import { LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  FORNECEDORES,
  GRUPOS,
  encontrarCategoria,
  mensagemWhatsApp,
  parsePreco,
  type ProdutoAdmin,
  type ProdutoEntrada,
} from '../../../shared/catalogo'
import { precoParaCampo } from '../../lib/formato'
import { Campo, Dialogo, estiloCampo } from './Dialogo'
import { FotosCampo } from './FotosCampo'

type Props = {
  produto: ProdutoAdmin | null
  aoFechar: () => void
  aoSalvar: (dados: ProdutoEntrada) => Promise<unknown>
}

export function ProdutoForm({ produto, aoFechar, aoSalvar }: Props) {
  const [f, setF] = useState({
    nome: produto?.nome ?? '',
    categoria: produto?.categoria ?? '',
    subcategoria: produto?.subcategoria ?? '',
    fornecedor: produto?.fornecedor ?? '',
    sku: produto?.sku ?? '',
    preco: produto ? precoParaCampo(produto.preco) : '',
    fotos: produto ? [produto.foto, ...produto.fotos].filter(Boolean) : [],
    descricao: produto?.descricao ?? '',
    disponivel: produto?.disponivel ?? true,
  })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [enviandoFoto, setEnviandoFoto] = useState(false)

  const alterar = <K extends keyof typeof f>(campo: K, valor: (typeof f)[K]) => setF((a) => ({ ...a, [campo]: valor }))

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (parsePreco(f.preco) === null) return setErro('Preço inválido. Use o formato 1.299,90')
    setErro('')
    setSalvando(true)
    try {
      const [foto = '', ...extras] = f.fotos
      await aoSalvar({ ...f, sku: f.sku.trim() || undefined, foto, fotos: extras })
      aoFechar()
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  const grupo = encontrarCategoria(f.categoria)?.grupo.slug ?? 'variedades'

  return (
    <Dialogo titulo={produto ? 'Editar produto' : 'Novo produto'} aoFechar={aoFechar}>
      <form onSubmit={enviar} className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Campo rotulo="Nome *">
            <input required maxLength={200} className={estiloCampo} value={f.nome} onChange={(e) => alterar('nome', e.target.value)} />
          </Campo>
        </div>

        <Campo rotulo="Categoria *">
          <select required className={estiloCampo} value={f.categoria} onChange={(e) => alterar('categoria', e.target.value)}>
            <option value="" disabled>Selecione…</option>
            {GRUPOS.map((g) => (
              <optgroup key={g.slug} label={g.nome}>
                {g.categorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </Campo>

        <Campo rotulo="Subcategoria" dica="Ex: 2 portas, Casal, 5 bocas">
          <input className={estiloCampo} value={f.subcategoria} onChange={(e) => alterar('subcategoria', e.target.value)} />
        </Campo>

        <Campo rotulo="Fornecedor *" dica="Interno — o cliente não vê.">
          <select required className={estiloCampo} value={f.fornecedor} onChange={(e) => alterar('fornecedor', e.target.value)}>
            <option value="" disabled>Selecione…</option>
            {FORNECEDORES.map((x) => (
              <option key={x.prefixo} value={x.prefixo}>{x.nome} ({x.prefixo})</option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="SKU" dica="Deixe em branco para gerar automaticamente.">
          <input
            className={`${estiloCampo} font-mono uppercase`}
            placeholder={f.fornecedor ? `${f.fornecedor}-0000` : 'PRE-0000'}
            value={f.sku}
            onChange={(e) => alterar('sku', e.target.value.toUpperCase())}
          />
        </Campo>

        <Campo rotulo="Preço de venda *">
          <div className="relative">
            <span className="absolute top-1/2 left-4 -translate-y-1/2 text-sm text-cinza">R$</span>
            <input
              required
              inputMode="decimal"
              placeholder="1.299,90"
              className={`${estiloCampo} pl-11`}
              value={f.preco}
              onChange={(e) => alterar('preco', e.target.value)}
            />
          </div>
        </Campo>

        <div className="flex items-end">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-marinho/15 bg-white px-4 py-2.5">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-ouro-escuro"
              checked={f.disponivel}
              onChange={(e) => alterar('disponivel', e.target.checked)}
            />
            <span className="text-sm">
              <span className="font-semibold">Disponível</span>
              <span className="block text-xs text-cinza">Indisponível = some do site</span>
            </span>
          </label>
        </div>

        <div className="sm:col-span-2">
          <FotosCampo
            fotos={f.fotos}
            aoMudar={(atualizar) => setF((a) => ({ ...a, fotos: atualizar(a.fotos) }))}
            grupo={grupo}
            aoErro={setErro}
            aoEnviar={setEnviandoFoto}
          />
        </div>

        <div className="sm:col-span-2">
          <Campo rotulo="Descrição">
            <textarea
              rows={4}
              className={estiloCampo}
              value={f.descricao}
              onChange={(e) => alterar('descricao', e.target.value)}
            />
          </Campo>
        </div>

        {f.nome && (f.sku || produto) && (
          <p className="rounded-xl bg-whatsapp/10 p-4 text-xs text-marinho/80 sm:col-span-2">
            <strong className="mb-1 block text-marinho">Mensagem do botão Comprar:</strong>
            {mensagemWhatsApp({ nome: f.nome, sku: f.sku || produto!.sku })}
          </p>
        )}

        {erro && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">
            {erro}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-marinho/10 pt-5 sm:col-span-2">
          <button type="button" className="btn-contorno" onClick={aoFechar}>
            Cancelar
          </button>
          <button type="submit" className="btn-ouro" disabled={salvando || enviandoFoto}>
            {salvando && <LoaderCircle className="size-4 animate-spin" />}
            {produto ? 'Salvar alterações' : 'Cadastrar produto'}
          </button>
        </div>
      </form>
    </Dialogo>
  )
}
