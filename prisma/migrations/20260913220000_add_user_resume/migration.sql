-- CreateEnum
CREATE TYPE "ResumeFileType" AS ENUM ('PDF', 'DOCX');

-- CreateEnum
CREATE TYPE "ResumeParseStatus" AS ENUM ('OK', 'LOW_CONFIDENCE', 'FAILED');

-- CreateTable
CREATE TABLE "UserResume" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "fileType" "ResumeFileType" NOT NULL,
    "fileBytes" BYTEA NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "extractedText" TEXT NOT NULL,
    "parseStatus" "ResumeParseStatus" NOT NULL,
    "parseWarning" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserResume_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserResume_userId_key" ON "UserResume"("userId");

-- AddForeignKey
ALTER TABLE "UserResume" ADD CONSTRAINT "UserResume_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
