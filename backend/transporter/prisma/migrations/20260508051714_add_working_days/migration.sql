-- AlterTable
ALTER TABLE "MilkVanRouteDetails" ADD COLUMN     "workingDays" JSONB;

-- AlterTable
ALTER TABLE "RouteDetails" ADD COLUMN     "workingDays" JSONB,
ALTER COLUMN "pickupLocations" DROP NOT NULL,
ALTER COLUMN "dropLocations" DROP NOT NULL;
