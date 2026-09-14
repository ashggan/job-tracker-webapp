-- AlterEnum
ALTER TYPE "AIAction" ADD VALUE 'extract_resume';

-- AlterTable
ALTER TABLE "UserResume" ADD COLUMN     "basicInfo" JSONB;
