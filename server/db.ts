import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

export const DATA_DIR = path.resolve(process.env.DATA_DIR ?? 'data')
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')
mkdirSync(UPLOAD_DIR, { recursive: true })

export const db = new DatabaseSync(path.join(DATA_DIR, 'boaparte.db'))

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA busy_timeout = 10000; -- API e sincronização podem gravar ao mesmo tempo

  CREATE TABLE IF NOT EXISTS produtos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    sku            TEXT    NOT NULL UNIQUE,
    nome           TEXT    NOT NULL,
    slug           TEXT    NOT NULL UNIQUE,
    descricao      TEXT    NOT NULL DEFAULT '',
    grupo          TEXT    NOT NULL,
    categoria      TEXT    NOT NULL,
    categoria_slug TEXT    NOT NULL,
    subcategoria   TEXT    NOT NULL DEFAULT '',
    fornecedor     TEXT    NOT NULL,
    preco_centavos INTEGER NOT NULL,
    foto           TEXT    NOT NULL DEFAULT '',
    disponivel     INTEGER NOT NULL DEFAULT 1,
    busca          TEXT    NOT NULL,
    criado_em      TEXT    NOT NULL DEFAULT (datetime('now')),
    atualizado_em  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_produtos_disp_id    ON produtos (disponivel, id DESC);
  CREATE INDEX IF NOT EXISTS idx_produtos_grupo      ON produtos (grupo, disponivel, id DESC);
  CREATE INDEX IF NOT EXISTS idx_produtos_categoria  ON produtos (categoria_slug, disponivel, id DESC);
`)

// Migrações simples: adiciona colunas novas em bancos já existentes.
const colunas = (db.prepare('PRAGMA table_info(produtos)').all() as { name: string }[]).map((c) => c.name)
if (!colunas.includes('fotos_extras')) {
  // JSON com até 3 URLs além da capa (coluna `foto`).
  db.exec(`ALTER TABLE produtos ADD COLUMN fotos_extras TEXT NOT NULL DEFAULT '[]'`)
}
if (!colunas.includes('origem')) {
  // Produtos sincronizados dos sites dos distribuidores:
  //  origem         "PRE:39892" (prefixo do fornecedor + id no site dele)
  //  origem_url     página do produto no site do fornecedor
  //  origem_codigo  código/modelo que o fornecedor usa (quando existe)
  //  estoque_origem 1/0 conforme o site do fornecedor; NULL = cadastro manual
  // `disponivel` continua sendo o controle manual do painel; o site só mostra
  // o produto se os dois permitirem (ver VISIVEL em produtos.ts).
  db.exec(`
    ALTER TABLE produtos ADD COLUMN origem TEXT;
    ALTER TABLE produtos ADD COLUMN origem_url TEXT NOT NULL DEFAULT '';
    ALTER TABLE produtos ADD COLUMN origem_codigo TEXT NOT NULL DEFAULT '';
    ALTER TABLE produtos ADD COLUMN estoque_origem INTEGER;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_produtos_origem ON produtos (origem) WHERE origem IS NOT NULL;
  `)
}

// Produtos de distribuidor excluídos no painel: a sincronização não os recria.
db.exec(`CREATE TABLE IF NOT EXISTS origens_ignoradas (origem TEXT PRIMARY KEY, em TEXT NOT NULL DEFAULT (datetime('now')))`)

export function transacao<T>(fn: () => T): T {
  db.exec('BEGIN')
  try {
    const r = fn()
    db.exec('COMMIT')
    return r
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}
