/**
 * Relatorio de encerramento da sessao, para o organizador.
 *
 * Funcao pura: recebe os ingressos e os dados da sala, devolve os numeros.
 * Sem banco e sem HTTP, entao da para cobrir os casos de contagem em
 * milissegundos (ver report.test.ts).
 */

export interface TicketDoRelatorio {
  status: "VALID" | "USED" | "CANCELED";
  clientId: string;
}

export interface Relatorio {
  ingressosEmitidos: number;
  clientes: number;
  validados: number;
  cancelados: number;
  naoCompareceram: number;
  ocupacao: number;
  capacidade: number;
  receita: number;
  receitaProdutos: number;
  receitaTotal: number;
  taxaComparecimento: number;
}

export function montarRelatorio(
  tickets: TicketDoRelatorio[],
  precoDoIngresso: number,
  capacidade: number,
  // A receita da lojinha chega pronta (ver domain/store.ts): as duas contas
  // tem regras de reembolso diferentes e nada ganham em virar uma so.
  receitaProdutos = 0
): Relatorio {
  const validados = tickets.filter((t) => t.status === "USED").length;
  const cancelados = tickets.filter((t) => t.status === "CANCELED").length;

  // "Nao compareceram" sao os ingressos que continuaram validos ate o fim:
  // foram pagos, ninguem cancelou, e ninguem passou na portaria.
  const naoCompareceram = tickets.filter((t) => t.status === "VALID").length;

  // Clientes DISTINTOS: uma pessoa que comprou 4 poltronas conta como 1.
  const clientes = new Set(tickets.map((t) => t.clientId)).size;

  // Cancelados foram reembolsados (o reembolso e simulado, como o pagamento),
  // entao nao entram na receita.
  const vendidosEfetivamente = validados + naoCompareceram;

  const receitaDeIngressos = vendidosEfetivamente * precoDoIngresso;

  return {
    ingressosEmitidos: tickets.length,
    clientes,
    validados,
    cancelados,
    naoCompareceram,
    ocupacao: vendidosEfetivamente,
    capacidade,
    receita: receitaDeIngressos,
    receitaProdutos,
    receitaTotal: receitaDeIngressos + receitaProdutos,
    // Dos que efetivamente valiam na hora da sessao, quantos apareceram.
    // Sem ingresso valido, a taxa e 0 em vez de divisao por zero.
    taxaComparecimento:
      vendidosEfetivamente === 0
        ? 0
        : Math.round((validados / vendidosEfetivamente) * 100),
  };
}
