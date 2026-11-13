-- CreateEnum
CREATE TYPE "ReturnRestockAction" AS ENUM ('RESTOCK', 'WRITE_OFF');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';
ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIALLY_REFUNDED';

-- AlterTable
ALTER TABLE "sale_items" ADD COLUMN     "quantityReturned" DECIMAL(14,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "customerId" TEXT;

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "taxPin" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_returns" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "customerId" TEXT,
    "returnNumber" TEXT NOT NULL,
    "reason" TEXT,
    "refundMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "refundAmount" DECIMAL(12,2) NOT NULL,
    "refundReference" TEXT,
    "notes" TEXT,
    "idempotencyKey" TEXT,
    "processedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_return_items" (
    "id" TEXT NOT NULL,
    "saleReturnId" TEXT NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityReturned" DECIMAL(14,4) NOT NULL,
    "unitRefundPrice" DECIMAL(12,2) NOT NULL,
    "refundSubtotal" DECIMAL(12,2) NOT NULL,
    "restockAction" "ReturnRestockAction" NOT NULL DEFAULT 'RESTOCK',
    "notes" TEXT,
    "stockMovementId" TEXT,

    CONSTRAINT "sale_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_businessId_idx" ON "customers"("businessId");

-- CreateIndex
CREATE INDEX "customers_businessId_isActive_idx" ON "customers"("businessId", "isActive");

-- CreateIndex
CREATE INDEX "customers_businessId_name_idx" ON "customers"("businessId", "name");

-- CreateIndex
CREATE INDEX "customers_businessId_phone_idx" ON "customers"("businessId", "phone");

-- CreateIndex
CREATE INDEX "sale_returns_businessId_idx" ON "sale_returns"("businessId");

-- CreateIndex
CREATE INDEX "sale_returns_saleId_idx" ON "sale_returns"("saleId");

-- CreateIndex
CREATE INDEX "sale_returns_customerId_idx" ON "sale_returns"("customerId");

-- CreateIndex
CREATE INDEX "sale_returns_processedById_idx" ON "sale_returns"("processedById");

-- CreateIndex
CREATE INDEX "sale_returns_businessId_createdAt_idx" ON "sale_returns"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "sale_returns_businessId_returnNumber_key" ON "sale_returns"("businessId", "returnNumber");

-- CreateIndex
CREATE UNIQUE INDEX "sale_returns_businessId_idempotencyKey_key" ON "sale_returns"("businessId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "sale_return_items_saleReturnId_idx" ON "sale_return_items"("saleReturnId");

-- CreateIndex
CREATE INDEX "sale_return_items_saleItemId_idx" ON "sale_return_items"("saleItemId");

-- CreateIndex
CREATE INDEX "sale_return_items_productId_idx" ON "sale_return_items"("productId");

-- CreateIndex
CREATE INDEX "sales_customerId_idx" ON "sales"("customerId");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_saleReturnId_fkey" FOREIGN KEY ("saleReturnId") REFERENCES "sale_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "sale_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
