import { Clock, MessageCircle, Search, ShieldCheck } from 'lucide-react'
import { WHATSAPP_EXIBICAO, linkWhatsApp } from '../../shared/catalogo'
import { WhatsAppIcone } from '../components/WhatsAppIcone'
import { useMeta } from '../lib/useMeta'

const PASSOS = [
  { icone: Search, titulo: 'Escolha no catálogo', texto: 'Clique em “Comprar” no produto que gostou.' },
  { icone: MessageCircle, titulo: 'Fale no WhatsApp', texto: 'A mensagem já vai pronta com o código do produto.' },
  { icone: ShieldCheck, titulo: 'Feche com segurança', texto: 'Combinamos pagamento, prazo e entrega com você.' },
]

export default function Contato() {
  useMeta('Contato', 'Fale com a Móveis Boa Parte pelo WhatsApp.')
  const link = linkWhatsApp('Olá! Vim pelo site da Móveis Boa Parte.')

  return (
    <div className="container-site pt-10 sm:pt-16">
      <div className="mx-auto max-w-3xl text-center">
        <p className="ornamento mb-4 justify-center">Contato</p>
        <h1 className="text-4xl font-bold sm:text-5xl">Vamos conversar?</h1>
        <p className="mt-5 text-lg text-cinza">
          Nosso atendimento é feito direto pelo WhatsApp: rápido, próximo e sem complicação.
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-xl rounded-3xl bg-white p-8 text-center shadow-card sm:p-12">
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-whatsapp/10 text-whatsapp">
          <WhatsAppIcone className="size-10" />
        </span>
        <p className="mt-6 text-sm tracking-[0.2em] text-cinza uppercase">WhatsApp</p>
        <a href={link} target="_blank" rel="noopener noreferrer" className="mt-2 block font-serif text-3xl font-bold hover:text-ouro-escuro sm:text-4xl">
          {WHATSAPP_EXIBICAO}
        </a>
        <a href={link} target="_blank" rel="noopener noreferrer" className="btn-ouro mt-8 w-full px-8 py-4 text-base sm:w-auto">
          <WhatsAppIcone className="size-5" /> Iniciar conversa
        </a>
        <p className="mt-5 flex items-center justify-center gap-2 text-sm text-cinza">
          <Clock className="size-4" aria-hidden="true" /> Respondemos o mais rápido possível.
        </p>
      </div>

      <ol className="mx-auto mt-16 grid max-w-5xl gap-5 sm:grid-cols-3">
        {PASSOS.map(({ icone: Icone, titulo, texto }, i) => (
          <li key={titulo} className="relative rounded-2xl border border-marinho/10 p-6">
            <span className="absolute top-5 right-5 font-serif text-4xl font-bold text-ouro/25">{i + 1}</span>
            <Icone className="mb-4 size-7 text-ouro-escuro" aria-hidden="true" />
            <h2 className="text-xl font-bold">{titulo}</h2>
            <p className="mt-2 text-sm text-cinza">{texto}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
