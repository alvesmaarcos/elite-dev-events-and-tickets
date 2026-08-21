import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { seatsRouter } from "./seats";
import { optionalAuth } from "../middleware/auth";
import { liberarReservasVencidas } from "./seats";
import { buildSeatGrid } from "../domain/seats";
import { montarRelatorio } from "../domain/report";

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
    where: {
      // Evento cancelado some da vitrine publica -- mas continua visivel
      // para o organizador, em /mine/list.
      canceledAt: null,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { location: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
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

  // hasSold e o que permite a tela ESCONDER os campos restritos, em vez de
  // deixar o organizador preencher e tomar um 409 depois.
  const resultado = await Promise.all(
    events.map(async (evento) => {
      const comDados = await comDisponibilidade(evento);

      const vendidos = await prisma.seat.count({
        where: { eventId: evento.id, status: "SOLD" },
      });

      return {
        ...comDados,
        hasSold: vendidos > 0,
        canceled: Boolean(evento.canceledAt),
        closed: Boolean(evento.closedAt),
      };
    })
  );

  res.json(resultado);
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

// ---------------------------------------------------------------------------
// Gestao do evento pelo organizador
// ---------------------------------------------------------------------------

const editEventSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  date: z.coerce.date().optional(),
  location: z.string().min(2).optional(),
  price: z.coerce.number().nonnegative().optional(),
  roomRows: z.coerce.number().int().positive().max(26).optional(),
  roomSeatsPerRow: z.coerce.number().int().positive().max(60).optional(),
});

// Lista de PERMITIDOS, nao de proibidos: quando o evento ganhar campos novos
// no futuro, eles ja nascem restritos depois da primeira venda. Uma lista de
// proibidos precisaria ser lembrada e atualizada a cada campo novo.
const CAMPOS_SEMPRE_EDITAVEIS = ["date", "location", "description"];

eventsRouter.patch("/:id", requireAuth, requireRole("ORGANIZER"), async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: String(req.params.id) } });

  if (!event) {
    res.status(404).json({ error: "Evento nao encontrado." });
    return;
  }
  if (event.organizerId !== req.user!.id) {
    res.status(403).json({ error: "Voce nao organiza este evento." });
    return;
  }
  if (event.canceledAt) {
    res.status(409).json({ error: "Evento cancelado nao pode ser editado." });
    return;
  }

  const parsed = editEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Dados invalidos.",
      detalhes: parsed.error.issues.map((p) => ({
        campo: p.path.join(".") || "(corpo da requisicao)",
        motivo: p.message,
      })),
    });
    return;
  }

  const vendidos = await prisma.seat.count({
    where: { eventId: event.id, status: "SOLD" },
  });

  const camposEnviados = Object.keys(parsed.data);
  const mexeEmCampoRestrito = camposEnviados.some(
    (campo) => !CAMPOS_SEMPRE_EDITAVEIS.includes(campo)
  );

  // Depois que alguem pagou, mudar preco ou encolher a sala quebraria a
  // expectativa de quem comprou -- a poltrona dele poderia ate deixar de
  // existir. A regra protege o cliente, nao o codigo.
  if (vendidos > 0 && mexeEmCampoRestrito) {
    res.status(409).json({
      error: "Ja ha ingressos vendidos: so e possivel alterar data, local e descricao.",
    });
    return;
  }

  const { roomRows, roomSeatsPerRow, ...demais } = parsed.data;
  const mudouASala = roomRows !== undefined || roomSeatsPerRow !== undefined;

  const atualizado = await prisma.$transaction(async (tx) => {
    await tx.event.update({ where: { id: event.id }, data: demais });

    if (mudouASala) {
      const linhas = roomRows ?? event.roomRows;
      const porFileira = roomSeatsPerRow ?? event.roomSeatsPerRow;

      // Só chega aqui se NAO ha vendas (a regra acima ja garantiu), entao
      // nao ha nada a preservar: recriar e mais simples e mais confiavel do
      // que calcular quais poltronas acrescentar ou remover.
      await tx.seat.deleteMany({ where: { eventId: event.id } });
      await tx.seat.createMany({
        data: buildSeatGrid(linhas, porFileira).map((assento) => ({
          ...assento,
          eventId: event.id,
        })),
      });

      return tx.event.update({
        where: { id: event.id },
        data: { roomRows: linhas, roomSeatsPerRow: porFileira },
      });
    }

    return tx.event.findUniqueOrThrow({ where: { id: event.id } });
  });

  res.json(await comDisponibilidade(atualizado));
});

