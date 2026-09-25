import Fastify from 'fastify'
import compress from '@fastify/compress'
import fastifyStatic from '@fastify/static'
import multipart from '@fastify/multipart'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { existsSync } from 'node:fs'
import { unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { UPLOAD_DIR } from './db.ts'
import * as produtos from './produtos.ts'
import { semearSeVazio } from './seed.ts'
import type { ProdutoEntrada } from '../shared/catalogo.ts'

// `--port` tem prioridade sobre PORT (no dev o PORT do ambiente pode ser o do Vite).
const { values: args } = parseArgs({ options: { port: { type: 'string' } }, strict: false })
const PORT = Number(args.port ?? process.env.PORT ?? 3001)
const HOST = process.env.HOST ?? '::' // IPv6 + IPv4 (dual-stack)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'boaparte'
const SESSION_SECRET = process.env.SESSION_SECRET ?? `sessao:${ADMIN_PASSWORD}`
const DIST = path.resolve('dist')

const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' }, bodyLimit: 5 * 1024 * 1024 })

if (!process.env.ADMIN_PASSWORD) {
  app.log.warn('ADMIN_PASSWORD não definida — usando senha padrão "boaparte". Defina antes de publicar!')
}

await app.register(compress, { global: true, threshold: 1024 })
await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024, files: 2 } })

semearSeVazio()

app.setErrorHandler((err, _req, reply) => {
  if (err instanceof produtos.ErroValidacao) return reply.code(400).send({ erro: err.message })
  const status = (err as { statusCode?: number }).statusCode ?? 500
  if (status >= 500) app.log.error(err)
  return reply.code(status).send({ erro: status >= 500 ? 'Erro interno' : (err as Error).message })
})

// ---------------- API pública ----------------

const cachePublico = (reply: FastifyReply) => reply.header('Cache-Control', 'public, max-age=30, stale-while-revalidate=300')

app.get('/api/produtos', async (req, reply) => {
  const q = req.query as Record<string, string | undefined>
  const cursor = q.cursor ? Number(q.cursor) : undefined
  const limite = Math.min(Math.max(Number(q.limit) || 24, 1), 60)
  cachePublico(reply)
  return produtos.listarPublico({
    q: q.q?.slice(0, 100),
    grupo: q.grupo || undefined,
    categoria: q.categoria || undefined,
    cursor: Number.isInteger(cursor) ? cursor : undefined,
    limite,
  })
})

app.get('/api/produtos/:slug', async (req, reply) => {
  const { slug } = req.params as { slug: string }
  const p = produtos.buscarPorSlug(slug)
  if (!p) return reply.code(404).send({ erro: 'Produto não encontrado' })
  cachePublico(reply)
  return p
})

app.get('/api/categorias', async (_req, reply) => {
  cachePublico(reply)
  return produtos.contarCategorias()
})

// ---------------- Autenticação admin ----------------

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000
const assinar = (dado: string) => createHmac('sha256', SESSION_SECRET).update(dado).digest('base64url')

function iguais(a: string, b: string) {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

function tokenValido(token: string | undefined): boolean {
  if (!token) return false
  const [exp, assinatura] = token.split('.')
  if (!exp || !assinatura || Number(exp) < Date.now()) return false
  return iguais(assinatura, assinar(exp))
}

const tentativas = new Map<string, { n: number; ate: number }>()

app.post('/api/admin/login', async (req, reply) => {
  const agora = Date.now()
  const t = tentativas.get(req.ip)
  if (t && t.ate > agora && t.n >= 10) {
    return reply.code(429).send({ erro: 'Muitas tentativas. Aguarde alguns minutos.' })
  }
  const { senha } = (req.body ?? {}) as { senha?: string }
  if (typeof senha !== 'string' || !iguais(senha, ADMIN_PASSWORD)) {
    tentativas.set(req.ip, { n: (t && t.ate > agora ? t.n : 0) + 1, ate: agora + 15 * 60 * 1000 })
    return reply.code(401).send({ erro: 'Senha incorreta' })
  }
  tentativas.delete(req.ip)
  const exp = String(agora + TOKEN_TTL_MS)
  return { token: `${exp}.${assinar(exp)}` }
})

async function exigirAdmin(req: FastifyRequest, reply: FastifyReply) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!tokenValido(token)) return reply.code(401).send({ erro: 'Sessão expirada. Entre novamente.' })
}

