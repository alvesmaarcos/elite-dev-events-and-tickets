/**
 * Regra de cancelamento de ingresso pelo cliente.
 *
 * Pura de proposito: recebe o "agora" de fora, entao da para testar
 * "faltando 1 hora" sem esperar uma hora de verdade.
 */

export const CANCEL_DEADLINE_HOURS = 2;

export interface CancelableTicket {
  status: "VALID" | "USED" | "CANCELED";
  eventDate: Date;
  eventCanceledAt: Date | null;
}

export type CancelCheck = { ok: true } | { ok: false; reason: string };

export function canCancelTicket(
  ticket: CancelableTicket,
  now: Date
): CancelCheck {
  if (ticket.status === "USED") {
    return { ok: false, reason: "Este ingresso ja foi utilizado na portaria." };
  }

  if (ticket.status === "CANCELED") {
    return { ok: false, reason: "Este ingresso ja esta cancelado." };
  }

  if (ticket.eventCanceledAt) {
    return { ok: false, reason: "A sessao foi cancelada pelo organizador." };
  }

  const horasAteOEvento =
    (ticket.eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Se a sessao ja passou, o numero fica negativo -- e negativo e menor que 2,
  // entao a regra recusa naturalmente, sem precisar de um if extra.
  if (horasAteOEvento < CANCEL_DEADLINE_HOURS) {
    return {
      ok: false,
      reason: `O cancelamento so e permitido ate ${CANCEL_DEADLINE_HOURS}h antes da sessao.`,
    };
  }

  return { ok: true };
}
