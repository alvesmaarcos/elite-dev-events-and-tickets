-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "canceledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "canceledAt" TIMESTAMP(3);
