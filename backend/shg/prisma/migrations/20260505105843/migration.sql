/*
  Warnings:

  - A unique constraint covering the columns `[shgUniqueId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('PENDING', 'COMPLETED');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER',
ADD COLUMN     "shgUniqueId" TEXT;

-- CreateTable
CREATE TABLE "SignupStepTracking" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "step" INTEGER NOT NULL,
    "status" "StepStatus" NOT NULL DEFAULT 'PENDING',
    "data" JSONB,
    "remark" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignupStepTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IDSequence" (
    "id" SERIAL NOT NULL,
    "type" "UserType" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "IDSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SignupStepTracking_userId_step_key" ON "SignupStepTracking"("userId", "step");

-- CreateIndex
CREATE UNIQUE INDEX "IDSequence_type_key" ON "IDSequence"("type");

-- CreateIndex
CREATE UNIQUE INDEX "User_shgUniqueId_key" ON "User"("shgUniqueId");

-- AddForeignKey
ALTER TABLE "SignupStepTracking" ADD CONSTRAINT "SignupStepTracking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
