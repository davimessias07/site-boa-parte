import { Link } from 'react-router'
import { GRUPOS, WHATSAPP_EXIBICAO, linkWhatsApp } from '../../shared/catalogo'
import { WhatsAppIcone } from './WhatsAppIcone'

export function Footer() {
  return (
    <footer className="mt-24 bg-marinho text-white/80">
      <div className="h-1 bg-linear-to-r from-ouro-escuro via-ouro-claro to-ouro-escuro" />
      <div className="container-site grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo-160.png" alt="" width={56} height={56} loading="lazy" className="size-14 rounded-full" />
            <p className="leading-tight text-white">
              <span className="block text-[10px] tracking-[0.3em]">MÓVEIS</span>
              <span className="font-serif text-xl font-bold">BOA PARTE</span>
            </p>
          </div>
          <p className="text-sm text-ouro-claro italic">A escolha certa para o seu lar</p>
        </div>

        <div>
          <h2 className="mb-4 font-sans text-xs font-semibold tracking-[0.2em] text-ouro uppercase">Navegue</h2>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" to="/">Início</Link></li>
            <li><Link className="hover:text-white" to="/catalogo">Catálogo</Link></li>
            <li><Link className="hover:text-white" to="/quem-somos">Quem Somos</Link></li>
            <li><Link className="hover:text-white" to="/contato">Contato</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="mb-4 font-sans text-xs font-semibold tracking-[0.2em] text-ouro uppercase">Categorias</h2>
          <ul className="space-y-2 text-sm">
            {GRUPOS.map((g) => (
              <li key={g.slug}>
                <Link className="hover:text-white" to={`/catalogo?grupo=${g.slug}`}>
                  {g.nome}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 font-sans text-xs font-semibold tracking-[0.2em] text-ouro uppercase">Atendimento</h2>
          <p className="mb-4 text-sm">Tire dúvidas, consulte prazos e feche seu pedido direto pelo WhatsApp.</p>
          <a
            href={linkWhatsApp('Olá! Vim pelo site da Móveis Boa Parte.')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-semibold text-white hover:text-ouro-claro"
          >
            <WhatsAppIcone className="size-5 text-whatsapp" />
            {WHATSAPP_EXIBICAO}
          </a>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="container-site py-6 text-center text-xs text-white/50">
          © {new Date().getFullYear()} Móveis Boa Parte. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  )
}
