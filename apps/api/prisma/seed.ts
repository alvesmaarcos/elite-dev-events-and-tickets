import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

/**
 * Popula o banco apenas com as CONTAS de teste.
 *
 * Sessoes e ingressos nao sao semeados de proposito: o organizador cria as
 * sessoes a partir do catalogo real da TMDb, e o cliente compra por elas.
 * Um evento ficticio ("Filme 2", sala inventada) so atrapalharia a
 * demonstracao e nao representa nada do fluxo real.
 *
 * O seed e idempotente: rodar de novo nao duplica nada, o que importa porque
 * o Docker e o Render o executam a cada inicializacao.
 */
async function criarUsuarios() {
  const jaExiste = await prisma.user.findUnique({
    where: { email: "organizador@gmail.com" },
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
  console.log("  organizador@gmail.com  (ORGANIZER)");
  console.log("  cliente1@gmail.com     (CLIENT)");
  console.log("  cliente2@gmail.com     (CLIENT)");
  console.log("  portaria@gmail.com     (GATE)");
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
