import { Router } from "express";
import { prisma } from "../lib/prisma";
import { buildQrPayload } from "../lib/qr";

export const ticketsRouter = Router();

/**
 * Link publico de compartilhamento.
 *
 * E publica de proposito: quem recebe o ingresso pelo WhatsApp nao tem conta
 * no sistema, e exigir cadastro para ver o proprio ingresso mataria a
 * utilidade. O que protege e o codigo ser um UUID aleatorio (impossivel de
 * adivinhar) e o ingresso so funcionar uma vez.
 */
ticketsRouter.get("/share/:code", async (req, res) => {
  const ticket = await prisma.ticket.findUnique({
    where: { code: req.params.code },
    include: { seat: { include: { event: true } } },
  });

  if (!ticket) {
    res.status(404).json({ error: "Ingresso nao encontrado." });
    return;
  }

  res.json({
    eventTitle: ticket.seat.event.title,
    eventDate: ticket.seat.event.date,
    location: ticket.seat.event.location,
    seatLabel: ticket.seat.label,
    status: ticket.status,
    qrPayload: buildQrPayload(ticket.code, ticket.signature),
  });
});
