-- AlterTable
ALTER TABLE "MilkVanRouteDetails" ADD COLUMN     "workingSchedule" JSONB;

-- AlterTable
ALTER TABLE "RouteDetails" ADD COLUMN     "workingSchedule" JSONB;

-- AlterTable
ALTER TABLE "Transporter" ADD COLUMN     "refreshToken" TEXT;
