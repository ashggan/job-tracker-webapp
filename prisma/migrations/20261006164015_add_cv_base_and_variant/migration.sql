-- CreateTable
CREATE TABLE "CvBase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "header" JSONB NOT NULL,
    "roles" JSONB NOT NULL,
    "skills" JSONB NOT NULL,
    "languages" JSONB NOT NULL,
    "education" JSONB NOT NULL,
    "additionalSections" JSONB NOT NULL,
    "summaryVariants" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CvBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CvVariant" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "cvBaseId" TEXT NOT NULL,
    "baseVersion" INTEGER NOT NULL,
    "summaryVariantId" TEXT NOT NULL,
    "roleSelections" JSONB NOT NULL,
    "skillIds" JSONB NOT NULL,
    "reasoning" TEXT,
    "trackingToken" TEXT,
    "snapshotPdf" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CvVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CvBase_userId_idx" ON "CvBase"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CvBase_userId_version_key" ON "CvBase"("userId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "CvVariant_applicationId_key" ON "CvVariant"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "CvVariant_trackingToken_key" ON "CvVariant"("trackingToken");

-- CreateIndex
CREATE INDEX "CvVariant_cvBaseId_idx" ON "CvVariant"("cvBaseId");

-- AddForeignKey
ALTER TABLE "CvBase" ADD CONSTRAINT "CvBase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvVariant" ADD CONSTRAINT "CvVariant_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvVariant" ADD CONSTRAINT "CvVariant_cvBaseId_fkey" FOREIGN KEY ("cvBaseId") REFERENCES "CvBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
