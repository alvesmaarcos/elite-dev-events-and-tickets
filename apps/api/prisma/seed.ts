import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { buildSeatGrid } from "../src/domain/seats";
import crypto from "crypto";

async function criarUsuarios() {
  const jaExiste = await prisma.user.findUnique({
    where: { email: "organizador@gmail.com" },
  });
  if (jaExiste) {
    console.log("Usuarios ja existem, pulando.");
    return jaExiste;
  }

  const senha = await bcrypt.hash("12345678", 10);

  await prisma.user.createMany({
    data: [
      { name: "Ana Organizadora", email: "organizador@gmail.com", password: senha, role: "ORGANIZER" },
      { name: "Carlos Cliente",   email: "cliente1@gmail.com",    password: senha, role: "CLIENT" },
      { name: "Beatriz Cliente",  email: "cliente2@gmail.com",    password: senha, role: "CLIENT" },
      { name: "Paulo Portaria",   email: "portaria@gmail.com",    password: senha, role: "GATE" },
    ],
  });

  console.log("Usuarios criados (senha: 12345678):");
  console.log("  organizador@gmail.com  (ORGANIZER)");
  console.log("  cliente1@gmail.com     (CLIENT)");
  console.log("  cliente2@gmail.com     (CLIENT)");
  console.log("  portaria@gmail.com     (GATE)");

  return prisma.user.findUniqueOrThrow({
    where: { email: "organizador@gmail.com" },
  });
}

async function criarEvento(organizerId: string) {
  const jaExiste = await prisma.event.findFirst({
    where: { organizerId, externalId: "mock-1" },
  });
  if (jaExiste) return;

  const dataDoEvento = new Date();
  dataDoEvento.setDate(dataDoEvento.getDate() + 14);

  const roomRows = 8;
  const roomSeatsPerRow = 12;

  const event = await prisma.event.create({
    data: {
      title: "Duna: Parte Dois - Sessao Especial",
      description: "Exibicao especial com pipoca inclusa.",
      externalSource: "tmdb",
      externalId: "mock-1",
      date: dataDoEvento,
      location: "Cine Centro, Sala 3",
      price: 35,
      roomRows,
      roomSeatsPerRow,
      organizerId,
    },
  });

  await prisma.seat.createMany({
    data: buildSeatGrid(roomRows, roomSeatsPerRow).map((assento) => ({
      ...assento,
      eventId: event.id,
    })),
  });

  console.log(`Evento de exemplo criado (sala ${roomRows}x${roomSeatsPerRow}).`);
}

async function criarIngressoDeExemplo() {
  const event = await prisma.event.findFirst({ where: { externalId: "mock-1" } });
  if (!event) return;

  const jaExiste = await prisma.reservation.findFirst({ where: { eventId: event.id } });
  if (jaExiste) return;

  const cliente = await prisma.user.findUniqueOrThrow({
    where: { email: "cliente1@gmail.com" },
  });

  const assento = await prisma.seat.findFirstOrThrow({
    where: { eventId: event.id, label: "A1" },
  });

  await prisma.seat.update({
    where: { id: assento.id },
    data: { status: "SOLD" },
  });

  const reservation = await prisma.reservation.create({
    data: { eventId: event.id, clientId: cliente.id },
  });

  const code = crypto.randomUUID();
  const signature = crypto
    .createHmac("sha256", process.env.QR_SECRET || "dev-qr-secret-trocar-em-producao")
    .update(code)
    .digest("hex");

  await prisma.ticket.create({
    data: { reservationId: reservation.id, seatId: assento.id, code, signature },
  });

  console.log(`Ingresso de exemplo: poltrona A1, codigo ${code}`);
}

async function main() {
  const organizador = await criarUsuarios();
  await criarEvento(organizador.id);
  await criarIngressoDeExemplo();          
  console.log("Seed concluido.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
