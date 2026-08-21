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
const CONTAS = [
  { name: "Ana Organizadora", email: "organizador@gmail.com", role: "ORGANIZER" as const },
  { name: "Carlos Cliente",   email: "cliente1@gmail.com",    role: "CLIENT" as const },
  { name: "Beatriz Cliente",  email: "cliente2@gmail.com",    role: "CLIENT" as const },
  { name: "Paulo Portaria",   email: "portaria@gmail.com",    role: "GATE" as const },
  { name: "Lucia da Loja",    email: "loja@gmail.com",        role: "STORE" as const },
];

/**
 * Cria as contas que faltam, uma a uma.
 *
 * O upsert por e-mail e proposital: a versao anterior conferia se o
 * organizador existia e, em caso afirmativo, pulava o bloco inteiro. Quando a
 * loja entrou no projeto, isso significaria que nenhum banco JA EXISTENTE --
 * inclusive o de producao, que roda o seed a cada boot -- ganharia a conta
 * nova. Contas futuras entram sozinhas por este mesmo caminho.
 */
async function criarUsuarios() {
  const senha = await bcrypt.hash("12345678", 10);

  for (const conta of CONTAS) {
    await prisma.user.upsert({
      where: { email: conta.email },
      // Nada a atualizar: se a conta ja existe, a senha pode ter sido trocada
      // e nao cabe ao seed desfazer isso.
      update: {},
      create: { ...conta, password: senha },
    });
  }

  console.log("Contas de teste disponiveis (senha: 12345678):");
  for (const conta of CONTAS) {
    console.log(`  ${conta.email.padEnd(22)} (${conta.role})`);
  }
}

/**
 * O cardapio da lojinha.
 *
 * Este SIM e semeado, ao contrario das sessoes: a bomboniere de um cinema e
 * infraestrutura da casa, nao conteudo que o organizador cria. Sem ela, o
 * fluxo de compra nao teria o que oferecer.
 */
async function criarProdutos() {
  const jaExiste = await prisma.product.count();

  if (jaExiste > 0) {
    console.log("Produtos ja existem, pulando.");
    return;
  }

  await prisma.product.createMany({
    data: [
      { name: "Pipoca media",                category: "PIPOCA",       price: 18 },
      { name: "Pipoca grande",               category: "PIPOCA",       price: 24 },
      { name: "Refrigerante de cola 500ml",  category: "REFRIGERANTE", price: 12 },
      { name: "Refrigerante de guarana 500ml", category: "REFRIGERANTE", price: 12 },
      { name: "Refrigerante de laranja 500ml", category: "REFRIGERANTE", price: 12 },
      { name: "Agua sem gas 500ml",          category: "AGUA",         price: 6 },
      { name: "Agua com gas 500ml",          category: "AGUA",         price: 7 },
      { name: "Chocolate ao leite",          category: "CHOCOLATE",    price: 10 },
      { name: "Chocolate meio amargo",       category: "CHOCOLATE",    price: 10 },
      { name: "Chocolate com amendoim",      category: "CHOCOLATE",    price: 11 },
    ],
  });

  console.log("Cardapio da loja criado (10 produtos).");
}

async function main() {
  await criarUsuarios();
  await criarProdutos();
  console.log("Seed concluido.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
