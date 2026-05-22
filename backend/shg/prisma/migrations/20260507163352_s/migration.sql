/*
  Warnings:

  - You are about to drop the column `street` on the `Address` table. All the data in the column will be lost.
  - You are about to drop the column `availability` on the `OtherDetail` table. All the data in the column will be lost.
  - Made the column `landmark` on table `Address` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `storageSpace` to the `OtherDetail` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Address" DROP COLUMN "street",
ALTER COLUMN "landmark" SET NOT NULL;

-- AlterTable
ALTER TABLE "OtherDetail" DROP COLUMN "availability",
ADD COLUMN     "storageSpace" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ShgDetail" ALTER COLUMN "shgName" DROP NOT NULL,
ALTER COLUMN "shgLeaderName" DROP NOT NULL,
ALTER COLUMN "shgLeaderContact" DROP NOT NULL,
ALTER COLUMN "shgExperience" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Vehicle" ALTER COLUMN "vehicleType" DROP NOT NULL;
