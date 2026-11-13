-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "business_memberships" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "registerId" TEXT,
ADD COLUMN     "shiftId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "staff_invitations" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CASHIER',
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registers" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashier_shifts" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "cashierId" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openingFloat" DECIMAL(12,2) NOT NULL,
    "expectedCash" DECIMAL(12,2),
    "actualCash" DECIMAL(12,2),
    "cashVariance" DECIMAL(12,2),
    "notes" TEXT,
    "closedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cashier_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_invitations_tokenHash_key" ON "staff_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "staff_invitations_businessId_idx" ON "staff_invitations"("businessId");

-- CreateIndex
CREATE INDEX "staff_invitations_businessId_status_idx" ON "staff_invitations"("businessId", "status");

-- CreateIndex
CREATE INDEX "staff_invitations_email_idx" ON "staff_invitations"("email");

-- CreateIndex
CREATE INDEX "staff_invitations_phone_idx" ON "staff_invitations"("phone");

-- CreateIndex
CREATE INDEX "staff_invitations_tokenHash_idx" ON "staff_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "registers_businessId_idx" ON "registers"("businessId");

-- CreateIndex
CREATE INDEX "registers_businessId_isActive_idx" ON "registers"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "registers_businessId_name_key" ON "registers"("businessId", "name");

-- CreateIndex
CREATE INDEX "cashier_shifts_businessId_idx" ON "cashier_shifts"("businessId");

-- CreateIndex
CREATE INDEX "cashier_shifts_businessId_status_idx" ON "cashier_shifts"("businessId", "status");

-- CreateIndex
CREATE INDEX "cashier_shifts_cashierId_status_idx" ON "cashier_shifts"("cashierId", "status");

-- CreateIndex
CREATE INDEX "cashier_shifts_registerId_status_idx" ON "cashier_shifts"("registerId", "status");

-- CreateIndex
CREATE INDEX "cashier_shifts_businessId_openedAt_idx" ON "cashier_shifts"("businessId", "openedAt");

-- CreateIndex
CREATE INDEX "audit_logs_businessId_idx" ON "audit_logs"("businessId");

-- CreateIndex
CREATE INDEX "audit_logs_businessId_createdAt_idx" ON "audit_logs"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_businessId_action_idx" ON "audit_logs"("businessId", "action");

-- CreateIndex
CREATE INDEX "audit_logs_businessId_resourceType_idx" ON "audit_logs"("businessId", "resourceType");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "business_memberships_businessId_isActive_idx" ON "business_memberships"("businessId", "isActive");

-- CreateIndex
CREATE INDEX "sales_shiftId_idx" ON "sales"("shiftId");

-- CreateIndex
CREATE INDEX "sales_registerId_idx" ON "sales"("registerId");

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "cashier_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "registers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registers" ADD CONSTRAINT "registers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_shifts" ADD CONSTRAINT "cashier_shifts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_shifts" ADD CONSTRAINT "cashier_shifts_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_shifts" ADD CONSTRAINT "cashier_shifts_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_shifts" ADD CONSTRAINT "cashier_shifts_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "registers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
