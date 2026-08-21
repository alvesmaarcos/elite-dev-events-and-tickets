/**
 * A arvore de decisao da portaria, isolada de Express e de Prisma.
 *
 * Esta funcao responde apenas: "dado um ingresso que EXISTE e e AUTENTICO,
 * ele pode entrar agora?". Procurar o codigo no banco e conferir a assinatura
 * e trabalho da rota (routes/gate.ts) -- por isso "INVALIDO" nao esta na
 * lista de resultados daqui.
 *
 * Sendo pura, da para cobrir todos os ramos em milissegundos, sem banco nem
 * servidor. Ver gate.test.ts.
 */

export type GateResultCode =
  | "VALIDO"
  | "JA_UTILIZADO"
  | "EVENTO_ERRADO"
  | "CANCELADO"
  | "EVENTO_CANCELADO"
  | "EVENTO_ENCERRADO";

export interface GateTicketInput {
  status: "VALID" | "USED" | "CANCELED";
  usedAt: Date | null;
  eventId: string;
  eventCanceledAt: Date | null;
  eventClosedAt: Date | null;
}

export interface GateDecision {
  result: GateResultCode;
  reason?: string;
  usedAt?: Date;
}

export function decideGateResult(
  ticket: GateTicketInput,
  requestedEventId?: string
): GateDecision {
  // A ordem importa: se a portaria do evento A escaneia um ingresso do evento
  // B que ja foi usado la, a mensagem util e "e de outra sessao" -- dizer "ja
  // utilizado" mandaria a pessoa discutir com o porteiro errado.
  if (requestedEventId && ticket.eventId !== requestedEventId) {
    return { result: "EVENTO_ERRADO", reason: "Este ingresso e de outra sessao." };
  }

  // Antes de falar do ingresso, fala da sessao: se o evento inteiro caiu,
  // dizer "seu ingresso foi cancelado" faria a pessoa achar que o problema e
  // dela, quando na verdade todo mundo esta na mesma situacao.
  if (ticket.eventCanceledAt) {
    return { result: "EVENTO_CANCELADO", reason: "Esta sessao foi cancelada." };
  }

  // Encerrado vem antes do estado do ingresso: se a sessao ja acabou, o
  // problema nao e o ingresso da pessoa.
  if (ticket.eventClosedAt) {
    return {
      result: "EVENTO_ENCERRADO",
      reason: "Esta sessao ja foi encerrada pelo organizador.",
    };
  }

  if (ticket.status === "CANCELED") {
    return { result: "CANCELADO", reason: "Este ingresso foi cancelado." };
  }

  if (ticket.status === "USED") {
    return {
      result: "JA_UTILIZADO",
      reason: "Este ingresso ja passou pela portaria.",
      usedAt: ticket.usedAt ?? undefined,
    };
  }

  return { result: "VALIDO" };
}
