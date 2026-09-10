-- AlterEnum
ALTER TYPE "AIAction" ADD VALUE 'extract_resume';

-- AlterTable
ALTER TABLE "AIUsageLog" DROP COLUMN "keySource",
ADD COLUMN     "tokensUsed" INTEGER NOT NULL DEFAULT 0;

-- DropEnum
DROP TYPE "KeySource";

-- CreateIndex
CREATE UNIQUE INDEX "UserApiKey_userId_provider_key" ON "UserApiKey"("userId", "provider");

