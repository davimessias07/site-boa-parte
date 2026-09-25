import { Bed, Fan, Package, Refrigerator, Sofa, UtensilsCrossed, type LucideProps } from 'lucide-react'

const ICONES = {
  quarto: Bed,
  sala: Sofa,
  'cozinha-e-jantar': UtensilsCrossed,
  eletrodomesticos: Refrigerator,
  portateis: Fan,
  variedades: Package,
} as const

export function GrupoIcone({ grupo, ...props }: { grupo: string } & LucideProps) {
  const Icone = ICONES[grupo as keyof typeof ICONES] ?? Package
  return <Icone aria-hidden="true" {...props} />
}
