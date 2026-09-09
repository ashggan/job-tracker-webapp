/*
  Warnings:

  - You are about to drop the column `keySource` on the `AIUsageLog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AIUsageLog" DROP COLUMN "keySource";

-- DropEnum
DROP TYPE "KeySource";
