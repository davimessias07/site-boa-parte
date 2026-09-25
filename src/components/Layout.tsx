import { Suspense } from 'react'
import { Outlet, ScrollRestoration } from 'react-router'
import { linkWhatsApp } from '../../shared/catalogo'
import { Footer } from './Footer'
import { Header } from './Header'
import { WhatsAppIcone } from './WhatsAppIcone'

export function Carregando() {
  return (
    <div className="grid min-h-[50vh] place-items-center" role="status" aria-label="Carregando">
      <div className="size-10 animate-spin rounded-full border-2 border-ouro/30 border-t-ouro" />
    </div>
  )
}

export function Layout() {
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-full bg-marinho px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo">
        <Suspense fallback={<Carregando />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <a
        href={linkWhatsApp('Olá! Vim pelo site da Móveis Boa Parte.')}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Conversar no WhatsApp"
        className="fixed right-4 bottom-4 z-40 grid size-14 place-items-center rounded-full bg-whatsapp text-white shadow-lg shadow-black/20 transition hover:scale-105 sm:right-6 sm:bottom-6"
      >
        <WhatsAppIcone className="size-7" />
      </a>
      <ScrollRestoration getKey={(loc) => loc.pathname + loc.search} />
    </>
  )
}
