-- AlterTable
ALTER TABLE "Seat" ADD COLUMN     "holdByUserId" TEXT,
ADD COLUMN     "holdExpiresAt" TIMESTAMP(3);
