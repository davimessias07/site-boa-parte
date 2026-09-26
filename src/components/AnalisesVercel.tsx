import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { useLocation, useMatches } from 'react-router'

/**
 * Vercel Web Analytics (visitas) + Speed Insights (desempenho real dos visitantes).
 * Cada navegação da SPA é registrada com a rota "agrupada" (ex.: /produto/[slug]) para o
 * painel somar todas as páginas de produto juntas.
 * Só entra no build estático publicado na Vercel (os scripts vêm de /_vercel/...).
 */
export function AnalisesVercel() {
  const { pathname } = useLocation()
  // O layout não enxerga os parâmetros da rota filha via useParams; a última rota casada sim.
  const params = useMatches().at(-1)?.params ?? {}
  let rota = pathname
  for (const [nome, valor] of Object.entries(params)) {
    if (valor) rota = rota.replace(`/${encodeURIComponent(valor)}`, `/[${nome}]`).replace(`/${valor}`, `/[${nome}]`)
  }
  return (
    <>
      <Analytics route={rota} path={pathname} />
      <SpeedInsights route={rota} />
    </>
  )
}
