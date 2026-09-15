-- AlterTable: BYOK-only — every AI call runs on the user's own key, so
-- keySource is no longer meaningful; tokensUsed is what the usage panel
-- actually needs and was missing.
ALTER TABLE "AIUsageLog" DROP COLUMN "keySource",
ADD COLUMN     "tokensUsed" INTEGER NOT NULL DEFAULT 0;

-- DropEnum
DROP TYPE "KeySource";
