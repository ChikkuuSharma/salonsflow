-- AlterTable
ALTER TABLE "Salon" ADD COLUMN     "googleReviewLink" TEXT,
ADD COLUMN     "rebookingAutoSend" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewDelayMins" INTEGER NOT NULL DEFAULT 60;

-- CreateTable
CREATE TABLE "MissedCall" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'TELCO',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissedCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewCampaign" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RebookingRule" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "intervalDays" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RebookingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RebookingRecommendation" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RebookingRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceNote" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "durationSecs" INTEGER,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MissedCall_salonId_idx" ON "MissedCall"("salonId");

-- CreateIndex
CREATE INDEX "MissedCall_phone_idx" ON "MissedCall"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewCampaign_appointmentId_key" ON "ReviewCampaign"("appointmentId");

-- CreateIndex
CREATE INDEX "ReviewCampaign_salonId_idx" ON "ReviewCampaign"("salonId");

-- CreateIndex
CREATE INDEX "ReviewCampaign_customerId_idx" ON "ReviewCampaign"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "RebookingRule_serviceId_key" ON "RebookingRule"("serviceId");

-- CreateIndex
CREATE INDEX "RebookingRule_salonId_idx" ON "RebookingRule"("salonId");

-- CreateIndex
CREATE INDEX "RebookingRecommendation_salonId_idx" ON "RebookingRecommendation"("salonId");

-- CreateIndex
CREATE INDEX "RebookingRecommendation_customerId_idx" ON "RebookingRecommendation"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceNote_messageId_key" ON "VoiceNote"("messageId");

-- AddForeignKey
ALTER TABLE "MissedCall" ADD CONSTRAINT "MissedCall_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCampaign" ADD CONSTRAINT "ReviewCampaign_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCampaign" ADD CONSTRAINT "ReviewCampaign_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCampaign" ADD CONSTRAINT "ReviewCampaign_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RebookingRule" ADD CONSTRAINT "RebookingRule_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RebookingRule" ADD CONSTRAINT "RebookingRule_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RebookingRecommendation" ADD CONSTRAINT "RebookingRecommendation_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RebookingRecommendation" ADD CONSTRAINT "RebookingRecommendation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RebookingRecommendation" ADD CONSTRAINT "RebookingRecommendation_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceNote" ADD CONSTRAINT "VoiceNote_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
