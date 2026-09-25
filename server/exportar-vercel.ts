// Gera a versão estática do site (vitrine) na pasta `publicar/`, pronta para a Vercel.
//
//   npm run exportar:vercel
//
// Conteúdo gerado:
//   publicar/index.html, assets/   site compilado em modo estático (VITE_ESTATICO=true, sem /admin)
//   publicar/dados/catalogo.json   produtos visíveis (sem descrição), mais novos primeiro
//   publicar/dados/descricoes/N.json  descrições divididas em partes (carregadas ao abrir o produto)
//   publicar/uploads/              só as fotos usadas pelos produtos visíveis (grande + miniatura)
//
// Fluxo de atualização: sincronizar/editar no painel local → exportar → commit + push → a Vercel publica.
import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { UPLOAD_DIR } from './db.ts'
import { listarVisiveis } from './produtos.ts'

const PARTES_DESCRICAO = 64 // mesmo valor de src/lib/api.ts
const SAIDA = path.resolve('publicar')
const inicio = Date.now()
const log = (msg: string) => console.log(`[exportar] ${msg}`)

// 1. Site compilado em modo estático (esvazia a pasta antes; o Vite preserva .git se existir).
log('compilando o site em modo estático…')
execSync(`npx vite build --outDir "${SAIDA}" --emptyOutDir`, {
  stdio: 'inherit',
  env: { ...process.env, VITE_ESTATICO: 'true' },
})

// 2. Dados.
const produtos = listarVisiveis()
if (!produtos.length) throw new Error('Nenhum produto visível no banco — nada para publicar.')

mkdirSync(path.join(SAIDA, 'dados', 'descricoes'), { recursive: true })
writeFileSync(
  path.join(SAIDA, 'dados', 'catalogo.json'),
  JSON.stringify(produtos.map((p) => ({ ...p, descricao: '' }))),
)
const partes: Record<string, string>[] = Array.from({ length: PARTES_DESCRICAO }, () => ({}))
for (const p of produtos) if (p.descricao) partes[p.id % PARTES_DESCRICAO][p.id] = p.descricao
partes.forEach((parte, i) => writeFileSync(path.join(SAIDA, 'dados', 'descricoes', `${i}.json`), JSON.stringify(parte)))
log(`${produtos.length} produtos exportados`)

// 3. Fotos usadas (grande + miniatura "-sm").
mkdirSync(path.join(SAIDA, 'uploads'), { recursive: true })
let copiadas = 0
let faltando = 0
const usadas = new Set(produtos.flatMap((p) => [p.foto, ...p.fotos]).filter((f) => f.startsWith('/uploads/')))
for (const foto of usadas) {
  const nome = path.basename(foto)
  for (const arquivo of [nome, nome.replace(/(\.\w+)$/, '-sm$1')]) {
    const origem = path.join(UPLOAD_DIR, arquivo)
    if (existsSync(origem)) {
      copyFileSync(origem, path.join(SAIDA, 'uploads', arquivo))
      copiadas++
    } else {
      faltando++
    }
  }
}
log(`${copiadas} arquivos de foto copiados${faltando ? ` (${faltando} não encontrados)` : ''}`)

writeFileSync(
  path.join(SAIDA, 'LEIA-ME.txt'),
  [
    'Pasta gerada automaticamente por "npm run exportar:vercel" — não edite à mão.',
    `Gerada em ${new Date().toLocaleString('pt-BR')} com ${produtos.length} produtos.`,
    'A Vercel publica esta pasta (ver vercel.json na raiz do projeto).',
    '',
  ].join('\n'),
)
log(`pronto em ${Math.round((Date.now() - inicio) / 1000)}s → ${SAIDA}`)
