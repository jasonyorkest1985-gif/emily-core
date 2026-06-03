-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "fullName" TEXT,
    "email" TEXT,
    "address" TEXT,
    "projectType" TEXT,
    "projectDetails" TEXT,
    "timeline" TEXT,
    "budgetRange" TEXT,
    "leadTemperature" TEXT DEFAULT 'cold',
    "appointmentBooked" BOOLEAN NOT NULL DEFAULT false,
    "appointmentStart" TIMESTAMP(3),
    "appointmentEnd" TIMESTAMP(3),
    "nextStep" TEXT,
    "summary" TEXT,
    "shoppingSignal" BOOLEAN NOT NULL DEFAULT false,
    "hotSignal" BOOLEAN NOT NULL DEFAULT false,
    "hoaDelay" BOOLEAN NOT NULL DEFAULT false,
    "insuranceClaim" BOOLEAN NOT NULL DEFAULT false,
    "competitorMentioned" BOOLEAN NOT NULL DEFAULT false,
    "referralAdjacent" BOOLEAN NOT NULL DEFAULT false,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "dnc" BOOLEAN NOT NULL DEFAULT false,
    "objections" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "callHistory" JSONB,
    "commandsIssued" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "callId" TEXT,
    "transcript" TEXT,
    "duration" INTEGER,
    "commandsIssued" JSONB,
    "tasksCompleted" JSONB,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_phone_key" ON "Lead"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Call_callId_key" ON "Call"("callId");

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
