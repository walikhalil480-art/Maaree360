-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LOW_STOCK', 'REORDER_REMINDER', 'UNUSUAL_SALES', 'PAYMENT_ISSUE', 'GENERAL_ALERT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'DISMISSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'NOT_APPLICABLE');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'GENERAL_ALERT',
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "resourceType" TEXT,
    "resourceId" TEXT,
    "actionUrl" TEXT,
    "metadata" JSONB,
    "conditionKey" TEXT,
    "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "deliveryAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastDeliveryError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_settings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "lowStockAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lowStockThresholdDefault" INTEGER NOT NULL DEFAULT 5,
    "reorderRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "unusualSalesAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "salesSurgeThresholdPercent" INTEGER NOT NULL DEFAULT 50,
    "salesDropThresholdPercent" INTEGER NOT NULL DEFAULT 50,
    "salesLookbackDays" INTEGER NOT NULL DEFAULT 30,
    "minSalesSampleSize" INTEGER NOT NULL DEFAULT 5,
    "emailAlertsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsAlertsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "recipientRoles" "Role"[] DEFAULT ARRAY['OWNER', 'MANAGER']::"Role"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_businessId_idx" ON "notifications"("businessId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_businessId_isRead_idx" ON "notifications"("businessId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_businessId_status_idx" ON "notifications"("businessId", "status");

-- CreateIndex
CREATE INDEX "notifications_businessId_type_idx" ON "notifications"("businessId", "type");

-- CreateIndex
CREATE INDEX "notifications_businessId_conditionKey_idx" ON "notifications"("businessId", "conditionKey");

-- CreateIndex
CREATE INDEX "notifications_businessId_createdAt_idx" ON "notifications"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "alert_settings_businessId_key" ON "alert_settings"("businessId");

-- CreateIndex
CREATE INDEX "alert_settings_businessId_idx" ON "alert_settings"("businessId");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_settings" ADD CONSTRAINT "alert_settings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
