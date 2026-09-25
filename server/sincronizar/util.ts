// Utilitários da sincronização: HTTP resiliente, limite de concorrência e limpeza de HTML.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36 BoaParteCatalogo/1.0'

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

export class ErroHttp extends Error {
  status: number
  constructor(status: number, url: string) {
    super(`HTTP ${status} em ${url}`)
    this.status = status
  }
}

/** GET com timeout e novas tentativas (erros de rede e 5xx/429). 404 não é repetido. */
export async function buscar(url: string, tentativas = 3): Promise<Response> {
  let ultimo: unknown
  for (let i = 0; i < tentativas; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9' },
        signal: AbortSignal.timeout(45_000),
        redirect: 'follow',
      })
      if (res.ok) return res
      if (res.status < 500 && res.status !== 429) throw new ErroHttp(res.status, url)
      ultimo = new ErroHttp(res.status, url)
    } catch (e) {
      if (e instanceof ErroHttp && e.status < 500 && e.status !== 429) throw e
      ultimo = e
    }
    await espera(1500 * (i + 1))
  }
  throw ultimo
}

/** Baixa HTML/JSON respeitando o charset (os sites OpenCart às vezes servem ISO-8859-1). */
export async function buscarTexto(url: string): Promise<string> {
  const res = await buscar(url)
  const bytes = new Uint8Array(await res.arrayBuffer())
  let charset = /charset=([\w-]+)/i.exec(res.headers.get('content-type') ?? '')?.[1]
  if (!charset) {
    const cabeca = new TextDecoder('latin1').decode(bytes.slice(0, 4096))
    charset = /<meta[^>]+charset=["']?([\w-]+)/i.exec(cabeca)?.[1]
  }
  try {
    return new TextDecoder(charset ?? 'utf-8').decode(bytes)
  } catch {
    return new TextDecoder('utf-8').decode(bytes)
  }
}

export async function buscarJson<T>(url: string): Promise<{ dados: T; headers: Headers }> {
  const res = await buscar(url)
  return { dados: (await res.json()) as T, headers: res.headers }
}

/** Executa `fn` sobre os itens com no máximo `n` em paralelo, preservando a ordem. */
export async function mapaLimitado<T, R>(itens: T[], n: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const saida = new Array<R>(itens.length)
  let proximo = 0
  const trabalhador = async () => {
    while (proximo < itens.length) {
      const i = proximo++
      saida[i] = await fn(itens[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, itens.length) }, trabalhador))
  return saida
}

// ---------- HTML ----------

const ENTIDADES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…',
  ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', bull: '•', middot: '·', ordm: 'º', ordf: 'ª',
  deg: '°', reg: '®', copy: '©', trade: '™', times: '×', frac12: '½', laquo: '«', raquo: '»', sup2: '²', sup3: '³',
}
const ACENTOS: Record<string, string> = { acute: '́', grave: '̀', circ: '̂', tilde: '̃', uml: '̈', cedil: '̧' }

export function decodificarEntidades(s: string): string {
  return s.replace(/&(#x[\da-f]+|#\d+|[a-z]+\d*);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(cp) && cp > 0 ? String.fromCodePoint(cp) : m
    }
    if (ENTIDADES[e]) return ENTIDADES[e]
    const a = /^([a-z])(acute|grave|circ|tilde|uml|cedil)$/i.exec(e)
    return a ? (a[1] + ACENTOS[a[2]]).normalize('NFC') : m
  })
}

/** HTML → texto simples, preservando quebras de parágrafo. */
export function htmlParaTexto(html: string): string {
  return decodificarEntidades(
    html
      .replace(/<(script|style|video|iframe|noscript)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[ \t ]+/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/whats\s*app|wa\.me|\(\d{2}\)\s*\d{4,5}-?\d{4}/i.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 3000)
}

/** Conteúdo de um elemento a partir do índice da sua tag de abertura (conta aninhamento de <div>). */
export function blocoDiv(html: string, inicio: number): string {
  const abre = html.indexOf('>', inicio) + 1
  const re = /<\/?div\b[^>]*>/gi
  re.lastIndex = abre
  let nivel = 1
  for (let m = re.exec(html); m; m = re.exec(html)) {
    nivel += m[0][1] === '/' ? -1 : 1
    if (nivel === 0) return html.slice(abre, m.index)
  }
  return html.slice(abre, abre + 5000)
}

export function metaConteudo(html: string, propriedade: string): string {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${propriedade}["'][^>]*content=["']([^"']*)["']`, 'i')
  return decodificarEntidades(re.exec(html)?.[1] ?? '').trim()
}

// ---------- Texto ----------

const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'com', 'para', 'em', 'a', 'o', 'c/', 'p/', 'x', 'sem', 'na', 'no'])

/** "GUARDA ROUPA 6PT CASAL" → "Guarda Roupa 6PT Casal". Só mexe em nomes todo em maiúsculas. */
export function arrumarNome(nome: string): string {
  const limpo = decodificarEntidades(nome)
    .replace(/[\s\-–(]*image(?:m|ns) ilustrativas?\)?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (/[a-zà-ú]/.test(limpo)) return limpo
  return limpo
    .toLowerCase()
    .split(' ')
    .map((p, i) => {
      if (/\d/.test(p)) return p.toUpperCase()
      if (i > 0 && MINUSCULAS.has(p)) return p
      return p.replace(/(^|[-/(])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase())
    })
    .join(' ')
}

/** Reais "R$ 1.299,90" → centavos. */
export function precoEmCentavos(texto: string): number | null {
  const m = /(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})/.exec(texto)
  if (!m) return null
  return Number(m[1].replace(/\./g, '')) * 100 + Number(m[2])
}
