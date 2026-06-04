-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "petName" TEXT,
    "breed" TEXT,
    "color" TEXT,
    "weight" TEXT,
    "dateOfBirth" TEXT,
    "sex" TEXT,
    "spayedNeutered" BOOLEAN NOT NULL DEFAULT false,
    "medicalIssues" TEXT,
    "allergies" TEXT,
    "vetName" TEXT,
    "vetPhone" TEXT,
    "rabiesCurrent" BOOLEAN NOT NULL DEFAULT false,
    "rabiesExpiration" TEXT,
    "behavior" TEXT,
    "groomingNotes" TEXT,
    "lastGroomed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
