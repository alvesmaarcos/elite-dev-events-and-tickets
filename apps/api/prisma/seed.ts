import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function criarUsuarios() {
  const jaExiste = await prisma.user.findUnique({
    where: { email: "organizador@elite.dev" },
  });
  if (jaExiste) {
    console.log("Usuarios ja existem, pulando.");
    return;
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
  console.log("  organizador@elite.dev  (ORGANIZER)");
  console.log("  cliente1@elite.dev     (CLIENT)");
  console.log("  cliente2@elite.dev     (CLIENT)");
  console.log("  portaria@elite.dev     (GATE)");
}

async function main() {
  await criarUsuarios();
  console.log("Seed concluido.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
