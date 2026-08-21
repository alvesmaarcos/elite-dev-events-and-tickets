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

/**
 * Normaliza o que chegou no campo da portaria.
 *
 * Na pratica a portaria recebe o codigo de tres formas, e todas sao
 * legitimas:
 *   1. "codigo.assinatura"                  -> QR lido pela camera
 *   2. "codigo"                             -> digitacao manual
 *   3. "http://.../ingresso/codigo"         -> link de compartilhamento colado
 *
 * A terceira existe porque a tela "Meus ingressos" entrega um LINK para o
 * cliente compartilhar. E natural que alguem cole esse link inteiro aqui --
 * entao o servidor aceita, em vez de responder "codigo nao encontrado" e
 * deixar a pessoa sem entender o que fez de errado.
 *
 * Aceitar o link nao afrouxa a seguranca: equivale a digitar o codigo, que
 * ja era aceito. Quem tem o link tem o ingresso, como um bilhete de aviao.
 */
export function normalizeGateInput(entrada: string): string {
  const limpo = entrada.trim();
  if (!limpo) return "";

  // Descarta ?query e #fragmento, que podem vir junto num link copiado.
  const semExtras = limpo.split("?")[0].split("#")[0];

  // Um codigo (UUID) e uma assinatura (hex) nunca contem barra. Se tem
  // barra, e um link: interessa so o ultimo pedaco do caminho.
  if (semExtras.includes("/")) {
    const partes = semExtras.split("/").filter(Boolean);
    return partes[partes.length - 1] ?? "";
  }

  return semExtras;
}

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
