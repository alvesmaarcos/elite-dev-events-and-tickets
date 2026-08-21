import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { parseQrPayload, verifySignature } from "../lib/qr";
import { OPCOES_PIPOCA, ROTULO_OPCAO, OpcaoPipoca } from "../domain/store";

export const storeRouter = Router();

/** Traduz a opcao guardada no banco para o que o balcao precisa ler. */
export function descreverOpcao(opcao: string | null) {
  if (!opcao) return null;
  return ROTULO_OPCAO[opcao as OpcaoPipoca] ?? opcao;
}

/**
 * O cardapio.
 *
 * Aberto a qualquer usuario autenticado: o cliente monta o combo no checkout,
 * e a loja consulta os mesmos precos. Nao ha nada de sensivel numa lista de
 * precos que ja esta na parede do cinema.
 */
storeRouter.get("/products", requireAuth, async (_req, res) => {
  const produtos = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { price: "asc" }],
  });

  res.json({
    products: produtos,
    // As opcoes viajam junto com o cardapio para o front nao ter uma segunda
    // copia da regra. Se um dia surgir pipoca de caramelo, ela aparece na
    // tela sem tocar no codigo do cliente.
    opcoesPipoca: OPCOES_PIPOCA.map((valor) => ({
      valor,
      rotulo: ROTULO_OPCAO[valor],
    })),
  });
});

const buscaSchema = z.object({ payload: z.string().min(1) });

/**
 * O balcao le o MESMO QR do ingresso.
 *
 * O cliente nao ganha um segundo codigo para guardar: o ingresso identifica a
 * compra, e a compra e que carrega o combo. A portaria pergunta "pode
 * entrar?"; a loja pergunta "o que esta pessoa comprou?" -- mesma chave,
 * perguntas diferentes.
 */
storeRouter.post("/lookup", requireAuth, requireRole("STORE"), async (req, res) => {
  const parsed = buscaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Informe o codigo do ingresso." });
    return;
  }

  const bruto = parsed.data.payload.trim();
  const partes = parseQrPayload(bruto);
  const code = partes ? partes.code : bruto;

  const ticket = await prisma.ticket.findUnique({
    where: { code },
    include: {
      seat: true,
      reservation: {
        include: {
          client: true,
          event: true,
          items: { include: { product: true }, orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!ticket) {
    res.json({ result: "INVALIDO", reason: "Codigo nao encontrado." });
    return;
  }

  if (partes && !verifySignature(partes.code, partes.signature)) {
    res.json({
      result: "INVALIDO",
      reason: "Assinatura invalida (possivel falsificacao).",
    });
    return;
  }

  const { reservation } = ticket;

  if (reservation.items.length === 0) {
    res.json({
      result: "SEM_PEDIDO",
      reason: "Esta compra nao tem itens da loja.",
      cliente: reservation.client.name,
      sessao: reservation.event.title,
    });
    return;
  }

  // Ingresso cancelado nao impede a retirada por si so: o combo pertence a
  // COMPRA. So quando a compra inteira caiu e que nao ha o que entregar.
  const ativos = await prisma.ticket.count({
    where: { reservationId: reservation.id, status: { not: "CANCELED" } },
  });

  if (ativos === 0 || reservation.event.canceledAt) {
    res.json({
      result: "REEMBOLSADO",
      reason: "A compra foi cancelada, e o combo foi reembolsado junto.",
      cliente: reservation.client.name,
      sessao: reservation.event.title,
    });
    return;
  }

  res.json({
    result: "PEDIDO",
    reservationId: reservation.id,
    cliente: reservation.client.name,
    sessao: reservation.event.title,
    poltrona: ticket.seat.label,
    itens: reservation.items.map((item) => ({
      id: item.id,
      nome: item.product.name,
      categoria: item.product.category,
      opcao: descreverOpcao(item.option),
      quantidade: item.quantity,
      total: item.quantity * item.unitPrice,
      entregueEm: item.deliveredAt,
    })),
    pendentes: reservation.items.filter((i) => !i.deliveredAt).length,
  });
});

const entregaSchema = z.object({ reservationId: z.string().min(1) });

storeRouter.post("/deliver", requireAuth, requireRole("STORE"), async (req, res) => {
  const parsed = entregaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Informe o pedido." });
    return;
  }

  // Escrita condicional, como na portaria: se dois balcoes lerem o mesmo QR
  // ao mesmo tempo, so um marca a entrega -- o outro recebe count 0 e sabe
  // que o combo ja saiu.
  const marcados = await prisma.orderItem.updateMany({
    where: { reservationId: parsed.data.reservationId, deliveredAt: null },
    data: { deliveredAt: new Date() },
  });

  if (marcados.count === 0) {
    res.status(409).json({
      error: "Este pedido ja tinha sido entregue.",
    });
    return;
  }

  res.json({ entregues: marcados.count });
});
