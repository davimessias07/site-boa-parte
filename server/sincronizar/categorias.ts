// Converte as categorias dos distribuidores para as categorias do site (briefing, seção 4).
import { normalizar } from '../../shared/catalogo.ts'

/** null = fora do escopo do site (não importar). */
type Destino = string | null

// Ordem importa: a primeira regra que casar vence.
// Texto comparado já normalizado (sem acento, minúsculo).
const REGRAS: [RegExp, Destino][] = [
  // Quarto
  [/guarda.?roupa|roupeiro/, 'Guarda-roupas'],
  [/protetor|travesseiro|colchonete|edredom|lencol/, 'Variedades'],
  [/hospitalar/, null],
  [/colchao|colchoes/, 'Colchões'],
  [/mesa de cabeceira|criado/, 'Criados-mudos'],
  [/comoda/, 'Cômodas'],
  [/mesa (de )?jantar|conjunto de mesa|sala de jantar|mesa jantar/, 'Mesas de Jantar'],
  [/\bcama\b|camas|beliche|bicama|cabeceira|\bbase\b|box/, 'Camas e Cabeceiras'],
  [/penteadeira|espelho|sapateira|multiuso|infantil|aparador|adega|cristaleira|fruteira|escrivaninha|gamer|escritorio|combo/, 'Variedades'],
  // Sala
  [/\brack|painel|paineis|bancada|\bhome\b(?! theater)/, 'Racks e Painéis de TV'],
  [/sofa|poltrona|estofad|puff/, 'Sofás e Poltronas'],
  [/estante/, 'Estantes'],
  [/mesa (de )?(centro|canto|apoio)|mesas de centro/, 'Mesas de Centro e de Canto'],
  [/cadeira|banco|banqueta/, 'Cadeiras'],
  // Cozinha
  [/armario|balcao|aereo|paneleiro|cozinha completa|kit cozinha|\bkit\b|gabinete|complementos? de cozinha/, 'Armários e Balcões de Cozinha'],
  // Fora do escopo (antes dos eletros para "Suporte TV e Microondas" não cair em Micro-ondas)
  [/\btv\b|televis|\bsom\b|home theater|informatica|computador|notebook|celular|tablet|camera|telefone|beleza|secador|chapinha|barbeador|parafusadeira|furadeira|ferramenta|bicicl|ceramica|iluminacao|lampada/, null],
  // Eletrodomésticos
  [/refrigerador|geladeira|freezer/, 'Geladeiras'],
  [/fogao|fogoes|cooktop/, 'Fogões'],
  [/micro.?ondas/, 'Micro-ondas'],
  [/aspirador|alta pressao|ar condicionado|depurador|bebedouro|purificador|forno|eletros|lava.?loucas/, 'Outros Eletrodomésticos'],
  [/lavadora|lava e seca|tanquinho|maquina de lavar/, 'Lavadoras'],
  // Portáteis
  [/ventilador|circulador/, 'Ventiladores'],
  [/liquidificador|multiprocessador|processador/, 'Liquidificadores'],
  [/ferro de passar/, 'Ferros de Passar'],
  [/batedeira|cafeteira|pipoqueira|chaleira|churrasqueira|sanduicheira|grill|fritadeira|air ?fryer|panela|portat|mixer|espremedor/, 'Outros Portáteis'],
  // Genéricas de móveis
  [/utensilio|complemento|variedade/, 'Variedades'],
]

// Categorias "guarda-chuva" que não dizem nada sozinhas: decidir pelo nome do produto.
// Também as que misturam dois tipos ("Penteadeira e Mesa de cabeceira", "Forno e Microondas").
const GENERICAS =
  /^(sem categoria|ver todos.*|exibir tudo.*|todos|cozinha|sala|quarto|sala e escritorio|cozinha e banheiro|colchao e estofado|eletrodomestico|portatil|moveis|mesa|lancamentos|promocoes?|ofertas?|penteadeira e mesa de cabeceira|forno e microondas|cabeceira e puff)$/

function aplicar(texto: string): Destino | undefined {
  const t = normalizar(texto)
  for (const [re, destino] of REGRAS) if (re.test(t)) return destino
  return undefined
}

/**
 * @param categorias categorias do produto no site do distribuidor (da mais específica para a mais geral)
 * @returns nome da categoria do site, ou null se o produto está fora do escopo
 */
export function mapearCategoria(categorias: string[], nomeProduto: string): Destino {
  for (const c of categorias) {
    if (GENERICAS.test(normalizar(c))) continue
    const d = aplicar(c)
    if (d !== undefined) return d
  }
  const peloNome = aplicar(nomeProduto)
  return peloNome !== undefined ? peloNome : 'Variedades'
}

/** Categoria do distribuidor vira subcategoria quando acrescenta informação (ex.: "Porta de correr"). */
export function subcategoriaDe(categoriaOrigem: string, categoriaSite: string): string {
  const a = normalizar(categoriaOrigem)
  const b = normalizar(categoriaSite)
  if (!a || GENERICAS.test(a) || b.includes(a) || a.includes(b.replace(/s$/, ''))) return ''
  return categoriaOrigem.length <= 60 ? categoriaOrigem : ''
}
