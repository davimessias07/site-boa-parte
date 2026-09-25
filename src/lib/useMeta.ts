import { useEffect } from 'react'

const SUFIXO = 'Móveis Boa Parte'
const DESCRICAO_PADRAO =
  'Móveis e eletrodomésticos com qualidade, preço justo e atendimento de confiança. A escolha certa para o seu lar.'

/** Atualiza <title> e meta description da página atual. */
export function useMeta(titulo?: string, descricao?: string) {
  useEffect(() => {
    document.title = titulo ? `${titulo} | ${SUFIXO}` : `${SUFIXO} — A escolha certa para o seu lar`
    document.querySelector('meta[name="description"]')?.setAttribute('content', descricao || DESCRICAO_PADRAO)
  }, [titulo, descricao])
}
