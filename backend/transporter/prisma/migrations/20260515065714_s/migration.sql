/*
  Warnings:

  - You are about to drop the column `routeFrom` on the `MilkVanRouteDetails` table. All the data in the column will be lost.
  - You are about to drop the column `routeTo` on the `MilkVanRouteDetails` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MilkVanRouteDetails" DROP COLUMN "routeFrom",
DROP COLUMN "routeTo",
ADD COLUMN     "assignedVillages" TEXT[];
