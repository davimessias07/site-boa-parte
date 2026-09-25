// Produtos de exemplo para desenvolvimento: carregados só com SEED=true e banco vazio.
import { importar, totalProdutos } from './produtos.ts'
import type { ProdutoEntrada } from '../shared/catalogo.ts'

const EXEMPLOS: ProdutoEntrada[] = [
  { nome: 'Guarda-roupa 6 Portas Espelhado', categoria: 'Guarda-roupas', subcategoria: '6 portas', fornecedor: 'PRE', preco: '1899,90', descricao: 'Guarda-roupa casal com 6 portas, sendo 2 espelhadas, 4 gavetas com corrediças metálicas e amplo maleiro. Acabamento em MDP de alta resistência.' },
  { nome: 'Guarda-roupa 2 Portas de Correr', categoria: 'Guarda-roupas', subcategoria: '2 portas', fornecedor: 'ATC', preco: '1149,00', descricao: 'Portas de correr que economizam espaço, 3 gavetas internas e cabideiro duplo.' },
  { nome: 'Cama Box Casal com Cabeceira Estofada', categoria: 'Camas e Cabeceiras', subcategoria: 'Casal', fornecedor: 'SAL', preco: '1399,90', descricao: 'Base box com cabeceira estofada em suede, costura capitonê e pés reforçados.' },
  { nome: 'Cabeceira Painel Queen Ripada', categoria: 'Camas e Cabeceiras', subcategoria: 'Queen', fornecedor: 'PRE', preco: '589,90', descricao: 'Cabeceira ripada com acabamento amadeirado, ideal para quartos modernos.' },
  { nome: 'Colchão Casal Molas Ensacadas', categoria: 'Colchões', subcategoria: 'Casal', fornecedor: 'SAL', preco: '1690,00', descricao: 'Molas ensacadas individualmente, pillow top e tecido antialérgico. Suporta até 120 kg por pessoa.' },
  { nome: 'Colchão Solteiro Espuma D33', categoria: 'Colchões', subcategoria: 'Solteiro', fornecedor: 'ATC', preco: '549,90', descricao: 'Espuma D33 de alta densidade, firme e confortável para o dia a dia.' },
  { nome: 'Cômoda 5 Gavetas Off White', categoria: 'Cômodas', subcategoria: '5 gavetas', fornecedor: 'PRE', preco: '699,90', descricao: 'Cômoda com 5 gavetas amplas, puxadores metálicos e acabamento off white.' },
  { nome: 'Criado-mudo 2 Gavetas Freijó', categoria: 'Criados-mudos', subcategoria: '2 gavetas', fornecedor: 'ATC', preco: '229,90', descricao: 'Criado-mudo compacto com 2 gavetas e tampo resistente.' },
  { nome: 'Rack com Painel para TV até 65"', categoria: 'Racks e Painéis de TV', subcategoria: 'Até 65"', fornecedor: 'PRE', preco: '1299,00', descricao: 'Conjunto rack + painel com nichos, passagem de fios e iluminação de LED.' },
  { nome: 'Painel Home Suspenso 1,80 m', categoria: 'Racks e Painéis de TV', subcategoria: 'Suspenso', fornecedor: 'SAL', preco: '799,90', descricao: 'Painel suspenso com prateleiras, leve e elegante para salas compactas.' },
  { nome: 'Sofá Retrátil e Reclinável 3 Lugares', categoria: 'Sofás e Poltronas', subcategoria: '3 lugares', fornecedor: 'ATC', preco: '2499,90', descricao: 'Assentos retráteis e encostos reclináveis, espuma D28 e tecido suede amassado.' },
  { nome: 'Poltrona Decorativa Costela', categoria: 'Sofás e Poltronas', subcategoria: 'Poltrona', fornecedor: 'PRE', preco: '899,00', descricao: 'Poltrona com pés palito em madeira e estofado confortável.' },
  { nome: 'Estante Nicho 5 Prateleiras', categoria: 'Estantes', subcategoria: '5 prateleiras', fornecedor: 'SAL', preco: '459,90', descricao: 'Estante multiuso para livros, decoração e organização.' },
  { nome: 'Mesa de Centro Tampo de Vidro', categoria: 'Mesas de Centro e de Canto', subcategoria: 'Centro', fornecedor: 'ATC', preco: '389,90', descricao: 'Mesa de centro com tampo em vidro temperado e base em MDF.' },
  { nome: 'Mesa de Canto Redonda', categoria: 'Mesas de Centro e de Canto', subcategoria: 'Canto', fornecedor: 'PRE', preco: '199,90', descricao: 'Mesa de canto redonda com pés palito.' },
  { nome: 'Mesa de Jantar 6 Lugares Tampo de Vidro', categoria: 'Mesas de Jantar', subcategoria: '6 lugares', fornecedor: 'SAL', preco: '1799,90', descricao: 'Conjunto com mesa retangular e 6 cadeiras estofadas.' },
  { nome: 'Mesa de Jantar 4 Lugares Redonda', categoria: 'Mesas de Jantar', subcategoria: '4 lugares', fornecedor: 'ATC', preco: '999,00', descricao: 'Mesa redonda compacta, ideal para apartamentos.' },
  { nome: 'Cadeira Estofada Linho (par)', categoria: 'Cadeiras', subcategoria: 'Estofada', fornecedor: 'PRE', preco: '499,90', descricao: 'Par de cadeiras com assento e encosto estofados em linho.' },
  { nome: 'Armário de Cozinha Completo 4 Peças', categoria: 'Armários e Balcões de Cozinha', subcategoria: 'Completa', fornecedor: 'SAL', preco: '1599,90', descricao: 'Cozinha modulada com aéreo, balcão com tampo, paneleiro e armário de canto.' },
  { nome: 'Balcão de Pia 1,20 m', categoria: 'Armários e Balcões de Cozinha', subcategoria: 'Balcão', fornecedor: 'ATC', preco: '549,90', descricao: 'Balcão para pia com 2 portas e 1 gaveta.' },
  { nome: 'Geladeira Frost Free 375 L Inox', categoria: 'Geladeiras', subcategoria: 'Frost Free', fornecedor: 'PRE', preco: '3299,00', descricao: 'Geladeira duplex frost free, 375 litros, acabamento inox e controle de temperatura.' },
  { nome: 'Fogão 5 Bocas Mesa de Vidro', categoria: 'Fogões', subcategoria: '5 bocas', fornecedor: 'SAL', preco: '1349,90', descricao: 'Fogão com mesa de vidro temperado, acendimento automático e forno autolimpante.' },
  { nome: 'Fogão 4 Bocas Branco', categoria: 'Fogões', subcategoria: '4 bocas', fornecedor: 'ATC', preco: '899,90', descricao: 'Fogão 4 bocas com forno de 50 litros e acendimento automático.' },
  { nome: 'Micro-ondas 30 L Espelhado', categoria: 'Micro-ondas', subcategoria: '30 litros', fornecedor: 'PRE', preco: '699,90', descricao: 'Micro-ondas 30 litros com porta espelhada e menu pré-programado.' },
  { nome: 'Lavadora 12 kg Branca', categoria: 'Lavadoras', subcategoria: '12 kg', fornecedor: 'SAL', preco: '2199,00', descricao: 'Máquina de lavar 12 kg com múltiplos programas de lavagem.' },
  { nome: 'Ventilador de Coluna 40 cm', categoria: 'Ventiladores', subcategoria: 'Coluna', fornecedor: 'ATC', preco: '229,90', descricao: 'Ventilador de coluna com 3 velocidades e oscilação.' },
  { nome: 'Ventilador de Mesa Turbo 30 cm', categoria: 'Ventiladores', subcategoria: 'Mesa', fornecedor: 'PRE', preco: '149,90', descricao: 'Ventilador turbo de mesa, silencioso e potente.' },
  { nome: 'Liquidificador 1200 W 12 Velocidades', categoria: 'Liquidificadores', subcategoria: '1200 W', fornecedor: 'SAL', preco: '189,90', descricao: 'Copo de 3 litros, lâminas em aço inox e função pulsar.' },
  { nome: 'Ferro de Passar a Vapor', categoria: 'Ferros de Passar', subcategoria: 'Vapor', fornecedor: 'ATC', preco: '139,90', descricao: 'Base antiaderente, jato de vapor e spray.' },
  { nome: 'Sapateira Vertical 20 Pares', categoria: 'Variedades', subcategoria: 'Organização', fornecedor: 'PRE', preco: '259,90', descricao: 'Sapateira com portas basculantes para até 20 pares.' },
  { nome: 'Penteadeira com Espelho', categoria: 'Variedades', subcategoria: 'Quarto', fornecedor: 'SAL', preco: '479,90', descricao: 'Penteadeira com espelho, gaveta e nicho organizador.' },
  { nome: 'Guarda-roupa Solteiro 3 Portas', categoria: 'Guarda-roupas', subcategoria: '3 portas', fornecedor: 'ATC', preco: '799,90', descricao: 'Guarda-roupa compacto com 3 portas, 2 gavetas e cabideiro.' },
]

export function semearSeVazio() {
  // Só com SEED=true: o catálogo real vem da sincronização com os distribuidores.
  if (process.env.SEED !== 'true' || totalProdutos() > 0) return
  const r = importar(EXEMPLOS)
  console.log(`[seed] ${r.inseridos} produtos de exemplo criados`)
  if (r.erros.length) console.warn('[seed] erros:', r.erros)
}
