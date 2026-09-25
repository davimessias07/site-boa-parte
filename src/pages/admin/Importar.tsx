import { CircleCheck, Download, FileSpreadsheet, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import type { ProdutoEntrada, RelatorioImportacao } from '../../../shared/catalogo'
import { Dialogo } from './Dialogo'
import { baixarModelo, lerPlanilha } from './planilha'

type Props = {
  aoFechar: () => void
  aoImportar: (linhas: ProdutoEntrada[]) => Promise<RelatorioImportacao>
}

export function Importar({ aoFechar, aoImportar }: Props) {
  const [linhas, setLinhas] = useState<ProdutoEntrada[] | null>(null)
  const [arquivo, setArquivo] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [relatorio, setRelatorio] = useState<RelatorioImportacao | null>(null)

  async function escolher(f: File | undefined) {
    if (!f) return
    setErro('')
    setRelatorio(null)
    setArquivo(f.name)
    try {
      const l = await lerPlanilha(f)
      if (!l.length) throw new Error('A planilha não tem linhas de produto.')
      setLinhas(l)
    } catch (e) {
      setLinhas(null)
      setErro((e as Error).message)
    }
  }

  async function importar() {
    if (!linhas) return
    setEnviando(true)
    setErro('')
    try {
      setRelatorio(await aoImportar(linhas))
      setLinhas(null)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialogo titulo="Importar planilha" aoFechar={aoFechar} largura="max-w-3xl">
      <div className="space-y-5 text-sm">
        <div className="rounded-2xl bg-white p-5">
          <p className="font-semibold">Como funciona</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-cinza">
            <li>Aceita <strong>.csv</strong> (vírgula ou ponto e vírgula) e <strong>.xlsx</strong> (Excel).</li>
            <li>
              Colunas: SKU, Nome, Categoria, Subcategoria, Fornecedor, Preço, Foto (capa), Foto 2, Foto 3, Foto 4, Disponível, Descrição.
            </li>
            <li>SKU já cadastrado → <strong>atualiza</strong> o produto. SKU vazio ou novo → <strong>cria</strong>.</li>
            <li>Na atualização, células em branco mantêm o valor atual.</li>
            <li>Disponível: “sim”/“não”. Se “não”, o produto some do site.</li>
          </ul>
          <button type="button" onClick={baixarModelo} className="mt-3 inline-flex items-center gap-2 font-semibold text-ouro-escuro hover:underline">
            <Download className="size-4" /> Baixar planilha modelo
          </button>
        </div>

        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-marinho/20 bg-white/60 p-8 text-center transition hover:border-ouro">
          <FileSpreadsheet className="size-10 text-ouro-escuro" strokeWidth={1.5} />
          <span className="font-semibold">{arquivo || 'Clique para escolher o arquivo'}</span>
          <span className="text-xs text-cinza">.csv ou .xlsx</span>
          <input type="file" accept=".csv,.txt,.xlsx" className="sr-only" onChange={(e) => void escolher(e.target.files?.[0])} />
        </label>

        {linhas && (
          <div className="rounded-2xl bg-white p-5">
            <p className="font-semibold">{linhas.length} linha(s) encontrada(s). Prévia:</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-cinza">
                  <tr>
                    <th className="py-1 pr-3">SKU</th>
                    <th className="py-1 pr-3">Nome</th>
                    <th className="py-1 pr-3">Categoria</th>
                    <th className="py-1 pr-3">Preço</th>
                    <th className="py-1">Disp.</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.slice(0, 5).map((l, i) => (
                    <tr key={i} className="border-t border-marinho/5">
                      <td className="py-1.5 pr-3 font-mono">{l.sku || '—'}</td>
                      <td className="py-1.5 pr-3">{l.nome}</td>
                      <td className="py-1.5 pr-3">{l.categoria}</td>
                      <td className="py-1.5 pr-3">{String(l.preco ?? '')}</td>
                      <td className="py-1.5">{String(l.disponivel ?? 'sim')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => void importar()} disabled={enviando} className="btn-ouro mt-5 w-full">
              {enviando && <LoaderCircle className="size-4 animate-spin" />}
              Importar {linhas.length} produto(s)
            </button>
          </div>
        )}

        {relatorio && (
          <div className="rounded-2xl bg-white p-5">
            <p className="flex items-center gap-2 font-semibold text-green-700">
              <CircleCheck className="size-5" />
              {relatorio.inseridos} criado(s) · {relatorio.atualizados} atualizado(s)
            </p>
            {relatorio.erros.length > 0 && (
              <div className="mt-4">
                <p className="flex items-center gap-2 font-semibold text-amber-700">
                  <TriangleAlert className="size-5" /> {relatorio.erros.length} linha(s) com erro (não importadas):
                </p>
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">
                  {relatorio.erros.map((e) => (
                    <li key={e.linha}>
                      <strong>Linha {e.linha}:</strong> {e.mensagem}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {erro && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">
            {erro}
          </p>
        )}
      </div>
    </Dialogo>
  )
}
