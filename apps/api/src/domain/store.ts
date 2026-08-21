/**
 * Regras da lojinha do cinema, isoladas de Express e de Prisma.
 *
 * Duas coisas moram aqui: quais escolhas fazem sentido para cada produto, e
 * quanto custa um pedido. Ambas puras, entao os casos de borda (pipoca sem
 * opcao, refrigerante com opcao, pedido de reserva cancelada) sao cobertos em
 * milissegundos -- ver store.test.ts.
 */

/**
 * As opcoes de pipoca.
 *
 * Repare no que NAO esta na lista: "doce com manteiga". A regra "doce nao
 * leva manteiga" nao virou um `if` que alguem pode esquecer de chamar -- ela
 * esta na propria enumeracao, entao a combinacao invalida nem tem como ser
 * escrita.
 */
export const OPCOES_PIPOCA = [
  "SALGADA_COM_MANTEIGA",
  "SALGADA_SEM_MANTEIGA",
  "DOCE",
] as const;

export type OpcaoPipoca = (typeof OPCOES_PIPOCA)[number];

export const ROTULO_OPCAO: Record<OpcaoPipoca, string> = {
  SALGADA_COM_MANTEIGA: "Salgada, com manteiga",
  SALGADA_SEM_MANTEIGA: "Salgada, sem manteiga",
  DOCE: "Doce (sem manteiga)",
};

export type CategoriaProduto =
  | "REFRIGERANTE"
  | "CHOCOLATE"
  | "AGUA"
  | "PIPOCA";

/** So a pipoca e montada na hora; o resto sai da prateleira como esta. */
export function exigeOpcao(categoria: CategoriaProduto): boolean {
  return categoria === "PIPOCA";
}

/**
 * Confere uma linha do pedido. Devolve a mensagem de erro, ou null se estiver
 * tudo certo -- mesmo formato usado nas outras regras do projeto, para a rota
 * so precisar decidir o status HTTP.
 */
export function validarEscolha(
  categoria: CategoriaProduto,
  opcao: string | null | undefined,
  quantidade: number
): string | null {
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    return "Quantidade invalida.";
  }

  // Um limite existe para o balcao nao receber um pedido de 400 pipocas por
  // engano de digitacao (ou de proposito).
  if (quantidade > 20) {
    return "Maximo de 20 unidades por item.";
  }

  if (exigeOpcao(categoria)) {
    if (!opcao) return "Escolha o tipo da pipoca.";
    if (!OPCOES_PIPOCA.includes(opcao as OpcaoPipoca)) {
      return "Tipo de pipoca invalido.";
    }
    return null;
  }

  if (opcao) return "Este produto nao tem opcoes.";

  return null;
}

export interface LinhaDoPedido {
  quantity: number;
  unitPrice: number;
}

export function totalDoPedido(itens: LinhaDoPedido[]): number {
  return itens.reduce((soma, item) => soma + item.quantity * item.unitPrice, 0);
}

export interface ReservaComProdutos {
  /** Ingressos da reserva que NAO foram cancelados. */
  ticketsAtivos: number;
  itens: LinhaDoPedido[];
}

/**
 * Receita da loja numa sessao.
 *
 * A regra de reembolso segue a do ingresso: se a pessoa cancelou TUDO o que
 * comprou, ela nao vai ao cinema, e o combo volta junto com o dinheiro. Se
 * cancelou parte (comprou quatro lugares, desistiu de um), alguem da compra
 * ainda vai -- e a pipoca continua vendida.
 */
export function receitaDeProdutos(reservas: ReservaComProdutos[]): number {
  return reservas
    .filter((reserva) => reserva.ticketsAtivos > 0)
    .reduce((soma, reserva) => soma + totalDoPedido(reserva.itens), 0);
}
