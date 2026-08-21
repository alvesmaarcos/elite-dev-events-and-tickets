import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  HOLD_DURATION_MS,
  conflictingLabels,
  SeatState,
} from "../domain/seats";

export const seatsRouter = Router({ mergeParams: true });

const seatLabelsSchema = z.object({
  seatLabels: z.array(z.string().min(1)).min(1),
});

class ConflitoDeAssento extends Error {
  constructor(public conflitos: string[]) {
    super("SEATS_UNAVAILABLE");
  }
}

export async function liberarReservasVencidas(eventId: string) {
  await prisma.seat.updateMany({
    where: { eventId, status: "HELD", holdExpiresAt: { lt: new Date() } },
    data: { status: "AVAILABLE", holdExpiresAt: null, holdByUserId: null },
  });
}

seatsRouter.post("/hold", requireAuth, requireRole("CLIENT"), async (req, res) => {
  const parsed = seatLabelsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Informe as poltronas desejadas." });
    return;
  }

  // No Express 5, req.params vem tipado como string | string[].
  // O String() normaliza para o texto que o Prisma espera.
  const eventId = String(req.params.eventId);
  const { seatLabels } = parsed.data;
  const userId = req.user!.id;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    res.status(404).json({ error: "Sessao nao encontrada." });
    return;
  }

  await liberarReservasVencidas(eventId);

  const agora = new Date();
  const holdExpiresAt = new Date(agora.getTime() + HOLD_DURATION_MS);

  try {
    await prisma.$transaction(async (tx) => {
      const resultado = await tx.seat.updateMany({
        where: {
          eventId,
          label: { in: seatLabels },
          OR: [
            { status: "AVAILABLE" },
            { status: "HELD", holdByUserId: userId },
          ],
        },
        data: { status: "HELD", holdExpiresAt, holdByUserId: userId },
      });

      if (resultado.count !== seatLabels.length) {
        const assentos = await tx.seat.findMany({
          where: { eventId, label: { in: seatLabels } },
        });

        throw new ConflitoDeAssento(
          conflictingLabels(assentos as SeatState[], seatLabels, userId, agora)
        );
      }
    });

    res.json({ holdExpiresAt });
  } catch (err) {
    if (err instanceof ConflitoDeAssento) {
      res.status(409).json({
        error: "Algumas poltronas ja nao estao disponiveis.",
        conflicts: err.conflitos,
      });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Erro ao reservar as poltronas." });
  }
});

seatsRouter.post("/release", requireAuth, requireRole("CLIENT"), async (req, res) => {
  const parsed = seatLabelsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Informe as poltronas a liberar." });
    return;
  }

  await prisma.seat.updateMany({
    where: {
      eventId: String(req.params.eventId),
      label: { in: parsed.data.seatLabels },
      status: "HELD",
      holdByUserId: req.user!.id,
    },
    data: { status: "AVAILABLE", holdExpiresAt: null, holdByUserId: null },
  });

  res.json({ ok: true });
});
