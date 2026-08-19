-- Esta migration foi ajustada a mao (gerada com --create-only).
--
-- O Prisma sozinho geraria "ADD COLUMN ... INTEGER NOT NULL" sem default, o
-- que e impossivel quando a tabela ja tem linhas: o banco nao saberia o que
-- colocar nos eventos que ja existem.
--
-- A solucao em 3 passos abaixo e o padrao para adicionar coluna obrigatoria
-- em tabela com dados, e funciona tanto aqui quanto em producao.

-- CreateEnum
CREATE TYPE "SeatStatus" AS ENUM ('AVAILABLE', 'HELD', 'SOLD');

-- ---------------------------------------------------------------------------
-- Passo 1: criar as colunas COM um valor padrao.
-- Assim os eventos que ja existem recebem uma sala de 8x12 automaticamente.
-- ---------------------------------------------------------------------------
ALTER TABLE "Event" ADD COLUMN     "roomRows" INTEGER NOT NULL DEFAULT 8,
ADD COLUMN     "roomSeatsPerRow" INTEGER NOT NULL DEFAULT 12;

-- ---------------------------------------------------------------------------
-- Passo 2: remover o valor padrao.
-- O schema.prisma nao declara @default nessas colunas -- todo evento novo
-- precisa informar o tamanho da sala. Se o default continuasse no banco, o
-- Prisma acusaria diferenca entre o schema e o banco na proxima migration.
-- ---------------------------------------------------------------------------
ALTER TABLE "Event" ALTER COLUMN "roomRows" DROP DEFAULT;
ALTER TABLE "Event" ALTER COLUMN "roomSeatsPerRow" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Seat" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "row" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "status" "SeatStatus" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "Seat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Seat_eventId_label_key" ON "Seat"("eventId", "label");

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Passo 3: gerar as poltronas dos eventos que ja existiam.
-- Sem isto, um evento antigo teria "sala 8x12" no papel e nenhuma poltrona de
-- verdade -- o mapa apareceria vazio na tela.
--
-- chr(64 + 1) = 'A', chr(64 + 2) = 'B', ... exatamente a mesma convencao da
-- funcao buildSeatGrid() do back-end.
--
-- Num banco novo (deploy do zero) a tabela Event esta vazia e este comando
-- simplesmente nao insere nada.
-- ---------------------------------------------------------------------------
INSERT INTO "Seat" ("id", "eventId", "row", "number", "label")
SELECT
    gen_random_uuid()::text,
    e."id",
    chr(64 + fileira),
    assento,
    chr(64 + fileira) || assento::text
FROM "Event" e
CROSS JOIN LATERAL generate_series(1, e."roomRows") AS fileira
CROSS JOIN LATERAL generate_series(1, e."roomSeatsPerRow") AS assento;
