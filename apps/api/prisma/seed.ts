import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

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

  await prisma.event.create({
    data: {
      title: "Filme 2",
      description: "Filme com pipoca.",
      externalSource: "tmdb",
      externalId: "mock-1",
      date: dataDoEvento,
      location: "Cine Centro, Sala 3",
      price: 35,
      organizerId,
    },
  });

  console.log("Evento de exemplo criado.");
}

async function main() {
  const organizador = await criarUsuarios();
  await criarEvento(organizador.id);
  console.log("Seed concluido.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
