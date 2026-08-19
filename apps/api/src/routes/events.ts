import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const eventsRouter = Router();

async function comDisponibilidade(event: {
  id: string;
  roomRows: number;
  roomSeatsPerRow: number;
}) {
  const available = await prisma.seat.count({
    where: { eventId: event.id, status: "AVAILABLE" },
  });

  return {
    ...event,
    capacity: event.roomRows * event.roomSeatsPerRow,
    available,
  };
}

// publico

eventsRouter.get("/", async (req, res) => {
  const q = String(req.query.q || "").trim();

  const events = await prisma.event.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { location: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { date: "asc" },
  });

  res.json(await Promise.all(events.map(comDisponibilidade)));
});

eventsRouter.get("/:id", async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) {
    res.status(404).json({ error: "Evento nao encontrado." });
    return;
  }
  res.json(await comDisponibilidade(event));
});


eventsRouter.get("/mine/list", requireAuth, requireRole("ORGANIZER"), async (req, res) => {
  const events = await prisma.event.findMany({
    where: { organizerId: req.user!.id },
    orderBy: { date: "asc" },
  });
  res.json(events);
});

eventsRouter.get("/:id", async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) {
    res.status(404).json({ error: "Evento nao encontrado." });
    return;
  }
  res.json(event);
});

eventsRouter.get("/:id/seats", async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) {
    res.status(404).json({ error: "Evento nao encontrado." });
    return;
  }

  const seats = await prisma.seat.findMany({
    where: { eventId: event.id },
    orderBy: [{ row: "asc" }, { number: "asc" }],
  });

  res.json(
    seats.map((assento) => ({
      label: assento.label,
      row: assento.row,
      number: assento.number,
      status: assento.status,
    }))
  );
});


// criacao

const createEventSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  posterUrl: z.url().nullable().optional(),
  externalSource: z.string().optional(),
  externalId: z.string().optional(),
  date: z.coerce.date(),
  location: z.string().min(2),
  price: z.coerce.number().nonnegative(),
});

eventsRouter.post("/", requireAuth, requireRole("ORGANIZER"), async (req, res) => {
  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) {
 
    res.status(400).json({
      error: "Dados do evento invalidos.",
      detalhes: parsed.error.issues.map((problema) => ({
        campo: problema.path.join(".") || "(corpo da requisicao)",
        motivo: problema.message,
      })),
    });
    return;
  }

  const event = await prisma.event.create({
    data: { ...parsed.data, organizerId: req.user!.id },
  });

  res.status(201).json(event);
});
