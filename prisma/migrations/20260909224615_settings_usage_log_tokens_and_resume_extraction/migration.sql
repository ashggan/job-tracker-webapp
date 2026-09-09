-- AlterEnum
ALTER TYPE "AIAction" ADD VALUE 'extract_resume';

-- AlterTable
ALTER TABLE "AIUsageLog" ADD COLUMN     "tokensUsed" INTEGER NOT NULL DEFAULT 0;
