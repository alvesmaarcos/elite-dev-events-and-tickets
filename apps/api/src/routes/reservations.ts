import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { buildQrPayload, generateTicketCode, signCode } from "../lib/qr";
import { validarEscolha, CategoriaProduto } from "../domain/store";
import { descreverOpcao } from "./store";

export const reservationsRouter = Router();

const checkoutSchema = z.object({
  eventId: z.string().min(1),
  seatLabels: z.array(z.string().min(1)).min(1),
  outcome: z.enum(["approve", "decline"]),
  // O combo da lojinha, escolhido antes de pagar. Ausente = so o ingresso.
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        option: z.string().nullish(),
        quantity: z.number().int(),
      })
    )
    .optional(),
});

class ReservaExpirada extends Error {}

reservationsRouter.post("/", requireAuth, requireRole("CLIENT"), async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados do pagamento invalidos." });
    return;
  }

  const { eventId, seatLabels, outcome } = parsed.data;
  const itensPedidos = parsed.data.items ?? [];
  const userId = req.user!.id;

  // Sessao encerrada nao aceita mais pagamento -- e o que mantem o relatorio
  // final estavel depois de emitido. A recusa continua permitida, para o
  // cliente conseguir liberar poltronas que ainda estivessem seguradas.
  if (outcome === "approve") {
    const event = await prisma.event.findUnique({ where: { id: eventId } });

    if (!event) {
      res.status(404).json({ error: "Evento nao encontrado." });
      return;
    }
    if (event.closedAt) {
      res.status(409).json({ error: "Esta sessao ja foi encerrada." });
      return;
    }
    if (event.canceledAt) {
      res.status(409).json({ error: "Esta sessao foi cancelada." });
      return;
    }
  }

  // O combo e conferido ANTES de tocar nas poltronas: um erro de digitacao
  // no pedido nao pode deixar o cliente com assentos vendidos e sem pipoca --
  // nem com uma transacao pela metade.
  const produtos = itensPedidos.length
    ? await prisma.product.findMany({
        where: { id: { in: itensPedidos.map((i) => i.productId) }, active: true },
      })
    : [];

  for (const item of itensPedidos) {
    const produto = produtos.find((p) => p.id === item.productId);

    if (!produto) {
      res.status(400).json({ error: "Produto indisponivel no cardapio." });
      return;
    }

    const problema = validarEscolha(
      produto.category as CategoriaProduto,
      item.option,
      item.quantity
    );

    if (problema) {
      res.status(400).json({ error: `${produto.name}: ${problema}` });
      return;
    }
  }

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

      if (itensPedidos.length) {
        await tx.orderItem.createMany({
          data: itensPedidos.map((item) => ({
            reservationId: reservation.id,
            productId: item.productId,
            option: item.option ?? null,
            quantity: item.quantity,
            // Preco copiado do CARDAPIO, nunca do que o navegador mandou.
            unitPrice: produtos.find((p) => p.id === item.productId)!.price,
          })),
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
      items: { include: { product: true }, orderBy: { createdAt: "asc" } },
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
      // O cliente precisa saber o que tem para retirar -- e com qual QR.
      itens: reserva.items.map((item) => ({
        id: item.id,
        nome: item.product.name,
        opcao: descreverOpcao(item.option),
        quantidade: item.quantity,
        total: item.quantity * item.unitPrice,
        entregueEm: item.deliveredAt,
      })),
    }))
  );
});
