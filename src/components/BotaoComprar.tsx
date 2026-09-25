import { linkWhatsApp, mensagemWhatsApp, type Produto } from '../../shared/catalogo'
import { WhatsAppIcone } from './WhatsAppIcone'

type Props = { produto: Pick<Produto, 'nome' | 'sku'>; grande?: boolean; className?: string }

export function BotaoComprar({ produto, grande, className = '' }: Props) {
  return (
    <a
      href={linkWhatsApp(mensagemWhatsApp(produto))}
      target="_blank"
      rel="noopener noreferrer"
      className={`btn-ouro ${grande ? 'px-8 py-4 text-base' : 'w-full py-2.5'} ${className}`}
      aria-label={`Comprar ${produto.nome} pelo WhatsApp`}
    >
      <WhatsAppIcone className={grande ? 'size-5' : 'size-4'} />
      Comprar
    </a>
  )
}
