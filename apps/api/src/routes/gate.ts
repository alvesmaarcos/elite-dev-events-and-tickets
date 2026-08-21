import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { parseQrPayload, verifySignature } from "../lib/qr";
import { decideGateResult } from "../domain/gate";

export const gateRouter = Router();

const validateSchema = z.object({
  payload: z.string().min(1),
  eventId: z.string().optional(),
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
    include: { seat: { include: { event: true } } },
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

  if (decisao.result !== "VALIDO") {
    res.json(decisao);
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
  });
});
