import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { buildQrPayload, generateTicketCode, signCode } from "../lib/qr";

export const reservationsRouter = Router();

const checkoutSchema = z.object({
  eventId: z.string().min(1),
  seatLabels: z.array(z.string().min(1)).min(1),
  outcome: z.enum(["approve", "decline"]),
});

class ReservaExpirada extends Error {}

reservationsRouter.post("/", requireAuth, requireRole("CLIENT"), async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados do pagamento invalidos." });
    return;
  }

  const { eventId, seatLabels, outcome } = parsed.data;
  const userId = req.user!.id;

  // ---------- pagamento recusado ----------
  if (outcome === "decline") {
    await prisma.seat.updateMany({
      where: {
        eventId,
        label: { in: seatLabels },
        status: "HELD",
        holdByUserId: userId,
      },
      data: { status: "AVAILABLE", holdExpiresAt: null, holdByUserId: null },
    });

    res.json({ declined: true });
    return;
  }

  // ---------- pagamento aprovado ----------
  try {
    const tickets = await prisma.$transaction(async (tx) => {
      const resultado = await tx.seat.updateMany({
        where: {
          eventId,
          label: { in: seatLabels },
          status: "HELD",
          holdByUserId: userId,
          holdExpiresAt: { gte: new Date() },
        },
        data: { status: "SOLD", holdExpiresAt: null, holdByUserId: null },
      });

      if (resultado.count !== seatLabels.length) throw new ReservaExpirada();

      const assentos = await tx.seat.findMany({
        where: { eventId, label: { in: seatLabels } },
      });

      const reservation = await tx.reservation.create({
        data: { eventId, clientId: userId },
      });

      for (const assento of assentos) {
        const code = generateTicketCode();

        await tx.ticket.create({
          data: {
            reservationId: reservation.id,
            seatId: assento.id,
            code,
            signature: signCode(code),
          },
        });
      }

      return tx.ticket.findMany({
        where: { reservationId: reservation.id },
        include: { seat: true },
      });
    });

    res.status(201).json({
      tickets: tickets.map((ingresso) => ({
        id: ingresso.id,
        code: ingresso.code,
        seatLabel: ingresso.seat.label,
        qrPayload: buildQrPayload(ingresso.code, ingresso.signature),
      })),
    });
  } catch (err) {
    if (err instanceof ReservaExpirada) {
      res.status(409).json({
        error: "Sua reserva expirou ou as poltronas nao estao mais com voce. Escolha novamente.",
      });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Erro ao processar o pagamento." });
  }
});

reservationsRouter.get("/mine", requireAuth, requireRole("CLIENT"), async (req, res) => {
  const reservations = await prisma.reservation.findMany({
    where: { clientId: req.user!.id },
    include: {
      event: true,
      tickets: { include: { seat: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(
    reservations.map((reserva) => ({
      id: reserva.id,
      createdAt: reserva.createdAt,
      event: {
        id: reserva.event.id,
        title: reserva.event.title,
        date: reserva.event.date,
        location: reserva.event.location,
      },
      tickets: reserva.tickets.map((ingresso) => ({
        id: ingresso.id,
        code: ingresso.code,
        status: ingresso.status,
        seatLabel: ingresso.seat.label,
        qrPayload: buildQrPayload(ingresso.code, ingresso.signature),
      })),
    }))
  );
});
