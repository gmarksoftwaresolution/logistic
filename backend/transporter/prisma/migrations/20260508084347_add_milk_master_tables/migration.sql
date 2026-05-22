-- CreateTable
CREATE TABLE "MilkSangathan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilkSangathan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilkCenter" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sangathanId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilkCenter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MilkSangathan_name_key" ON "MilkSangathan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MilkCenter_name_sangathanId_key" ON "MilkCenter"("name", "sangathanId");

-- AddForeignKey
ALTER TABLE "MilkCenter" ADD CONSTRAINT "MilkCenter_sangathanId_fkey" FOREIGN KEY ("sangathanId") REFERENCES "MilkSangathan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
