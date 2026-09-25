import { useEffect, useRef } from 'react'

/** Chama `aoAparecer` quando o elemento entra (ou chega perto) da área visível. */
export function useVisivel<T extends Element>(aoAparecer: () => void, ativo = true, margem = '800px') {
  const ref = useRef<T>(null)
  const callback = useRef(aoAparecer)

  useEffect(() => {
    callback.current = aoAparecer
  })

  useEffect(() => {
    const el = ref.current
    if (!el || !ativo) return
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas[0]?.isIntersecting) callback.current()
      },
      { rootMargin: `${margem} 0px` },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [ativo, margem])

  return ref
}
