import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { linkWhatsApp } from '../../shared/catalogo'
import { WhatsAppIcone } from './WhatsAppIcone'

const LINKS = [
  { to: '/', label: 'Início' },
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/quem-somos', label: 'Quem Somos' },
  { to: '/contato', label: 'Contato' },
]

export function Logo({ compacto }: { compacto?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-3" aria-label="Móveis Boa Parte — página inicial">
      <img src="/logo-160.png" alt="" width={48} height={48} className="size-11 rounded-full sm:size-12" />
      {!compacto && (
        <span className="flex flex-col leading-none">
          <span className="text-[10px] font-semibold tracking-[0.3em] text-marinho/80">MÓVEIS</span>
          <span className="font-serif text-lg font-bold tracking-wide sm:text-xl">BOA PARTE</span>
        </span>
      )}
    </Link>
  )
}

export function Header() {
  const [aberto, setAberto] = useState(false)
  const [rolou, setRolou] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setAberto(false), [pathname])

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 8)
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-300 ${
        rolou || aberto ? 'border-marinho/10 bg-creme/90 backdrop-blur-md' : 'border-transparent bg-creme'
      }`}
    >
      <div className="container-site flex h-16 items-center justify-between gap-4 sm:h-20">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `relative rounded-full px-4 py-2 text-sm font-medium transition hover:text-ouro-escuro ${
                  isActive ? 'text-ouro-escuro' : 'text-marinho'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={linkWhatsApp('Olá! Vim pelo site da Móveis Boa Parte.')}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-marinho hidden py-2.5 sm:inline-flex"
          >
            <WhatsAppIcone className="size-4" />
            Fale conosco
          </a>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full text-marinho hover:bg-marinho/5 lg:hidden"
            aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={aberto}
            aria-controls="menu-mobile"
            onClick={() => setAberto((v) => !v)}
          >
            {aberto ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {aberto && (
        <nav id="menu-mobile" className="container-site animate-surgir pb-6 lg:hidden" aria-label="Menu">
          <ul className="flex flex-col divide-y divide-marinho/10 border-y border-marinho/10">
            {LINKS.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.to === '/'}
                  className={({ isActive }) =>
                    `block py-4 font-serif text-lg ${isActive ? 'text-ouro-escuro' : 'text-marinho'}`
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <a
            href={linkWhatsApp('Olá! Vim pelo site da Móveis Boa Parte.')}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ouro mt-5 w-full"
          >
            <WhatsAppIcone className="size-4" />
            Fale conosco no WhatsApp
          </a>
        </nav>
      )}
    </header>
  )
}
