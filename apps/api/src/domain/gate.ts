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

export type GateResultCode = "VALIDO" | "JA_UTILIZADO" | "EVENTO_ERRADO";

export interface GateTicketInput {
  status: "VALID" | "USED" | "CANCELED";
  usedAt: Date | null;
  eventId: string;
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

  if (ticket.status === "USED") {
    return {
      result: "JA_UTILIZADO",
      reason: "Este ingresso ja passou pela portaria.",
      usedAt: ticket.usedAt ?? undefined,
    };
  }

  return { result: "VALIDO" };
}
