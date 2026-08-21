import { Router } from "express";
import { prisma } from "../lib/prisma";
import { buildQrPayload } from "../lib/qr";
import { requireAuth, requireRole } from "../middleware/auth";
import { canCancelTicket } from "../domain/tickets";

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

/**
 * Cancelamento do ingresso pelo proprio cliente, ate 2h antes da sessao.
 * A poltrona volta imediatamente para o mapa.
 */
ticketsRouter.post("/:id/cancel", requireAuth, requireRole("CLIENT"), async (req, res) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: String(req.params.id) },
    include: {
      reservation: true,
      seat: { include: { event: true } },
    },
  });

  if (!ticket) {
    res.status(404).json({ error: "Ingresso nao encontrado." });
    return;
  }

  // requireRole garante que UM cliente esta pedindo, nao que e O DONO deste
  // ingresso. Sem esta conferencia, qualquer cliente logado cancelaria o
  // ingresso de outro sabendo o id -- a falha conhecida como IDOR.
  if (ticket.reservation.clientId !== req.user!.id) {
    res.status(403).json({ error: "Este ingresso nao e seu." });
    return;
  }

  const permissao = canCancelTicket(
    {
      status: ticket.status,
      eventDate: ticket.seat.event.date,
      eventCanceledAt: ticket.seat.event.canceledAt,
    },
    new Date()
  );

  if (!permissao.ok) {
    res.status(409).json({ error: permissao.reason });
    return;
  }

  // As duas escritas precisam acontecer juntas: um ingresso cancelado cuja
  // poltrona continuasse vendida sumiria do estoque para sempre.
  await prisma.$transaction([
    prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: "CANCELED", canceledAt: new Date() },
    }),
    prisma.seat.update({
      where: { id: ticket.seatId },
      data: { status: "AVAILABLE", holdExpiresAt: null, holdByUserId: null },
    }),
  ]);

  res.json({ ok: true });
});
