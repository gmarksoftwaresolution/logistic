/*
  Warnings:

  - The primary key for the `BankDetails` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `BankDetails` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `DrivingDetails` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `DrivingDetails` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `MilkVanDetails` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `MilkVanDetails` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `MilkVanRouteDetails` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `MilkVanRouteDetails` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `PersonalDetails` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `PersonalDetails` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `RouteDetails` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `RouteDetails` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Transporter` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Transporter` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `requestId` column on the `Transporter` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `VehicleDetails` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `VehicleDetails` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `transporterId` on the `BankDetails` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `transporterId` on the `DrivingDetails` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `transporterId` on the `MilkVanDetails` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `transporterId` on the `MilkVanRouteDetails` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `transporterId` on the `PersonalDetails` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `transporterId` on the `RouteDetails` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `transporterId` on the `VehicleDetails` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "BankDetails" DROP CONSTRAINT "BankDetails_transporterId_fkey";

-- DropForeignKey
ALTER TABLE "DrivingDetails" DROP CONSTRAINT "DrivingDetails_transporterId_fkey";

-- DropForeignKey
ALTER TABLE "MilkVanDetails" DROP CONSTRAINT "MilkVanDetails_transporterId_fkey";

-- DropForeignKey
ALTER TABLE "MilkVanRouteDetails" DROP CONSTRAINT "MilkVanRouteDetails_transporterId_fkey";

-- DropForeignKey
ALTER TABLE "PersonalDetails" DROP CONSTRAINT "PersonalDetails_transporterId_fkey";

-- DropForeignKey
ALTER TABLE "RouteDetails" DROP CONSTRAINT "RouteDetails_transporterId_fkey";

-- DropForeignKey
ALTER TABLE "VehicleDetails" DROP CONSTRAINT "VehicleDetails_transporterId_fkey";

-- AlterTable
ALTER TABLE "BankDetails" DROP CONSTRAINT "BankDetails_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "transporterId",
ADD COLUMN     "transporterId" INTEGER NOT NULL,
ADD CONSTRAINT "BankDetails_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "DrivingDetails" DROP CONSTRAINT "DrivingDetails_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "transporterId",
ADD COLUMN     "transporterId" INTEGER NOT NULL,
ADD CONSTRAINT "DrivingDetails_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "MilkVanDetails" DROP CONSTRAINT "MilkVanDetails_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "transporterId",
ADD COLUMN     "transporterId" INTEGER NOT NULL,
ADD CONSTRAINT "MilkVanDetails_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "MilkVanRouteDetails" DROP CONSTRAINT "MilkVanRouteDetails_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "transporterId",
ADD COLUMN     "transporterId" INTEGER NOT NULL,
ADD CONSTRAINT "MilkVanRouteDetails_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "PersonalDetails" DROP CONSTRAINT "PersonalDetails_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "transporterId",
ADD COLUMN     "transporterId" INTEGER NOT NULL,
ADD CONSTRAINT "PersonalDetails_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "RouteDetails" DROP CONSTRAINT "RouteDetails_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "transporterId",
ADD COLUMN     "transporterId" INTEGER NOT NULL,
ADD CONSTRAINT "RouteDetails_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Transporter" DROP CONSTRAINT "Transporter_pkey",
ADD COLUMN     "language" TEXT DEFAULT 'English',
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "currentStep" SET DEFAULT 0,
DROP COLUMN "requestId",
ADD COLUMN     "requestId" SERIAL NOT NULL,
ADD CONSTRAINT "Transporter_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "VehicleDetails" DROP CONSTRAINT "VehicleDetails_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "transporterId",
ADD COLUMN     "transporterId" INTEGER NOT NULL,
ADD CONSTRAINT "VehicleDetails_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "BankDetails_transporterId_key" ON "BankDetails"("transporterId");

-- CreateIndex
CREATE UNIQUE INDEX "DrivingDetails_transporterId_key" ON "DrivingDetails"("transporterId");

-- CreateIndex
CREATE UNIQUE INDEX "MilkVanDetails_transporterId_key" ON "MilkVanDetails"("transporterId");

-- CreateIndex
CREATE UNIQUE INDEX "MilkVanRouteDetails_transporterId_key" ON "MilkVanRouteDetails"("transporterId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalDetails_transporterId_key" ON "PersonalDetails"("transporterId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteDetails_transporterId_key" ON "RouteDetails"("transporterId");

-- CreateIndex
CREATE UNIQUE INDEX "Transporter_requestId_key" ON "Transporter"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleDetails_transporterId_key" ON "VehicleDetails"("transporterId");

-- AddForeignKey
ALTER TABLE "PersonalDetails" ADD CONSTRAINT "PersonalDetails_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "Transporter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrivingDetails" ADD CONSTRAINT "DrivingDetails_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "Transporter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankDetails" ADD CONSTRAINT "BankDetails_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "Transporter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilkVanDetails" ADD CONSTRAINT "MilkVanDetails_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "Transporter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDetails" ADD CONSTRAINT "VehicleDetails_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "Transporter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteDetails" ADD CONSTRAINT "RouteDetails_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "Transporter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilkVanRouteDetails" ADD CONSTRAINT "MilkVanRouteDetails_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "Transporter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