/** Apaga do disco os arquivos enviados pelo painel (fotos externas por URL são ignoradas). */
async function apagarFotos(fotos: string[]) {
  const arquivos = fotos.flatMap((foto) => {
    const m = foto.match(/^\/uploads\/([\w-]+)\.(webp|jpg|png)$/)
    return m ? [`${m[1]}.${m[2]}`, `${m[1]}-sm.${m[2]}`] : []
  })
  await Promise.allSettled(arquivos.map((a) => unlink(path.join(UPLOAD_DIR, a))))
}

// ---------------- API admin ----------------

await app.register(async (admin) => {
  admin.addHook('onRequest', exigirAdmin)
  admin.addHook('onSend', async (_req, reply) => {
    reply.header('Cache-Control', 'no-store')
  })

  admin.get('/api/admin/produtos', async () => produtos.listarAdmin())

  admin.post('/api/admin/produtos', async (req, reply) => {
    reply.code(201)
    return produtos.criar(req.body as ProdutoEntrada)
  })

  admin.put('/api/admin/produtos/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id)
    const antes = produtos.listarAdmin().find((p) => p.id === id)
    const p = produtos.atualizar(id, req.body as ProdutoEntrada)
    if (!p) return reply.code(404).send({ erro: 'Produto não encontrado' })
    if (antes) {
      const atuais = new Set(produtos.fotosDe(p))
      await apagarFotos(produtos.fotosDe(antes).filter((f) => !atuais.has(f)))
    }
    return p
  })

  admin.patch('/api/admin/produtos/:id/disponivel', async (req, reply) => {
    const id = Number((req.params as { id: string }).id)
    const { disponivel } = req.body as { disponivel: boolean }
    const p = produtos.definirDisponivel(id, Boolean(disponivel))
    if (!p) return reply.code(404).send({ erro: 'Produto não encontrado' })
    return p
  })

  admin.delete('/api/admin/produtos/:id', async (req, reply) => {
    const fotos = produtos.remover(Number((req.params as { id: string }).id))
    if (fotos === null) return reply.code(404).send({ erro: 'Produto não encontrado' })
    await apagarFotos(fotos)
    return reply.code(204).send()
  })

  admin.post('/api/admin/importar', async (req) => {
    const { linhas } = req.body as { linhas: ProdutoEntrada[] }
    if (!Array.isArray(linhas)) throw new produtos.ErroValidacao('Envie { linhas: [...] }')
    if (linhas.length > 5000) throw new produtos.ErroValidacao('Máximo de 5000 linhas por importação')
    return produtos.importar(linhas)
  })

  // Recebe a foto já redimensionada no navegador: campo "full" (1200px) e "thumb" (480px).
  admin.post('/api/admin/upload', async (req, reply) => {
    const tipos: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' }
    const id = randomUUID()
    let url = ''
    for await (const parte of req.files()) {
      const ext = tipos[parte.mimetype]
      if (!ext || (parte.fieldname !== 'full' && parte.fieldname !== 'thumb')) {
        return reply.code(400).send({ erro: 'Envie uma imagem JPG, PNG ou WEBP' })
      }
      const nome = parte.fieldname === 'thumb' ? `${id}-sm.${ext}` : `${id}.${ext}`
      await writeFile(path.join(UPLOAD_DIR, nome), await parte.toBuffer())
      if (parte.fieldname === 'full') url = `/uploads/${nome}`
    }
    if (!url) return reply.code(400).send({ erro: 'Nenhuma imagem recebida' })
    return { url }
  })
})

// ---------------- Arquivos estáticos ----------------

await app.register(fastifyStatic, {
  root: UPLOAD_DIR,
  prefix: '/uploads/',
  decorateReply: false,
  immutable: true,
  maxAge: '365d',
})

if (existsSync(DIST)) {
  await app.register(fastifyStatic, {
    root: DIST,
    wildcard: false,
    setHeaders(res, caminho) {
      // Arquivos com hash no nome: cache eterno. index.html: sempre revalidar (senão aponta para assets velhos).
      const cache = caminho.includes(`${path.sep}assets${path.sep}`)
        ? 'public, max-age=31536000, immutable'
        : caminho.endsWith('.html')
          ? 'no-cache'
          : 'public, max-age=86400'
      res.header('Cache-Control', cache)
    },
  })
  // SPA: qualquer rota que não seja API/arquivo devolve o index.html
  app.setNotFoundHandler((req, reply) => {
    if (req.method !== 'GET' || req.url.startsWith('/api/') || req.url.startsWith('/uploads/')) {
      return reply.code(404).send({ erro: 'Não encontrado' })
    }
    return reply.sendFile('index.html')
  })
}

await app.listen({ port: PORT, host: HOST })
