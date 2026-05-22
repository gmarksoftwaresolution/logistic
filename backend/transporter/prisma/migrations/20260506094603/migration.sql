/*
  Warnings:

  - You are about to drop the column `status` on the `Transporter` table. All the data in the column will be lost.
  - You are about to drop the column `uniqueId` on the `Transporter` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[requestId]` on the table `Transporter` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[transporterUniqueId]` on the table `Transporter` will be added. If there are existing duplicate values, this will fail.
  - The required column `requestId` was added to the `Transporter` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('TRANSPORTER', 'SUPER_ADMIN');

-- DropIndex
DROP INDEX "Transporter_uniqueId_key";

-- AlterTable
ALTER TABLE "Transporter" DROP COLUMN "status",
DROP COLUMN "uniqueId",
ADD COLUMN     "applicationStatus" "TransporterStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "requestId" TEXT NOT NULL,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'TRANSPORTER',
ADD COLUMN     "transporterUniqueId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transporter_requestId_key" ON "Transporter"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Transporter_transporterUniqueId_key" ON "Transporter"("transporterUniqueId");
