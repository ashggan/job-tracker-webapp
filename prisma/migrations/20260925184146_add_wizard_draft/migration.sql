-- CreateTable
CREATE TABLE "WizardDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "postingUrl" TEXT,
    "extracted" JSONB,
    "extras" JSONB,
    "fit" JSONB,
    "fitFor" TEXT,
    "cv" JSONB,
    "cvFor" TEXT,
    "coverLetter" JSONB,
    "coverLetterFor" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WizardDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WizardDraft_userId_key" ON "WizardDraft"("userId");

-- AddForeignKey
ALTER TABLE "WizardDraft" ADD CONSTRAINT "WizardDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
