import type { ProdutoAdmin, ProdutoEntrada, RelatorioImportacao } from '../../../shared/catalogo'
import { ErroApi, requisitar } from '../../lib/api'

const CHAVE = 'bp-admin-token'
export const EVENTO_SESSAO = 'bp-admin-sessao'

export const sessao = {
  get: () => sessionStorage.getItem(CHAVE),
  set: (token: string) => {
    sessionStorage.setItem(CHAVE, token)
    window.dispatchEvent(new Event(EVENTO_SESSAO))
  },
  limpar: () => {
    sessionStorage.removeItem(CHAVE)
    window.dispatchEvent(new Event(EVENTO_SESSAO))
  },
}

async function adminFetch<T>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...resto } = init
  const headers = new Headers(resto.headers)
  headers.set('Authorization', `Bearer ${sessao.get() ?? ''}`)
  if (json !== undefined) headers.set('Content-Type', 'application/json')
  try {
    return await requisitar<T>(url, { ...resto, headers, body: json !== undefined ? JSON.stringify(json) : resto.body })
  } catch (e) {
    if (e instanceof ErroApi && e.status === 401) sessao.limpar()
    throw e
  }
}

export const adminApi = {
  login: (senha: string) =>
    requisitar<{ token: string }>('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha }),
    }),
  listar: () => adminFetch<ProdutoAdmin[]>('/api/admin/produtos'),
  criar: (p: ProdutoEntrada) => adminFetch<ProdutoAdmin>('/api/admin/produtos', { method: 'POST', json: p }),
  atualizar: (id: number, p: ProdutoEntrada) =>
    adminFetch<ProdutoAdmin>(`/api/admin/produtos/${id}`, { method: 'PUT', json: p }),
  disponivel: (id: number, disponivel: boolean) =>
    adminFetch<ProdutoAdmin>(`/api/admin/produtos/${id}/disponivel`, { method: 'PATCH', json: { disponivel } }),
  remover: (id: number) => adminFetch<void>(`/api/admin/produtos/${id}`, { method: 'DELETE' }),
  importar: (linhas: ProdutoEntrada[]) =>
    adminFetch<RelatorioImportacao>('/api/admin/importar', { method: 'POST', json: { linhas } }),
  upload: (dados: FormData) => adminFetch<{ url: string }>('/api/admin/upload', { method: 'POST', body: dados }),
}
