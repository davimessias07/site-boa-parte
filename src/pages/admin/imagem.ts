import { adminApi } from './adminApi'

/** Redimensiona no navegador e converte para WEBP (JPEG se o navegador não suportar). */
async function redimensionar(arquivo: File, max: number): Promise<Blob> {
  const bmp = await createImageBitmap(arquivo)
  const escala = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * escala)
  canvas.height = Math.round(bmp.height * escala)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff' // fundo branco para PNGs transparentes
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()

  const gerar = (tipo: string, qualidade: number) =>
    new Promise<Blob | null>((ok) => canvas.toBlob(ok, tipo, qualidade))
  const webp = await gerar('image/webp', 0.82)
  if (webp?.type === 'image/webp') return webp
  const jpeg = await gerar('image/jpeg', 0.85)
  if (!jpeg) throw new Error('Não foi possível processar a imagem')
  return jpeg
}

export async function enviarFoto(arquivo: File): Promise<string> {
  if (!arquivo.type.startsWith('image/')) throw new Error('Selecione um arquivo de imagem')
  const [full, thumb] = await Promise.all([redimensionar(arquivo, 1200), redimensionar(arquivo, 480)])
  const ext = full.type === 'image/webp' ? 'webp' : 'jpg'
  const dados = new FormData()
  dados.append('full', full, `foto.${ext}`)
  dados.append('thumb', thumb, `foto-sm.${ext}`)
  return (await adminApi.upload(dados)).url
}
