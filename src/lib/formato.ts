const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const formatarPreco = (centavos: number) => moeda.format(centavos / 100)

/** Centavos → "1.299,90" para campos de formulário. */
export const precoParaCampo = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
