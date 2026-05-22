/*
  Warnings:

  - You are about to drop the column `crpContact` on the `ShgDetail` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ShgDetail" DROP COLUMN "crpContact",
ADD COLUMN     "crpMobile" TEXT;

-- CreateTable
CREATE TABLE "BusinessDetail" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "producesProduct" BOOLEAN NOT NULL DEFAULT false,
    "businessTeamSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessDetail_userId_key" ON "BusinessDetail"("userId");

-- AddForeignKey
ALTER TABLE "BusinessDetail" ADD CONSTRAINT "BusinessDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
