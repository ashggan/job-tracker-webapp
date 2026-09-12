-- AlterTable: new fields for the guided-add workflow
ALTER TABLE "Application"
  ADD COLUMN "descriptionText" TEXT,
  ADD COLUMN "requirements" JSONB,
  ADD COLUMN "niceToHaves" JSONB,
  ADD COLUMN "deadline" TIMESTAMP(3),
  ADD COLUMN "fitRecommendation" TEXT;

-- AlterTable: fitStrengths/fitGaps text -> jsonb (unused so far, no data to migrate)
ALTER TABLE "Application" DROP COLUMN "fitStrengths";
ALTER TABLE "Application" DROP COLUMN "fitGaps";
ALTER TABLE "Application" ADD COLUMN "fitStrengths" JSONB;
ALTER TABLE "Application" ADD COLUMN "fitGaps" JSONB;

-- CreateIndex
CREATE INDEX "Application_userId_postingUrl_idx" ON "Application"("userId", "postingUrl");
