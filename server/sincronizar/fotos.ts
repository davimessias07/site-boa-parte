// Baixa as fotos dos distribuidores e grava no padrão do site: WEBP 1200 px + miniatura "-sm" 480 px.
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { UPLOAD_DIR } from '../db.ts'
import { buscar } from './util.ts'

/**
 * @param alternativas URLs da mesma foto em ordem de preferência (original primeiro)
 * @returns "/uploads/o-<hash>.webp" — nome estável pela URL, então rodar de novo não baixa outra vez
 */
export async function importarFoto(alternativas: string[]): Promise<string | null> {
  const nome = `o-${createHash('sha1').update(alternativas[0]).digest('hex').slice(0, 20)}`
  const destino = path.join(UPLOAD_DIR, `${nome}.webp`)
  if (existsSync(destino)) return `/uploads/${nome}.webp`

  for (const url of alternativas) {
    try {
      const bytes = Buffer.from(await (await buscar(url, 2)).arrayBuffer())
      const img = sharp(bytes, { failOn: 'none' }).rotate() // respeita orientação EXIF (fotos de celular)
      const [grande, pequena] = await Promise.all([
        img.clone().resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
        img.clone().resize(480, 480, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 75 }).toBuffer(),
      ])
      // Miniatura primeiro: se o processo cair no meio, a grande (que marca "pronto") não existe.
      await writeFile(path.join(UPLOAD_DIR, `${nome}-sm.webp`), pequena)
      await writeFile(destino, grande)
      return `/uploads/${nome}.webp`
    } catch {
      // tenta a próxima alternativa (ex.: versão em cache do site)
    }
  }
  return null
}
