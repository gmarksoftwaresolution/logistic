-- CreateEnum
CREATE TYPE "TransporterStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VehicleCategory" AS ENUM ('MILK_VAN', 'PERSONAL');

-- CreateTable
CREATE TABLE "Transporter" (
    "id" TEXT NOT NULL,
    "uniqueId" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "password" TEXT,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "status" "TransporterStatus" NOT NULL DEFAULT 'PENDING',
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "vehicleCategory" "VehicleCategory",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transporter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalDetails" (
    "id" TEXT NOT NULL,
    "transporterId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "residentialAddress" TEXT NOT NULL,
    "pinCode" TEXT NOT NULL,
    "profilePhoto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrivingDetails" (
    "id" TEXT NOT NULL,
    "transporterId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "licensePhoto" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "experienceYears" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrivingDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankDetails" (
    "id" TEXT NOT NULL,
    "transporterId" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "ifscCode" TEXT NOT NULL,
    "branchName" TEXT,
    "upiId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilkVanDetails" (
    "id" TEXT NOT NULL,
    "transporterId" TEXT NOT NULL,
    "sangathanName" TEXT NOT NULL,
    "centerName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilkVanDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDetails" (
    "id" TEXT NOT NULL,
    "transporterId" TEXT NOT NULL,
    "wheeler" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "rcUpload" TEXT NOT NULL,
    "insuranceUpload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteDetails" (
    "id" TEXT NOT NULL,
    "transporterId" TEXT NOT NULL,
    "operatingArea" TEXT NOT NULL,
    "pickupLocations" TEXT NOT NULL,
    "dropLocations" TEXT NOT NULL,
    "workingTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilkVanRouteDetails" (
    "id" TEXT NOT NULL,
    "transporterId" TEXT NOT NULL,
    "routeFrom" TEXT NOT NULL,
    "routeTo" TEXT NOT NULL,
    "morningShiftTime" TEXT NOT NULL,
    "eveningShiftTime" TEXT NOT NULL,
    "daysAvailable" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilkVanRouteDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransporterSequence" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TransporterSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transporter_uniqueId_key" ON "Transporter"("uniqueId");

-- CreateIndex
CREATE UNIQUE INDEX "Transporter_phoneNumber_key" ON "Transporter"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalDetails_transporterId_key" ON "PersonalDetails"("transporterId");

-- CreateIndex
CREATE UNIQUE INDEX "DrivingDetails_transporterId_key" ON "DrivingDetails"("transporterId");

-- CreateIndex
CREATE UNIQUE INDEX "BankDetails_transporterId_key" ON "BankDetails"("transporterId");

-- CreateIndex
CREATE UNIQUE INDEX "MilkVanDetails_transporterId_key" ON "MilkVanDetails"("transporterId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleDetails_transporterId_key" ON "VehicleDetails"("transporterId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteDetails_transporterId_key" ON "RouteDetails"("transporterId");

-- CreateIndex
CREATE UNIQUE INDEX "MilkVanRouteDetails_transporterId_key" ON "MilkVanRouteDetails"("transporterId");

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
