import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { seatsRouter } from "./seats";
import { optionalAuth } from "../middleware/auth";
import { liberarReservasVencidas } from "./seats";
import { buildSeatGrid } from "../domain/seats";

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
  const event = await prisma.event.findUnique({ where: { id: String(req.params.id) } });
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
  const event = await prisma.event.findUnique({ where: { id: String(req.params.id) } });
  if (!event) {
    res.status(404).json({ error: "Evento nao encontrado." });
    return;
  }
  res.json(event);
});

eventsRouter.get("/:id/seats", optionalAuth, async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: String(req.params.id) } });
  if (!event) {
    res.status(404).json({ error: "Evento nao encontrado." });
    return;
  }

  await liberarReservasVencidas(event.id);

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
      // "esta poltrona esta segurada por MIM?" -- o front usa isso para
      // deixa-la clicavel. Repare que o holdByUserId nunca sai da API: o
      // cliente nao precisa saber quem esta com a poltrona, so se e ele.
      heldByMe: Boolean(
        req.user &&
          assento.status === "HELD" &&
          assento.holdByUserId === req.user.id
      ),
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
  // Limites: o alfabeto acaba em Z (26 fileiras), e 60 poltronas numa
  // fileira ja e uma sala enorme. Validar na borda evita alguem pedir uma
  // sala de 10.000 fileiras e derrubar o servidor.
  roomRows: z.coerce.number().int().positive().max(26),
  roomSeatsPerRow: z.coerce.number().int().positive().max(60),
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

  const { roomRows, roomSeatsPerRow } = parsed.data;

  // Transacao: criar o evento e criar as poltronas sao duas escritas que
  // precisam acontecer juntas. Se o servidor caisse entre uma e outra, sem
  // isto ficaria um evento visivel na listagem porem com a sala vazia --
  // um dado corrompido silencioso.
  //
  // Repare que dentro do bloco usamos "tx", nunca "prisma". Usar "prisma"
  // aqui faria aquela operacao escapar da transacao e perder a protecao.
  const event = await prisma.$transaction(async (tx) => {
    const criado = await tx.event.create({
      data: { ...parsed.data, organizerId: req.user!.id },
    });

    await tx.seat.createMany({
      data: buildSeatGrid(roomRows, roomSeatsPerRow).map((assento) => ({
        ...assento,
        eventId: criado.id,
      })),
    });

    return criado;
  });

  res.status(201).json(await comDisponibilidade(event));
});

eventsRouter.use("/:eventId/seats", seatsRouter);
