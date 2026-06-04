-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "secondaryPhone" TEXT;

-- AlterTable
ALTER TABLE "Pet" ADD COLUMN     "temperament" TEXT,
ADD COLUMN     "vaccinationsCurrent" BOOLEAN NOT NULL DEFAULT false;
