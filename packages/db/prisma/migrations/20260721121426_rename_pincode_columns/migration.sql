-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SHG', 'INDIVIDUAL', 'TRANSPORTER', 'ADMIN', 'SUPER_ADMIN', 'BUYER', 'SELLER');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'UNDER_REVIEW', 'COMPLETED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('TWO_WHEELER', 'THREE_WHEELER', 'FOUR_WHEELER', 'MILK_VAN', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('FOOD', 'HANDMADE', 'AGRICULTURE', 'TEXTILE', 'DAIRY', 'OTHER');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ShgRole" AS ENUM ('CRP', 'LEADER', 'MEMBER');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "barcode" TEXT,
    "phase" TEXT NOT NULL DEFAULT 'PICKUP',
    "sellerId" INTEGER NOT NULL,
    "buyerId" INTEGER NOT NULL,
    "productCount" INTEGER NOT NULL DEFAULT 1,
    "totalQty" INTEGER NOT NULL DEFAULT 1,
    "totalWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "pickupShgId" TEXT,
    "pickupTransporterId" TEXT,
    "dropShgId" TEXT,
    "dropTransporterId" TEXT,
    "pickupReturnShgId" TEXT,
    "returnTransporterId" TEXT,
    "mainStatus" TEXT NOT NULL,
    "pickupShgStatus" TEXT,
    "pickupTransporterStatus" TEXT,
    "dropShgStatus" TEXT,
    "dropTransporterStatus" TEXT,
    "returnType" TEXT,
    "rescheduleType" TEXT,
    "rescheduleDuration" TEXT,
    "warehouseReceivedAt" TIMESTAMP(3),
    "barcodeGeneratedAt" TIMESTAMP(3),
    "storedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "rescheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAssignment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "assigneeType" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "authId" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT,
    "fullName" TEXT,
    "profilePhoto" TEXT,
    "language" TEXT DEFAULT 'English',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "profileCompletion" INTEGER NOT NULL DEFAULT 0,
    "applicationStatus" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "uniqueCode" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "houseNo" TEXT NOT NULL,
    "deliveryAddress" TEXT,
    "village" TEXT,
    "taluka" TEXT,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "postOffice" TEXT,
    "landmark" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankDetail" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "ifscCode" TEXT NOT NULL,
    "branchName" TEXT,
    "upiId" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BankDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "aadhaarNumber" TEXT,
    "panNumber" TEXT,
    "aadhaarFrontUrl" TEXT,
    "aadhaarBackUrl" TEXT,
    "panCardUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtherDetails" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "vehicleName" TEXT,
    "registrationNumber" TEXT,
    "licenseNumber" TEXT,
    "rcUrl" TEXT,
    "insuranceUrl" TEXT,
    "vehicleImageUrl" TEXT,
    "heihgt" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "storageSpace" TEXT,
    "DLurl" TEXT,
    "wheeler" TEXT,
    "minWeight" DOUBLE PRECISION,
    "maxWeight" DOUBLE PRECISION,
    "ratePerKm" DOUBLE PRECISION,
    "carryingCapacity" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OtherDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepTracking" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "step" INTEGER NOT NULL,
    "status" "StepStatus" NOT NULL DEFAULT 'PENDING',
    "data" JSONB,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StepTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShgDetail" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "fullName" TEXT,
    "shgName" TEXT,
    "shgLeaderName" TEXT,
    "shgLeaderContact" TEXT,
    "memberCode" TEXT,
    "shgRole" "ShgRole",
    "crpName" TEXT,
    "crpMobile" TEXT,
    "crpEmail" TEXT,
    "groupSize" INTEGER,
    "imgUrl" TEXT,
    "age" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShgDetail_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "TransporterDetail" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "transporterCode" TEXT,
    "vehicleCategory" "VehicleType",
    "experienceYears" INTEGER,
    "availableFullTime" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransporterDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrivingDetail" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "drivingExperience" INTEGER,
    "drivingLicenseNo" TEXT,
    "drivingLicenseUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrivingDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteDetail" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "operatingArea" TEXT NOT NULL,
    "pickupLocations" JSONB,
    "dropLocations" JSONB,
    "workingDays" JSONB,
    "workingSchedule" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilkVanDetail" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "sangathanName" TEXT NOT NULL,
    "centerName" TEXT NOT NULL,
    "assignedVillages" JSONB,
    "morningShiftTime" TEXT,
    "eveningShiftTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilkVanDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldData" JSONB,
    "newData" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OTPVerification" (
    "id" SERIAL NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OTPVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "seller_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "weight" DOUBLE PRECISION,
    "image" TEXT,
    "dailyProduction" DOUBLE PRECISION,
    "Unit" TEXT,
    "weeklyProduction" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_orders" (
    "id" SERIAL NOT NULL,
    "order_number" TEXT NOT NULL,
    "buyer_id" INTEGER NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "payment_method" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'PENDING',
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_order_items" (
    "id" SERIAL NOT NULL,
    "master_order_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "seller_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "master_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickup_orders" (
    "id" SERIAL NOT NULL,
    "pickup_order_number" TEXT,
    "master_order_id" INTEGER NOT NULL,
    "seller_id" INTEGER NOT NULL,
    "shg_id" INTEGER,
    "transporter_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "pickup_time" TIMESTAMP(3),
    "handover_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pickup_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickup_order_items" (
    "id" SERIAL NOT NULL,
    "pickup_order_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "verification_code" TEXT,
    "generated_time" TIMESTAMP(3),
    "verified_time" TIMESTAMP(3),
    "verification_status" TEXT DEFAULT 'PENDING',

    CONSTRAINT "pickup_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "address" TEXT,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_inventory" (
    "id" SERIAL NOT NULL,
    "warehouse_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER,
    "qc_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouse_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drop_orders" (
    "id" SERIAL NOT NULL,
    "drop_order_number" TEXT,
    "master_order_id" INTEGER NOT NULL,
    "buyer_id" INTEGER NOT NULL,
    "shg_id" INTEGER,
    "transporter_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "delivery_address" TEXT,
    "handover_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drop_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drop_order_items" (
    "id" SERIAL NOT NULL,
    "drop_order_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER,
    "verification_code" TEXT,
    "generated_time" TIMESTAMP(3),
    "verified_time" TIMESTAMP(3),
    "verification_status" TEXT DEFAULT 'PENDING',

    CONSTRAINT "drop_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickup_tracking" (
    "id" SERIAL NOT NULL,
    "pickup_order_id" INTEGER NOT NULL,
    "status" TEXT,
    "remarks" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pickup_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drop_tracking" (
    "id" SERIAL NOT NULL,
    "drop_order_id" INTEGER NOT NULL,
    "status" TEXT,
    "remarks" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drop_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pincode_directory" (
    "id" SERIAL NOT NULL,
    "village" TEXT NOT NULL,
    "postOffice" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "taluka" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pincode_directory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sellers" (
    "id" SERIAL NOT NULL,
    "seller_code" TEXT NOT NULL,
    "seller_name" TEXT NOT NULL,
    "mobile_number" TEXT NOT NULL,
    "email" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "village" TEXT NOT NULL,
    "taluka" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "post_office" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyers" (
    "id" SERIAL NOT NULL,
    "buyer_code" TEXT NOT NULL,
    "buyer_name" TEXT NOT NULL,
    "mobile_number" TEXT NOT NULL,
    "email" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "village" TEXT NOT NULL,
    "taluka" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "post_office" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buyers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRecord" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" INTEGER,
    "pickupOrderId" INTEGER,
    "dropOrderId" INTEGER,
    "verificationType" TEXT NOT NULL,
    "senderId" INTEGER,
    "receiverId" INTEGER,
    "generatedCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "generatedTime" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "verifiedTime" TIMESTAMP(3),
    "expiryTime" TIMESTAMP(3),
    "generatedBy" INTEGER,
    "verifiedBy" INTEGER,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanHistory" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "scanType" TEXT NOT NULL,
    "scanLocation" TEXT,
    "scannedBy" INTEGER,
    "userRole" TEXT,
    "scanResult" TEXT NOT NULL,
    "device" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parcel" (
    "parcelId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "parcelNumber" INTEGER NOT NULL,
    "totalParcels" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "weight" TEXT NOT NULL,
    "flowType" TEXT NOT NULL,
    "parcelStatus" TEXT NOT NULL,
    "currentHolderId" TEXT,
    "currentHolderType" TEXT,
    "verificationToken" TEXT NOT NULL,
    "qrCodeValue" TEXT NOT NULL,
    "qrImage" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parcel_pkey" PRIMARY KEY ("parcelId")
);

-- CreateTable
CREATE TABLE "ParcelScanHistory" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "userRole" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "currentHolder" TEXT,
    "currentStage" TEXT,
    "scanResult" TEXT NOT NULL,
    "scanTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "ParcelScanHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanSession" (
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "orderIds" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScanSession_pkey" PRIMARY KEY ("sessionId")
);

-- CreateTable
CREATE TABLE "ScanSessionItem" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanSessionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_mobileNumber_key" ON "AdminUser"("mobileNumber");

-- CreateIndex
CREATE INDEX "Order_orderId_idx" ON "Order"("orderId");

-- CreateIndex
CREATE INDEX "Order_barcode_idx" ON "Order"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "User_authId_key" ON "User"("authId");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_uniqueCode_key" ON "User"("uniqueCode");

-- CreateIndex
CREATE INDEX "User_phoneNumber_idx" ON "User"("phoneNumber");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Address_userId_key" ON "Address"("userId");

-- CreateIndex
CREATE INDEX "BankDetail_userId_idx" ON "BankDetail"("userId");

-- CreateIndex
CREATE INDEX "Document_userId_idx" ON "Document"("userId");

-- CreateIndex
CREATE INDEX "OtherDetails_userId_idx" ON "OtherDetails"("userId");

-- CreateIndex
CREATE INDEX "Application_userId_idx" ON "Application"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StepTracking_userId_step_key" ON "StepTracking"("userId", "step");

-- CreateIndex
CREATE UNIQUE INDEX "ShgDetail_userId_key" ON "ShgDetail"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessDetail_userId_key" ON "BusinessDetail"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TransporterDetail_userId_key" ON "TransporterDetail"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TransporterDetail_transporterCode_key" ON "TransporterDetail"("transporterCode");

-- CreateIndex
CREATE UNIQUE INDEX "DrivingDetail_userId_key" ON "DrivingDetail"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteDetail_userId_key" ON "RouteDetail"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MilkVanDetail_userId_key" ON "MilkVanDetail"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "OTPVerification_phoneNumber_idx" ON "OTPVerification"("phoneNumber");

-- CreateIndex
CREATE INDEX "products_seller_id_idx" ON "products"("seller_id");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE UNIQUE INDEX "master_orders_order_number_key" ON "master_orders"("order_number");

-- CreateIndex
CREATE INDEX "master_orders_buyer_id_idx" ON "master_orders"("buyer_id");

-- CreateIndex
CREATE INDEX "master_orders_status_idx" ON "master_orders"("status");

-- CreateIndex
CREATE INDEX "master_order_items_master_order_id_idx" ON "master_order_items"("master_order_id");

-- CreateIndex
CREATE INDEX "master_order_items_product_id_idx" ON "master_order_items"("product_id");

-- CreateIndex
CREATE INDEX "master_order_items_seller_id_idx" ON "master_order_items"("seller_id");

-- CreateIndex
CREATE UNIQUE INDEX "pickup_orders_pickup_order_number_key" ON "pickup_orders"("pickup_order_number");

-- CreateIndex
CREATE INDEX "pickup_orders_master_order_id_idx" ON "pickup_orders"("master_order_id");

-- CreateIndex
CREATE INDEX "pickup_orders_seller_id_idx" ON "pickup_orders"("seller_id");

-- CreateIndex
CREATE INDEX "pickup_orders_shg_id_idx" ON "pickup_orders"("shg_id");

-- CreateIndex
CREATE INDEX "pickup_orders_transporter_id_idx" ON "pickup_orders"("transporter_id");

-- CreateIndex
CREATE INDEX "pickup_orders_status_idx" ON "pickup_orders"("status");

-- CreateIndex
CREATE INDEX "pickup_order_items_pickup_order_id_idx" ON "pickup_order_items"("pickup_order_id");

-- CreateIndex
CREATE INDEX "pickup_order_items_product_id_idx" ON "pickup_order_items"("product_id");

-- CreateIndex
CREATE INDEX "warehouse_inventory_warehouse_id_idx" ON "warehouse_inventory"("warehouse_id");

-- CreateIndex
CREATE INDEX "warehouse_inventory_product_id_idx" ON "warehouse_inventory"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_inventory_warehouse_id_product_id_key" ON "warehouse_inventory"("warehouse_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "drop_orders_drop_order_number_key" ON "drop_orders"("drop_order_number");

-- CreateIndex
CREATE INDEX "drop_orders_master_order_id_idx" ON "drop_orders"("master_order_id");

-- CreateIndex
CREATE INDEX "drop_orders_buyer_id_idx" ON "drop_orders"("buyer_id");

-- CreateIndex
CREATE INDEX "drop_orders_shg_id_idx" ON "drop_orders"("shg_id");

-- CreateIndex
CREATE INDEX "drop_orders_transporter_id_idx" ON "drop_orders"("transporter_id");

-- CreateIndex
CREATE INDEX "drop_orders_status_idx" ON "drop_orders"("status");

-- CreateIndex
CREATE INDEX "drop_order_items_drop_order_id_idx" ON "drop_order_items"("drop_order_id");

-- CreateIndex
CREATE INDEX "drop_order_items_product_id_idx" ON "drop_order_items"("product_id");

-- CreateIndex
CREATE INDEX "pickup_tracking_pickup_order_id_idx" ON "pickup_tracking"("pickup_order_id");

-- CreateIndex
CREATE INDEX "drop_tracking_drop_order_id_idx" ON "drop_tracking"("drop_order_id");

-- CreateIndex
CREATE INDEX "pincode_directory_village_idx" ON "pincode_directory"("village");

-- CreateIndex
CREATE INDEX "pincode_directory_pincode_idx" ON "pincode_directory"("pincode");

-- CreateIndex
CREATE INDEX "pincode_directory_district_idx" ON "pincode_directory"("district");

-- CreateIndex
CREATE INDEX "pincode_directory_taluka_idx" ON "pincode_directory"("taluka");

-- CreateIndex
CREATE INDEX "pincode_directory_village_pincode_idx" ON "pincode_directory"("village", "pincode");

-- CreateIndex
CREATE UNIQUE INDEX "sellers_seller_code_key" ON "sellers"("seller_code");

-- CreateIndex
CREATE UNIQUE INDEX "buyers_buyer_code_key" ON "buyers"("buyer_code");

-- CreateIndex
CREATE UNIQUE INDEX "ScanSessionItem_sessionId_parcelId_key" ON "ScanSessionItem"("sessionId", "parcelId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAssignment" ADD CONSTRAINT "OrderAssignment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankDetail" ADD CONSTRAINT "BankDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtherDetails" ADD CONSTRAINT "OtherDetails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepTracking" ADD CONSTRAINT "StepTracking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShgDetail" ADD CONSTRAINT "ShgDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessDetail" ADD CONSTRAINT "BusinessDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransporterDetail" ADD CONSTRAINT "TransporterDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrivingDetail" ADD CONSTRAINT "DrivingDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteDetail" ADD CONSTRAINT "RouteDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilkVanDetail" ADD CONSTRAINT "MilkVanDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_orders" ADD CONSTRAINT "master_orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_order_items" ADD CONSTRAINT "master_order_items_master_order_id_fkey" FOREIGN KEY ("master_order_id") REFERENCES "master_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_order_items" ADD CONSTRAINT "master_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_order_items" ADD CONSTRAINT "master_order_items_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_orders" ADD CONSTRAINT "pickup_orders_master_order_id_fkey" FOREIGN KEY ("master_order_id") REFERENCES "master_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_orders" ADD CONSTRAINT "pickup_orders_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_orders" ADD CONSTRAINT "pickup_orders_shg_id_fkey" FOREIGN KEY ("shg_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_orders" ADD CONSTRAINT "pickup_orders_transporter_id_fkey" FOREIGN KEY ("transporter_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_order_items" ADD CONSTRAINT "pickup_order_items_pickup_order_id_fkey" FOREIGN KEY ("pickup_order_id") REFERENCES "pickup_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_order_items" ADD CONSTRAINT "pickup_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_inventory" ADD CONSTRAINT "warehouse_inventory_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_inventory" ADD CONSTRAINT "warehouse_inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop_orders" ADD CONSTRAINT "drop_orders_master_order_id_fkey" FOREIGN KEY ("master_order_id") REFERENCES "master_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop_orders" ADD CONSTRAINT "drop_orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop_orders" ADD CONSTRAINT "drop_orders_shg_id_fkey" FOREIGN KEY ("shg_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop_orders" ADD CONSTRAINT "drop_orders_transporter_id_fkey" FOREIGN KEY ("transporter_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop_order_items" ADD CONSTRAINT "drop_order_items_drop_order_id_fkey" FOREIGN KEY ("drop_order_id") REFERENCES "drop_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop_order_items" ADD CONSTRAINT "drop_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_tracking" ADD CONSTRAINT "pickup_tracking_pickup_order_id_fkey" FOREIGN KEY ("pickup_order_id") REFERENCES "pickup_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop_tracking" ADD CONSTRAINT "drop_tracking_drop_order_id_fkey" FOREIGN KEY ("drop_order_id") REFERENCES "drop_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelScanHistory" ADD CONSTRAINT "ParcelScanHistory_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel"("parcelId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanSessionItem" ADD CONSTRAINT "ScanSessionItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ScanSession"("sessionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanSessionItem" ADD CONSTRAINT "ScanSessionItem_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel"("parcelId") ON DELETE CASCADE ON UPDATE CASCADE;