eventsRouter.post("/:id/cancel", requireAuth, requireRole("ORGANIZER"), async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: String(req.params.id) } });

  if (!event) {
    res.status(404).json({ error: "Evento nao encontrado." });
    return;
  }
  if (event.organizerId !== req.user!.id) {
    res.status(403).json({ error: "Voce nao organiza este evento." });
    return;
  }
  if (event.canceledAt) {
    res.status(409).json({ error: "Este evento ja esta cancelado." });
    return;
  }

  const agora = new Date();

  // As tres operacoes juntas: um evento marcado como cancelado com ingressos
  // ainda validos deixaria a portaria liberando entrada para uma sessao que
  // nao vai acontecer.
  await prisma.$transaction([
    prisma.event.update({
      where: { id: event.id },
      data: { canceledAt: agora },
    }),
    // status VALID no filtro: ingressos ja utilizados ficam como estao. A
    // pessoa entrou; reescrever a historia dela seria errado.
    prisma.ticket.updateMany({
      where: { seat: { eventId: event.id }, status: "VALID" },
      data: { status: "CANCELED", canceledAt: agora },
    }),
    prisma.seat.updateMany({
      where: { eventId: event.id },
      data: { status: "AVAILABLE", holdExpiresAt: null, holdByUserId: null },
    }),
  ]);

  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Encerramento da sessao e relatorio final
// ---------------------------------------------------------------------------

/**
 * Encerrar NAO e o mesmo que cancelar.
 *
 *   cancelar  -> a sessao nao vai acontecer; ingressos sao invalidados e as
 *                poltronas liberadas.
 *   encerrar  -> a sessao aconteceu e acabou; nada mais muda. E o que torna
 *                o relatorio final estavel: sem isso, alguem poderia comprar
 *                ou validar um ingresso depois do relatorio emitido, e os
 *                numeros deixariam de bater.
 */
eventsRouter.post("/:id/close", requireAuth, requireRole("ORGANIZER"), async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: String(req.params.id) } });

  if (!event) {
    res.status(404).json({ error: "Evento nao encontrado." });
    return;
  }
  if (event.organizerId !== req.user!.id) {
    res.status(403).json({ error: "Voce nao organiza este evento." });
    return;
  }
  if (event.canceledAt) {
    res.status(409).json({ error: "Evento cancelado nao pode ser encerrado." });
    return;
  }
  if (event.closedAt) {
    res.status(409).json({ error: "Este evento ja foi encerrado." });
    return;
  }

  await prisma.$transaction([
    prisma.event.update({
      where: { id: event.id },
      data: { closedAt: new Date() },
    }),
    // Reservas temporarias em aberto perdem o sentido: ninguem mais paga.
    prisma.seat.updateMany({
      where: { eventId: event.id, status: "HELD" },
      data: { status: "AVAILABLE", holdExpiresAt: null, holdByUserId: null },
    }),
  ]);

  res.json({ ok: true });
});

eventsRouter.get("/:id/report", requireAuth, requireRole("ORGANIZER"), async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: String(req.params.id) } });

  if (!event) {
    res.status(404).json({ error: "Evento nao encontrado." });
    return;
  }
  if (event.organizerId !== req.user!.id) {
    res.status(403).json({ error: "Voce nao organiza este evento." });
    return;
  }

  const tickets = await prisma.ticket.findMany({
    where: { seat: { eventId: event.id } },
    include: { reservation: true },
  });

  const relatorio = montarRelatorio(
    tickets.map((t) => ({ status: t.status, clientId: t.reservation.clientId })),
    event.price,
    event.roomRows * event.roomSeatsPerRow
  );

  res.json({
    evento: {
      id: event.id,
      title: event.title,
      date: event.date,
      location: event.location,
      price: event.price,
      encerrado: Boolean(event.closedAt),
      closedAt: event.closedAt,
      cancelado: Boolean(event.canceledAt),
    },
    ...relatorio,
  });
});
