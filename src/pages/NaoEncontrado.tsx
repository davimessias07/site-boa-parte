import { Link } from 'react-router'
import { useMeta } from '../lib/useMeta'

export default function NaoEncontrado({ mensagem = 'A página que você procura não existe ou foi movida.' }) {
  useMeta('Página não encontrada')
  return (
    <div className="container-site flex flex-col items-center py-24 text-center">
      <p className="font-serif text-7xl font-bold text-ouro">404</p>
      <h1 className="mt-4 text-3xl font-bold">Ops! Não encontramos isso.</h1>
      <p className="mt-3 max-w-md text-cinza">{mensagem}</p>
      <div className="mt-8 flex gap-3">
        <Link to="/catalogo" className="btn-ouro">Ver catálogo</Link>
        <Link to="/" className="btn-contorno">Página inicial</Link>
      </div>
    </div>
  )
}
