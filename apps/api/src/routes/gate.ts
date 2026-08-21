import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { parseQrPayload, verifySignature } from "../lib/qr";
import { decideGateResult } from "../domain/gate";
import { descreverOpcao } from "./store";

export const gateRouter = Router();

const validateSchema = z.object({
  payload: z.string().min(1),
  eventId: z.string().optional(),
});

/**
 * Quantas entradas ja foram liberadas nesta sessao, e quantas sao esperadas.
 *
 * "Esperados" exclui os cancelados: quem cancelou nao vai aparecer na porta,
 * entao conta-lo faria a portaria terminar a noite achando que faltou gente.
 */
async function contarPortaria(eventId?: string) {
  if (!eventId) return undefined;

  const [validados, esperados] = await Promise.all([
    prisma.ticket.count({ where: { seat: { eventId }, status: "USED" } }),
    prisma.ticket.count({
      where: { seat: { eventId }, status: { not: "CANCELED" } },
    }),
  ]);

  return { validados, esperados };
}

// A contagem da sessao, antes de qualquer leitura. Sem ela o painel da
// portaria so ganharia numero depois do primeiro ingresso -- e quem abre a
// porta quer saber de quantas pessoas esta esperando desde o inicio.
gateRouter.get("/metricas/:eventId", requireAuth, requireRole("GATE"), async (req, res) => {
  const eventId = String(req.params.eventId);

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    res.status(404).json({ error: "Sessao nao encontrada." });
    return;
  }

  res.json(await contarPortaria(eventId));
});

gateRouter.post("/validate", requireAuth, requireRole("GATE"), async (req, res) => {
  const parsed = validateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Informe o codigo do ingresso." });
    return;
  }

  // A camera entrega "codigo.assinatura"; a digitacao manual entrega so o
  // codigo. Esta linha atende aos dois formatos.
  const bruto = parsed.data.payload.trim();
  const partes = parseQrPayload(bruto);
  const code = partes ? partes.code : bruto;

  const ticket = await prisma.ticket.findUnique({
    where: { code },
    include: {
      seat: { include: { event: true } },
      reservation: { include: { items: { include: { product: true } } } },
    },
  });

  if (!ticket) {
    res.json({ result: "INVALIDO", reason: "Codigo nao encontrado." });
    return;
  }

  // A assinatura so e conferida quando ela veio junto (leitura por camera).
  if (partes && !verifySignature(partes.code, partes.signature)) {
    res.json({
      result: "INVALIDO",
      reason: "Assinatura invalida (possivel falsificacao).",
    });
    return;
  }

  const decisao = decideGateResult(
    {
      status: ticket.status,
      usedAt: ticket.usedAt,
      eventId: ticket.seat.eventId,
      eventCanceledAt: ticket.seat.event.canceledAt,
      eventClosedAt: ticket.seat.event.closedAt,
    },
    parsed.data.eventId
  );

  // A sessao de onde o ingresso REALMENTE e. Vai junto de toda recusa: sem
  // isso, "ingresso de outra sessao" manda a pessoa embora sem dizer para
  // onde ela deveria ir -- e quem esta na portaria nao tem como ajudar.
  // O combo comprado junto. A portaria nao entrega nada -- so avisa, porque
  // quem entra na sala sem passar na loja esquece a pipoca que ja pagou.
  const pendentes = ticket.reservation.items.filter((i) => !i.deliveredAt);

  const combo = pendentes.length
    ? {
        pendentes: pendentes.length,
        itens: pendentes.map((item) => ({
          nome: item.product.name,
          opcao: descreverOpcao(item.option),
          quantidade: item.quantity,
        })),
      }
    : undefined;

  const ingressoDe = {
    eventId: ticket.seat.eventId,
    title: ticket.seat.event.title,
    date: ticket.seat.event.date,
    location: ticket.seat.event.location,
    seatLabel: ticket.seat.label,
  };

  if (decisao.result !== "VALIDO") {
    res.json({
      ...decisao,
      ingressoDe,
      metricas: await contarPortaria(parsed.data.eventId),
    });
    return;
  }

  // Escrita condicional: so altera se ainda estiver VALID. E o que impede
  // duas portarias liberarem a mesma captura de tela ao mesmo tempo -- o
  // mesmo padrao da reserva temporaria, agora em outro contexto.
  const marcado = await prisma.ticket.updateMany({
    where: { id: ticket.id, status: "VALID" },
    data: { status: "USED", usedAt: new Date() },
  });

  if (marcado.count === 0) {
    res.json({
      result: "JA_UTILIZADO",
      reason: "Este ingresso acabou de ser validado em outro ponto.",
    });
    return;
  }

  res.json({
    result: "VALIDO",
    event: ticket.seat.event.title,
    seatLabel: ticket.seat.label,
    ingressoDe,
    combo,
    // Contado DEPOIS da marcacao: a leitura que acabou de acontecer ja
    // aparece no numero que a portaria ve na tela.
    metricas: await contarPortaria(parsed.data.eventId),
  });
});
